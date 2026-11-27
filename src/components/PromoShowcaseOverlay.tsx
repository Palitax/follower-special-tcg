'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'framer-motion';
import {
  ShowcasePreset,
  ShowcaseSettings,
} from '../types/broadcastBars';
import { WN } from './WhatnotBars';
import { EmbossedCategoryWatermark } from './SocialBrandIcons';

export interface ShowcasePhaseStatus {
  isShowing: boolean;
  isResting: boolean;
  remainingSec: number;
  activeLabel: string;
  stepIndex: number;
  totalSteps: number;
}

interface PromoShowcaseOverlayProps {
  /** Currently selected single preset (used in 'single' mode and Studio edit preview) */
  preset: ShowcasePreset | null;
  /** Full list of presets (used in 'rotate' mode to cycle KGA -> Einzelkarten -> Pause in one OBS source) */
  presets?: ShowcasePreset[];
  settings: ShowcaseSettings;
  /** Scale multiplier when fitting inside OBS viewport or Studio preview */
  scale?: number;
  /** Keep selected preset pinned & visible in Studio preview while editing */
  forcePreviewVisible?: boolean;
  /** Optional status callback for Studio Monitor countdown */
  onPhaseStatus?: (status: ShowcasePhaseStatus) => void;
}

const EASE_OUT = [0.22, 1, 0.36, 1] as const;
const EASE_IN = [0.55, 0, 0.85, 0.35] as const;

interface ShowcaseCardCustom {
  idx: number;
  count: number;
  tx: number;
  ty: number;
  angle: number;
  offset: number;
}

