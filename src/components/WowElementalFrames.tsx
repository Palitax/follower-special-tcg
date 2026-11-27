'use client';

import React, { useId, useMemo } from 'react';
import { HudAnimSpeed, HudElementalStyle } from '../types/broadcastBars';

export interface HudStyleMeta {
  id: HudElementalStyle;
  label: string;
  subtitle: string;
  primary: string;
  secondary: string;
  highlight: string;
  glowRgb: string;
  pillBorder: string;
}

export const HUD_ELEMENTAL_STYLES: Record<HudElementalStyle, HudStyleMeta> = {
  'arcane-mana': {
    id: 'arcane-mana',
    label: 'Liquid Mana',
    subtitle: 'Fließendes arkanes Wasser',
    primary: '#38bdf8',
    secondary: '#1d4ed8',
    highlight: '#e0f2fe',
    glowRgb: '56, 189, 248',
    pillBorder: 'rgba(56, 189, 248, 0.72)',
  },
  'storm-lightning': {
    id: 'storm-lightning',
    label: 'Sturm-Blitz',
    subtitle: 'Knisternde Blitz-Entladung',
    primary: '#7dd3fc',
    secondary: '#6366f1',
    highlight: '#ffffff',
    glowRgb: '125, 211, 252',
    pillBorder: 'rgba(129, 140, 248, 0.78)',
  },
  'wind-tempest': {
    id: 'wind-tempest',
    label: 'Wind-Wirbel',
    subtitle: 'Luft-Strömung & Zephyr',
    primary: '#5eead4',
    secondary: '#0d9488',
    highlight: '#f0fdfa',
    glowRgb: '94, 234, 212',
    pillBorder: 'rgba(94, 234, 212, 0.72)',
  },
  'fel-flame': {
    id: 'fel-flame',
    label: 'Runen-Feuer',
    subtitle: 'Legendäre Gold-Glut',
    primary: '#FFE406',
    secondary: '#ea580c',
    highlight: '#fffbeb',
    glowRgb: '250, 204, 21',
    pillBorder: 'rgba(255, 228, 6, 0.78)',
  },
  'void-arcane': {
    id: 'void-arcane',
    label: 'Schatten-Arkan',
    subtitle: 'Magier-Runenkreis Lila',
    primary: '#c084fc',
    secondary: '#6d28d9',
    highlight: '#fae8ff',
    glowRgb: '192, 132, 252',
    pillBorder: 'rgba(192, 132, 252, 0.75)',
  },
};

export const HUD_STYLE_LIST: HudStyleMeta[] = [
  HUD_ELEMENTAL_STYLES['arcane-mana'],
  HUD_ELEMENTAL_STYLES['storm-lightning'],
  HUD_ELEMENTAL_STYLES['wind-tempest'],
  HUD_ELEMENTAL_STYLES['fel-flame'],
  HUD_ELEMENTAL_STYLES['void-arcane'],
];

const SPEED_MULT: Record<HudAnimSpeed, number> = {
  slow: 1.55,
  normal: 1,
  fast: 0.58,
};

/** Generates a smooth closed rounded-rectangle SVG path */
function buildRoundedRectPath(x: number, y: number, w: number, h: number, r: number): string {
  const cr = Math.max(0, Math.min(r, w / 2, h / 2));
  return [
    `M ${(x + cr).toFixed(2)} ${y.toFixed(2)}`,
    `L ${(x + w - cr).toFixed(2)} ${y.toFixed(2)}`,
    `A ${cr.toFixed(2)} ${cr.toFixed(2)} 0 0 1 ${(x + w).toFixed(2)} ${(y + cr).toFixed(2)}`,
    `L ${(x + w).toFixed(2)} ${(y + h - cr).toFixed(2)}`,
    `A ${cr.toFixed(2)} ${cr.toFixed(2)} 0 0 1 ${(x + w - cr).toFixed(2)} ${(y + h).toFixed(2)}`,
    `L ${(x + cr).toFixed(2)} ${(y + h).toFixed(2)}`,
    `A ${cr.toFixed(2)} ${cr.toFixed(2)} 0 0 1 ${x.toFixed(2)} ${(y + h - cr).toFixed(2)}`,
    `L ${x.toFixed(2)} ${(y + cr).toFixed(2)}`,
    `A ${cr.toFixed(2)} ${cr.toFixed(2)} 0 0 1 ${(x + cr).toFixed(2)} ${y.toFixed(2)}`,
    'Z',
  ].join(' ');
}

