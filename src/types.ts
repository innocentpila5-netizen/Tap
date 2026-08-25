export type UserRole = 'user' | 'admin';
export type AccountStatus = 'active' | 'frozen' | 'under_review';
export type WithdrawalStatus = 'pending' | 'approved' | 'rejected' | 'paid';
export type SubscriptionPlanId = 'free' | 'plan_99' | 'plan_499' | 'plan_2000';
export type PaymentStatus = 'pending' | 'verified' | 'failed';

export type TransactionType =
  | 'tap_reward'
  | 'ad_reward'
  | 'withdrawal_locked'
  | 'withdrawal_refund'
  | 'withdrawal_settled'
  | 'admin_adjustment'
  | 'bonus'
  | 'subscription_upgrade';

export interface PlanConfig {
  id: SubscriptionPlanId;
  name: string;
  priceInr: number;
  dailyPointsLimit: number | null; // null for unlimited
  description: string;
  badge: string;
  features: string[];
  popular?: boolean;
}

export interface SubscriptionOrder {
  id: string; // e.g. "SUB-98124"
  userId: string;
  userEmail: string;
  userName: string;
  planId: SubscriptionPlanId;
  planName: string;
  amountInr: number;
  dailyPointsLimit: number | null;
  status: PaymentStatus;
  paymentMethod: 'upi_qr' | 'upi_intent' | 'netbanking' | 'card' | 'admin_manual';
  transactionReference?: string; // UPI UTR or Payment ID
  createdAt: string;
  verifiedAt?: string;
  verifiedBy?: string;
  notes?: string;
}

export interface User {
  id: string; // e.g. "TP-492810"
  email: string;
  role: UserRole;
  status: AccountStatus;
  createdAt: string;
  lastLoginAt: string;
  deviceFingerprint?: string;
  ipAddress?: string;
}

export interface Profile {
  userId: string;
  name: string;
  upiId?: string;
  totalTaps: number;
  pointsBalance: number; // available points
  lockedPoints: number; // points held in pending withdrawal
  totalWithdrawnInr: number;
  dailyTapsCount: number;
  lastTapDate: string; // YYYY-MM-DD
  dailyRewardedAdsCount: number;
  lastRewardedAdDate?: string;
  dailyEarnedPoints: number; // total points earned today (taps + ads + bonuses)
  lastEarningDate: string; // YYYY-MM-DD for server-authoritative reset
  currentPlanId: SubscriptionPlanId;
  subscriptionExpiresAt?: string | null;
  fraudScore: number; // 0 - 100
}

export interface PointTransaction {
  id: string;
  userId: string;
  type: TransactionType;
  points: number; // positive or negative
  inrAmount: number;
  balanceAfter: number;
  description: string;
  referenceId?: string;
  createdAt: string;
}

export interface Withdrawal {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  pointsRequested: number;
  inrAmount: number;
  upiId: string;
  status: WithdrawalStatus;
  utrNumber?: string;
  rejectionReason?: string;
  requestedAt: string;
  processedAt?: string;
  processedBy?: string;
}

export interface FraudFlag {
  id: string;
  userId: string;
  userEmail: string;
  flagType:
    | 'rapid_clicking'
    | 'robotic_cadence'
    | 'replay_attack'
    | 'excessive_burst'
    | 'device_mismatch'
    | 'multiple_accounts'
    | 'invalid_nonce'
    | 'withdrawal_spike'
    | 'ad_bypass_attempt'
    | 'daily_limit_exceeded';
  severity: 'low' | 'medium' | 'high';
  details: string;
  detectedAt: string;
  resolved: boolean;
  metadata?: Record<string, any>;
}

export interface PlanSettingItem {
  priceInr: number;
  dailyLimit: number | null; // null for unlimited
}

export interface AppSettings {
  pointsPerTap: number; // e.g., 10
  pointsToInrRatio: number; // 10 points = 1 INR (100 points = 10 INR)
  minWithdrawalInr: number; // e.g., 10 INR
  dailyTapLimit: number; // fallback tap limit
  minTapIntervalMs: number; // e.g., 200ms
  strictAntiBot: boolean;
  plans: {
    free: PlanSettingItem;
    plan_99: PlanSettingItem;
    plan_499: PlanSettingItem;
    plan_2000: PlanSettingItem;
  };
  admobEnabled: boolean;
  admobAppId: string;
  admobBannerId: string;
  admobInterstitialId: string;
  admobRewardedId: string;
  adFrequencyTaps: number;
  interstitialCooldownSeconds: number;
  rewardedAdPoints: number;
  rewardedAdDailyLimit: number;
  isTestMode: boolean;
}

export interface AdminStats {
  totalUsers: number;
  activeUsersToday: number;
  totalPointsIssued: number;
  totalPointsValueInr: number;
  totalWithdrawalsCount: number;
  pendingWithdrawalsCount: number;
  pendingWithdrawalsInr: number;
  paidWithdrawalsInr: number;
  rejectedWithdrawalsCount: number;
  flaggedUsersCount: number;
  totalRewardedAdsWatched: number;
  totalSubscriptionRevenueInr: number;
  activePaidSubscriptionsCount: number;
  pendingSubscriptionOrdersCount: number;
}

export interface TapResponse {
  success: boolean;
  pointsAdded: number;
  newBalance: number;
  newInrBalance: number;
  dailyTapsCount: number;
  dailyTapsRemaining: number;
  dailyEarnedPoints: number;
  dailyPointsLimit: number | null;
  dailyPointsRemaining: number | null; // null for unlimited
  currentPlanId: SubscriptionPlanId;
  totalTaps: number;
  nextNonce: string;
  error?: string;
  warning?: string;
  accountStatus?: AccountStatus;
}

export interface AdSessionResponse {
  sessionId: string;
  adUnitId: string;
  rewardAmount: number;
  minWatchDurationSeconds: number;
  timestamp: number;
  isTestMode: boolean;
}

export interface RewardedAdClaimResponse {
  success: boolean;
  pointsAdded: number;
  newBalance: number;
  newInrBalance: number;
  dailyRewardedAdsCount: number;
  dailyRewardedAdsRemaining: number;
  dailyEarnedPoints: number;
  dailyPointsLimit: number | null;
  dailyPointsRemaining: number | null;
  message: string;
  error?: string;
}

export type AdLoadState = 'idle' | 'loading' | 'loaded' | 'showing' | 'rewarded' | 'closed' | 'failed';

