'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ShowcasePreset,
  ShowcaseSettings,
} from '../types/broadcastBars';
import { WN } from './WhatnotBars';
import { EmbossedCategoryWatermark } from './SocialBrandIcons';

interface PromoShowcaseOverlayProps {
  preset: ShowcasePreset | null;
  settings: ShowcaseSettings;
  /** Scale multiplier when fitting inside OBS viewport or Studio preview */
  scale?: number;
  /** Keep visible in Studio preview even when OBS master visible is off */
  forcePreviewVisible?: boolean;
  /** Optional status callback for Studio Monitor countdown */
  onPhaseStatus?: (status: { isShowing: boolean; remainingSec: number }) => void;
}

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

export const PromoShowcaseOverlay: React.FC<PromoShowcaseOverlayProps> = ({
  preset,
  settings,
  scale = 1,
  forcePreviewVisible = false,
  onPhaseStatus,
}) => {
  const reduce = useReducedMotion() ?? false;
  const [phase, setPhase] = useState<'showing' | 'resting' | 'hidden'>(() =>
    settings.visible ? 'showing' : 'hidden'
  );
  const [remainingSec, setRemainingSec] = useState(0);
  const [playNonce, setPlayNonce] = useState(0);
  const lastTriggerRef = useRef<number>(settings.showTriggerId);

  // Sync phase with Studio visibility & manual trigger button
  useEffect(() => {
    if (!settings.visible) {
      setPhase('hidden');
      setRemainingSec(0);
      return;
    }

    if (settings.showTriggerId !== lastTriggerRef.current) {
      lastTriggerRef.current = settings.showTriggerId;
      setPhase('showing');
      setPlayNonce((n) => n + 1);
      return;
    }

    setPhase((cur) => (cur === 'hidden' ? 'showing' : cur));
  }, [settings.visible, settings.showTriggerId]);

  // Auto-hide & optional auto-repeat timer
  useEffect(() => {
    if (forcePreviewVisible || !settings.visible) {
      setRemainingSec(0);
      return;
    }

    const displaySec = Math.max(0, settings.displayDurationSec);
    const repeatRestSec = Math.max(0, settings.autoRepeatRestSec);

    if (phase === 'showing') {
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
        if (repeatRestSec > 0) {
          setPhase('resting');
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
    phase,
    playNonce,
  ]);

  const isActuallyShowing = Boolean(
    preset && (forcePreviewVisible || (settings.visible && phase === 'showing'))
  );

  useEffect(() => {
    onPhaseStatus?.({ isShowing: isActuallyShowing, remainingSec });
  }, [onPhaseStatus, isActuallyShowing, remainingSec]);

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
  const s = Math.max(0.6, Math.min(1.8, (settings.scalePct ?? 100) / 100));
  const unit = s * q;

  // Logical canvas box at native HiDPI resolution
  const canvasW = Math.round(760 * unit);
  const canvasH = Math.round((validImages.length > 5 && resolvedLayout === 'row' ? 540 : 450) * unit);

  const headerTagH = Math.round(25 * unit);
  const headerTagFont = Math.round(11.5 * unit);
  const headlineFont = Math.round(25 * unit);
  const sublineFont = Math.round(14 * unit);
  const headerPadX = Math.round(24 * unit);
  const headerPadY = Math.round(14 * unit);
  const headerRadius = Math.round(18 * unit);
  const borderPx = Math.max(1, Math.round(q));

  const heroImgSize = Math.round(285 * unit);
  const fanCardW = Math.round(
    (validImages.length <= 3 ? 172 : validImages.length === 4 ? 152 : 136) * unit
  );
  const fanCardH = Math.round(fanCardW * 1.38);
  const rowCardW = Math.round((validImages.length <= 4 ? 148 : 122) * unit);
  const rowCardH = Math.round(rowCardW * 1.38);

  const anim = settings.animation;
  const animKey = `${preset?.id ?? 'none'}_${playNonce}`;

  const getItemInitial = (idx: number, fanOffset = 0) => {
    if (reduce) return { opacity: 0 };
    if (anim === 'float-in') {
      return { opacity: 0, y: Math.round(42 * unit), scale: 0.92 };
    }
    if (anim === 'spotlight') {
      return { opacity: 0, scale: 0.52, y: Math.round(14 * unit) };
    }
    return {
      opacity: 0,
      scale: 0.68,
      y: Math.round(32 * unit),
      x: Math.round(-fanOffset * 28 * unit),
      rotate: 0,
    };
  };

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
              className="w-full h-full flex flex-col items-center justify-center font-wn-sans"
              style={{ gap: Math.round(22 * unit) }}
              initial={{ opacity: 0, y: reduce ? 0 : Math.round(18 * unit) }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduce ? 0 : Math.round(-16 * unit), scale: reduce ? 1 : 0.96 }}
              transition={{ duration: 0.42, ease: EASE_OUT }}
            >
              {/* ============================================================
                  HEADER PLATE (Yellow Whatnot Sticker + Bold Headline)
                  ============================================================ */}
              {(preset.eyebrow.trim() || preset.headline.trim() || preset.subline.trim()) && (
                <div
                  className="relative flex flex-col items-center"
                  style={{ paddingTop: Math.round(headerTagH * 0.48) }}
                >
                  {/* Dark Charcoal HUD Title Pill with embossed Mana-Flasche */}
                  <motion.div
                    initial={{ opacity: 0, scale: reduce ? 1 : 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 360, damping: 26 }}
                    className="relative overflow-hidden text-center"
                    style={{
                      maxWidth: Math.round(canvasW * 0.92),
                      paddingLeft: headerPadX,
                      paddingRight: headerPadX,
                      paddingTop: Math.round(headerPadY + headerTagH * 0.28),
                      paddingBottom: headerPadY,
                      borderRadius: headerRadius,
                      background: `linear-gradient(180deg, ${WN.surfaceTop} 0%, ${WN.surfaceBottom} 100%)`,
                      border: `${borderPx}px solid ${WN.hairline}`,
                      boxShadow: `inset 0 ${borderPx}px 0 ${WN.highlight}, 0 ${Math.round(
                        16 * q
                      )}px ${Math.round(34 * q)}px rgba(0, 0, 0, 0.55)`,
                    }}
                  >
                    {/* Embossed Mana-Flasche watermark right */}
                    <div
                      className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 opacity-80"
                      style={{ right: Math.round(-6 * unit) }}
                    >
                      <EmbossedCategoryWatermark
                        platform="buyback"
                        size={Math.round(92 * unit)}
                        qualityScale={q}
                        surface="charcoal"
                        rotateDeg={-12}
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
                          marginTop: Math.round(3 * unit),
                          fontSize: sublineFont,
                          color: WN.inkMuted,
                        }}
                      >
                        {preset.subline}
                      </div>
                    )}
                  </motion.div>

                  {/* Tilted Whatnot-Yellow Sticker riding top center */}
                  {preset.eyebrow.trim() && (
                    <motion.div
                      initial={{ opacity: 0, scale: reduce ? 1 : 0.65, rotate: -7 }}
                      animate={{ opacity: 1, scale: 1, rotate: -2 }}
                      transition={{ type: 'spring', stiffness: 460, damping: 24, delay: 0.08 }}
                      className="absolute top-0 uppercase font-extrabold whitespace-nowrap"
                      style={{
                        height: headerTagH,
                        lineHeight: `${headerTagH}px`,
                        padding: `0 ${Math.round(12 * unit)}px`,
                        borderRadius: Math.round(8 * unit),
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

              {/* ============================================================
                  IMAGE STAGE (Hero TTB · Card Fan · Multi-Card Row)
                  ============================================================ */}
              {validImages.length > 0 && (
                <div className="relative flex items-center justify-center w-full">
                  {/* Soft ambient spotlight behind transparent cutouts */}
                  {settings.showGlow && (
                    <motion.div
                      aria-hidden="true"
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.65, ease: EASE_OUT }}
                      className="pointer-events-none absolute"
                      style={{
                        width: Math.round(
                          (resolvedLayout === 'hero' ? 330 : 540) * unit
                        ),
                        height: Math.round(
                          (resolvedLayout === 'hero' ? 240 : 210) * unit
                        ),
                        borderRadius: '9999px',
                        background:
                          'radial-gradient(circle, rgba(56, 189, 248, 0.34) 0%, rgba(255, 228, 6, 0.14) 46%, rgba(0, 0, 0, 0) 74%)',
                      }}
                    />
                  )}

                  {/* LAYOUT 1: HERO (1 TTB / ETB / Display / Single Highlight) */}
                  {resolvedLayout === 'hero' && (
                    <motion.div
                      initial={getItemInitial(0)}
                      animate={{ opacity: 1, scale: 1, y: 0, x: 0, rotate: 0 }}
                      transition={{
                        type: 'spring',
                        stiffness: 260,
                        damping: 22,
                        delay: 0.1,
                      }}
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

                  {/* LAYOUT 2: FAN (2–5 Single Cards Fanned Out Like a TCG Hand) */}
                  {resolvedLayout === 'fan' && (
                    <div
                      className="relative z-10 flex items-center justify-center"
                      style={{
                        height: Math.round(fanCardH + 34 * unit),
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
                        const ty = Math.round(offset * offset * 8 * unit);

                        return (
                          <motion.div
                            key={img.id}
                            initial={getItemInitial(idx, offset)}
                            animate={{
                              opacity: 1,
                              scale: 1,
                              x: tx,
                              y: ty,
                              rotate: angle,
                            }}
                            transition={{
                              type: 'spring',
                              stiffness: 250,
                              damping: 22,
                              delay: 0.1 + idx * 0.08,
                            }}
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

                  {/* LAYOUT 3: ROW / GALLERY (Clean Grid for 2–10 Cards or Mixed Items) */}
                  {resolvedLayout === 'row' && (
                    <div
                      className="relative z-10 flex flex-wrap items-center justify-center"
                      style={{
                        gap: Math.round(14 * unit),
                        maxWidth: Math.round(canvasW * 0.94),
                      }}
                    >
                      {validImages.map((img, idx) => (
                        <motion.div
                          key={img.id}
                          initial={getItemInitial(idx)}
                          animate={{ opacity: 1, scale: 1, y: 0, x: 0, rotate: 0 }}
                          transition={{
                            type: 'spring',
                            stiffness: 280,
                            damping: 22,
                            delay: 0.08 + idx * 0.065,
                          }}
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
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