/** Samples evenly distributed points + outward normals along either a circle or rounded rect */
function samplePerimeter(
  shape: 'circle' | 'rect',
  cx: number,
  cy: number,
  w: number,
  h: number,
  r: number,
  count: number
): { x: number; y: number; nx: number; ny: number }[] {
  const pts: { x: number; y: number; nx: number; ny: number }[] = [];
  if (shape === 'circle') {
    const rad = Math.min(w, h) / 2;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const nx = Math.cos(a);
      const ny = Math.sin(a);
      pts.push({ x: cx + nx * rad, y: cy + ny * rad, nx, ny });
    }
    return pts;
  }

  const cr = Math.max(4, Math.min(r, w / 2, h / 2));
  const hw = w / 2;
  const hh = h / 2;
  const straightW = Math.max(0, w - 2 * cr);
  const straightH = Math.max(0, h - 2 * cr);
  const arcLen = (Math.PI / 2) * cr;
  const totalLen = 2 * straightW + 2 * straightH + 4 * arcLen;

  const segs = [
    { type: 'top', len: straightW },
    { type: 'tr', len: arcLen },
    { type: 'right', len: straightH },
    { type: 'br', len: arcLen },
    { type: 'bottom', len: straightW },
    { type: 'bl', len: arcLen },
    { type: 'left', len: straightH },
    { type: 'tl', len: arcLen },
  ] as const;

  for (let i = 0; i < count; i++) {
    let d = (i / count) * totalLen;
    let x = cx;
    let y = cy;
    let nx = 0;
    let ny = -1;

    for (const seg of segs) {
      if (d <= seg.len || seg === segs[segs.length - 1]) {
        const t = seg.len > 0 ? Math.min(1, d / seg.len) : 0;
        if (seg.type === 'top') {
          x = cx - hw + cr + t * straightW;
          y = cy - hh;
          nx = 0;
          ny = -1;
        } else if (seg.type === 'tr') {
          const a = -Math.PI / 2 + t * (Math.PI / 2);
          nx = Math.cos(a);
          ny = Math.sin(a);
          x = cx + hw - cr + nx * cr;
          y = cy - hh + cr + ny * cr;
        } else if (seg.type === 'right') {
          x = cx + hw;
          y = cy - hh + cr + t * straightH;
          nx = 1;
          ny = 0;
        } else if (seg.type === 'br') {
          const a = t * (Math.PI / 2);
          nx = Math.cos(a);
          ny = Math.sin(a);
          x = cx + hw - cr + nx * cr;
          y = cy + hh - cr + ny * cr;
        } else if (seg.type === 'bottom') {
          x = cx + hw - cr - t * straightW;
          y = cy + hh;
          nx = 0;
          ny = 1;
        } else if (seg.type === 'bl') {
          const a = Math.PI / 2 + t * (Math.PI / 2);
          nx = Math.cos(a);
          ny = Math.sin(a);
          x = cx - hw + cr + nx * cr;
          y = cy + hh - cr + ny * cr;
        } else if (seg.type === 'left') {
          x = cx - hw;
          y = cy + hh - cr - t * straightH;
          nx = -1;
          ny = 0;
        } else {
          const a = Math.PI + t * (Math.PI / 2);
          nx = Math.cos(a);
          ny = Math.sin(a);
          x = cx - hw + cr + nx * cr;
          y = cy - hh + cr + ny * cr;
        }
        break;
      }
      d -= seg.len;
    }
    pts.push({ x, y, nx, ny });
  }
  return pts;
}

