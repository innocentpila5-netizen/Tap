import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  User,
  Profile,
  PointTransaction,
  Withdrawal,
  FraudFlag,
  AppSettings,
  AdminStats,
  SubscriptionOrder,
  SubscriptionPlanId,
  PlanSettingItem,
} from '../src/types.js';

interface DatabaseSchema {
  users: User[];
  profiles: Profile[];
  point_transactions: PointTransaction[];
  withdrawals: Withdrawal[];
  fraud_flags: FraudFlag[];
  admin_users: { id: string; email: string; name: string; pinHash: string }[];
  subscription_orders: SubscriptionOrder[];
  app_settings: AppSettings;
  otps: { [email: string]: { code: string; expiresAt: number } };
  usedNonces: { [nonce: string]: number }; // timestamp
  ad_sessions: { [sessionId: string]: { userId: string; createdAt: number; minWatchDurationSeconds: number; used: boolean } };
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

// Helper to determine if running test AdMob IDs vs Production IDs
function getAdMobConfig(): {
  appId: string;
  bannerId: string;
  interstitialId: string;
  rewardedId: string;
  isTestMode: boolean;
} {
  const isProd = process.env.NODE_ENV === 'production' && process.env.ADMOB_ENV !== 'test';
  const appId = process.env.ADMOB_APP_ID || 'ca-app-pub-3940256099942544~3347511713';
  const bannerId = process.env.ADMOB_BANNER_ID || 'ca-app-pub-3940256099942544/6300978111';
  const interstitialId = process.env.ADMOB_INTERSTITIAL_ID || 'ca-app-pub-3940256099942544/1033173712';
  const rewardedId = process.env.ADMOB_REWARDED_ID || 'ca-app-pub-3940256099942544/5224354917';

  const isTest =
    bannerId.includes('3940256099942544') ||
    interstitialId.includes('3940256099942544') ||
    rewardedId.includes('3940256099942544') ||
    !isProd;

  return {
    appId,
    bannerId,
    interstitialId,
    rewardedId,
    isTestMode: isTest,
  };
}

const adConfig = getAdMobConfig();

const DEFAULT_SETTINGS: AppSettings = {
  pointsPerTap: 10,
  pointsToInrRatio: 10, // 10 points = ₹1, meaning 100 points = ₹10
  minWithdrawalInr: 10, // ₹10 minimum
  dailyTapLimit: 200, // fallback
  minTapIntervalMs: 200, // 200ms anti-macro limit
  strictAntiBot: true,
  plans: {
    free: { priceInr: 0, dailyLimit: 500 },
    plan_99: { priceInr: 99, dailyLimit: 1000 },
    plan_499: { priceInr: 499, dailyLimit: 5000 },
    plan_2000: { priceInr: 2000, dailyLimit: null },
  },
  admobEnabled: true,
  admobAppId: adConfig.appId,
  admobBannerId: adConfig.bannerId,
  admobInterstitialId: adConfig.interstitialId,
  admobRewardedId: adConfig.rewardedId,
  adFrequencyTaps: 30, // Show natural break interstitial suggestion every 30 taps
  interstitialCooldownSeconds: 60, // Minimum 60s cooldown between interstitials
  rewardedAdPoints: Number(process.env.REWARDED_AD_POINTS) || 50, // 50 pts = ₹5 per voluntary rewarded video
  rewardedAdDailyLimit: Number(process.env.REWARDED_AD_DAILY_LIMIT) || 5, // max 5 rewarded ads / day
  isTestMode: adConfig.isTestMode,
};

let dbCache: DatabaseSchema | null = null;

function ensureDataDirectory() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function getTodayString(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

function createInitialDatabase(): DatabaseSchema {
  const nowIso = new Date().toISOString();
  const today = getTodayString();

  const demoUserId = 'TP-782194';
  const sampleUserId2 = 'TP-341908';

  const users: User[] = [
    {
      id: demoUserId,
      email: 'demo@tappoints.com',
      role: 'user',
      status: 'active',
      createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
      lastLoginAt: nowIso,
      deviceFingerprint: 'dev-client-sample-1',
      ipAddress: '127.0.0.1',
    },
    {
      id: sampleUserId2,
      email: 'alex.tapper@example.com',
      role: 'user',
      status: 'active',
      createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      lastLoginAt: nowIso,
      deviceFingerprint: 'dev-client-sample-2',
      ipAddress: '127.0.0.1',
    },
  ];

  const profiles: Profile[] = [
    {
      userId: demoUserId,
      name: 'Demo Tapper',
      upiId: 'demouser@okhdfcbank',
      totalTaps: 340,
      pointsBalance: 450, // 450 available points = ₹45
      lockedPoints: 100, // 100 points held in pending withdrawal = ₹10
      totalWithdrawnInr: 20,
      dailyTapsCount: 45,
      lastTapDate: today,
      fraudScore: 0,
      dailyRewardedAdsCount: 0,
      lastRewardedAdDate: today,
      dailyEarnedPoints: 450,
      lastEarningDate: today,
      currentPlanId: 'free',
      subscriptionExpiresAt: null,
    },
    {
      userId: sampleUserId2,
      name: 'Alex R.',
      upiId: 'alex@paytm',
      totalTaps: 890,
      pointsBalance: 1200,
      lockedPoints: 0,
      totalWithdrawnInr: 70,
      dailyTapsCount: 12,
      lastTapDate: today,
      fraudScore: 5,
      dailyRewardedAdsCount: 0,
      lastRewardedAdDate: today,
      dailyEarnedPoints: 120,
      lastEarningDate: today,
      currentPlanId: 'plan_99',
      subscriptionExpiresAt: new Date(Date.now() + 20 * 86400000).toISOString(),
    },
  ];

  const point_transactions: PointTransaction[] = [
    {
      id: 'tx_seed_1',
      userId: demoUserId,
      type: 'tap_reward',
      points: 100,
      inrAmount: 10,
      balanceAfter: 100,
      description: 'Tap earnings reward batch',
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: 'tx_seed_2',
      userId: demoUserId,
      type: 'withdrawal_locked',
      points: -100,
      inrAmount: 10,
      balanceAfter: 0,
      description: 'Locked for UPI withdrawal request (WID-91823)',
      referenceId: 'WID-91823',
      createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    },
    {
      id: 'tx_seed_3',
      userId: demoUserId,
      type: 'withdrawal_settled',
      points: 0,
      inrAmount: 10,
      balanceAfter: 0,
      description: 'UPI Payout settled to demouser@okhdfcbank (UTR: 428190382910)',
      referenceId: 'WID-91823',
      createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    },
    {
      id: 'tx_seed_4',
      userId: demoUserId,
      type: 'tap_reward',
      points: 550,
      inrAmount: 55,
      balanceAfter: 550,
      description: 'Tap earnings reward session',
      createdAt: new Date(Date.now() - 10000000).toISOString(),
    },
    {
      id: 'tx_seed_5',
      userId: demoUserId,
      type: 'withdrawal_locked',
      points: -100,
      inrAmount: 10,
      balanceAfter: 450,
      description: 'Locked for UPI withdrawal request (WID-99201)',
      referenceId: 'WID-99201',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
  ];

  const withdrawals: Withdrawal[] = [
    {
      id: 'WID-91823',
      userId: demoUserId,
      userEmail: 'demo@tappoints.com',
      userName: 'Demo Tapper',
      pointsRequested: 100,
      inrAmount: 10,
      upiId: 'demouser@okhdfcbank',
      status: 'paid',
      utrNumber: '428190382910',
      requestedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      processedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
      processedBy: 'Admin (System)',
    },
    {
      id: 'WID-99201',
      userId: demoUserId,
      userEmail: 'demo@tappoints.com',
      userName: 'Demo Tapper',
      pointsRequested: 100,
      inrAmount: 10,
      upiId: 'demouser@okhdfcbank',
      status: 'pending',
      requestedAt: new Date(Date.now() - 3600000).toISOString(),
    },
  ];

  const fraud_flags: FraudFlag[] = [];

  const admin_users = [
    {
      id: 'ADMIN-1',
      email: 'admin@tappoints.com',
      name: 'Super Admin',
      pinHash: '8888', // default admin PIN
    },
  ];

  const subscription_orders: SubscriptionOrder[] = [
    {
      id: 'SUB-10021',
      userId: sampleUserId2,
      userEmail: 'alex.tapper@example.com',
      userName: 'Alex R.',
      planId: 'plan_99',
      planName: '₹99 Monthly Plan',
      amountInr: 99,
      dailyPointsLimit: 1000,
      status: 'verified',
      paymentMethod: 'upi_qr',
      transactionReference: 'UPI-492018402910',
      createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
      verifiedAt: new Date(Date.now() - 10 * 86400000).toISOString(),
      verifiedBy: 'System Auto-Verify',
    },
  ];

  return {
    users,
    profiles,
    point_transactions,
    withdrawals,
    fraud_flags,
    admin_users,
    subscription_orders,
    app_settings: DEFAULT_SETTINGS,
    otps: {},
    usedNonces: {},
    ad_sessions: {},
  };
}

export function loadDatabase(): DatabaseSchema {
  if (dbCache) {
    return dbCache;
  }
  ensureDataDirectory();
  if (fs.existsSync(DB_FILE)) {
    try {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      dbCache = JSON.parse(data);

      // Data Migration & Integrity checks
      if (dbCache) {
        if (!dbCache.subscription_orders) {
          dbCache.subscription_orders = [];
        }
        if (!dbCache.app_settings) {
          dbCache.app_settings = DEFAULT_SETTINGS;
        }
        if (!dbCache.app_settings.plans) {
          dbCache.app_settings.plans = DEFAULT_SETTINGS.plans;
        }
        if (!dbCache.ad_sessions) {
          dbCache.ad_sessions = {};
        }

        const today = getTodayString();
        // Backfill profile fields
        dbCache.profiles.forEach((p) => {
          if (!p.currentPlanId) p.currentPlanId = 'free';
          if (p.dailyEarnedPoints === undefined) p.dailyEarnedPoints = 0;
          if (!p.lastEarningDate) p.lastEarningDate = today;
          if (p.dailyRewardedAdsCount === undefined) p.dailyRewardedAdsCount = 0;
          if (!p.lastRewardedAdDate) p.lastRewardedAdDate = today;
        });

        // Clean expired nonces
        const now = Date.now();
        if (dbCache.usedNonces) {
          for (const nonce in dbCache.usedNonces) {
            if (now - dbCache.usedNonces[nonce] > 600000) {
              delete dbCache.usedNonces[nonce];
            }
          }
        }
      }

      return dbCache!;
    } catch (err) {
      console.error('Error reading database file, recreating fresh copy:', err);
    }
  }

  dbCache = createInitialDatabase();
  saveDatabase(dbCache);
  return dbCache;
}

export function saveDatabase(data: DatabaseSchema): void {
  ensureDataDirectory();
  dbCache = data;
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing to database file:', err);
  }
}

// Database helper functions
export const db = {
  getSettings(): AppSettings {
    const database = loadDatabase();
    return database.app_settings || DEFAULT_SETTINGS;
  },

  updateSettings(newSettings: Partial<AppSettings>): AppSettings {
    const database = loadDatabase();
    database.app_settings = { ...database.app_settings, ...newSettings };
    saveDatabase(database);
    return database.app_settings;
  },

  updatePlansConfig(plansConfig: Partial<AppSettings['plans']>): AppSettings['plans'] {
    const database = loadDatabase();
    database.app_settings.plans = { ...database.app_settings.plans, ...plansConfig };
    saveDatabase(database);
    return database.app_settings.plans;
  },

  findUserById(id: string): { user: User; profile: Profile } | null {
    const database = loadDatabase();
    const user = database.users.find((u) => u.id === id);
    if (!user) return null;
    const profile = database.profiles.find((p) => p.userId === id);
    if (!profile) return null;
    return { user, profile };
  },

  findUserByEmail(email: string): { user: User; profile: Profile } | null {
    const database = loadDatabase();
    const cleanEmail = email.toLowerCase().trim();
    const user = database.users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!user) return null;
    const profile = database.profiles.find((p) => p.userId === user.id);
    if (!profile) return null;
    return { user, profile };
  },

  createUser(email: string, name?: string, deviceFingerprint?: string, ipAddress?: string): { user: User; profile: Profile } {
    const database = loadDatabase();
    const cleanEmail = email.toLowerCase().trim();
    const existing = this.findUserByEmail(cleanEmail);
    if (existing) return existing;

    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const userId = `TP-${randomSuffix}`;
    const nowIso = new Date().toISOString();
    const today = getTodayString();

    const newUser: User = {
      id: userId,
      email: cleanEmail,
      role: cleanEmail === 'admin@tappoints.com' ? 'admin' : 'user',
      status: 'active',
      createdAt: nowIso,
      lastLoginAt: nowIso,
      deviceFingerprint: deviceFingerprint || 'unknown-device',
      ipAddress: ipAddress || '127.0.0.1',
    };

    const newProfile: Profile = {
      userId,
      name: name?.trim() || cleanEmail.split('@')[0] || `User ${randomSuffix}`,
      upiId: '',
      totalTaps: 0,
      pointsBalance: 0,
      lockedPoints: 0,
      totalWithdrawnInr: 0,
      dailyTapsCount: 0,
      lastTapDate: today,
      dailyRewardedAdsCount: 0,
      lastRewardedAdDate: today,
      dailyEarnedPoints: 0,
      lastEarningDate: today,
      currentPlanId: 'free',
      subscriptionExpiresAt: null,
      fraudScore: 0,
    };

    database.users.push(newUser);
    database.profiles.push(newProfile);
    saveDatabase(database);
    return { user: newUser, profile: newProfile };
  },

  // Plan Resolver & Server-Authoritative Daily Earning State
  getUserEffectivePlan(userId: string): {
    planId: SubscriptionPlanId;
    planName: string;
    priceInr: number;
    dailyPointsLimit: number | null;
    dailyEarnedPoints: number;
    dailyPointsRemaining: number | null;
    subscriptionExpiresAt: string | null;
    isExpired: boolean;
    profile: Profile;
  } {
    const database = loadDatabase();
    const profile = database.profiles.find((p) => p.userId === userId);
    if (!profile) throw new Error('User profile not found');

    const settings = database.app_settings || DEFAULT_SETTINGS;
    const plans = settings.plans || DEFAULT_SETTINGS.plans;

    const today = getTodayString();
    let isExpired = false;

    // Auto-downgrade expired subscriptions to Free Plan
    if (profile.currentPlanId !== 'free' && profile.subscriptionExpiresAt) {
      const expiresTime = new Date(profile.subscriptionExpiresAt).getTime();
      if (expiresTime < Date.now()) {
        console.log(`[Subscription] User ${userId} subscription ${profile.currentPlanId} expired. Downgrading to Free.`);
        profile.currentPlanId = 'free';
        profile.subscriptionExpiresAt = null;
        isExpired = true;
      }
    }

    // Server-Authoritative Daily Reset at start of new day
    if (profile.lastEarningDate !== today) {
      profile.dailyEarnedPoints = 0;
      profile.lastEarningDate = today;
      profile.dailyTapsCount = 0;
      profile.lastTapDate = today;
      profile.dailyRewardedAdsCount = 0;
      profile.lastRewardedAdDate = today;
    }

    // Save changes if reset or expired
    const pIndex = database.profiles.findIndex((p) => p.userId === userId);
    if (pIndex !== -1) {
      database.profiles[pIndex] = profile;
      saveDatabase(database);
    }

    const planConfig = plans[profile.currentPlanId] || plans.free;
    const planNames: Record<SubscriptionPlanId, string> = {
      free: 'Free Plan',
      plan_99: '₹99 Monthly Plan',
      plan_499: '₹499 Monthly Plan',
      plan_2000: '₹2,000 Monthly Plan',
    };

    const dailyLimit = planConfig.dailyLimit;
    const remaining = dailyLimit === null ? null : Math.max(0, dailyLimit - (profile.dailyEarnedPoints || 0));

    return {
      planId: profile.currentPlanId,
      planName: planNames[profile.currentPlanId] || 'Free Plan',
      priceInr: planConfig.priceInr,
      dailyPointsLimit: dailyLimit,
      dailyEarnedPoints: profile.dailyEarnedPoints || 0,
      dailyPointsRemaining: remaining,
      subscriptionExpiresAt: profile.subscriptionExpiresAt || null,
      isExpired,
      profile,
    };
  },

  // Rewarded Ad Management & Verification
  createRewardedAdSession(userId: string): {
    sessionId: string;
    adUnitId: string;
    rewardAmount: number;
    minWatchDurationSeconds: number;
    timestamp: number;
    isTestMode: boolean;
  } {
    const database = loadDatabase();
    const { user, profile } = this.findUserById(userId) || {};
    if (!user || !profile) throw new Error('User not found');
    if (user.status !== 'active') throw new Error(`Account is currently ${user.status}.`);

    const planInfo = this.getUserEffectivePlan(userId);
    if (planInfo.dailyPointsLimit !== null && planInfo.dailyEarnedPoints >= planInfo.dailyPointsLimit) {
      throw new Error('Daily limit reached. Come back tomorrow or upgrade your plan.');
    }

    const today = getTodayString();
    if (profile.lastRewardedAdDate !== today) {
      profile.dailyRewardedAdsCount = 0;
      profile.lastRewardedAdDate = today;
    }

    const settings = database.app_settings || DEFAULT_SETTINGS;
    const dailyLimit = settings.rewardedAdDailyLimit || 5;

    if (profile.dailyRewardedAdsCount >= dailyLimit) {
      throw new Error(`Daily rewarded ad limit (${dailyLimit}/${dailyLimit}) reached. Come back tomorrow!`);
    }

    if (!database.ad_sessions) {
      database.ad_sessions = {};
    }

    const sessionId = `adsess_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
    const minDurationSeconds = 15; // Minimum 15 seconds required for video ad completion

    database.ad_sessions[sessionId] = {
      userId,
      createdAt: Date.now(),
      minWatchDurationSeconds: minDurationSeconds,
      used: false,
    };

    saveDatabase(database);

    return {
      sessionId,
      adUnitId: settings.admobRewardedId,
      rewardAmount: settings.rewardedAdPoints || 50,
      minWatchDurationSeconds: minDurationSeconds,
      timestamp: Date.now(),
      isTestMode: settings.isTestMode,
    };
  },

  claimRewardedAd(
    userId: string,
    sessionId: string,
    clientWatchDurationSeconds: number
  ): {
    pointsAdded: number;
    newBalance: number;
    newInrBalance: number;
    dailyRewardedAdsCount: number;
    dailyRewardedAdsRemaining: number;
    dailyEarnedPoints: number;
    dailyPointsLimit: number | null;
    dailyPointsRemaining: number | null;
    tx: PointTransaction;
  } {
    const database = loadDatabase();
    const { user, profile } = this.findUserById(userId) || {};
    if (!user || !profile) throw new Error('User not found');
    if (user.status !== 'active') throw new Error(`Account is ${user.status}. Cannot credit rewards.`);

    const planInfo = this.getUserEffectivePlan(userId);
    if (planInfo.dailyPointsLimit !== null && planInfo.dailyEarnedPoints >= planInfo.dailyPointsLimit) {
      throw new Error('Daily limit reached. Come back tomorrow.');
    }

    if (!database.ad_sessions) {
      database.ad_sessions = {};
    }

    const session = database.ad_sessions[sessionId];
    if (!session) {
      this.addFraudFlag({
        userId,
        userEmail: user.email,
        flagType: 'ad_bypass_attempt',
        severity: 'high',
        details: `Invalid or non-existent ad session ID: ${sessionId}`,
      });
      throw new Error('Invalid ad watch session. Please watch the ad legitimately.');
    }

    if (session.userId !== userId) {
      this.addFraudFlag({
        userId,
        userEmail: user.email,
        flagType: 'ad_bypass_attempt',
        severity: 'high',
        details: `Ad session user mismatch (session owned by ${session.userId}, claimed by ${userId})`,
      });
      throw new Error('Session ownership mismatch.');
    }

    if (session.used) {
      this.addFraudFlag({
        userId,
        userEmail: user.email,
        flagType: 'replay_attack',
        severity: 'high',
        details: `Replay claim attempt on already used ad session ${sessionId}`,
      });
      throw new Error('Reward for this ad session has already been claimed.');
    }

    // Verify time elapsed (server-authoritative)
    const elapsedSeconds = (Date.now() - session.createdAt) / 1000;
    if (elapsedSeconds < session.minWatchDurationSeconds - 2) {
      this.addFraudFlag({
        userId,
        userEmail: user.email,
        flagType: 'ad_bypass_attempt',
        severity: 'medium',
        details: `Premature ad reward claim: watched for only ${elapsedSeconds.toFixed(1)}s (required: ${session.minWatchDurationSeconds}s)`,
      });
      throw new Error('Ad was not watched to completion. Reward can only be claimed after the ad finishes.');
    }

    const settings = database.app_settings || DEFAULT_SETTINGS;
    const dailyLimit = settings.rewardedAdDailyLimit || 5;

    if (profile.dailyRewardedAdsCount >= dailyLimit) {
      throw new Error(`Daily rewarded ad limit (${dailyLimit}) already reached.`);
    }

    // Mark session as used
    session.used = true;

    // Credit reward points subject to daily cap
    let rewardPoints = settings.rewardedAdPoints || 50;
    if (planInfo.dailyPointsLimit !== null) {
      const remainingAllowed = Math.max(0, planInfo.dailyPointsLimit - planInfo.dailyEarnedPoints);
      rewardPoints = Math.min(rewardPoints, remainingAllowed);
      if (rewardPoints <= 0) {
        throw new Error('Daily limit reached. Come back tomorrow.');
      }
    }

    const rewardInr = rewardPoints / (settings.pointsToInrRatio || 10);

    profile.pointsBalance += rewardPoints;
    profile.dailyEarnedPoints = (profile.dailyEarnedPoints || 0) + rewardPoints;
    profile.dailyRewardedAdsCount = (profile.dailyRewardedAdsCount || 0) + 1;
    profile.lastRewardedAdDate = getTodayString();
    profile.lastEarningDate = getTodayString();

    // Update profile in DB
    const pIndex = database.profiles.findIndex((p) => p.userId === userId);
    if (pIndex !== -1) {
      database.profiles[pIndex] = profile;
    }

    // Record ledger transaction
    const txId = `tx_ad_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const tx: PointTransaction = {
      id: txId,
      userId,
      type: 'ad_reward',
      points: rewardPoints,
      inrAmount: rewardInr,
      balanceAfter: profile.pointsBalance,
      description: `Rewarded Video Ad bonus reward (+${rewardPoints} pts / ₹${rewardInr.toFixed(2)})`,
      referenceId: sessionId,
      createdAt: new Date().toISOString(),
    };
    database.point_transactions.unshift(tx);

    saveDatabase(database);

    const updatedPlanInfo = this.getUserEffectivePlan(userId);
    const adsRemaining = Math.max(0, dailyLimit - profile.dailyRewardedAdsCount);

    return {
      pointsAdded: rewardPoints,
      newBalance: profile.pointsBalance,
      newInrBalance: profile.pointsBalance / (settings.pointsToInrRatio || 10),
      dailyRewardedAdsCount: profile.dailyRewardedAdsCount,
      dailyRewardedAdsRemaining: adsRemaining,
      dailyEarnedPoints: updatedPlanInfo.dailyEarnedPoints,
      dailyPointsLimit: updatedPlanInfo.dailyPointsLimit,
      dailyPointsRemaining: updatedPlanInfo.dailyPointsRemaining,
      tx,
    };
  },

  // Subscription Orders & Payment Verification
  createSubscriptionOrder(
    userId: string,
    planId: SubscriptionPlanId,
    paymentMethod: SubscriptionOrder['paymentMethod'] = 'upi_qr',
    transactionReference?: string
  ): SubscriptionOrder {
    const database = loadDatabase();
    const { user, profile } = this.findUserById(userId) || {};
    if (!user || !profile) throw new Error('User not found');

    if (planId === 'free') {
      throw new Error('Free Plan does not require a payment order.');
    }

    const settings = database.app_settings || DEFAULT_SETTINGS;
    const planConfig = settings.plans[planId];
    if (!planConfig) throw new Error('Invalid plan selected.');

    const orderId = `SUB-${Math.floor(10000 + Math.random() * 90000)}`;
    const planNames: Record<SubscriptionPlanId, string> = {
      free: 'Free Plan',
      plan_99: '₹99 Monthly Plan',
      plan_499: '₹499 Monthly Plan',
      plan_2000: '₹2,000 Monthly Plan',
    };

    const newOrder: SubscriptionOrder = {
      id: orderId,
      userId,
      userEmail: user.email,
      userName: profile.name,
      planId,
      planName: planNames[planId],
      amountInr: planConfig.priceInr,
      dailyPointsLimit: planConfig.dailyLimit,
      status: 'pending',
      paymentMethod,
      transactionReference: transactionReference || undefined,
      createdAt: new Date().toISOString(),
    };

    database.subscription_orders.unshift(newOrder);
    saveDatabase(database);
    return newOrder;
  },

  verifySubscriptionPayment(
    orderId: string,
    adminOrVerifier = 'Payment Verification System',
    transactionReference?: string
  ): { order: SubscriptionOrder; profile: Profile } {
    const database = loadDatabase();
    const orderIndex = database.subscription_orders.findIndex((o) => o.id === orderId);
    if (orderIndex === -1) throw new Error('Subscription order not found');

    const order = database.subscription_orders[orderIndex];
    if (order.status === 'verified') {
      throw new Error('This order has already been verified and activated.');
    }

    const profile = database.profiles.find((p) => p.userId === order.userId);
    if (!profile) throw new Error('User profile not found for order');

    const ref = transactionReference || order.transactionReference || `UTR-${Date.now().toString().slice(-8)}`;

    // Ensure no duplicate reference used across verified orders
    const duplicateRef = database.subscription_orders.find(
      (o) => o.id !== orderId && o.status === 'verified' && o.transactionReference === ref
    );
    if (duplicateRef) {
      throw new Error(`Transaction reference ${ref} has already been used for order ${duplicateRef.id}.`);
    }

    const nowIso = new Date().toISOString();
    order.status = 'verified';
    order.transactionReference = ref;
    order.verifiedAt = nowIso;
    order.verifiedBy = adminOrVerifier;

    // Activate 30-day Subscription Plan
    profile.currentPlanId = order.planId;
    profile.subscriptionExpiresAt = new Date(Date.now() + 30 * 86400000).toISOString();

    // Record ledger transaction for plan upgrade
    const txId = `tx_sub_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    database.point_transactions.unshift({
      id: txId,
      userId: profile.userId,
      type: 'subscription_upgrade',
      points: 0,
      inrAmount: order.amountInr,
      balanceAfter: profile.pointsBalance,
      description: `Upgraded to ${order.planName} (₹${order.amountInr}/month) - Limit: ${order.dailyPointsLimit === null ? 'Unlimited' : order.dailyPointsLimit + ' pts/day'}`,
      referenceId: order.id,
      createdAt: nowIso,
    });

    database.subscription_orders[orderIndex] = order;
    const pIndex = database.profiles.findIndex((p) => p.userId === profile.userId);
    if (pIndex !== -1) {
      database.profiles[pIndex] = profile;
    }

    saveDatabase(database);
    return { order, profile };
  },

  rejectSubscriptionOrder(orderId: string, adminName: string, reason?: string): SubscriptionOrder {
    const database = loadDatabase();
    const order = database.subscription_orders.find((o) => o.id === orderId);
    if (!order) throw new Error('Subscription order not found');

    order.status = 'failed';
    order.verifiedAt = new Date().toISOString();
    order.verifiedBy = adminName;
    order.notes = reason || 'Payment verification failed: Invalid transaction reference or receipt';

    saveDatabase(database);
    return order;
  },

  setUserPlanDirect(
    userId: string,
    planId: SubscriptionPlanId,
    durationDays = 30,
    adminName = 'Super Admin'
  ): Profile {
    const database = loadDatabase();
    const profile = database.profiles.find((p) => p.userId === userId);
    if (!profile) throw new Error('User not found');

    profile.currentPlanId = planId;
    if (planId === 'free') {
      profile.subscriptionExpiresAt = null;
    } else {
      profile.subscriptionExpiresAt = new Date(Date.now() + durationDays * 86400000).toISOString();
    }

    const txId = `tx_adm_plan_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    database.point_transactions.unshift({
      id: txId,
      userId: profile.userId,
      type: 'admin_adjustment',
      points: 0,
      inrAmount: 0,
      balanceAfter: profile.pointsBalance,
      description: `Admin (${adminName}) changed plan to ${planId} (${durationDays} days)`,
      createdAt: new Date().toISOString(),
    });

    saveDatabase(database);
    return profile;
  },

  getAllSubscriptionOrders(statusFilter?: string): SubscriptionOrder[] {
    const database = loadDatabase();
    if (!statusFilter || statusFilter === 'all') {
      return database.subscription_orders;
    }
    return database.subscription_orders.filter((o) => o.status === statusFilter);
  },

  getUserSubscriptionOrders(userId: string): SubscriptionOrder[] {
    const database = loadDatabase();
    return database.subscription_orders.filter((o) => o.userId === userId);
  },

  updateUserProfile(userId: string, updates: Partial<Profile>): Profile | null {
    const database = loadDatabase();
    const index = database.profiles.findIndex((p) => p.userId === userId);
    if (index === -1) return null;
    database.profiles[index] = { ...database.profiles[index], ...updates };
    saveDatabase(database);
    return database.profiles[index];
  },

  updateUserStatus(userId: string, status: 'active' | 'frozen' | 'under_review'): User | null {
    const database = loadDatabase();
    const user = database.users.find((u) => u.id === userId);
    if (!user) return null;
    user.status = status;
    saveDatabase(database);
    return user;
  },

  // Record point ledger transaction atomically
  addPointTransaction(
    userId: string,
    type: PointTransaction['type'],
    points: number,
    inrAmount: number,
    description: string,
    referenceId?: string
  ): PointTransaction {
    const database = loadDatabase();
    const profile = database.profiles.find((p) => p.userId === userId);
    if (!profile) throw new Error('User profile not found for transaction');

    const txId = `tx_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const newBalance = profile.pointsBalance; // Balance is updated before/after caller

    const tx: PointTransaction = {
      id: txId,
      userId,
      type,
      points,
      inrAmount,
      balanceAfter: newBalance,
      description,
      referenceId,
      createdAt: new Date().toISOString(),
    };

    database.point_transactions.unshift(tx);
    saveDatabase(database);
    return tx;
  },

  getUserTransactions(userId: string, limit = 50): PointTransaction[] {
    const database = loadDatabase();
    return database.point_transactions.filter((tx) => tx.userId === userId).slice(0, limit);
  },

  // Withdrawals
  createWithdrawal(
    userId: string,
    pointsRequested: number,
    inrAmount: number,
    upiId: string
  ): { withdrawal: Withdrawal; profile: Profile; tx: PointTransaction } {
    const database = loadDatabase();
    const { user, profile } = this.findUserById(userId) || {};
    if (!user || !profile) throw new Error('User not found');

    if (user.status !== 'active') {
      throw new Error(`Account is currently ${user.status}. Withdrawals are suspended.`);
    }

    if (profile.pointsBalance < pointsRequested) {
      throw new Error('Insufficient points balance.');
    }

    // Atomically lock points
    profile.pointsBalance -= pointsRequested;
    profile.lockedPoints += pointsRequested;
    profile.upiId = upiId;

    const wid = `WID-${Math.floor(10000 + Math.random() * 90000)}`;
    const nowIso = new Date().toISOString();

    const withdrawal: Withdrawal = {
      id: wid,
      userId,
      userEmail: user.email,
      userName: profile.name,
      pointsRequested,
      inrAmount,
      upiId,
      status: 'pending',
      requestedAt: nowIso,
    };

    database.withdrawals.unshift(withdrawal);

    // Save profile updates
    const pIndex = database.profiles.findIndex((p) => p.userId === userId);
    if (pIndex !== -1) {
      database.profiles[pIndex] = profile;
    }

    // Create locked ledger transaction
    const txId = `tx_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const tx: PointTransaction = {
      id: txId,
      userId,
      type: 'withdrawal_locked',
      points: -pointsRequested,
      inrAmount,
      balanceAfter: profile.pointsBalance,
      description: `Locked ${pointsRequested} pts (₹${inrAmount}) for UPI Withdrawal request (${wid}) to ${upiId}`,
      referenceId: wid,
      createdAt: nowIso,
    };
    database.point_transactions.unshift(tx);

    saveDatabase(database);
    return { withdrawal, profile, tx };
  },

  getUserWithdrawals(userId: string): Withdrawal[] {
    const database = loadDatabase();
    return database.withdrawals.filter((w) => w.userId === userId);
  },

  getAllWithdrawals(statusFilter?: string): Withdrawal[] {
    const database = loadDatabase();
    if (!statusFilter || statusFilter === 'all') {
      return database.withdrawals;
    }
    return database.withdrawals.filter((w) => w.status === statusFilter);
  },

  processWithdrawal(
    withdrawalId: string,
    action: 'approve' | 'reject' | 'paid',
    adminName: string,
    utrNumber?: string,
    rejectionReason?: string
  ): { withdrawal: Withdrawal; profile?: Profile } {
    const database = loadDatabase();
    const wIndex = database.withdrawals.findIndex((w) => w.id === withdrawalId);
    if (wIndex === -1) throw new Error('Withdrawal request not found');

    const withdrawal = database.withdrawals[wIndex];
    const profile = database.profiles.find((p) => p.userId === withdrawal.userId);
    const nowIso = new Date().toISOString();

    if (action === 'paid') {
      if (!utrNumber || utrNumber.trim().length < 4) {
        throw new Error('Valid Bank/UPI UTR reference number is required to mark as Paid.');
      }
      withdrawal.status = 'paid';
      withdrawal.utrNumber = utrNumber.trim();
      withdrawal.processedAt = nowIso;
      withdrawal.processedBy = adminName;

      if (profile) {
        profile.lockedPoints = Math.max(0, profile.lockedPoints - withdrawal.pointsRequested);
        profile.totalWithdrawnInr += withdrawal.inrAmount;

        // Add settled ledger record
        const txId = `tx_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        database.point_transactions.unshift({
          id: txId,
          userId: profile.userId,
          type: 'withdrawal_settled',
          points: 0,
          inrAmount: withdrawal.inrAmount,
          balanceAfter: profile.pointsBalance,
          description: `UPI Payout of ₹${withdrawal.inrAmount} successfully completed (UTR: ${withdrawal.utrNumber})`,
          referenceId: withdrawal.id,
          createdAt: nowIso,
        });
      }
    } else if (action === 'approve') {
      withdrawal.status = 'approved';
      withdrawal.processedAt = nowIso;
      withdrawal.processedBy = adminName;
    } else if (action === 'reject') {
      withdrawal.status = 'rejected';
      withdrawal.rejectionReason = rejectionReason || 'Information mismatch or suspicious activity';
      withdrawal.processedAt = nowIso;
      withdrawal.processedBy = adminName;

      // Unlock and refund points back to available balance!
      if (profile) {
        profile.lockedPoints = Math.max(0, profile.lockedPoints - withdrawal.pointsRequested);
        profile.pointsBalance += withdrawal.pointsRequested;

        // Add refund ledger record
        const txId = `tx_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        database.point_transactions.unshift({
          id: txId,
          userId: profile.userId,
          type: 'withdrawal_refund',
          points: withdrawal.pointsRequested,
          inrAmount: withdrawal.inrAmount,
          balanceAfter: profile.pointsBalance,
          description: `Refund of ${withdrawal.pointsRequested} pts (₹${withdrawal.inrAmount}) due to rejected withdrawal: ${withdrawal.rejectionReason}`,
          referenceId: withdrawal.id,
          createdAt: nowIso,
        });
      }
    }

    database.withdrawals[wIndex] = withdrawal;
    saveDatabase(database);
    return { withdrawal, profile };
  },

  // Fraud flags
  addFraudFlag(flag: Omit<FraudFlag, 'id' | 'detectedAt' | 'resolved'>): FraudFlag {
    const database = loadDatabase();
    const flagId = `flag_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const newFlag: FraudFlag = {
      ...flag,
      id: flagId,
      detectedAt: new Date().toISOString(),
      resolved: false,
    };
    database.fraud_flags.unshift(newFlag);

    // Increase user's fraud score
    const profile = database.profiles.find((p) => p.userId === flag.userId);
    if (profile) {
      const scoreAdd = flag.severity === 'high' ? 35 : flag.severity === 'medium' ? 15 : 5;
      profile.fraudScore = Math.min(100, (profile.fraudScore || 0) + scoreAdd);

      // Auto-freeze if fraud score >= 70
      if (profile.fraudScore >= 70) {
        const user = database.users.find((u) => u.id === flag.userId);
        if (user && user.status === 'active') {
          user.status = 'frozen';
          console.warn(`[AntiFraud] User ${user.id} (${user.email}) AUTO-FROZEN due to fraud score: ${profile.fraudScore}`);
        }
      }
    }

    saveDatabase(database);
    return newFlag;
  },

  getFraudFlags(): FraudFlag[] {
    const database = loadDatabase();
    return database.fraud_flags;
  },

  resolveFraudFlag(flagId: string): boolean {
    const database = loadDatabase();
    const flag = database.fraud_flags.find((f) => f.id === flagId);
    if (!flag) return false;
    flag.resolved = true;
    saveDatabase(database);
    return true;
  },

  // Nonce validation (Anti-replay)
  validateAndUseNonce(nonce: string): boolean {
    const database = loadDatabase();
    if (!nonce || typeof nonce !== 'string' || nonce.length < 8) return false;
    if (database.usedNonces[nonce]) {
      return false; // Already used
    }
    database.usedNonces[nonce] = Date.now();
    saveDatabase(database);
    return true;
  },

  // OTP management
  setOtp(email: string, code: string): void {
    const database = loadDatabase();
    database.otps[email.toLowerCase().trim()] = {
      code,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 mins
    };
    saveDatabase(database);
  },

  verifyOtp(email: string, code: string): boolean {
    const database = loadDatabase();
    const cleanEmail = email.toLowerCase().trim();
    const entry = database.otps[cleanEmail];
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      delete database.otps[cleanEmail];
      saveDatabase(database);
      return false;
    }
    if (entry.code === code.trim()) {
      delete database.otps[cleanEmail];
      saveDatabase(database);
      return true;
    }
    return false;
  },

  getAdminStats(): AdminStats {
    const database = loadDatabase();
    const today = getTodayString();

    const activeUsersToday = database.profiles.filter((p) => p.lastTapDate === today && p.dailyTapsCount > 0).length;
    const totalPointsIssued = database.point_transactions
      .filter((t) => t.type === 'tap_reward' || t.type === 'bonus' || (t.type === 'admin_adjustment' && t.points > 0))
      .reduce((sum, t) => sum + t.points, 0);

    const pendingWithdrawals = database.withdrawals.filter((w) => w.status === 'pending');
    const paidWithdrawals = database.withdrawals.filter((w) => w.status === 'paid');
    const rejectedWithdrawals = database.withdrawals.filter((w) => w.status === 'rejected');

    const pendingWithdrawalsInr = pendingWithdrawals.reduce((sum, w) => sum + w.inrAmount, 0);
    const paidWithdrawalsInr = paidWithdrawals.reduce((sum, w) => sum + w.inrAmount, 0);
    const flaggedUsersCount = database.profiles.filter((p) => p.fraudScore > 20).length;
    const totalRewardedAdsWatched = database.point_transactions.filter((t) => t.type === 'ad_reward').length;

    const verifiedOrders = database.subscription_orders.filter((o) => o.status === 'verified');
    const totalSubscriptionRevenueInr = verifiedOrders.reduce((sum, o) => sum + o.amountInr, 0);
    const pendingSubscriptionOrdersCount = database.subscription_orders.filter((o) => o.status === 'pending').length;
    const activePaidSubscriptionsCount = database.profiles.filter(
      (p) => p.currentPlanId !== 'free' && (!p.subscriptionExpiresAt || new Date(p.subscriptionExpiresAt).getTime() > Date.now())
    ).length;

    return {
      totalUsers: database.users.length,
      activeUsersToday,
      totalPointsIssued,
      totalPointsValueInr: totalPointsIssued / (database.app_settings.pointsToInrRatio || 10),
      totalWithdrawalsCount: database.withdrawals.length,
      pendingWithdrawalsCount: pendingWithdrawals.length,
      pendingWithdrawalsInr,
      paidWithdrawalsInr,
      rejectedWithdrawalsCount: rejectedWithdrawals.length,
      flaggedUsersCount,
      totalRewardedAdsWatched,
      totalSubscriptionRevenueInr,
      activePaidSubscriptionsCount,
      pendingSubscriptionOrdersCount,
    };
  },

  getAllUsersWithProfiles(): Array<{ user: User; profile: Profile }> {
    const database = loadDatabase();
    return database.users.map((u) => {
      const profile = database.profiles.find((p) => p.userId === u.id) || {
        userId: u.id,
        name: u.email.split('@')[0],
        totalTaps: 0,
        pointsBalance: 0,
        lockedPoints: 0,
        totalWithdrawnInr: 0,
        dailyTapsCount: 0,
        lastTapDate: getTodayString(),
        fraudScore: 0,
        dailyRewardedAdsCount: 0,
        lastRewardedAdDate: getTodayString(),
        dailyEarnedPoints: 0,
        lastEarningDate: getTodayString(),
        currentPlanId: 'free' as SubscriptionPlanId,
        subscriptionExpiresAt: null,
      };
      return { user: u, profile };
    });
  },
};

