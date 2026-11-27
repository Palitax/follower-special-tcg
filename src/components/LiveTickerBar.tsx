'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { TickerBarSettings, TickerItem } from '../types/broadcastBars';
import { MANA_SIGNATURE_VEIN, PLATFORM_THEMES } from './SocialBrandIcons';
import { PlatformBadge, resolveTickerEntranceVariants } from './WhatnotBars';
import { BarBackgroundPatternLayer } from './BarBackgroundPattern';
import { SmoothMarqueeTrack } from './SmoothMarqueeTrack';
import { TickerCycleStatus, useTickerCycle } from './useTickerCycle';
import { BranchRune, ManaWoodPlank, WOOD } from './ManaWoodPlank';

interface LiveTickerBarProps {
  items: TickerItem[];
  settings: TickerBarSettings;
  className?: string;
  scale?: number;
  forcePreviewVisible?: boolean;
  onCycleStatus?: (status: TickerCycleStatus) => void;
}

const POLE_SEED = 2718;
const PLAQUE_SEED = 1618;

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

export const LiveTickerBar: React.FC<LiveTickerBarProps> = ({
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

  const shouldRender = isShowing && enabledItems.length > 0;
  const containerRef = useRef<HTMLDivElement>(null);
  const [measuredWidth, setMeasuredWidth] = useState(1080);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !settings.fullWidth) return;
    const update = (w: number) => {
      const rounded = Math.round(w);
      if (rounded > 0) setMeasuredWidth((prev) => (Math.abs(prev - rounded) > 1 ? rounded : prev));
    };
    update(el.getBoundingClientRect().width);
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) update(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [shouldRender, settings.fullWidth]);

  const q = settings.qualityScale ?? 2;
  const baseH = 52;
  const userContentFactor = clamp((settings.contentScale ?? 105) / 100, 0.6, 2.2);
  const innerScale =
    settings.resizeMode === 'background-only'
      ? userContentFactor
      : clamp(settings.heightPx / baseH, 0.72, 2.4) * userContentFactor;

  const width = settings.fullWidth ? Math.round(measuredWidth) : Math.round(settings.widthPx * q);
  const vein = MANA_SIGNATURE_VEIN;
  const endStyle = settings.edgeStyle === 'angled' ? 'ragged' : 'clean';
  const poleH = Math.round(settings.heightPx * q);
  const padY = Math.round(7 * q);
  const totalH = poleH + padY * 2;

  const anchorText = settings.brandAnchorText.trim();
  const showAnchor = settings.showBrandAnchor && anchorText.length > 0;
  const plaqueW = showAnchor ? Math.round((anchorText.length * 12.4 + 58) * innerScale * q) : 0;
  const poleX0 = showAnchor ? Math.round(plaqueW * 0.6) : Math.round(3 * q);
  const lashings = showAnchor
    ? [plaqueW + Math.round(9 * q), width - Math.round(26 * q)]
    : [Math.round(24 * q), width - Math.round(26 * q)];
  const viewportLeft = showAnchor ? plaqueW + Math.round(22 * q) : Math.round(38 * q);

  const badgeSize = Math.round(
    clamp(24 * innerScale, 16, Math.max(18, settings.heightPx - 14)) * q
  );
  const labelPx = Math.round(clamp(11.5 * innerScale, 9, 26) * q);
  const textPx = Math.round(clamp(15 * innerScale, 11, 34) * q);
  const anchorFontPx = Math.round(clamp(13 * innerScale, 10, 28) * q);

  const bgAlpha = clamp(settings.bgOpacityPct ?? 96, 0, 100) / 100;
  const speedPxPerSec = settings.speedPxPerSec ?? 52;
  const measureKey = `${enabledItems.map((i) => `${i.id}:${i.label}:${i.highlight}`).join('|')}_${q}_${innerScale.toFixed(2)}_${width}`;

  const entranceV = useMemo(
    () => resolveTickerEntranceVariants(settings.entranceAnimation ?? 'swipe-up', reduce, q),
    [settings.entranceAnimation, reduce, q]
  );

  const renderSegment = (copyKey: string) => (
    <div className="flex items-center shrink-0">
      {enabledItems.map((item, idx) => {
        const theme = PLATFORM_THEMES[item.platform] ?? PLATFORM_THEMES.custom;
        const useMana = settings.veinColorMode === 'mana-blue';
        const glowRgb = useMana ? vein.accentRgb : theme.accentRgb;
        const labelColor = useMana ? vein.accentSoftHex : theme.accentSoftHex;

        return (
          <div
            key={`${copyKey}_${item.id}_${idx}`}
            className="flex items-center shrink-0 whitespace-nowrap"
          >
            <div
              className="relative flex items-center"
              style={{
                gap: Math.round(10 * q),
                padding: `0 ${Math.round(20 * q)}px`,
              }}
            >
              <PlatformBadge
                platform={item.platform}
                size={badgeSize}
                radius={Math.round(badgeSize * 0.28)}
              />

              {item.label.trim() && (
                <span
                  className="relative z-10 font-mana-display font-bold tracking-[0.14em] uppercase"
                  style={{
                    fontSize: labelPx,
                    color: labelColor,
                    textShadow: `0 0 ${Math.round(8 * q)}px rgba(${glowRgb}, 0.75), 0 ${Math.round(q)}px ${Math.round(q)}px rgba(0, 0, 0, 0.9)`,
                  }}
                >
                  {item.label}
                </span>
              )}

              {item.highlight.trim() && (
                <span
                  className="relative z-10 font-mana-body font-bold"
                  style={{
                    fontSize: textPx,
                    color: WOOD.parchment,
                    textShadow: `0 ${Math.round(q)}px 0 rgba(8, 5, 11, 0.95), 0 0 ${Math.round(
                      10 * q
                    )}px rgba(0, 0, 0, 0.6)`,
                  }}
                >
                  {item.highlight}
                </span>
              )}
            </div>

            <BranchRune
              color={vein.accentSoftHex}
              className="shrink-0"
              style={{
                width: Math.round(9 * innerScale * q),
                height: Math.round(13 * innerScale * q),
                filter: `drop-shadow(0 0 ${Math.round(5 * q)}px rgba(${vein.accentRgb}, 0.95))`,
              }}
            />
          </div>
        );
      })}
    </div>
  );

  const inner = (
    <div
      ref={containerRef}
      className={`relative select-none mc-crisp-overlay ${settings.fullWidth ? 'w-full' : ''} ${className}`}
      style={{
        width: settings.fullWidth ? undefined : `${width}px`,
        height: `${totalH}px`,
      }}
    >
      <AnimatePresence mode="wait">
        {shouldRender && (
          <motion.div
            key={`wood_ticker_${settings.entranceAnimation}_${playNonce}`}
            variants={entranceV}
            initial="hidden"
            animate="show"
            exit="exit"
            className="relative w-full h-full"
            style={{
              filter:
                bgAlpha > 0.05
                  ? `drop-shadow(0 ${Math.round(8 * q)}px ${Math.round(12 * q)}px rgba(0, 0, 0, ${(
                      0.7 * bgAlpha
                    ).toFixed(3)}))`
                  : undefined,
              transformOrigin: 'center center',
            }}
          >
            {bgAlpha > 0.005 && (
              <div className="pointer-events-none absolute inset-0" style={{ opacity: bgAlpha }}>
                <ManaWoodPlank
                  width={width}
                  height={totalH}
                  x0={poleX0}
                  y0={padY}
                  x1={width - Math.round(3 * q)}
                  y1={padY + poleH}
                  seed={POLE_SEED}
                  shading="pole"
                  veinHex={vein.accentHex}
                  veinSoftHex={vein.accentSoftHex}
                  showVeins={settings.showWoodVeins}
                  endStyle={endStyle}
                  lashings={lashings}
                  veinQuietZone={[viewportLeft, width - Math.round(38 * q)]}
                />
              </div>
            )}

            <div
              className="pointer-events-none absolute overflow-hidden"
              style={{
                left: viewportLeft,
                right: Math.round(38 * q),
                top: padY,
                height: poleH,
              }}
            >
              <BarBackgroundPatternLayer
                pattern={settings.bgPattern ?? 'logos'}
                opacityPct={settings.patternOpacityPct ?? 60}
                qualityScale={q}
                barHeightPx={poleH}
                tickerPlatforms={uniquePlatforms}
                surface="wood"
              />
            </div>

            {showAnchor && (
              <div
                className="absolute left-0 top-0"
                style={{ width: plaqueW + Math.round(4 * q), height: totalH }}
              >
                <ManaWoodPlank
                  width={plaqueW + Math.round(4 * q)}
                  height={totalH}
                  x0={Math.round(2 * q)}
                  y0={Math.round(1.5 * q)}
                  x1={plaqueW}
                  y1={totalH - Math.round(1.5 * q)}
                  seed={PLAQUE_SEED}
                  veinHex={vein.accentHex}
                  veinSoftHex={vein.accentSoftHex}
                  showVeins={settings.showWoodVeins}
                  endStyle={endStyle}
                />
                <div
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ gap: Math.round(8 * q) }}
                >
                  <BranchRune
                    color={vein.accentSoftHex}
                    className="shrink-0"
                    style={{
                      width: Math.round(10 * innerScale * q),
                      height: Math.round(14 * innerScale * q),
                      filter: `drop-shadow(0 0 ${Math.round(5 * q)}px rgba(${vein.accentRgb}, 0.95))`,
                    }}
                  />
                  <span
                    className="font-mana-display font-black tracking-[0.16em] uppercase whitespace-nowrap"
                    style={{
                      fontSize: anchorFontPx,
                      color: WOOD.parchment,
                      textShadow: `0 ${Math.round(2 * q)}px 0 rgba(8, 5, 11, 0.95), 0 0 ${Math.round(
                        12 * q
                      )}px rgba(${vein.accentRgb}, 0.45)`,
                    }}
                  >
                    {anchorText}
                  </span>
                </div>
              </div>
            )}

            <div
              className="absolute flex items-center overflow-hidden"
              style={{
                left: viewportLeft,
                right: Math.round(38 * q),
                top: padY,
                height: poleH,
              }}
            >
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
    </div>
  );

  if (scale !== 1) {
    return (
      <div
        className="relative overflow-visible"
        style={{
          width: settings.fullWidth ? '100%' : `${Math.round(width * scale)}px`,
          height: `${Math.round(totalH * scale)}px`,
        }}
      >
        <div
          style={{
            width: settings.fullWidth ? `${(100 / scale).toFixed(2)}%` : `${width}px`,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          {inner}
        </div>
      </div>
    );
  }

  return inner;
};
