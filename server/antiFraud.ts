import { db } from './db.js';
import { User, Profile, AccountStatus } from '../src/types.js';

interface TapHistoryEntry {
  timestamp: number;
  interval: number;
}

interface UserTapTracker {
  recentTaps: TapHistoryEntry[];
  lastTapTime: number;
  burstCount: number;
  burstWindowStart: number;
  consecutiveViolations: number;
}

const userTrackers = new Map<string, UserTapTracker>();
const deviceToUsersMap = new Map<string, Set<string>>();

// Calculate standard deviation of intervals to detect robotic / autoclicker patterns
function calculateStdDev(numbers: number[]): number {
  if (numbers.length < 4) return 999;
  const mean = numbers.reduce((acc, val) => acc + val, 0) / numbers.length;
  const variance =
    numbers.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) /
    numbers.length;
  return Math.sqrt(variance);
}

export interface AntiFraudValidationResult {
  valid: boolean;
  code?:
    | 'ACCOUNT_FROZEN'
    | 'ACCOUNT_UNDER_REVIEW'
    | 'REPLAY_ATTACK'
    | 'TIMESTAMP_OUT_OF_BOUNDS'
    | 'RATE_LIMITED'
    | 'ROBOTIC_AUTOCLICKER'
    | 'RAPID_FIRE'
    | 'DAILY_LIMIT_REACHED'
    | 'DEVICE_ABUSE';
  message?: string;
  autoFrozen?: boolean;
}

