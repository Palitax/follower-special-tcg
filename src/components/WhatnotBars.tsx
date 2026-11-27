'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'framer-motion';
import {
  RotatorAnimationPreset,
  RotatorBarSettings,
  RotatorSlide,
  SocialPlatform,
  TickerBarSettings,
  TickerEntranceAnimation,
  TickerItem,
} from '../types/broadcastBars';
import { SocialBrandIcon } from './SocialBrandIcons';
import { BarBackgroundPatternLayer } from './BarBackgroundPattern';
import { SmoothMarqueeTrack } from './SmoothMarqueeTrack';
import { TickerCycleStatus, useTickerCycle } from './useTickerCycle';
import { useRotatorCycle } from './useRotatorCycle';

/**
 * "Whatnot Live" design tokens.
 * Mirrors Whatnot's in-app HUD: floating charcoal cards, Whatnot yellow (#FFE406),
 * rounded geometry and bold friendly type — rendered natively at HiDPI pixel scale
 * so OBS Browser Sources never upscale blurry textures.
 */
export const WN = {
  yellow: '#FFE406',
  yellowDeep: '#F5CF00',
  yellowInk: '#1a1718',
  surfaceTop: 'rgba(62, 64, 70, 0.96)',
  surfaceMid: 'rgba(36, 38, 43, 0.97)',
  surfaceBottom: 'rgba(18, 19, 23, 0.98)',
  hairline: 'rgba(255, 255, 255, 0.11)',
  highlight: 'rgba(255, 255, 255, 0.14)',
  ink: '#ffffff',
  inkMuted: 'rgba(255, 255, 255, 0.76)',
  divider: 'rgba(255, 255, 255, 0.24)',
  shadow: '0 14px 30px rgba(0, 0, 0, 0.45), 0 2px 6px rgba(0, 0, 0, 0.3)',
  radiusCard: 18,
  radiusBadge: 14,
  radiusTag: 7,
} as const;

interface BadgeVisualConfig {
  background: string;
  glyph: string;
  glyphFilter?: string;
  /** High-res 512px custom brand image clipped cleanly inside the rounded tile */
  imageSrc?: string;
}

/** Unified rounded app-icon tiles: crisp SVGs + user's high-res Discord, WhatsApp & Mana-Flasche assets */
export const BADGE_STYLES: Record<SocialPlatform, BadgeVisualConfig> = {
  instagram: {
    background:
      'linear-gradient(45deg, #FEDA75 0%, #FA7E1E 24%, #D62976 52%, #962FBF 78%, #4F5BD5 100%)',
    glyph: '#ffffff',
  },
  tiktok: {
    background: 'linear-gradient(160deg, #26262b 0%, #0b0b0d 100%)',
    glyph: '#ffffff',
    glyphFilter: 'drop-shadow(-1.2px -1.2px 0 #25F4EE) drop-shadow(1.2px 1.2px 0 #FE2C55)',
  },
  whatnot: {
    background: `linear-gradient(150deg, #FFEE55 0%, ${WN.yellow} 45%, ${WN.yellowDeep} 100%)`,
    glyph: WN.yellowInk,
  },
  buyback: {
    background: 'linear-gradient(150deg, #16335c 0%, #0b162d 100%)',
    glyph: '#ffffff',
    imageSrc: '/images/logos/mana-bottle.png',
  },
  whatsapp: {
    background: 'linear-gradient(150deg, #4BE68A 0%, #25D366 45%, #11A04F 100%)',
    glyph: '#ffffff',
    imageSrc: '/images/logos/whatsapp.png',
  },
  discord: {
    background: 'linear-gradient(150deg, #6b79f7 0%, #5665eb 60%, #4752D6 100%)',
    glyph: '#ffffff',
    imageSrc: '/images/logos/discord.png',
  },
  custom: {
    background: 'linear-gradient(150deg, #4d484b 0%, #2c292b 100%)',
    glyph: WN.yellow,
  },
};

