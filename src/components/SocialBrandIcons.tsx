'use client';

import React from 'react';
import { SocialPlatform, VeinColorMode } from '../types/broadcastBars';

export interface PlatformVisualTheme {
  id: SocialPlatform;
  name: string;
  accentHex: string;
  accentSoftHex: string;
  accentRgb: string;
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
    accentHex: '#38bdf8',
    accentSoftHex: '#bae6fd',
    accentRgb: '56, 189, 248',
    badgeBg: 'rgba(56, 189, 248, 0.16)',
    badgeText: '#e0f2fe',
    badgeBorder: 'rgba(56, 189, 248, 0.52)',
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
 * WhatsApp, Discord, Mana-Flasche (buyback), and Custom links.
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
            strokeWidth="2.2"
          />
          <circle cx="12" cy="12" r="4.35" stroke={color} strokeWidth="2.2" />
          <circle cx="17.35" cy="6.65" r="1.3" fill={color} />
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
      // Uses exact pixel-accurate mask extracted from the user's official WhatsApp logo
      return (
        <span
          aria-hidden="true"
          className={`inline-block ${className}`}
          style={{
            backgroundColor: color,
            maskImage: 'url(/images/logos/mask-whatsapp.png)',
            WebkitMaskImage: 'url(/images/logos/mask-whatsapp.png)',
            maskSize: 'contain',
            WebkitMaskSize: 'contain',
            maskRepeat: 'no-repeat',
            WebkitMaskRepeat: 'no-repeat',
            maskPosition: 'center',
            WebkitMaskPosition: 'center',
          }}
        />
      );

    case 'discord':
      // Uses exact pixel-accurate mask extracted from the user's official Discord logo
      return (
        <span
          aria-hidden="true"
          className={`inline-block ${className}`}
          style={{
            backgroundColor: color,
            maskImage: 'url(/images/logos/mask-discord.png)',
            WebkitMaskImage: 'url(/images/logos/mask-discord.png)',
            maskSize: 'contain',
            WebkitMaskSize: 'contain',
            maskRepeat: 'no-repeat',
            WebkitMaskRepeat: 'no-repeat',
            maskPosition: 'center',
            WebkitMaskPosition: 'center',
          }}
        />
      );

    case 'buyback':
      // Crisp 2D Mana-Flasche vector emblem matching public/images/logos/mana-bottle.png
      return (
        <svg viewBox="0 0 100 100" fill="none" className={className} aria-hidden="true">
          {/* Tapered wooden cork */}
          <path d="M42 7h16l-1.8 11.5H43.8L42 7Z" fill={color} />
          {/* Flared glass rim */}
          <rect x="35" y="19.5" width="30" height="6.2" rx="3.1" fill={color} />
          {/* Double rope neck wrap */}
          <rect x="38.5" y="27.4" width="23" height="3.1" rx="1.55" fill={color} />
          <rect x="39" y="31.7" width="22" height="3.1" rx="1.55" fill={color} />
          {/* Concave glass neck flaring cleanly into spherical flask */}
          <path
            d="M42.5 36.5C42.5 41.2 41.6 43.8 40.5 45.4a24.5 24.5 0 1 0 19 0c-1.1-1.6-2-4.2-2-8.9"
            stroke={color}
            strokeWidth="6.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Swirling asymmetric 2D mana liquid fill inside the lower bulb */}
          <path
            d="M31.9 66.2C39.8 60.2 47.6 70.4 55.8 64.2C60.6 60.6 64.4 60.6 67.2 62.1A18.2 18.2 0 1 1 31.9 66.2Z"
            fill={color}
          />
          {/* Subtle inner glass highlight arc (upper-left) */}
          <path
            d="M37.2 57.2a15.2 15.2 0 0 1 7.6-5.6"
            stroke={color}
            strokeWidth="3.2"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'custom':
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <circle cx="12" cy="12" r="8.5" stroke={color} strokeWidth="2" />
          <path
            d="M3.8 12h16.4M12 3.5c2.6 2.3 3.9 5.2 3.9 8.5s-1.3 6.2-3.9 8.5c-2.6-2.3-3.9-5.2-3.9-8.5S9.4 5.8 12 3.5Z"
            stroke={color}
            strokeWidth="1.8"
          />
        </svg>
      );
  }
};

interface FlatCategoryWatermarkProps {
  platform: SocialPlatform;
  /** Rendered pixel size (typically 150%–185% of bar height for bold cropped look) */
  size: number;
  /** Surface tone: 'charcoal' for Whatnot HUD cards, 'wood' for ManaCards timber */
  surface?: 'charcoal' | 'wood';
  /** Gentle diagonal angle matching reference screenshot (default 14deg clockwise) */
  rotateDeg?: number;
  className?: string;
}

/**
 * Clean, flat 2D tonal background silhouette matching the user's reference bars:
 * zero fake 3D bevels or blur — just a crisp oversized darker-charcoal 2D plane
 * cropped cleanly along the right side of the card.
 */
export const EmbossedCategoryWatermark: React.FC<FlatCategoryWatermarkProps> = ({
  platform,
  size,
  surface = 'charcoal',
  rotateDeg = 14,
  className = '',
}) => {
  const flatTone =
    surface === 'wood' ? 'rgba(9, 5, 14, 0.56)' : 'rgba(9, 10, 14, 0.58)';

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none select-none relative shrink-0 flex items-center justify-center ${className}`}
      style={{
        width: size,
        height: size,
        transform: rotateDeg !== 0 ? `rotate(${rotateDeg}deg)` : undefined,
      }}
    >
      <SocialBrandIcon platform={platform} color={flatTone} className="w-full h-full" />
    </div>
  );
};
