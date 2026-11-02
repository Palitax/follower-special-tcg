'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Droplets, Flame, Crown } from 'lucide-react';
import {
  CardRarity,
  DEFAULT_OVERLAY_DISPLAY_SETTINGS,
  GiveawayItem,
  LevelUpEvent,
  OverlayDisplaySettings,
  TierProgressStats,
} from '../types/card';
import { RarityRing } from './RarityRing';

export const DEFAULT_GIVEAWAY_IMAGE = '/images/pokemon-energy-front.png';

const RING_THICKNESS: Record<CardRarity, number> = {
  rare: 0.22,
  epic: 0.26,
  legendary: 0.3,
};

export interface LiquidTierTheme {
  shortLabel: string;
  levelUpHeadline: string;
  levelUpKicker: string;
  titleBorder: string;
  cutoutDropShadow: string;
  tubeBorderClass: string;
  tubeGlowShadow: string;
  liquidGradient: string;
  waveFrontColor: string;
  waveBackColor: string;
  meniscusGlow: string;
  bubbleGradient: string;
  iconColorClass: string;
  counterAccentClass: string;
  bannerBorderClass: string;
  bannerGlowShadow: string;
  bannerHeadlineGradient: string;
  bannerSubPillClass: string;
  shockwaveBorderColor: string;
  auraRadialGradient: string;
  dropletGradient: string;
}