export const PlatformBadge: React.FC<{
  platform: SocialPlatform;
  size: number;
  radius: number;
  glyphPx?: number;
}> = ({ platform, size, radius, glyphPx }) => {
  const s = BADGE_STYLES[platform] ?? BADGE_STYLES.custom;
  const resolvedGlyph = Math.round(glyphPx ?? size * 0.54);
  const rimWidth = Math.max(1, Math.round(size / 46));

  return (
    <div
      className="relative shrink-0 flex items-center justify-center overflow-hidden"
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: s.background,
        boxShadow: `inset 0 ${rimWidth}px 0 rgba(255, 255, 255, 0.3), inset 0 -${rimWidth}px 0 rgba(0, 0, 0, 0.22), 0 ${Math.round(
          size * 0.09
        )}px ${Math.round(size * 0.22)}px rgba(0, 0, 0, 0.34)`,
      }}
    >
      {s.imageSrc ? (
        <img
          src={s.imageSrc}
          alt=""
          draggable={false}
          className="w-full h-full object-cover select-none pointer-events-none"
          style={{ display: 'block' }}
        />
      ) : (
        <span
          className="relative flex items-center justify-center"
          style={{
            width: resolvedGlyph,
            height: resolvedGlyph,
            filter: s.glyphFilter,
          }}
        >
          <SocialBrandIcon platform={platform} color={s.glyph} className="w-full h-full" />
        </span>
      )}

      {/* Subtle glossy top light unifying both vector icons and raster artwork into one app-tile family */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          borderRadius: radius,
          background:
            'linear-gradient(180deg, rgba(255, 255, 255, 0.22) 0%, rgba(255, 255, 255, 0) 46%)',
          boxShadow: `inset 0 0 0 ${rimWidth}px rgba(255, 255, 255, 0.14)`,
        }}
      />
    </div>
  );
};

const EASE_OUT = [0.22, 1, 0.36, 1] as const;
const POP_SPRING = { type: 'spring', stiffness: 480, damping: 26 } as const;
const TAG_TILT = -2;

type Mode = 'pop' | 'slide' | 'fade';

function resolveMode(preset: RotatorAnimationPreset, reduce: boolean): Mode {
  if (reduce || preset === 'mana-surge') return 'fade';
  return preset === 'wipe' ? 'slide' : 'pop';
}

const FADE: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.34, ease: EASE_OUT } },
  exit: { opacity: 0, transition: { duration: 0.18 } },
};

function tagVariants(mode: Mode): Variants {
  if (mode === 'fade') {
    return {
      hidden: { opacity: 0, rotate: TAG_TILT },
      show: { opacity: 1, rotate: TAG_TILT, transition: { duration: 0.34 } },
      exit: { opacity: 0, rotate: TAG_TILT, transition: { duration: 0.18 } },
    };
  }
  if (mode === 'slide') {
    return {
      hidden: { opacity: 0, x: -16, rotate: TAG_TILT },
      show: {
        opacity: 1,
        x: 0,
        rotate: TAG_TILT,
        transition: { duration: 0.38, ease: EASE_OUT, delay: 0.08 },
      },
      exit: { opacity: 0, x: 16, rotate: TAG_TILT, transition: { duration: 0.18 } },
    };
  }
  return {
    hidden: { opacity: 0, scale: 0.65, rotate: -8, y: 4 },
    show: {
      opacity: 1,
      scale: 1,
      rotate: TAG_TILT,
      y: 0,
      transition: { ...POP_SPRING, delay: 0.12 },
    },
    exit: { opacity: 0, scale: 0.82, rotate: -5, transition: { duration: 0.15 } },
  };
}

/** Crisp 2D badge transitions — avoids 3D perspective layer blurring in OBS CEF */
function badgeVariants(mode: Mode): Variants {
  if (mode === 'fade') return FADE;
  if (mode === 'slide') {
    return {
      hidden: { opacity: 0, y: 18 },
      show: { opacity: 1, y: 0, transition: { duration: 0.38, ease: EASE_OUT } },
      exit: { opacity: 0, y: -18, transition: { duration: 0.18 } },
    };
  }
  return {
    hidden: { opacity: 0, scale: 0.72 },
    show: {
      opacity: 1,
      scale: 1,
      transition: { type: 'spring', stiffness: 420, damping: 24 },
    },
    exit: { opacity: 0, scale: 0.78, transition: { duration: 0.16 } },
  };
}

function blockVariants(): Variants {
  return {
    hidden: {},
    show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
    exit: { transition: { staggerChildren: 0.03 } },
  };
}

/** Zero CSS filter:blur so OBS CEF keeps razor-sharp subpixel text rasterization */
function lineVariants(mode: Mode): Variants {
  if (mode === 'fade') return FADE;
  if (mode === 'slide') {
    return {
      hidden: { opacity: 0, x: 20 },
      show: { opacity: 1, x: 0, transition: { duration: 0.38, ease: EASE_OUT } },
      exit: { opacity: 0, x: -20, transition: { duration: 0.18 } },
    };
  }
  return {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE_OUT } },
    exit: { opacity: 0, y: -10, transition: { duration: 0.18 } },
  };
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

