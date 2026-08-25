import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, Flame, ShieldAlert, Sparkles } from 'lucide-react';
import { playTapSound, triggerHaptic } from '../utils/audio.js';
import { AccountStatus } from '../types.js';

interface FloatingParticle {
  id: number;
  x: number;
  y: number;
  text: string;
}

interface TapButtonProps {
  onTap: () => Promise<void>;
  disabled: boolean;
  disabledReason?: string;
  accountStatus?: AccountStatus;
  pointsPerTap?: number;
  dailyLimitReached: boolean;
  isTappingActive: boolean;
}

export const TapButton: React.FC<TapButtonProps> = ({
  onTap,
  disabled,
  disabledReason,
  accountStatus,
  pointsPerTap = 10,
  dailyLimitReached,
  isTappingActive,
}) => {
  const [particles, setParticles] = useState<FloatingParticle[]>([]);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const [combo, setCombo] = useState(0);
  const [isPressing, setIsPressing] = useState(false);
  const comboTimerRef = useRef<NodeJS.Timeout | null>(null);
  const particleIdRef = useRef(0);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Clear combo timer on unmount
  useEffect(() => {
    return () => {
      if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
    };
  }, []);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement> | React.TouchEvent<HTMLButtonElement>) => {
    if (disabled || dailyLimitReached || accountStatus === 'frozen') {
      triggerHaptic('error');
      return;
    }

    // Determine click position for ripple & particle
    const rect = buttonRef.current?.getBoundingClientRect();
    let clientX = rect ? rect.left + rect.width / 2 : 0;
    let clientY = rect ? rect.top + rect.height / 2 : 0;

    if ('clientX' in e && e.clientX) {
      clientX = e.clientX;
      clientY = e.clientY;
    } else if ('touches' in e && e.touches[0]) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    }

    const relX = rect ? clientX - rect.left : 120;
    const relY = rect ? clientY - rect.top : 120;

    // Trigger audio & haptics
    const newCombo = combo + 1;
    setCombo(newCombo);
    playTapSound(1 + Math.min(0.6, newCombo * 0.05));
    triggerHaptic('light');

    // Reset combo after 1.8 seconds of silence
    if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
    comboTimerRef.current = setTimeout(() => {
      setCombo(0);
    }, 1800);

    // Spawn floating particle
    const id = ++particleIdRef.current;
    const offsetX = (Math.random() - 0.5) * 40;
    setParticles((prev) => [
      ...prev.slice(-12),
      { id, x: relX + offsetX, y: relY - 10, text: `+${pointsPerTap} PTS` },
    ]);

    // Spawn ripple
    setRipples((prev) => [...prev.slice(-4), { id, x: relX, y: relY }]);

    // Execute tap action
    onTap();
  };

  const removeParticle = (id: number) => {
    setParticles((prev) => prev.filter((p) => p.id !== id));
  };

  const removeRipple = (id: number) => {
    setRipples((prev) => prev.filter((r) => r.id !== id));
  };

  const isFrozen = accountStatus === 'frozen';

  return (
    <div className="relative flex flex-col items-center justify-center py-6 select-none">
      {/* Combo Counter Badge */}
      <div className="h-8 mb-2 flex items-center justify-center">
        <AnimatePresence>
          {combo > 2 && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-black uppercase tracking-wider rounded-full shadow-lg shadow-orange-500/30"
            >
              <Flame className="w-3.5 h-3.5 animate-pulse" />
              <span>{combo}x Streak!</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main 3D Tap Button */}
      <div className="relative">
        {/* Outer Glow Halo */}
        <motion.div
          animate={{
            scale: isTappingActive ? [1, 1.06, 1] : 1,
            opacity: disabled ? 0.2 : [0.4, 0.7, 0.4],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className={`absolute -inset-4 rounded-full blur-xl pointer-events-none ${
            isFrozen
              ? 'bg-rose-500/40'
              : dailyLimitReached
              ? 'bg-slate-500/30'
              : 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500'
          }`}
        />

        {/* Pulse Rings */}
        <motion.div
          animate={!disabled && !dailyLimitReached ? { scale: [1, 1.25], opacity: [0.6, 0] } : {}}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
          className="absolute -inset-2 rounded-full border-2 border-emerald-400/40 pointer-events-none"
        />

        <motion.button
          ref={buttonRef}
          id="main-tap-earn-button"
          onClick={handleClick}
          onMouseDown={() => setIsPressing(true)}
          onMouseUp={() => setIsPressing(false)}
          onTouchStart={() => setIsPressing(true)}
          onTouchEnd={() => setIsPressing(false)}
          disabled={disabled || dailyLimitReached || isFrozen}
          whileHover={{ scale: disabled ? 1 : 1.03 }}
          whileTap={{ scale: disabled ? 1 : 0.94 }}
          className={`relative w-48 h-48 sm:w-56 sm:h-56 rounded-full flex flex-col items-center justify-center p-4 text-center cursor-pointer transition-all duration-150 shadow-2xl overflow-hidden ${
            isFrozen
              ? 'bg-gradient-to-b from-rose-600 to-rose-900 border-4 border-rose-400 text-white shadow-rose-900/50'
              : dailyLimitReached
              ? 'bg-gradient-to-b from-slate-700 to-slate-900 border-4 border-slate-600 text-slate-400 shadow-slate-900/50 cursor-not-allowed'
              : 'bg-gradient-to-b from-emerald-500 via-teal-600 to-emerald-800 border-4 border-emerald-300/80 text-white shadow-emerald-950/60 active:shadow-inner'
          }`}
        >
          {/* Subtle 3D Top Highlight */}
          <div className="absolute top-2 left-8 right-8 h-12 bg-white/20 rounded-full blur-[2px] pointer-events-none" />

          {/* Ripples */}
          {ripples.map((ripple) => (
            <motion.span
              key={ripple.id}
              initial={{ scale: 0, opacity: 0.8 }}
              animate={{ scale: 3, opacity: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              onAnimationComplete={() => removeRipple(ripple.id)}
              className="absolute w-20 h-20 rounded-full bg-white/40 pointer-events-none"
              style={{
                left: ripple.x - 40,
                top: ripple.y - 40,
              }}
            />
          ))}

          {/* Floating Particles */}
          {particles.map((particle) => (
            <motion.div
              key={particle.id}
              initial={{ opacity: 1, y: 0, scale: 0.8 }}
              animate={{ opacity: 0, y: -60, scale: 1.25 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              onAnimationComplete={() => removeParticle(particle.id)}
              className="absolute pointer-events-none z-30 font-black text-amber-200 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] text-base whitespace-nowrap"
              style={{
                left: particle.x,
                top: particle.y,
              }}
            >
              {particle.text}
            </motion.div>
          ))}

          {/* Icon and Main Labels */}
          {isFrozen ? (
            <div className="flex flex-col items-center gap-1">
              <ShieldAlert className="w-10 h-10 text-rose-200" />
              <span className="text-sm font-bold uppercase tracking-wider">Account Frozen</span>
              <span className="text-[11px] text-rose-200">Security flag active</span>
            </div>
          ) : dailyLimitReached ? (
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs uppercase tracking-wider text-slate-300 font-bold">Daily Limit Reached</span>
              <span className="text-[11px] text-slate-400">Resets at midnight</span>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-1">
              <motion.div
                animate={isPressing ? { rotate: [0, -10, 10, 0] } : {}}
                className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-inner mb-0.5"
              >
                <Zap className="w-7 h-7 text-amber-300 fill-amber-300 drop-shadow" />
              </motion.div>
              <span className="text-xl sm:text-2xl font-black tracking-wider uppercase drop-shadow-md">
                TAP & EARN
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-100 bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-400/30">
                <Sparkles className="w-3 h-3 text-amber-300" />
                +{pointsPerTap} Points / Tap
              </span>
            </div>
          )}
        </motion.button>
      </div>

      {/* Helper text or warning message */}
      <div className="mt-4 text-center">
        {disabledReason && (
          <p className="text-xs text-amber-400 font-medium bg-amber-950/40 px-3 py-1 rounded-full border border-amber-500/30 inline-block">
            {disabledReason}
          </p>
        )}
        {!disabledReason && !disabled && !dailyLimitReached && (
          <p className="text-xs text-slate-400">
            Manual tap only • 100 Points = ₹10 • Instant server credit
          </p>
        )}
      </div>
    </div>
  );
};
