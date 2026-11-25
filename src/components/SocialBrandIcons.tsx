'use client';

import React from 'react';
import { SocialPlatform, VeinColorMode } from '../types/broadcastBars';

export interface PlatformVisualTheme {
  id: SocialPlatform;
  name: string;
  /** Primary signature brand hex */
  accentHex: string;
  /** Secondary highlight hex for gradients & vein core */
  accentSoftHex: string;
  /** RGB string for rgba() glows */
  accentRgb: string;
  /** Subtle badge background/text/border styling */
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
}

export const MANA_SIGNATURE_VEIN = {
  accentHex: '#3fb6ff',
  accentSoftHex: '#dff5ff',
  accentRgb: '63, 182, 255',
};

export const PLATFORM_THEMES: Record<SocialPlatform, PlatformVisualTheme> = {
  instagram: {
    id: 'instagram',
    name: 'Instagram',
    accentHex: '#f43f5e',
    accentSoftHex: '#fda4af',
    accentRgb: '244, 63, 94',
    badgeBg: 'rgba(244, 63, 94, 0.14)',
    badgeText: '#fecdd3',
    badgeBorder: 'rgba(244, 63, 94, 0.45)',
  },
  tiktok: {
    id: 'tiktok',
    name: 'TikTok',
    accentHex: '#25f4ee',
    accentSoftHex: '#a5f3fc',
    accentRgb: '37, 244, 238',
    badgeBg: 'rgba(37, 244, 238, 0.12)',
    badgeText: '#cffafe',
    badgeBorder: 'rgba(37, 244, 238, 0.42)',
  },
  whatnot: {
    id: 'whatnot',
    name: 'Whatnot',
    accentHex: '#facc15',
    accentSoftHex: '#fef08a',
    accentRgb: '250, 204, 21',
    badgeBg: 'rgba(250, 204, 21, 0.14)',
    badgeText: '#fef9c3',
    badgeBorder: 'rgba(250, 204, 21, 0.48)',
  },
  buyback: {
    id: 'buyback',
    name: 'Kartenankauf',
    accentHex: '#f59e0b',
    accentSoftHex: '#fde68a',
    accentRgb: '245, 158, 11',
    badgeBg: 'rgba(245, 158, 11, 0.16)',
    badgeText: '#fef3c7',
    badgeBorder: 'rgba(251, 191, 36, 0.52)',
  },
  whatsapp: {
    id: 'whatsapp',
    name: 'WhatsApp',
    accentHex: '#25d366',
    accentSoftHex: '#86efac',
    accentRgb: '37, 211, 102',
    badgeBg: 'rgba(37, 211, 102, 0.14)',
    badgeText: '#dcfce7',
    badgeBorder: 'rgba(37, 211, 102, 0.45)',
  },
  discord: {
    id: 'discord',
    name: 'Discord',
    accentHex: '#7289ff',
    accentSoftHex: '#c7d2fe',
    accentRgb: '114, 137, 255',
    badgeBg: 'rgba(88, 101, 242, 0.2)',
    badgeText: '#e0e7ff',
    badgeBorder: 'rgba(129, 140, 248, 0.5)',
  },
  custom: {
    id: 'custom',
    name: 'ManaCards / Info',
    accentHex: '#38bdf8',
    accentSoftHex: '#bae6fd',
    accentRgb: '56, 189, 248',
    badgeBg: 'rgba(56, 189, 248, 0.14)',
    badgeText: '#e0f2fe',
    badgeBorder: 'rgba(56, 189, 248, 0.45)',
  },
};

export function resolveVeinPalette(platform: SocialPlatform, mode: VeinColorMode) {
  if (mode === 'mana-blue') {
    return MANA_SIGNATURE_VEIN;
  }
  const t = PLATFORM_THEMES[platform] ?? PLATFORM_THEMES.custom;
  return {
    accentHex: t.accentHex,
    accentSoftHex: t.accentSoftHex,
    accentRgb: t.accentRgb,
  };
}

