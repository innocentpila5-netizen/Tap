import React, { useState, useEffect, useCallback } from 'react';
import {
  Zap,
  Shield,
  User as UserIcon,
  Smartphone,
  Monitor,
  RefreshCw,
  AlertCircle,
  Sparkles,
  Info,
  ShieldAlert,
  Coins,
  ArrowUpRight,
  Award,
} from 'lucide-react';
import { User, Profile, AppSettings, AccountStatus } from './types.js';
import { api } from './services/api.js';
import { admobService } from './services/admobService.js';
import { TapButton } from './components/TapButton.js';
import { BalanceCard } from './components/BalanceCard.js';
import { DailyLimitCard } from './components/DailyLimitCard.js';
import { AdMobBanner } from './components/AdMobBanner.js';
import { AdRewardsSection } from './components/AdRewardsSection.js';
import { RewardedAdModal } from './components/RewardedAdModal.js';
import { InterstitialAdModal } from './components/InterstitialAdModal.js';
import { WithdrawModal } from './components/WithdrawModal.js';
import { HistoryModal } from './components/HistoryModal.js';
import { ProfileModal } from './components/ProfileModal.js';
import { AuthModal } from './components/AuthModal.js';
import { AdminPanel } from './components/AdminPanel.js';
import { SubscriptionModal } from './components/SubscriptionModal.js';
import { triggerHaptic, playCoinSound } from './utils/audio.js';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [settings, setSettings] = useState<AppSettings>({
    pointsPerTap: 10,
    pointsToInrRatio: 10,
    minWithdrawalInr: 10,
    dailyTapLimit: 500,
    minTapIntervalMs: 200,
    strictAntiBot: true,
    plans: {
      free: { priceInr: 0, dailyLimit: 500 },
      plan_99: { priceInr: 99, dailyLimit: 1000 },
      plan_499: { priceInr: 499, dailyLimit: 5000 },
      plan_2000: { priceInr: 2000, dailyLimit: null },
    },
    admobEnabled: true,
    admobAppId: 'ca-app-pub-3940256099942544~3347511713',
    admobBannerId: 'ca-app-pub-3940256099942544/6300978111',
    admobInterstitialId: 'ca-app-pub-3940256099942544/1033173712',
    admobRewardedId: 'ca-app-pub-3940256099942544/5224354917',
    adFrequencyTaps: 30,
    interstitialCooldownSeconds: 60,
    rewardedAdPoints: 50,
    rewardedAdDailyLimit: 5,
    isTestMode: true,
  });

  const [loading, setLoading] = useState(true);
  const [isTapping, setIsTapping] = useState(false);
  const [tapError, setTapError] = useState<string | null>(null);
  const [isMobileFrame, setIsMobileFrame] = useState(true);
  const [rewardToast, setRewardToast] = useState<string | null>(null);

  // Modals
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isRewardedAdOpen, setIsRewardedAdOpen] = useState(false);
  const [isInterstitialAdOpen, setIsInterstitialAdOpen] = useState(false);
  const [isPlansOpen, setIsPlansOpen] = useState(false);

  // Load user data on startup
  const loadUserData = useCallback(async () => {
    try {
      const data = await api.getMe();
      setUser(data.user);
      setProfile(data.profile);
      if (data.settings) {
        setSettings(data.settings);
        admobService.init(data.settings);
      }
    } catch {
      // If no session found, open auth or fallback to demo
      setIsAuthOpen(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  // Handle Tap
  const handleTap = async () => {
    if (!user || !profile) return;
    if (user.status === 'frozen') {
      setTapError('Your account is frozen due to security policy violations.');
      triggerHaptic('error');
      return;
    }

    setTapError(null);
    setIsTapping(true);

    try {
      const response = await api.recordTap();
      // Update local profile balance with server-authoritative numbers
      setProfile((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          pointsBalance: response.newBalance,
          totalTaps: response.totalTaps,
          dailyTapsCount: response.dailyTapsCount,
          dailyEarnedPoints: response.dailyEarnedPoints,
          currentPlanId: response.currentPlanId || prev.currentPlanId,
        };
      });

      // Check if natural break interstitial should be shown
      const shouldShowInterstitial = admobService.registerTap();
      if (shouldShowInterstitial && !isRewardedAdOpen && !isWithdrawOpen) {
        admobService.recordInterstitialShown();
        setTimeout(() => {
          setIsInterstitialAdOpen(true);
        }, 300);
      }
    } catch (err: any) {
      setTapError(err.message || 'Tap validation failed on server.');
      triggerHaptic('error');
    } finally {
      setIsTapping(false);
    }
  };

  const handleAuthSuccess = (data: { user: User; profile: Profile; settings: AppSettings }) => {
    setUser(data.user);
    setProfile(data.profile);
    if (data.settings) {
      setSettings(data.settings);
      admobService.init(data.settings);
    }
    setTapError(null);
  };

  const handleLogout = () => {
    api.clearToken();
    setUser(null);
    setProfile(null);
    setIsProfileOpen(false);
    setIsAuthOpen(true);
  };

  const handleRewardedAdEarned = (pointsAdded: number, newBalance: number, newInrBalance: number) => {
    playCoinSound();
    triggerHaptic('heavy');
    setProfile((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        pointsBalance: newBalance,
        dailyEarnedPoints: (prev.dailyEarnedPoints || 0) + pointsAdded,
        dailyRewardedAdsCount: (prev.dailyRewardedAdsCount || 0) + 1,
        lastRewardedAdDate: new Date().toISOString().split('T')[0],
      };
    });

    setRewardToast(`🎉 +${pointsAdded} Points (₹${(pointsAdded / (settings.pointsToInrRatio || 10)).toFixed(2)}) credited to your wallet!`);
    setTimeout(() => {
      setRewardToast(null);
    }, 4000);
  };

  const openWithdrawalWithAdCheck = () => {
    setIsWithdrawOpen(true);
  };

  const currentPlan = profile?.currentPlanId || 'free';
  const plans = settings.plans || {
    free: { priceInr: 0, dailyLimit: 500 },
    plan_99: { priceInr: 99, dailyLimit: 1000 },
    plan_499: { priceInr: 499, dailyLimit: 5000 },
    plan_2000: { priceInr: 2000, dailyLimit: null },
  };
  const activePlanLimit = plans[currentPlan]?.dailyLimit ?? 500;
  const isUnlimitedPlan = activePlanLimit === null;
  const dailyLimitReached = Boolean(
    profile && !isUnlimitedPlan && (profile.dailyEarnedPoints || 0) >= activePlanLimit
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-start antialiased selection:bg-emerald-500 selection:text-white font-sans">
      {/* Top Device Bar */}
      <header className="w-full bg-slate-900/90 border-b border-slate-850 py-2 px-4 flex items-center justify-between z-30 sticky top-0 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
            <Zap className="w-4 h-4 fill-white" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tight text-white flex items-center gap-1.5">
              <span>TapPoints</span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">
                v1.0
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Mobile frame toggle */}
          <button
            onClick={() => setIsMobileFrame(!isMobileFrame)}
            className="hidden sm:flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg text-xs font-semibold border border-slate-700 transition cursor-pointer"
            title="Toggle Mobile Shell"
          >
            {isMobileFrame ? <Monitor className="w-3.5 h-3.5" /> : <Smartphone className="w-3.5 h-3.5" />}
            <span>{isMobileFrame ? 'Desktop' : 'Mobile'}</span>
          </button>

          {/* Admin Launcher */}
          <button
            id="admin-console-button"
            onClick={() => setIsAdminOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-950/60 hover:bg-purple-900/60 text-purple-300 border border-purple-600/40 rounded-lg text-xs font-bold transition cursor-pointer shadow-sm"
          >
            <Shield className="w-3.5 h-3.5 text-purple-400" />
            <span>Admin</span>
          </button>

          {/* User Account / Profile button */}
          {user && profile ? (
            <button
              id="user-profile-button"
              onClick={() => setIsProfileOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
            >
              <div className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px] text-emerald-300 font-bold">
                {profile.name.charAt(0).toUpperCase()}
              </div>
              <span className="font-mono text-[11px] font-bold text-emerald-400">{user.id}</span>
            </button>
          ) : (
            <button
              onClick={() => setIsAuthOpen(true)}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition cursor-pointer"
            >
              Sign In
            </button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main
        className={`w-full transition-all duration-300 flex-1 flex flex-col justify-start p-3 sm:p-4 ${
          isMobileFrame
            ? 'max-w-md my-0 sm:my-3 sm:border sm:border-slate-850 sm:rounded-3xl sm:shadow-2xl sm:bg-slate-925 relative overflow-hidden'
            : 'max-w-3xl my-0 sm:my-4'
        }`}
      >
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
            <p className="text-xs font-semibold">Connecting to TapPoints backend...</p>
          </div>
        ) : profile && user ? (
          <div className="flex flex-col space-y-3.5">
            {/* Top AdMob Placement */}
            <AdMobBanner settings={settings} screenPlacement="Home Top Banner" />

            {/* Success Toast */}
            {rewardToast && (
              <div className="p-3 bg-emerald-950/90 border border-emerald-500/60 rounded-xl text-emerald-200 text-xs flex items-center gap-2 animate-in fade-in slide-in-from-top-2 shadow-lg shadow-emerald-950/50">
                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-semibold">{rewardToast}</span>
              </div>
            )}

            {/* Error / Limit / Anti-Cheat Warning Toast */}
            {tapError && (
              <div className="p-3 bg-rose-950/70 border border-rose-600/50 rounded-xl text-rose-200 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-bold block">
                    {tapError.includes('Daily limit reached') ? 'Daily Limit Notice' : 'Anti-Cheat Notice:'}
                  </span>
                  <span>{tapError}</span>
                  {tapError.includes('Daily limit reached') && (
                    <button
                      onClick={() => setIsPlansOpen(true)}
                      className="block mt-1 text-[11px] font-bold text-amber-300 underline"
                    >
                      Upgrade plan to increase daily earning limit →
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Account Frozen Alert */}
            {user.status === 'frozen' && (
              <div className="p-3 bg-rose-950/90 border border-rose-600 rounded-xl text-rose-100 text-xs flex items-center gap-2.5">
                <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
                <div>
                  <span className="font-bold block">Account Suspended</span>
                  <span>Your account is frozen due to suspected automated tapping. Contact Admin.</span>
                </div>
              </div>
            )}

            {/* Balance Overview Card */}
            <BalanceCard
              profile={profile}
              settings={settings}
              onOpenWithdraw={openWithdrawalWithAdCheck}
              onOpenHistory={() => setIsHistoryOpen(true)}
              onOpenPlans={() => setIsPlansOpen(true)}
            />

            {/* Voluntary Rewarded Ad Video Bonus Section */}
            <AdRewardsSection
              settings={settings}
              profile={profile}
              onWatchAdClick={() => setIsRewardedAdOpen(true)}
              disabled={user.status === 'frozen'}
            />

            {/* Daily Limit Progress with Plan Tiers */}
            <DailyLimitCard
              profile={profile}
              settings={settings}
              onOpenPlans={() => setIsPlansOpen(true)}
            />

            {/* Large 3D TAP & EARN Button Centerpiece */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-2 relative overflow-hidden">
              <TapButton
                onTap={handleTap}
                disabled={user.status === 'frozen'}
                disabledReason={
                  tapError || (dailyLimitReached ? 'Daily limit reached. Come back tomorrow.' : undefined)
                }
                accountStatus={user.status}
                pointsPerTap={settings.pointsPerTap}
                dailyLimitReached={dailyLimitReached}
                isTappingActive={isTapping}
              />
            </div>

            {/* Micro FAQ & Security reassurance footer */}
            <div className="pt-2 text-center text-[11px] text-slate-500 space-y-1">
              <p className="flex items-center justify-center gap-1">
                <Shield className="w-3 h-3 text-emerald-400" />
                <span>Strict Server-Side Daily Limit Validation • Bot-Proof Ledger</span>
              </p>
              <p>Minimum UPI withdrawal ₹10 • 100 Points = ₹10</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-white shadow-xl shadow-emerald-500/20">
              <Zap className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Welcome to TapPoints</h2>
              <p className="text-xs text-slate-400 max-w-xs mt-1">
                Tap to earn rewards. Convert points to ₹ INR and withdraw directly via UPI.
              </p>
            </div>
            <button
              onClick={() => setIsAuthOpen(true)}
              className="py-2.5 px-6 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-lg cursor-pointer"
            >
              Sign In / Start Earning
            </button>
          </div>
        )}
      </main>

      {/* Modals & Dialogs */}
      {profile && user && (
        <>
          <WithdrawModal
            isOpen={isWithdrawOpen}
            onClose={() => setIsWithdrawOpen(false)}
            profile={profile}
            settings={settings}
            onWithdrawalCreated={(updatedProfile) => {
              setProfile(updatedProfile);
            }}
          />

          <HistoryModal isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} />

          <SubscriptionModal
            isOpen={isPlansOpen}
            onClose={() => setIsPlansOpen(false)}
            profile={profile}
            settings={settings}
            onPlanUpgraded={loadUserData}
          />

          <ProfileModal
            isOpen={isProfileOpen}
            onClose={() => setIsProfileOpen(false)}
            user={user}
            profile={profile}
            onProfileUpdated={(updatedProfile) => setProfile(updatedProfile)}
            onLogout={handleLogout}
            onOpenAuth={() => setIsAuthOpen(true)}
          />

          {/* AdMob Rewarded Video Modal */}
          <RewardedAdModal
            isOpen={isRewardedAdOpen}
            settings={settings}
            onClose={() => setIsRewardedAdOpen(false)}
            onRewardEarned={handleRewardedAdEarned}
          />

          {/* AdMob Natural Break Interstitial Modal */}
          <InterstitialAdModal
            isOpen={isInterstitialAdOpen}
            settings={settings}
            onClose={() => setIsInterstitialAdOpen(false)}
          />
        </>
      )}

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      <AdminPanel isOpen={isAdminOpen} onClose={() => setIsAdminOpen(false)} />
    </div>
  );
}