/** Computes charcoal card background, hairline border & shadow scaled cleanly from 0% (invisible) to 100% (opaque) */
export function resolveCharcoalCardSurface(bgOpacityPct: number, borderPx: number, q: number) {
  const alpha = clamp(bgOpacityPct, 0, 100) / 100;
  if (alpha <= 0.005) {
    return {
      background: 'transparent',
      border: `${borderPx}px solid transparent`,
      boxShadow: 'none',
      isClear: true,
    };
  }
  const topA = (0.98 * alpha).toFixed(3);
  const midA = (0.99 * alpha).toFixed(3);
  const botA = alpha.toFixed(3);
  const lineA = (0.11 * alpha).toFixed(3);
  const hiA = (0.14 * alpha).toFixed(3);
  const sh1A = (0.45 * alpha).toFixed(3);
  const sh2A = (0.3 * alpha).toFixed(3);
  return {
    background: `linear-gradient(180deg, rgba(62, 64, 70, ${topA}) 0%, rgba(36, 38, 43, ${midA}) 54%, rgba(18, 19, 23, ${botA}) 100%)`,
    border: `${borderPx}px solid rgba(255, 255, 255, ${lineA})`,
    boxShadow: `inset 0 ${borderPx}px 0 rgba(255, 255, 255, ${hiA}), 0 ${Math.round(
      14 * q
    )}px ${Math.round(30 * q)}px rgba(0, 0, 0, ${sh1A}), 0 ${Math.round(
      2 * q
    )}px ${Math.round(6 * q)}px rgba(0, 0, 0, ${sh2A})`,
    isClear: alpha < 0.45,
  };
}

/** Shared entrance/exit motion variants for the horizontal Ticker (Zoom, Swipe, Wipe, Fade) */
/** Timeline (seconds) for the choreographed "Stufen-Aufbau" ticker entrance */
const CASCADE_T = { pattern: 0.45, text: 0.95, icons: 1.5 };

/**
 * Choreographed build-up: background unfolds from the center → pattern sweeps in →
 * brand chip & texts fade up one after another → icons pop in last.
 * Exit runs in reverse (icons → text → pattern → background) before the bar unmounts.
 */
function buildTickerCascadeVariants(radiusPx: number, q: number) {
  const closed = `inset(0% 50% 0% 50% round ${radiusPx}px)`;
  const open = `inset(0% 0% 0% 0% round ${radiusPx}px)`;
  const root: Variants = {
    hidden: { opacity: 1 },
    show: { opacity: 1 },
    exit: { opacity: 0, transition: { when: 'afterChildren', duration: 0.12 } },
  };
  const bg: Variants = {
    hidden: { clipPath: closed, opacity: 0 },
    show: {
      clipPath: open,
      opacity: 1,
      transition: { duration: 0.6, ease: EASE_OUT },
      transitionEnd: { clipPath: 'none' },
    },
    exit: {
      clipPath: [open, closed],
      opacity: [1, 0],
      transition: { delay: 0.55, duration: 0.42, ease: [0.55, 0, 0.85, 0.35] },
    },
  };
  const pattern: Variants = {
    hidden: { opacity: 0, clipPath: 'inset(0% 100% 0% 0%)' },
    show: {
      opacity: 1,
      clipPath: 'inset(0% 0% 0% 0%)',
      transition: { delay: CASCADE_T.pattern, duration: 0.85, ease: EASE_OUT },
    },
    exit: {
      opacity: 0,
      clipPath: 'inset(0% 0% 0% 100%)',
      transition: { delay: 0.32, duration: 0.3, ease: EASE_OUT },
    },
  };
  const text: Variants = {
    hidden: { opacity: 0, y: Math.round(8 * q) },
    show: (i: number = 0) => ({
      opacity: 1,
      y: 0,
      transition: { delay: CASCADE_T.text + Math.min(i, 10) * 0.07, duration: 0.5, ease: EASE_OUT },
    }),
    exit: { opacity: 0, y: -Math.round(6 * q), transition: { delay: 0.14, duration: 0.22 } },
  };
  const icon: Variants = {
    hidden: { opacity: 0, scale: 0.3, rotate: -30 },
    show: (i: number = 0) => ({
      opacity: 1,
      scale: 1,
      rotate: 0,
      transition: {
        type: 'spring',
        stiffness: 420,
        damping: 18,
        delay: CASCADE_T.icons + Math.min(i, 10) * 0.08,
      },
    }),
    exit: { opacity: 0, scale: 0.4, transition: { duration: 0.18 } },
  };
  return { root, bg, pattern, text, icon };
}

