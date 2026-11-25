'use client';

import React, { useId } from 'react';

interface ManaWoodTextureProps {
  /** Accent hex for the glowing mana vein glow */
  veinHex: string;
  /** Soft core hex for the inner glowing filament */
  veinSoftHex: string;
  /** Toggle glowing mana fissures while keeping dark wood grain */
  showVeins: boolean;
  /** Layout variant adjusts vein geometry for wide bar, square emblem, or slim ticker */
  variant: 'bar' | 'icon' | 'ticker';
}

/**
 * Procedural SVG ManaCards dark arcane wood-grain + glowing mana veins ("Holzadern").
 * Inspired directly by the ManaCards dark plum-mahogany timber & cyan energy fissures,
 * distilled into sharp, minimalist broadcast geometry so text remains crisp on mobile portrait streams.
 */
export const ManaWoodTexture: React.FC<ManaWoodTextureProps> = ({
  veinHex,
  veinSoftHex,
  showVeins,
  variant,
}) => {
  const uid = useId().replace(/:/g, '');
  const glowId = `mc-vein-glow-${uid}`;
  const woodGradId = `mc-wood-bg-${uid}`;

  if (variant === 'icon') {
    return (
      <svg
        viewBox="0 0 80 80"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full pointer-events-none select-none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={woodGradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#261b2e" />
            <stop offset="52%" stopColor="#191220" />
            <stop offset="100%" stopColor="#120c17" />
          </linearGradient>
          <filter id={glowId} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2.4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect width="80" height="80" fill={`url(#${woodGradId})`} />

        {/* Subtle vertical arcane bark grain */}
        <g stroke="#4b3556" strokeOpacity="0.34" fill="none" strokeWidth="1">
          <path d="M10 0 C12 22, 8 48, 11 80" />
          <path d="M24 0 C22 26, 26 52, 23 80" />
          <path d="M56 0 C59 28, 54 54, 58 80" />
          <path d="M70 0 C68 24, 72 56, 69 80" />
        </g>
        <g stroke="#09060d" strokeOpacity="0.62" fill="none" strokeWidth="1.2">
          <path d="M16 0 C18 30, 14 54, 17 80" />
          <path d="M64 0 C61 28, 65 52, 62 80" />
        </g>

        {/* Minimalist corner mana vein cracks (kept off-center so brand icon stays sharp) */}
        {showVeins && (
          <g filter={`url(#${glowId})`} fill="none" strokeLinecap="round">
            <path
              d="M4 14 L14 21 L18 17 M14 21 L16 32"
              stroke={veinHex}
              strokeWidth="2.1"
              strokeOpacity="0.8"
              className="mc-vein-pulse"
            />
            <path
              d="M4 14 L14 21 L18 17 M14 21 L16 32"
              stroke={veinSoftHex}
              strokeWidth="0.85"
              strokeOpacity="0.95"
            />
            <path
              d="M76 62 L65 56 L62 64"
              stroke={veinHex}
              strokeWidth="1.8"
              strokeOpacity="0.72"
              className="mc-vein-pulse-delayed"
            />
            <path
              d="M76 62 L65 56 L62 64"
              stroke={veinSoftHex}
              strokeWidth="0.75"
              strokeOpacity="0.9"
            />
          </g>
        )}
      </svg>
    );
  }

  if (variant === 'ticker') {
    return (
      <svg
        viewBox="0 0 1200 60"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full pointer-events-none select-none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={woodGradId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#181120" />
            <stop offset="35%" stopColor="#23182b" />
            <stop offset="70%" stopColor="#1a1221" />
            <stop offset="100%" stopColor="#140e1a" />
          </linearGradient>
          <filter id={glowId} x="-10%" y="-60%" width="120%" height="220%">
            <feGaussianBlur stdDeviation="2.1" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect width="1200" height="60" fill={`url(#${woodGradId})`} />

        {/* Horizontal dark wood-grain striations */}
        <g stroke="#4b3556" strokeOpacity="0.28" fill="none" strokeWidth="1.1">
          <path d="M0 9 Q280 5, 580 11 T1200 8" />
          <path d="M0 19 Q340 24, 670 17 T1200 21" />
          <path d="M0 41 Q310 36, 620 43 T1200 39" />
          <path d="M0 52 Q260 56, 590 49 T1200 53" />
        </g>
        <g stroke="#08050b" strokeOpacity="0.55" fill="none" strokeWidth="1.4">
          <path d="M0 14 Q360 11, 720 15 T1200 13" />
          <path d="M0 47 Q300 50, 660 45 T1200 48" />
        </g>

        {/* Subtle flowing mana veins along upper & lower edges */}
        {showVeins && (
          <g filter={`url(#${glowId})`} fill="none" strokeLinecap="round">
            <path
              d="M40 8 L138 11 L165 6 M138 11 L210 14 L250 10"
              stroke={veinHex}
              strokeWidth="1.9"
              strokeOpacity="0.72"
              className="mc-vein-pulse"
            />
            <path
              d="M40 8 L138 11 L165 6 M138 11 L210 14 L250 10"
              stroke={veinSoftHex}
              strokeWidth="0.75"
              strokeOpacity="0.92"
            />

            <path
              d="M520 53 L610 49 L648 54 L735 48 M648 54 L680 57"
              stroke={veinHex}
              strokeWidth="1.8"
              strokeOpacity="0.68"
              className="mc-vein-pulse-delayed"
            />
            <path
              d="M520 53 L610 49 L648 54 L735 48"
              stroke={veinSoftHex}
              strokeWidth="0.7"
              strokeOpacity="0.9"
            />

            <path
              d="M930 9 L1015 13 L1068 7 L1152 12"
              stroke={veinHex}
              strokeWidth="1.8"
              strokeOpacity="0.74"
              className="mc-vein-pulse"
            />
            <path
              d="M930 9 L1015 13 L1068 7 L1152 12"
              stroke={veinSoftHex}
              strokeWidth="0.7"
              strokeOpacity="0.92"
            />
          </g>
        )}
      </svg>
    );
  }

  // Default: 'bar' (Main horizontal Social Rotator wing)
  return (
    <svg
      viewBox="0 0 640 84"
      preserveAspectRatio="none"
      className="absolute inset-0 w-full h-full pointer-events-none select-none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={woodGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1e1526" />
          <stop offset="42%" stopColor="#17101e" />
          <stop offset="100%" stopColor="#100b15" />
        </linearGradient>
        <filter id={glowId} x="-15%" y="-40%" width="130%" height="180%">
          <feGaussianBlur stdDeviation="2.6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect width="640" height="84" fill={`url(#${woodGradId})`} />

      {/* Organic weathered wood grain striations */}
      <g stroke="#4e3859" strokeOpacity="0.32" fill="none" strokeWidth="1.15">
        <path d="M0 10 C120 6, 250 15, 390 11 C490 8, 570 13, 640 9" />
        <path d="M0 22 C140 26, 270 18, 420 23 C515 26, 580 20, 640 24" />
        <path d="M0 44 C150 40, 290 48, 445 43 C535 40, 595 45, 640 42" />
        <path d="M0 62 C130 66, 280 58, 430 63 C525 66, 585 60, 640 65" />
        <path d="M0 74 C145 71, 295 77, 455 73 C545 71, 595 75, 640 72" />
      </g>
      <g stroke="#08050b" strokeOpacity="0.62" fill="none" strokeWidth="1.45">
        <path d="M0 16 C160 13, 300 20, 470 15 C555 13, 600 17, 640 15" />
        <path d="M0 54 C155 58, 320 50, 480 56 C560 58, 605 53, 640 55" />
        <path d="M0 69 C140 66, 285 72, 465 68 C550 66, 600 70, 640 68" />
      </g>

      {/* Branching ManaCards Luminous Wood Veins — framed cleanly around text safe-zone */}
      {showVeins && (
        <g filter={`url(#${glowId})`} fill="none" strokeLinecap="round" strokeLinejoin="round">
          {/* Upper-left to mid-top flowing arcane fissure */}
          <path
            d="M0 13 L48 16 L86 9 L142 14 L182 8 M86 9 L112 20 L134 18"
            stroke={veinHex}
            strokeWidth="2.3"
            strokeOpacity="0.78"
            className="mc-vein-pulse"
          />
          <path
            d="M0 13 L48 16 L86 9 L142 14 L182 8 M86 9 L112 20"
            stroke={veinSoftHex}
            strokeWidth="0.9"
            strokeOpacity="0.96"
          />

          {/* Lower-right branching mana fissure converging toward the angled corner */}
          <path
            d="M412 73 L468 67 L518 72 L572 64 L624 68 M468 67 L498 58 L528 60 M572 64 L596 54"
            stroke={veinHex}
            strokeWidth="2.4"
            strokeOpacity="0.82"
            className="mc-vein-pulse-delayed"
          />
          <path
            d="M412 73 L468 67 L518 72 L572 64 L624 68 M468 67 L498 58"
            stroke={veinSoftHex}
            strokeWidth="0.95"
            strokeOpacity="0.98"
          />

          {/* Upper-right fine hairline crack */}
          <path
            d="M522 10 L566 15 L602 9 L636 13"
            stroke={veinHex}
            strokeWidth="1.7"
            strokeOpacity="0.65"
            className="mc-vein-pulse"
          />
          <path
            d="M522 10 L566 15 L602 9 L636 13"
            stroke={veinSoftHex}
            strokeWidth="0.7"
            strokeOpacity="0.9"
          />
        </g>
      )}
    </svg>
  );
};
