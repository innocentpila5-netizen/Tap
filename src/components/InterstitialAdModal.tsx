import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles, ShieldCheck, ArrowRight, ExternalLink } from 'lucide-react';
import { AppSettings } from '../types.js';

interface InterstitialAdModalProps {
  isOpen: boolean;
  settings: AppSettings;
  onClose: () => void;
}

export const InterstitialAdModal: React.FC<InterstitialAdModalProps> = ({
  isOpen,
  settings,
  onClose,
}) => {
  const [countdown, setCountdown] = useState<number>(5);
  const [canClose, setCanClose] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setCountdown(5);
      setCanClose(false);
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    setCountdown(5);
    setCanClose(false);

    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setCanClose(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const isTestMode = settings.isTestMode || settings.admobInterstitialId?.includes('3940256099942544');
  const interstitialId = settings.admobInterstitialId || 'ca-app-pub-3940256099942544/1033173712';

  return (
    <div
      id="interstitial-ad-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200"
    >
      <div className="w-full max-w-sm bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col relative text-white">
        {/* Top Header */}
        <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-500 text-slate-950 rounded">
              Ad
            </span>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-slate-200">
                {isTestMode ? 'Google AdMob Test Interstitial' : 'Sponsored Break'}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {interstitialId.slice(0, 22)}...
              </span>
            </div>
          </div>

          <div>
            {canClose ? (
              <button
                onClick={onClose}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-full border border-slate-700 flex items-center gap-1 transition-colors shadow"
              >
                <span>Close</span>
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <div className="px-3 py-1 bg-slate-800/60 text-slate-400 text-xs font-mono rounded-full border border-slate-800">
                Skip in {countdown}s
              </div>
            )}
          </div>
        </div>

        {/* Ad Graphic & Body */}
        <div className="p-6 flex flex-col items-center text-center space-y-5 bg-gradient-to-b from-slate-900 via-slate-950 to-indigo-950/40">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 my-2">
            <Sparkles className="w-8 h-8 text-white" />
          </div>

          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider">
              Natural Break Sponsor
            </span>
            <h3 className="text-lg font-bold text-white leading-snug">
              Discover Next-Gen Digital Rewards
            </h3>
            <p className="text-xs text-slate-400 max-w-[240px]">
              Fast, verified, and secure rewards platform for mobile power users.
            </p>
          </div>

          <div className="w-full pt-2">
            <button
              onClick={onClose}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 shadow-md transition-colors"
            >
              <span>Continue Tapping Session</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Footer disclosure */}
          <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-500 pt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Policy Compliant • Frequency capped (min 60s cooldown)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
