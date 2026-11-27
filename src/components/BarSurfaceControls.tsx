'use client';

import React from 'react';
import { BarBackgroundPattern } from '../types/broadcastBars';
import { BAR_PATTERN_OPTIONS, PatternPreviewThumb } from './BarBackgroundPattern';
import { sound } from '../utils/sound';

interface BarSurfaceControlsProps {
  bgOpacityPct: number;
  bgPattern: BarBackgroundPattern;
  patternOpacityPct: number;
  onChangeBgOpacity: (val: number) => void;
  onChangePattern: (val: BarBackgroundPattern) => void;
  onChangePatternOpacity: (val: number) => void;
}

/**
 * Shared Studio surface & texture controls for both Horizontal Ticker and Social Rotator:
 * - Background opacity (0% invisible / transparent up to 100% solid)
 * - Background pattern selector with live visual preview swatches
 * - Independent pattern opacity slider (decoupled from background opacity)
 */
export const BarSurfaceControls: React.FC<BarSurfaceControlsProps> = ({
  bgOpacityPct,
  bgPattern,
  patternOpacityPct,
  onChangeBgOpacity,
  onChangePattern,
  onChangePatternOpacity,
}) => {
  return (
    <div className="p-3 border border-white/12 bg-black/35 space-y-3.5">
      <div className="flex items-center justify-between gap-2">
        <div>
          <span className="block text-[11px] font-black uppercase tracking-[0.14em] text-white">
            Hintergrund &amp; Muster-Look
          </span>
          <span className="block text-[11px] text-slate-400">
            Transparenz und Muster lassen sich komplett unabhängig voneinander regeln.
          </span>
        </div>
      </div>

      {/* Independent Opacity Sliders */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Background Opacity */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-300">Hintergrund-Deckkraft</span>
            <span className="font-black text-sky-300">
              {bgOpacityPct === 0 ? '0% (Unsichtbar)' : `${bgOpacityPct}%`}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={2}
            value={bgOpacityPct}
            onChange={(e) => onChangeBgOpacity(Number(e.target.value))}
            className="w-full cursor-pointer"
          />
          <div className="flex flex-wrap gap-1">
            {[
              { v: 0, label: 'Aus (0%)' },
              { v: 40, label: 'Glas (40%)' },
              { v: 72, label: 'Rauch (72%)' },
              { v: 96, label: 'Voll (96%)' },
            ].map((p) => (
              <button
                key={p.v}
                type="button"
                onClick={() => {
                  sound.playClick(620);
                  onChangeBgOpacity(p.v);
                }}
                className={`px-2 py-0.5 border text-[10px] font-bold transition-colors ${
                  Math.abs(bgOpacityPct - p.v) <= 2
                    ? 'bg-sky-400/20 border-sky-400/60 text-sky-200'
                    : 'bg-black/45 border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Independent Pattern Opacity */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-300">Muster-Sichtbarkeit</span>
            <span className="font-black text-[#FFE406]">
              {bgPattern === 'none' || patternOpacityPct === 0
                ? 'Aus (0%)'
                : `${patternOpacityPct}%`}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={2}
            disabled={bgPattern === 'none'}
            value={patternOpacityPct}
            onChange={(e) => onChangePatternOpacity(Number(e.target.value))}
            className="w-full cursor-pointer disabled:opacity-35"
          />
          <div className="flex flex-wrap gap-1">
            {[
              { v: 0, label: '0%' },
              { v: 30, label: 'Dezent (30%)' },
              { v: 60, label: 'Mittel (60%)' },
              { v: 100, label: 'Stark (100%)' },
            ].map((p) => (
              <button
                key={p.v}
                type="button"
                disabled={bgPattern === 'none'}
                onClick={() => {
                  sound.playClick(640);
                  onChangePatternOpacity(p.v);
                }}
                className={`px-2 py-0.5 border text-[10px] font-bold transition-colors disabled:opacity-35 ${
                  bgPattern !== 'none' && Math.abs(patternOpacityPct - p.v) <= 2
                    ? 'bg-[#FFE406]/20 border-[#FFE406]/65 text-[#FFE406]'
                    : 'bg-black/45 border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Pattern Swatch Grid */}
      <div className="space-y-1.5">
        <span className="block text-[10.5px] font-bold uppercase tracking-[0.12em] text-slate-400">
          Muster-Stil wählen
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5">
          {BAR_PATTERN_OPTIONS.map((opt) => {
            const active = bgPattern === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                title={opt.desc}
                onClick={() => {
                  sound.playClick(660);
                  onChangePattern(opt.id);
                }}
                className={`p-1.5 border text-left space-y-1 transition-colors ${
                  active
                    ? 'bg-sky-400/15 border-sky-400/70 text-white'
                    : 'bg-black/45 border-white/10 text-slate-300 hover:border-white/25'
                }`}
              >
                <PatternPreviewThumb pattern={opt.id} />
                <div className="text-[10.5px] font-extrabold leading-tight truncate">
                  {opt.label}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
