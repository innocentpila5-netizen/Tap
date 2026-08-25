import {
  User,
  Profile,
  PointTransaction,
  Withdrawal,
  FraudFlag,
  AppSettings,
  AdminStats,
  TapResponse,
  AccountStatus,
} from '../types.js';

class ApiService {
  private token: string | null = null;
  private cachedNonce: string | null = null;
  private lastTapTimestamp = 0;

  constructor() {
    this.token = localStorage.getItem('tappoints_token') || 'TP-782194';
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('tappoints_token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('tappoints_token');
  }

  getToken(): string | null {
    return this.token;
  }

  private getHeaders(adminPin?: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.token) {
      headers['x-user-id'] = this.token;
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    if (adminPin) {
      headers['x-admin-pin'] = adminPin;
    }
    return headers;
  }

  // --- AUTH ---
  async sendOtp(email: string): Promise<{ success: boolean; message: string; demoCode?: string }> {
    const res = await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to send OTP');
    }
    return res.json();
  }

  async verifyOtp(
    email: string,
    code: string,
    name?: string,
    deviceFingerprint?: string
  ): Promise<{ success: boolean; token: string; user: User; profile: Profile; settings: AppSettings }> {
    const res = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code, name, deviceFingerprint }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Invalid OTP code');
    }
    const data = await res.json();
    this.setToken(data.token);
    return data;
  }

  async adminLogin(pin: string): Promise<{ success: boolean; role: string }> {
    const res = await fetch('/api/auth/admin-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Admin login failed');
    }
    return res.json();
  }

  async getMe(): Promise<{
    user: User;
    profile: Profile;
    settings: AppSettings;
    dailyTapsRemaining: number;
    inrBalance: number;
    lockedInr: number;
  }> {
    const res = await fetch('/api/auth/me', {
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to fetch user data');
    }
    return res.json();
  }

  async updateProfile(name?: string, upiId?: string): Promise<{ success: boolean; profile: Profile }> {
    const res = await fetch('/api/auth/update-profile', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ name, upiId }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update profile');
    }
    return res.json();
  }

  // --- TAPPING & NONCE ---
  async getNonce(): Promise<string> {
    if (this.cachedNonce) {
      const nonce = this.cachedNonce;
      this.cachedNonce = null;
      return nonce;
    }
    const res = await fetch('/api/points/nonce', {
      headers: this.getHeaders(),
    });
    const data = await res.json();
    return data.nonce;
  }

  async recordTap(options?: {
    isSimulatedBot?: boolean;
    forcedNonce?: string;
    forcedTimestamp?: number;
  }): Promise<TapResponse> {
    const now = Date.now();
    const clientInterval = this.lastTapTimestamp > 0 ? now - this.lastTapTimestamp : 500;
    this.lastTapTimestamp = now;

    const nonce = options?.forcedNonce || (await this.getNonce());
    const timestamp = options?.forcedTimestamp || now;

    const res = await fetch('/api/points/tap', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        nonce,
        clientTimestamp: timestamp,
        clientInterval,
        deviceFingerprint: 'browser-fp-' + (window.navigator.userAgent.length || 42),
        isSimulatedBot: options?.isSimulatedBot,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Tap failed');
    }

    if (data.nextNonce) {
      this.cachedNonce = data.nextNonce;
    }

    return data;
  }

  async getTransactions(): Promise<PointTransaction[]> {
    const res = await fetch('/api/points/transactions', {
      headers: this.getHeaders(),
    });
    const data = await res.json();
    return data.transactions || [];
  }

  // --- WITHDRAWALS ---
  async createWithdrawal(inrAmount: number, upiId: string): Promise<{ success: boolean; withdrawal: Withdrawal; profile: Profile }> {
    const res = await fetch('/api/withdrawals/create', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ inrAmount, upiId }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Withdrawal failed');
    }
    return data;
  }

  async getWithdrawals(): Promise<Withdrawal[]> {
    const res = await fetch('/api/withdrawals/history', {
      headers: this.getHeaders(),
    });
    const data = await res.json();
    return data.withdrawals || [];
  }

  async getAdsConfig(): Promise<{
    enabled: boolean;
    appId: string;
    bannerId: string;
    interstitialId: string;
    rewardedId: string;
    frequency: number;
    interstitialCooldownSeconds: number;
    rewardedAdPoints: number;
    rewardedAdDailyLimit: number;
    isTestMode: boolean;
    disclaimer: string;
  }> {
    const res = await fetch('/api/ads/config');
    return res.json();
  }

  async startRewardedAdSession(): Promise<{
    success: boolean;
    sessionId: string;
    adUnitId: string;
    rewardAmount: number;
    minWatchDurationSeconds: number;
    timestamp: number;
    isTestMode: boolean;
  }> {
    const res = await fetch('/api/ads/rewarded/start', {
      method: 'POST',
      headers: this.getHeaders(),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Cannot start rewarded ad');
    }
    return data;
  }

  async claimRewardedAd(
    sessionId: string,
    durationSeconds: number
  ): Promise<{
    success: boolean;
    message: string;
    pointsAdded: number;
    newBalance: number;
    newInrBalance: number;
    dailyRewardedAdsCount: number;
    dailyRewardedAdsRemaining: number;
  }> {
    const res = await fetch('/api/ads/rewarded/claim', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ sessionId, durationSeconds }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to claim reward');
    }
    return data;
  }

  // --- ADMIN METHODS ---
  async getAdminOverview(pin?: string): Promise<{ stats: AdminStats; settings: AppSettings }> {
    const res = await fetch('/api/admin/overview', {
      headers: this.getHeaders(pin),
    });
    if (!res.ok) throw new Error('Admin authorization required');
    return res.json();
  }

  async getAdminUsers(search?: string, pin?: string): Promise<{ users: Array<{ user: User; profile: Profile }> }> {
    const res = await fetch(`/api/admin/users?search=${encodeURIComponent(search || '')}`, {
      headers: this.getHeaders(pin),
    });
    if (!res.ok) throw new Error('Admin authorization required');
    return res.json();
  }

  async getAdminUserDetails(userId: string, pin?: string): Promise<{
    user: User;
    profile: Profile;
    transactions: PointTransaction[];
    withdrawals: Withdrawal[];
    flags: FraudFlag[];
  }> {
    const res = await fetch(`/api/admin/users/${userId}`, {
      headers: this.getHeaders(pin),
    });
    if (!res.ok) throw new Error('Admin authorization required');
    return res.json();
  }

  async setAdminUserStatus(userId: string, status: AccountStatus, pin?: string): Promise<User> {
    const res = await fetch(`/api/admin/users/${userId}/status`, {
      method: 'POST',
      headers: this.getHeaders(pin),
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update status');
    return data.user;
  }

  async adminAdjustPoints(userId: string, pointsDelta: number, reason: string, pin?: string): Promise<number> {
    const res = await fetch(`/api/admin/users/${userId}/adjust-points`, {
      method: 'POST',
      headers: this.getHeaders(pin),
      body: JSON.stringify({ pointsDelta, reason }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to adjust points');
    return data.newBalance;
  }

  async getAdminWithdrawals(status?: string, pin?: string): Promise<Withdrawal[]> {
    const res = await fetch(`/api/admin/withdrawals?status=${status || 'all'}`, {
      headers: this.getHeaders(pin),
    });
    const data = await res.json();
    if (!res.ok) throw new Error('Failed to load withdrawals');
    return data.withdrawals || [];
  }

  async processAdminWithdrawal(
    withdrawalId: string,
    action: 'approve' | 'reject' | 'paid',
    options?: { utrNumber?: string; rejectionReason?: string; adminName?: string; pin?: string }
  ): Promise<{ withdrawal: Withdrawal; profile?: Profile }> {
    const res = await fetch(`/api/admin/withdrawals/${withdrawalId}/action`, {
      method: 'POST',
      headers: this.getHeaders(options?.pin),
      body: JSON.stringify({
        action,
        utrNumber: options?.utrNumber,
        rejectionReason: options?.rejectionReason,
        adminName: options?.adminName || 'Admin',
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to process withdrawal action');
    return data;
  }

  async getAdminFraudFlags(pin?: string): Promise<FraudFlag[]> {
    const res = await fetch('/api/admin/fraud-flags', {
      headers: this.getHeaders(pin),
    });
    const data = await res.json();
    return data.flags || [];
  }

  async resolveAdminFraudFlag(flagId: string, pin?: string): Promise<boolean> {
    const res = await fetch(`/api/admin/fraud-flags/${flagId}/resolve`, {
      method: 'POST',
      headers: this.getHeaders(pin),
    });
    const data = await res.json();
    return data.success;
  }

  async updateAdminSettings(settings: Partial<AppSettings>, pin?: string): Promise<AppSettings> {
    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: this.getHeaders(pin),
      body: JSON.stringify(settings),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update settings');
    return data.settings;
  }

  // --- SUBSCRIPTIONS ---
  async getSubscriptionPlans(): Promise<{ plans: any[]; disclaimer: string }> {
    const res = await fetch('/api/subscriptions/plans');
    return res.json();
  }

  async getAdminSubscriptionOrders(status?: string, pin?: string): Promise<any[]> {
    const res = await fetch(`/api/admin/subscriptions/orders?status=${status || 'all'}`, {
      headers: this.getHeaders(pin),
    });
    const data = await res.json();
    return data.orders || [];
  }

  async verifyAdminSubscriptionOrder(
    orderId: string,
    transactionReference?: string,
    pin?: string
  ): Promise<{ order: any; profile: Profile }> {
    const res = await fetch(`/api/admin/subscriptions/orders/${orderId}/verify`, {
      method: 'POST',
      headers: this.getHeaders(pin),
      body: JSON.stringify({ transactionReference }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to verify subscription');
    return data;
  }

  async rejectAdminSubscriptionOrder(orderId: string, reason: string, pin?: string): Promise<{ order: any }> {
    const res = await fetch(`/api/admin/subscriptions/orders/${orderId}/reject`, {
      method: 'POST',
      headers: this.getHeaders(pin),
      body: JSON.stringify({ reason }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to reject subscription');
    return data;
  }

  async setAdminUserPlan(
    userId: string,
    planId: string,
    durationDays = 30,
    pin?: string
  ): Promise<{ profile: Profile }> {
    const res = await fetch(`/api/admin/users/${userId}/plan`, {
      method: 'POST',
      headers: this.getHeaders(pin),
      body: JSON.stringify({ planId, durationDays }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to set plan');
    return data;
  }
}

export const api = new ApiService();

