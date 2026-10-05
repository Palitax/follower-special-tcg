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
        className="relative group cursor-pointer w-[260px] sm:w-[300px] md:w-[340px] rounded-[22px] border-2 border-dashed border-cyan-400/50 hover:border-cyan-300 bg-black/60 hover:bg-black/75 p-6 flex flex-col items-center justify-center text-center shadow-2xl hover:shadow-[0_0_40px_rgba(6,182,212,0.35)] transition-all active:scale-[0.98] overflow-hidden"
        style={{
          aspectRatio: '660 / 920',
        }}
      >
        {/* Pokémon Energy Card Background Preview */}
        <div
          className="absolute inset-0 bg-no-repeat bg-center opacity-40 group-hover:opacity-60 transition-opacity"
          style={{
            backgroundImage: `url(/images/pokemon-energy-front.png)`,
            backgroundSize: '100% 100%',
          }}
        />
        <div className="absolute inset-0 bg-black/40" />

        {/* Plus Button in Center */}
        <div className="relative z-10 w-16 h-16 rounded-2xl bg-cyan-500/20 border-2 border-cyan-400/60 flex items-center justify-center text-cyan-300 mb-4 group-hover:scale-110 group-hover:border-cyan-300 group-hover:text-white transition-all shadow-xl shadow-cyan-500/20 backdrop-blur-sm">
          <Plus className="w-8 h-8" />
        </div>

        <div className="relative z-10 space-y-1.5">
          <h3 className="text-xl font-black text-white group-hover:text-cyan-200 transition-colors drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
            Karten erstellen
          </h3>
          <p className="text-xs text-slate-300 max-w-[220px] drop-shadow">
            Tippe hier, um festzulegen wie viele Karten erstellt werden sollen
          </p>
        </div>
      </motion.div>
    </div>
  );
};