interface SocialBrandIconProps {
  platform: SocialPlatform;
  className?: string;
  color?: string;
}

/**
 * Crisp geometric vector brand marks for Instagram, TikTok, Whatnot,
 * WhatsApp, Discord, Kartenankauf (TCG Buyback), and Custom links.
 */
export const SocialBrandIcon: React.FC<SocialBrandIconProps> = ({
  platform,
  className = 'w-6 h-6',
  color = 'currentColor',
}) => {
  switch (platform) {
    case 'instagram':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <rect
            x="2.75"
            y="2.75"
            width="18.5"
            height="18.5"
            rx="5.25"
            stroke={color}
            strokeWidth="2.1"
          />
          <circle cx="12" cy="12" r="4.35" stroke={color} strokeWidth="2.1" />
          <circle cx="17.35" cy="6.65" r="1.25" fill={color} />
        </svg>
      );

    case 'tiktok':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <path
            d="M16.8 6.45A4.65 4.65 0 0 1 15.4 3.2h-2.95v12.1a2.7 2.7 0 1 1-2.7-2.7c.28 0 .55.04.8.12V9.7a5.65 5.65 0 1 0 4.85 5.6V9.14a7.5 7.5 0 0 0 4.4 1.42V7.65a4.68 4.68 0 0 1-3-1.2Z"
            fill={color}
          />
        </svg>
      );

    case 'whatnot':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <path
            d="M3.6 6.4 7.7 17.6 12 9.6l4.3 8L20.4 6.4"
            stroke={color}
            strokeWidth="3.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case 'whatsapp':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <path
            d="M20.2 11.75A8.2 8.2 0 0 1 8.15 19l-4.25 1.1 1.15-4.12A8.2 8.2 0 1 1 20.2 11.75Z"
            stroke={color}
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M9.6 8.85c-.22-.48-.46-.49-.68-.5h-.58c-.2 0-.52.08-.8.38-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.06 3.3 5.1 4.49 2.52.99 3.04.8 3.58.74.55-.05 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.95 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.48-1.76-1.66-2.06-.17-.3-.02-.46.13-.61.14-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.66-1.63-.92-2.22Z"
            fill={color}
          />
        </svg>
      );

    case 'discord':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <path
            d="M19.54 5.34A16.4 16.4 0 0 0 15.5 4.1a11.3 11.3 0 0 0-.51 1.06 15.1 15.1 0 0 0-5.98 0A11.3 11.3 0 0 0 8.5 4.1a16.4 16.4 0 0 0-4.04 1.24C1.9 9.18 1.2 12.92 1.55 16.61a16.6 16.6 0 0 0 4.95 2.51c.4-.55.76-1.13 1.06-1.74-.58-.22-1.14-.49-1.67-.8.14-.1.28-.21.41-.32 3.22 1.5 6.72 1.5 9.9 0 .14.11.27.22.41.32-.53.31-1.09.58-1.67.8.3.61.66 1.19 1.06 1.74a16.6 16.6 0 0 0 4.95-2.51c.41-4.28-.7-7.99-2.41-11.27ZM8.85 14.34c-.96 0-1.75-.89-1.75-1.98s.77-1.98 1.75-1.98c.98 0 1.77.89 1.75 1.98 0 1.09-.77 1.98-1.75 1.98Zm6.3 0c-.96 0-1.75-.89-1.75-1.98s.77-1.98 1.75-1.98c.98 0 1.77.89 1.75 1.98 0 1.09-.77 1.98-1.75 1.98Z"
            fill={color}
          />
        </svg>
      );

    case 'buyback':
      // Crisp monochrome Mana-Flasche silhouette (tilted round potion bottle, cork & liquid wave)
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <g transform="rotate(14 12 12)">
            {/* Cork stopper */}
            <path
              d="M9.7 2.2h4.6l-.45 2.7h-3.7L9.7 2.2Z"
              fill={color}
            />
            {/* Lip & rope collar */}
            <rect x="8.6" y="4.9" width="6.8" height="1.5" rx="0.75" fill={color} />
            <rect x="9.4" y="6.8" width="5.2" height="1.15" rx="0.55" fill={color} opacity="0.85" />
            {/* Neck + round potion flask */}
            <path
              d="M10.1 8.1v2.25a6.65 6.65 0 1 0 3.8 0V8.1"
              stroke={color}
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Mana liquid wave inside the round flask */}
            <path
              d="M6.85 15.1c1.3-1.05 2.7-1.05 4.2 0 1.45 1 2.9 1 4.4-.15.65-.48 1.2-.55 1.7-.35a5.25 5.25 0 0 1-10.3.5Z"
              fill={color}
              opacity="0.72"
            />
          </g>
        </svg>
      );

    case 'custom':
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <circle cx="12" cy="12" r="8.5" stroke={color} strokeWidth="1.9" />
          <path
            d="M3.8 12h16.4M12 3.5c2.6 2.3 3.9 5.2 3.9 8.5s-1.3 6.2-3.9 8.5c-2.6-2.3-3.9-5.2-3.9-8.5S9.4 5.8 12 3.5Z"
            stroke={color}
            strokeWidth="1.7"
          />
        </svg>
      );
  }
};

