import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, History, ArrowDownLeft, ArrowUpRight, RotateCcw, ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react';
import { PointTransaction, Withdrawal } from '../types.js';
import { api } from '../services/api.js';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'ledger' | 'withdrawals'>('ledger');
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [txs, wds] = await Promise.all([api.getTransactions(), api.getWithdrawals()]);
      setTransactions(txs);
      setWithdrawals(wds);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const renderTxIcon = (type: PointTransaction['type']) => {
    switch (type) {
      case 'tap_reward':
        return <Sparkles className="w-4 h-4 text-emerald-400" />;
      case 'withdrawal_locked':
        return <ArrowUpRight className="w-4 h-4 text-amber-400" />;
      case 'withdrawal_refund':
        return <RotateCcw className="w-4 h-4 text-cyan-400" />;
      case 'withdrawal_settled':
        return <CheckCircle2 className="w-4 h-4 text-emerald-300" />;
      case 'admin_adjustment':
        return <ShieldAlert className="w-4 h-4 text-purple-400" />;
      default:
        return <History className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-lg bg-slate-900 border border-slate-750 rounded-2xl shadow-2xl overflow-hidden text-slate-200 flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center">
              <History className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Points & Payout Ledger</h3>
              <p className="text-xs text-slate-400">Complete immutable transaction audit</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 p-1">
          <button
            onClick={() => setActiveTab('ledger')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${
              activeTab === 'ledger'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Point Transactions ({transactions.length})
          </button>
          <button
            onClick={() => setActiveTab('withdrawals')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${
              activeTab === 'withdrawals'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Withdrawal Receipts ({withdrawals.length})
          </button>
        </div>

        {/* List Content */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-2.5">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">Loading ledger records...</div>
          ) : activeTab === 'ledger' ? (
            transactions.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">No transactions recorded yet.</div>
            ) : (
              transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="p-3 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 rounded-xl transition flex items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-700/80 shrink-0 mt-0.5">
                      {renderTxIcon(tx.type)}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-semibold text-white truncate">{tx.description}</h4>
                      <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <span>{new Date(tx.createdAt).toLocaleString()}</span>
                        {tx.referenceId && (
                          <span className="font-mono text-[10px] text-slate-500">Ref: {tx.referenceId}</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`text-sm font-bold font-mono ${
                        tx.points > 0
                          ? 'text-emerald-400'
                          : tx.points < 0
                          ? 'text-amber-400'
                          : 'text-slate-300'
                      }`}
                    >
                      {tx.points > 0 ? `+${tx.points}` : tx.points} pts
                    </span>
                    <span className="text-[11px] text-slate-400 block font-mono">
                      Bal: {tx.balanceAfter} pts
                    </span>
                  </div>
                </div>
              ))
            )
          ) : withdrawals.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">No withdrawal requests found.</div>
          ) : (
            withdrawals.map((w) => (
              <div
                key={w.id}
                className="p-3.5 bg-slate-800/80 border border-slate-700/80 rounded-xl space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-black font-mono text-white">₹{w.inrAmount}</span>
                    <span className="text-xs text-slate-400 font-mono">({w.pointsRequested} pts)</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md border ${
                      w.status === 'paid'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : w.status === 'approved'
                        ? 'bg-teal-500/20 text-teal-300 border-teal-500/30'
                        : w.status === 'rejected'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    }`}
                  >
                    {w.status}
                  </span>
                </div>

                <div className="text-xs text-slate-300 flex items-center justify-between border-t border-slate-750 pt-1.5">
                  <span className="text-slate-400">UPI ID:</span>
                  <span className="font-mono text-white font-medium">{w.upiId}</span>
                </div>

                <div className="text-xs text-slate-300 flex items-center justify-between">
                  <span className="text-slate-400">Date:</span>
                  <span>{new Date(w.requestedAt).toLocaleString()}</span>
                </div>

                {w.utrNumber && (
                  <div className="text-xs bg-emerald-950/60 border border-emerald-600/40 p-2 rounded-lg text-emerald-300 flex items-center justify-between font-mono">
                    <span className="text-[11px] text-emerald-400">Bank UTR Number:</span>
                    <span className="font-bold">{w.utrNumber}</span>
                  </div>
                )}

                {w.rejectionReason && (
                  <div className="text-xs bg-rose-950/60 border border-rose-600/40 p-2 rounded-lg text-rose-300">
                    <span className="text-[11px] text-rose-400 block font-semibold">Rejection Note:</span>
                    <span>{w.rejectionReason}</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
};
