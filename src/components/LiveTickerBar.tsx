'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { TickerBarSettings, TickerItem, TickerSpeed } from '../types/broadcastBars';
import { MANA_SIGNATURE_VEIN, PLATFORM_THEMES, SocialBrandIcon } from './SocialBrandIcons';
import { BranchRune, ManaWoodPlank, WOOD } from './ManaWoodPlank';

interface LiveTickerBarProps {
  items: TickerItem[];
  settings: TickerBarSettings;
  className?: string;
}

const SPEED_SECONDS_PER_ITEM: Record<TickerSpeed, number> = {
  slow: 7.5,
  normal: 5.2,
  fast: 3.4,
};

const POLE_SEED = 2718;
const PLAQUE_SEED = 1618;

export const LiveTickerBar: React.FC<LiveTickerBarProps> = ({
  items,
  settings,
  className = '',
}) => {
  const enabledItems = useMemo(
    () => items.filter((it) => it.enabled && (it.label.trim() || it.highlight.trim())),
    [items]
  );

  // Ensure enough content so the seamless -50% marquee always fills wide OBS canvases
  const repeatedTrack = useMemo(() => {
    if (enabledItems.length >= 4) return enabledItems;
    return [...enabledItems, ...enabledItems];
  }, [enabledItems]);

  const isShown = settings.visible && enabledItems.length > 0;
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(1080);

  // The log is generated at its real pixel width, so measure the container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = (w: number) => {
      const rounded = Math.round(w);
      if (rounded > 0) setWidth((prev) => (Math.abs(prev - rounded) > 1 ? rounded : prev));
    };
    update(el.getBoundingClientRect().width);
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) update(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [isShown]);

  if (!isShown) {
    return null;
  }

  const vein = MANA_SIGNATURE_VEIN;
  const endStyle = settings.edgeStyle === 'angled' ? 'ragged' : 'clean';
  const poleH = settings.heightPx;
  const padY = 7;
  const totalH = poleH + padY * 2;
  const compactText = poleH < 46;

  const anchorText = settings.brandAnchorText.trim();
  const showAnchor = settings.showBrandAnchor && anchorText.length > 0;
  const plaqueW = showAnchor ? Math.round(anchorText.length * 12.4 + 58) : 0;
  const poleX0 = showAnchor ? Math.round(plaqueW * 0.6) : 3;
  const lashings = showAnchor ? [plaqueW + 9, width - 26] : [24, width - 26];
  const viewportLeft = showAnchor ? plaqueW + 22 : 38;

  const durationSec = Math.max(
    14,
    Math.round(repeatedTrack.length * SPEED_SECONDS_PER_ITEM[settings.speed])
  );

  const renderSegment = (copyKey: string) => (
    <div className="flex items-center shrink-0">
      {repeatedTrack.map((item, idx) => {
        const theme = PLATFORM_THEMES[item.platform] ?? PLATFORM_THEMES.custom;
        const useMana = settings.veinColorMode === 'mana-blue';
        const glowRgb = useMana ? vein.accentRgb : theme.accentRgb;
        const iconColor = useMana ? WOOD.parchment : theme.accentSoftHex;
        const labelColor = useMana ? vein.accentSoftHex : theme.accentSoftHex;

        return (
          <div
            key={`${copyKey}_${item.id}_${idx}`}
            className="flex items-center shrink-0 whitespace-nowrap"
          >
            <div className="flex items-center gap-2.5 px-5">
              <span
                className="flex items-center justify-center shrink-0"
                style={{
                  filter: `drop-shadow(0 0 5px rgba(${glowRgb}, 0.9)) drop-shadow(0 1px 1px rgba(0, 0, 0, 0.85))`,
                }}
              >
                <SocialBrandIcon
                  platform={item.platform}
                  color={iconColor}
                  className={compactText ? 'w-4 h-4' : 'w-[18px] h-[18px]'}
                />
              </span>

              {item.label.trim() && (
                <span
                  className="font-mana-display text-[11.5px] font-bold tracking-[0.14em] uppercase"
                  style={{
                    color: labelColor,
                    textShadow: `0 0 8px rgba(${glowRgb}, 0.75), 0 1px 1px rgba(0, 0, 0, 0.9)`,
                  }}
                >
                  {item.label}
                </span>
              )}

              {item.highlight.trim() && (
                <span
                  className={`font-mana-body font-bold ${compactText ? 'text-[13.5px]' : 'text-[15px]'}`}
                  style={{
                    color: WOOD.parchment,
                    textShadow: '0 1px 0 rgba(8, 5, 11, 0.95), 0 0 10px rgba(0, 0, 0, 0.6)',
                  }}
                >
                  {item.highlight}
                </span>
              )}
            </div>

            <BranchRune
              color={vein.accentSoftHex}
              className="w-[9px] h-[13px] shrink-0"
              style={{ filter: `drop-shadow(0 0 5px rgba(${vein.accentRgb}, 0.95))` }}
            />
          </div>
        );
      })}
    </div>
  );

  return (
    <div
      ref={containerRef}
      className={`relative w-full select-none ${className}`}
      style={{
        height: `${totalH}px`,
        filter: `drop-shadow(0 8px 12px rgba(0, 0, 0, 0.7)) drop-shadow(0 0 12px rgba(${vein.accentRgb}, 0.16))`,
      }}
    >
      {/* Long lashed log pole */}
      <ManaWoodPlank
        width={width}
        height={totalH}
        x0={poleX0}
        y0={padY}
        x1={width - 3}
        y1={padY + poleH}
        seed={POLE_SEED}
        shading="pole"
        veinHex={vein.accentHex}
        veinSoftHex={vein.accentSoftHex}
        showVeins={settings.showWoodVeins}
        endStyle={endStyle}
        lashings={lashings}
        veinQuietZone={[viewportLeft, width - 38]}
      />

      {/* Carved ManaCards name plaque bound to the pole */}
      {showAnchor && (
        <div
          className="absolute left-0 top-0"
          style={{ width: plaqueW + 4, height: totalH }}
        >
          <ManaWoodPlank
            width={plaqueW + 4}
            height={totalH}
            x0={2}
            y0={1.5}
            x1={plaqueW}
            y1={totalH - 1.5}
            seed={PLAQUE_SEED}
            veinHex={vein.accentHex}
            veinSoftHex={vein.accentSoftHex}
            showVeins={settings.showWoodVeins}
            endStyle={endStyle}
          />
          <div className="absolute inset-0 flex items-center justify-center gap-2">
            <BranchRune
              color={vein.accentSoftHex}
              className="w-[10px] h-[14px] shrink-0"
              style={{ filter: `drop-shadow(0 0 5px rgba(${vein.accentRgb}, 0.95))` }}
            />
            <span
              className="font-mana-display text-[13px] font-black tracking-[0.16em] uppercase whitespace-nowrap"
              style={{
                color: WOOD.parchment,
                textShadow: `0 2px 0 rgba(8, 5, 11, 0.95), 0 0 12px rgba(${vein.accentRgb}, 0.45)`,
              }}
            >
              {anchorText}
            </span>
          </div>
        </div>
      )}

      {/* Seamless compositor-driven marquee across the log */}
      <div
        className="absolute flex items-center overflow-hidden"
        style={{
          left: viewportLeft,
          right: 38,
          top: padY,
          height: poleH,
          maskImage: 'linear-gradient(90deg, transparent 0%, #000 5%, #000 95%, transparent 100%)',
          WebkitMaskImage:
            'linear-gradient(90deg, transparent 0%, #000 5%, #000 95%, transparent 100%)',
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