export function resolveTickerEntranceVariants(
  animation: TickerEntranceAnimation,
  reduce: boolean,
  q: number
): Variants {
  if (reduce || animation === 'fade') {
    return {
      hidden: { opacity: 0 },
      show: { opacity: 1, transition: { duration: 0.36, ease: EASE_OUT } },
      exit: { opacity: 0, transition: { duration: 0.24, ease: EASE_OUT } },
    };
  }
  switch (animation) {
    case 'zoom':
      return {
        hidden: { opacity: 0, scale: 0.78 },
        show: {
          opacity: 1,
          scale: 1,
          transition: { type: 'spring', stiffness: 400, damping: 26 },
        },
        exit: { opacity: 0, scale: 0.84, transition: { duration: 0.22, ease: EASE_OUT } },
      };
    case 'swipe-left':
      return {
        hidden: { opacity: 0, x: -Math.round(140 * q) },
        show: {
          opacity: 1,
          x: 0,
          transition: { duration: 0.44, ease: EASE_OUT },
        },
        exit: {
          opacity: 0,
          x: -Math.round(120 * q),
          transition: { duration: 0.26, ease: EASE_OUT },
        },
      };
    case 'swipe-right':
      return {
        hidden: { opacity: 0, x: Math.round(140 * q) },
        show: {
          opacity: 1,
          x: 0,
          transition: { duration: 0.44, ease: EASE_OUT },
        },
        exit: {
          opacity: 0,
          x: Math.round(120 * q),
          transition: { duration: 0.26, ease: EASE_OUT },
        },
      };
    case 'wipe':
      return {
        hidden: { opacity: 0.2, clipPath: 'inset(0% 100% 0% 0%)' },
        show: {
          opacity: 1,
          clipPath: 'inset(0% 0% 0% 0%)',
          transition: { duration: 0.52, ease: EASE_OUT },
        },
        exit: {
          opacity: 0,
          clipPath: 'inset(0% 0% 0% 100%)',
          transition: { duration: 0.3, ease: EASE_OUT },
        },
      };
    case 'swipe-up':
    default:
      return {
        hidden: { opacity: 0, y: Math.round(36 * q) },
        show: {
          opacity: 1,
          y: 0,
          transition: { type: 'spring', stiffness: 360, damping: 28 },
        },
        exit: {
          opacity: 0,
          y: Math.round(28 * q),
          transition: { duration: 0.24, ease: EASE_OUT },
        },
      };
  }
}

// ============================================================================
// <WhatnotLowerThird /> — crisp HiDPI charcoal HUD card with independent W & H
// ============================================================================
interface WhatnotLowerThirdProps {
  slides: RotatorSlide[];
  settings: RotatorBarSettings;
  previewSlideId?: string | null;
  /** Preview downscale factor inside Studio Monitor (1 on live OBS overlay) */
  scale?: number;
  /** Optional callback to display live active/resting countdown inside Studio Monitor */
  onCycleStatus?: (status: {
    isResting: boolean;
    restRemainingSec: number;
    slideIndex: number;
    totalEnabled: number;
  }) => void;
}

