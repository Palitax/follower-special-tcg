'use client';

import React, { useMemo } from 'react';
import { TickerBarSettings, TickerItem, TickerSpeed } from '../types/broadcastBars';
import {
  MANA_SIGNATURE_VEIN,
  PLATFORM_THEMES,
  SocialBrandIcon,
} from './SocialBrandIcons';
import { ManaWoodTexture } from './ManaWoodTexture';

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

export const LiveTickerBar: React.FC<LiveTickerBarProps> = ({
  items,
  settings,
  className = '',
}) => {
  const enabledItems = useMemo(
    () => items.filter((it) => it.enabled && (it.label.trim() || it.highlight.trim())),
    [items]
  );

  // Ensure enough content length so seamless -50% marquee always fills wide OBS canvases
  const repeatedTrack = useMemo(() => {
    if (enabledItems.length >= 4) return enabledItems;
    return [...enabledItems, ...enabledItems];
  }, [enabledItems]);

  if (!settings.visible || enabledItems.length === 0) {
    return null;
  }

  const durationSec = Math.max(
    14,
    Math.round(repeatedTrack.length * SPEED_SECONDS_PER_ITEM[settings.speed])
  );

  const vein = MANA_SIGNATURE_VEIN;
  const isAngled = settings.edgeStyle === 'angled';

  const renderSegment = (copyKey: string) => (
    <div className="flex items-center shrink-0">
      {repeatedTrack.map((item, idx) => {
        const theme = PLATFORM_THEMES[item.platform] ?? PLATFORM_THEMES.custom;
        const iconColor =
          settings.veinColorMode === 'mana-blue' ? vein.accentSoftHex : theme.accentHex;
        const labelColor =
          settings.veinColorMode === 'mana-blue' ? vein.accentSoftHex : theme.accentSoftHex;

        return (
          <div
            key={`${copyKey}_${item.id}_${idx}`}
            className="flex items-center shrink-0 whitespace-nowrap"
          >
            <div className="flex items-center gap-2.5 px-5">
              <span
                className="flex items-center justify-center shrink-0"
                style={{
                  filter: `drop-shadow(0 0 7px rgba(${
                    settings.veinColorMode === 'mana-blue' ? vein.accentRgb : theme.accentRgb
                  }, 0.72))`,
                }}
              >
                <SocialBrandIcon
                  platform={item.platform}
                  color={iconColor}
                  className="w-4 h-4"
                />
              </span>

              {item.label.trim() && (
                <span
                  className="text-[11px] font-black uppercase tracking-[0.18em]"
                  style={{ color: labelColor }}
                >
                  {item.label}
                </span>
              )}

              {item.highlight.trim() && (
                <span className="text-[13.5px] font-bold tracking-[-0.01em] text-white">
                  {item.highlight}
                </span>
              )}
            </div>

            {/* Minimalist glowing diamond separator */}
            <span
              className="inline-block w-1.5 h-1.5 rotate-45 shrink-0 opacity-85"
              style={{
                backgroundColor: vein.accentHex,
                boxShadow: `0 0 8px rgba(${vein.accentRgb}, 0.9)`,
              }}
              aria-hidden="true"
            />
          </div>
        );
      })}
    </div>
  );

  return (
    <div
      className={`relative w-full flex items-stretch overflow-hidden select-none ${className}`}
      style={{
        height: `${settings.heightPx}px`,
        clipPath: isAngled
          ? 'polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0 100%)'
          : undefined,
        borderTop: `1px solid rgba(${vein.accentRgb}, 0.45)`,
        borderBottom: `1px solid rgba(${vein.accentRgb}, 0.35)`,
        backgroundColor: '#130e19',
        boxShadow: `0 10px 26px rgba(0, 0, 0, 0.72), 0 0 16px rgba(${vein.accentRgb}, 0.16)`,
      }}
    >
      {/* ManaCards Wood-Grain & Glowing Veins Backing */}
      <ManaWoodTexture
        veinHex={vein.accentHex}
        veinSoftHex={vein.accentSoftHex}
        showVeins={settings.showWoodVeins}
        variant="ticker"
      />

      {/* Subtle readability gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(180deg, rgba(10, 7, 15, 0.36) 0%, rgba(10, 7, 15, 0.24) 50%, rgba(10, 7, 15, 0.44) 100%)',
        }}
      />

      {/* Optional Sharp Left Brand Anchor */}
      {settings.showBrandAnchor && settings.brandAnchorText.trim() && (
        <div
          className="relative z-20 shrink-0 flex items-center gap-2 px-4 bg-[#110c17]/95"
          style={{
            borderRight: `2px solid ${vein.accentHex}`,
            boxShadow: `6px 0 18px rgba(0, 0, 0, 0.65), 0 0 12px rgba(${vein.accentRgb}, 0.45)`,
          }}
        >
          <span
            className="w-2 h-2 shrink-0"
            style={{
              backgroundColor: vein.accentHex,
              boxShadow: `0 0 10px rgba(${vein.accentRgb}, 0.95)`,
            }}
          />
          <span className="text-[11px] font-black uppercase tracking-[0.22em] text-white whitespace-nowrap">
            {settings.brandAnchorText}
          </span>
        </div>
      )}

      {/* Masked Compositor-Driven Seamless Marquee Viewport */}
      <div
        className="relative z-10 flex-1 min-w-0 flex items-center overflow-hidden"
        style={{
          maskImage:
            'linear-gradient(90deg, transparent 0%, #000 4%, #000 96%, transparent 100%)',
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