export function validateTapRequest(
  user: User,
  profile: Profile,
  payload: {
    nonce: string;
    clientTimestamp: number;
    clientInterval?: number;
    deviceFingerprint?: string;
    isSimulatedBot?: boolean;
  }
): AntiFraudValidationResult {
  const now = Date.now();
  const settings = db.getSettings();

  // 1. Check account status
  if (user.status === 'frozen') {
    return {
      valid: false,
      code: 'ACCOUNT_FROZEN',
      message: 'Your account has been frozen due to security policy violations. Contact support.',
    };
  }

  if (user.status === 'under_review') {
    return {
      valid: false,
      code: 'ACCOUNT_UNDER_REVIEW',
      message: 'Your account is currently under security review. Tapping is temporarily disabled.',
    };
  }

  // 2. Nonce validation (Anti-replay)
  if (!payload.nonce || !db.validateAndUseNonce(payload.nonce)) {
    db.addFraudFlag({
      userId: user.id,
      userEmail: user.email,
      flagType: 'replay_attack',
      severity: 'medium',
      details: `Replayed or invalid nonce detected: ${payload.nonce?.slice(0, 10)}...`,
    });
    return {
      valid: false,
      code: 'REPLAY_ATTACK',
      message: 'Security validation failed: Request nonce was replayed or expired.',
    };
  }

  // 3. Timestamp sanity check (must be within 30s)
  const timeDiff = Math.abs(now - payload.clientTimestamp);
  if (isNaN(payload.clientTimestamp) || timeDiff > 30000) {
    db.addFraudFlag({
      userId: user.id,
      userEmail: user.email,
      flagType: 'replay_attack',
      severity: 'low',
      details: `Timestamp difference exceeded tolerance: ${timeDiff}ms`,
    });
    return {
      valid: false,
      code: 'TIMESTAMP_OUT_OF_BOUNDS',
      message: 'Device clock out of sync. Please check your time settings.',
    };
  }

  // 4. Device multi-account abuse check
  const deviceId = payload.deviceFingerprint || user.deviceFingerprint || 'unknown';
  if (deviceId && deviceId !== 'unknown') {
    let usersOnDevice = deviceToUsersMap.get(deviceId);
    if (!usersOnDevice) {
      usersOnDevice = new Set<string>();
      deviceToUsersMap.set(deviceId, usersOnDevice);
    }
    usersOnDevice.add(user.id);

    if (usersOnDevice.size > 4) {
      db.addFraudFlag({
        userId: user.id,
        userEmail: user.email,
        flagType: 'multiple_accounts',
        severity: 'high',
        details: `Multiple accounts (${usersOnDevice.size}) active on same device ID: ${deviceId}`,
      });
    }
  }

  // 5. Daily limit check (Server-authoritative subscription plan daily limit)
  const planInfo = db.getUserEffectivePlan(user.id);
  if (planInfo.dailyPointsLimit !== null && planInfo.dailyEarnedPoints >= planInfo.dailyPointsLimit) {
    return {
      valid: false,
      code: 'DAILY_LIMIT_REACHED',
      message: 'Daily limit reached. Come back tomorrow.',
    };
  }

  // 6. In-memory Rate Limiter & Cadence Analysis
  let tracker = userTrackers.get(user.id);
  if (!tracker) {
    tracker = {
      recentTaps: [],
      lastTapTime: 0,
      burstCount: 0,
      burstWindowStart: now,
      consecutiveViolations: 0,
    };
    userTrackers.set(user.id, tracker);
  }

  const interval = tracker.lastTapTime > 0 ? now - tracker.lastTapTime : 1000;
  tracker.lastTapTime = now;

  // Burst limit: Max 6 taps in a 1.5 second window
  if (now - tracker.burstWindowStart > 1500) {
    tracker.burstWindowStart = now;
    tracker.burstCount = 1;
  } else {
    tracker.burstCount += 1;
    if (tracker.burstCount > 7) {
      tracker.consecutiveViolations += 1;
      db.addFraudFlag({
        userId: user.id,
        userEmail: user.email,
        flagType: 'excessive_burst',
        severity: 'medium',
        details: `Burst rate exceeded: ${tracker.burstCount} taps in 1.5s window`,
      });
      return {
        valid: false,
        code: 'RATE_LIMITED',
        message: 'Tapping too fast! Please tap manually at a natural pace.',
      };
    }
  }

  // Minimum interval check (Macro / Fast Clicker)
  if (interval < settings.minTapIntervalMs) {
    tracker.consecutiveViolations += 1;
    if (tracker.consecutiveViolations >= 3) {
      db.addFraudFlag({
        userId: user.id,
        userEmail: user.email,
        flagType: 'rapid_clicking',
        severity: 'medium',
        details: `Tapping at superhuman speed: ${interval}ms between taps (min allowed: ${settings.minTapIntervalMs}ms)`,
      });
    }
    return {
      valid: false,
      code: 'RAPID_FIRE',
      message: 'Too fast! Slow down your taps to ensure fair play.',
    };
  }

  // Explicit simulated bot trigger for testing
  if (payload.isSimulatedBot) {
    db.addFraudFlag({
      userId: user.id,
      userEmail: user.email,
      flagType: 'robotic_cadence',
      severity: 'high',
      details: 'Simulated automated script/autoclicker test flag triggered.',
    });
    return {
      valid: false,
      code: 'ROBOTIC_AUTOCLICKER',
      message: 'Automated script/autoclicker behavior detected. Account flagged.',
    };
  }

  // Cadence uniformity test (Autoclicker detection)
  tracker.recentTaps.push({ timestamp: now, interval });
  if (tracker.recentTaps.length > 10) {
    tracker.recentTaps.shift();
  }

  if (tracker.recentTaps.length >= 8) {
    const intervals = tracker.recentTaps.map((t) => t.interval);
    const stdDev = calculateStdDev(intervals);

    // If stdDev is unnaturally small (< 10ms variance over 8 taps), it's a fixed-interval bot/script
    if (stdDev < 10 && settings.strictAntiBot) {
      db.addFraudFlag({
        userId: user.id,
        userEmail: user.email,
        flagType: 'robotic_cadence',
        severity: 'high',
        details: `Robotic cadence detected! Interval standard deviation is only ${stdDev.toFixed(1)}ms across ${intervals.length} taps (Mean: ${(intervals.reduce((a, b) => a + b) / intervals.length).toFixed(1)}ms).`,
      });

      return {
        valid: false,
        code: 'ROBOTIC_AUTOCLICKER',
        message: 'Robotic or automated clicking detected. Please tap manually with natural variation.',
      };
    }
  }

  // Reset consecutive violations on valid tap
  tracker.consecutiveViolations = 0;

  return { valid: true };
}