/** Builds a deterministic jagged lightning perimeter path */
function buildLightningPath(
  pts: { x: number; y: number; nx: number; ny: number }[],
  amp: number,
  seed: number
): string {
  const displaced = pts.map((p, i) => {
    const hash = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453;
    const rand = (hash - Math.floor(hash)) * 2 - 1;
    const spike = i % 3 === 0 ? amp * 1.35 : amp * 0.65;
    const off = rand * spike;
    return { x: p.x + p.nx * off, y: p.y + p.ny * off };
  });
  return (
    displaced
      .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(' ') + ' Z'
  );
}

/** Builds a smooth undulating organic liquid / flame wave closed path */
function buildWavePath(
  pts: { x: number; y: number; nx: number; ny: number }[],
  amp: number,
  freqA: number,
  freqB: number,
  phase: number
): string {
  const n = pts.length;
  const shifted = pts.map((p, i) => {
    const t = (i / n) * Math.PI * 2;
    const off = Math.sin(t * freqA + phase) * amp + Math.cos(t * freqB - phase * 1.4) * (amp * 0.45);
    return { x: p.x + p.nx * off, y: p.y + p.ny * off };
  });

  // Smooth Catmull-Rom-like quadratic midpoint loop
  const parts: string[] = [];
  for (let i = 0; i < n; i++) {
    const curr = shifted[i];
    const next = shifted[(i + 1) % n];
    const mx = (curr.x + next.x) / 2;
    const my = (curr.y + next.y) / 2;
    if (i === 0) {
      const prev = shifted[n - 1];
      parts.push(`M ${((prev.x + curr.x) / 2).toFixed(1)} ${((prev.y + curr.y) / 2).toFixed(1)}`);
    }
    parts.push(`Q ${curr.x.toFixed(1)} ${curr.y.toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`);
  }
  parts.push('Z');
  return parts.join(' ');
}

interface WowElementalFrameProps {
  shape: 'circle' | 'rect';
  style: HudElementalStyle;
  width: number;
  height: number;
  radius?: number;
  intensityPct?: number;
  thicknessPct?: number;
  animSpeed?: HudAnimSpeed;
}

/**
 * Handcrafted WoW / RPG-inspired hollow animated frame designed to wrap directly around
 * Whatnot's native circular Shop button, top-left Avatar logo, and top-right Giveaway box.
 * Interior stays 100% transparent; outer aura + elemental effects animate at 60fps in OBS.
 */
