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
import { SocialBrandIcon } from './SocialBrandIcons';
import { useRotatorCycle } from './useRotatorCycle';

/**
 * "Whatnot Live" design tokens.
 * Mirrors Whatnot's in-app HUD: floating charcoal cards, Whatnot yellow (#FFE406),
 * rounded geometry and bold friendly type — so overlays feel native on the platform.
 */
export const WN = {
  yellow: '#FFE406',
  yellowDeep: '#F5CF00',
  yellowInk: '#1a1718',
  surfaceTop: 'rgba(50, 46, 49, 0.96)',
  surfaceBottom: 'rgba(30, 28, 30, 0.96)',
  hairline: 'rgba(255, 255, 255, 0.09)',
  highlight: 'rgba(255, 255, 255, 0.10)',
  ink: '#ffffff',
  inkMuted: 'rgba(255, 255, 255, 0.72)',
  divider: 'rgba(255, 255, 255, 0.24)',
  shadow: '0 14px 30px rgba(0, 0, 0, 0.45), 0 2px 6px rgba(0, 0, 0, 0.3)',
  radiusCard: 18,
  radiusBadge: 14,
  radiusTag: 7,
} as const;

/** App-icon style badges in each platform's real brand colors */
const BADGE_STYLES: Record<SocialPlatform, { background: string; glyph: string; glyphFilter?: string }> = {
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
    background: 'linear-gradient(150deg, #FFC15A 0%, #FF8A1F 55%, #F2650A 100%)',
    glyph: '#ffffff',
  },
  whatsapp: {
    background: 'linear-gradient(150deg, #4BE68A 0%, #25D366 45%, #11A04F 100%)',
    glyph: '#ffffff',
  },
  discord: {
    background: 'linear-gradient(150deg, #8A93FF 0%, #5865F2 60%, #4752D6 100%)',
    glyph: '#ffffff',
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
  glyphClassName: string;
}> = ({ platform, size, radius, glyphClassName }) => {
  const s = BADGE_STYLES[platform] ?? BADGE_STYLES.custom;
  return (
    <div
      className="relative flex items-center justify-center overflow-hidden"
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: s.background,
        boxShadow:
          'inset 0 1px 0 rgba(255, 255, 255, 0.3), inset 0 -1px 0 rgba(0, 0, 0, 0.2), 0 4px 10px rgba(0, 0, 0, 0.32)',
      }}
    >
      {/* Glossy top light like a native app icon */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0) 50%)',
        }}
      />
      <span className="relative flex" style={{ filter: s.glyphFilter }}>
        <SocialBrandIcon platform={platform} color={s.glyph} className={glyphClassName} />
      </span>
    </div>
  );
};

const EASE_OUT = [0.22, 1, 0.36, 1] as const;
const POP_SPRING = { type: 'spring', stiffness: 520, damping: 24 } as const;
const TAG_TILT = -2;

// ============================================================================
// Choreography presets: "Pop" (default), "Slide", "Fade"
// ============================================================================
type Mode = 'pop' | 'slide' | 'fade';

function resolveMode(preset: RotatorAnimationPreset, reduce: boolean): Mode {
  if (reduce || preset === 'mana-surge') return 'fade';
  return preset === 'wipe' ? 'slide' : 'pop';
}

const FADE: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.35, ease: EASE_OUT } },
  exit: { opacity: 0, transition: { duration: 0.18 } },
};

function tagVariants(mode: Mode): Variants {
  if (mode === 'fade') {
    return {
      hidden: { opacity: 0, rotate: TAG_TILT },
      show: { opacity: 1, rotate: TAG_TILT, transition: { duration: 0.35 } },
      exit: { opacity: 0, rotate: TAG_TILT, transition: { duration: 0.18 } },
    };
  }
  if (mode === 'slide') {
    return {
      hidden: { opacity: 0, x: -14, rotate: TAG_TILT },
      show: { opacity: 1, x: 0, rotate: TAG_TILT, transition: { duration: 0.4, ease: EASE_OUT, delay: 0.1 } },
      exit: { opacity: 0, x: 14, rotate: TAG_TILT, transition: { duration: 0.18 } },
    };
  }
  return {
    hidden: { opacity: 0, scale: 0.55, rotate: -9, y: 4 },
    show: { opacity: 1, scale: 1, rotate: TAG_TILT, y: 0, transition: { ...POP_SPRING, delay: 0.14 } },
    exit: { opacity: 0, scale: 0.8, rotate: -5, transition: { duration: 0.15 } },
  };
}

