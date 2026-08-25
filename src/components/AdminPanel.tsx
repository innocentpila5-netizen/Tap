import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  X,
  Shield,
  Users,
  Coins,
  ArrowUpRight,
  ShieldAlert,
  Settings as SettingsIcon,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Lock,
  Unlock,
  Plus,
  Minus,
  RefreshCw,
  Sliders,
  DollarSign,
  AlertTriangle,
  FileCheck,
  CreditCard,
  Sparkles,
  Zap,
} from 'lucide-react';
import { AdminStats, AppSettings, User, Profile, Withdrawal, FraudFlag, AccountStatus, SubscriptionPlanId } from '../types.js';
import { api } from '../services/api.js';
import { triggerHaptic } from '../utils/audio.js';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ isOpen, onClose }) => {
  const [pin, setPin] = useState('8888');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Nav tab
  const [activeTab, setActiveTab] = useState<'overview' | 'withdrawals' | 'subscriptions' | 'users' | 'fraud' | 'settings'>('overview');

  // Data states
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [withdrawalFilter, setWithdrawalFilter] = useState<string>('all');
  const [users, setUsers] = useState<Array<{ user: User; profile: Profile }>>([]);
  const [userSearch, setUserSearch] = useState('');
  const [fraudFlags, setFraudFlags] = useState<FraudFlag[]>([]);
  const [subscriptionOrders, setSubscriptionOrders] = useState<any[]>([]);
  const [subOrderFilter, setSubOrderFilter] = useState<string>('all');

  // Action dialogs
  const [utrModalWithdrawal, setUtrModalWithdrawal] = useState<Withdrawal | null>(null);
  const [utrInput, setUtrInput] = useState('');
  const [rejectModalWithdrawal, setRejectModalWithdrawal] = useState<Withdrawal | null>(null);
  const [rejectReason, setRejectReason] = useState('Security validation failure or invalid UPI details');
  const [adjustUser, setAdjustUser] = useState<{ user: User; profile: Profile } | null>(null);
  const [adjustPoints, setAdjustPoints] = useState<number>(100);
  const [adjustReason, setAdjustReason] = useState('Manual bonus / promotional credit');

  // Subscription action dialogs
  const [verifySubOrder, setVerifySubOrder] = useState<any | null>(null);
  const [subUtrInput, setSubUtrInput] = useState('');
  const [rejectSubOrder, setRejectSubOrder] = useState<any | null>(null);
  const [rejectSubReason, setRejectSubReason] = useState('Payment reference could not be verified on bank account');
  const [planModalUser, setPlanModalUser] = useState<{ user: User; profile: Profile } | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('plan_99');
  const [planDurationDays, setPlanDurationDays] = useState<number>(30);

  useEffect(() => {
    if (isOpen && isAuthenticated) {
      loadAllAdminData();
    }
  }, [isOpen, isAuthenticated]);

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      await api.adminLogin(pin);
      setIsAuthenticated(true);
      triggerHaptic('light');
    } catch (err: any) {
      setAuthError(err.message || 'Incorrect PIN');
      triggerHaptic('error');
    }
  };

  const loadAllAdminData = async () => {
    setLoading(true);
    try {
      const [overviewData, wds, usrs, flags, subOrders] = await Promise.all([
        api.getAdminOverview(pin),
        api.getAdminWithdrawals(withdrawalFilter, pin),
        api.getAdminUsers(userSearch, pin),
        api.getAdminFraudFlags(pin),
        api.getAdminSubscriptionOrders(subOrderFilter, pin),
      ]);
      setStats(overviewData.stats);
      setSettings(overviewData.settings);
      setWithdrawals(wds);
      setUsers(usrs.users);
      setFraudFlags(flags);
      setSubscriptionOrders(subOrders);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawalAction = async (
    withdrawal: Withdrawal,
    action: 'approve' | 'reject' | 'paid'
  ) => {
    if (action === 'paid') {
      setUtrModalWithdrawal(withdrawal);
      setUtrInput(`UTR${Date.now().toString().slice(-8)}`);
      return;
    }
    if (action === 'reject') {
      setRejectModalWithdrawal(withdrawal);
      return;
    }

    try {
      await api.processAdminWithdrawal(withdrawal.id, 'approve', { pin });
      triggerHaptic('light');
      await loadAllAdminData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const confirmPayWithdrawal = async () => {
    if (!utrModalWithdrawal || !utrInput) return;
    try {
      await api.processAdminWithdrawal(utrModalWithdrawal.id, 'paid', {
        utrNumber: utrInput.trim(),
        pin,
      });
      setUtrModalWithdrawal(null);
      triggerHaptic('medium');
      await loadAllAdminData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const confirmRejectWithdrawal = async () => {
    if (!rejectModalWithdrawal) return;
    try {
      await api.processAdminWithdrawal(rejectModalWithdrawal.id, 'reject', {
        rejectionReason: rejectReason.trim(),
        pin,
      });
      setRejectModalWithdrawal(null);
      triggerHaptic('light');
      await loadAllAdminData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Subscription verification actions
  const handleVerifySubOrder = async () => {
    if (!verifySubOrder) return;
    try {
      await api.verifyAdminSubscriptionOrder(verifySubOrder.id, subUtrInput.trim() || undefined, pin);
      setVerifySubOrder(null);
      triggerHaptic('medium');
      await loadAllAdminData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRejectSubOrder = async () => {
    if (!rejectSubOrder) return;
    try {
      await api.rejectAdminSubscriptionOrder(rejectSubOrder.id, rejectSubReason.trim(), pin);
      setRejectSubOrder(null);
      triggerHaptic('light');
      await loadAllAdminData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAssignUserPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planModalUser) return;
    try {
      await api.setAdminUserPlan(planModalUser.user.id, selectedPlanId, planDurationDays, pin);
      setPlanModalUser(null);
      triggerHaptic('light');
      await loadAllAdminData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const toggleUserFreeze = async (userId: string, currentStatus: AccountStatus) => {
    const nextStatus: AccountStatus = currentStatus === 'frozen' ? 'active' : 'frozen';
    try {
      await api.setAdminUserStatus(userId, nextStatus, pin);
      triggerHaptic('light');
      await loadAllAdminData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAdjustPointsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustUser) return;
    try {
      await api.adminAdjustPoints(adjustUser.user.id, adjustPoints, adjustReason, pin);
      setAdjustUser(null);
      triggerHaptic('light');
      await loadAllAdminData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    try {
      const updated = await api.updateAdminSettings(settings, pin);
      setSettings(updated);
      triggerHaptic('light');
      alert('App and AdMob settings updated successfully!');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleResolveFlag = async (flagId: string) => {
    try {
      await api.resolveAdminFraudFlag(flagId, pin);
      triggerHaptic('light');
      await loadAllAdminData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-4xl bg-slate-900 border border-slate-750 rounded-2xl shadow-2xl overflow-hidden text-slate-200 flex flex-col h-[92vh]"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-300 shadow-md">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white">TapPoints Admin Console</h2>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded">
                  Super Admin
                </span>
              </div>
              <p className="text-xs text-slate-400">Ledger oversight, payout approval & anti-fraud security</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAuthenticated && (
              <button
                onClick={loadAllAdminData}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PIN Screen if not authenticated */}
        {!isAuthenticated ? (
          <div className="flex-1 flex items-center justify-center p-6 bg-slate-900/60">
            <form onSubmit={handlePinSubmit} className="w-full max-w-sm bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4">
              <div className="text-center space-y-1">
                <Lock className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                <h3 className="text-base font-bold text-white">Enter Admin Access PIN</h3>
                <p className="text-xs text-slate-400">Default development PIN is <span className="font-mono text-purple-300 font-bold">8888</span></p>
              </div>

              {authError && (
                <div className="p-2.5 bg-rose-950/60 border border-rose-600/40 rounded-xl text-rose-300 text-xs text-center">
                  {authError}
                </div>
              )}

              <input
                id="admin-pin-input"
                type="password"
                maxLength={8}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="PIN (8888)"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-center text-xl font-mono tracking-widest text-white focus:outline-none focus:border-purple-500"
                autoFocus
              />

              <button
                type="submit"
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Unlock Console
              </button>
            </form>
          </div>
        ) : (
          /* Main Admin Navigation and Tabs */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Nav Tabs */}
            <div className="flex border-b border-slate-800 bg-slate-950 px-4 gap-2 overflow-x-auto">
              {[
                { id: 'overview', label: 'Overview', icon: Shield },
                { id: 'withdrawals', label: `Withdrawals (${withdrawals.filter((w) => w.status === 'pending').length} Pending)`, icon: Coins },
                { id: 'subscriptions', label: `Subscriptions (${subscriptionOrders.filter((o) => o.status === 'pending_verification').length} Verify)`, icon: CreditCard },
                { id: 'users', label: `Users (${users.length})`, icon: Users },
                { id: 'fraud', label: `Anti-Fraud Radar (${fraudFlags.filter((f) => !f.resolved).length})`, icon: ShieldAlert },
                { id: 'settings', label: 'App, Plans & AdMob', icon: SettingsIcon },
              ].map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition whitespace-nowrap cursor-pointer ${
                      active
                        ? 'border-purple-500 text-purple-300 bg-slate-900/60'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-900/50">
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && stats && (
                <div className="space-y-6">
                  {/* KPI Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
                      <span className="text-slate-400 text-xs block mb-1">Total Users</span>
                      <span className="text-2xl font-black font-mono text-white">{stats.totalUsers}</span>
                      <span className="text-[11px] text-emerald-400 block mt-1">
                        {stats.activeUsersToday} active today
                      </span>
                    </div>

                    <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
                      <span className="text-slate-400 text-xs block mb-1">Total Points Issued</span>
                      <span className="text-2xl font-black font-mono text-emerald-400">
                        {stats.totalPointsIssued.toLocaleString()}
                      </span>
                      <span className="text-[11px] text-slate-400 block mt-1">
                        ≈ ₹{stats.totalPointsValueInr.toFixed(2)} INR
                      </span>
                    </div>

                    <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
                      <span className="text-slate-400 text-xs block mb-1">Rewarded Ads Watched</span>
                      <span className="text-2xl font-black font-mono text-indigo-400">
                        {stats.totalRewardedAdsWatched || 0}
                      </span>
                      <span className="text-[11px] text-slate-400 block mt-1">
                        Completed voluntary views
                      </span>
                    </div>

                    <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
                      <span className="text-slate-400 text-xs block mb-1">Pending Withdrawals</span>
                      <span className="text-2xl font-black font-mono text-amber-400">
                        ₹{stats.pendingWithdrawalsInr}
                      </span>
                      <span className="text-[11px] text-amber-300/80 block mt-1">
                        {stats.pendingWithdrawalsCount} requests
                      </span>
                    </div>

                    <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
                      <span className="text-slate-400 text-xs block mb-1">Settled Payouts</span>
                      <span className="text-2xl font-black font-mono text-teal-400">
                        ₹{stats.paidWithdrawalsInr}
                      </span>
                      <span className="text-[11px] text-rose-400 block mt-1">
                        {stats.flaggedUsersCount} flagged accounts
                      </span>
                    </div>
                  </div>

                  {/* Pending Withdrawals Quick Action Table */}
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-400" />
                        <span>Pending Payout Requests Awaiting Action</span>
                      </h3>
                      <button
                        onClick={() => setActiveTab('withdrawals')}
                        className="text-xs text-purple-400 hover:text-purple-300 font-semibold cursor-pointer"
                      >
                        View All
                      </button>
                    </div>

                    {withdrawals.filter((w) => w.status === 'pending').length === 0 ? (
                      <p className="text-xs text-slate-500 py-4 text-center">No pending withdrawal requests in queue.</p>
                    ) : (
                      <div className="space-y-2">
                        {withdrawals
                          .filter((w) => w.status === 'pending')
                          .slice(0, 4)
                          .map((w) => (
                            <div
                              key={w.id}
                              className="p-3 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-between gap-3 text-xs"
                            >
                              <div>
                                <span className="font-bold text-white font-mono text-sm">₹{w.inrAmount}</span>
                                <span className="text-slate-400 ml-2">to <strong className="font-mono text-slate-200">{w.upiId}</strong></span>
                                <span className="text-[11px] text-slate-500 block">User: {w.userName} ({w.userEmail})</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => handleWithdrawalAction(w, 'paid')}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-semibold cursor-pointer"
                                >
                                  Pay with UTR
                                </button>
                                <button
                                  onClick={() => handleWithdrawalAction(w, 'reject')}
                                  className="px-2.5 py-1 bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-700/50 rounded font-semibold cursor-pointer"
                                >
                                  Reject & Refund
                                </button>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: WITHDRAWALS QUEUE */}
              {activeTab === 'withdrawals' && (
                <div className="space-y-4">
                  {/* Status Filter */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                      {['all', 'pending', 'approved', 'paid', 'rejected'].map((st) => (
                        <button
                          key={st}
                          onClick={() => setWithdrawalFilter(st)}
                          className={`px-3 py-1 text-xs font-semibold rounded-lg capitalize transition cursor-pointer ${
                            withdrawalFilter === st
                              ? 'bg-purple-600 text-white'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>

                    <span className="text-xs text-slate-400">
                      Showing {withdrawals.length} withdrawal records
                    </span>
                  </div>

                  {/* Withdrawals List */}
                  <div className="space-y-2.5">
                    {withdrawals.length === 0 ? (
                      <div className="py-12 text-center text-xs text-slate-500">No withdrawal records match the filter.</div>
                    ) : (
                      withdrawals.map((w) => (
                        <div
                          key={w.id}
                          className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-base font-black text-white">₹{w.inrAmount}</span>
                              <span className="font-mono text-slate-400">({w.pointsRequested} pts)</span>
                              <span className="font-mono font-medium text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/20">
                                UPI: {w.upiId}
                              </span>
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

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-400 pt-1 border-t border-slate-900">
                            <div>User: <span className="text-slate-200">{w.userName}</span></div>
                            <div>Email: <span className="text-slate-200">{w.userEmail}</span></div>
                            <div>Date: <span className="text-slate-200">{new Date(w.requestedAt).toLocaleString()}</span></div>
                            <div>ID: <span className="font-mono text-slate-400">{w.id}</span></div>
                          </div>

                          {w.utrNumber && (
                            <div className="p-2 bg-emerald-950/40 border border-emerald-500/20 rounded text-emerald-300 font-mono text-[11px]">
                              Settlement UTR: {w.utrNumber} (Processed by: {w.processedBy})
                            </div>
                          )}

                          {w.rejectionReason && (
                            <div className="p-2 bg-rose-950/40 border border-rose-500/20 rounded text-rose-300 text-[11px]">
                              Rejection: {w.rejectionReason} (Points refunded to user)
                            </div>
                          )}

                          {w.status === 'pending' && (
                            <div className="flex items-center gap-2 pt-1">
                              <button
                                onClick={() => handleWithdrawalAction(w, 'paid')}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs cursor-pointer shadow"
                              >
                                ✓ Approve & Settle (Enter UTR)
                              </button>
                              <button
                                onClick={() => handleWithdrawalAction(w, 'reject')}
                                className="px-3 py-1.5 bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-700/60 rounded-lg font-bold text-xs cursor-pointer"
                              >
                                ✕ Reject & Auto-Refund Points
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB: SUBSCRIPTION ORDERS & VERIFICATION */}
              {activeTab === 'subscriptions' && (
                <div className="space-y-4">
                  <div className="p-3.5 bg-purple-950/40 border border-purple-700/40 rounded-xl text-xs text-purple-200 flex items-center justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-white flex items-center gap-1.5">
                        <CreditCard className="w-4 h-4 text-purple-400" />
                        <span>Daily Limit Plans & UPI Payment Verification</span>
                      </h4>
                      <p className="text-[11px] text-purple-300/80 mt-0.5">
                        Verify user transaction references (UTR) to unlock ₹99 (1,000 pts/day), ₹499 (5,000 pts/day), or ₹2,000 (Unlimited) daily limits.
                      </p>
                    </div>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex gap-2">
                    {['all', 'pending_verification', 'completed', 'pending', 'rejected'].map((filter) => (
                      <button
                        key={filter}
                        onClick={() => {
                          setSubOrderFilter(filter);
                          api.getAdminSubscriptionOrders(filter, pin).then(setSubscriptionOrders);
                        }}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold uppercase tracking-wider transition cursor-pointer ${
                          subOrderFilter === filter
                            ? 'bg-purple-600 text-white shadow-sm'
                            : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                        }`}
                      >
                        {filter.replace('_', ' ')}
                      </button>
                    ))}
                  </div>

                  {/* Orders List */}
                  <div className="space-y-3">
                    {subscriptionOrders.length === 0 ? (
                      <div className="py-12 text-center text-xs text-slate-500">
                        No subscription orders found for this filter.
                      </div>
                    ) : (
                      subscriptionOrders.map((order) => (
                        <div
                          key={order.id}
                          className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-3 text-xs"
                        >
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-slate-400">{order.id}</span>
                              <span className="font-semibold text-white">{order.userName}</span>
                              <span className="text-slate-400">({order.userEmail})</span>
                            </div>

                            <span
                              className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                                order.status === 'pending_verification'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                                  : order.status === 'completed'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : order.status === 'pending'
                                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              }`}
                            >
                              {order.status.replace('_', ' ')}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] bg-slate-900 p-2.5 rounded-lg border border-slate-850">
                            <div>
                              Plan: <strong className="text-purple-400 font-bold">{order.planName}</strong> (₹{order.amountInr}/mo)
                            </div>
                            <div>
                              Daily Limit: <strong className="text-emerald-400 font-bold">
                                {order.dailyLimit ? `${order.dailyLimit.toLocaleString()} pts/day` : 'Unlimited ⚡'}
                              </strong>
                            </div>
                            <div>
                              Method: <strong className="text-slate-300 uppercase">{order.paymentMethod}</strong>
                            </div>
                            <div>
                              Created: <span className="text-slate-400">{new Date(order.createdAt).toLocaleString()}</span>
                            </div>
                          </div>

                          {order.transactionReference && (
                            <div className="text-[11px] text-amber-300 font-mono bg-amber-950/40 border border-amber-500/30 p-2 rounded flex items-center justify-between">
                              <span>User Submitted UTR: <strong>{order.transactionReference}</strong></span>
                              {order.submittedAt && (
                                <span className="text-[10px] text-slate-400">Submitted at {new Date(order.submittedAt).toLocaleTimeString()}</span>
                              )}
                            </div>
                          )}

                          {order.rejectionReason && (
                            <div className="text-[11px] text-rose-300 bg-rose-950/40 border border-rose-500/20 px-2 py-1 rounded">
                              ✕ Rejection Reason: {order.rejectionReason}
                            </div>
                          )}

                          {/* Verification Actions */}
                          {(order.status === 'pending_verification' || order.status === 'pending') && (
                            <div className="flex items-center gap-2 pt-1">
                              <button
                                onClick={() => {
                                  setVerifySubOrder(order);
                                  setSubUtrInput(order.transactionReference || '');
                                }}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs cursor-pointer shadow flex items-center gap-1.5"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Verify Payment & Unlock Plan</span>
                              </button>
                              <button
                                onClick={() => {
                                  setRejectSubOrder(order);
                                  setRejectSubReason('Transaction reference could not be matched on bank statement');
                                }}
                                className="px-3 py-1.5 bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-700/60 rounded-lg font-bold text-xs cursor-pointer flex items-center gap-1.5"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Reject Order</span>
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: USER DIRECTORY */}
              {activeTab === 'users' && (
                <div className="space-y-4">
                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="Search users by email, user ID (TP-...), name, or UPI..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  {/* Users Table */}
                  <div className="space-y-2.5">
                    {users.map(({ user, profile }) => {
                      const planId = profile.currentPlanId || 'free';
                      const planLabel =
                        planId === 'plan_2000'
                          ? '₹2,000 Unlimited'
                          : planId === 'plan_499'
                          ? '₹499 (5k/day)'
                          : planId === 'plan_99'
                          ? '₹99 (1k/day)'
                          : 'Free (500/day)';

                      return (
                        <div
                          key={user.id}
                          className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-3 text-xs"
                        >
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm font-bold text-emerald-400">{user.id}</span>
                              <span className="text-white font-semibold">{profile.name}</span>
                              <span className="text-slate-400">({user.email})</span>
                            </div>

                            <div className="flex items-center gap-2">
                              {/* Plan Badge */}
                              <span
                                className={`px-2 py-0.5 text-[10px] font-bold rounded flex items-center gap-1 ${
                                  planId === 'plan_2000'
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                    : planId === 'plan_499'
                                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                                    : planId === 'plan_99'
                                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                                    : 'bg-slate-800 text-slate-400'
                                }`}
                              >
                                <Sparkles className="w-3 h-3" />
                                <span>{planLabel}</span>
                              </span>

                              {/* Fraud Score badge */}
                              <span
                                className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                                  profile.fraudScore > 50
                                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                    : profile.fraudScore > 20
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                    : 'bg-emerald-500/10 text-emerald-400'
                                }`}
                              >
                                Fraud Score: {profile.fraudScore}
                              </span>

                              {/* Status */}
                              <span
                                className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${
                                  user.status === 'active'
                                    ? 'bg-emerald-500/20 text-emerald-300'
                                    : 'bg-rose-500/20 text-rose-300'
                                }`}
                              >
                                {user.status}
                              </span>
                            </div>
                          </div>

                          {/* Balance and Tap Metrics */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] bg-slate-900 p-2.5 rounded-lg border border-slate-850">
                            <div>Available: <strong className="text-emerald-400 font-mono">{profile.pointsBalance} pts</strong> (₹{(profile.pointsBalance / (settings?.pointsToInrRatio || 10)).toFixed(2)})</div>
                            <div>Daily Earned: <strong className="text-purple-300 font-mono">{profile.dailyEarnedPoints || 0} pts</strong></div>
                            <div>Total Taps: <strong className="text-slate-200 font-mono">{profile.totalTaps}</strong></div>
                            <div>Withdrawn: <strong className="text-teal-400 font-mono">₹{profile.totalWithdrawnInr}</strong></div>
                          </div>

                          {profile.planExpiresAt && (
                            <div className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                              <Clock className="w-3 h-3 text-purple-400" />
                              <span>Plan Valid Until: {new Date(profile.planExpiresAt).toLocaleDateString()}</span>
                            </div>
                          )}

                          {/* Action buttons */}
                          <div className="flex items-center gap-2 pt-1 flex-wrap">
                            <button
                              onClick={() => {
                                setPlanModalUser({ user, profile });
                                setSelectedPlanId(profile.currentPlanId || 'plan_99');
                              }}
                              className="px-3 py-1.5 bg-purple-900/60 hover:bg-purple-800/60 text-purple-200 border border-purple-600/40 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                            >
                              <CreditCard className="w-3.5 h-3.5 text-purple-400" />
                              <span>Assign / Upgrade Plan</span>
                            </button>

                            <button
                              onClick={() => toggleUserFreeze(user.id, user.status)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                                user.status === 'frozen'
                                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                  : 'bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-700/50'
                              }`}
                            >
                              {user.status === 'frozen' ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                              <span>{user.status === 'frozen' ? 'Unfreeze Account' : 'Freeze Account'}</span>
                            </button>

                            <button
                              onClick={() => setAdjustUser({ user, profile })}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                            >
                              <Coins className="w-3.5 h-3.5 text-amber-400" />
                              <span>Adjust Points (Credit/Debit)</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 4: ANTI-FRAUD RADAR */}
              {activeTab === 'fraud' && (
                <div className="space-y-4">
                  <div className="p-3.5 bg-rose-950/40 border border-rose-700/40 rounded-xl text-xs text-rose-200 flex items-center gap-3">
                    <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
                    <div>
                      <h4 className="font-bold text-white">Server-side Anti-Cheat Defense Log</h4>
                      <p className="text-[11px] text-rose-300/80">
                        Tracks automated bots, macro clicking, replay attacks, and suspicious tap interval standard deviations in real-time.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {fraudFlags.length === 0 ? (
                      <div className="py-12 text-center text-xs text-slate-500">
                        No suspicious anomalies detected yet. Clean audit!
                      </div>
                    ) : (
                      fraudFlags.map((flag) => (
                        <div
                          key={flag.id}
                          className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${
                                  flag.severity === 'high'
                                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                    : flag.severity === 'medium'
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                    : 'bg-slate-800 text-slate-400'
                                }`}
                              >
                                {flag.severity} severity
                              </span>
                              <span className="font-mono font-bold text-white">{flag.flagType}</span>
                              <span className="text-slate-400">User: {flag.userEmail} ({flag.userId})</span>
                            </div>

                            <div className="flex items-center gap-2">
                              {flag.resolved ? (
                                <span className="text-emerald-400 text-[11px] flex items-center gap-1 font-semibold">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Resolved
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleResolveFlag(flag.id)}
                                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] rounded font-semibold cursor-pointer"
                                >
                                  Mark Resolved
                                </button>
                              )}
                            </div>
                          </div>

                          <p className="text-slate-300 bg-slate-900 p-2 rounded text-[11px] font-mono">
                            {flag.details}
                          </p>

                          <div className="text-[10px] text-slate-500">
                            Detected at {new Date(flag.detectedAt).toLocaleString()}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB 5: APP & ADMOB SETTINGS */}
              {activeTab === 'settings' && settings && (
                <form onSubmit={handleSaveSettings} className="space-y-5 max-w-xl">
                  <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-3 text-xs">
                    <h3 className="text-sm font-bold text-white">Points & Rupee Economics</h3>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-400 mb-1">Points per Tap</label>
                        <input
                          type="number"
                          value={settings.pointsPerTap}
                          onChange={(e) =>
                            setSettings({ ...settings, pointsPerTap: parseInt(e.target.value, 10) || 10 })
                          }
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">Points for ₹1 INR (10 pts = ₹1)</label>
                        <input
                          type="number"
                          value={settings.pointsToInrRatio}
                          onChange={(e) =>
                            setSettings({ ...settings, pointsToInrRatio: parseInt(e.target.value, 10) || 10 })
                          }
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-400 mb-1">Minimum Withdrawal (₹ INR)</label>
                        <input
                          type="number"
                          value={settings.minWithdrawalInr}
                          onChange={(e) =>
                            setSettings({ ...settings, minWithdrawalInr: parseInt(e.target.value, 10) || 10 })
                          }
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">Daily Tap Limit per User</label>
                        <input
                          type="number"
                          value={settings.dailyTapLimit}
                          onChange={(e) =>
                            setSettings({ ...settings, dailyTapLimit: parseInt(e.target.value, 10) || 200 })
                          }
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Daily Earning & Subscription Plans Config */}
                  <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-3 text-xs">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-purple-400" />
                      <span>Subscription Plans & Daily Limits Configuration</span>
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Configure price in INR and server-enforced daily earning caps for each tier.
                    </p>

                    <div className="space-y-3">
                      {(
                        [
                          { id: 'free' as const, name: 'Free Plan', desc: 'Default user limit' },
                          { id: 'plan_99' as const, name: '₹99 / Month Plan', desc: 'Standard starter upgrade' },
                          { id: 'plan_499' as const, name: '₹499 / Month Plan', desc: 'Power user tier' },
                          { id: 'plan_2000' as const, name: '₹2,000 / Month Plan', desc: 'Unlimited tier (enter 0 for unlimited)' },
                        ]
                      ).map((tier) => {
                        const fallbackPlans = {
                          free: { priceInr: 0, dailyLimit: 500 },
                          plan_99: { priceInr: 99, dailyLimit: 1000 },
                          plan_499: { priceInr: 499, dailyLimit: 5000 },
                          plan_2000: { priceInr: 2000, dailyLimit: null },
                        };
                        const currentPlans = settings.plans || fallbackPlans;
                        const planData = currentPlans[tier.id] || fallbackPlans[tier.id];

                        return (
                          <div key={tier.id} className="bg-slate-900 border border-slate-800 p-3 rounded-lg space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-white text-xs">{tier.name}</span>
                              <span className="text-[10px] font-mono text-purple-400">{tier.id}</span>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[10px] text-slate-400 mb-0.5">Price (₹ INR)</label>
                                <input
                                  type="number"
                                  value={planData.priceInr}
                                  disabled={tier.id === 'free'}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value, 10) || 0;
                                    setSettings({
                                      ...settings,
                                      plans: {
                                        ...currentPlans,
                                        [tier.id]: {
                                          ...planData,
                                          priceInr: val,
                                        },
                                      },
                                    });
                                  }}
                                  className={`w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-white font-mono ${
                                    tier.id === 'free' ? 'opacity-50 cursor-not-allowed' : ''
                                  }`}
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] text-slate-400 mb-0.5">Daily Limit (points - 0 for unlimited)</label>
                                <input
                                  type="number"
                                  placeholder="0 for Unlimited"
                                  value={planData.dailyLimit ?? 0}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value, 10);
                                    setSettings({
                                      ...settings,
                                      plans: {
                                        ...currentPlans,
                                        [tier.id]: {
                                          ...planData,
                                          dailyLimit: val === 0 ? null : (val || 500),
                                        },
                                      },
                                    });
                                  }}
                                  className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-white font-mono"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* AdMob Configuration */}
                  <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-white">Google AdMob Configuration</h3>
                        <p className="text-[11px] text-slate-400">
                          {settings.isTestMode
                            ? 'Currently using official Google Test Ad IDs'
                            : 'Production mode active with custom AdMob IDs'}
                        </p>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.admobEnabled}
                          onChange={(e) => setSettings({ ...settings, admobEnabled: e.target.checked })}
                          className="w-4 h-4 text-purple-600 rounded bg-slate-900 border-slate-700"
                        />
                        <span className="text-xs font-semibold text-slate-300">Enable Ads</span>
                      </label>
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">AdMob App ID</label>
                      <input
                        type="text"
                        value={settings.admobAppId || ''}
                        onChange={(e) => setSettings({ ...settings, admobAppId: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                        placeholder="ca-app-pub-3940256099942544~3347511713"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-400 mb-1">Banner Ad Unit ID</label>
                        <input
                          type="text"
                          value={settings.admobBannerId}
                          onChange={(e) => setSettings({ ...settings, admobBannerId: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">Interstitial Ad Unit ID</label>
                        <input
                          type="text"
                          value={settings.admobInterstitialId}
                          onChange={(e) => setSettings({ ...settings, admobInterstitialId: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">Rewarded Video Ad Unit ID</label>
                      <input
                        type="text"
                        value={settings.admobRewardedId || ''}
                        onChange={(e) => setSettings({ ...settings, admobRewardedId: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                        placeholder="ca-app-pub-3940256099942544/5224354917"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-slate-400 mb-1">Rewarded Points / Ad</label>
                        <input
                          type="number"
                          value={settings.rewardedAdPoints || 50}
                          onChange={(e) =>
                            setSettings({ ...settings, rewardedAdPoints: parseInt(e.target.value, 10) || 50 })
                          }
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">Rewarded Ads Daily Limit</label>
                        <input
                          type="number"
                          value={settings.rewardedAdDailyLimit || 5}
                          onChange={(e) =>
                            setSettings({ ...settings, rewardedAdDailyLimit: parseInt(e.target.value, 10) || 5 })
                          }
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">Interstitial Cooldown (sec)</label>
                        <input
                          type="number"
                          value={settings.interstitialCooldownSeconds || 60}
                          onChange={(e) =>
                            setSettings({ ...settings, interstitialCooldownSeconds: parseInt(e.target.value, 10) || 60 })
                          }
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="py-2.5 px-6 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-lg shadow-purple-950/40"
                  >
                    Save All Settings
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* UTR Settlement Modal */}
        {utrModalWithdrawal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80">
            <div className="w-full max-w-sm bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-white">Settle Payout with Bank UTR Reference</h3>
              <p className="text-xs text-slate-400">
                Enter the transaction reference / UTR from your bank/UPI gateway for ₹{utrModalWithdrawal.inrAmount} to {utrModalWithdrawal.upiId}.
              </p>
              <input
                type="text"
                value={utrInput}
                onChange={(e) => setUtrInput(e.target.value)}
                placeholder="e.g. 428190382910"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white font-mono"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={confirmPayWithdrawal}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  Confirm & Mark Paid
                </button>
                <button
                  onClick={() => setUtrModalWithdrawal(null)}
                  className="py-2 px-3 bg-slate-800 text-slate-300 rounded-lg text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Rejection Modal */}
        {rejectModalWithdrawal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80">
            <div className="w-full max-w-sm bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-rose-300">Reject Withdrawal & Refund Points</h3>
              <p className="text-xs text-slate-400">
                Rejecting this request will immediately refund {rejectModalWithdrawal.pointsRequested} points (₹{rejectModalWithdrawal.inrAmount}) back to {rejectModalWithdrawal.userName}'s wallet.
              </p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                placeholder="Reason for rejection..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
              />
              <div className="flex gap-2">
                <button
                  onClick={confirmRejectWithdrawal}
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  Reject & Refund
                </button>
                <button
                  onClick={() => setRejectModalWithdrawal(null)}
                  className="py-2 px-3 bg-slate-800 text-slate-300 rounded-lg text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Adjust Points Modal */}
        {adjustUser && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80">
            <form onSubmit={handleAdjustPointsSubmit} className="w-full max-w-sm bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-white">
                Adjust Points for {adjustUser.profile.name}
              </h3>
              <p className="text-xs text-slate-400">
                Current Balance: <span className="font-mono text-emerald-400 font-bold">{adjustUser.profile.pointsBalance} pts</span>
              </p>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Points Delta (+ to add, - to deduct)</label>
                <input
                  type="number"
                  value={adjustPoints}
                  onChange={(e) => setAdjustPoints(parseInt(e.target.value, 10) || 0)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Audit Reason</label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
                  required
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  Apply Adjustment
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustUser(null)}
                  className="py-2 px-3 bg-slate-800 text-slate-300 rounded-lg text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Subscription Verify Modal */}
        {verifySubOrder && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80">
            <div className="w-full max-w-sm bg-slate-950 border border-purple-500/40 rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Verify Payment & Unlock Plan</span>
              </h3>
              <p className="text-xs text-slate-400">
                Verifying this payment for <strong>{verifySubOrder.userName}</strong> will immediately upgrade their account to the <strong>{verifySubOrder.planName}</strong> plan for 30 days and unlock their daily limit.
              </p>

              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Order Amount:</span>
                  <strong className="text-emerald-400 font-mono">₹{verifySubOrder.amountInr}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Target Plan:</span>
                  <strong className="text-purple-300">{verifySubOrder.planName}</strong>
                </div>
                {verifySubOrder.transactionReference && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">User's UTR:</span>
                    <strong className="text-amber-300 font-mono">{verifySubOrder.transactionReference}</strong>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">Confirm / Enter Bank UTR Reference</label>
                <input
                  type="text"
                  value={subUtrInput}
                  onChange={(e) => setSubUtrInput(e.target.value)}
                  placeholder="e.g. 428190382910"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white font-mono"
                  autoFocus
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleVerifySubOrder}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold cursor-pointer shadow-lg shadow-emerald-950/40"
                >
                  Verify & Activate Plan
                </button>
                <button
                  onClick={() => setVerifySubOrder(null)}
                  className="py-2 px-3 bg-slate-800 text-slate-300 rounded-lg text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Subscription Reject Modal */}
        {rejectSubOrder && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80">
            <div className="w-full max-w-sm bg-slate-950 border border-rose-500/40 rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-rose-300 flex items-center gap-2">
                <XCircle className="w-4 h-4 text-rose-400" />
                <span>Reject Subscription Order</span>
              </h3>
              <p className="text-xs text-slate-400">
                Rejecting order for <strong>{rejectSubOrder.userName}</strong> ({rejectSubOrder.planName}).
              </p>

              <div>
                <label className="block text-xs text-slate-300 mb-1">Rejection Reason</label>
                <textarea
                  value={rejectSubReason}
                  onChange={(e) => setRejectSubReason(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleRejectSubOrder}
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  Confirm Reject
                </button>
                <button
                  onClick={() => setRejectSubOrder(null)}
                  className="py-2 px-3 bg-slate-800 text-slate-300 rounded-lg text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Admin Assign Plan Modal */}
        {planModalUser && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80">
            <form onSubmit={handleAssignUserPlan} className="w-full max-w-sm bg-slate-950 border border-purple-500/40 rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-purple-400" />
                <span>Assign Plan to {planModalUser.profile.name}</span>
              </h3>
              <p className="text-xs text-slate-400">
                Directly override or grant a subscription plan for testing, VIP users, or manual payment receipts.
              </p>

              <div>
                <label className="block text-xs text-slate-300 mb-1">Select Plan</label>
                <select
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value as SubscriptionPlanId)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
                >
                  <option value="free">Free Plan (500 points/day)</option>
                  <option value="plan_99">₹99/mo Plan (1,000 points/day)</option>
                  <option value="plan_499">₹499/mo Plan (5,000 points/day)</option>
                  <option value="plan_2000">₹2,000/mo Plan (Unlimited Earning)</option>
                </select>
              </div>

              {selectedPlanId !== 'free' && (
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Duration (Days)</label>
                  <input
                    type="number"
                    value={planDurationDays}
                    onChange={(e) => setPlanDurationDays(parseInt(e.target.value, 10) || 30)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white font-mono"
                    min={1}
                    max={365}
                  />
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  Save & Apply Plan
                </button>
                <button
                  type="button"
                  onClick={() => setPlanModalUser(null)}
                  className="py-2 px-3 bg-slate-800 text-slate-300 rounded-lg text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </motion.div>
    </div>
  );
};
