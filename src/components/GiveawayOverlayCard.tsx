'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Droplets, Flame, Crown } from 'lucide-react';
import {
  CardRarity,
  DEFAULT_OVERLAY_DISPLAY_SETTINGS,
  GiveawayItem,
  OverlayDisplaySettings,
} from '../types/card';
import { RarityRing } from './RarityRing';

export const DEFAULT_GIVEAWAY_IMAGE = '/images/pokemon-energy-front.png';

export const TIER_VISUALS: Record<
  CardRarity,
  {
    shortLabel: string;
    badgeBorder: string;
    dotClass: string;
    iconColor: string;
    pillClass: string;
    titleBorder: string;
    cutoutDropShadow: string;
  }
> = {
  rare: {
    shortLabel: 'RARE',
    badgeBorder:
      'border-sky-300/60 shadow-[0_10px_28px_rgba(0,0,0,0.88),0_0_18px_rgba(56,189,248,0.3)]',
    dotClass: 'bg-sky-400 shadow-[0_0_8px_#38bdf8]',
    iconColor: 'text-sky-300',
    pillClass: 'bg-sky-400/20 text-sky-200 border border-sky-300/35',
    titleBorder: 'border-sky-300/40',
    cutoutDropShadow:
      'drop-shadow(0 16px 26px rgba(0,0,0,0.82)) drop-shadow(0 0 22px rgba(56,189,248,0.52))',
  },
  epic: {
    shortLabel: 'EPIC',
    badgeBorder:
      'border-fuchsia-400/65 shadow-[0_10px_28px_rgba(0,0,0,0.88),0_0_20px_rgba(236,72,153,0.36)]',
    dotClass: 'bg-pink-400 shadow-[0_0_8px_#f472b6]',
    iconColor: 'text-pink-300',
    pillClass:
      'bg-gradient-to-r from-fuchsia-500/30 to-orange-400/30 text-pink-100 border border-pink-300/40',
    titleBorder: 'border-fuchsia-400/45',
    cutoutDropShadow:
      'drop-shadow(0 16px 26px rgba(0,0,0,0.82)) drop-shadow(0 0 24px rgba(236,72,153,0.58))',
  },
  legendary: {
    shortLabel: 'LEGENDARY',
    badgeBorder:
      'border-amber-300/75 shadow-[0_10px_30px_rgba(0,0,0,0.9),0_0_24px_rgba(250,204,21,0.42)]',
    dotClass: 'bg-amber-300 shadow-[0_0_10px_#fde047]',
    iconColor: 'text-amber-300',
    pillClass: 'bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 text-black font-black',
    titleBorder: 'border-amber-300/60',
    cutoutDropShadow:
      'drop-shadow(0 16px 28px rgba(0,0,0,0.85)) drop-shadow(0 0 26px rgba(250,204,21,0.62))',
  },
};

interface GiveawayOverlayCardProps {
  item: GiveawayItem | null;
  rarity: CardRarity;
  slotIndex: number; // 0-based index inside its tier
  settings: OverlayDisplaySettings;
  /** Override width (e.g. scaled down inside Studio live preview monitor) */
  widthOverridePx?: number;
}