export const PromoShowcaseOverlay: React.FC<PromoShowcaseOverlayProps> = ({
  preset: selectedPreset,
  presets,
  settings,
  scale = 1,
  forcePreviewVisible = false,
  onPhaseStatus,
}) => {
  const reduce = useReducedMotion() ?? false;
  const isRotateMode = settings.cycleMode === 'rotate';

  const cyclePresets = useMemo(() => {
    if (!isRotateMode || !presets || presets.length === 0) {
      return selectedPreset ? [selectedPreset] : [];
    }
    const eligible = presets.filter(
      (p) =>
        p.includeInCycle !== false &&
        (p.images.length > 0 || p.headline.trim().length > 0 || p.eyebrow.trim().length > 0)
    );
    if (eligible.length > 0) return eligible;
    return selectedPreset ? [selectedPreset] : [presets[0]];
  }, [isRotateMode, presets, selectedPreset]);

  const [phase, setPhase] = useState<'showing' | 'resting' | 'hidden'>(() =>
    settings.visible ? 'showing' : 'hidden'
  );
  const [cycleIdx, setCycleIdx] = useState(0);
  const [remainingSec, setRemainingSec] = useState(0);
  const [playNonce, setPlayNonce] = useState(0);
  const lastTriggerRef = useRef<number>(settings.showTriggerId);

  // Clamp cycle index if preset list shrinks
  useEffect(() => {
    if (cycleIdx >= cyclePresets.length) {
      setCycleIdx(0);
    }
  }, [cycleIdx, cyclePresets.length]);

  useEffect(() => {
    if (!settings.visible) {
      setPhase('hidden');
      setRemainingSec(0);
      return;
    }

    if (settings.showTriggerId !== lastTriggerRef.current) {
      lastTriggerRef.current = settings.showTriggerId;
      setCycleIdx(0);
      setPhase('showing');
      setPlayNonce((n) => n + 1);
      return;
    }

    setPhase((cur) => (cur === 'hidden' ? 'showing' : cur));
  }, [settings.visible, settings.showTriggerId]);

  const preset: ShowcasePreset | null = forcePreviewVisible
    ? selectedPreset
    : isRotateMode
    ? cyclePresets[cycleIdx % Math.max(1, cyclePresets.length)] ?? selectedPreset
    : selectedPreset;

  useEffect(() => {
    if (forcePreviewVisible || !settings.visible || cyclePresets.length === 0) {
      setRemainingSec(0);
      return;
    }

    const repeatRestSec = Math.max(0, settings.autoRepeatRestSec);

    if (phase === 'showing') {
      const currentItem = isRotateMode
        ? cyclePresets[cycleIdx % cyclePresets.length]
        : selectedPreset;
      const displaySec = isRotateMode
        ? Math.max(
            3,
            currentItem?.durationSec ||
              (settings.displayDurationSec > 0 ? settings.displayDurationSec : 12)
          )
        : Math.max(0, settings.displayDurationSec);

      if (displaySec === 0) {
        setRemainingSec(0);
        return;
      }

      const endTs = Date.now() + displaySec * 1000;
      setRemainingSec(displaySec);

      const tick = setInterval(() => {
        setRemainingSec(Math.max(0, Math.ceil((endTs - Date.now()) / 1000)));
      }, 500);

      const done = setTimeout(() => {
        clearInterval(tick);
        if (isRotateMode && cycleIdx < cyclePresets.length - 1) {
          // Smoothly transition to the next preset in the sequence (e.g. KGA -> Einzelkarten)
          setCycleIdx((i) => i + 1);
          setPlayNonce((n) => n + 1);
        } else if (repeatRestSec > 0) {
          // End of full cycle -> hide & rest for autoRepeatRestSec before restarting from index 0
          setPhase('resting');
        } else if (isRotateMode) {
          // Continuous rotation without rest pause
          setCycleIdx(0);
          setPlayNonce((n) => n + 1);
        } else {
          setPhase('hidden');
          setRemainingSec(0);
        }
      }, displaySec * 1000);

      return () => {
        clearInterval(tick);
        clearTimeout(done);
      };
    }

    if (phase === 'resting' && repeatRestSec > 0) {
      const wakeTs = Date.now() + repeatRestSec * 1000;
      setRemainingSec(repeatRestSec);

      const tick = setInterval(() => {
        setRemainingSec(Math.max(0, Math.ceil((wakeTs - Date.now()) / 1000)));
      }, 500);

      const wake = setTimeout(() => {
        clearInterval(tick);
        setCycleIdx(0);
        setPhase('showing');
        setPlayNonce((n) => n + 1);
      }, repeatRestSec * 1000);

      return () => {
        clearInterval(tick);
        clearTimeout(wake);
      };
    }
  }, [
    forcePreviewVisible,
    settings.visible,
    settings.displayDurationSec,
    settings.autoRepeatRestSec,
    isRotateMode,
    cycleIdx,
    cyclePresets,
    selectedPreset,
    phase,
    playNonce,
  ]);

  const isResting = Boolean(!forcePreviewVisible && settings.visible && phase === 'resting');
  const isActuallyShowing = Boolean(
    preset && (forcePreviewVisible || (settings.visible && phase === 'showing'))
  );

  useEffect(() => {
    onPhaseStatus?.({
      isShowing: isActuallyShowing,
      isResting,
      remainingSec,
      activeLabel: preset?.eyebrow.trim() || preset?.headline.trim() || 'Showcase',
      stepIndex: isRotateMode ? cycleIdx : 0,
      totalSteps: isRotateMode ? cyclePresets.length : 1,
    });
  }, [
    onPhaseStatus,
    isActuallyShowing,
    isResting,
    remainingSec,
    preset,
    isRotateMode,
    cycleIdx,
    cyclePresets.length,
  ]);

  const validImages = useMemo(
    () =>
      (preset?.images ?? []).filter(
        (im) => im.url && !im.url.startsWith('idb:')
      ),
    [preset]
  );

  const resolvedLayout = useMemo(() => {
    if (!preset) return 'hero';
    if (preset.layout !== 'auto') return preset.layout;
    if (validImages.length <= 1) return 'hero';
    if (validImages.length <= 5) return 'fan';
    return 'row';
  }, [preset, validImages.length]);

  const q = settings.qualityScale ?? 2;
  const masterScale = Math.max(0.6, Math.min(1.8, (settings.scalePct ?? 100) / 100));
  const textFactor = Math.max(0.5, Math.min(2.2, (settings.textScalePct ?? 100) / 100));
  const imageFactor = Math.max(0.5, Math.min(2.0, (settings.imageScalePct ?? 100) / 100));

  const unit = masterScale * q;
  const textUnit = masterScale * textFactor * q;
  const imgUnit = masterScale * imageFactor * q;

  const canvasW = Math.round(780 * unit);
  const canvasH = Math.round(
    (validImages.length > 5 && resolvedLayout === 'row' ? 560 : 480) * unit
  );

  const headerTagH = Math.round(25 * textUnit);
  const headerTagFont = Math.round(11.5 * textUnit);
  const headlineFont = Math.round(26 * textUnit);
  const sublineFont = Math.round(14.5 * textUnit);
  const headerPadX = Math.round(24 * textUnit);
  const headerPadY = Math.round(14 * textUnit);
  const headerRadius = Math.round(18 * textUnit);
  const borderPx = Math.max(1, Math.round(q));

  const heroImgSize = Math.round(270 * imgUnit);
  const fanCardW = Math.round(
    (validImages.length <= 3 ? 168 : validImages.length === 4 ? 148 : 132) * imgUnit
  );
  const fanCardH = Math.round(fanCardW * 1.38);
  const rowCardW = Math.round((validImages.length <= 4 ? 144 : 118) * imgUnit);
  const rowCardH = Math.round(rowCardW * 1.38);

  const titleOffsetX = Math.round((settings.titleOffsetX ?? 0) * unit);
  const titleOffsetY = Math.round((settings.titleOffsetY ?? 0) * unit);
  const imageOffsetY = Math.round((settings.imageOffsetY ?? 0) * unit);
  const titleAnchor = settings.titleAnchor ?? 'top';
  const titleBgStyle = settings.titleBgStyle ?? 'card';
  const showSticker = settings.showSticker !== false;

  const anim = settings.animation;
  const animKey = `${preset?.id ?? 'none'}_${anim}_${playNonce}`;

  // Choreographed parent -> children IN + OUT variants so every exit mirrors the entrance in reverse
  const showcaseVariants = useMemo(() => {
    const root: Variants = {
      hidden: { opacity: 1 },
      show: { opacity: 1 },
      exit: { opacity: 0, transition: { when: 'afterChildren', duration: 0.08 } },
    };

    if (reduce) {
      const simple: Variants = {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { duration: 0.25 } },
        exit: { opacity: 0, transition: { duration: 0.22 } },
      };
      const fanSimple: Variants = {
        hidden: ({ tx, ty, angle }: ShowcaseCardCustom) => ({ opacity: 0, x: tx, y: ty, rotate: angle }),
        show: ({ tx, ty, angle }: ShowcaseCardCustom) => ({
          opacity: 1,
          x: tx,
          y: ty,
          rotate: angle,
          transition: { duration: 0.25 },
        }),
        exit: ({ tx, ty, angle }: ShowcaseCardCustom) => ({
          opacity: 0,
          x: tx,
          y: ty,
          rotate: angle,
          transition: { duration: 0.22 },
        }),
      };
      return { root, glow: simple, titleCard: simple, sticker: simple, hero: simple, fanCard: fanSimple, rowCard: simple };
    }

    const glow: Variants =
      anim === 'spotlight'
        ? {
            hidden: { opacity: 0, scale: 0.2 },
            show: { opacity: 1, scale: 1, transition: { duration: 0.55, ease: EASE_OUT } },
            exit: { opacity: 0, scale: 0.16, transition: { delay: 0.24, duration: 0.36, ease: EASE_IN } },
          }
        : anim === 'float-in'
        ? {
            hidden: { opacity: 0, scale: 0.6 },
            show: { opacity: 1, scale: 1, transition: { duration: 0.65, ease: EASE_OUT } },
            exit: { opacity: 0, scale: 0.55, transition: { delay: 0.2, duration: 0.4, ease: EASE_IN } },
          }
        : {
            hidden: { opacity: 0, scale: 0.45 },
            show: { opacity: 1, scale: 1, transition: { duration: 0.52, ease: EASE_OUT } },
            exit: { opacity: 0, scale: 0.35, transition: { delay: 0.22, duration: 0.36, ease: EASE_IN } },
          };

    const closedClip = `inset(0% 50% 0% 50% round ${headerRadius}px)`;
    const openClip = `inset(0% 0% 0% 0% round ${headerRadius}px)`;

    const titleCard: Variants =
      anim === 'spotlight'
        ? {
            hidden: { opacity: 0, clipPath: closedClip, scale: 0.94 },
            show: {
              opacity: 1,
              clipPath: openClip,
              scale: 1,
              transition: { delay: 0.06, duration: 0.48, ease: EASE_OUT },
              transitionEnd: { clipPath: 'none' },
            },
            exit: {
              opacity: [1, 0],
              clipPath: [openClip, closedClip],
              scale: [1, 0.92],
              transition: { delay: 0.08, duration: 0.38, ease: EASE_IN },
            },
          }
        : anim === 'float-in'
        ? {
            hidden: { opacity: 0, y: Math.round(24 * unit), scale: 0.95 },
            show: {
              opacity: 1,
              y: 0,
              scale: 1,
              transition: { delay: 0.05, duration: 0.48, ease: EASE_OUT },
            },
            exit: {
              opacity: 0,
              y: Math.round(-28 * unit),
              scale: 0.94,
              transition: { delay: 0.08, duration: 0.38, ease: EASE_IN },
            },
          }
        : {
            hidden: { opacity: 0, scale: 0.82, y: Math.round(18 * unit) },
            show: {
              opacity: 1,
              scale: 1,
              y: 0,
              transition: { type: 'spring', stiffness: 360, damping: 24, delay: 0.04 },
            },
            exit: {
              opacity: 0,
              scale: 0.82,
              y: Math.round(-20 * unit),
              transition: { delay: 0.08, duration: 0.34, ease: EASE_IN },
            },
          };

    const sticker: Variants =
      anim === 'float-in'
        ? {
            hidden: { opacity: 0, y: Math.round(-14 * unit), rotate: -6 },
            show: {
              opacity: 1,
              y: 0,
              rotate: -2,
              transition: { delay: 0.16, duration: 0.4, ease: EASE_OUT },
            },
            exit: {
              opacity: 0,
              y: Math.round(-20 * unit),
              rotate: 4,
              transition: { delay: 0, duration: 0.28, ease: EASE_IN },
            },
          }
        : {
            hidden: { opacity: 0, scale: 0.4, rotate: -14, y: Math.round(8 * unit) },
            show: {
              opacity: 1,
              scale: 1,
              rotate: -2,
              y: 0,
              transition: { type: 'spring', stiffness: 460, damping: 22, delay: 0.14 },
            },
            exit: {
              opacity: 0,
              scale: 0.35,
              rotate: -14,
              y: Math.round(-14 * unit),
              transition: { delay: 0, duration: 0.24, ease: EASE_IN },
            },
          };

    const hero: Variants =
      anim === 'float-in'
        ? {
            hidden: { opacity: 0, y: Math.round(54 * unit), scale: 0.9 },
            show: {
              opacity: 1,
              y: 0,
              scale: 1,
              transition: { delay: 0.1, duration: 0.54, ease: EASE_OUT },
            },
            exit: {
              opacity: 0,
              y: Math.round(-54 * unit),
              scale: 0.9,
              transition: { delay: 0.06, duration: 0.44, ease: EASE_IN },
            },
          }
        : anim === 'spotlight'
        ? {
            hidden: { opacity: 0, scale: 0.36, y: Math.round(16 * unit), rotate: -6 },
            show: {
              opacity: 1,
              scale: 1,
              y: 0,
              rotate: 0,
              transition: { type: 'spring', stiffness: 250, damping: 21, delay: 0.1 },
            },
            exit: {
              opacity: 0,
              scale: 0.32,
              y: Math.round(-14 * unit),
              rotate: 6,
              transition: { delay: 0.06, duration: 0.38, ease: EASE_IN },
            },
          }
        : {
            hidden: { opacity: 0, scale: 0.56, y: Math.round(42 * unit), rotate: -4 },
            show: {
              opacity: 1,
              scale: 1,
              y: 0,
              rotate: 0,
              transition: { type: 'spring', stiffness: 260, damping: 21, delay: 0.1 },
            },
            exit: {
              opacity: 0,
              scale: 0.52,
              y: Math.round(44 * unit),
              rotate: 5,
              transition: { delay: 0.06, duration: 0.38, ease: EASE_IN },
            },
          };

    const fanCard: Variants =
      anim === 'float-in'
        ? {
            hidden: ({ tx, ty, angle }: ShowcaseCardCustom) => ({
              opacity: 0,
              x: tx,
              y: ty + Math.round(52 * unit),
              scale: 0.9,
              rotate: angle,
            }),
            show: ({ tx, ty, angle, idx }: ShowcaseCardCustom) => ({
              opacity: 1,
              x: tx,
              y: ty,
              scale: 1,
              rotate: angle,
              transition: { delay: 0.08 + idx * 0.08, duration: 0.52, ease: EASE_OUT },
            }),
            exit: ({ tx, ty, angle, idx, count }: ShowcaseCardCustom) => ({
              opacity: 0,
              x: tx,
              y: ty - Math.round(54 * unit),
              scale: 0.9,
              rotate: angle,
              transition: {
                delay: 0.04 + Math.max(0, count - 1 - idx) * 0.065,
                duration: 0.42,
                ease: EASE_IN,
              },
            }),
          }
        : anim === 'spotlight'
        ? {
            hidden: ({ offset }: ShowcaseCardCustom) => ({
              opacity: 0,
              x: Math.round(-offset * 18 * unit),
              y: Math.round(16 * unit),
              scale: 0.36,
              rotate: 0,
            }),
            show: ({ tx, ty, angle, idx }: ShowcaseCardCustom) => ({
              opacity: 1,
              x: tx,
              y: ty,
              scale: 1,
              rotate: angle,
              transition: {
                type: 'spring',
                stiffness: 250,
                damping: 22,
                delay: 0.1 + idx * 0.075,
              },
            }),
            exit: ({ offset, idx, count }: ShowcaseCardCustom) => ({
              opacity: 0,
              x: Math.round(-offset * 16 * unit),
              y: Math.round(-12 * unit),
              scale: 0.32,
              rotate: 0,
              transition: {
                delay: 0.05 + Math.max(0, count - 1 - idx) * 0.06,
                duration: 0.38,
                ease: EASE_IN,
              },
            }),
          }
        : {
            // 'pop' — fans smoothly open from center deck & folds cleanly back into deck in reverse stagger!
            hidden: ({ offset }: ShowcaseCardCustom) => ({
              opacity: 0,
              scale: 0.58,
              x: Math.round(-offset * 28 * unit),
              y: Math.round(38 * unit),
              rotate: 0,
            }),
            show: ({ tx, ty, angle, idx }: ShowcaseCardCustom) => ({
              opacity: 1,
              scale: 1,
              x: tx,
              y: ty,
              rotate: angle,
              transition: {
                type: 'spring',
                stiffness: 250,
                damping: 22,
                delay: 0.1 + idx * 0.08,
              },
            }),
            exit: ({ offset, idx, count }: ShowcaseCardCustom) => ({
              opacity: 0,
              scale: 0.52,
              x: Math.round(-offset * 22 * unit),
              y: Math.round(44 * unit),
              rotate: 0,
              transition: {
                delay: 0.05 + Math.max(0, count - 1 - idx) * 0.065,
                duration: 0.38,
                ease: EASE_IN,
              },
            }),
          };

    const rowCard: Variants =
      anim === 'float-in'
        ? {
            hidden: { opacity: 0, y: Math.round(44 * unit), scale: 0.9 },
            show: ({ idx }: ShowcaseCardCustom) => ({
              opacity: 1,
              y: 0,
              scale: 1,
              transition: { delay: 0.08 + idx * 0.065, duration: 0.46, ease: EASE_OUT },
            }),
            exit: ({ idx, count }: ShowcaseCardCustom) => ({
              opacity: 0,
              y: Math.round(-46 * unit),
              scale: 0.9,
              transition: {
                delay: 0.04 + Math.max(0, count - 1 - idx) * 0.055,
                duration: 0.38,
                ease: EASE_IN,
              },
            }),
          }
        : anim === 'spotlight'
        ? {
            hidden: { opacity: 0, scale: 0.42, y: Math.round(14 * unit) },
            show: ({ idx }: ShowcaseCardCustom) => ({
              opacity: 1,
              scale: 1,
              y: 0,
              transition: { type: 'spring', stiffness: 270, damping: 22, delay: 0.08 + idx * 0.065 },
            }),
            exit: ({ idx, count }: ShowcaseCardCustom) => ({
              opacity: 0,
              scale: 0.36,
              y: Math.round(-12 * unit),
              transition: {
                delay: 0.05 + Math.max(0, count - 1 - idx) * 0.055,
                duration: 0.34,
                ease: EASE_IN,
              },
            }),
          }
        : {
            hidden: { opacity: 0, scale: 0.6, y: Math.round(32 * unit) },
            show: ({ idx }: ShowcaseCardCustom) => ({
              opacity: 1,
              scale: 1,
              y: 0,
              transition: { type: 'spring', stiffness: 280, damping: 22, delay: 0.08 + idx * 0.065 },
            }),
            exit: ({ idx, count }: ShowcaseCardCustom) => ({
              opacity: 0,
              scale: 0.52,
              y: Math.round(36 * unit),
              transition: {
                delay: 0.05 + Math.max(0, count - 1 - idx) * 0.055,
                duration: 0.34,
                ease: EASE_IN,
              },
            }),
          };

    return { root, glow, titleCard, sticker, hero, fanCard, rowCard };
  }, [anim, reduce, unit, headerRadius]);

  const hasTitleText = Boolean(
    preset &&
      ((showSticker && preset.eyebrow.trim()) ||
        preset.headline.trim() ||
        preset.subline.trim())
  );

  const titleElement = hasTitleText && preset && (
    <div
      className={`relative z-30 flex flex-col items-center ${
        titleAnchor === 'overlay' ? 'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2' : ''
      }`}
      style={{
        transform:
          titleAnchor === 'overlay'
            ? `translate(calc(-50% + ${titleOffsetX}px), calc(-50% + ${titleOffsetY}px))`
            : `translate(${titleOffsetX}px, ${titleOffsetY}px)`,
      }}
    >
      {titleBgStyle === 'none' ? (
        /* PURE FLOATING TEXT MODE (No card background) */
        <motion.div
          variants={showcaseVariants.titleCard}
          className="flex flex-col items-center text-center"
          style={{ maxWidth: Math.round(canvasW * 0.94), gap: Math.round(6 * textUnit) }}
        >
          {showSticker && preset.eyebrow.trim() && (
            <motion.div
              variants={showcaseVariants.sticker}
              className="uppercase font-extrabold whitespace-nowrap"
              style={{
                height: headerTagH,
                lineHeight: `${headerTagH}px`,
                padding: `0 ${Math.round(12 * textUnit)}px`,
                borderRadius: Math.round(8 * textUnit),
                background: WN.yellow,
                color: WN.yellowInk,
                fontSize: headerTagFont,
                letterSpacing: '0.07em',
                boxShadow: `0 ${Math.round(5 * q)}px ${Math.round(14 * q)}px rgba(0, 0, 0, 0.5)`,
              }}
            >
              {preset.eyebrow}
            </motion.div>
          )}

          {preset.headline.trim() && (
            <div
              className="font-extrabold tracking-[-0.02em] text-white leading-tight"
              style={{
                fontSize: headlineFont,
                textShadow: `0 ${Math.round(3 * q)}px ${Math.round(12 * q)}px rgba(0, 0, 0, 0.95), 0 ${Math.round(1.5 * q)}px ${Math.round(3 * q)}px rgba(0, 0, 0, 0.98)`,
              }}
            >
              {preset.headline}
            </div>
          )}

          {preset.subline.trim() && (
            <div
              className="font-bold leading-snug text-white/90"
              style={{
                fontSize: sublineFont,
                textShadow: `0 ${Math.round(2 * q)}px ${Math.round(8 * q)}px rgba(0, 0, 0, 0.95)`,
              }}
            >
              {preset.subline}
            </div>
          )}
        </motion.div>
      ) : (
        /* WHATNOT CHARCOAL CARD MODE */
        <div
          className="relative flex flex-col items-center"
          style={{ paddingTop: showSticker && preset.eyebrow.trim() ? Math.round(headerTagH * 0.48) : 0 }}
        >
          <motion.div
            variants={showcaseVariants.titleCard}
            className="relative overflow-hidden text-center"
            style={{
              maxWidth: Math.round(canvasW * 0.92),
              paddingLeft: headerPadX,
              paddingRight: headerPadX,
              paddingTop: Math.round(
                headerPadY + (showSticker && preset.eyebrow.trim() ? headerTagH * 0.28 : 0)
              ),
              paddingBottom: headerPadY,
              borderRadius: headerRadius,
              background: `linear-gradient(180deg, ${WN.surfaceTop} 0%, ${WN.surfaceMid} 54%, ${WN.surfaceBottom} 100%)`,
              border: `${borderPx}px solid ${WN.hairline}`,
              boxShadow: `inset 0 ${borderPx}px 0 ${WN.highlight}, 0 ${Math.round(
                16 * q
              )}px ${Math.round(34 * q)}px rgba(0, 0, 0, 0.55)`,
            }}
          >
            {/* Clean flat 2D Mana-Flasche silhouette cropped right */}
            <div
              className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2"
              style={{ right: Math.round(-12 * textUnit) }}
            >
              <EmbossedCategoryWatermark
                platform="buyback"
                size={Math.round(115 * textUnit)}
                surface="charcoal"
                rotateDeg={14}
              />
            </div>

            {preset.headline.trim() && (
              <div
                className="relative z-10 font-extrabold tracking-[-0.02em] text-white leading-tight"
                style={{
                  fontSize: headlineFont,
                  textShadow: `0 ${Math.round(2 * q)}px ${Math.round(10 * q)}px rgba(0, 0, 0, 0.65)`,
                }}
              >
                {preset.headline}
              </div>
            )}

            {preset.subline.trim() && (
              <div
                className="relative z-10 font-semibold leading-snug"
                style={{
                  marginTop: Math.round(3 * textUnit),
                  fontSize: sublineFont,
                  color: WN.inkMuted,
                }}
              >
                {preset.subline}
              </div>
            )}
          </motion.div>

          {showSticker && preset.eyebrow.trim() && (
            <motion.div
              variants={showcaseVariants.sticker}
              className="absolute top-0 uppercase font-extrabold whitespace-nowrap"
              style={{
                height: headerTagH,
                lineHeight: `${headerTagH}px`,
                padding: `0 ${Math.round(12 * textUnit)}px`,
                borderRadius: Math.round(8 * textUnit),
                background: WN.yellow,
                color: WN.yellowInk,
                fontSize: headerTagFont,
                letterSpacing: '0.07em',
                boxShadow: `inset 0 -${Math.max(
                  1,
                  Math.round(1.5 * q)
                )}px 0 rgba(0,0,0,0.14), 0 ${Math.round(5 * q)}px ${Math.round(
                  14 * q
                )}px rgba(0, 0, 0, 0.42)`,
              }}
            >
              {preset.eyebrow}
            </motion.div>
          )}
        </div>
      )}
    </div>
  );

  const imageStage = validImages.length > 0 && preset && (
    <div
      className="relative flex items-center justify-center w-full"
      style={{
        transform: imageOffsetY !== 0 ? `translateY(${imageOffsetY}px)` : undefined,
      }}
    >
      {settings.showGlow && (
        <motion.div
          aria-hidden="true"
          variants={showcaseVariants.glow}
          className="pointer-events-none absolute"
          style={{
            width: Math.round((resolvedLayout === 'hero' ? 330 : 540) * imgUnit),
            height: Math.round((resolvedLayout === 'hero' ? 240 : 210) * imgUnit),
            borderRadius: '9999px',
            background:
              'radial-gradient(circle, rgba(56, 189, 248, 0.32) 0%, rgba(255, 228, 6, 0.12) 46%, rgba(0, 0, 0, 0) 74%)',
          }}
        />
      )}

      {resolvedLayout === 'hero' && (
        <motion.div
          variants={showcaseVariants.hero}
          className="relative z-10 flex items-center justify-center"
        >
          <div
            className="mc-showcase-float"
            style={
              {
                '--sc-float-dur': '4.4s',
                '--sc-float-delay': '0s',
              } as React.CSSProperties
            }
          >
            <img
              src={validImages[0].url}
              alt={validImages[0].label || preset.headline || 'Showcase Produkt'}
              draggable={false}
              className="object-contain select-none pointer-events-none"
              style={{
                maxWidth: heroImgSize,
                maxHeight: heroImgSize,
                filter: `drop-shadow(0 ${Math.round(18 * q)}px ${Math.round(
                  24 * q
                )}px rgba(0, 0, 0, 0.78))${
                  settings.showGlow
                    ? ` drop-shadow(0 0 ${Math.round(16 * q)}px rgba(56, 189, 248, 0.38))`
                    : ''
                }`,
              }}
            />
          </div>
        </motion.div>
      )}

      {resolvedLayout === 'fan' && (
        <div
          className="relative z-10 flex items-center justify-center"
          style={{
            height: Math.round(fanCardH + 34 * imgUnit),
            width: Math.round(canvasW * 0.94),
          }}
        >
          {validImages.map((img, idx) => {
            const count = validImages.length;
            const mid = (count - 1) / 2;
            const offset = idx - mid;
            const stepAngle = count <= 3 ? 11 : count === 4 ? 8.5 : 7;
            const angle = offset * stepAngle;
            const stepX =
              count <= 3
                ? fanCardW * 0.78
                : count === 4
                ? fanCardW * 0.7
                : fanCardW * 0.62;
            const tx = Math.round(offset * stepX);
            const ty = Math.round(offset * offset * 8 * imgUnit);

            const cardCustom: ShowcaseCardCustom = {
              idx,
              count,
              tx,
              ty,
              angle,
              offset,
            };

            return (
              <motion.div
                key={img.id}
                variants={showcaseVariants.fanCard}
                custom={cardCustom}
                className="absolute flex items-center justify-center"
                style={{
                  zIndex: 10 + idx,
                  width: fanCardW,
                  height: fanCardH,
                }}
              >
                <div
                  className="mc-showcase-float w-full h-full flex items-center justify-center"
                  style={
                    {
                      '--sc-float-dur': `${(4.1 + (idx % 3) * 0.45).toFixed(2)}s`,
                      '--sc-float-delay': `${(idx * 0.35).toFixed(2)}s`,
                    } as React.CSSProperties
                  }
                >
                  <img
                    src={img.url}
                    alt={img.label || `Karte ${idx + 1}`}
                    draggable={false}
                    className="max-w-full max-h-full object-contain select-none pointer-events-none"
                    style={{
                      filter: `drop-shadow(0 ${Math.round(14 * q)}px ${Math.round(
                        20 * q
                      )}px rgba(0, 0, 0, 0.8))`,
                    }}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {resolvedLayout === 'row' && (
        <div
          className="relative z-10 flex flex-wrap items-center justify-center"
          style={{
            gap: Math.round(14 * imgUnit),
            maxWidth: Math.round(canvasW * 0.94),
          }}
        >
          {validImages.map((img, idx) => (
            <motion.div
              key={img.id}
              variants={showcaseVariants.rowCard}
              custom={{
                idx,
                count: validImages.length,
                tx: 0,
                ty: 0,
                angle: 0,
                offset: 0,
              } satisfies ShowcaseCardCustom}
              className="flex items-center justify-center"
              style={{ width: rowCardW, height: rowCardH }}
            >
              <div
                className="mc-showcase-float w-full h-full flex items-center justify-center"
                style={
                  {
                    '--sc-float-dur': `${(4.2 + (idx % 4) * 0.35).toFixed(2)}s`,
                    '--sc-float-delay': `${(idx * 0.28).toFixed(2)}s`,
                  } as React.CSSProperties
                }
              >
                <img
                  src={img.url}
                  alt={img.label || `Highlight ${idx + 1}`}
                  draggable={false}
                  className="max-w-full max-h-full object-contain select-none pointer-events-none"
                  style={{
                    filter: `drop-shadow(0 ${Math.round(12 * q)}px ${Math.round(
                      18 * q
                    )}px rgba(0, 0, 0, 0.78))`,
                  }}
                />
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div
      className="relative select-none shrink-0"
      style={{
        width: `${Math.round(canvasW * scale)}px`,
        height: `${Math.round(canvasH * scale)}px`,
      }}
    >
      <div
        className="absolute left-0 top-0 mc-crisp-overlay"
        style={{
          width: `${canvasW}px`,
          height: `${canvasH}px`,
          transform: scale !== 1 ? `scale(${scale})` : undefined,
          transformOrigin: 'top left',
        }}
      >
        <AnimatePresence mode="wait">
          {isActuallyShowing && preset && (
            <motion.div
              key={animKey}
              variants={showcaseVariants.root}
              initial="hidden"
              animate="show"
              exit="exit"
              className="relative w-full h-full flex flex-col items-center justify-center font-wn-sans"
              style={{ gap: Math.round(22 * unit) }}
            >
              {titleAnchor === 'top' && (
                <>
                  {titleElement}
                  {imageStage}
                </>
              )}
              {titleAnchor === 'bottom' && (
                <>
                  {imageStage}
                  {titleElement}
                </>
              )}
              {titleAnchor === 'overlay' && (
                <>
                  {imageStage}
                  {titleElement}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