export const TIER_VISUALS: Record<CardRarity, LiquidTierTheme> = {
  rare: {
    shortLabel: 'RARE',
    levelUpHeadline: 'RARE GIVEAWAYS!',
    levelUpKicker: 'STUFE 1 AKTIV',
    titleBorder: 'border-sky-300/45',
    cutoutDropShadow:
      'drop-shadow(0 16px 26px rgba(0,0,0,0.82)) drop-shadow(0 0 22px rgba(56,189,248,0.52))',
    tubeBorderClass: 'border-sky-300/65',
    tubeGlowShadow:
      '0 14px 28px rgba(0,0,0,0.82), 0 0 18px rgba(56,189,248,0.42), inset 0 0 12px rgba(56,189,248,0.18)',
    liquidGradient:
      'linear-gradient(180deg, #7dd3fc 0%, #38bdf8 18%, #0284c7 60%, #1e3a8a 100%)',
    waveFrontColor: '#7dd3fc',
    waveBackColor: '#0284c7',
    meniscusGlow: '0 -4px 14px rgba(125, 211, 252, 0.85)',
    bubbleGradient:
      'radial-gradient(circle at 32% 30%, #ffffff 0%, #bae6fd 45%, rgba(56,189,248,0.2) 100%)',
    iconColorClass: 'text-sky-300 drop-shadow-[0_0_6px_rgba(56,189,248,0.85)]',
    counterAccentClass: 'text-sky-200',
    bannerBorderClass: 'border-sky-300/80',
    bannerGlowShadow:
      '0 20px 44px rgba(0,0,0,0.92), 0 0 34px rgba(56,189,248,0.62)',
    bannerHeadlineGradient:
      'bg-gradient-to-b from-white via-sky-200 to-sky-400',
    bannerSubPillClass:
      'bg-sky-500/25 border-sky-300/50 text-sky-100',
    shockwaveBorderColor: 'rgba(125, 211, 252, 0.85)',
    auraRadialGradient:
      'radial-gradient(circle, rgba(56,189,248,0.52) 0%, rgba(2,132,199,0.22) 48%, rgba(0,0,0,0) 74%)',
    dropletGradient:
      'radial-gradient(circle at 32% 28%, #ffffff 0%, #7dd3fc 42%, #0284c7 100%)',
  },
  epic: {
    shortLabel: 'EPIC',
    levelUpHeadline: 'EPIC GIVEAWAYS!',
    levelUpKicker: 'LEVEL UP · STUFE 2',
    titleBorder: 'border-purple-400/55',
    cutoutDropShadow:
      'drop-shadow(0 16px 26px rgba(0,0,0,0.84)) drop-shadow(0 0 24px rgba(168,85,247,0.62))',
    tubeBorderClass: 'border-purple-300/70',
    tubeGlowShadow:
      '0 14px 28px rgba(0,0,0,0.84), 0 0 20px rgba(168,85,247,0.52), inset 0 0 12px rgba(192,132,252,0.22)',
    liquidGradient:
      'linear-gradient(180deg, #e879f9 0%, #c084fc 18%, #9333ea 58%, #4c1d95 100%)',
    waveFrontColor: '#e879f9',
    waveBackColor: '#9333ea',
    meniscusGlow: '0 -4px 16px rgba(232, 121, 249, 0.88)',
    bubbleGradient:
      'radial-gradient(circle at 32% 30%, #ffffff 0%, #f5d0fe 45%, rgba(168,85,247,0.25) 100%)',
    iconColorClass: 'text-purple-300 drop-shadow-[0_0_7px_rgba(192,132,252,0.9)]',
    counterAccentClass: 'text-purple-200',
    bannerBorderClass: 'border-purple-300/85',
    bannerGlowShadow:
      '0 22px 48px rgba(0,0,0,0.94), 0 0 38px rgba(168,85,247,0.75)',
    bannerHeadlineGradient:
      'bg-gradient-to-b from-white via-fuchsia-200 to-purple-400',
    bannerSubPillClass:
      'bg-purple-500/30 border-purple-300/55 text-purple-100',
    shockwaveBorderColor: 'rgba(216, 180, 254, 0.9)',
    auraRadialGradient:
      'radial-gradient(circle, rgba(168,85,247,0.62) 0%, rgba(126,34,206,0.28) 48%, rgba(0,0,0,0) 74%)',
    dropletGradient:
      'radial-gradient(circle at 32% 28%, #ffffff 0%, #e879f9 42%, #7e22ce 100%)',
  },
  legendary: {
    shortLabel: 'LEGENDARY',
    levelUpHeadline: 'LEGENDARY GIVEAWAYS!',
    levelUpKicker: 'MAX LEVEL · FINALE STUFE',
    titleBorder: 'border-amber-300/65',
    cutoutDropShadow:
      'drop-shadow(0 16px 28px rgba(0,0,0,0.86)) drop-shadow(0 0 26px rgba(250,204,21,0.66))',
    tubeBorderClass: 'border-amber-300/80',
    tubeGlowShadow:
      '0 14px 30px rgba(0,0,0,0.86), 0 0 22px rgba(250,204,21,0.58), inset 0 0 14px rgba(253,224,71,0.25)',
    liquidGradient:
      'linear-gradient(180deg, #fde047 0%, #facc15 18%, #eab308 56%, #92400e 100%)',
    waveFrontColor: '#fde047',
    waveBackColor: '#d97706',
    meniscusGlow: '0 -4px 16px rgba(253, 224, 71, 0.9)',
    bubbleGradient:
      'radial-gradient(circle at 32% 30%, #ffffff 0%, #fef08a 45%, rgba(234,179,8,0.25) 100%)',
    iconColorClass: 'text-amber-300 drop-shadow-[0_0_8px_rgba(250,204,21,0.95)]',
    counterAccentClass: 'text-amber-200',
    bannerBorderClass: 'border-amber-200/90',
    bannerGlowShadow:
      '0 22px 50px rgba(0,0,0,0.95), 0 0 42px rgba(250,204,21,0.82)',
    bannerHeadlineGradient:
      'bg-gradient-to-b from-white via-amber-200 to-amber-400',
    bannerSubPillClass:
      'bg-amber-400/25 border-amber-300/65 text-amber-100',
    shockwaveBorderColor: 'rgba(253, 224, 71, 0.92)',
    auraRadialGradient:
      'radial-gradient(circle, rgba(250,204,21,0.66) 0%, rgba(217,119,6,0.3) 48%, rgba(0,0,0,0) 74%)',
    dropletGradient:
      'radial-gradient(circle at 32% 28%, #ffffff 0%, #fde047 42%, #ca8a04 100%)',
  },
};

