'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
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
        className="relative group cursor-pointer w-[280px] sm:w-[320px] md:w-[360px] rounded-[24px] border-2 border-dashed border-cyan-500/50 hover:border-cyan-400 bg-black/60 hover:bg-black/75 p-6 flex flex-col items-center justify-center text-center shadow-2xl hover:shadow-[0_0_40px_rgba(6,182,212,0.3)] transition-all active:scale-[0.98] overflow-hidden"
        style={{
          aspectRatio: '5 / 7',
        }}
      >
        {/* ManaCards background subtle preview */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30 group-hover:opacity-45 transition-opacity"
          style={{ backgroundImage: `url(/images/manacards.jpg)` }}
        />
        <div className="absolute inset-0 bg-black/50" />

        {/* Plus Button in Center */}
        <div className="relative z-10 w-16 h-16 rounded-2xl bg-cyan-500/20 border-2 border-cyan-400/60 flex items-center justify-center text-cyan-300 mb-4 group-hover:scale-110 group-hover:border-cyan-300 group-hover:text-white transition-all shadow-xl shadow-cyan-500/20">
          <Plus className="w-8 h-8" />
        </div>

        <div className="relative z-10 space-y-1.5">
          <h3 className="text-xl font-black text-white group-hover:text-cyan-200 transition-colors">
            Karten erstellen
          </h3>
          <p className="text-xs text-slate-300 max-w-[220px]">
            Tippe hier, um festzulegen wie viele Karten erstellt werden sollen
          </p>
        </div>
      </motion.div>
    </div>
  );
};
