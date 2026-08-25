import React from 'react';
import { ArrowUpRight, History, Coins, Lock, Crown, Zap } from 'lucide-react';
import { Profile, AppSettings } from '../types.js';

interface BalanceCardProps {
  profile: Profile;
  settings: AppSettings;
  onOpenWithdraw: () => void;
  onOpenHistory: () => void;
  onOpenPlans: () => void;
}

export const BalanceCard: React.FC<BalanceCardProps> = ({
  profile,
  settings,
  onOpenWithdraw,
  onOpenHistory,
  onOpenPlans,
}) => {
  const pointsToInrRatio = settings.pointsToInrRatio || 10;
  const inrBalance = (profile.pointsBalance / pointsToInrRatio).toFixed(2);
  const lockedInr = (profile.lockedPoints / pointsToInrRatio).toFixed(2);
  const minWithdrawalInr = settings.minWithdrawalInr || 10;
  const canWithdraw = profile.pointsBalance >= minWithdrawalInr * pointsToInrRatio;

  const currentPlan = profile.currentPlanId || 'free';
  const planNames: Record<string, string> = {
    free: 'Free Plan',
    plan_99: '₹99 Plan',
    plan_499: '₹499 Plan',
    plan_2000: '₹2,000 Unlimited',
  };

  return (
    <div
      id="main-balance-card"
      className="w-full bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 border border-slate-750 rounded-2xl p-4 sm:p-5 shadow-xl text-white relative overflow-hidden"
    >
      {/* Background ambient lighting */}
      <div className="absolute -top-16 -right-16 w-36 h-36 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
          <Coins className="w-4 h-4 text-emerald-400" />
          <span>Available Wallet Balance</span>
        </div>
        <button
          onClick={onOpenPlans}
          className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:text-amber-200 hover:bg-amber-500/25 text-[11px] font-bold rounded-full transition-all cursor-pointer shadow-sm active:scale-95"
        >
          <Crown className="w-3 h-3 text-amber-400" />
          <span>{planNames[currentPlan] || 'Free Plan'}</span>
          <span className="text-[10px] text-amber-400/80 underline ml-0.5">Upgrade</span>
        </button>
      </div>

      {/* Main Rupee & Points Display */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 mb-4">
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl sm:text-4xl font-black tracking-tight text-white font-mono">
              ₹{inrBalance}
            </span>
            <span className="text-xs text-slate-400 font-medium">INR</span>
          </div>
          <p className="text-sm font-semibold text-emerald-400 flex items-center gap-1 mt-0.5">
            <span>{profile.pointsBalance.toLocaleString()}</span>
            <span className="text-slate-400 font-normal">TapPoints (100 pts = ₹10)</span>
          </p>
        </div>

        {/* Locked points indicator */}
        {profile.lockedPoints > 0 && (
          <div className="mt-2 sm:mt-0 flex items-center gap-1.5 bg-amber-950/40 border border-amber-600/30 rounded-lg px-2.5 py-1.5 text-xs text-amber-300">
            <Lock className="w-3.5 h-3.5 shrink-0" />
            <div>
              <span className="font-semibold">₹{lockedInr}</span> ({profile.lockedPoints} pts)
              <span className="text-amber-400/80 text-[11px] block">Locked in pending withdrawal</span>
            </div>
          </div>
        )}
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-2 py-2.5 border-y border-slate-800/80 mb-4 text-xs">
        <div className="flex flex-col">
          <span className="text-slate-400 text-[11px]">Total Taps</span>
          <span className="text-slate-200 font-bold font-mono text-sm">
            {profile.totalTaps.toLocaleString()} taps
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-slate-400 text-[11px]">Total Withdrawn</span>
          <span className="text-emerald-400 font-bold font-mono text-sm">
            ₹{profile.totalWithdrawnInr.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          id="open-withdraw-modal-button"
          onClick={onOpenWithdraw}
          className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer ${
            canWithdraw
              ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-emerald-950/40 active:scale-98'
              : 'bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 active:scale-98'
          }`}
        >
          <span>Withdraw</span>
          <ArrowUpRight className="w-4 h-4" />
          <span className="text-[10px] opacity-80 font-normal">(Min ₹{minWithdrawalInr})</span>
        </button>

        <button
          id="open-history-modal-button"
          onClick={onOpenHistory}
          className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-800/90 hover:bg-slate-750 text-slate-200 border border-slate-700/80 rounded-xl font-semibold text-xs sm:text-sm transition-all cursor-pointer active:scale-98"
        >
          <History className="w-4 h-4 text-slate-400" />
          <span>Ledger & History</span>
        </button>
      </div>
    </div>
  );
};
