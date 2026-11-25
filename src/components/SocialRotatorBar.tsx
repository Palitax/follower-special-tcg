'use client';

import React, { useMemo } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  RotatorAnimationPreset,
  RotatorBarSettings,
  RotatorSlide,
} from '../types/broadcastBars';
import { resolveVeinPalette } from './SocialBrandIcons';
import { PlatformBadge } from './WhatnotBars';
import { BranchRune, LogMedallion, ManaWoodPlank, WOOD } from './ManaWoodPlank';
import { useRotatorCycle } from './useRotatorCycle';

interface SocialRotatorBarProps {
  slides: RotatorSlide[];
  settings: RotatorBarSettings;
  previewSlideId?: string | null;
  scale?: number;
}

const EASE_OUT = [0.22, 1, 0.36, 1] as const;
const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const;

const PLANK_SEED = 7331;
const MEDALLION_SEED = 4242;

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

function getTextMotion(preset: RotatorAnimationPreset, reduce: boolean) {
  if (reduce) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: 0.38, ease: EASE_OUT },
      stagger: 0.05,
    };
  }
  switch (preset) {
    case 'wipe':
      return {
        initial: { opacity: 0, y: '70%' },
        animate: { opacity: 1, y: '0%' },
        exit: { opacity: 0, y: '-70%' },
        transition: { duration: 0.44, ease: EASE_IN_OUT },
        stagger: 0.06,
      };
    case 'mana-surge':
      return {
        initial: { opacity: 0, scale: 0.94 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 1.03 },
        transition: { duration: 0.5, ease: EASE_OUT },
        stagger: 0.07,
      };
    case 'unfold':
    default:
      return {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -8 },
        transition: { duration: 0.48, ease: EASE_OUT },
        stagger: 0.07,
      };
  }
}

