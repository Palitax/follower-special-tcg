'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'framer-motion';
import {
  RotatorAnimationPreset,
  RotatorBarSettings,
  RotatorSlide,
  TickerBarSettings,
  TickerItem,
  TickerSpeed,
} from '../types/broadcastBars';
import { PLATFORM_THEMES, SocialBrandIcon } from './SocialBrandIcons';
import { useRotatorCycle } from './useRotatorCycle';

/**
 * Minimal lower-third design tokens.
 * Monochrome: one dark surface, one white accent tile, three ink levels, one hairline.
 */
const LT = {
  surface: 'rgba(16, 16, 18, 0.92)',
  hairline: 'rgba(255, 255, 255, 0.08)',
  ink: '#ffffff',
  inkMuted: 'rgba(255, 255, 255, 0.66)',
  inkSubtle: 'rgba(255, 255, 255, 0.5)',
  divider: 'rgba(255, 255, 255, 0.28)',
  tile: '#ffffff',
  tileInk: '#111113',
  radius: 4,
  shadow: '0 12px 32px rgba(0, 0, 0, 0.35)',
} as const;

const EASE_OUT = [0.22, 1, 0.36, 1] as const;
const EASE_IN = [0.4, 0, 1, 1] as const;

// ============================================================================
// Motion presets — "Slide" (masked rise), "Wipe" (left-to-right reveal), "Fade"
// ============================================================================
function blockVariants(preset: RotatorAnimationPreset, reduce: boolean): Variants {
  if (!reduce && preset === 'wipe') {
    return {
      hidden: { clipPath: 'inset(0 100% 0 0)' },
      show: {
        clipPath: 'inset(0 0% 0 0)',
        transition: { duration: 0.5, ease: EASE_OUT, delay: 0.05 },
      },
      exit: {
        clipPath: 'inset(0 0 0 100%)',
        transition: { duration: 0.28, ease: EASE_IN },
      },
    };
  }
  return {
    hidden: {},
    show: { transition: { staggerChildren: 0.06, delayChildren: 0.08 } },
    exit: { transition: { staggerChildren: 0.03 } },
  };
}

function lineVariants(preset: RotatorAnimationPreset, reduce: boolean): Variants {
  if (reduce || preset === 'mana-surge') {
    return {
      hidden: { opacity: 0 },
      show: { opacity: 1, transition: { duration: 0.4, ease: EASE_OUT } },
      exit: { opacity: 0, transition: { duration: 0.2, ease: EASE_IN } },
    };
  }
  if (preset === 'wipe') {
    return { hidden: {}, show: {}, exit: {} };
  }
  return {
    hidden: { y: '105%' },
    show: { y: '0%', transition: { duration: 0.5, ease: EASE_OUT } },
    exit: { y: '-105%', transition: { duration: 0.24, ease: EASE_IN } },
  };
}

function iconVariants(preset: RotatorAnimationPreset, reduce: boolean): Variants {
  if (reduce || preset === 'mana-surge') {
    return {
      hidden: { opacity: 0 },
      show: { opacity: 1, transition: { duration: 0.35, ease: EASE_OUT } },
      exit: { opacity: 0, transition: { duration: 0.2 } },
    };
  }
  return {
    hidden: { y: '120%' },
    show: { y: '0%', transition: { duration: 0.45, ease: EASE_OUT, delay: 0.04 } },
    exit: { y: '-120%', transition: { duration: 0.24, ease: EASE_IN } },
  };
}

// ============================================================================
// <MinimalLowerThird /> — white icon tile + content-fitted dark text panel
// ============================================================================
interface MinimalLowerThirdProps {
  slides: RotatorSlide[];
  settings: RotatorBarSettings;
  previewSlideId?: string | null;
  scale?: number;
}

