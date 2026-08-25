import React from 'react';
import { Clock, Zap, Crown, AlertCircle, Sparkles, ChevronRight } from 'lucide-react';
import { Profile, AppSettings, SubscriptionPlanId } from '../types.js';

interface DailyLimitCardProps {
  profile: Profile;
  settings: AppSettings;
  onOpenPlans: () => void;
}

export const DailyLimitCard: React.FC<DailyLimitCardProps> = ({ profile, settings, onOpenPlans }) => {
  const currentPlan: SubscriptionPlanId = profile.currentPlanId || 'free';
  const plans = settings.plans || {
    free: { priceInr: 0, dailyLimit: 500 },
    plan_99: { priceInr: 99, dailyLimit: 1000 },
    plan_499: { priceInr: 499, dailyLimit: 5000 },
    plan_2000: { priceInr: 2000, dailyLimit: null },
  };

  const planConfig = plans[currentPlan] || plans.free;
  const dailyLimit = planConfig.dailyLimit; // null if unlimited
  const earnedToday = profile.dailyEarnedPoints || 0;

  const isUnlimited = dailyLimit === null;
  const isLimitReached = !isUnlimited && earnedToday >= dailyLimit;
  const remainingPoints = isUnlimited ? null : Math.max(0, dailyLimit - earnedToday);
  const percentage = isUnlimited ? 100 : Math.min(100, Math.round((earnedToday / dailyLimit) * 100));

  const planNames: Record<SubscriptionPlanId, string> = {
    free: 'Free Plan',
    plan_99: '₹99 Monthly',
    plan_499: '₹499 Monthly',
    plan_2000: '₹2,000 Unlimited',
  };

  return (
    <div
      id="daily-limit-card"
      className={`w-full border rounded-2xl p-3.5 sm:p-4 text-slate-300 transition-all ${
        isLimitReached
          ? 'bg-rose-950/30 border-rose-600/40 shadow-lg shadow-rose-950/20'
          : isUnlimited
          ? 'bg-gradient-to-r from-amber-950/30 via-slate-900 to-slate-900 border-amber-500/30'
          : 'bg-slate-900/90 border-slate-800'
      }`}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-white">
          {isUnlimited ? (
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
          ) : (
            <Zap className="w-4 h-4 text-emerald-400" />
          )}
          <span>Daily Limit ({planNames[currentPlan]})</span>
        </div>
        <button
          onClick={onOpenPlans}
          className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
        >
          <Crown className="w-3 h-3 text-amber-400" />
          <span>Change Plan</span>
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      {/* Progress Bar */}
      {!isUnlimited ? (
        <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden mb-2 p-0.5 border border-slate-700/50">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isLimitReached
                ? 'bg-rose-500'
                : percentage >= 80
                ? 'bg-amber-500'
                : 'bg-gradient-to-r from-emerald-500 to-teal-400'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      ) : (
        <div className="w-full bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 h-2.5 rounded-full mb-2 border border-amber-500/30" />
      )}

      {/* Progress Stats */}
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-200">
          {isUnlimited ? (
            <span className="text-amber-300 font-bold flex items-center gap-1">
              <span>Unlimited Daily Earning</span>
              <span className="text-[11px] text-slate-400 font-normal">({earnedToday} pts earned today)</span>
            </span>
          ) : (
            <>
              {earnedToday} <span className="font-normal text-slate-400">/ {dailyLimit} pts earned ({percentage}%)</span>
            </>
          )}
        </span>

        <span
          className={`text-[11px] font-bold ${
            isLimitReached ? 'text-rose-400' : isUnlimited ? 'text-amber-400' : 'text-emerald-400'
          }`}
        >
          {isLimitReached
            ? '0 pts left'
            : isUnlimited
            ? 'No Cap'
            : `${remainingPoints} pts left`}
        </span>
      </div>

      {/* Limit Reached Banner / Upgrade prompt */}
      {isLimitReached ? (
        <div className="mt-2.5 p-2.5 bg-rose-950/60 border border-rose-600/50 rounded-xl flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-200">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>Daily limit reached. Come back tomorrow.</span>
          </div>
          <button
            onClick={onOpenPlans}
            className="px-2.5 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[11px] font-bold rounded-lg shrink-0 cursor-pointer shadow hover:from-amber-400 hover:to-orange-400"
          >
            Upgrade Plan
          </button>
        </div>
      ) : currentPlan === 'free' ? (
        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 pt-1.5 border-t border-slate-800/80">
          <span>Need more points per day?</span>
          <button
            onClick={onOpenPlans}
            className="text-amber-400 hover:text-amber-300 font-semibold cursor-pointer underline"
          >
            Unlock ₹99/₹499/₹2,000 Plans
          </button>
        </div>
      ) : null}
    </div>
  );
};