export const WowElementalFrame: React.FC<WowElementalFrameProps> = ({
  shape,
  style,
  width,
  height,
  radius = 36,
  intensityPct = 100,
  thicknessPct = 100,
  animSpeed = 'normal',
}) => {
  const uid = useId().replace(/:/g, '');
  const meta = HUD_ELEMENTAL_STYLES[style] ?? HUD_ELEMENTAL_STYLES['arcane-mana'];
  const sp = SPEED_MULT[animSpeed] ?? 1;
  const thick = Math.max(0.6, Math.min(1.8, thicknessPct / 100));
  const glowScale = Math.max(0.3, Math.min(1.6, intensityPct / 100));

  const pad = Math.round(34 * Math.max(0.85, thick));
  const w = Math.max(40, width);
  const h = shape === 'circle' ? w : Math.max(40, height);
  const svgW = w + pad * 2;
  const svgH = h + pad * 2;
  const cx = svgW / 2;
  const cy = svgH / 2;
  const r = shape === 'circle' ? w / 2 : Math.min(radius, w / 2, h / 2);

  const basePath = useMemo(
    () =>
      shape === 'circle'
        ? `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z`
        : buildRoundedRectPath(pad, pad, w, h, r),
    [shape, cx, cy, r, pad, w, h]
  );

  const outerPath = useMemo(() => {
    const expand = 8 * thick;
    return shape === 'circle'
      ? `M ${cx} ${cy - (r + expand)} A ${r + expand} ${r + expand} 0 1 1 ${cx - 0.01} ${
          cy - (r + expand)
        } Z`
      : buildRoundedRectPath(pad - expand, pad - expand, w + expand * 2, h + expand * 2, r + expand);
  }, [shape, cx, cy, r, pad, w, h, thick]);

  const innerPath = useMemo(() => {
    const shrink = 6 * thick;
    const ir = Math.max(2, r - shrink);
    return shape === 'circle'
      ? `M ${cx} ${cy - ir} A ${ir} ${ir} 0 1 1 ${cx - 0.01} ${cy - ir} Z`
      : buildRoundedRectPath(
          pad + shrink,
          pad + shrink,
          Math.max(10, w - shrink * 2),
          Math.max(10, h - shrink * 2),
          ir
        );
  }, [shape, cx, cy, r, pad, w, h, thick]);

  const { wavePathA, wavePathB, boltPathA, boltPathB, droplets, cardinals } = useMemo(() => {
    const pts = samplePerimeter(shape, cx, cy, w, h, r, shape === 'circle' ? 56 : 72);
    const waveA = buildWavePath(pts, 5.5 * thick, shape === 'circle' ? 6 : 8, 11, 0);
    const waveB = buildWavePath(pts, 4.2 * thick, shape === 'circle' ? 5 : 7, 9, 1.9);
    const boltA = buildLightningPath(pts, 8.5 * thick, 1.7);
    const boltB = buildLightningPath(pts, 10.5 * thick, 4.3);

    const dropIdxs = [0, 14, 28, 42].map((i) => i % pts.length);
    const drops = dropIdxs.map((idx, k) => {
      const p = pts[idx];
      const off = (k % 2 === 0 ? 11 : -8) * thick;
      return { x: p.x + p.nx * off, y: p.y + p.ny * off, size: (k % 2 === 0 ? 3.8 : 2.6) * thick };
    });

    const cards = [
      { x: cx, y: pad, angle: 0 },
      { x: pad + w, y: cy, angle: 90 },
      { x: cx, y: pad + h, angle: 180 },
      { x: pad, y: cy, angle: 270 },
    ];

    return {
      wavePathA: waveA,
      wavePathB: waveB,
      boltPathA: boltA,
      boltPathB: boltB,
      droplets: drops,
      cardinals: cards,
    };
  }, [shape, cx, cy, w, h, r, pad, thick]);

  const gradId = `hud_grad_${uid}`;
  const grad2Id = `hud_grad2_${uid}`;
  const glowFilterId = `hud_glow_${uid}`;
  const baseStroke = 4.2 * thick;

  return (
    <svg
      width={svgW}
      height={svgH}
      viewBox={`0 0 ${svgW} ${svgH}`}
      fill="none"
      className="pointer-events-none select-none overflow-visible"
      style={{
        opacity: Math.min(1, 0.45 + glowScale * 0.55),
        filter: `drop-shadow(0 0 ${Math.round(10 * glowScale)}px rgba(${meta.glowRgb}, ${(
          0.55 * Math.min(1.25, glowScale)
        ).toFixed(2)}))`,
      }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={meta.highlight} />
          <stop offset="32%" stopColor={meta.primary} />
          <stop offset="68%" stopColor={meta.secondary} />
          <stop offset="100%" stopColor={meta.highlight} />
        </linearGradient>
        <linearGradient id={grad2Id} x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={meta.primary} />
          <stop offset="50%" stopColor={meta.highlight} />
          <stop offset="100%" stopColor={meta.secondary} />
        </linearGradient>
        <filter id={glowFilterId} x="-35%" y="-35%" width="170%" height="170%">
          <feGaussianBlur stdDeviation={Math.max(2, 4.5 * glowScale)} result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Soft ambient perimeter halo */}
      <path
        d={basePath}
        stroke={meta.primary}
        strokeWidth={baseStroke * 2.4}
        strokeOpacity={0.22 * glowScale}
        className="hud-breathe"
        style={{ ['--hud-dur' as string]: `${(3.2 * sp).toFixed(2)}s` }}
      />

      {/* ===================================================================
          1. ARCANE MANA — Liquid glowing mana fluid & undulating water ripples
         =================================================================== */}
      {style === 'arcane-mana' && (
        <>
          <path
            d={wavePathA}
            pathLength={100}
            stroke={`url(#${gradId})`}
            strokeWidth={baseStroke * 1.15}
            strokeOpacity={0.78}
            strokeLinecap="round"
            strokeDasharray="34 14 22 30"
            className="hud-flow"
            style={{ ['--hud-dur' as string]: `${(4.2 * sp).toFixed(2)}s` }}
            filter={`url(#${glowFilterId})`}
          />
          <path
            d={wavePathB}
            pathLength={100}
            stroke={meta.highlight}
            strokeWidth={baseStroke * 0.62}
            strokeOpacity={0.9}
            strokeLinecap="round"
            strokeDasharray="16 26 10 48"
            className="hud-flow-rev"
            style={{ ['--hud-dur' as string]: `${(5.4 * sp).toFixed(2)}s` }}
          />
          <path
            d={basePath}
            stroke={`url(#${grad2Id})`}
            strokeWidth={baseStroke * 0.72}
            strokeOpacity={0.85}
          />
          <g
            className={shape === 'circle' ? 'hud-orbit-cw' : 'hud-breathe'}
            style={{ ['--hud-dur' as string]: `${(12 * sp).toFixed(2)}s` }}
          >
            {droplets.map((d, idx) => (
              <circle
                key={`drop_${idx}`}
                cx={d.x}
                cy={d.y}
                r={d.size}
                fill={idx % 2 === 0 ? meta.highlight : meta.primary}
                fillOpacity={0.88}
              />
            ))}
          </g>
        </>
      )}

      {/* ===================================================================
          2. STORM LIGHTNING — Crackling Shaman electric arcs & plasma core
         =================================================================== */}
      {style === 'storm-lightning' && (
        <>
          <path
            d={basePath}
            stroke={meta.secondary}
            strokeWidth={baseStroke * 1.1}
            strokeOpacity={0.65}
          />
          <path
            d={boltPathA}
            pathLength={100}
            stroke={meta.primary}
            strokeWidth={baseStroke * 0.95}
            strokeLinejoin="miter"
            strokeLinecap="round"
            strokeDasharray="18 10 12 24 14 22"
            className="hud-lightning-snap"
            style={{
              ['--hud-dur' as string]: `${(1.9 * sp).toFixed(2)}s`,
              ['--hud-flicker' as string]: `${(1.25 * sp).toFixed(2)}s`,
            }}
            filter={`url(#${glowFilterId})`}
          />
          <path
            d={boltPathB}
            pathLength={100}
            stroke={meta.highlight}
            strokeWidth={baseStroke * 0.52}
            strokeLinejoin="miter"
            strokeLinecap="round"
            strokeDasharray="10 22 7 29 9 23"
            className="hud-lightning-snap"
            style={{
              ['--hud-dur' as string]: `${(1.45 * sp).toFixed(2)}s`,
              ['--hud-flicker' as string]: `${(0.95 * sp).toFixed(2)}s`,
            }}
          />
          <path
            d={basePath}
            pathLength={100}
            stroke={meta.highlight}
            strokeWidth={baseStroke * 0.35}
            strokeOpacity={0.75}
            strokeDasharray="6 44"
            className="hud-flow-rev"
            style={{ ['--hud-dur' as string]: `${(2.2 * sp).toFixed(2)}s` }}
          />
        </>
      )}

      {/* ===================================================================
          3. WIND TEMPEST — Swirling Windfury air ribbons & zephyr wisps
         =================================================================== */}
      {style === 'wind-tempest' && (
        <>
          <path
            d={outerPath}
            pathLength={100}
            stroke={meta.primary}
            strokeWidth={baseStroke * 0.8}
            strokeOpacity={0.62}
            strokeLinecap="round"
            strokeDasharray="24 26 14 36"
            className="hud-flow"
            style={{ ['--hud-dur' as string]: `${(3.1 * sp).toFixed(2)}s` }}
          />
          <path
            d={basePath}
            pathLength={100}
            stroke={`url(#${gradId})`}
            strokeWidth={baseStroke * 1.08}
            strokeOpacity={0.92}
            strokeLinecap="round"
            strokeDasharray="38 18 18 26"
            className="hud-flow"
            style={{ ['--hud-dur' as string]: `${(3.8 * sp).toFixed(2)}s` }}
            filter={`url(#${glowFilterId})`}
          />
          <path
            d={innerPath}
            pathLength={100}
            stroke={meta.highlight}
            strokeWidth={baseStroke * 0.48}
            strokeOpacity={0.78}
            strokeLinecap="round"
            strokeDasharray="20 32 10 38"
            className="hud-flow-rev"
            style={{ ['--hud-dur' as string]: `${(4.8 * sp).toFixed(2)}s` }}
          />
          {/* Sweeping outer wind swirl arcs */}
          <path
            d={wavePathB}
            pathLength={100}
            stroke={meta.highlight}
            strokeWidth={baseStroke * 0.36}
            strokeOpacity={0.45}
            strokeLinecap="round"
            strokeDasharray="12 38"
            className="hud-flow"
            style={{ ['--hud-dur' as string]: `${(2.5 * sp).toFixed(2)}s` }}
          />
        </>
      )}

      {/* ===================================================================
          4. FEL FLAME — Legendary Molten Gold & Whatnot Forge Fire
         =================================================================== */}
      {style === 'fel-flame' && (
        <>
          <path
            d={wavePathA}
            pathLength={100}
            stroke={meta.secondary}
            strokeWidth={baseStroke * 1.45}
            strokeOpacity={0.74}
            strokeLinecap="round"
            strokeDasharray="28 12 20 14 14 12"
            className="hud-flow"
            style={{ ['--hud-dur' as string]: `${(3.6 * sp).toFixed(2)}s` }}
            filter={`url(#${glowFilterId})`}
          />
          <path
            d={basePath}
            stroke={`url(#${gradId})`}
            strokeWidth={baseStroke * 0.95}
            strokeOpacity={0.96}
          />
          <path
            d={basePath}
            pathLength={100}
            stroke={meta.highlight}
            strokeWidth={baseStroke * 0.5}
            strokeLinecap="round"
            strokeDasharray="14 36"
            className="hud-flow-rev"
            style={{ ['--hud-dur' as string]: `${(4.4 * sp).toFixed(2)}s` }}
          />
          {/* Carved forged bronze-gold cardinal diamond clasps */}
          {cardinals.map((c, idx) => (
            <polygon
              key={`clasp_${idx}`}
              points={`${c.x},${c.y - 6.5 * thick} ${c.x + 6.5 * thick},${c.y} ${c.x},${
                c.y + 6.5 * thick
              } ${c.x - 6.5 * thick},${c.y}`}
              fill={meta.highlight}
              stroke={meta.secondary}
              strokeWidth={1.6 * thick}
            />
          ))}
        </>
      )}

      {/* ===================================================================
          5. VOID ARCANE — Royal Purple WoW Mage Rune Circle
         =================================================================== */}
      {style === 'void-arcane' && (
        <>
          <path
            d={outerPath}
            pathLength={100}
            stroke={meta.primary}
            strokeWidth={baseStroke * 0.55}
            strokeOpacity={0.72}
            strokeDasharray="2.2 2.4 5.5 2.4"
            className="hud-flow"
            style={{ ['--hud-dur' as string]: `${(9.5 * sp).toFixed(2)}s` }}
          />
          <path
            d={basePath}
            stroke={`url(#${gradId})`}
            strokeWidth={baseStroke * 0.95}
            strokeOpacity={0.94}
            filter={`url(#${glowFilterId})`}
          />
          <path
            d={innerPath}
            pathLength={100}
            stroke={meta.highlight}
            strokeWidth={baseStroke * 0.45}
            strokeOpacity={0.82}
            strokeDasharray="1.5 3 4 3"
            className="hud-flow-rev"
            style={{ ['--hud-dur' as string]: `${(12 * sp).toFixed(2)}s` }}
          />
          {cardinals.map((c, idx) => (
            <g key={`sigil_${idx}`}>
              <polygon
                points={`${c.x},${c.y - 7.5 * thick} ${c.x + 7.5 * thick},${c.y} ${c.x},${
                  c.y + 7.5 * thick
                } ${c.x - 7.5 * thick},${c.y}`}
                fill="#1b102d"
                stroke={meta.highlight}
                strokeWidth={1.8 * thick}
              />
              <circle cx={c.x} cy={c.y} r={2.2 * thick} fill={meta.highlight} />
            </g>
          ))}
        </>
      )}
    </svg>
  );
};

