'use client';

import React from 'react';
import { PlaymatTheme } from '../types/card';

interface PlaymatBackgroundProps {
  theme?: PlaymatTheme;
}

export const PlaymatBackground: React.FC<PlaymatBackgroundProps> = () => {
  return (
    <div className="absolute inset-0 pointer-events-none bg-[#090a0f] overflow-hidden">
      {/* Subtle Studio Grid Dots */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.18) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }}
      />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[760px] h-[520px] bg-amber-500/[0.04] rounded-full blur-[140px]" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/25 to-black/85" />
    </div>
  );
};