interface EmbossedCategoryWatermarkProps {
  platform: SocialPlatform;
  /** Size in rendered px */
  size: number;
  /** Render scale (1, 1.5, 2) so bevel offset stays razor-sharp at HiDPI */
  qualityScale?: number;
  /** Surface tone: 'charcoal' for Whatnot HUD cards, 'wood' for ManaCards timber */
  surface?: 'charcoal' | 'wood';
  /** Subtle tilt angle in degrees (default -11) */
  rotateDeg?: number;
  className?: string;
}

/**
 * Tactile monochrome blind-debossed / pressed-in category mark for card & ticker backgrounds.
 * Uses 3 crisp offset vector layers (top-left recess shadow, bottom-right catch-light rim,
 * recessed matte core) — zero CSS blur so OBS CEF keeps razor-sharp edges.
 */
export const EmbossedCategoryWatermark: React.FC<EmbossedCategoryWatermarkProps> = ({
  platform,
  size,
  qualityScale = 2,
  surface = 'charcoal',
  rotateDeg = -11,
  className = '',
}) => {
  const bevel = Math.max(1, Math.round(1.25 * qualityScale * 10) / 10);
  const highlightColor =
    surface === 'wood' ? 'rgba(225, 200, 245, 0.13)' : 'rgba(255, 255, 255, 0.15)';
  const shadowColor =
    surface === 'wood' ? 'rgba(4, 2, 7, 0.72)' : 'rgba(0, 0, 0, 0.68)';
  const coreColor =
    surface === 'wood' ? 'rgba(10, 6, 15, 0.48)' : 'rgba(12, 10, 13, 0.46)';

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none select-none relative shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        transform: rotateDeg !== 0 ? `rotate(${rotateDeg}deg)` : undefined,
      }}
    >
      {/* 1. Bottom-right overhead catch-light lip of the recessed stamp */}
      <div
        className="absolute inset-0"
        style={{ transform: `translate(${bevel}px, ${bevel}px)` }}
      >
        <SocialBrandIcon platform={platform} color={highlightColor} className="w-full h-full" />
      </div>

      {/* 2. Top-left deep recess shadow inside the stamped bevel */}
      <div
        className="absolute inset-0"
        style={{ transform: `translate(-${bevel}px, -${bevel}px)` }}
      >
        <SocialBrandIcon platform={platform} color={shadowColor} className="w-full h-full" />
      </div>

      {/* 3. Matte monochrome recessed body */}
      <div className="absolute inset-0">
        <SocialBrandIcon platform={platform} color={coreColor} className="w-full h-full" />
      </div>
    </div>
  );
};