interface HudCalloutPointerProps {
  /** Center of the target widget in 1080x1920 canvas px */
  targetX: number;
  targetY: number;
  /** Target half-width & half-height so the arrow lands neatly at the outer aura edge */
  targetHalfW: number;
  targetHalfH: number;
  /** Offset of the callout text pill center relative to target center */
  offsetX: number;
  offsetY: number;
  text: string;
  subtext: string;
  style: HudElementalStyle;
  scalePct?: number;
}

/**
 * Dynamic curved animated arrow + sleek ManaCards/Whatnot HUD pill that automatically
 * aims from the user's configured offset directly onto the Shop circle or Giveaway frame.
 */
export const HudCalloutPointer: React.FC<HudCalloutPointerProps> = ({
  targetX,
  targetY,
  targetHalfW,
  targetHalfH,
  offsetX,
  offsetY,
  text,
  subtext,
  style,
  scalePct = 100,
}) => {
  const uid = useId().replace(/:/g, '');
  const meta = HUD_ELEMENTAL_STYLES[style] ?? HUD_ELEMENTAL_STYLES['arcane-mana'];
  const sc = Math.max(0.7, Math.min(1.6, scalePct / 100));

  const pillX = targetX + offsetX;
  const pillY = targetY + offsetY;

  // Direction vector from pill -> target
  const dx = targetX - pillX;
  const dy = targetY - pillY;
  const dist = Math.max(1, Math.hypot(dx, dy));
  const ux = dx / dist;
  const uy = dy / dist;

  // Arrow starts cleanly near the edge of the pill and ends right outside the target aura
  const startPull = Math.min(dist * 0.36, 92 * sc);
  const endStop = Math.hypot(ux * (targetHalfW + 22), uy * (targetHalfH + 22));
  const sx = pillX + ux * startPull;
  const sy = pillY + uy * startPull;
  const ex = targetX - ux * Math.min(dist * 0.55, endStop);
  const ey = targetY - uy * Math.min(dist * 0.55, endStop);

  // Subtle upward/outward quadratic curve for natural broadcast motion graphics look
  const mx = (sx + ex) / 2;
  const my = (sy + ey) / 2;
  const perpX = -uy;
  const perpY = ux;
  const bendDir = perpY < 0 ? 1 : -1;
  const curveAmt = Math.min(54, dist * 0.18) * bendDir;
  const cx = mx + perpX * curveAmt;
  const cy = my + perpY * curveAmt;

  // Tangent angle at the tip of the quadratic Bezier: (ex - cx, ey - cy)
  const tipDx = ex - cx;
  const tipDy = ey - cy;
  const tipLen = Math.max(1, Math.hypot(tipDx, tipDy));
  const tux = tipDx / tipLen;
  const tuy = tipDy / tipLen;
  const headSize = 18 * sc;
  const wingAngle = 0.52;
  const cosW = Math.cos(wingAngle);
  const sinW = Math.sin(wingAngle);

  const w1x = ex - headSize * (tux * cosW - tuy * sinW);
  const w1y = ey - headSize * (tux * sinW + tuy * cosW);
  const w2x = ex - headSize * (tux * cosW + tuy * sinW);
  const w2y = ey - headSize * (-tux * sinW + tuy * cosW);

  const bobX = `${(tux * 7).toFixed(1)}px`;
  const bobY = `${(tuy * 7).toFixed(1)}px`;
  const shaftGradId = `arrow_grad_${uid}`;

  return (
    <div className="pointer-events-none absolute inset-0 select-none">
      {/* Curved Animated Arrow SVG (full 1080x1920 overlay coordinates) */}
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 1080 1920"
        fill="none"
        className="absolute inset-0 overflow-visible"
        aria-hidden="true"
      >
        <defs>
          <linearGradient
            id={shaftGradId}
            gradientUnits="userSpaceOnUse"
            x1={sx}
            y1={sy}
            x2={ex}
            y2={ey}
          >
            <stop offset="0%" stopColor={meta.secondary} stopOpacity="0.45" />
            <stop offset="55%" stopColor={meta.primary} stopOpacity="1" />
            <stop offset="100%" stopColor={meta.highlight} stopOpacity="1" />
          </linearGradient>
        </defs>

        <g
          className="hud-arrow-bob"
          style={{
            ['--bob-x' as string]: bobX,
            ['--bob-y' as string]: bobY,
            filter: `drop-shadow(0 0 10px rgba(${meta.glowRgb}, 0.7)) drop-shadow(0 4px 10px rgba(0,0,0,0.65))`,
          }}
        >
          {/* Soft ambient halo under shaft */}
          <path
            d={`M ${sx.toFixed(1)} ${sy.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${ex.toFixed(
              1
            )} ${ey.toFixed(1)}`}
            stroke={meta.primary}
            strokeWidth={11 * sc}
            strokeOpacity={0.22}
            strokeLinecap="round"
          />
          {/* Main glowing shaft */}
          <path
            d={`M ${sx.toFixed(1)} ${sy.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${ex.toFixed(
              1
            )} ${ey.toFixed(1)}`}
            stroke={`url(#${shaftGradId})`}
            strokeWidth={4.8 * sc}
            strokeLinecap="round"
          />
          {/* Animated energy dash racing toward the arrowhead */}
          <path
            d={`M ${sx.toFixed(1)} ${sy.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${ex.toFixed(
              1
            )} ${ey.toFixed(1)}`}
            stroke={meta.highlight}
            strokeWidth={2.8 * sc}
            strokeLinecap="round"
            strokeDasharray="16 32"
            className="hud-arrow-pulse"
          />
          {/* Sculpted chevron arrowhead */}
          <path
            d={`M ${w1x.toFixed(1)} ${w1y.toFixed(1)} L ${ex.toFixed(1)} ${ey.toFixed(1)} L ${w2x.toFixed(
              1
            )} ${w2y.toFixed(1)}`}
            stroke={meta.highlight}
            strokeWidth={5.2 * sc}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </svg>

      {/* Floating Broadcast HUD Callout Text Pill */}
      {(text.trim() || subtext.trim()) && (
        <div
          className="absolute font-wn-sans mc-crisp-overlay"
          style={{
            left: pillX,
            top: pillY,
            transform: 'translate(-50%, -50%)',
            maxWidth: Math.round(410 * sc),
          }}
        >
          <div
            className="relative overflow-hidden text-center"
            style={{
              padding: `${Math.round(13 * sc)}px ${Math.round(22 * sc)}px`,
              borderRadius: Math.round(16 * sc),
              background:
                'linear-gradient(180deg, rgba(56, 58, 66, 0.96) 0%, rgba(28, 30, 36, 0.97) 55%, rgba(14, 15, 20, 0.98) 100%)',
              border: `2px solid ${meta.pillBorder}`,
              boxShadow: `inset 0 1.5px 0 rgba(255,255,255,0.22), 0 0 24px rgba(${meta.glowRgb}, 0.32), 0 14px 28px rgba(0, 0, 0, 0.65)`,
            }}
          >
            {/* Top elemental energy rim bar */}
            <div
              aria-hidden="true"
              className="absolute inset-x-0 top-0"
              style={{
                height: Math.max(2, Math.round(3.5 * sc)),
                background: `linear-gradient(90deg, transparent 0%, ${meta.primary} 25%, ${meta.highlight} 50%, ${meta.primary} 75%, transparent 100%)`,
              }}
            />

            {text.trim() && (
              <div
                className="font-extrabold tracking-[-0.02em] text-white leading-tight whitespace-nowrap"
                style={{
                  fontSize: Math.round(24 * sc),
                  textShadow: `0 2px 10px rgba(0, 0, 0, 0.85), 0 0 16px rgba(${meta.glowRgb}, 0.35)`,
                }}
              >
                {text}
              </div>
            )}
            {subtext.trim() && (
              <div
                className="font-semibold leading-snug whitespace-nowrap"
                style={{
                  marginTop: Math.round(3 * sc),
                  fontSize: Math.round(16 * sc),
                  color: meta.highlight,
                  opacity: 0.88,
                }}
              >
                {subtext}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
