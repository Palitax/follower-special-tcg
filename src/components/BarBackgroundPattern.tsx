'use client';

import React, { useId } from 'react';
import { BarBackgroundPattern, SocialPlatform } from '../types/broadcastBars';
import { EmbossedCategoryWatermark } from './SocialBrandIcons';

export const BAR_PATTERN_OPTIONS: {
  id: BarBackgroundPattern;
  label: string;
  desc: string;
}[] = [
  { id: 'logos', label: 'Logo-Planes', desc: 'Flache 2D Marken-Silhouetten' },
  { id: 'waves', label: 'Wellen', desc: 'Fließende Topografie-Wellen' },
  { id: 'dots', label: 'Gepunktet', desc: 'Präzise Dot-Matrix Punkte' },
  { id: 'diagonal', label: 'Carbon', desc: 'Feine 45°-Diagonal-Streifen' },
  { id: 'hex', label: 'Hexagon', desc: 'Geometrisches Waben-Gitter' },
  { id: 'grid', label: 'Tech-Raster', desc: 'Architektur-Grid mit Kreuzen' },
  { id: 'none', label: 'Pur', desc: 'Kein Muster im Hintergrund' },
];

interface BarBackgroundPatternLayerProps {
  pattern: BarBackgroundPattern;
  /** Independent pattern visibility (0–100) */
  opacityPct: number;
  /** HiDPI scale factor (1, 1.5, 2) so pattern density stays consistent across resolutions */
  qualityScale?: number;
  /** Bar height in rendered px (used to size logo silhouettes cleanly) */
  barHeightPx?: number;
  /** Active platform for single-card rotator ('logos' mode) */
  singlePlatform?: SocialPlatform;
  /** Active platforms for wide horizontal ticker ('logos' mode — rendered statically on GPU!) */
  tickerPlatforms?: SocialPlatform[];
  /** Surface tone */
  surface?: 'charcoal' | 'wood';
}

/**
 * Static, GPU-cached decorative background layer for both Social Rotator & Horizontal Ticker.
 * Completely independent of the bar's background fill opacity (`bgOpacityPct`), so streamers can
 * show subtle waves, dots, hex, carbon stripes, or flat 2D logos even on a translucent or clear bar.
 */