const BUBBLE_SPECS = [
  { left: '22%', size: 4, dur: '2.9s', delay: '0s' },
  { left: '62%', size: 5, dur: '3.6s', delay: '0.8s' },
  { left: '40%', size: 3.5, dur: '2.5s', delay: '1.5s' },
  { left: '72%', size: 4.5, dur: '3.9s', delay: '2.1s' },
  { left: '28%', size: 3, dur: '3.2s', delay: '1.1s' },
];

const SPLASH_DROPLETS = [
  { angleDeg: -155, distFactor: 0.56, size: 11, delay: 0.02 },
  { angleDeg: -130, distFactor: 0.66, size: 14, delay: 0.06 },
  { angleDeg: -102, distFactor: 0.62, size: 10, delay: 0.1 },
  { angleDeg: -75, distFactor: 0.65, size: 13, delay: 0.04 },
  { angleDeg: -48, distFactor: 0.62, size: 11, delay: 0.09 },
  { angleDeg: -22, distFactor: 0.56, size: 9, delay: 0.13 },
  { angleDeg: 18, distFactor: 0.54, size: 10, delay: 0.07 },
  { angleDeg: 46, distFactor: 0.6, size: 12, delay: 0.03 },
  { angleDeg: 78, distFactor: 0.58, size: 9, delay: 0.12 },
  { angleDeg: 108, distFactor: 0.6, size: 12, delay: 0.05 },
  { angleDeg: 138, distFactor: 0.62, size: 10, delay: 0.11 },
  { angleDeg: 166, distFactor: 0.54, size: 9, delay: 0.08 },
];

function TierCrestIcon({
  rarity,
  className,
}: {
  rarity: CardRarity;
  className?: string;
}) {
  if (rarity === 'legendary') return <Crown className={className} />;
  if (rarity === 'epic') return <Flame className={className} />;
  return <Droplets className={className} />;
}

interface VerticalLiquidMeterProps {
  rarity: CardRarity;
  completed: number;
  total: number;
  tubeWidthPx: number;
  overcharging: boolean;
  compactScale: boolean;
}

