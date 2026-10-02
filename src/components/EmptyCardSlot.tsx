'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Plus, Sparkles, Layers } from 'lucide-react';
import { sound } from '../utils/sound';

interface EmptyCardSlotProps {
  onClick: () => void;
}

export const EmptyCardSlot: React.FC<EmptyCardSlotProps> = ({ onClick }) => {
  return (
    <div className="flex flex-col items-center justify-center p-4 select-none">
      <motion.div
        animate={{
          y: [-5, 5, -5],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        onClick={() => {
          sound.playClick(600);
          onClick();
        }}
        className="relative group cursor-pointer w-[280px] sm:w-[320px] md:w-[360px] rounded-[24px] border-2 border-dashed border-amber-500/50 hover:border-yellow-400 bg-black/40 hover:bg-black/60 p-6 flex flex-col items-center justify-center text-center shadow-2xl hover:shadow-[0_0_40px_rgba(245,158,11,0.25)] transition-all active:scale-[0.98]"
        style={{
          aspectRatio: '5 / 7',
        }}
      >
        {/* Subtle glowing center badge */}
        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500/20 to-yellow-400/20 border border-yellow-400/40 flex items-center justify-center text-yellow-400 mb-4 group-hover:scale-110 group-hover:border-yellow-400 transition-all shadow-lg">
          <Plus className="w-8 h-8" />
        </div>

        <div className="space-y-1.5 z-10">
          <h3 className="text-xl font-black text-white group-hover:text-yellow-300 transition-colors">
            Karten erstellen
          </h3>
          <p className="text-xs text-slate-400 max-w-[220px]">
            Tippe hier, um festzulegen wie viele Karten auf dem Screen angezeigt werden sollen
          </p>
        </div>

        {/* Ambient pulse effect */}
        <div className="absolute inset-0 rounded-[24px] bg-yellow-400/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      </motion.div>
    </div>
  );
};
