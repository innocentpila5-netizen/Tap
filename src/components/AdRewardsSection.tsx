import React from 'react';
import { Play, Award, Sparkles, CheckCircle2, Clock, ShieldCheck } from 'lucide-react';
import { AppSettings, Profile } from '../types.js';

interface AdRewardsSectionProps {
  settings: AppSettings;
  profile: Profile | null;
  onWatchAdClick: () => void;
  disabled?: boolean;
}

export const AdRewardsSection: React.FC<AdRewardsSectionProps> = ({
  settings,
  profile,
  onWatchAdClick,
  disabled = false,
}) => {
  if (!settings.admobEnabled) return null;

  const rewardPoints = settings.rewardedAdPoints || 50;
  const rewardInr = (rewardPoints / (settings.pointsToInrRatio || 10)).toFixed(2);
  const dailyLimit = settings.rewardedAdDailyLimit || 5;

  const today = new Date().toISOString().split('T')[0];
  const isNewDay = profile?.lastRewardedAdDate !== today;
  const currentCount = isNewDay ? 0 : (profile?.dailyRewardedAdsCount || 0);
  const remaining = Math.max(0, dailyLimit - currentCount);
  const isLimitReached = remaining <= 0;

  return (
    <div
      id="ad-rewards-section"
      className="w-full bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 rounded-2xl p-4 shadow-md relative overflow-hidden"
    >
      {/* Decorative accent */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <span>Voluntary Video Bonus</span>
              <span className="px-1.5 py-0.2 text-[9px] bg-emerald-500/20 text-emerald-300 rounded font-semibold border border-emerald-500/30">
                +{rewardPoints} Pts
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Watch a 15-second sponsor video to earn ₹{rewardInr} bonus
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[11px] font-mono font-bold text-slate-300 block">
            {remaining}/{dailyLimit} left
          </span>
          <span className="text-[10px] text-slate-500">Today's Quota</span>
        </div>
      </div>

      {/* Action Button */}
      <div className="mt-3">
        {isLimitReached ? (
          <div className="w-full py-2.5 px-3 bg-slate-800/80 border border-slate-700/60 rounded-xl flex items-center justify-center gap-2 text-slate-400 text-xs font-medium select-none">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Daily ad bonus limit completed ({dailyLimit}/{dailyLimit})</span>
          </div>
        ) : (
          <button
            id="btn-watch-rewarded-ad"
            onClick={onWatchAdClick}
            disabled={disabled}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.99] text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Watch Video & Earn +{rewardPoints} Points (₹{rewardInr})</span>
          </button>
        )}
      </div>

      {/* Policy and Safety Disclaimer */}
      <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-500 px-1">
        <span className="flex items-center gap-1">
          <ShieldCheck className="w-3 h-3 text-emerald-500" />
          <span>Voluntary watch only • Zero forced clicks</span>
        </span>
        <span className="font-mono text-[10px] text-slate-400">
          {settings.isTestMode ? 'Test Mode' : 'Live AdMob'}
        </span>
      </div>
    </div>
  );
};
