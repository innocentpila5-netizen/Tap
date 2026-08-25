import { api } from './api.js';
import { AppSettings, AdLoadState } from '../types.js';

export interface AdMobCallbacks {
  onAdLoaded?: (adUnit: 'banner' | 'interstitial' | 'rewarded') => void;
  onAdFailedToLoad?: (adUnit: 'banner' | 'interstitial' | 'rewarded', error: string) => void;
  onAdOpened?: (adUnit: 'banner' | 'interstitial' | 'rewarded') => void;
  onAdClosed?: (adUnit: 'banner' | 'interstitial' | 'rewarded') => void;
  onUserEarnedReward?: (rewardAmount: number, pointsAdded: number) => void;
}

class AdMobService {
  private lastInterstitialShownTime = 0;
  private tapCountSinceLastAd = 0;
  private isInterstitialReady = false;
  private isRewardedReady = false;
  private activeSessionId: string | null = null;
  private settings: AppSettings | null = null;

  // Initialize with server-provided settings
  init(settings: AppSettings) {
    this.settings = settings;
  }

  getSettings(): AppSettings | null {
    return this.settings;
  }

  // Record tap towards natural break interstitial frequency
  registerTap(): boolean {
    if (!this.settings || !this.settings.admobEnabled) return false;
    this.tapCountSinceLastAd++;
    return this.shouldShowNaturalBreakInterstitial();
  }

  // Determine if natural break interstitial should be shown
  shouldShowNaturalBreakInterstitial(): boolean {
    if (!this.settings || !this.settings.admobEnabled) return false;
    
    const now = Date.now();
    const cooldownMs = (this.settings.interstitialCooldownSeconds || 60) * 1000;
    const isCooldownElapsed = now - this.lastInterstitialShownTime >= cooldownMs;
    const isFrequencyMet = this.tapCountSinceLastAd >= (this.settings.adFrequencyTaps || 30);

    return isCooldownElapsed && isFrequencyMet;
  }

  // Mark interstitial as shown to reset cooldown & tap counter
  recordInterstitialShown() {
    this.lastInterstitialShownTime = Date.now();
    this.tapCountSinceLastAd = 0;
  }

  // Check if Native Android AdMob Bridge is available
  hasNativeAndroidBridge(): boolean {
    if (typeof window === 'undefined') return false;
    const win = window as any;
    return !!(win.AndroidAdMob || win.AndroidBridge || win.admob || win.Capacitor?.Plugins?.AdMob);
  }

  // Request native Android banner
  showNativeBanner(bannerId: string) {
    if (typeof window === 'undefined') return;
    const win = window as any;
    try {
      if (win.AndroidAdMob?.showBanner) {
        win.AndroidAdMob.showBanner(bannerId);
      } else if (win.Capacitor?.Plugins?.AdMob?.showBanner) {
        win.Capacitor.Plugins.AdMob.showBanner({ adId: bannerId, isTesting: this.settings?.isTestMode });
      }
    } catch (err) {
      console.warn('[AdMob] Native banner show failed gracefully:', err);
    }
  }

  // Start rewarded ad session on the server
  async startRewardedAd(): Promise<{
    sessionId: string;
    adUnitId: string;
    rewardAmount: number;
    minWatchDurationSeconds: number;
    timestamp: number;
    isTestMode: boolean;
  }> {
    const session = await api.startRewardedAdSession();
    this.activeSessionId = session.sessionId;
    return session;
  }

  // Claim reward with server-side validation
  async claimRewardedAd(durationSeconds: number): Promise<{
    pointsAdded: number;
    newBalance: number;
    newInrBalance: number;
    dailyRewardedAdsCount: number;
    dailyRewardedAdsRemaining: number;
    message: string;
  }> {
    if (!this.activeSessionId) {
      throw new Error('No active ad session found. Please watch the ad.');
    }
    const result = await api.claimRewardedAd(this.activeSessionId, durationSeconds);
    this.activeSessionId = null;
    return result;
  }
}

export const admobService = new AdMobService();
