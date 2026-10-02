'use client';

import React from 'react';
import { PlaymatTheme } from '../types/card';

interface PlaymatBackgroundProps {
  theme: PlaymatTheme;
}

export const PlaymatBackground: React.FC<PlaymatBackgroundProps> = ({ theme }) => {
  switch (theme) {
    case 'felt-green':
      return (
        <div className="absolute inset-0 pointer-events-none bg-[#0a2e1d] overflow-hidden">
          {/* Felt Texture Pattern */}
          <div
            className="absolute inset-0 opacity-40 mix-blend-overlay"
            style={{
              backgroundImage: `radial-gradient(#14532d 1px, transparent 1px), radial-gradient(#052e16 1px, transparent 1px)`,
              backgroundSize: '24px 24px',
              backgroundPosition: '0 0, 12px 12px',
            }}
          />
          {/* Playmat Stitched Edge simulation */}
          <div className="absolute inset-3 sm:inset-6 rounded-3xl border-2 border-dashed border-emerald-500/30 shadow-[inset_0_0_80px_rgba(0,0,0,0.6)]" />
          <div className="absolute inset-0 bg-radial-gradient from-emerald-500/10 via-transparent to-black/80" />
        </div>
      );

    case 'cyber-neon':
      return (
        <div className="absolute inset-0 pointer-events-none bg-[#070b19] overflow-hidden">
          {/* Animated Neon Grid */}
          <div
            className="absolute inset-0 opacity-25"
            style={{
              backgroundImage: `
                linear-gradient(to right, rgba(6, 182, 212, 0.3) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(236, 72, 153, 0.3) 1px, transparent 1px)
              `,
              backgroundSize: '40px 40px',
            }}
          />
          {/* Glowing Ambience */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-cyan-500/15 blur-[120px] animate-pulse-subtle" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-pink-500/15 blur-[120px] animate-pulse-subtle" />
          <div className="absolute inset-0 bg-radial-gradient from-transparent via-black/40 to-black/90" />
        </div>
      );

    case 'mystic-violet':
      return (
        <div className="absolute inset-0 pointer-events-none bg-[#090314] overflow-hidden">
          {/* Cosmic Nebula Glows */}
          <div className="absolute top-0 right-1/3 w-[500px] h-[500px] rounded-full bg-purple-600/20 blur-[140px]" />
          <div className="absolute bottom-0 left-1/3 w-[500px] h-[500px] rounded-full bg-indigo-600/20 blur-[140px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-fuchsia-600/10 blur-[160px]" />
          {/* Subtle stars */}
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: `radial-gradient(1px 1px at 20px 30px, #ffffff, rgba(0,0,0,0)),
                                radial-gradient(1.5px 1.5px at 60px 90px, #e879f9, rgba(0,0,0,0)),
                                radial-gradient(1px 1px at 120px 50px, #67e8f9, rgba(0,0,0,0))`,
              backgroundSize: '150px 150px',
            }}
          />
          <div className="absolute inset-0 bg-radial-gradient from-transparent to-black/85" />
        </div>
      );

    case 'wood-mahogany':
      return (
        <div className="absolute inset-0 pointer-events-none bg-[#1c0d08] overflow-hidden">
          {/* Wood Grain Gradient */}
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: `repeating-linear-gradient(90deg, #2b140c, #2b140c 4px, #1f0e08 4px, #1f0e08 8px)`,
            }}
          />
          <div className="absolute inset-0 bg-radial-gradient from-amber-500/10 via-black/40 to-black/90" />
        </div>
      );

    case 'dark-carbon':
    default:
      return (
        <div className="absolute inset-0 pointer-events-none bg-[#0a0a0f] overflow-hidden">
          {/* Carbon Fiber / Modern Minimal Dots */}
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.2) 1px, transparent 1px)`,
              backgroundSize: '20px 20px',
            }}
          />
          {/* Subtle center spotlight */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-amber-500/5 rounded-full blur-[140px]" />
          <div className="absolute inset-0 bg-radial-gradient from-transparent via-black/30 to-black/95" />
        </div>
      );
  }
};