const VerticalLiquidMeter: React.FC<VerticalLiquidMeterProps> = ({
  rarity,
  completed,
  total,
  tubeWidthPx,
  overcharging,
  compactScale,
}) => {
  const progressLabelId = useId();
  const safeTotal = Math.max(1, total);
  const clampedCompleted = Math.max(0, Math.min(safeTotal, completed));
  const fillPct = total > 0 ? (clampedCompleted / safeTotal) * 100 : 0;

  const theme = TIER_VISUALS[rarity];
  const prevCompletedRef = useRef<number>(clampedCompleted);
  const [stepPulse, setStepPulse] = useState(false);

  useEffect(() => {
    if (clampedCompleted > prevCompletedRef.current) {
      setStepPulse(true);
      const t = setTimeout(() => setStepPulse(false), 700);
      prevCompletedRef.current = clampedCompleted;
      return () => clearTimeout(t);
    }
    prevCompletedRef.current = clampedCompleted;
  }, [clampedCompleted]);

  // Subdivision calibration ticks: 1-to-1 segments up to 50 giveaways (e.g. 30 Rare, 15 Epic, 10 Legendary)
  const tickStep = safeTotal > 50 ? 2 : 1;
  const segmentIndices: number[] = [];
  for (let i = tickStep; i < safeTotal; i += tickStep) {
    segmentIndices.push(i);
  }

  return (
    <div
      className="relative self-stretch shrink-0 flex flex-col items-center justify-center select-none"
      style={{
        width: `${tubeWidthPx}px`,
      }}
    >
      {/* Accessible semantic <progress> element (screen-reader announcements, no tabindex/inner text) */}
      <span id={progressLabelId} className="sr-only">
        {theme.shortLabel} Giveaways verlost
      </span>
      <progress
        value={clampedCompleted}
        max={safeTotal}
        aria-labelledby={progressLabelId}
        className="sr-only"
      />

      {/* Smoked-Glass Liquid Capsule — exactly 5% smaller top and bottom than the displayed element (height: 90%, centered) */}
      <div
        className={`relative w-full rounded-full border ${theme.tubeBorderClass} bg-zinc-950/88 backdrop-blur-md`}
        style={{
          height: '90%',
          overflow: 'clip',
          boxShadow: overcharging
            ? `${theme.tubeGlowShadow}, 0 0 28px rgba(255,255,255,0.85)`
            : theme.tubeGlowShadow,
        }}
      >
        {/* Subtle vertical empty-track depth */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(180deg, rgba(15,23,42,0.72) 0%, rgba(5,7,14,0.92) 100%)',
          }}
        />

        {/* Rising Liquid Column (Bottom -> Top) */}
        <div
          className="liquid-fill-column absolute inset-x-0 bottom-0 pointer-events-none"
          style={{
            height: `${fillPct}%`,
            background: theme.liquidGradient,
            boxShadow:
              fillPct > 0
                ? stepPulse || overcharging
                  ? `${theme.meniscusGlow}, 0 -2px 22px rgba(255,255,255,0.9)`
                  : theme.meniscusGlow
                : 'none',
            filter: overcharging ? 'brightness(1.28) saturate(1.18)' : 'none',
          }}
        >
          {/* Seamless Animated Dual-Wave Liquid Meniscus at the Surface (curved specular crest, zero flat seam) */}
          {fillPct > 0 && fillPct < 99.6 && (
            <div className="absolute inset-x-0 -top-[9px] h-[11px] overflow-hidden pointer-events-none">
              <svg
                viewBox="0 0 120 12"
                preserveAspectRatio="none"
                className="liquid-wave-back absolute top-[1px] left-0 w-[200%] h-full opacity-75"
              >
                <path
                  d="M0,6 Q15,1 30,6 T60,6 T90,6 T120,6 L120,12 L0,12 Z"
                  fill={theme.waveBackColor}
                />
              </svg>
              <svg
                viewBox="0 0 120 12"
                preserveAspectRatio="none"
                className="liquid-wave-front absolute top-0 left-0 w-[200%] h-full"
              >
                <path
                  d="M0,6 Q15,10.5 30,6 T60,6 T90,6 T120,6 L120,12 L0,12 Z"
                  fill={theme.waveFrontColor}
                />
                <path
                  d="M0,6 Q15,10.5 30,6 T60,6 T90,6 T120,6"
                  fill="none"
                  stroke="rgba(255,255,255,0.88)"
                  strokeWidth="1.5"
                />
              </svg>
            </div>
          )}

          {/* Internal Liquid Shimmer Current */}
          {fillPct > 6 && (
            <div
              className="liquid-current-sheen absolute inset-0 pointer-events-none"
              style={{
                background:
                  'linear-gradient(180deg, rgba(255,255,255,0.26) 0%, transparent 45%, rgba(255,255,255,0.14) 85%, transparent 100%)',
              }}
            />
          )}

          {/* Rising Fluid Micro-Bubbles inside the Liquid */}
          {fillPct > 8 && (
            <div className="absolute inset-x-0 top-0 bottom-2 overflow-hidden pointer-events-none">
              {BUBBLE_SPECS.map((b, idx) => (
                <span
                  key={idx}
                  className="liquid-bubble absolute bottom-1 rounded-full"
                  style={
                    {
                      left: b.left,
                      width: `${compactScale ? Math.max(2.5, b.size - 1) : b.size}px`,
                      height: `${compactScale ? Math.max(2.5, b.size - 1) : b.size}px`,
                      background: theme.bubbleGradient,
                      '--bubble-dur': b.dur,
                      '--bubble-delay': b.delay,
                    } as React.CSSProperties
                  }
                />
              ))}
            </div>
          )}
        </div>

        {/* Exact Subdivision Calibration Chambers (e.g. 30 Rare / 15 Epic / 10 Legendary or custom points) */}
        <div className="absolute inset-0 z-10 pointer-events-none">
          {segmentIndices.map((segIdx) => {
            const pct = (segIdx / safeTotal) * 100;
            const isMajor = safeTotal >= 12 && segIdx % 5 === 0;
            const isFilledBelow = segIdx <= clampedCompleted;
            return (
              <div
                key={segIdx}
                className="absolute inset-x-0 flex items-center justify-between"
                style={{ bottom: `${pct}%`, transform: 'translateY(50%)' }}
              >
                <div
                  className="w-full"
                  style={{
                    marginInline: isMajor ? '0px' : '2px',
                    height: isMajor ? '2px' : '1.25px',
                    background: isMajor
                      ? 'rgba(3, 5, 12, 0.86)'
                      : isFilledBelow
                      ? 'rgba(5, 8, 18, 0.62)'
                      : 'rgba(255, 255, 255, 0.16)',
                    boxShadow: isFilledBelow
                      ? '0 1px 0 rgba(255, 255, 255, 0.28)'
                      : '0 1px 0 rgba(0, 0, 0, 0.65)',
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* 3D Cylindrical Glass Specular Highlight Overlay */}
        <div
          className="absolute inset-0 z-20 pointer-events-none rounded-full"
          style={{
            background:
              'linear-gradient(90deg, rgba(255,255,255,0.26) 0%, rgba(255,255,255,0.06) 26%, rgba(255,255,255,0) 56%, rgba(0,0,0,0.34) 100%)',
          }}
        />
      </div>
    </div>
  );
};

interface LevelUpCelebrationOverlayProps {
  targetRarity: CardRarity;
  newTierTotal: number;
  cardW: number;
  compactScale: boolean;
}

const LevelUpCelebrationOverlay: React.FC<LevelUpCelebrationOverlayProps> = ({
  targetRarity,
  newTierTotal,
  cardW,
  compactScale,
}) => {
  const theme = TIER_VISUALS[targetRarity];
  const spreadBase = Math.max(95, Math.round(cardW * 0.62));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.42, ease: 'easeOut' } }}
      className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none"
    >
      {/* Soft Edge-Safe Liquid Aura */}
      <motion.div
        initial={{ opacity: 0, scale: 0.55 }}
        animate={{ opacity: [0, 1, 0.82, 0.9], scale: [0.55, 1.06, 0.98, 1.02] }}
        transition={{ duration: 1.4, ease: 'easeOut' }}
        className="absolute inset-[-12px] rounded-full pointer-events-none"
        style={{
          background: theme.auraRadialGradient,
          filter: 'blur(8px)',
        }}
      />

      {/* Dual Concentric Liquid Ripple Shockwaves */}
      {[0, 0.22].map((delay, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0.95, scale: 0.32 }}
          animate={{ opacity: 0, scale: 1.18 + idx * 0.14 }}
          transition={{ duration: 1.25, delay, ease: [0.16, 1, 0.3, 1] }}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: `${Math.round(cardW * 0.88)}px`,
            height: `${Math.round(cardW * 0.88)}px`,
            border: `${compactScale ? 2 : 3}px solid ${theme.shockwaveBorderColor}`,
            boxShadow: `0 0 20px ${theme.shockwaveBorderColor}`,
          }}
        />
      ))}

      {/* Splash Ring of Rising Organic Liquid Droplets (Spheres only — zero star/sparkle shapes) */}
      {SPLASH_DROPLETS.map((d, idx) => {
        const rad = (d.angleDeg * Math.PI) / 180;
        const tx = Math.cos(rad) * spreadBase * d.distFactor;
        const ty = Math.sin(rad) * spreadBase * d.distFactor - (compactScale ? 12 : 22);
        const pxSize = compactScale ? Math.max(6, Math.round(d.size * 0.68)) : d.size;
        return (
          <motion.span
            key={idx}
            initial={{ opacity: 0, x: 0, y: 12, scale: 0.3 }}
            animate={{
              opacity: [0, 1, 0.92, 0],
              x: tx,
              y: [12, ty, ty - (compactScale ? 18 : 32)],
              scale: [0.3, 1.12, 0.85],
            }}
            transition={{
              duration: 1.85,
              delay: d.delay,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="absolute rounded-full pointer-events-none"
            style={{
              width: `${pxSize}px`,
              height: `${pxSize}px`,
              background: theme.dropletGradient,
              boxShadow: `0 0 12px ${theme.shockwaveBorderColor}`,
            }}
          />
        );
      })}

      {/* Centerpiece Liquid-Glass Broadcast Banner */}
      <motion.div
        initial={{ opacity: 0, scale: 0.72, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: -10 }}
        transition={{
          type: 'spring',
          stiffness: 340,
          damping: 22,
          mass: 0.85,
        }}
        className={`relative rounded-3xl bg-zinc-950/95 border-2 ${theme.bannerBorderClass} backdrop-blur-xl text-center flex flex-col items-center ${
          compactScale ? 'px-3.5 py-2.5 max-w-[205px]' : 'px-6 py-4 max-w-[325px]'
        }`}
        style={{
          overflow: 'clip',
          boxShadow: theme.bannerGlowShadow,
        }}
      >
        {/* Seamless Sloshing Liquid Fill Backdrop inside the Lower Half of the Level-Up Banner */}
        <div className="absolute inset-x-0 bottom-0 h-[52%] opacity-28 pointer-events-none">
          <div className="absolute inset-x-0 top-0 h-[10px] overflow-hidden">
            <svg
              viewBox="0 0 120 12"
              preserveAspectRatio="none"
              className="liquid-wave-front absolute top-0 left-0 w-[200%] h-full"
            >
              <path
                d="M0,6 Q15,11 30,6 T60,6 T90,6 T120,6 L120,12 L0,12 Z"
                fill={theme.waveFrontColor}
              />
            </svg>
          </div>
          <div
            className="absolute inset-x-0 top-[10px] bottom-0"
            style={{ background: theme.liquidGradient }}
          />
        </div>

        {/* Glowing Liquid Crest Medallion */}
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
          className={`relative z-10 rounded-2xl border border-white/30 flex items-center justify-center mb-1.5 shadow-lg ${
            compactScale ? 'w-8 h-8' : 'w-11 h-11'
          }`}
          style={{ background: theme.liquidGradient }}
        >
          <TierCrestIcon
            rarity={targetRarity}
            className={`${compactScale ? 'w-4 h-4' : 'w-6 h-6'} text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.65)]`}
          />
        </motion.div>

        {/* Level-Up Kicker */}
        <span
          className={`relative z-10 font-black uppercase tracking-[0.18em] text-white/90 ${
            compactScale ? 'text-[8px]' : 'text-[10px]'
          }`}
        >
          {theme.levelUpKicker}
        </span>

        {/* High-Visibility Tier Headline */}
        <p
          className={`relative z-10 font-black uppercase tracking-tight leading-[1.05] bg-clip-text text-transparent ${theme.bannerHeadlineGradient} ${
            compactScale ? 'text-sm mt-0.5' : 'text-xl mt-1'
          }`}
          style={{
            filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.85))',
          }}
        >
          {theme.levelUpHeadline}
        </p>

        {/* Dynamic New Liquid Bar Scale Pill */}
        {newTierTotal > 0 && (
          <div
            className={`relative z-10 mt-2 rounded-full border font-extrabold uppercase tracking-wider ${theme.bannerSubPillClass} ${
              compactScale ? 'px-2 py-0.5 text-[8px]' : 'px-3 py-1 text-[10px]'
            }`}
          >
            {newTierTotal} {theme.shortLabel} GIVEAWAYS AKTIV
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

interface GiveawayOverlayCardProps {
  item: GiveawayItem | null;
  rarity: CardRarity;
  slotIndex: number; // 0-based index inside its tier
  settings: OverlayDisplaySettings;
  tierProgress?: Record<CardRarity, TierProgressStats>;
  levelUpEvent?: LevelUpEvent | null;
  /** Override width (e.g. scaled down inside Studio live preview monitor) */
  widthOverridePx?: number;
}

export const GiveawayOverlayCard: React.FC<GiveawayOverlayCardProps> = ({
  item,
  rarity,
  slotIndex,
  settings: rawSettings,
  tierProgress,
  levelUpEvent,
  widthOverridePx,
}) => {
  const settings = { ...DEFAULT_OVERLAY_DISPLAY_SETTINGS, ...rawSettings };
  const cardW = widthOverridePx ?? settings.cardWidthPx ?? 300;
  const isCutout = settings.frameStyle === 'cutout';
  const transparentFill = settings.transparentCardFill ?? true;
  const showLiquidBar = settings.showLiquidBar !== false;

  const bleed = isCutout ? 10 : Math.max(14, Math.round(cardW * 0.082));
  const ringW = Math.max(2, Math.round(bleed * RING_THICKNESS[rarity]));
  const ringGap = bleed >= 12 ? 2 : 1;
  const ringExtent = isCutout ? 0 : ringW + ringGap;

  // Generous edge-safe padding so neither RarityRing nor Level-Up aura ever clips against OBS bounds
  const outerSafePad = Math.max(24, Math.round(Math.max(bleed, 22) * 1.25));
  const compactScale = cardW < 210;

  const tubeWidthPx = Math.max(22, Math.min(34, Math.round(cardW * 0.1)));
  const barGapPx = isCutout
    ? Math.max(12, Math.round(cardW * 0.048))
    : bleed + Math.max(10, Math.round(cardW * 0.034));

  // Choreography state for Level-Up celebration:
  // 0..650ms -> 'overcharge' (bar shows 100% full in outgoing tier before bursting)
  // 650..4100ms -> 'celebrate' (Level-Up liquid crest + splash + newly scaled bar)
  const lastHandledLevelUpIdRef = useRef<number>(0);
  const [activeCelebration, setActiveCelebration] = useState<{
    event: LevelUpEvent;
    phase: 'overcharge' | 'celebrate';
  } | null>(null);

  useEffect(() => {
    if (!levelUpEvent || !levelUpEvent.id) return;
    if (levelUpEvent.id === lastHandledLevelUpIdRef.current) return;
    // Ignore stale Level-Up events older than 8.5s (e.g. when OBS scene refreshes minutes later)
    if (Date.now() - levelUpEvent.id > 8_500) {
      lastHandledLevelUpIdRef.current = levelUpEvent.id;
      return;
    }

    lastHandledLevelUpIdRef.current = levelUpEvent.id;
    setActiveCelebration({ event: levelUpEvent, phase: 'overcharge' });

    const tCelebrate = setTimeout(() => {
      setActiveCelebration((cur) =>
        cur?.event.id === levelUpEvent.id ? { event: levelUpEvent, phase: 'celebrate' } : cur
      );
    }, 620);

    const tDone = setTimeout(() => {
      setActiveCelebration((cur) => (cur?.event.id === levelUpEvent.id ? null : cur));
    }, 4_150);

    return () => {
      clearTimeout(tCelebrate);
      clearTimeout(tDone);
    };
  }, [levelUpEvent]);

  const isOvercharging = activeCelebration?.phase === 'overcharge';
  const isCelebrating = activeCelebration?.phase === 'celebrate';

  // During the brief 620ms overcharge right on 30/30 completion, show the outgoing tier hitting 100% full!
  const meterRarity: CardRarity =
    isOvercharging && activeCelebration
      ? activeCelebration.event.fromRarity
      : rarity;

  const customTargetPoints = settings.tierBarPoints?.[meterRarity];
  const currentStats = tierProgress?.[meterRarity] ?? { completed: 0, total: 1 };
  const meterTotal = Math.max(
    1,
    customTargetPoints && customTargetPoints > 0 ? customTargetPoints : currentStats.total
  );
  const meterCompleted = isOvercharging ? meterTotal : currentStats.completed;

  const tierMeta = TIER_VISUALS[rarity];
  const resolvedImage =
    item?.imageUrl && !item.imageUrl.startsWith('idb:')
      ? item.imageUrl
      : DEFAULT_GIVEAWAY_IMAGE;
  const titleText = item?.title?.trim() || '';

  return (
    <AnimatePresence mode="wait">
      {settings.visible && item ? (
        <motion.div
          key="giveaway-overlay-root"
          initial={{ opacity: 0, scale: 0.94, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: -8 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          className="giveaway-float-card relative inline-flex flex-col items-center select-none"
          style={{
            padding: outerSafePad,
            background: 'transparent',
          }}
        >
          {/* Main Stage Row: [Full-Height Segmented Liquid Bar] + [Booster / Card Visual] */}
          <div
            className="relative flex items-stretch"
            style={{ gap: showLiquidBar ? `${barGapPx}px` : '0px' }}
          >
            {showLiquidBar && (
              <VerticalLiquidMeter
                rarity={meterRarity}
                completed={meterCompleted}
                total={meterTotal}
                tubeWidthPx={tubeWidthPx}
                overcharging={isOvercharging}
                compactScale={compactScale}
              />
            )}

            {/* Booster / Card Visual */}
            <AnimatePresence mode="wait">
              <motion.div
                key={`${rarity}:${item.id}:${settings.frameStyle}`}
                initial={{ opacity: 0, scale: 0.93, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -6 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="relative flex items-center justify-center"
                style={{
                  width: `${cardW}px`,
                  background: 'transparent',
                }}
              >
                {isCutout ? (
                  /* Pure Cutout Mode: zero rectangular frame — ideal for Booster Packs & Slabs */
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={resolvedImage}
                    alt={titleText || `Giveaway #${slotIndex + 1}`}
                    decoding="async"
                    draggable={false}
                    className={`block w-full ${
                      item.imageFit === 'cover'
                        ? 'aspect-[63/88] object-cover rounded-[14px]'
                        : 'h-auto object-contain'
                    } pointer-events-none`}
                    style={{
                      maxHeight: `${Math.round(cardW * 2.15)}px`,
                      filter: tierMeta.cutoutDropShadow,
                    }}
                  />
                ) : (
                  /* Framed Mode: Animated RarityRing hugs the Booster / Card proportions tightly */
                  <div className="relative w-full" style={{ background: 'transparent' }}>
                    <RarityRing key={rarity} rarity={rarity} bleed={bleed} glow={true} />

                    <div
                      className={`relative w-full rounded-[14px] overflow-hidden flex items-center justify-center ${
                        transparentFill
                          ? 'bg-transparent'
                          : 'bg-zinc-950 shadow-[0_18px_42px_rgba(0,0,0,0.85)]'
                      }`}
                    >
                      {!transparentFill && (
                        <div
                          className="absolute inset-0 pointer-events-none"
                          style={{
                            background:
                              'radial-gradient(circle at 50% 42%, rgba(30, 41, 59, 0.55) 0%, rgba(9, 10, 15, 0.98) 100%)',
                          }}
                        />
                      )}

                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={resolvedImage}
                        alt={titleText || `Giveaway #${slotIndex + 1}`}
                        decoding="async"
                        draggable={false}
                        className={`relative z-10 block w-full ${
                          item.imageFit === 'cover'
                            ? 'aspect-[63/88] object-cover'
                            : 'h-auto object-contain'
                        } pointer-events-none`}
                        style={{
                          maxHeight: `${Math.round(cardW * 2.15)}px`,
                        }}
                      />

                      {!transparentFill && (
                        <div
                          className="overlay-glass-sheen absolute inset-y-0 -left-1/4 w-1/2 z-20 pointer-events-none"
                          style={{
                            background:
                              'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.38) 50%, transparent 100%)',
                          }}
                        />
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Spectacular Liquid Level-Up Celebration Overlay */}
            <AnimatePresence>
              {isCelebrating && activeCelebration && (
                <LevelUpCelebrationOverlay
                  key={activeCelebration.event.id}
                  targetRarity={activeCelebration.event.toRarity}
                  newTierTotal={activeCelebration.event.newTierTotal}
                  cardW={cardW}
                  compactScale={compactScale}
                />
              )}
            </AnimatePresence>
          </div>

          {/* Optional Prize Title Pill below the Booster / Card */}
          {titleText && (
            <div
              className={`rounded-2xl bg-zinc-950/95 backdrop-blur-md border ${
                tierMeta.titleBorder
              } shadow-[0_10px_28px_rgba(0,0,0,0.9)] text-center ${
                compactScale ? 'px-3 py-1.5 max-w-[220px]' : 'px-4 py-2 max-w-[340px]'
              }`}
              style={{
                marginTop: isCutout ? 12 : bleed + (compactScale ? 8 : 11),
                marginLeft: showLiquidBar ? Math.round((tubeWidthPx + barGapPx) * 0.5) : 0,
              }}
            >
              <p
                className={`font-extrabold text-white tracking-tight leading-snug break-words ${
                  compactScale ? 'text-xs' : 'text-sm'
                }`}
              >
                {titleText}
              </p>
            </div>
          )}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};
