'use client';

import React, { useState } from 'react';
import { sound } from '../utils/sound';
import { Layers, Plus, Check, X, Sparkles } from 'lucide-react';

interface CardSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (count: number) => void;
  initialCount?: number;
}

export const CardSetupModal: React.FC<CardSetupModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  initialCount = 2,
}) => {
  const [count, setCount] = useState<number>(initialCount);
  const [inputValue, setInputValue] = useState<string>(initialCount.toString());

  if (!isOpen) return null;

  const handleSelectCount = (num: number) => {
    sound.playClick(600);
    setCount(num);
    setInputValue(num.toString());
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    const num = parseInt(val, 10);
    if (!isNaN(num)) {
      setCount(Math.max(1, Math.min(100, num)));
    }
  };

  const handleConfirm = () => {
    sound.playShimmer();
    const finalCount = Math.max(1, Math.min(100, count));
    onConfirm(finalCount);
    onClose();
  };

  const PRESET_COUNTS = [1, 2, 4, 6, 8, 12, 16, 20, 25, 50, 100];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-stone-900 border border-white/20 rounded-3xl shadow-2xl p-6 space-y-6 text-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-12 h-12 rounded-2xl bg-yellow-400/20 border border-yellow-400/40 text-yellow-400 flex items-center justify-center mx-auto shadow-lg shadow-yellow-400/10">
          <Layers className="w-6 h-6" />
        </div>

        <div className="space-y-1">
          <h3 className="text-xl font-black text-white">Kartenanzahl wählen</h3>
          <p className="text-xs text-slate-400">
            Gib an, wie viele Karten generiert werden sollen (1 bis 100)
          </p>
        </div>

        {/* Large Direct Number Input */}
        <div className="flex flex-col items-center justify-center gap-2">
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => {
                sound.playCounter(false);
                const next = Math.max(1, count - 1);
                setCount(next);
                setInputValue(next.toString());
              }}
              className="w-11 h-11 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-black text-xl flex items-center justify-center active:scale-90 transition-all"
            >
              -
            </button>

            <div className="relative">
              <input
                type="number"
                min={1}
                max={100}
                value={inputValue}
                onChange={handleInputChange}
                onBlur={() => {
                  const num = parseInt(inputValue, 10);
                  const valid = isNaN(num) ? 1 : Math.max(1, Math.min(100, num));
                  setCount(valid);
                  setInputValue(valid.toString());
                }}
                className="w-28 h-14 text-center bg-black/80 border-2 border-yellow-400 rounded-2xl text-3xl font-black text-yellow-300 focus:outline-none focus:ring-4 focus:ring-yellow-400/30"
              />
              <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                Karten (1 - 100)
              </span>
            </div>

            <button
              onClick={() => {
                sound.playCounter(true);
                const next = Math.min(100, count + 1);
                setCount(next);
                setInputValue(next.toString());
              }}
              className="w-11 h-11 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-black text-xl flex items-center justify-center active:scale-90 transition-all"
            >
              +
            </button>
          </div>

          {/* Slider for smooth dragging up to 100 */}
          <div className="w-full px-4 pt-2">
            <input
              type="range"
              min={1}
              max={100}
              value={count}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                setCount(val);
                setInputValue(val.toString());
              }}
              className="w-full h-2 bg-white/15 rounded-lg appearance-none cursor-pointer accent-yellow-400"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-semibold px-1 mt-1">
              <span>1</span>
              <span>25</span>
              <span>50</span>
              <span>75</span>
              <span>100</span>
            </div>
          </div>
        </div>

        {/* Quick Selector Pills */}
        <div className="space-y-1.5 text-left">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Schnellauswahl:
          </span>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {PRESET_COUNTS.map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleSelectCount(num)}
                className={`py-2 px-1 rounded-xl font-bold text-xs transition-all active:scale-95 ${
                  count === num
                    ? 'bg-yellow-400 text-black font-extrabold shadow-md shadow-yellow-400/20 ring-2 ring-yellow-300'
                    : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/15'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleConfirm}
          className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-amber-500/25 active:scale-95 transition-all"
        >
          <Check className="w-5 h-5" />
          <span>{count} {count === 1 ? 'Karte' : 'Karten'} jetzt erstellen</span>
        </button>
      </div>
    </div>
  );
};
