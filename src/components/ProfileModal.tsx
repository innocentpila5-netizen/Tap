import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  X,
  User as UserIcon,
  Copy,
  Check,
  ShieldCheck,
  ShieldAlert,
  Bug,
  Zap,
  RotateCcw,
  LogOut,
  Sliders,
  Calendar,
  Mail,
  Fingerprint,
} from 'lucide-react';
import { User, Profile, AccountStatus } from '../types.js';
import { api } from '../services/api.js';
import { triggerHaptic } from '../utils/audio.js';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  profile: Profile;
  onProfileUpdated: (profile: Profile) => void;
  onLogout: () => void;
  onOpenAuth: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  profile,
  onProfileUpdated,
  onLogout,
  onOpenAuth,
}) => {
  const [copied, setCopied] = useState(false);
  const [name, setName] = useState(profile.name);
  const [upiId, setUpiId] = useState(profile.upiId || '');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Anti-cheat simulation state
  const [simulating, setSimulating] = useState(false);
  const [simLog, setSimLog] = useState<{ type: string; message: string; code?: string } | null>(null);

  if (!isOpen) return null;

  const handleCopyId = () => {
    navigator.clipboard.writeText(user.id);
    setCopied(true);
    triggerHaptic('light');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    try {
      const res = await api.updateProfile(name, upiId);
      onProfileUpdated(res.profile);
      setSaveSuccess(true);
      triggerHaptic('light');
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch {
      triggerHaptic('error');
    } finally {
      setSaving(false);
    }
  };

  // Test Anti-Fraud Engine
  const runAntiFraudTest = async (testType: 'rapid' | 'robotic' | 'replay') => {
    setSimulating(true);
    setSimLog(null);
    try {
      if (testType === 'rapid') {
        // Send superhuman rapid tap with timestamp 5ms apart
        await api.recordTap({ forcedTimestamp: Date.now() - 5 });
        setSimLog({ type: 'error', message: 'Tap succeeded (Try repeating rapidly)' });
      } else if (testType === 'robotic') {
        // Trigger server bot cadence flag
        await api.recordTap({ isSimulatedBot: true });
        setSimLog({ type: 'success', message: 'Tap succeeded (Unexpected)' });
      } else if (testType === 'replay') {
        // Send duplicate static expired nonce
        await api.recordTap({ forcedNonce: 'invalid_expired_duplicate_nonce_test' });
        setSimLog({ type: 'success', message: 'Tap succeeded (Unexpected)' });
      }
    } catch (err: any) {
      setSimLog({
        type: 'blocked',
        message: `🛡️ Backend Blocked Request: ${err.message}`,
      });
      triggerHaptic('error');
    } finally {
      setSimulating(false);
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
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md">
              <UserIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">My Account</h3>
              <p className="text-xs text-slate-400">Profile, security & anti-fraud status</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {/* Identity & Status Card */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">TapPoints User ID</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-base font-bold text-emerald-400">{user.id}</span>
                  <button
                    onClick={handleCopyId}
                    className="p-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 transition text-xs flex items-center gap-1 cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* Status Badge */}
              <div className="text-right">
                <span className="text-[11px] text-slate-400 block font-medium">Account Status</span>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold mt-0.5 border ${
                    user.status === 'active'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : user.status === 'frozen'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  }`}
                >
                  {user.status === 'active' ? (
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <ShieldAlert className="w-3 h-3 text-rose-400" />
                  )}
                  <span className="capitalize">{user.status}</span>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-850 text-xs">
              <div className="flex items-center gap-1.5 text-slate-400">
                <Mail className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{user.email}</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-400">
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                <span>Joined {new Date(user.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Edit Profile Form */}
          <form onSubmit={handleSaveProfile} className="space-y-3 bg-slate-800/60 p-4 rounded-xl border border-slate-700/60">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Personal Information
            </h4>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Display Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Default UPI ID (For Fast Withdrawals)</label>
              <input
                type="text"
                value={upiId}
                placeholder="yourname@bank"
                onChange={(e) => setUpiId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            {saveSuccess && (
              <p className="text-xs text-emerald-400 font-semibold">Profile updated successfully!</p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="py-2 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>

          {/* Anti-Fraud & Anti-Bot Defense Test Lab */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
              <Bug className="w-4 h-4" />
              <span>Anti-Fraud & Anti-Bot Test Suite</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Test and verify that the server-side anti-cheat engine actively catches and blocks automated bots, replay attacks, and superhuman clicking.
            </p>

            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                onClick={() => runAntiFraudTest('robotic')}
                disabled={simulating}
                className="p-2 bg-slate-850 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-lg text-[11px] font-semibold text-center transition cursor-pointer"
              >
                🤖 Test Autoclicker
              </button>
              <button
                type="button"
                onClick={() => runAntiFraudTest('rapid')}
                disabled={simulating}
                className="p-2 bg-slate-850 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-lg text-[11px] font-semibold text-center transition cursor-pointer"
              >
                ⚡ Test Rapid Burst
              </button>
              <button
                type="button"
                onClick={() => runAntiFraudTest('replay')}
                disabled={simulating}
                className="p-2 bg-slate-850 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-lg text-[11px] font-semibold text-center transition cursor-pointer"
              >
                🔁 Test Replay Nonce
              </button>
            </div>

            {simLog && (
              <div
                className={`p-2.5 rounded-lg text-xs font-mono mt-2 border ${
                  simLog.type === 'blocked'
                    ? 'bg-rose-950/60 border-rose-600/40 text-rose-300'
                    : 'bg-emerald-950/60 border-emerald-600/40 text-emerald-300'
                }`}
              >
                {simLog.message}
              </div>
            )}
          </div>

          {/* Account Actions */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenAuth();
              }}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Switch User Account</span>
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
