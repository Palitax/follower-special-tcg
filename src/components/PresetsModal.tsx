'use client';

import React from 'react';
import { PRESETS, TcgPreset } from '../data/presets';
import { sound } from '../utils/sound';
import { LayoutGrid, X, Check, Sparkles } from 'lucide-react';

interface PresetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPreset: (preset: TcgPreset) => void;
}

export const PresetsModal: React.FC<PresetsModalProps> = ({
  isOpen,
  onClose,
  onSelectPreset,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-xl bg-stone-900 border border-white/20 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-black/40">
          <div className="flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-bold text-white">TCG Vorlagen & Presets wählen</h2>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Preset Cards List */}
        <div className="p-5 overflow-y-auto space-y-3">
          {PRESETS.map((preset) => (
            <div
              key={preset.id}
              onClick={() => {
                sound.playShimmer();
                onSelectPreset(preset);
                onClose();
              }}
              className="group cursor-pointer p-4 rounded-xl bg-black/40 hover:bg-white/10 border border-white/10 hover:border-purple-400/50 transition-all flex items-center justify-between gap-4 shadow-lg active:scale-[0.99]"
            >
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    {preset.badge}
                  </span>
                  <h4 className="font-extrabold text-white text-base group-hover:text-yellow-300 transition-colors">
                    {preset.name}
                  </h4>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {preset.description}
                </p>
                <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-300">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    Karte 1: {preset.card1.front.title}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    Karte 2: {preset.card2.front.title}
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-white/5 group-hover:bg-purple-600 text-white transition-all">
                <Check className="w-5 h-5" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