export const BarBackgroundPatternLayer: React.FC<BarBackgroundPatternLayerProps> = ({
  pattern,
  opacityPct,
  qualityScale = 1,
  barHeightPx = 88,
  singlePlatform,
  tickerPlatforms,
  surface = 'charcoal',
}) => {
  const uid = useId().replace(/:/g, '');
  const clampedOpacity = Math.max(0, Math.min(100, opacityPct)) / 100;

  if (pattern === 'none' || clampedOpacity <= 0.005) {
    return null;
  }

  // Logos mode: static oversized flat 2D brand planes (matches reference screenshot, zero scrolling repaint)
  if (pattern === 'logos') {
    if (singlePlatform) {
      return (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden"
          style={{ opacity: clampedOpacity }}
        >
          <div
            className="absolute flex items-center justify-center"
            style={{
              right: Math.round(-barHeightPx * 0.22),
              top: '50%',
              marginTop: -Math.round(barHeightPx * 0.86),
            }}
          >
            <EmbossedCategoryWatermark
              platform={singlePlatform}
              size={Math.round(barHeightPx * 1.72)}
              surface={surface}
              rotateDeg={14}
              opacityOverride={1}
            />
          </div>
        </div>
      );
    }

    const logos = (tickerPlatforms && tickerPlatforms.length > 0
      ? tickerPlatforms
      : (['buyback', 'instagram', 'discord', 'whatsapp'] as SocialPlatform[])
    ).slice(0, 6);

    return (
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden flex items-center justify-around"
        style={{ opacity: clampedOpacity }}
      >
        {logos.map((plat, idx) => (
          <div
            key={`bg_logo_${plat}_${idx}`}
            className="shrink-0 flex items-center justify-center"
            style={{ transform: `translateY(${idx % 2 === 0 ? '4%' : '-6%'})` }}
          >
            <EmbossedCategoryWatermark
              platform={plat}
              size={Math.round(barHeightPx * 1.52)}
              surface={surface}
              rotateDeg={14}
              opacityOverride={0.95}
            />
          </div>
        ))}
      </div>
    );
  }

  const q = Math.max(0.75, qualityScale);
  const darkInk = surface === 'wood' ? '#07040b' : '#08090d';
  const lightInk = '#ffffff';

  if (pattern === 'waves') {
    const waveId = `mc_waves_${uid}`;
    const tileW = Math.round(280 * q);
    const tileH = Math.max(Math.round(56 * q), barHeightPx);
    return (
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 w-full h-full"
        style={{ opacity: clampedOpacity }}
        preserveAspectRatio="none"
      >
        <defs>
          <pattern
            id={waveId}
            width={tileW}
            height={tileH}
            patternUnits="userSpaceOnUse"
          >
            {/* Layered soft dark tonal wave ribbon */}
            <path
              d={`M0 ${tileH * 0.66} C ${tileW * 0.25} ${tileH * 0.24}, ${tileW * 0.52} ${
                tileH * 1.02
              }, ${tileW * 0.78} ${tileH * 0.5} C ${tileW * 0.89} ${tileH * 0.28}, ${
                tileW * 0.95
              } ${tileH * 0.56}, ${tileW} ${tileH * 0.66} L ${tileW} ${tileH} L 0 ${tileH} Z`}
              fill={darkInk}
              fillOpacity="0.46"
            />
            {/* Secondary overlapping lower wave */}
            <path
              d={`M0 ${tileH * 0.8} C ${tileW * 0.22} ${tileH * 1.05}, ${tileW * 0.56} ${
                tileH * 0.42
              }, ${tileW * 0.82} ${tileH * 0.72} C ${tileW * 0.91} ${tileH * 0.82}, ${
                tileW * 0.96
              } ${tileH * 0.84}, ${tileW} ${tileH * 0.8} L ${tileW} ${tileH} L 0 ${tileH} Z`}
              fill={darkInk}
              fillOpacity="0.34"
            />
            {/* Crisp sleek topographic contour lines */}
            <path
              d={`M0 ${tileH * 0.34} C ${tileW * 0.26} ${tileH * 0.04}, ${tileW * 0.52} ${
                tileH * 0.7
              }, ${tileW * 0.78} ${tileH * 0.26} C ${tileW * 0.89} ${tileH * 0.08}, ${
                tileW * 0.95
              } ${tileH * 0.26}, ${tileW} ${tileH * 0.34}`}
              fill="none"
              stroke={lightInk}
              strokeOpacity="0.16"
              strokeWidth={1.3 * q}
            />
            <path
              d={`M0 ${tileH * 0.56} C ${tileW * 0.26} ${tileH * 0.22}, ${tileW * 0.52} ${
                tileH * 0.92
              }, ${tileW * 0.78} ${tileH * 0.46} C ${tileW * 0.89} ${tileH * 0.28}, ${
                tileW * 0.95
              } ${tileH * 0.48}, ${tileW} ${tileH * 0.56}`}
              fill="none"
              stroke={lightInk}
              strokeOpacity="0.22"
              strokeWidth={1.5 * q}
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${waveId})`} />
      </svg>
    );
  }

  if (pattern === 'dots') {
    const dotId = `mc_dots_${uid}`;
    const cell = Math.round(14 * q);
    return (
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 w-full h-full"
        style={{ opacity: clampedOpacity }}
      >
        <defs>
          <pattern id={dotId} width={cell} height={cell} patternUnits="userSpaceOnUse">
            <circle cx={cell * 0.25} cy={cell * 0.25} r={1.65 * q} fill={lightInk} fillOpacity="0.26" />
            <circle cx={cell * 0.75} cy={cell * 0.75} r={1.15 * q} fill={darkInk} fillOpacity="0.6" />
            <circle cx={cell * 0.75} cy={cell * 0.75} r={0.8 * q} fill={lightInk} fillOpacity="0.14" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${dotId})`} />
      </svg>
    );
  }

  if (pattern === 'diagonal') {
    const diagId = `mc_diag_${uid}`;
    const cell = Math.round(14 * q);
    return (
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 w-full h-full"
        style={{ opacity: clampedOpacity }}
      >
        <defs>
          <pattern
            id={diagId}
            width={cell}
            height={cell}
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <rect width={cell * 0.42} height={cell} fill={darkInk} fillOpacity="0.48" />
            <line
              x1={cell * 0.44}
              y1={0}
              x2={cell * 0.44}
              y2={cell}
              stroke={lightInk}
              strokeOpacity="0.14"
              strokeWidth={1 * q}
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${diagId})`} />
      </svg>
    );
  }

  if (pattern === 'hex') {
    const hexId = `mc_hex_${uid}`;
    const w = Math.round(28 * q);
    const h = Math.round(24 * q);
    const strokeW = 1.15 * q;
    return (
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 w-full h-full"
        style={{ opacity: clampedOpacity }}
      >
        <defs>
          <pattern id={hexId} width={w} height={h} patternUnits="userSpaceOnUse">
            <polygon
              points={`${w * 0.25},0 ${w * 0.75},0 ${w},${h * 0.5} ${w * 0.75},${h} ${w * 0.25},${h} 0,${
                h * 0.5
              }`}
              fill={darkInk}
              fillOpacity="0.22"
              stroke={lightInk}
              strokeOpacity="0.18"
              strokeWidth={strokeW}
            />
            <line
              x1={w * 0.75}
              y1={0}
              x2={w}
              y2={h * 0.5}
              stroke={darkInk}
              strokeOpacity="0.4"
              strokeWidth={strokeW}
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${hexId})`} />
      </svg>
    );
  }

  // 'grid' — clean architectural coordinate grid with subtle crosshair accents
  const gridId = `mc_grid_${uid}`;
  const cell = Math.round(20 * q);
  const arm = Math.round(2.5 * q);
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 w-full h-full"
      style={{ opacity: clampedOpacity }}
    >
      <defs>
        <pattern id={gridId} width={cell} height={cell} patternUnits="userSpaceOnUse">
          <path
            d={`M ${cell} 0 L 0 0 0 ${cell}`}
            fill="none"
            stroke={lightInk}
            strokeOpacity="0.14"
            strokeWidth={1 * q}
          />
          <path
            d={`M 0 ${arm} L 0 -${arm} M -${arm} 0 L ${arm} 0`}
            stroke={lightInk}
            strokeOpacity="0.32"
            strokeWidth={1.2 * q}
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${gridId})`} />
    </svg>
  );
};

/** Compact live visual preview thumbnail used inside Studio pattern selector cards */
export const PatternPreviewThumb: React.FC<{ pattern: BarBackgroundPattern }> = ({ pattern }) => {
  return (
    <div
      className="relative w-full h-7 overflow-hidden rounded-[4px] border border-white/10"
      style={{
        background: 'linear-gradient(180deg, #3e4046 0%, #24262b 55%, #121317 100%)',
      }}
    >
      <BarBackgroundPatternLayer
        pattern={pattern}
        opacityPct={85}
        qualityScale={0.75}
        barHeightPx={28}
        singlePlatform={pattern === 'logos' ? 'buyback' : undefined}
        surface="charcoal"
      />
    </div>
  );
};