export const WhatnotLowerThird: React.FC<WhatnotLowerThirdProps> = ({
  slides,
  settings,
  previewSlideId = null,
  scale = 1,
  onCycleStatus,
}) => {
  const reduce = useReducedMotion() ?? false;
  const { activeSlide, turn, isResting, restRemainingSec, slideIndex, totalEnabled } =
    useRotatorCycle(slides, settings, previewSlideId);

  useEffect(() => {
    onCycleStatus?.({ isResting, restRemainingSec, slideIndex, totalEnabled });
  }, [onCycleStatus, isResting, restRemainingSec, slideIndex, totalEnabled]);

  // Native HiDPI render scale (1x, 1.5x, 2x) eliminates pixelation in OBS
  const q = settings.qualityScale ?? 2;
  const baseH = 84;
  const userContentFactor = clamp((settings.contentScale ?? 105) / 100, 0.6, 2.2);

  // 'together' scales text & icon cleanly with heightPx; 'background-only' keeps them fixed at contentScale
  const innerScale =
    settings.resizeMode === 'background-only'
      ? userContentFactor
      : clamp(settings.heightPx / baseH, 0.7, 2.4) * userContentFactor;

  const logicalW = settings.widthPx;
  const logicalH = settings.heightPx;

  const W = Math.round(logicalW * q);
  const cardH = Math.round(logicalH * q);

  // Badge size stays proportional to content scale, clamped safely inside very short cards
  const rawBadge = 48 * innerScale;
  const badgeLogical = clamp(rawBadge, 28, Math.max(30, logicalH - 12));
  const badge = Math.round(badgeLogical * q);

  const tagH = Math.round(clamp(23 * innerScale, 17, 46) * q);
  const tagOverlap = Math.round(tagH * 0.48);
  const totalH = tagOverlap + cardH;

  const padL = Math.round(clamp(16 * Math.sqrt(innerScale), 12, 34) * q);
  const padR = Math.round(clamp(22 * Math.sqrt(innerScale), 14, 42) * q);
  const gap = Math.round(clamp(14 * Math.sqrt(innerScale), 10, 28) * q);
  const textLeft = padL + badge + gap;
  const maxTextW = Math.max(Math.round(120 * q), W - textLeft - padR);

  const cardRadius = Math.round(clamp(18 * Math.sqrt(logicalH / baseH), 12, 36) * q);
  const badgeRadius = Math.round(badge * 0.28);
  const tagRadius = Math.round(clamp(7 * innerScale, 5, 14) * q);
  const borderPx = Math.max(1, Math.round(q));

  const headlinePx = Math.round(clamp(20.5 * innerScale, 13, 48) * q);
  const headlineLH = Math.round(headlinePx * 1.18);
  const sublinePx = Math.round(clamp(13 * innerScale, 10, 30) * q);
  const sublineLH = Math.round(sublinePx * 1.32);
  const tagFontPx = Math.round(clamp(11 * innerScale, 9, 22) * q);

  const show = settings.visible && !!activeSlide && !isResting;
  const textRef = useRef<HTMLDivElement>(null);
  const tagRef = useRef<HTMLDivElement>(null);
  const [textW, setTextW] = useState(0);
  const [tagW, setTagW] = useState(0);

  const isAutoWidth = settings.widthMode === 'auto';

  useEffect(() => {
    if (!isAutoWidth) return;
    const textEl = textRef.current;
    const tagEl = tagRef.current;
    if (!textEl || !tagEl) return;
    const update = () => {
      setTextW(textEl.offsetWidth);
      setTagW(tagEl.offsetWidth);
    };
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(update);
    ro.observe(textEl);
    ro.observe(tagEl);
    return () => ro.disconnect();
  }, [show, isAutoWidth, headlinePx, sublinePx, tagFontPx]);

  const mode = resolveMode(settings.animationPreset, reduce);
  const tagV = useMemo(() => tagVariants(mode), [mode]);
  const badgeV = useMemo(() => badgeVariants(mode), [mode]);
  const blockV = useMemo(() => blockVariants(), []);
  const lineV = useMemo(() => lineVariants(mode), [mode]);

  const minAutoW = textLeft + padR + Math.round(60 * q);
  const cardW = isAutoWidth
    ? Math.min(
        W,
        Math.max(
          minAutoW,
          textW > 0 ? textLeft + textW + padR : 0,
          tagW > 0 ? textLeft + tagW + Math.round(16 * q) : 0
        )
      )
    : W;

  const slideKey = `${activeSlide?.id ?? 'none'}_${turn}`;
  const scaledOuterW = Math.round(W * scale);
  const scaledOuterH = Math.round(totalH * scale);
  const cardSurface = resolveCharcoalCardSurface(settings.bgOpacityPct ?? 96, borderPx, q);
  const rotPattern = settings.bgPattern ?? 'logos';
  const rotPatternOpacity = settings.patternOpacityPct ?? 60;

  return (
    <div
      className="relative select-none shrink-0"
      style={{
        width: `${scaledOuterW}px`,
        height: `${scaledOuterH}px`,
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
              key="whatnot-lower-third"
              className="absolute left-0 top-0 font-wn-sans"
              style={{ width: W, height: totalH, transformOrigin: 'left center' }}
              initial={{ opacity: 0, y: reduce ? 0 : Math.round(12 * q) }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduce ? 0 : Math.round(8 * q) }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            >
              {/* Charcoal HUD card — independent width, height, background opacity & pattern */}
              <motion.div
                className="absolute left-0 overflow-hidden flex items-center"
                style={{
                  top: tagOverlap,
                  height: cardH,
                  paddingLeft: padL,
                  paddingRight: padR,
                  paddingTop: Math.round(tagOverlap * 0.25),
                  gap,
                  borderRadius: cardRadius,
                  background: cardSurface.background,
                  border: cardSurface.border,
                  boxShadow: cardSurface.boxShadow,
                }}
                initial={false}
                animate={{ width: cardW }}
                transition={
                  reduce
                    ? { duration: 0.15 }
                    : isAutoWidth
                    ? { type: 'spring', stiffness: 280, damping: 30 }
                    : { duration: 0.16, ease: EASE_OUT }
                }
              >
                {/* Configurable background texture or flat 2D tonal logo plane (independent opacity) */}
                {rotPattern === 'logos' ? (
                  <div className="pointer-events-none absolute inset-0 overflow-hidden">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={`plane_${activeSlide.platform}`}
                        initial={{ opacity: 0, scale: 0.94 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.03 }}
                        transition={{ duration: 0.38, ease: EASE_OUT }}
                        className="absolute inset-0"
                      >
                        <BarBackgroundPatternLayer
                          pattern="logos"
                          opacityPct={rotPatternOpacity}
                          qualityScale={q}
                          barHeightPx={cardH}
                          singlePlatform={activeSlide.platform}
                          surface="charcoal"
                        />
                      </motion.div>
                    </AnimatePresence>
                  </div>
                ) : (
                  <BarBackgroundPatternLayer
                    pattern={rotPattern}
                    opacityPct={rotPatternOpacity}
                    qualityScale={q}
                    barHeightPx={cardH}
                    surface="charcoal"
                  />
                )}

                {/* Soft light sweep on slide switch (only when card background is visible) */}
                {!reduce && !cardSurface.isClear && (
                  <motion.div
                    key={`sheen_${slideKey}`}
                    className="pointer-events-none absolute inset-y-0"
                    style={{
                      width: '38%',
                      background:
                        'linear-gradient(100deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0) 100%)',
                    }}
                    initial={{ x: '-120%' }}
                    animate={{ x: '310%' }}
                    transition={{ duration: 0.95, ease: EASE_OUT, delay: 0.1 }}
                  />
                )}

                {/* Unified rounded app-icon tile */}
                <div
                  className="relative shrink-0 flex items-center justify-center"
                  style={{ width: badge, height: badge }}
                >
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`badge_${activeSlide.id}`}
                      variants={badgeV}
                      initial="hidden"
                      animate="show"
                      exit="exit"
                    >
                      <PlatformBadge
                        platform={activeSlide.platform}
                        size={badge}
                        radius={badgeRadius}
                      />
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Headline + subline — cleanly centered vertically inside any background height */}
                <div
                  ref={textRef}
                  className="relative min-w-0 flex-1 flex items-center"
                  style={{
                    width: isAutoWidth ? 'max-content' : undefined,
                    maxWidth: isAutoWidth ? maxTextW : undefined,
                  }}
                >
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`txt_${slideKey}`}
                      variants={blockV}
                      initial="hidden"
                      animate="show"
                      exit="exit"
                      className="min-w-0 w-full"
                    >
                      <motion.div
                        variants={lineV}
                        className="truncate font-extrabold"
                        style={{
                          fontSize: headlinePx,
                          lineHeight: `${headlineLH}px`,
                          letterSpacing: '-0.02em',
                          color: WN.ink,
                          textShadow: cardSurface.isClear
                            ? `0 ${Math.round(2 * q)}px ${Math.round(8 * q)}px rgba(0, 0, 0, 0.92)`
                            : undefined,
                        }}
                      >
                        {activeSlide.headline}
                      </motion.div>
                      {activeSlide.subline.trim() && (
                        <motion.div
                          variants={lineV}
                          className="truncate font-medium"
                          style={{
                            marginTop: Math.round(2 * innerScale * q),
                            fontSize: sublinePx,
                            lineHeight: `${sublineLH}px`,
                            color: WN.inkMuted,
                            textShadow: cardSurface.isClear
                              ? `0 ${Math.round(1.5 * q)}px ${Math.round(6 * q)}px rgba(0, 0, 0, 0.9)`
                              : undefined,
                          }}
                        >
                          {activeSlide.subline}
                        </motion.div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </motion.div>

              {/* Yellow sticker tag riding cleanly on the card top edge */}
              <div
                ref={tagRef}
                className="absolute"
                style={{
                  left: textLeft - Math.round(2 * q),
                  top: 0,
                  height: tagH,
                  maxWidth: Math.max(Math.round(100 * q), cardW - textLeft - Math.round(10 * q)),
                }}
              >
                <AnimatePresence mode="wait">
                  {activeSlide.eyebrow.trim() && (
                    <motion.div
                      key={`tag_${slideKey}`}
                      variants={tagV}
                      initial="hidden"
                      animate="show"
                      exit="exit"
                      className="truncate uppercase font-extrabold"
                      style={{
                        height: tagH,
                        lineHeight: `${tagH}px`,
                        padding: `0 ${Math.round(10 * Math.sqrt(innerScale) * q)}px`,
                        borderRadius: tagRadius,
                        background: WN.yellow,
                        color: WN.yellowInk,
                        fontSize: tagFontPx,
                        letterSpacing: '0.05em',
                        boxShadow: `inset 0 -${Math.max(
                          1,
                          Math.round(1.5 * q)
                        )}px 0 rgba(0, 0, 0, 0.14), 0 ${Math.round(4 * q)}px ${Math.round(
                          10 * q
                        )}px rgba(0, 0, 0, 0.35)`,
                        transformOrigin: 'left center',
                      }}
                    >
                      {activeSlide.eyebrow}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// ============================================================================
// <WhatnotTicker /> — OBS-smooth GPU marquee with cycle, animations & patterns
// ============================================================================
interface WhatnotTickerProps {
  items: TickerItem[];
  settings: TickerBarSettings;
  className?: string;
  /** Optional preview scale factor in Studio Monitor (1 on live OBS) */
  scale?: number;
  /** Keep visible in Studio Monitor even during hidden rest cycle */
  forcePreviewVisible?: boolean;
  /** Live cycle countdown callback for Studio Monitor */
  onCycleStatus?: (status: TickerCycleStatus) => void;
}

export const WhatnotTicker: React.FC<WhatnotTickerProps> = ({
  items,
  settings,
  className = '',
  scale = 1,
  forcePreviewVisible = false,
  onCycleStatus,
}) => {
  const reduce = useReducedMotion() ?? false;
  const enabledItems = useMemo(
    () => items.filter((it) => it.enabled && (it.label.trim() || it.highlight.trim())),
    [items]
  );

  const uniquePlatforms = useMemo(
    () => Array.from(new Set(enabledItems.map((it) => it.platform))),
    [enabledItems]
  );

  const { isShowing, playNonce } = useTickerCycle(settings, forcePreviewVisible, onCycleStatus);

  const q = settings.qualityScale ?? 2;
  const baseH = 52;
  const userContentFactor = clamp((settings.contentScale ?? 105) / 100, 0.6, 2.2);

  // 'together' scales chip, icons & text with heightPx; 'background-only' keeps them fixed at contentScale
  const innerScale =
    settings.resizeMode === 'background-only'
      ? userContentFactor
      : clamp(settings.heightPx / baseH, 0.72, 2.4) * userContentFactor;

  const H = Math.round(settings.heightPx * q);
  const barW = settings.fullWidth ? undefined : Math.round(settings.widthPx * q);

  const inset = Math.round(clamp(6 * Math.sqrt(innerScale), 4, 14) * q);
  const rawChipH = Math.round(clamp(38 * innerScale, 26, settings.heightPx - 10) * q);
  const chipH = Math.min(H - inset * 2, rawChipH);
  const badgeSize = Math.round(
    clamp(26 * innerScale, 18, Math.max(20, settings.heightPx - 14)) * q
  );
  const labelPx = Math.round(clamp(11.5 * innerScale, 9, 26) * q);
  const textPx = Math.round(clamp(15 * innerScale, 11, 34) * q);
  const chipFontPx = Math.round(clamp(12 * innerScale, 9.5, 26) * q);
  const borderPx = Math.max(1, Math.round(q));
  const outerRadius = Math.round(Math.min(18, Math.round(settings.heightPx * 0.3)) * q);

  const anchorText = settings.brandAnchorText.trim();
  const showAnchor = settings.showBrandAnchor && anchorText.length > 0;
  const cardSurface = resolveCharcoalCardSurface(settings.bgOpacityPct ?? 96, borderPx, q);
  const clearTextShadow = cardSurface.isClear
    ? `0 ${Math.round(2 * q)}px ${Math.round(8 * q)}px rgba(0, 0, 0, 0.92), 0 0 ${Math.round(
        3 * q
      )}px rgba(0, 0, 0, 0.85)`
    : undefined;

  const entranceV = useMemo(
    () => resolveTickerEntranceVariants(settings.entranceAnimation ?? 'swipe-up', reduce, q),
    [settings.entranceAnimation, reduce, q]
  );
  const isCascade = !reduce && (settings.entranceAnimation ?? 'cascade') === 'cascade';
  const cascade = useMemo(() => buildTickerCascadeVariants(outerRadius, q), [outerRadius, q]);
  const textV = isCascade ? cascade.text : undefined;
  const iconV = isCascade ? cascade.icon : undefined;

  const shouldRender = isShowing && enabledItems.length > 0;
  const speedPxPerSec = settings.speedPxPerSec ?? 52;
  const measureKey = `${enabledItems.map((i) => `${i.id}:${i.label}:${i.highlight}`).join('|')}_${q}_${innerScale.toFixed(2)}_${settings.fullWidth}_${settings.widthPx}`;

  const renderSegment = (copyKey: string) => (
    <div className="flex items-center shrink-0">
      {enabledItems.map((item, idx) => (
        <div
          key={`${copyKey}_${item.id}_${idx}`}
          className="flex items-center shrink-0 whitespace-nowrap"
        >
          <div
            className="relative flex items-center"
            style={{
              gap: Math.round(10 * Math.sqrt(innerScale) * q),
              padding: `0 ${Math.round(18 * Math.sqrt(innerScale) * q)}px`,
            }}
          >
            <motion.span variants={iconV} custom={idx} className="inline-flex shrink-0">
              <PlatformBadge
                platform={item.platform}
                size={badgeSize}
                radius={Math.round(badgeSize * 0.28)}
              />
            </motion.span>
            {item.label.trim() && (
              <motion.span
                variants={textV}
                custom={idx + 1}
                className="relative z-10 font-extrabold uppercase"
                style={{
                  fontSize: labelPx,
                  letterSpacing: '0.05em',
                  color: WN.yellow,
                  textShadow: clearTextShadow,
                }}
              >
                {item.label}
              </motion.span>
            )}
            {item.highlight.trim() && (
              <motion.span
                variants={textV}
                custom={idx + 1.5}
                className="relative z-10 font-semibold"
                style={{
                  fontSize: textPx,
                  letterSpacing: '-0.01em',
                  color: WN.ink,
                  textShadow: clearTextShadow,
                }}
              >
                {item.highlight}
              </motion.span>
            )}
          </div>
          <motion.span
            variants={textV}
            custom={idx + 2}
            aria-hidden="true"
            className="shrink-0 rounded-full"
            style={{
              width: Math.max(3, Math.round(4 * q)),
              height: Math.max(3, Math.round(4 * q)),
              background: WN.divider,
            }}
          />
        </div>
      ))}
    </div>
  );

  const animatedBar = (
    <AnimatePresence mode="wait">
      {shouldRender && (
        <motion.div
          key={`wn_ticker_${settings.entranceAnimation}_${playNonce}`}
          variants={isCascade ? cascade.root : entranceV}
          initial="hidden"
          animate="show"
          exit="exit"
          className={`relative select-none font-wn-sans mc-crisp-overlay ${
            settings.fullWidth ? 'w-full' : ''
          } ${className}`}
          style={{
            width: barW ? `${barW}px` : undefined,
            height: `${H}px`,
            borderRadius: outerRadius,
            transformOrigin: 'center center',
          }}
        >
          {/* 1. Background card (unfolds from the center in Stufen-Aufbau) */}
          <motion.div
            aria-hidden="true"
            variants={isCascade ? cascade.bg : undefined}
            className="pointer-events-none absolute inset-0"
            style={{
              borderRadius: outerRadius,
              background: cardSurface.background,
              border: cardSurface.border,
              boxShadow: cardSurface.boxShadow,
            }}
          />

          <div
            className="absolute inset-0 flex items-center overflow-hidden"
            style={{ borderRadius: outerRadius }}
          >
            {/* 2. Decorative pattern (sweeps in left → right) */}
            <motion.div
              variants={isCascade ? cascade.pattern : undefined}
              className="pointer-events-none absolute inset-0"
            >
              <BarBackgroundPatternLayer
                pattern={settings.bgPattern ?? 'logos'}
                opacityPct={settings.patternOpacityPct ?? 60}
                qualityScale={q}
                barHeightPx={H}
                tickerPlatforms={uniquePlatforms}
                surface="charcoal"
              />
            </motion.div>

            {/* 3. Brand chip + texts, 4. icons (staggered inside the marquee) */}
            {showAnchor && (
              <motion.div
                variants={textV}
                custom={0}
                className="relative z-10 shrink-0 flex items-center"
                style={{
                  height: chipH,
                  marginLeft: inset,
                  marginRight: Math.round(6 * q),
                  padding: `0 ${Math.round(13 * Math.sqrt(innerScale) * q)}px`,
                  borderRadius: Math.round(Math.min(12, (chipH / q) * 0.3) * q),
                  background: `linear-gradient(150deg, #FFEE55 0%, ${WN.yellow} 45%, ${WN.yellowDeep} 100%)`,
                  boxShadow: `inset 0 ${borderPx}px 0 rgba(255,255,255,0.45), inset 0 -${Math.max(
                    1,
                    Math.round(1.5 * q)
                  )}px 0 rgba(0,0,0,0.14)`,
                }}
              >
                <span
                  className="font-extrabold uppercase whitespace-nowrap"
                  style={{ fontSize: chipFontPx, letterSpacing: '0.04em', color: WN.yellowInk }}
                >
                  {anchorText}
                </span>
              </motion.div>
            )}

            <SmoothMarqueeTrack
              speedPxPerSec={speedPxPerSec}
              qualityScale={q}
              paused={settings.paused}
              renderSegment={renderSegment}
              measureKey={measureKey}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (scale !== 1) {
    return (
      <div
        className="relative overflow-visible"
        style={{
          width: barW ? `${Math.round(barW * scale)}px` : '100%',
          height: `${Math.round(H * scale)}px`,
        }}
      >
        <div
          style={{
            width: barW ? `${barW}px` : `${(100 / scale).toFixed(2)}%`,
            height: `${H}px`,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          {animatedBar}
        </div>
      </div>
    );
  }

  return (
    <div
      className={settings.fullWidth ? 'w-full' : undefined}
      style={{
        width: barW ? `${barW}px` : undefined,
        height: `${H}px`,
      }}
    >
      {animatedBar}
    </div>
  );
};