function badgeVariants(mode: Mode): Variants {
  if (mode === 'fade') return FADE;
  if (mode === 'slide') {
    return {
      hidden: { opacity: 0, y: '70%' },
      show: { opacity: 1, y: '0%', transition: { duration: 0.42, ease: EASE_OUT } },
      exit: { opacity: 0, y: '-70%', transition: { duration: 0.2 } },
    };
  }
  return {
    hidden: { opacity: 0, rotateY: -90, scale: 0.9 },
    show: {
      opacity: 1,
      rotateY: 0,
      scale: 1,
      transition: { type: 'spring', stiffness: 320, damping: 20 },
    },
    exit: { opacity: 0, rotateY: 90, scale: 0.9, transition: { duration: 0.18 } },
  };
}

function blockVariants(): Variants {
  return {
    hidden: {},
    show: { transition: { staggerChildren: 0.07, delayChildren: 0.06 } },
    exit: { transition: { staggerChildren: 0.03 } },
  };
}

function lineVariants(mode: Mode): Variants {
  if (mode === 'fade') return FADE;
  if (mode === 'slide') {
    return {
      hidden: { opacity: 0, x: 18 },
      show: { opacity: 1, x: 0, transition: { duration: 0.42, ease: EASE_OUT } },
      exit: { opacity: 0, x: -18, transition: { duration: 0.2 } },
    };
  }
  return {
    hidden: { opacity: 0, y: 10, filter: 'blur(4px)' },
    show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.45, ease: EASE_OUT } },
    exit: { opacity: 0, y: -8, filter: 'blur(4px)', transition: { duration: 0.2 } },
  };
}

// ============================================================================
// <WhatnotLowerThird /> — charcoal HUD card, yellow sticker tag, app-icon badge
// ============================================================================
interface WhatnotLowerThirdProps {
  slides: RotatorSlide[];
  settings: RotatorBarSettings;
  previewSlideId?: string | null;
  scale?: number;
}

export const WhatnotLowerThird: React.FC<WhatnotLowerThirdProps> = ({
  slides,
  settings,
  previewSlideId = null,
  scale = 1,
}) => {
  const reduce = useReducedMotion() ?? false;
  const { activeSlide, turn } = useRotatorCycle(slides, settings, previewSlideId);

  const W = settings.widthPx;
  const compact = W < 520;
  const badge = compact ? 40 : 46;
  const tagH = compact ? 20 : 22;
  const tagOverlap = tagH / 2;
  const padT = compact ? 17 : 19;
  const padB = compact ? 12 : 14;
  const padL = compact ? 12 : 14;
  const padR = compact ? 16 : 20;
  const gap = 12;
  const cardH = padT + badge + padB;
  const totalH = tagOverlap + cardH;
  const textLeft = padL + badge + gap;
  const maxTextW = Math.max(120, W - textLeft - padR);

  const show = settings.visible && !!activeSlide;
  const textRef = useRef<HTMLDivElement>(null);
  const tagRef = useRef<HTMLDivElement>(null);
  const [textW, setTextW] = useState(0);
  const [tagW, setTagW] = useState(0);

  // Card width springs to fit each slide (offsetWidth ignores preview scaling)
  useEffect(() => {
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
  }, [show]);

  const mode = resolveMode(settings.animationPreset, reduce);
  const tagV = useMemo(() => tagVariants(mode), [mode]);
  const badgeV = useMemo(() => badgeVariants(mode), [mode]);
  const blockV = useMemo(() => blockVariants(), []);
  const lineV = useMemo(() => lineVariants(mode), [mode]);

  const baseW = textLeft + padR + 60;
  const cardW = Math.min(
    W,
    Math.max(baseW, textW > 0 ? textLeft + textW + padR : 0, tagW > 0 ? textLeft + tagW + 12 : 0)
  );
  const slideKey = `${activeSlide?.id ?? 'none'}_${turn}`;

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
            key="whatnot-lower-third"
            className="absolute left-0 top-0 font-wn-sans"
            style={{ width: W, height: totalH, transformOrigin: 'left center' }}
            initial={{ opacity: 0, y: reduce ? 0 : 14, scale: reduce ? 1 : 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: reduce ? 0 : 10, scale: reduce ? 1 : 0.96 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          >
            {/* Charcoal HUD card */}
            <motion.div
              className="absolute left-0 overflow-hidden"
              style={{
                top: tagOverlap,
                height: cardH,
                borderRadius: WN.radiusCard,
                background: `linear-gradient(180deg, ${WN.surfaceTop} 0%, ${WN.surfaceBottom} 100%)`,
                border: `1px solid ${WN.hairline}`,
                boxShadow: `inset 0 1px 0 ${WN.highlight}, ${WN.shadow}`,
              }}
              initial={{ width: baseW }}
              animate={{ width: cardW }}
              transition={reduce ? { duration: 0.2 } : { type: 'spring', stiffness: 260, damping: 30 }}
            >
              {/* Soft light sweep on every change */}
              {!reduce && (
                <motion.div
                  key={`sheen_${slideKey}`}
                  className="pointer-events-none absolute inset-y-0"
                  style={{
                    width: '40%',
                    background:
                      'linear-gradient(100deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0) 100%)',
                  }}
                  initial={{ x: '-120%' }}
                  animate={{ x: '300%' }}
                  transition={{ duration: 1, ease: EASE_OUT, delay: 0.12 }}
                />
              )}

              {/* App-icon badge */}
              <div
                className="absolute"
                style={{ left: padL, top: padT, width: badge, height: badge, perspective: 420 }}
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
                      radius={WN.radiusBadge}
                      glyphClassName={compact ? 'w-5 h-5' : 'w-6 h-6'}
                    />
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Headline + subline */}
              <div
                ref={textRef}
                className="absolute flex items-center"
                style={{ left: textLeft, top: padT, height: badge, width: 'max-content', maxWidth: maxTextW }}
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`txt_${slideKey}`}
                    variants={blockV}
                    initial="hidden"
                    animate="show"
                    exit="exit"
                    className="min-w-0 max-w-full"
                  >
                    <motion.div
                      variants={lineV}
                      className="truncate font-extrabold"
                      style={{
                        fontSize: compact ? 17 : 20,
                        lineHeight: compact ? '21px' : '24px',
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
                          marginTop: 2,
                          fontSize: compact ? 12 : 13,
                          lineHeight: compact ? '16px' : '18px',
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

            {/* Yellow sticker tag riding on the card edge */}
            <div
              ref={tagRef}
              className="absolute"
              style={{ left: textLeft - 2, top: 0, height: tagH, maxWidth: W - textLeft - 10 }}
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
                      padding: '0 9px',
                      borderRadius: WN.radiusTag,
                      background: WN.yellow,
                      color: WN.yellowInk,
                      fontSize: compact ? 10 : 11,
                      letterSpacing: '0.05em',
                      boxShadow:
                        'inset 0 -1.5px 0 rgba(0, 0, 0, 0.12), 0 4px 10px rgba(0, 0, 0, 0.35)',
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
  );
};

// ============================================================================
// <WhatnotTicker /> — rounded charcoal rail with yellow brand chip
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
}

