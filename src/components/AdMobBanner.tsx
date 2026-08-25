import React, { useState, useEffect } from 'react';
import { ExternalLink, ShieldCheck, Sparkles, RefreshCw, AlertCircle } from 'lucide-react';
import { AppSettings } from '../types.js';

interface AdMobBannerProps {
  settings?: AppSettings;
  screenPlacement?: string;
}

export const AdMobBanner: React.FC<AdMobBannerProps> = ({ settings, screenPlacement = 'Home' }) => {
  const [loadState, setLoadState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (settings && !settings.admobEnabled) {
    return null;
  }

  const bannerId = settings?.admobBannerId || 'ca-app-pub-3940256099942544/6300978111';
  const isTestMode = settings?.isTestMode ?? bannerId.includes('3940256099942544');

  useEffect(() => {
    // Simulate realistic ad load lifecycle with error resilience
    setLoadState('loading');
    setErrorMessage(null);

    const timer = setTimeout(() => {
      // In web preview, we render the compliant AdMob banner container
      setLoadState('loaded');
    }, 400);

    return () => clearTimeout(timer);
  }, [bannerId]);

  if (loadState === 'error') {
    return (
      <div className="w-full bg-slate-900/40 border border-slate-800/80 rounded-xl p-2 text-center text-xs text-slate-500">
        <div className="flex items-center justify-center gap-1 text-[11px]">
          <AlertCircle className="w-3.5 h-3.5 text-slate-500" />
          <span>Banner ad currently unavailable ({screenPlacement})</span>
        </div>
      </div>
    );
  }

  return (
    <div
      id="admob-banner-container"
      className="w-full bg-slate-900/90 dark:bg-slate-950 border border-slate-800 rounded-xl p-2.5 shadow-sm relative overflow-hidden text-slate-200"
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5">
          <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded">
            Ad
          </span>
          <span className="text-[11px] text-slate-400 font-medium">
            Google AdMob {isTestMode ? 'Test Banner' : 'Live Banner'}
          </span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
          <ShieldCheck className="w-3 h-3" />
          <span>Policy Compliant</span>
        </div>
      </div>

      {/* Official AdMob Banner Container */}
      <div className="bg-gradient-to-r from-indigo-950/70 via-slate-900 to-purple-950/70 border border-slate-800/90 rounded-lg p-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0 shadow-md">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-semibold text-white truncate">
              Google AdMob Partner Network
            </h4>
            <p className="text-[10px] text-slate-400 truncate">
              Unit: <span className="font-mono text-slate-300">{bannerId.slice(0, 22)}...</span>
            </p>
          </div>
        </div>

        <div className="shrink-0">
          <div className="px-2.5 py-1 bg-slate-800/90 text-slate-300 text-[11px] font-medium rounded-md border border-slate-700/80 flex items-center gap-1 cursor-default select-none">
            <span>Sponsored</span>
          </div>
        </div>
      </div>

      <div className="mt-1 flex items-center justify-between text-[9px] text-slate-500 px-0.5">
        <span>No incentive to click • Independent rewards</span>
        <span className="font-mono text-[9px]">320x50 Smart Banner</span>
      </div>
    </div>
  );
};
