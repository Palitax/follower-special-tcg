'use client';

import React, { useState, useEffect } from 'react';
import { Droplets, Flame, Crown, Layers, Check, X } from 'lucide-react';
import { CardRarity } from '../types/card';
import { sound } from '../utils/sound';

interface TierSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCounts: Record<CardRarity, number>;
  hasExistingUploads: boolean;
  onConfirm: (counts: Record<CardRarity, number>, clearExistingUploads: boolean) => void;
}

const TIER_ROWS: {
  id: CardRarity;
  label: string;
  sublabel: string;
  accentText: string;
  accentBorder: string;
  accentBg: string;
  presets: number[];
}[] = [
  {
    id: 'rare',
    label: 'Rare',
    sublabel: 'Stufe 1 · Wasser-Blau',
    accentText: 'text-sky-300',
    accentBorder: 'border-sky-400/40',
    accentBg: 'bg-sky-500/10',
    presets: [10, 15, 20, 30, 40, 50],
  },
  {
    id: 'epic',
    label: 'Epic',
    sublabel: 'Stufe 2 · Magenta-Flamme',
    accentText: 'text-pink-300',
    accentBorder: 'border-fuchsia-400/40',
    accentBg: 'bg-fuchsia-500/10',
    presets: [5, 10, 15, 20, 25, 30],
  },
  {
    id: 'legendary',
    label: 'Legendary',
    sublabel: 'Stufe 3 · Gold',
    accentText: 'text-amber-300',
    accentBorder: 'border-amber-400/45',
    accentBg: 'bg-amber-500/10',
    presets: [1, 3, 5, 10, 15, 20],
  },
];

export const TierSetupModal: React.FC<TierSetupModalProps> = ({
  isOpen,
  onClose,
  currentCounts,
  hasExistingUploads,
  onConfirm,
}) => {
  const [counts, setCounts] = useState<Record<CardRarity, number>>({
    rare: currentCounts.rare || 30,
    epic: currentCounts.epic || 15,
    legendary: currentCounts.legendary || 10,
  });
  const [clearUploads, setClearUploads] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCounts({
        rare: currentCounts.rare > 0 ? currentCounts.rare : 30,
        epic: currentCounts.epic > 0 ? currentCounts.epic : 15,
        legendary: currentCounts.legendary > 0 ? currentCounts.legendary : 10,
      });
      setClearUploads(false);
    }
  }, [isOpen, currentCounts]);

  if (!isOpen) return null;

  const updateTierCount = (tier: CardRarity, next: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(next)));
    setCounts((prev) => ({ ...prev, [tier]: clamped }));
  };

  const totalCount = counts.rare + counts.epic + counts.legendary;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg bg-stone-900 border border-white/15 rounded-3xl shadow-2xl p-6 space-y-5">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Schließen"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-400/15 border border-amber-400/35 text-amber-300 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white">Giveaway-Stufen konfigurieren</h3>
            <p className="text-xs text-slate-400">
              Lege für jede Stufe unabhängig fest, wie viele Giveaways du vorbereiten möchtest.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {TIER_ROWS.map((row) => {
            const val = counts[row.id];
            return (
              <div
                key={row.id}
                className={`rounded-2xl p-3.5 border ${row.accentBorder} ${row.accentBg} space-y-2.5`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {row.id === 'legendary' ? (
                      <Crown className={`w-4 h-4 ${row.accentText}`} />
                    ) : row.id === 'epic' ? (
                      <Flame className={`w-4 h-4 ${row.accentText}`} />
                    ) : (
                      <Droplets className={`w-4 h-4 ${row.accentText}`} />
                    )}
                    <div>
                      <span className={`font-black text-sm ${row.accentText}`}>{row.label}</span>
                      <span className="block text-[11px] text-slate-400">{row.sublabel}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        sound.playCounter(false);
                        updateTierCount(row.id, val - 1);
                      }}
                      className="w-8 h-8 rounded-xl bg-black/50 hover:bg-white/15 border border-white/10 text-white font-black text-base flex items-center justify-center active:scale-90 transition-all"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={val}
                      onChange={(e) => {
                        const parsed = parseInt(e.target.value, 10);
                        updateTierCount(row.id, Number.isNaN(parsed) ? 0 : parsed);
                      }}
                      className="w-16 h-9 text-center rounded-xl bg-black/70 border border-white/20 text-white font-black text-base focus:outline-none focus:border-amber-400"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        sound.playCounter(true);
                        updateTierCount(row.id, val + 1);
                      }}
                      className="w-8 h-8 rounded-xl bg-black/50 hover:bg-white/15 border border-white/10 text-white font-black text-base flex items-center justify-center active:scale-90 transition-all"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {row.presets.map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => {
                        sound.playClick(620);
                        updateTierCount(row.id, num);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all active:scale-95 ${
                        val === num
                          ? 'bg-white text-black font-extrabold shadow-sm'
                          : 'bg-black/45 text-slate-300 hover:bg-black/70 border border-white/10'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {hasExistingUploads && (
          <label className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 cursor-pointer text-xs text-slate-300 hover:bg-white/10 transition-colors">
            <input
              type="checkbox"
              checked={clearUploads}
              onChange={(e) => setClearUploads(e.target.checked)}
              className="w-4 h-4 rounded accent-rose-500 cursor-pointer"
            />
            <span>
              Bisher hochgeladene Gewinn-Bilder & Titel verwerfen (komplett neu starten)
            </span>
          </label>
        )}

        <button
          type="button"
          disabled={totalCount === 0}
          onClick={() => {
            sound.playShimmer();
            onConfirm(counts, clearUploads);
            onClose();
          }}
          className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 disabled:opacity-40 text-black font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-amber-500/20 active:scale-[0.99] transition-all"
        >
          <Check className="w-4 h-4" />
          <span>
            Stufen speichern ({counts.rare} Rare · {counts.epic} Epic · {counts.legendary} Legendary)
          </span>
        </button>
      </div>
    </div>
  );
};
