'use client';

import React, { useState } from 'react';
import { sound } from '../utils/sound';
import confetti from 'canvas-confetti';
import {
  Dices,
  CircleDot,
  PartyPopper,
  X,
  Sparkles,
} from 'lucide-react';

interface DiceCoinToolProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DiceCoinTool: React.FC<DiceCoinToolProps> = ({ isOpen, onClose }) => {
  const [diceResult, setDiceResult] = useState<number | null>(null);
  const [diceType, setDiceType] = useState<6 | 20>(6);
  const [isRolling, setIsRolling] = useState(false);

  const [coinResult, setCoinResult] = useState<'KOPF' | 'ZAHL' | null>(null);
  const [isFlippingCoin, setIsFlippingCoin] = useState(false);

  if (!isOpen) return null;

  const rollDice = (sides: 6 | 20) => {
    setDiceType(sides);
    setIsRolling(true);
    sound.playDiceRoll();

    let counter = 0;
    const interval = setInterval(() => {
      setDiceResult(Math.floor(Math.random() * sides) + 1);
      counter++;
      if (counter > 8) {
        clearInterval(interval);
        const final = Math.floor(Math.random() * sides) + 1;
        setDiceResult(final);
        setIsRolling(false);
        sound.playClick(900, 0.08);
      }
    }, 50);
  };

  const flipCoin = () => {
    setIsFlippingCoin(true);
    sound.playDiceRoll();

    let counter = 0;
    const interval = setInterval(() => {
      setCoinResult(Math.random() > 0.5 ? 'KOPF' : 'ZAHL');
      counter++;
      if (counter > 8) {
        clearInterval(interval);
        const final = Math.random() > 0.5 ? 'KOPF' : 'ZAHL';
        setCoinResult(final);
        setIsFlippingCoin(false);
        sound.playClick(1000, 0.08);
      }
    }, 60);
  };

  const triggerConfetti = () => {
    sound.playShimmer();
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#fbbf24', '#f59e0b', '#ec4899', '#06b6d4', '#10b981', '#8b5cf6'],
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-stone-900 border border-white/20 rounded-2xl shadow-2xl overflow-hidden p-5 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Dices className="w-5 h-5 text-yellow-400" />
            <h3 className="font-bold text-white text-base">TCG Game Tools</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dice Section */}
        <div className="bg-black/40 rounded-xl p-3.5 border border-white/10 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-300">Würfel werfen</span>
            <div className="flex gap-2">
              <button
                onClick={() => rollDice(6)}
                disabled={isRolling}
                className="px-2.5 py-1 rounded-lg bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 font-bold text-xs hover:bg-yellow-500/30 active:scale-95"
              >
                D6 (W6)
              </button>
              <button
                onClick={() => rollDice(20)}
                disabled={isRolling}
                className="px-2.5 py-1 rounded-lg bg-purple-500/20 border border-purple-500/40 text-purple-300 font-bold text-xs hover:bg-purple-500/30 active:scale-95"
              >
                D20 (W20)
              </button>
            </div>
          </div>

          <div className="h-16 flex items-center justify-center bg-white/5 rounded-lg border border-white/5">
            {diceResult !== null ? (
              <span className={`text-3xl font-black ${isRolling ? 'text-yellow-400 animate-bounce' : 'text-white'}`}>
                🎲 {diceResult} <span className="text-xs font-normal text-slate-400">(W{diceType})</span>
              </span>
            ) : (
              <span className="text-xs text-slate-500">Wähle D6 oder D20 zum Würfeln</span>
            )}
          </div>
        </div>

        {/* Coin Flip Section */}
        <div className="bg-black/40 rounded-xl p-3.5 border border-white/10 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-300">Münzwurf (Coin Flip)</span>
            <button
              onClick={flipCoin}
              disabled={isFlippingCoin}
              className="px-3 py-1 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-bold text-xs hover:bg-cyan-500/30 active:scale-95"
            >
              🪙 Münze werfen
            </button>
          </div>

          <div className="h-16 flex items-center justify-center bg-white/5 rounded-lg border border-white/5">
            {coinResult !== null ? (
              <span className={`text-2xl font-black ${isFlippingCoin ? 'text-cyan-400 animate-spin' : 'text-yellow-400'}`}>
                {coinResult === 'KOPF' ? '🪙 KOPF (Heads)' : '⚡ ZAHL (Tails)'}
              </span>
            ) : (
              <span className="text-xs text-slate-500">Tippe auf Münze werfen</span>
            )}
          </div>
        </div>

        {/* Confetti Celebration */}
        <div>
          <button
            onClick={triggerConfetti}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-pink-600 via-purple-600 to-amber-500 hover:from-pink-500 hover:to-amber-400 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25 active:scale-95 transition-all"
          >
            <PartyPopper className="w-4 h-4" />
            <span>🎉 Follower-Feier Konfetti zünden!</span>
          </button>
        </div>
      </div>
    </div>
  );
};