export const SocialRotatorBar: React.FC<SocialRotatorBarProps> = ({
  slides,
  settings,
  previewSlideId = null,
  scale = 1,
}) => {
  const reduceMotion = useReducedMotion() ?? false;
  const { activeSlide, turn } = useRotatorCycle(slides, settings, previewSlideId);
  const activeId = activeSlide?.id ?? null;

  const q = settings.qualityScale ?? 2;
  const baseH = 84;
  const userContentFactor = clamp((settings.contentScale ?? 105) / 100, 0.6, 2.2);
  const innerScale =
    settings.resizeMode === 'background-only'
      ? userContentFactor
      : clamp(settings.heightPx / baseH, 0.7, 2.4) * userContentFactor;

  const W = Math.round(settings.widthPx * q);
  const plankH = Math.round(settings.heightPx * q);
  const pad = Math.round(14 * q);
  const totalH = plankH + pad * 2;

  const discSize = Math.round(clamp(plankH + 18 * q, 68 * q, totalH));
  const discTop = Math.round((totalH - discSize) / 2);
  const badgeSize = Math.round(clamp(44 * innerScale * q, 26 * q, discSize * 0.68));
  const x0 = Math.round(discSize * 0.5);
  const x1 = W - Math.round(4 * q);
  const y0 = pad;
  const y1 = pad + plankH;
  const lashL = discSize + Math.round(9 * q);
  const lashR = W - Math.round(32 * q);
  const textLeft = lashL + Math.round(25 * q);
  const textRight = W - lashR + Math.round(23 * q);
  const endStyle = settings.edgeStyle === 'angled' ? 'ragged' : 'clean';

  const twigs = useMemo(
    () => [
      { x: x0 + (x1 - x0) * 0.64, side: 'top' as const },
      { x: x0 + (x1 - x0) * 0.83, side: 'bottom' as const },
    ],
    [x0, x1]
  );

  const show = settings.visible && !!activeSlide;
  const palette = resolveVeinPalette(activeSlide?.platform ?? 'custom', settings.veinColorMode);
  const preset = settings.animationPreset;
  const textMotion = getTextMotion(preset, reduceMotion);
  const slideKey = `${activeId ?? 'none'}_${turn}`;

  const eyebrowPx = Math.round(clamp(11 * innerScale, 9, 24) * q);
  const headlinePx = Math.round(clamp(23 * innerScale, 14, 52) * q);
  const sublinePx = Math.round(clamp(13.5 * innerScale, 10, 30) * q);

  const line = (i: number) => ({
    initial: textMotion.initial,
    animate: {
      ...textMotion.animate,
      transition: {
        ...textMotion.transition,
        delay: 0.1 + i * textMotion.stagger,
      },
    },
  });

  return (
    <div
      className="relative select-none shrink-0"
      style={{
        width: `${Math.round(W * scale)}px`,
        height: `${Math.round(totalH * scale)}px`,
      }}
    >
      <div
        className="absolute left-0 top-0 mc-crisp-overlay"
        style={{
          width: `${W}px`,
          height: `${totalH}px`,
          transform: scale !== 1 ? `scale(${scale})` : undefined,
          transformOrigin: 'top left',
        }}
      >
        <AnimatePresence>
          {show && activeSlide && (
            <motion.div
              key="mana-rotator"
              className="absolute inset-0"
              initial={{ opacity: 0, y: reduceMotion ? 0 : Math.round(12 * q) }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduceMotion ? 0 : Math.round(8 * q) }}
              transition={{ duration: 0.5, ease: EASE_OUT }}
              style={{
                filter: `drop-shadow(0 ${Math.round(10 * q)}px ${Math.round(
                  14 * q
                )}px rgba(0, 0, 0, 0.72)) drop-shadow(0 0 ${Math.round(
                  16 * q
                )}px rgba(${palette.accentRgb}, 0.2))`,
              }}
            >
              <ManaWoodPlank
                width={W}
                height={totalH}
                x0={x0}
                y0={y0}
                x1={x1}
                y1={y1}
                seed={PLANK_SEED}
                veinHex={palette.accentHex}
                veinSoftHex={palette.accentSoftHex}
                showVeins={settings.showWoodVeins}
                endStyle={endStyle}
                lashings={[lashL, lashR]}
                twigs={twigs}
                veinQuietZone={[textLeft - Math.round(8 * q), W - textRight]}
              />

              <div
                className="pointer-events-none absolute"
                style={{
                  left: textLeft - Math.round(18 * q),
                  right: textRight - Math.round(10 * q),
                  top: y0 + Math.round(6 * q),
                  height: plankH - Math.round(12 * q),
                  background:
                    'radial-gradient(75% 85% at 38% 50%, rgba(10, 6, 14, 0.55) 0%, rgba(10, 6, 14, 0) 100%)',
                }}
              />

              <motion.div
                key={`surge_${slideKey}`}
                className="pointer-events-none absolute"
                style={{
                  left: x0,
                  right: Math.round(4 * q),
                  top: y0,
                  height: plankH,
                  mixBlendMode: 'screen',
                  background: `radial-gradient(70% 140% at 0% 50%, rgba(${palette.accentRgb}, ${
                    preset === 'mana-surge' ? 0.42 : 0.22
                  }) 0%, rgba(${palette.accentRgb}, 0) 72%)`,
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
              />

              {/* Text lane */}
              <div
                className="absolute flex items-center"
                style={{ left: textLeft, right: textRight, top: y0, height: plankH }}
              >
                <div className="relative flex-1 min-w-0 h-full overflow-hidden flex items-center">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`txt_${slideKey}`}
                      className="min-w-0 w-full"
                      initial={{ opacity: 1 }}
                      animate={{ opacity: 1 }}
                      exit={{
                        ...textMotion.exit,
                        transition: { duration: 0.28, ease: EASE_IN_OUT },
                      }}
                    >
                      {activeSlide.eyebrow.trim() && (
                        <motion.div
                          className="flex items-center min-w-0"
                          style={{ gap: Math.round(6 * q) }}
                          {...line(0)}
                        >
                          <BranchRune
                            color={palette.accentSoftHex}
                            className="shrink-0"
                            style={{
                              width: Math.round(9 * innerScale * q),
                              height: Math.round(12 * innerScale * q),
                              filter: `drop-shadow(0 0 ${Math.round(4 * q)}px rgba(${palette.accentRgb}, 0.9))`,
                            }}
                          />
                          <span
                            className="font-mana-display truncate font-bold tracking-[0.16em] leading-none uppercase"
                            style={{
                              fontSize: eyebrowPx,
                              color: palette.accentSoftHex,
                              textShadow: `0 0 ${Math.round(8 * q)}px rgba(${palette.accentRgb}, 0.7), 0 ${Math.round(q)}px ${Math.round(q)}px rgba(0, 0, 0, 0.9)`,
                            }}
                          >
                            {activeSlide.eyebrow}
                          </span>
                        </motion.div>
                      )}

                      <motion.div
                        className="font-mana-display truncate font-bold leading-[1.12]"
                        style={{
                          marginTop: Math.round(4 * q),
                          fontSize: headlinePx,
                          letterSpacing: '0.03em',
                          color: WOOD.parchment,
                          textShadow: `0 ${Math.round(2 * q)}px 0 rgba(8, 5, 11, 0.95), 0 0 ${Math.round(
                            14 * q
                          )}px rgba(0, 0, 0, 0.75)`,
                        }}
                        {...line(1)}
                      >
                        {activeSlide.headline}
                      </motion.div>

                      {activeSlide.subline.trim() && (
                        <motion.div
                          className="font-mana-body truncate font-medium leading-tight"
                          style={{
                            marginTop: Math.round(2 * q),
                            fontSize: sublinePx,
                            color: WOOD.parchmentMuted,
                            textShadow: `0 ${Math.round(q)}px ${Math.round(q)}px rgba(8, 5, 11, 0.9)`,
                          }}
                          {...line(2)}
                        >
                          {activeSlide.subline}
                        </motion.div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>

              {/* Log-slice token holding the unified rounded platform tile */}
              <div
                className="absolute"
                style={{ left: 0, top: discTop, width: discSize, height: discSize }}
              >
                <motion.div
                  className="absolute inset-0"
                  animate={{ rotate: reduceMotion ? 0 : turn * 120 }}
                  transition={{ type: 'spring', stiffness: 55, damping: 13 }}
                >
                  <LogMedallion
                    size={discSize}
                    seed={MEDALLION_SEED}
                    veinHex={palette.accentHex}
                    veinSoftHex={palette.accentSoftHex}
                    showVeins={settings.showWoodVeins}
                  />
                </motion.div>

                <div className="absolute inset-0 flex items-center justify-center">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`icon_${activeSlide.id}`}
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.72 }}
                      transition={{ duration: 0.34, ease: EASE_OUT }}
                    >
                      <PlatformBadge
                        platform={activeSlide.platform}
                        size={badgeSize}
                        radius={Math.round(badgeSize * 0.28)}
                      />
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
