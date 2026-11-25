'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  RotatorBarSettings,
  RotatorSlide,
} from '../types/broadcastBars';
import {
  PLATFORM_THEMES,
  SocialBrandIcon,
  resolveVeinPalette,
} from './SocialBrandIcons';
import { ManaWoodTexture } from './ManaWoodTexture';

interface SocialRotatorBarProps {
  slides: RotatorSlide[];
  settings: RotatorBarSettings;
  /** Optional Studio override to inspect a specific slide immediately */
  previewSlideId?: string | null;
  /** Optional scale multiplier for fitting inside Studio Preview monitor */
  scale?: number;
}

const ANGLED_ICON_CLIP = 'polygon(12px 0, 100% 0, 100% 100%, 0 100%, 0 12px)';
const ANGLED_WING_CLIP = 'polygon(0 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%)';

export const SocialRotatorBar: React.FC<SocialRotatorBarProps> = ({
  slides,
  settings,
  previewSlideId = null,
  scale = 1,
}) => {
  const enabledSlides = useMemo(
    () => slides.filter((s) => s.enabled && (s.headline.trim() || s.eyebrow.trim())),
    [slides]
  );

  const [cycleIndex, setCycleIndex] = useState(0);
  const [cycleTick, setCycleTick] = useState(0);

  // Keep index valid when slides change
  useEffect(() => {
    if (enabledSlides.length === 0) {
      setCycleIndex(0);
    } else if (cycleIndex >= enabledSlides.length) {
      setCycleIndex(0);
    }
  }, [enabledSlides.length, cycleIndex]);

  const pinnedSlide = useMemo(() => {
    const targetId = previewSlideId || settings.pinnedSlideId;
    if (!targetId) return null;
    return slides.find((s) => s.id === targetId) ?? null;
  }, [previewSlideId, settings.pinnedSlideId, slides]);

  const isCycling =
    settings.visible &&
    !settings.paused &&
    !pinnedSlide &&
    enabledSlides.length > 1;

  useEffect(() => {
    if (!isCycling) return;
    const ms = Math.max(3000, settings.intervalSec * 1000);
    const id = setInterval(() => {
      setCycleIndex((prev) => (prev + 1) % enabledSlides.length);
      setCycleTick((t) => t + 1);
    }, ms);
    return () => clearInterval(id);
  }, [isCycling, settings.intervalSec, enabledSlides.length]);

  const activeSlide: RotatorSlide | null =
    pinnedSlide ?? (enabledSlides.length > 0 ? enabledSlides[cycleIndex % enabledSlides.length] : null);

  if (!settings.visible || !activeSlide) {
    return null;
  }

  const platformTheme = PLATFORM_THEMES[activeSlide.platform] ?? PLATFORM_THEMES.custom;
  const veinPalette = resolveVeinPalette(activeSlide.platform, settings.veinColorMode);
  const isAngled = settings.edgeStyle === 'angled';
  const preset = settings.animationPreset;

  const isCompact = settings.widthPx < 520;
  const barHeight = isCompact ? 68 : 78;
  const iconBoxSize = barHeight;

  // Slide key uniquely triggers choreography whenever slide or manual cycle updates
  const slideKey = `${activeSlide.id}_${preset}_${cycleTick}`;

  // Animation variants inspired by minimalist Twitch lower-third unfold/retract motion
  const wingInitial =
    preset === 'unfold'
      ? { clipPath: 'inset(0 100% 0 0)', opacity: 0.92 }
      : preset === 'mana-surge'
      ? { opacity: 0, x: -16 }
      : { opacity: 1, clipPath: 'inset(0 0% 0 0)' };

  const wingAnimate =
    preset === 'unfold'
      ? { clipPath: 'inset(0 0% 0 0)', opacity: 1 }
      : preset === 'mana-surge'
      ? { opacity: 1, x: 0 }
      : { opacity: 1, clipPath: 'inset(0 0% 0 0)' };

  const wingExit =
    preset === 'unfold'
      ? { clipPath: 'inset(0 100% 0 0)', opacity: 0.85 }
      : preset === 'mana-surge'
      ? { opacity: 0, x: 14 }
      : { opacity: 1, clipPath: 'inset(0 0% 0 0)' };

  const wingTransition =
    preset === 'unfold'
      ? { duration: 0.48, ease: [0.16, 1, 0.3, 1] as const }
      : { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const };

  return (
    <div
      className="relative select-none"
      style={{
        width: `${settings.widthPx}px`,
        transform: scale !== 1 ? `scale(${scale})` : undefined,
        transformOrigin: 'center center',
      }}
    >
      <div
        className="relative flex items-stretch w-full"
        style={{
          height: `${barHeight}px`,
          filter: `drop-shadow(0 14px 28px rgba(0, 0, 0, 0.78)) drop-shadow(0 0 18px rgba(${veinPalette.accentRgb}, 0.22))`,
        }}
      >
        {/* ============================================================
            LEFT SHARP ICON BLOCK (Anchor Emblem)
            ============================================================ */}
        <div
          className="relative shrink-0 flex items-center justify-center overflow-hidden"
          style={{
            width: `${iconBoxSize}px`,
            height: `${barHeight}px`,
            clipPath: isAngled ? ANGLED_ICON_CLIP : undefined,
            borderTop: `1px solid rgba(${veinPalette.accentRgb}, 0.45)`,
            borderBottom: `1px solid rgba(${veinPalette.accentRgb}, 0.35)`,
            borderLeft: `1px solid rgba(${veinPalette.accentRgb}, 0.42)`,
            backgroundColor: '#16101c',
          }}
        >
          <ManaWoodTexture
            veinHex={veinPalette.accentHex}
            veinSoftHex={veinPalette.accentSoftHex}
            showVeins={settings.showWoodVeins}
            variant="icon"
          />

          {/* Sharp left accent rail (minimalist Twitch broadcast stripe) */}
          <div
            className="absolute left-0 top-0 bottom-0 w-[3.5px] z-20 transition-colors duration-300"
            style={{
              backgroundColor: platformTheme.accentHex,
              boxShadow: `0 0 12px rgba(${platformTheme.accentRgb}, 0.9)`,
            }}
          />

          {/* Subtle ambient radial glow behind crisp brand vector */}
          <div
            className="absolute inset-0 pointer-events-none transition-colors duration-300"
            style={{
              background: `radial-gradient(circle at 52% 50%, rgba(${platformTheme.accentRgb}, 0.26) 0%, rgba(0, 0, 0, 0) 68%)`,
            }}
          />

          <AnimatePresence mode="wait">
            <motion.div
              key={`icon_${activeSlide.id}`}
              initial={{ opacity: 0, scale: 0.72, y: preset === 'wipe' ? 12 : 0 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.78, y: preset === 'wipe' ? -12 : 0 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-10 flex items-center justify-center"
              style={{
                filter: `drop-shadow(0 0 10px rgba(${platformTheme.accentRgb}, 0.65))`,
              }}
            >
              <SocialBrandIcon
                platform={activeSlide.platform}
                color="#ffffff"
                className={isCompact ? 'w-7 h-7' : 'w-8 h-8'}
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ============================================================
            LUMINOUS VERTICAL MANA SEAM DIVIDER
            ============================================================ */}
        <div
          className="relative w-[2px] shrink-0 z-20 transition-colors duration-300"
          style={{
            background: `linear-gradient(180deg, rgba(${veinPalette.accentRgb}, 0.25) 0%, ${veinPalette.accentSoftHex} 50%, rgba(${veinPalette.accentRgb}, 0.25) 100%)`,
            boxShadow: `0 0 10px rgba(${veinPalette.accentRgb}, 0.85)`,
          }}
        />

        {/* ============================================================
            RIGHT HORIZONTAL BAR WING (Unfolding Minimalist Lower-Third)
            ============================================================ */}
        <div className="relative flex-1 min-w-0 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={preset === 'wipe' ? 'steady_wing' : slideKey}
              initial={wingInitial}
              animate={wingAnimate}
              exit={wingExit}
              transition={wingTransition}
              className="relative w-full h-full flex items-center justify-between gap-3 px-4 sm:px-5 overflow-hidden"
              style={{
                clipPath: isAngled ? ANGLED_WING_CLIP : undefined,
                borderTop: `1px solid rgba(${veinPalette.accentRgb}, 0.42)`,
                borderBottom: `1px solid rgba(${veinPalette.accentRgb}, 0.32)`,
                borderRight: `1px solid rgba(${veinPalette.accentRgb}, 0.42)`,
                backgroundColor: '#130e19',
              }}
            >
              {/* Arcane Wood Grain + Glowing Mana Veins Layer */}
              <ManaWoodTexture
                veinHex={veinPalette.accentHex}
                veinSoftHex={veinPalette.accentSoftHex}
                showVeins={settings.showWoodVeins}
                variant="bar"
              />

              {/* Subtle dark readability scrim across center text lane */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    'linear-gradient(90deg, rgba(11, 8, 16, 0.48) 0%, rgba(11, 8, 16, 0.26) 55%, rgba(11, 8, 16, 0.44) 100%)',
                }}
              />

              {/* Single clean light-sweep on Mana Surge / Unfold entrance */}
              <motion.div
                key={`sweep_${slideKey}`}
                initial={{ x: '-110%', opacity: 0 }}
                animate={{ x: '240%', opacity: [0, 0.38, 0] }}
                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.08 }}
                className="pointer-events-none absolute inset-y-0 w-24 -skew-x-12 z-10"
                style={{
                  background: `linear-gradient(90deg, transparent, rgba(${veinPalette.accentRgb}, 0.55), rgba(255,255,255,0.45), transparent)`,
                }}
              />

              {/* TEXT BLOCK (Masked Kinetic Reveal) */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={`text_${activeSlide.id}_${cycleTick}`}
                  initial={{
                    opacity: 0,
                    x: preset === 'wipe' ? 0 : -16,
                    y: preset === 'wipe' ? 14 : 0,
                  }}
                  animate={{ opacity: 1, x: 0, y: 0 }}
                  exit={{
                    opacity: 0,
                    x: preset === 'wipe' ? 0 : -10,
                    y: preset === 'wipe' ? -14 : 0,
                  }}
                  transition={{
                    duration: 0.34,
                    delay: preset === 'unfold' ? 0.1 : 0,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="relative z-20 min-w-0 flex-1 flex flex-col justify-center"
                >
                  {activeSlide.eyebrow && (
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="inline-block w-1.5 h-1.5 shrink-0 rotate-45"
                        style={{
                          backgroundColor: platformTheme.accentHex,
                          boxShadow: `0 0 8px rgba(${platformTheme.accentRgb}, 0.9)`,
                        }}
                      />
                      <span
                        className="truncate text-[10px] sm:text-[11px] font-extrabold uppercase tracking-[0.2em] leading-none"
                        style={{ color: platformTheme.accentSoftHex }}
                      >
                        {activeSlide.eyebrow}
                      </span>
                    </div>
                  )}

                  <div
                    className={`truncate font-black tracking-[-0.02em] text-white leading-tight mt-0.5 ${
                      isCompact ? 'text-[19px]' : 'text-[23px]'
                    }`}
                    style={{
                      textShadow: '0 2px 10px rgba(0, 0, 0, 0.85)',
                    }}
                  >
                    {activeSlide.headline}
                  </div>

                  {activeSlide.subline && (
                    <div className="truncate text-[11px] sm:text-[12px] font-medium text-slate-300/90 leading-tight mt-0.5">
                      {activeSlide.subline}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* SHARP MINIMALIST RIGHT CTA TAG (Zero rounded corners) */}
              {activeSlide.badgeText.trim() && !isCompact && (
                <motion.div
                  key={`badge_${activeSlide.id}_${cycleTick}`}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{
                    duration: 0.32,
                    delay: preset === 'unfold' ? 0.18 : 0.04,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="relative z-20 shrink-0 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] whitespace-nowrap"
                  style={{
                    backgroundColor: platformTheme.badgeBg,
                    color: platformTheme.badgeText,
                    border: `1px solid ${platformTheme.badgeBorder}`,
                    boxShadow: `inset 0 0 12px rgba(${platformTheme.accentRgb}, 0.16)`,
                  }}
                >
                  {activeSlide.badgeText}
                </motion.div>
              )}

              {/* Subtle angled bottom-right corner accent trim */}
              {isAngled && (
                <div
                  className="pointer-events-none absolute right-0 bottom-0 w-4 h-4 z-20"
                  style={{
                    background: `linear-gradient(135deg, transparent 48%, rgba(${veinPalette.accentRgb}, 0.8) 50%, rgba(${veinPalette.accentRgb}, 0.35) 100%)`,
                  }}
                />
              )}

              {/* COMPOSITOR-ONLY BOTTOM PROGRESS HAIRLINE */}
              {settings.showProgressBar && (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[2.5px] bg-white/10 z-30">
                  <div
                    key={`prog_${slideKey}_${settings.intervalSec}`}
                    className="h-full w-full mc-rotator-progress"
                    style={{
                      background: `linear-gradient(90deg, ${veinPalette.accentHex}, ${veinPalette.accentSoftHex})`,
                      boxShadow: `0 0 10px rgba(${veinPalette.accentRgb}, 0.9)`,
                      animationDuration: `${settings.intervalSec}s`,
                      animationPlayState: isCycling ? 'running' : 'paused',
                      transform: isCycling ? undefined : 'scaleX(1)',
                    }}
                  />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
