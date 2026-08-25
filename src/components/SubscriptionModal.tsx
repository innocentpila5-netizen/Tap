import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Crown,
  CheckCircle2,
  Zap,
  Sparkles,
  ShieldCheck,
  QrCode,
  ArrowRight,
  AlertCircle,
  Copy,
  Check,
  Flame,
  Info,
} from 'lucide-react';
import { SubscriptionPlanId, Profile, AppSettings } from '../types.js';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Profile;
  settings: AppSettings;
  onPlanUpgraded: () => void;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  onClose,
  profile,
  settings,
  onPlanUpgraded,
}) => {
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlanId>('plan_99');
  const [step, setStep] = useState<'plans' | 'payment'>('plans');
  const [paymentMethod, setPaymentMethod] = useState<'upi_qr' | 'upi_intent'>('upi_qr');
  const [transactionRef, setTransactionRef] = useState('');
  const [orderId, setOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentPlan = profile.currentPlanId || 'free';
  const plans = settings.plans || {
    free: { priceInr: 0, dailyLimit: 500 },
    plan_99: { priceInr: 99, dailyLimit: 1000 },
    plan_499: { priceInr: 499, dailyLimit: 5000 },
    plan_2000: { priceInr: 2000, dailyLimit: null },
  };

  const planTiers = [
    {
      id: 'free' as SubscriptionPlanId,
      name: 'Free Plan',
      price: plans.free.priceInr,
      dailyLimit: plans.free.dailyLimit,
      badge: 'Current Default',
      badgeColor: 'bg-slate-700 text-slate-300',
      description: 'Max 500 points (₹50) per day',
      features: [
        '500 Points Daily Limit',
        'Standard tap rate (10 pts/tap)',
        'Voluntary Rewarded Video bonuses',
        'Standard UPI withdrawals from ₹10',
      ],
      color: 'border-slate-700 from-slate-900 to-slate-800',
    },
    {
      id: 'plan_99' as SubscriptionPlanId,
      name: '₹99 Monthly Plan',
      price: plans.plan_99.priceInr,
      dailyLimit: plans.plan_99.dailyLimit,
      badge: 'Popular',
      badgeColor: 'bg-emerald-500 text-white font-bold',
      description: 'Max 1,000 points (₹100) per day',
      features: [
        '1,000 Points Daily Limit (2x Free)',
        '30-Day Active Plan Duration',
        'Verified Payment Unlock Required',
        'Priority withdrawal handling',
      ],
      color: 'border-emerald-500/60 from-emerald-950/40 to-slate-900',
    },
    {
      id: 'plan_499' as SubscriptionPlanId,
      name: '₹499 Monthly Plan',
      price: plans.plan_499.priceInr,
      dailyLimit: plans.plan_499.dailyLimit,
      badge: 'High Earner',
      badgeColor: 'bg-cyan-500 text-white font-bold',
      description: 'Max 5,000 points (₹500) per day',
      features: [
        '5,000 Points Daily Limit (10x Free)',
        '30-Day Active Plan Duration',
        'Verified Payment Unlock Required',
        'Zero payout processing delay',
      ],
      color: 'border-cyan-500/60 from-cyan-950/40 to-slate-900',
    },
    {
      id: 'plan_2000' as SubscriptionPlanId,
      name: '₹2,000 Monthly Plan',
      price: plans.plan_2000.priceInr,
      dailyLimit: plans.plan_2000.dailyLimit,
      badge: 'Unlimited VIP',
      badgeColor: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black',
      description: 'Unlimited daily points with no ceiling',
      features: [
        'UNLIMITED Daily Points (No Cap)',
        '30-Day Active Plan Duration',
        'Verified Payment Unlock Required',
        'Server-Side Bot & Anti-Fraud Protection',
      ],
      color: 'border-amber-500/70 from-amber-950/40 to-slate-900',
    },
  ];

  const handleInitiateOrder = async () => {
    if (selectedPlan === 'free') {
      setError('You are already on the Free Plan or can select a paid plan to increase limits.');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/subscriptions/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': profile.userId,
        },
        body: JSON.stringify({
          planId: selectedPlan,
          paymentMethod,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to initiate order');
      }

      setOrderId(data.order.id);
      setStep('payment');
    } catch (err: any) {
      setError(err.message || 'Error creating order');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitPaymentRef = async () => {
    if (!transactionRef || transactionRef.trim().length < 4) {
      setError('Please enter a valid 12-digit UPI UTR / Transaction Reference.');
      return;
    }

    if (!orderId) {
      setError('No active order ID found. Please reselect your plan.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/subscriptions/orders/${orderId}/submit-ref`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': profile.userId,
        },
        body: JSON.stringify({
          transactionReference: transactionRef.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Payment verification failed');
      }

      setSuccessMessage(data.message || 'Payment successfully verified! Your plan limit is unlocked.');
      onPlanUpgraded();
      setTimeout(() => {
        onClose();
        setSuccessMessage(null);
        setStep('plans');
      }, 1800);
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyUpi = () => {
    navigator.clipboard.writeText('tappoints.pay@upi');
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const selectedTierData = planTiers.find((p) => p.id === selectedPlan);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative w-full max-w-lg bg-slate-900 border border-slate-750 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col text-slate-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
              <Crown className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-1.5">
                <span>Earning Plans & Limits</span>
              </h2>
              <p className="text-[11px] text-slate-400">Strict server-verified daily limits</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {error && (
            <div className="flex items-start gap-2 p-3 bg-rose-950/50 border border-rose-600/40 rounded-xl text-xs text-rose-200">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="flex items-center gap-2 p-3.5 bg-emerald-950/60 border border-emerald-500/50 rounded-xl text-xs font-semibold text-emerald-300">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {step === 'plans' ? (
            <>
              {/* Current Active Plan Pill */}
              <div className="flex items-center justify-between p-3 bg-slate-850 border border-slate-750 rounded-xl">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-emerald-400" />
                  <div>
                    <span className="text-[11px] text-slate-400 block">Your Current Plan</span>
                    <span className="text-xs font-bold text-white capitalize">
                      {currentPlan === 'free'
                        ? 'Free Plan (500 pts/day)'
                        : currentPlan === 'plan_99'
                        ? '₹99 Monthly (1,000 pts/day)'
                        : currentPlan === 'plan_499'
                        ? '₹499 Monthly (5,000 pts/day)'
                        : '₹2,000 Monthly (Unlimited)'}
                    </span>
                  </div>
                </div>
                {profile.subscriptionExpiresAt && (
                  <span className="text-[10px] text-amber-300 font-mono bg-amber-950/40 border border-amber-500/30 px-2 py-0.5 rounded-md">
                    Expires: {new Date(profile.subscriptionExpiresAt).toLocaleDateString()}
                  </span>
                )}
              </div>

              {/* Plans Tier Selection */}
              <div className="space-y-2.5">
                {planTiers.map((tier) => {
                  const isSelected = selectedPlan === tier.id;
                  const isCurrent = currentPlan === tier.id;

                  return (
                    <div
                      key={tier.id}
                      onClick={() => setSelectedPlan(tier.id)}
                      className={`relative p-3.5 rounded-xl border transition-all cursor-pointer bg-gradient-to-r ${tier.color} ${
                        isSelected
                          ? 'border-emerald-400 ring-2 ring-emerald-500/30 shadow-lg'
                          : 'border-slate-800 hover:border-slate-700 opacity-90'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold text-white">{tier.name}</span>
                            {tier.badge && (
                              <span className={`text-[10px] px-2 py-0.5 rounded-full ${tier.badgeColor}`}>
                                {tier.badge}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-slate-300">{tier.description}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-base font-black text-white">
                            {tier.price === 0 ? 'FREE' : `₹${tier.price}`}
                          </span>
                          {tier.price > 0 && <span className="text-[10px] text-slate-400 block">/month</span>}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-300 border-t border-slate-800/80 pt-2">
                        {tier.features.map((feat, idx) => (
                          <div key={idx} className="flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span className="truncate">{feat}</span>
                          </div>
                        ))}
                      </div>

                      {isCurrent && (
                        <div className="absolute top-2 right-2 flex items-center gap-1 text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                          <span>Active</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Security Rule Notice */}
              <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-xl text-xs text-amber-200/90 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-300">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Strict Server-Side Verification Policy</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Higher daily earning limits unlock <strong>strictly after payment verification</strong>. Selecting a
                  plan does not unlock limits until UPI reference is confirmed on the server.
                </p>
              </div>

              {/* Disclaimer */}
              <p className="text-[10px] text-slate-500 text-center leading-tight">
                *TapPoints are promotional in-app reward tokens. Daily counters reset automatically at 00:00 server
                time. Subscriptions auto-downgrade to Free upon 30-day expiration.
              </p>
            </>
          ) : (
            /* Payment & UPI Verification Step */
            <div className="space-y-4">
              <div className="p-3.5 bg-slate-850 border border-slate-750 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 block">Selected Subscription</span>
                  <span className="text-sm font-bold text-white">{selectedTierData?.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-black text-emerald-400 font-mono">
                    ₹{selectedTierData?.price}
                  </span>
                  <span className="text-[10px] text-slate-400 block">30 Days Validity</span>
                </div>
              </div>

              {/* UPI QR & Payment Info */}
              <div className="flex flex-col items-center justify-center p-4 bg-slate-950 border border-slate-800 rounded-xl text-center">
                <div className="p-3 bg-white rounded-xl shadow-md mb-3">
                  <QrCode className="w-32 h-32 text-slate-900" />
                </div>
                <span className="text-xs font-semibold text-slate-300 mb-1">Scan QR with any UPI App</span>
                <span className="text-[11px] text-slate-400">GPay, PhonePe, Paytm, BHIM, CRED</span>

                <div className="mt-3 flex items-center gap-2 px-3 py-1.5 bg-slate-850 border border-slate-700 rounded-lg text-xs font-mono">
                  <span className="text-slate-300">UPI ID: tappoints.pay@upi</span>
                  <button
                    onClick={handleCopyUpi}
                    className="p-1 hover:text-emerald-400 transition-colors text-slate-400 cursor-pointer"
                    title="Copy UPI"
                  >
                    {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* UTR Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Enter 12-Digit Bank / UPI UTR Reference</span>
                  <span className="text-[10px] text-emerald-400 font-normal">For Instant Verification</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 428190382910 or UPI-91823"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[11px] text-slate-400">
                  Tip: Copy the UTR / Ref ID from your payment success screen to verify immediately.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between gap-3">
          {step === 'payment' ? (
            <>
              <button
                type="button"
                onClick={() => setStep('plans')}
                className="px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Back to Plans
              </button>
              <button
                type="button"
                onClick={handleSubmitPaymentRef}
                disabled={loading || !transactionRef}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg transition-all cursor-pointer"
              >
                {loading ? (
                  <span>Verifying Payment...</span>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Verify & Unlock Limit</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleInitiateOrder}
                disabled={loading || selectedPlan === 'free'}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg transition-all cursor-pointer"
              >
                {loading ? (
                  <span>Processing...</span>
                ) : selectedPlan === 'free' ? (
                  <span>Default Free Plan Active</span>
                ) : (
                  <>
                    <span>Proceed to Upgrade (₹{selectedTierData?.price})</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};