export const MinimalLowerThird: React.FC<MinimalLowerThirdProps> = ({
  slides,
  settings,
  previewSlideId = null,
  scale = 1,
}) => {
  const reduce = useReducedMotion() ?? false;
  const { activeSlide, turn } = useRotatorCycle(slides, settings, previewSlideId);

  const W = settings.widthPx;
  const compact = W < 520;
  const H = compact ? 60 : 68;
  const padX = compact ? 16 : 20;
  const maxTextW = Math.max(140, W - H - padX * 2);

  const show = settings.visible && !!activeSlide;
  const measureRef = useRef<HTMLDivElement>(null);
  const [textW, setTextW] = useState(0);

  // Panel width follows the natural text width (offsetWidth ignores preview scale)
  useEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    const update = () => setTextW(el.offsetWidth);
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [show]);

  const preset = settings.animationPreset;
  const blockV = useMemo(() => blockVariants(preset, reduce), [preset, reduce]);
  const lineV = useMemo(() => lineVariants(preset, reduce), [preset, reduce]);
  const iconV = useMemo(() => iconVariants(preset, reduce), [preset, reduce]);
  const panelW = textW > 0 ? textW + padX * 2 : 0;

  return (
    <div
      className="relative select-none"
      style={{
        width: `${W}px`,
        height: `${H}px`,
        transform: scale !== 1 ? `scale(${scale})` : undefined,
        transformOrigin: 'center center',
      }}
    >
      <AnimatePresence>
        {show && activeSlide && (
          <motion.div
            key="minimal-lower-third"
            className="absolute left-0 top-0 flex items-stretch font-lt-sans"
            style={{
              height: H,
              borderRadius: LT.radius,
              overflow: 'hidden',
              boxShadow: LT.shadow,
            }}
            initial={{ opacity: 0, y: reduce ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduce ? 0 : 8 }}
            transition={{ duration: 0.4, ease: EASE_OUT }}
          >
            {/* Icon tile */}
            <div
              className="relative shrink-0 overflow-hidden flex items-center justify-center"
              style={{ width: H, height: H, background: LT.tile }}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={`icon_${activeSlide.id}`}
                  variants={iconV}
                  initial="hidden"
                  animate="show"
                  exit="exit"
                  className="flex items-center justify-center"
                >
                  <SocialBrandIcon
                    platform={activeSlide.platform}
                    color={LT.tileInk}
                    className={compact ? 'w-[22px] h-[22px]' : 'w-[26px] h-[26px]'}
                  />
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Text panel — width animates to fit each slide */}
            <motion.div
              className="relative overflow-hidden"
              style={{
                height: H,
                background: LT.surface,
                borderTop: `1px solid ${LT.hairline}`,
                borderRight: `1px solid ${LT.hairline}`,
                borderBottom: `1px solid ${LT.hairline}`,
              }}
              initial={{ width: 0 }}
              animate={{ width: panelW }}
              transition={{ duration: reduce ? 0.2 : 0.55, ease: EASE_OUT }}
            >
              <div
                ref={measureRef}
                className="absolute top-0 h-full flex items-center"
                style={{ left: padX, width: 'max-content', maxWidth: maxTextW }}
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`txt_${activeSlide.id}_${turn}`}
                    variants={blockV}
                    initial="hidden"
                    animate="show"
                    exit="exit"
                    className="min-w-0 max-w-full"
                  >
                    {activeSlide.eyebrow.trim() && (
                      <div className="overflow-hidden">
                        <motion.div
                          variants={lineV}
                          className="truncate font-medium uppercase"
                          style={{
                            fontSize: compact ? 10.5 : 11,
                            lineHeight: compact ? '13px' : '14px',
                            letterSpacing: '0.12em',
                            color: LT.inkSubtle,
                          }}
                        >
                          {activeSlide.eyebrow}
                        </motion.div>
                      </div>
                    )}

                    <div className="overflow-hidden" style={{ marginTop: 3 }}>
                      <motion.div
                        variants={lineV}
                        className="truncate font-semibold"
                        style={{
                          fontSize: compact ? 17 : 20,
                          lineHeight: compact ? '21px' : '24px',
                          letterSpacing: '-0.02em',
                          color: LT.ink,
                        }}
                      >
                        {activeSlide.headline}
                      </motion.div>
                    </div>

                    {activeSlide.subline.trim() && (
                      <div className="overflow-hidden" style={{ marginTop: 1 }}>
                        <motion.div
                          variants={lineV}
                          className="truncate"
                          style={{
                            fontSize: compact ? 12 : 13,
                            lineHeight: compact ? '16px' : '17px',
                            letterSpacing: '-0.005em',
                            color: LT.inkMuted,
                          }}
                        >
                          {activeSlide.subline}
                        </motion.div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================================================
// <MinimalTicker /> — slim monochrome marquee with white brand anchor
// ============================================================================
const SPEED_SECONDS_PER_ITEM: Record<TickerSpeed, number> = {
  slow: 7.5,
  normal: 5.2,
  fast: 3.4,
};

interface MinimalTickerProps {
  items: TickerItem[];
  settings: TickerBarSettings;
  className?: string;
}

export const MinimalTicker: React.FC<MinimalTickerProps> = ({
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
  const anchorText = settings.brandAnchorText.trim();
  const showAnchor = settings.showBrandAnchor && anchorText.length > 0;
  const colorIcons = settings.veinColorMode === 'platform';
  const durationSec = Math.max(
    14,
    Math.round(repeatedTrack.length * SPEED_SECONDS_PER_ITEM[settings.speed])
  );

  const renderSegment = (copyKey: string) => (
    <div className="flex items-center shrink-0">
      {repeatedTrack.map((item, idx) => {
        const theme = PLATFORM_THEMES[item.platform] ?? PLATFORM_THEMES.custom;
        return (
          <div
            key={`${copyKey}_${item.id}_${idx}`}
            className="flex items-center shrink-0 whitespace-nowrap"
          >
            <div className="flex items-center gap-2 px-4">
              <SocialBrandIcon
                platform={item.platform}
                color={colorIcons ? theme.accentHex : LT.ink}
                className="w-[15px] h-[15px] shrink-0"
              />
              {item.label.trim() && (
                <span
                  className="font-medium uppercase"
                  style={{ fontSize: 11, letterSpacing: '0.12em', color: LT.inkSubtle }}
                >
                  {item.label}
                </span>
              )}
              {item.highlight.trim() && (
                <span
                  className="font-medium"
                  style={{
                    fontSize: compact ? 13 : 14,
                    letterSpacing: '-0.01em',
                    color: LT.ink,
                  }}
                >
                  {item.highlight}
                </span>
              )}
            </div>
            <span
              aria-hidden="true"
              className="shrink-0 rounded-full"
              style={{ width: 3, height: 3, background: LT.divider }}
            />
          </div>
        );
      })}
    </div>
  );

  return (
    <div
      className={`relative w-full flex items-stretch overflow-hidden select-none font-lt-sans ${className}`}
      style={{
        height: `${H}px`,
        borderRadius: LT.radius,
        background: LT.surface,
        border: `1px solid ${LT.hairline}`,
        boxShadow: LT.shadow,
      }}
    >
      {showAnchor && (
        <div
          className="relative z-10 shrink-0 flex items-center px-4"
          style={{ background: LT.tile, color: LT.tileInk }}
        >
          <span
            className="font-semibold uppercase whitespace-nowrap"
            style={{ fontSize: 11, letterSpacing: '0.14em' }}
          >
            {anchorText}
          </span>
        </div>
      )}

      <div
        className="relative flex-1 min-w-0 flex items-center overflow-hidden"
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
