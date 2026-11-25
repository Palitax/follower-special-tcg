'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  RotatorAnimationPreset,
  RotatorBarSettings,
  RotatorSlide,
} from '../types/broadcastBars';
import { SocialBrandIcon, resolveVeinPalette } from './SocialBrandIcons';
import {
  BranchRune,
  LogMedallion,
  ManaWoodPlank,
  Pt,
  WOOD,
  seededRandom,
  smoothOpenPath,
} from './ManaWoodPlank';

interface SocialRotatorBarProps {
  slides: RotatorSlide[];
  settings: RotatorBarSettings;
  /** Optional Studio override to inspect a specific slide immediately */
  previewSlideId?: string | null;
  /** Optional scale multiplier for fitting inside Studio Preview monitor */
  scale?: number;
}

const EASE_OUT = [0.22, 1, 0.36, 1] as const;
const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const;

const PLANK_SEED = 7331;
const MEDALLION_SEED = 4242;

/** Per-preset text choreography — soft, magical transitions instead of UI wipes */
function getTextMotion(preset: RotatorAnimationPreset, reduce: boolean) {
  if (reduce) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: 0.4, ease: EASE_OUT },
      stagger: 0.05,
    };
  }
  switch (preset) {
    case 'wipe':
      // "Runen-Rolle": lines roll through the carved lane like a turning wooden drum
      return {
        initial: { opacity: 0, y: '70%' },
        animate: { opacity: 1, y: '0%' },
        exit: { opacity: 0, y: '-70%' },
        transition: { duration: 0.46, ease: EASE_IN_OUT },
        stagger: 0.06,
      };
    case 'mana-surge':
      // "Mana-Ausbruch": words ignite from a bright mana flash
      return {
        initial: { opacity: 0, scale: 0.94, filter: 'blur(3px) brightness(2.2)' },
        animate: { opacity: 1, scale: 1, filter: 'blur(0px) brightness(1)' },
        exit: { opacity: 0, scale: 1.03, filter: 'blur(4px) brightness(1.6)' },
        transition: { duration: 0.6, ease: EASE_OUT },
        stagger: 0.08,
      };
    case 'unfold':
    default:
      // "Verzauberter Nebel": letters drift in out of arcane mist
      return {
        initial: { opacity: 0, y: 6, filter: 'blur(6px)' },
        animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
        exit: { opacity: 0, y: -6, filter: 'blur(6px)' },
        transition: { duration: 0.6, ease: EASE_OUT },
        stagger: 0.08,
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

  const enabledSlides = useMemo(
    () => slides.filter((s) => s.enabled && (s.headline.trim() || s.eyebrow.trim())),
    [slides]
  );

  const [cycleIndex, setCycleIndex] = useState(0);
  const [turn, setTurn] = useState(0);

  useEffect(() => {
    if (cycleIndex >= enabledSlides.length) setCycleIndex(0);
  }, [enabledSlides.length, cycleIndex]);

  const pinnedSlide = useMemo(() => {
    const targetId = previewSlideId || settings.pinnedSlideId;
    if (!targetId) return null;
    return slides.find((s) => s.id === targetId) ?? null;
  }, [previewSlideId, settings.pinnedSlideId, slides]);

  const isCycling =
    settings.visible && !settings.paused && !pinnedSlide && enabledSlides.length > 1;

  useEffect(() => {
    if (!isCycling) return;
    const ms = Math.max(3000, settings.intervalSec * 1000);
    const id = setInterval(() => {
      setCycleIndex((prev) => (prev + 1) % enabledSlides.length);
    }, ms);
    return () => clearInterval(id);
  }, [isCycling, settings.intervalSec, enabledSlides.length]);

  const activeSlide: RotatorSlide | null =
    pinnedSlide ??
    (enabledSlides.length > 0 ? enabledSlides[cycleIndex % enabledSlides.length] : null);
  const activeId = activeSlide?.id ?? null;

  // Each slide change turns the log token and re-keys the choreography
  useEffect(() => {
    if (activeId) setTurn((t) => t + 1);
  }, [activeId]);

  // ---------------------------------------------------------------------------
  // Pixel-exact geometry (generated at the real size → zero stretching)
  // ---------------------------------------------------------------------------
  const W = settings.widthPx;
  const isCompact = W < 520;
  const plankH = isCompact ? 60 : 70;
  const pad = 13;
  const totalH = plankH + pad * 2;
  const discSize = plankH + 22;
  const discTop = (totalH - discSize) / 2;
  const x0 = Math.round(discSize * 0.5);
  const x1 = W - 4;
  const y0 = pad;
  const y1 = pad + plankH;
  const lashL = discSize + 9;
  const lashR = W - 32;
  const textLeft = lashL + 11 + 14;
  const textRight = W - lashR + 11 + 12;
  const endStyle = settings.edgeStyle === 'angled' ? 'ragged' : 'clean';

  const twigs = useMemo(
    () => [
      { x: x0 + (x1 - x0) * 0.64, side: 'top' as const },
      { x: x0 + (x1 - x0) * 0.83, side: 'bottom' as const },
    ],
    [x0, x1]
  );

  // Carved mana channel along the lower edge (fills as the timer runs)
  const channelPath = useMemo(() => {
    const rand = seededRandom(91);
    const start = textLeft - 6;
    const end = lashR - 14;
    const pts: Pt[] = [];
    const steps = Math.max(3, Math.round((end - start) / 46));
    for (let i = 0; i <= steps; i++) {
      pts.push([start + ((end - start) * i) / steps, y1 - 6 + (rand() - 0.5) * 1.6]);
    }
    return smoothOpenPath(pts);
  }, [textLeft, lashR, y1]);

  const show = settings.visible && !!activeSlide;
  const palette = resolveVeinPalette(activeSlide?.platform ?? 'custom', settings.veinColorMode);
  const preset = settings.animationPreset;
  const textMotion = getTextMotion(preset, reduceMotion);
  const slideKey = `${activeId ?? 'none'}_${turn}`;

  const line = (i: number) => ({
    initial: textMotion.initial,
    animate: {
      ...textMotion.animate,
      transition: {
        ...textMotion.transition,
        delay: 0.12 + i * textMotion.stagger,
      },
    },
  });

  return (
    <div
      className="relative select-none"
      style={{
        width: `${W}px`,
        height: `${totalH}px`,
        transform: scale !== 1 ? `scale(${scale})` : undefined,
        transformOrigin: 'center center',
      }}
    >
      <AnimatePresence>
        {show && activeSlide && (
          <motion.div
            key="mana-rotator"
            className="absolute inset-0"
            initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
            transition={{ duration: 0.55, ease: EASE_OUT }}
            style={{
              filter: `drop-shadow(0 10px 14px rgba(0, 0, 0, 0.72)) drop-shadow(0 0 16px rgba(${palette.accentRgb}, 0.2))`,
            }}
          >
            {/* ========== Painted plank with lashings & branch stubs ========== */}
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
              veinQuietZone={[textLeft - 8, textLeft + (W - textLeft - textRight) * 0.72]}
            />

            {/* ========== Smoky reading vignette behind the text lane ========== */}
            <div
              className="pointer-events-none absolute"
              style={{
                left: textLeft - 18,
                right: textRight - 10,
                top: y0 + 6,
                height: plankH - 12,
                background:
                  'radial-gradient(75% 85% at 38% 50%, rgba(10, 6, 14, 0.55) 0%, rgba(10, 6, 14, 0) 100%)',
              }}
            />

            {/* ========== Mana surge washing through the wood on each change ========== */}
            <motion.div
              key={`surge_${slideKey}`}
              className="pointer-events-none absolute"
              style={{
                left: x0,
                right: 4,
                top: y0,
                height: plankH,
                mixBlendMode: 'screen',
                background: `radial-gradient(70% 140% at 0% 50%, rgba(${palette.accentRgb}, ${
                  preset === 'mana-surge' ? 0.42 : 0.22
                }) 0%, rgba(${palette.accentRgb}, 0) 72%)`,
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 1.3, ease: 'easeOut' }}
            />

            {/* ========== Carved mana channel (slide timer) ========== */}
            {settings.showProgressBar && (
              <svg
                width={W}
                height={totalH}
                viewBox={`0 0 ${W} ${totalH}`}
                className="pointer-events-none absolute inset-0"
                aria-hidden="true"
                focusable="false"
              >
                <path
                  d={channelPath}
                  fill="none"
                  stroke="#07040a"
                  strokeOpacity={0.75}
                  strokeWidth={3.4}
                  strokeLinecap="round"
                />
                <path
                  d={channelPath}
                  fill="none"
                  stroke={palette.accentHex}
                  strokeOpacity={0.16}
                  strokeWidth={1.6}
                  strokeLinecap="round"
                />
                <path
                  key={`channel_${slideKey}_${settings.intervalSec}_${isCycling ? 1 : 0}`}
                  d={channelPath}
                  pathLength={1}
                  fill="none"
                  stroke={palette.accentSoftHex}
                  strokeWidth={1.7}
                  strokeLinecap="round"
                  className={isCycling ? 'mc-mana-channel' : undefined}
                  style={{
                    filter: `drop-shadow(0 0 3px ${palette.accentHex})`,
                    ...(isCycling
                      ? { animationDuration: `${settings.intervalSec}s` }
                      : { strokeDasharray: '1 1', strokeDashoffset: 0 }),
                  }}
                />
              </svg>
            )}

            {/* ========== Text lane ========== */}
            <div
              className="absolute flex items-center gap-3"
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
                      transition: { duration: 0.3, ease: EASE_IN_OUT },
                    }}
                  >
                    {activeSlide.eyebrow.trim() && (
                      <motion.div className="flex items-center gap-1.5 min-w-0" {...line(0)}>
                        <BranchRune
                          color={palette.accentSoftHex}
                          className="w-[9px] h-3 shrink-0"
                          style={{
                            filter: `drop-shadow(0 0 4px rgba(${palette.accentRgb}, 0.9))`,
                          }}
                        />
                        <span
                          className="font-mana-display truncate text-[11px] font-bold tracking-[0.16em] leading-none uppercase"
                          style={{
                            color: palette.accentSoftHex,
                            textShadow: `0 0 8px rgba(${palette.accentRgb}, 0.7), 0 1px 1px rgba(0, 0, 0, 0.9)`,
                          }}
                        >
                          {activeSlide.eyebrow}
                        </span>
                      </motion.div>
                    )}

                    <motion.div
                      className="font-mana-display truncate font-bold leading-[1.12] mt-1"
                      style={{
                        fontSize: isCompact ? 19 : 24,
                        letterSpacing: '0.03em',
                        color: WOOD.parchment,
                        textShadow:
                          '0 2px 0 rgba(8, 5, 11, 0.95), 0 0 14px rgba(0, 0, 0, 0.75)',
                      }}
                      {...line(1)}
                    >
                      {activeSlide.headline}
                    </motion.div>

                    {activeSlide.subline.trim() && (
                      <motion.div
                        className="font-mana-body truncate text-[13.5px] font-medium leading-tight mt-0.5"
                        style={{
                          color: WOOD.parchmentMuted,
                          textShadow: '0 1px 1px rgba(8, 5, 11, 0.9)',
                        }}
                        {...line(2)}
                      >
                        {activeSlide.subline}
                      </motion.div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Carved, recessed inlay tag with glowing rune lettering */}
              {activeSlide.badgeText.trim() && !isCompact && (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`badge_${slideKey}`}
                    className="relative shrink-0 px-3 py-[7px] font-mana-display text-[11px] font-bold tracking-[0.14em] uppercase whitespace-nowrap"
                    style={{
                      color: palette.accentSoftHex,
                      background: 'linear-gradient(180deg, #110a15 0%, #1d1424 100%)',
                      clipPath: 'polygon(4% 0, 97% 6%, 100% 52%, 96% 100%, 3% 94%, 0 46%)',
                      boxShadow:
                        'inset 0 2px 4px rgba(0, 0, 0, 0.85), inset 0 -1px 0 rgba(190, 160, 210, 0.14)',
                      textShadow: `0 0 8px rgba(${palette.accentRgb}, 0.9)`,
                    }}
                    initial={{ opacity: 0, filter: 'blur(4px)' }}
                    animate={{
                      opacity: 1,
                      filter: 'blur(0px)',
                      transition: { duration: 0.5, delay: 0.32, ease: EASE_OUT },
                    }}
                    exit={{ opacity: 0, filter: 'blur(4px)', transition: { duration: 0.22 } }}
                  >
                    {activeSlide.badgeText}
                  </motion.div>
                </AnimatePresence>
              )}
            </div>

            {/* ========== Log-slice token (turns on every change) ========== */}
            <div
              className="absolute"
              style={{ left: 0, top: discTop, width: discSize, height: discSize }}
            >
              <motion.div
                key={`flare_${slideKey}`}
                className="pointer-events-none absolute"
                style={{
                  inset: -16,
                  background: `radial-gradient(circle, rgba(${palette.accentRgb}, 0.55) 0%, rgba(${palette.accentRgb}, 0) 66%)`,
                }}
                initial={{ opacity: 0, scale: 0.75 }}
                animate={{ opacity: [0, 0.9, 0], scale: [0.75, 1.05, 1.12] }}
                transition={{ duration: 1.1, ease: 'easeOut' }}
              />

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
                    initial={{ opacity: 0, scale: 0.6, rotate: reduceMotion ? 0 : -25 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    exit={{ opacity: 0, scale: 0.6, rotate: reduceMotion ? 0 : 25 }}
                    transition={{ duration: 0.4, ease: EASE_OUT }}
                    style={{
                      filter: `drop-shadow(0 0 6px rgba(${palette.accentRgb}, 0.95)) drop-shadow(0 0 14px rgba(${palette.accentRgb}, 0.6)) drop-shadow(0 2px 2px rgba(0, 0, 0, 0.85))`,
                    }}
                  >
                    <SocialBrandIcon
                      platform={activeSlide.platform}
                      color={WOOD.parchment}
                      className={isCompact ? 'w-8 h-8' : 'w-9 h-9'}
                    />
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
