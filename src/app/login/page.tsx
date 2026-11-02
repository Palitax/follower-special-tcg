'use client';

import React, { useState } from 'react';
import { motion, useAnimationControls } from 'framer-motion';
import { User, Lock, Eye, EyeOff, ArrowRight, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';
import { PlaymatBackground } from '../../components/PlaymatBackground';

// Three fanned card backs as brand emblem – each glowing in its rarity tier colour
const EMBLEM_CARDS = [
  { rotate: -14, x: -34, y: 6, glow: 'rgba(56,189,248,0.75)', ring: 'rgba(125,211,252,0.95)' }, // Rare
  { rotate: 14, x: 34, y: 6, glow: 'rgba(168,85,247,0.75)', ring: 'rgba(216,180,254,0.95)' }, // Epic
  { rotate: 0, x: 0, y: -6, glow: 'rgba(250,204,21,0.85)', ring: 'rgba(253,230,138,1)' }, // Legendary
];

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shake = useAnimationControls();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    if (!username.trim() || !password) {
      setError('Bitte Benutzername und Passwort eingeben.');
      shake.start({ x: [0, -10, 10, -6, 6, 0], transition: { duration: 0.4 } });
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setError(data.error || 'Anmeldung fehlgeschlagen.');
        setPassword('');
        shake.start({ x: [0, -10, 10, -6, 6, 0], transition: { duration: 0.4 } });
        setIsLoading(false);
        return;
      }
      // Only allow internal redirect targets
      const next = new URLSearchParams(window.location.search).get('next');
      const target = next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
      window.location.replace(target);
    } catch {
      setError('Verbindungsfehler – bitte erneut versuchen.');
      setIsLoading(false);
    }
  };

  return (
    <main className="studio-shell relative w-screen h-screen overflow-hidden flex items-center justify-center bg-black text-white select-none">
      <PlaymatBackground theme="dark-carbon" />

      {/* Soft tri-colour ambience hinting at the three rarity tiers */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[18%] left-[22%] w-[380px] h-[380px] rounded-full bg-cyan-500/10 blur-[120px]" />
        <div className="absolute top-[22%] right-[20%] w-[380px] h-[380px] rounded-full bg-purple-600/15 blur-[120px]" />
        <div className="absolute bottom-[12%] left-1/2 -translate-x-1/2 w-[460px] h-[320px] rounded-full bg-amber-400/10 blur-[130px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
        className="relative z-10 w-full max-w-[380px] px-4"
      >
        {/* Emblem: fanned rarity cards */}
        <div className="relative h-[132px] flex items-end justify-center mb-5" aria-hidden>
          {EMBLEM_CARDS.map((c, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 24, rotate: 0, x: 0 }}
              animate={{ opacity: 1, y: c.y, rotate: c.rotate, x: c.x }}
              transition={{ delay: 0.15 + i * 0.08, duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
              className="absolute bottom-0 w-[78px] rounded-[7px] overflow-hidden bg-white"
              style={{
                aspectRatio: '63 / 88',
                border: `2px solid ${c.ring}`,
                boxShadow: `0 0 18px ${c.glow}, 0 10px 24px rgba(0,0,0,0.6)`,
                zIndex: i === 2 ? 3 : 1,
              }}
            >
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: 'url(/images/card-back-water.jpg)' }}
              />
            </motion.div>
          ))}
        </div>

        <motion.div
          animate={shake}
          className="relative rounded-3xl bg-stone-900/85 backdrop-blur-xl border border-white/15 shadow-[0_30px_80px_rgba(0,0,0,0.75)] p-6 sm:p-7"
        >
          {/* Thin gold hairline on top edge */}
          <div className="absolute top-0 inset-x-10 h-px bg-gradient-to-r from-transparent via-amber-300/60 to-transparent" />

          <div className="text-center mb-6 space-y-1">
            <h1 className="text-2xl font-black tracking-tight text-white">ManaCards</h1>
            <p className="text-xs font-semibold text-slate-400">Follower Special · Giveaway Overlay Regie</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
            <label className="block space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Benutzername</span>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <input
                  type="text"
                  name="username"
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  autoFocus
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Benutzername eingeben"
                  className="w-full h-11 pl-10 pr-3 rounded-xl bg-black/50 border border-white/10 text-sm font-semibold text-white placeholder:text-slate-600 focus:outline-none focus:border-yellow-400/70 focus:ring-2 focus:ring-yellow-400/20 transition-all"
                />
              </div>
            </label>

            <label className="block space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Passwort</span>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="••••••••••"
                  className="w-full h-11 pl-10 pr-11 rounded-xl bg-black/50 border border-white/10 text-sm font-semibold text-white placeholder:text-slate-600 focus:outline-none focus:border-yellow-400/70 focus:ring-2 focus:ring-yellow-400/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 rounded-lg text-slate-500 hover:text-slate-200 transition-colors"
                  aria-label={showPassword ? 'Passwort verbergen' : 'Passwort anzeigen'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </label>

            {/* Error message (reserved height prevents layout jump) */}
            <div className="min-h-[20px]" aria-live="polite">
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-1.5 text-xs font-semibold text-rose-400"
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {error}
                </motion.p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="group w-full h-11 rounded-xl bg-yellow-400 hover:bg-yellow-300 disabled:bg-yellow-400/60 text-black font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-yellow-400/15 active:scale-[0.98] transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Anmelden…</span>
                </>
              ) : (
                <>
                  <span>Anmelden</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>
        </motion.div>

        <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] font-medium text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5" />
          Geschützter Bereich
        </p>
      </motion.div>
    </main>
  );
}