export const GiveawayOverlayCard: React.FC<GiveawayOverlayCardProps> = ({
  item,
  rarity,
  slotIndex,
  settings: rawSettings,
  widthOverridePx,
}) => {
  const settings = { ...DEFAULT_OVERLAY_DISPLAY_SETTINGS, ...rawSettings };
  const cardW = widthOverridePx ?? settings.cardWidthPx ?? 300;
  const isCutout = settings.frameStyle === 'cutout';
  const transparentFill = settings.transparentCardFill ?? true;

  const bleed = isCutout ? 10 : Math.max(14, Math.round(cardW * 0.082));
  const outerSafePad = Math.max(16, Math.round(bleed * 0.9));
  const compactScale = cardW < 210;

  const tierMeta = TIER_VISUALS[rarity];
  const resolvedImage =
    item?.imageUrl && !item.imageUrl.startsWith('idb:')
      ? item.imageUrl
      : DEFAULT_GIVEAWAY_IMAGE;

  const showHeader = settings.showHeaderBadge !== false;
  const badgeText = (settings.badgeLabel || 'NÄCHSTES GIVEAWAY').trim();
  const titleText = item?.title?.trim() || '';

  return (
    <AnimatePresence mode="wait">
      {settings.visible && item ? (
        <motion.div
          key={`${rarity}:${item.id}:${settings.frameStyle}`}
          initial={{ opacity: 0, scale: 0.92, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: -8 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          className="giveaway-float-card inline-flex flex-col items-center select-none"
          style={{
            padding: outerSafePad,
            background: 'transparent',
          }}
        >
          {/* Optional Top Broadcast Header Badge */}
          {showHeader && badgeText.length > 0 && (
            <div
              className={`inline-flex items-center gap-2 rounded-full bg-zinc-950/95 backdrop-blur-md border ${
                tierMeta.badgeBorder
              } ${compactScale ? 'px-2.5 py-1 text-[10px]' : 'px-3.5 py-1.5 text-xs'}`}
              style={{ marginBottom: isCutout ? 12 : bleed + (compactScale ? 8 : 11) }}
            >
              <span className={`w-2 h-2 rounded-full animate-pulse shrink-0 ${tierMeta.dotClass}`} />
              {rarity === 'legendary' ? (
                <Crown
                  className={`${compactScale ? 'w-3 h-3' : 'w-3.5 h-3.5'} shrink-0 ${tierMeta.iconColor}`}
                />
              ) : rarity === 'epic' ? (
                <Flame
                  className={`${compactScale ? 'w-3 h-3' : 'w-3.5 h-3.5'} shrink-0 ${tierMeta.iconColor}`}
                />
              ) : (
                <Droplets
                  className={`${compactScale ? 'w-3 h-3' : 'w-3.5 h-3.5'} shrink-0 ${tierMeta.iconColor}`}
                />
              )}

              <span className="font-black uppercase tracking-wider text-white whitespace-nowrap">
                {badgeText}
              </span>

              {settings.showTierBadge && (
                <span
                  className={`rounded-full uppercase tracking-wider leading-none ${
                    compactScale ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]'
                  } font-extrabold ${tierMeta.pillClass}`}
                >
                  {tierMeta.shortLabel}
                </span>
              )}

              {settings.showSlotNumber && slotIndex >= 0 && (
                <span
                  className={`font-black text-slate-300 ${
                    compactScale ? 'text-[9px]' : 'text-[11px]'
                  }`}
                >
                  #{slotIndex + 1}
                </span>
              )}
            </div>
          )}

          {/* Booster / Card Visual */}
          {isCutout ? (
            /* Pure Cutout Mode: zero rectangular frame — ideal for Booster Packs & Slabs */
            <div
              className="relative flex items-center justify-center"
              style={{
                width: `${cardW}px`,
                background: 'transparent',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
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
            </div>
          ) : (
            /* Framed Mode: Animated RarityRing hugs the Booster / Card proportions tightly */
            <div
              className="relative"
              style={{
                width: `${cardW}px`,
                background: 'transparent',
              }}
            >
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

                {/* Glass reflection sweep only when solid backing is active so transparent areas stay 100% clear */}
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

          {/* Optional Prize Title Pill below the Booster / Card */}
          {titleText && (
            <div
              className={`rounded-2xl bg-zinc-950/95 backdrop-blur-md border ${
                tierMeta.titleBorder
              } shadow-[0_10px_28px_rgba(0,0,0,0.9)] text-center ${
                compactScale ? 'px-3 py-1.5 max-w-[220px]' : 'px-4 py-2 max-w-[340px]'
              }`}
              style={{ marginTop: isCutout ? 12 : bleed + (compactScale ? 8 : 11) }}
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