export const WhatnotTicker: React.FC<WhatnotTickerProps> = ({
  items,
  settings,
  className = '',
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

  const H = settings.heightPx;
  const compact = H < 44;
  const inset = 5;
  const chipH = H - inset * 2;
  const badgeSize = Math.round(Math.min(26, H * 0.5));
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
          <div className="flex items-center gap-2.5 px-4">
            <PlatformBadge
              platform={item.platform}
              size={badgeSize}
              radius={Math.round(badgeSize * 0.3)}
              glyphClassName="w-3.5 h-3.5"
            />
            {item.label.trim() && (
              <span
                className="font-extrabold uppercase"
                style={{ fontSize: 11, letterSpacing: '0.05em', color: WN.yellow }}
              >
                {item.label}
              </span>
            )}
            {item.highlight.trim() && (
              <span
                className="font-semibold"
                style={{ fontSize: compact ? 13 : 14.5, letterSpacing: '-0.01em', color: WN.ink }}
              >
                {item.highlight}
              </span>
            )}
          </div>
          <span
            aria-hidden="true"
            className="shrink-0 rounded-full"
            style={{ width: 4, height: 4, background: WN.divider }}
          />
        </div>
      ))}
    </div>
  );

  return (
    <div
      className={`relative w-full flex items-center overflow-hidden select-none font-wn-sans ${className}`}
      style={{
        height: `${H}px`,
        borderRadius: Math.min(16, Math.round(H * 0.32)),
        background: `linear-gradient(180deg, ${WN.surfaceTop} 0%, ${WN.surfaceBottom} 100%)`,
        border: `1px solid ${WN.hairline}`,
        boxShadow: `inset 0 1px 0 ${WN.highlight}, ${WN.shadow}`,
      }}
    >
      {showAnchor && (
        <div
          className="relative z-10 shrink-0 flex items-center"
          style={{
            height: chipH,
            marginLeft: inset,
            padding: '0 12px',
            borderRadius: Math.min(11, Math.round(chipH * 0.3)),
            background: `linear-gradient(150deg, #FFEE55 0%, ${WN.yellow} 45%, ${WN.yellowDeep} 100%)`,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.45), inset 0 -1.5px 0 rgba(0,0,0,0.12)',
          }}
        >
          <span
            className="font-extrabold uppercase whitespace-nowrap"
            style={{ fontSize: 12, letterSpacing: '0.04em', color: WN.yellowInk }}
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
};
