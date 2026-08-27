import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  X,
  Smartphone,
  Download,
  CheckCircle2,
  Copy,
  Sparkles,
  HelpCircle,
  Package,
  Layers,
  Zap,
  Github,
} from 'lucide-react';
import { triggerHaptic } from '../utils/audio.js';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InstallAppModal({ isOpen, onClose }: InstallAppModalProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [activeTab, setActiveTab] = useState<'github_apk' | 'direct_install'>('github_apk');
  const [copiedUrl, setCopiedUrl] = useState(false);

  const currentUrl = typeof window !== 'undefined' ? window.location.origin : '';

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert(
        'Android Phone par install karne ke liye Chrome browser me upar 3 dots (⋮) dabayein aur "Install app" ya "Add to Home screen" select karein!'
      );
      return;
    }

    triggerHaptic('medium');
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
    }
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopiedUrl(true);
    triggerHaptic('light');
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="w-full max-w-md bg-slate-950 border border-emerald-500/30 rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl relative my-auto max-h-[92vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/20 font-bold">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-1.5">
                <span>Native Android APK & AAB</span>
                <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-1.5 py-0.5 rounded font-mono font-bold">
                  Capacitor
                </span>
              </h2>
              <p className="text-xs text-slate-400">Pure Android phone download guide (No PC required)</p>
            </div>
          </div>

          <button
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex p-1 bg-slate-900 rounded-xl border border-slate-800 gap-1">
          <button
            onClick={() => setActiveTab('github_apk')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'github_apk'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Github className="w-3.5 h-3.5" />
            <span>GitHub APK / AAB</span>
          </button>
          <button
            onClick={() => setActiveTab('direct_install')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'direct_install'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Direct Phone App</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto space-y-4 pr-1 text-xs">
          {/* TAB 1: GITHUB ACTIONS CLOUD APK & AAB BUILD */}
          {activeTab === 'github_apk' && (
            <div className="space-y-3.5">
              <div className="p-4 bg-gradient-to-br from-emerald-950/60 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                    <Package className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-xs">Native Android Build Configured</h3>
                    <p className="text-[10px] text-emerald-400">Capacitor native Android project is ready</p>
                  </div>
                </div>

                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Aapke project ke andar <strong>Capacitor Android Core</strong> aur <strong>GitHub Actions automated builder</strong> configure ho chuka hai.
                </p>

                <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
                  <div className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Android Phone se APK / AAB kaise download karein:</span>
                  </div>
                  <ol className="space-y-2 text-slate-300 text-[11px] list-decimal list-inside pl-0.5">
                    <li>
                      Upar Settings menu se app ko apne <strong>GitHub repository</strong> me Export / Push karein.
                    </li>
                    <li>
                      Apne phone ke browser me GitHub repo open karein aur <strong>"Actions"</strong> tab par tap karein.
                    </li>
                    <li>
                      <strong>"Build Native Android APK and AAB"</strong> workflow par tap karein.
                    </li>
                    <li>
                      Workflow complete hone ke baad niche <strong>Artifacts</strong> section me:
                      <div className="mt-1 pl-4 space-y-1 text-[10px] font-mono text-emerald-300">
                        <div>📦 <strong>TapPoints-APK</strong> (Direct phone installable .apk)</div>
                        <div>📦 <strong>TapPoints-AAB</strong> (Google Play Store bundle .aab)</div>
                      </div>
                    </li>
                    <li>
                      Apne phone par tap karke download karein aur install karein!
                    </li>
                  </ol>
                </div>
              </div>

              {/* Technical Specifications */}
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1 text-[11px]">
                <div className="font-bold text-slate-200 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Configured Capacitor Specs:</span>
                </div>
                <div className="text-slate-300 grid grid-cols-2 gap-1 text-[10px] pt-1 font-mono">
                  <div>Package: <strong>com.tappoints.rewards</strong></div>
                  <div>App Name: <strong>TapPoints</strong></div>
                  <div>WebDir: <strong>dist</strong></div>
                  <div>Platform: <strong>Android (Gradle)</strong></div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DIRECT 1-TAP INSTALLATION */}
          {activeTab === 'direct_install' && (
            <div className="space-y-3.5">
              <div className="p-4 bg-gradient-to-br from-emerald-950/60 to-slate-900 border border-emerald-500/30 rounded-2xl space-y-3 text-center">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 mx-auto flex items-center justify-center text-emerald-400">
                  <Zap className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Direct Mobile Installation</h3>
                  <p className="text-[11px] text-slate-300 mt-1">
                    Bina kisi PC ya file transfer ke seedhe apne Android phone par app icon add karein.
                  </p>
                </div>

                {isInstalled ? (
                  <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 font-bold flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>App is already installed on your phone!</span>
                  </div>
                ) : (
                  <button
                    onClick={handleInstallClick}
                    className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-sm rounded-xl shadow-lg shadow-emerald-500/20 cursor-pointer flex items-center justify-center gap-2 transition active:scale-98"
                  >
                    <Download className="w-4 h-4" />
                    <span>Install TapPoints on Android</span>
                  </button>
                )}
              </div>

              {/* Step by step guide */}
              <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl space-y-2">
                <h4 className="font-bold text-white flex items-center gap-1.5 text-xs">
                  <HelpCircle className="w-4 h-4 text-emerald-400" />
                  <span>Manual Mobile Chrome Steps:</span>
                </h4>
                <ol className="space-y-1.5 text-slate-300 text-[11px] list-decimal list-inside pl-1">
                  <li>Apne phone ke <strong>Google Chrome</strong> browser me is app ko open karein.</li>
                  <li>Upar right corner me <strong>3 dots (⋮)</strong> menu dabayein.</li>
                  <li><strong>"Install app"</strong> ya <strong>"Add to Home screen"</strong> par click karein.</li>
                  <li>Aapke phone ke Home Screen par TapPoints ka native icon install ho jayega.</li>
                </ol>
              </div>
            </div>
          )}

          {/* Copy Current App URL */}
          <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-400">App URL:</span>
              <button
                onClick={handleCopyUrl}
                className="text-emerald-400 hover:text-emerald-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
              >
                {copiedUrl ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copiedUrl ? 'Copied!' : 'Copy Link'}</span>
              </button>
            </div>
            <div className="p-2 bg-slate-950 rounded-lg border border-slate-850 font-mono text-[10px] text-slate-300 truncate select-all">
              {currentUrl}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 pt-3 flex justify-end">
          <button
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}
