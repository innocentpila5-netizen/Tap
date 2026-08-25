import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Volume2,
  VolumeX,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Play,
  Award,
  Loader2,
  Info,
} from 'lucide-react';
import { AppSettings } from '../types.js';
import { api } from '../services/api.js';

interface RewardedAdModalProps {
  isOpen: boolean;
  settings: AppSettings;
  onClose: () => void;
  onRewardEarned: (pointsAdded: number, newBalance: number, newInrBalance: number) => void;
}

export const RewardedAdModal: React.FC<RewardedAdModalProps> = ({
  isOpen,
  settings,
  onClose,
  onRewardEarned,
}) => {
  const [loadState, setLoadState] = useState<'loading' | 'playing' | 'rewarded' | 'claiming' | 'failed'>('loading');
  const [timeLeft, setTimeLeft] = useState<number>(15);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [showEarlyCloseConfirm, setShowEarlyCloseConfirm] = useState<boolean>(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [earnedPoints, setEarnedPoints] = useState<number>(settings.rewardedAdPoints || 50);

  const initialDuration = 15;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize and request ad session when modal opens
  useEffect(() => {
    if (!isOpen) {
      setLoadState('loading');
      setTimeLeft(initialDuration);
      setShowEarlyCloseConfirm(false);
      setSessionId(null);
      setErrorMessage(null);
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    let isMounted = true;

    async function initializeAd() {
      try {
        setLoadState('loading');
        setErrorMessage(null);

        // 1. Create server-side ad session (anti-bypass)
        const session = await api.startRewardedAdSession();
        if (!isMounted) return;

        setSessionId(session.sessionId);
        setEarnedPoints(session.rewardAmount);
        setTimeLeft(session.minWatchDurationSeconds || 15);

        // Simulate AdMob SDK prefetch delay
        setTimeout(() => {
          if (!isMounted) return;
          setLoadState('playing');
        }, 800);
      } catch (err: any) {
        if (!isMounted) return;
        console.error('[RewardedAd] Failed to load:', err);
        setLoadState('failed');
        setErrorMessage(err.message || 'Ad could not be loaded. Please try again later.');
      }
    }

    initializeAd();

    return () => {
      isMounted = false;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen]);

  // Video playback countdown timer
  useEffect(() => {
    if (loadState !== 'playing') return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleVideoCompleted();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loadState, sessionId]);

  // When video completes, claim the reward on the server
  const handleVideoCompleted = async () => {
    if (!sessionId) {
      setLoadState('failed');
      setErrorMessage('Missing ad session identifier.');
      return;
    }

    setLoadState('claiming');

    try {
      const claimResult = await api.claimRewardedAd(sessionId, initialDuration);
      setLoadState('rewarded');
      onRewardEarned(claimResult.pointsAdded, claimResult.newBalance, claimResult.newInrBalance);

      // Auto close after showing reward celebration for 2.5s
      setTimeout(() => {
        onClose();
      }, 2500);
    } catch (err: any) {
      console.error('[RewardedAd] Claim verification failed:', err);
      setLoadState('failed');
      setErrorMessage(err.message || 'Failed to verify reward with server.');
    }
  };

  const handleCloseAttempt = () => {
    if (loadState === 'rewarded') {
      onClose();
      return;
    }

    if (loadState === 'playing' && timeLeft > 0) {
      setShowEarlyCloseConfirm(true);
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  const progressPercent = Math.min(100, Math.max(0, ((initialDuration - timeLeft) / initialDuration) * 100));
  const isTestMode = settings.isTestMode || settings.admobRewardedId?.includes('3940256099942544');

  return (
    <div
      id="rewarded-ad-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200"
    >
      <div className="w-full max-w-sm bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col relative text-white">
        {/* Top AdMob Status Header */}
        <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-500 text-slate-950 rounded">
              Ad
            </span>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-slate-200">
                {isTestMode ? 'Google AdMob Test Rewarded Video' : 'Rewarded Sponsor'}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {settings.admobRewardedId?.slice(0, 20)}...
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <button
              onClick={handleCloseAttempt}
              className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Close Ad"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Top Progress Bar */}
        <div className="w-full bg-slate-800 h-1 relative overflow-hidden">
          <div
            className="bg-emerald-500 h-full transition-all duration-1000 ease-linear"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Video Canvas / Ad Creative Area */}
        <div className="relative aspect-[9/14] w-full bg-gradient-to-b from-indigo-950 via-slate-900 to-purple-950 flex flex-col items-center justify-between p-6 overflow-hidden">
          {/* Background visual glow */}
          <div className="absolute inset-0 bg-radial from-indigo-500/10 via-transparent to-transparent pointer-events-none" />

          {/* Top Info Badge */}
          <div className="w-full flex items-center justify-between">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-black/50 backdrop-blur-md rounded-full border border-white/10 text-xs">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-semibold text-amber-300">+{earnedPoints} Points</span>
              <span className="text-slate-400 text-[11px]">(₹{(earnedPoints / 10).toFixed(2)})</span>
            </div>

            {loadState === 'playing' && (
              <div className="px-3 py-1 bg-black/60 backdrop-blur-md rounded-full border border-emerald-500/30 text-xs font-mono text-emerald-400 flex items-center gap-1">
                <span>Reward in {timeLeft}s</span>
              </div>
            )}
          </div>

          {/* Central Creative Graphic */}
          <div className="flex flex-col items-center text-center my-auto z-10">
            {loadState === 'loading' && (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
                <p className="text-sm font-medium text-slate-300">Loading Google AdMob Partner Video...</p>
              </div>
            )}

            {loadState === 'playing' && (
              <div className="flex flex-col items-center gap-4">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 animate-pulse">
                  <Play className="w-9 h-9 text-slate-950 fill-slate-950 ml-1" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-white tracking-tight">
                    Level Up Your Earnings!
                  </h3>
                  <p className="text-xs text-slate-300 max-w-[220px]">
                    Watch this 15-second sponsor video to claim your bonus TapPoints instantly.
                  </p>
                </div>
              </div>
            )}

            {loadState === 'claiming' && (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
                <p className="text-sm font-medium text-emerald-300">Verifying watch duration on secure ledger...</p>
              </div>
            )}

            {loadState === 'rewarded' && (
              <div className="flex flex-col items-center gap-3 animate-in zoom-in-95 duration-300">
                <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center shadow-xl shadow-emerald-500/40">
                  <CheckCircle2 className="w-10 h-10 text-slate-950" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-extrabold text-emerald-300">
                    Reward Granted!
                  </h3>
                  <p className="text-sm font-semibold text-white">
                    +{earnedPoints} Points added to your balance
                  </p>
                  <p className="text-xs text-slate-400">
                    ₹{(earnedPoints / 10).toFixed(2)} credited to your account
                  </p>
                </div>
              </div>
            )}

            {loadState === 'failed' && (
              <div className="flex flex-col items-center gap-3 max-w-[240px]">
                <AlertTriangle className="w-10 h-10 text-rose-400" />
                <h4 className="text-sm font-bold text-rose-300">Ad Unavailable</h4>
                <p className="text-xs text-slate-400">{errorMessage || 'Unable to load ad creative.'}</p>
                <button
                  onClick={onClose}
                  className="mt-2 px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg text-white"
                >
                  Close & Return
                </button>
              </div>
            )}
          </div>

          {/* Bottom Policy Compliance Notice */}
          <div className="w-full text-center z-10">
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 bg-black/40 backdrop-blur-sm py-1.5 px-3 rounded-lg border border-white/5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate">Reward guaranteed upon full video completion</span>
            </div>
          </div>
        </div>

        {/* Early Close Warning Prompt */}
        {showEarlyCloseConfirm && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-sm z-30 flex items-center justify-center p-6 animate-in fade-in">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 text-center space-y-4 max-w-xs shadow-2xl">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white">Leave Early?</h4>
                <p className="text-xs text-slate-300">
                  If you close now, you will lose your reward of <span className="font-semibold text-amber-400">+{earnedPoints} points</span>. Only {timeLeft}s remaining!
                </p>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => setShowEarlyCloseConfirm(false)}
                  className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-md transition-colors"
                >
                  Resume Video ({timeLeft}s)
                </button>
                <button
                  onClick={onClose}
                  className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-medium rounded-xl transition-colors"
                >
                  Forfeit
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
