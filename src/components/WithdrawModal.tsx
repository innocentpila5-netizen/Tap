import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ArrowRight, ShieldCheck, AlertCircle, CheckCircle2, Clock, Landmark, Coins, ChevronRight } from 'lucide-react';
import { Profile, AppSettings, Withdrawal } from '../types.js';
import { api } from '../services/api.js';
import { playSuccessChime, triggerHaptic } from '../utils/audio.js';

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Profile;
  settings: AppSettings;
  onWithdrawalCreated: (updatedProfile: Profile) => void;
}

export const WithdrawModal: React.FC<WithdrawModalProps> = ({
  isOpen,
  onClose,
  profile,
  settings,
  onWithdrawalCreated,
}) => {
  const [upiId, setUpiId] = useState(profile.upiId || '');
  const [amountInr, setAmountInr] = useState<number | ''>(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [activeTab, setActiveTab] = useState<'request' | 'history'>('request');

  const pointsToInrRatio = settings.pointsToInrRatio || 10;
  const minWithdrawalInr = settings.minWithdrawalInr || 10;
  const maxAvailableInr = Math.floor(profile.pointsBalance / pointsToInrRatio);
  const pointsNeeded = typeof amountInr === 'number' ? amountInr * pointsToInrRatio : 0;

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccessMessage(null);
      if (profile.upiId) setUpiId(profile.upiId);
      loadWithdrawals();
    }
  }, [isOpen, profile]);

  const loadWithdrawals = async () => {
    try {
      const list = await api.getWithdrawals();
      setWithdrawals(list);
    } catch {
      // ignore
    }
  };

  const handleQuickAmount = (val: number) => {
    setAmountInr(val);
    setError(null);
  };

  const handleMaxAmount = () => {
    setAmountInr(maxAvailableInr > 0 ? maxAvailableInr : minWithdrawalInr);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const cleanUpi = upiId.trim();
    if (!cleanUpi || !cleanUpi.includes('@')) {
      setError('Please enter a valid UPI ID (e.g. mobile@paytm or name@okhdfcbank)');
      triggerHaptic('error');
      return;
    }

    if (typeof amountInr !== 'number' || amountInr < minWithdrawalInr) {
      setError(`Minimum withdrawal amount is ₹${minWithdrawalInr} (${minWithdrawalInr * pointsToInrRatio} points)`);
      triggerHaptic('error');
      return;
    }

    if (amountInr > maxAvailableInr) {
      setError(`Insufficient balance. You can withdraw up to ₹${maxAvailableInr}.`);
      triggerHaptic('error');
      return;
    }

    setLoading(true);
    try {
      const res = await api.createWithdrawal(amountInr, cleanUpi);
      playSuccessChime();
      triggerHaptic('medium');
      setSuccessMessage(
        `Withdrawal request for ₹${amountInr} submitted! ${pointsNeeded} points have been safely locked for processing.`
      );
      onWithdrawalCreated(res.profile);
      await loadWithdrawals();
    } catch (err: any) {
      setError(err.message || 'Withdrawal submission failed.');
      triggerHaptic('error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-md bg-slate-900 border border-slate-750 rounded-2xl shadow-2xl overflow-hidden text-slate-200 flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Landmark className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Withdraw to UPI</h3>
              <p className="text-xs text-slate-400">Direct instant transfer request</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 p-1">
          <button
            onClick={() => setActiveTab('request')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${
              activeTab === 'request'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            New Withdrawal
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1 ${
              activeTab === 'history'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>History ({withdrawals.length})</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'request' ? (
            <>
              {/* Balance Summary Box */}
              <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-400 block font-medium">Available to Withdraw</span>
                  <span className="text-xl font-bold font-mono text-emerald-400">₹{maxAvailableInr.toFixed(2)}</span>
                  <span className="text-xs text-slate-400 ml-1">({profile.pointsBalance} pts)</span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-slate-400 block font-medium">Minimum Limit</span>
                  <span className="text-sm font-semibold text-slate-200">₹{minWithdrawalInr} (100 pts)</span>
                </div>
              </div>

              {/* Alert messages */}
              {error && (
                <div className="p-3 bg-rose-950/50 border border-rose-600/40 rounded-xl text-rose-300 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {successMessage && (
                <div className="p-3 bg-emerald-950/50 border border-emerald-600/40 rounded-xl text-emerald-300 text-xs flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                  <div>
                    <span className="font-semibold block mb-0.5">Request Received!</span>
                    <span>{successMessage}</span>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* UPI ID input */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Your UPI ID / VPA
                  </label>
                  <div className="relative">
                    <input
                      id="withdraw-upi-input"
                      type="text"
                      placeholder="e.g. mobile@paytm or name@okhdfcbank"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
                      required
                    />
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Payout will be transferred directly to this UPI address.
                  </span>
                </div>

                {/* Amount in Rupees */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Withdrawal Amount (₹ INR)
                  </label>
                  <div className="relative mb-2">
                    <span className="absolute left-3.5 top-2.5 text-slate-400 font-mono font-bold">₹</span>
                    <input
                      id="withdraw-amount-input"
                      type="number"
                      min={minWithdrawalInr}
                      max={maxAvailableInr}
                      step="1"
                      value={amountInr}
                      onChange={(e) =>
                        setAmountInr(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10)))
                      }
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-28 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
                      required
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-emerald-400 font-mono">
                      {pointsNeeded} points
                    </span>
                  </div>

                  {/* Quick Chips */}
                  <div className="flex flex-wrap gap-2">
                    {[10, 25, 50, 100].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => handleQuickAmount(val)}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition ${
                          amountInr === val
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                            : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
                        }`}
                      >
                        ₹{val}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={handleMaxAmount}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-teal-950/60 border border-teal-600/40 text-teal-300 hover:bg-teal-900/50"
                    >
                      Max (₹{maxAvailableInr})
                    </button>
                  </div>
                </div>

                {/* Important Notice */}
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Security & Anti-Fraud Policy</span>
                  </div>
                  <p>• {pointsNeeded || 100} points will be locked immediately when submitted.</p>
                  <p>• Requests are reviewed for automated/bot tapping patterns before payout.</p>
                  <p>• Rejected requests automatically refund locked points back to your wallet.</p>
                </div>

                {/* Submit button */}
                <button
                  id="submit-withdrawal-button"
                  type="submit"
                  disabled={loading || maxAvailableInr < minWithdrawalInr}
                  className={`w-full py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition cursor-pointer ${
                    maxAvailableInr >= minWithdrawalInr && !loading
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-emerald-950/50 active:scale-98'
                      : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                  }`}
                >
                  {loading ? (
                    <span>Submitting request...</span>
                  ) : maxAvailableInr < minWithdrawalInr ? (
                    <span>Need Min ₹{minWithdrawalInr} to Withdraw</span>
                  ) : (
                    <>
                      <span>Submit Request for ₹{amountInr || 10}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            /* History Tab */
            <div className="space-y-2.5">
              {withdrawals.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <Coins className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-500" />
                  <p className="text-sm font-medium">No withdrawal requests yet.</p>
                  <p className="text-xs text-slate-500">Your requested payouts will appear here.</p>
                </div>
              ) : (
                withdrawals.map((w) => (
                  <div
                    key={w.id}
                    className="p-3 bg-slate-800/80 border border-slate-700/80 rounded-xl space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-white">₹{w.inrAmount}</span>
                        <span className="text-xs text-slate-400">({w.pointsRequested} pts)</span>
                      </div>
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md border ${
                          w.status === 'paid'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : w.status === 'approved'
                            ? 'bg-teal-500/20 text-teal-300 border-teal-500/30'
                            : w.status === 'rejected'
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        }`}
                      >
                        {w.status === 'paid'
                          ? 'Paid ✓'
                          : w.status === 'approved'
                          ? 'Approved'
                          : w.status === 'rejected'
                          ? 'Rejected'
                          : 'Pending ⏳'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="font-mono">{w.upiId}</span>
                      <span>{new Date(w.requestedAt).toLocaleDateString()}</span>
                    </div>

                    {w.utrNumber && (
                      <div className="text-[11px] text-emerald-400 bg-emerald-950/40 px-2 py-1 rounded border border-emerald-500/20 font-mono">
                        Bank UTR Ref: {w.utrNumber}
                      </div>
                    )}

                    {w.rejectionReason && (
                      <div className="text-[11px] text-rose-300 bg-rose-950/40 px-2 py-1 rounded border border-rose-500/20">
                        Reason: {w.rejectionReason} (Points refunded)
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
