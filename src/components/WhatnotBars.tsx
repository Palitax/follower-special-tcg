'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'framer-motion';
import {
  RotatorAnimationPreset,
  RotatorBarSettings,
  RotatorSlide,
  SocialPlatform,
  TickerBarSettings,
  TickerItem,
  TickerSpeed,
} from '../types/broadcastBars';
import { EmbossedCategoryWatermark, SocialBrandIcon } from './SocialBrandIcons';
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
  surfaceTop: 'rgba(50, 46, 49, 0.96)',
  surfaceBottom: 'rgba(30, 28, 30, 0.96)',
  hairline: 'rgba(255, 255, 255, 0.11)',
  highlight: 'rgba(255, 255, 255, 0.12)',
  ink: '#ffffff',
  inkMuted: 'rgba(255, 255, 255, 0.74)',
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
              {/* Charcoal HUD card — independent width & height */}
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
                  background: `linear-gradient(180deg, ${WN.surfaceTop} 0%, ${WN.surfaceBottom} 100%)`,
                  border: `${borderPx}px solid ${WN.hairline}`,
                  boxShadow: `inset 0 ${borderPx}px 0 ${WN.highlight}, 0 ${Math.round(
                    14 * q
                  )}px ${Math.round(30 * q)}px rgba(0, 0, 0, 0.45), 0 ${Math.round(
                    2 * q
                  )}px ${Math.round(6 * q)}px rgba(0, 0, 0, 0.3)`,
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
                {/* Monochrome embossed category logo pressed into the card background */}
                <div
                  className="pointer-events-none absolute inset-0 overflow-hidden"
                  style={{
                    maskImage:
                      'linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.22) 32%, rgba(0,0,0,0.92) 72%, rgba(0,0,0,1) 100%)',
                    WebkitMaskImage:
                      'linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.22) 32%, rgba(0,0,0,0.92) 72%, rgba(0,0,0,1) 100%)',
                  }}
                >
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`emboss_${activeSlide.platform}`}
                      initial={{ opacity: 0, scale: 0.92 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.04 }}
                      transition={{ duration: 0.42, ease: EASE_OUT }}
                      className="absolute flex items-center justify-center"
                      style={{
                        right: Math.round(-cardH * 0.08),
                        top: '50%',
                        marginTop: -Math.round(cardH * 0.62),
                      }}
                    >
                      <EmbossedCategoryWatermark
                        platform={activeSlide.platform}
                        size={Math.round(cardH * 1.24)}
                        qualityScale={q}
                        surface="charcoal"
                        rotateDeg={-11}
                      />
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Soft light sweep on slide switch */}
                {!reduce && (
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
// <WhatnotTicker /> — HiDPI charcoal rail with independent W, H & resizeMode
// ============================================================================
const SPEED_SECONDS_PER_ITEM: Record<TickerSpeed, number> = {
  slow: 7.5,
  normal: 5.2,
  fast: 3.4,
};

interface WhatnotTickerProps {
  items: TickerItem[];
  settings: TickerBarSettings;
  className?: string;
  /** Optional preview scale factor in Studio Monitor (1 on live OBS) */
  scale?: number;
}

export const WhatnotTicker: React.FC<WhatnotTickerProps> = ({
  items,
  settings,
  className = '',
  scale = 1,
}) => {
  const enabledItems = useMemo(
    () => items.filter((it) => it.enabled && (it.label.trim() || it.highlight.trim())),
    [items]
  );
  const repeatedTrack = useMemo(
    () => (enabledItems.length >= 4 ? enabledItems : [...enabledItems, ...enabledItems]),
    [enabledItems]
  );

  if (!settings.visible || enabledItems.length === 0) {
    return null;
  }

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
  const durationSec = Math.max(
    14,
    Math.round(repeatedTrack.length * SPEED_SECONDS_PER_ITEM[settings.speed])
  );

  const renderSegment = (copyKey: string) => (
    <div className="flex items-center shrink-0">
      {repeatedTrack.map((item, idx) => (
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
            {/* Subtle monochrome embossed category mark pressed behind each ticker segment */}
            <div
              className="pointer-events-none absolute flex items-center justify-center opacity-75"
              style={{
                right: Math.round(10 * q),
                top: '50%',
                transform: 'translateY(-50%)',
              }}
            >
              <EmbossedCategoryWatermark
                platform={item.platform}
                size={Math.round(H * 1.08)}
                qualityScale={q}
                surface="charcoal"
                rotateDeg={-10}
              />
            </div>

            <PlatformBadge
              platform={item.platform}
              size={badgeSize}
              radius={Math.round(badgeSize * 0.28)}
            />
            {item.label.trim() && (
              <span
                className="relative z-10 font-extrabold uppercase"
                style={{ fontSize: labelPx, letterSpacing: '0.05em', color: WN.yellow }}
              >
                {item.label}
              </span>
            )}
            {item.highlight.trim() && (
              <span
                className="relative z-10 font-semibold"
                style={{ fontSize: textPx, letterSpacing: '-0.01em', color: WN.ink }}
              >
                {item.highlight}
              </span>
            )}
          </div>
          <span
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

  const barElement = (
    <div
      className={`relative flex items-center overflow-hidden select-none font-wn-sans mc-crisp-overlay ${
        settings.fullWidth ? 'w-full' : ''
      } ${className}`}
      style={{
        width: barW ? `${barW}px` : undefined,
        height: `${H}px`,
        borderRadius: outerRadius,
        background: `linear-gradient(180deg, ${WN.surfaceTop} 0%, ${WN.surfaceBottom} 100%)`,
        border: `${borderPx}px solid ${WN.hairline}`,
        boxShadow: `inset 0 ${borderPx}px 0 ${WN.highlight}, 0 ${Math.round(
          12 * q
        )}px ${Math.round(28 * q)}px rgba(0, 0, 0, 0.45)`,
      }}
    >
      {showAnchor && (
        <div
          className="relative z-10 shrink-0 flex items-center"
          style={{
            height: chipH,
            marginLeft: inset,
            padding: `0 ${Math.round(13 * Math.sqrt(innerScale) * q)}px`,
            borderRadius: Math.round(Math.min(12, chipH / q * 0.3) * q),
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
        </div>
      )}

      <div
        className="relative flex-1 min-w-0 h-full flex items-center overflow-hidden"
        style={{
          maskImage: 'linear-gradient(90deg, transparent 0%, #000 4%, #000 96%, transparent 100%)',
          WebkitMaskImage:
            'linear-gradient(90deg, transparent 0%, #000 4%, #000 96%, transparent 100%)',
        }}
      >
        <div
          className="mc-ticker-track flex items-center w-max"
          style={{
            animationDuration: `${durationSec}s`,
            animationPlayState: settings.paused ? 'paused' : 'running',
          }}
        >
          {renderSegment('a')}
          {renderSegment('b')}
        </div>
      </div>
    </div>
  );

  if (scale !== 1) {
    return (
      <div
        className="relative overflow-hidden"
        style={{
          width: barW ? `${Math.round(barW * scale)}px` : '100%',
          height: `${Math.round(H * scale)}px`,
        }}
      >
        <div
          style={{
            width: barW ? `${barW}px` : `${(100 / scale).toFixed(2)}%`,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          {barElement}
        </div>
      </div>
    );
  }

  return barElement;
};
