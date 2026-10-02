'use client';

import React, { useState } from 'react';
import { sound } from '../utils/sound';
import { Layers, Plus, Check, X } from 'lucide-react';

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

  if (!isOpen) return null;

  const handleSelectCount = (num: number) => {
    sound.playClick(600);
    setCount(num);
  };

  const handleConfirm = () => {
    sound.playShimmer();
    onConfirm(Math.max(1, Math.min(8, count)));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-sm bg-stone-900 border border-white/20 rounded-3xl shadow-2xl p-6 space-y-6 text-center">
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
          <h3 className="text-lg font-black text-white">Kartenanzahl festlegen</h3>
          <p className="text-xs text-slate-400">
            Wie viele TCG-Karten möchtest du auf dem Bildschirm anzeigen?
          </p>
        </div>

        {/* Quick Selector Pills */}
        <div className="grid grid-cols-4 gap-2.5">
          {[1, 2, 3, 4, 5, 6].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleSelectCount(num)}
              className={`py-3 rounded-2xl font-black text-base transition-all active:scale-95 ${
                count === num
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-black shadow-lg shadow-yellow-500/30 ring-2 ring-yellow-400'
                  : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/15'
              }`}
            >
              {num}
            </button>
          ))}
        </div>

        {/* Custom Input Stepper */}
        <div className="flex items-center justify-center gap-3 pt-1">
          <button
            onClick={() => {
              sound.playCounter(false);
              setCount((prev) => Math.max(1, prev - 1));
            }}
            className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white font-black text-lg flex items-center justify-center active:scale-90"
          >
            -
          </button>
          <span className="font-black text-3xl text-yellow-300 min-w-[50px] text-center">
            {count}
          </span>
          <button
            onClick={() => {
              sound.playCounter(true);
              setCount((prev) => Math.min(8, prev + 1));
            }}
            className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white font-black text-lg flex items-center justify-center active:scale-90"
          >
            +
          </button>
        </div>

        {/* Action Button */}
        <button
          onClick={handleConfirm}
          className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-extrabold text-sm flex items-center justify-center gap-2 shadow-xl shadow-amber-500/25 active:scale-95 transition-all"
        >
          <Check className="w-5 h-5" />
          <span>{count} {count === 1 ? 'Karte' : 'Karten'} erstellen</span>
        </button>
      </div>
    </div>
  );
};
