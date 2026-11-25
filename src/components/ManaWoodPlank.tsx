'use client';

import React, { useId, useMemo } from 'react';

/**
 * ManaCards illustrated "arcane timber" kit.
 *
 * Painted dark-plum wood with ink outlines, cloth + rope lashings, branch stubs
 * and luminous mana veins flowing through cracks in the grain — derived from the
 * ManaCards "GA" giveaway artwork. All geometry is generated deterministically
 * (seeded) at the exact pixel size, so nothing is ever stretched or distorted.
 */

export type Pt = [number, number];

export const WOOD = {
  outline: '#0d0811',
  bark: '#1c1223',
  grainDark: '#130c18',
  grainLight: '#755d82',
  endgrainCenter: '#6c5476',
  endgrainMid: '#4b3756',
  endgrainEdge: '#33243d',
  twigTop: '#4a3756',
  twigBottom: '#21172a',
  clothLight: '#6a626f',
  clothDark: '#3a343f',
  clothFold: '#26212a',
  rope: '#a98f68',
  ropeDark: '#3b2d20',
  ropeLight: '#e2cea5',
  parchment: '#f5eddc',
  parchmentMuted: '#cdbfd6',
} as const;

const PLANK_STOPS: [string, string][] = [
  ['0%', '#4f3b5b'],
  ['14%', '#3f2d4a'],
  ['56%', '#2d2037'],
  ['100%', '#1a1120'],
];

/** Cylindrical log shading (highlight band in the upper third) */
const POLE_STOPS: [string, string][] = [
  ['0%', '#24192b'],
  ['16%', '#4e3a5a'],
  ['30%', '#463350'],
  ['68%', '#2b1f34'],
  ['100%', '#150d1a'],
];

const r1 = (n: number) => Math.round(n * 10) / 10;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const P = (p: Pt) => `${r1(p[0])} ${r1(p[1])}`;

export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function curveTo(p0: Pt, p1: Pt, p2: Pt, p3: Pt): string {
  const c1x = p1[0] + (p2[0] - p0[0]) / 6;
  const c1y = p1[1] + (p2[1] - p0[1]) / 6;
  const c2x = p2[0] - (p3[0] - p1[0]) / 6;
  const c2y = p2[1] - (p3[1] - p1[1]) / 6;
  return ` C${r1(c1x)} ${r1(c1y)} ${r1(c2x)} ${r1(c2y)} ${r1(p2[0])} ${r1(p2[1])}`;
}

/** Catmull-Rom → cubic Bézier segments, assuming the pen is already at pts[0] */
function smoothSegments(pts: Pt[]): string {
  let d = '';
  for (let i = 0; i < pts.length - 1; i++) {
    d += curveTo(
      pts[Math.max(0, i - 1)],
      pts[i],
      pts[i + 1],
      pts[Math.min(pts.length - 1, i + 2)]
    );
  }
  return d;
}

export function smoothOpenPath(pts: Pt[]): string {
  if (pts.length < 2) return '';
  return `M${P(pts[0])}${smoothSegments(pts)}`;
}

export function smoothClosedPath(pts: Pt[]): string {
  const n = pts.length;
  let d = `M${P(pts[0])}`;
  for (let i = 0; i < n; i++) {
    d += curveTo(pts[(i - 1 + n) % n], pts[i], pts[(i + 1) % n], pts[(i + 2) % n]);
  }
  return `${d} Z`;
}

// ============================================================================
// Geometry builders
// ============================================================================
export type WoodEndStyle = 'ragged' | 'clean';

interface Knot {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  rot: number;
}

interface VeinGeo {
  main: string;
  /** Middle stretch of the main crack, drawn thicker so veins taper at both ends */
  mid: string;
  branches: string[];
  flowDur: number;
  flowDelay: number;
}

interface TwigGeo {
  fill: string;
  edge: string;
  shoot: string;
  color: string;
  cap: { cx: number; cy: number; rx: number; ry: number; rot: number };
}

interface LashGeo {
  cloth: string;
  folds: string[];
  coils: string[];
}

interface PlankGeometry {
  outline: string;
  grain: { d: string; dark: boolean }[];
  knots: Knot[];
  fibers: string;
  bevel: string;
  underside: string;
  veins: VeinGeo[];
  twigs: TwigGeo[];
  lashings: LashGeo[];
}

function buildOutline(
  rand: () => number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  endStyle: WoodEndStyle
): string {
  const h = y1 - y0;
  const steps = Math.max(3, Math.round((x1 - x0) / 38));
  const edge = (y: number): Pt[] => {
    const pts: Pt[] = [];
    for (let i = 0; i <= steps; i++) {
      const x = x0 + 4 + ((x1 - x0 - 8) * i) / steps;
      const jitter = i === 0 || i === steps ? 0 : (rand() - 0.5) * 2.6;
      pts.push([x, y + jitter]);
    }
    return pts;
  };
  const top = edge(y0);
  const bottom = edge(y1).reverse();

  const ragged = endStyle === 'ragged';
  const rightEnd: Pt[] = ragged
    ? [
        [x1 - 1 - rand() * 1.5, y0 + h * 0.2],
        [x1 - 4 - rand() * 2.5, y0 + h * (0.38 + rand() * 0.06)],
        [x1 - rand(), y0 + h * 0.6],
        [x1 - 2.5 - rand() * 2, y0 + h * 0.82],
      ]
    : [
        [x1, y0 + h * 0.08],
        [x1 - 1.2, y1 - h * 0.08],
      ];
  const leftEnd: Pt[] = ragged
    ? [
        [x0 + 2 + rand() * 2, y0 + h * 0.8],
        [x0 + 4.5 + rand() * 2, y0 + h * (0.58 + rand() * 0.06)],
        [x0 + rand(), y0 + h * 0.4],
        [x0 + 2 + rand() * 1.5, y0 + h * 0.18],
      ]
    : [
        [x0 + 1.2, y1 - h * 0.08],
        [x0, y0 + h * 0.08],
      ];

  return (
    `M${P(top[0])}${smoothSegments(top)}` +
    rightEnd.map((p) => ` L${P(p)}`).join('') +
    ` L${P(bottom[0])}${smoothSegments(bottom)}` +
    leftEnd.map((p) => ` L${P(p)}`).join('') +
    ' Z'
  );
}

function buildGrain(
  rand: () => number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  knots: Knot[]
): { d: string; dark: boolean }[] {
  const h = y1 - y0;
  const count = Math.max(4, Math.round(h / 10));
  const lines: { d: string; dark: boolean }[] = [];
  const span = x1 - x0;

  for (let i = 0; i < count; i++) {
    const baseY = y0 + h * (0.1 + (0.8 * i) / (count - 1)) + (rand() - 0.5) * 3;
    const freq = 0.004 + rand() * 0.006;
    const phase = rand() * Math.PI * 2;
    const amp = 0.8 + rand() * 1.8;
    const startX = x0 - 8 + (rand() < 0.3 ? rand() * span * 0.4 : 0);
    const endX = x1 + 8 - (rand() < 0.3 ? rand() * span * 0.4 : 0);
    const pts: Pt[] = [];

    for (let x = startX; x <= endX + 0.01; x += 14) {
      let y = baseY + Math.sin(x * freq + phase) * amp;
      // Grain flows around knots like real timber
      for (const k of knots) {
        const dx = (x - k.cx) / (k.rx * 2.4);
        const dy = y - k.cy;
        if (Math.abs(dx) < 1 && Math.abs(dy) < k.ry * 3.4) {
          const push = Math.max(0, (1 - dx * dx) * (k.ry * 1.8 - Math.abs(dy) * 0.32));
          y += dy >= 0 ? push : -push;
        }
      }
      pts.push([x, y]);
    }
    lines.push({ d: smoothOpenPath(pts), dark: i % 2 === 0 });
  }
  return lines;
}

function buildVeins(
  rand: () => number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  quiet: [number, number] | null
): VeinGeo[] {
  const h = y1 - y0;
  const veins: VeinGeo[] = [];
  let x = x0 + 6 + rand() * 24;
  let top = rand() < 0.5;
  const inQuiet = (px: number) => !!quiet && px >= quiet[0] && px <= quiet[1];

  const makeBranch = (from: Pt, dirY: number, forward: number, len: number, depth: number): Pt[] => {
    const bp: Pt[] = [from];
    const segs = 3 + Math.floor(rand() * 2);
    for (let s = 1; s <= segs; s++) {
      const t = s / segs;
      bp.push([
        from[0] + forward * len * t + (rand() - 0.5) * 4,
        from[1] + dirY * depth * Math.pow(t, 0.8) + (rand() - 0.5) * 2.4,
      ]);
    }
    return bp;
  };

  while (x < x1 - 40) {
    const len = Math.min(x1 - 4 - x, 90 + rand() * 120);
    // Inside the text lane veins hug the very top edge so lettering (and the
    // carved timer channel along the bottom) stay crisp
    const quietSeg = inQuiet(x + len / 2);
    if (quietSeg) top = true;
    const bandOffset = quietSeg ? h * (0.06 + rand() * 0.02) : h * (0.13 + rand() * 0.1);
    const bandY = top ? y0 + bandOffset : y1 - bandOffset;
    const ampl = quietSeg ? h * 0.035 : h * 0.12;
    const pts: Pt[] = [];
    let y = bandY + (rand() - 0.5) * ampl;
    for (let px = x; px <= x + len; px += 8 + rand() * 9) {
      const localAmpl = inQuiet(px) ? Math.min(ampl, h * 0.035) : ampl;
      const localBand = inQuiet(px) ? (top ? y0 + h * 0.065 : y1 - h * 0.065) : bandY;
      y = clamp(y + (rand() - 0.5) * localAmpl * 1.15, localBand - localAmpl, localBand + localAmpl);
      pts.push([px, clamp(y, y0 + 2.5, y1 - 2.5)]);
    }

    const branches: string[] = [];
    const branchCount = 2 + Math.floor(rand() * 2.6);
    for (let b = 0; b < branchCount && pts.length > 3; b++) {
      const idx = 1 + Math.floor(rand() * (pts.length - 2));
      const quietPoint = inQuiet(pts[idx][0]);
      const inward = !quietPoint && rand() < 0.5;
      const dirY = (top ? 1 : -1) * (inward ? 1 : -1);
      const bLen = 10 + rand() * 24;
      const depth = Math.min(inward ? h * 0.24 : h * 0.18, bLen * 0.75);
      const forward = rand() < 0.5 ? 1 : -1;
      const bp = makeBranch(pts[idx], dirY, forward, bLen, depth);
      branches.push(smoothOpenPath(bp));
      // Occasional fork off the branch, like splitting bark
      if (rand() < 0.45 && bp.length > 2) {
        const fork = makeBranch(bp[Math.floor(bp.length / 2)], dirY, forward, bLen * 0.5, depth * 0.45);
        branches.push(smoothOpenPath(fork));
      }
    }

    if (pts.length >= 3) {
      const a = Math.floor(pts.length * 0.22);
      const bIdx = Math.max(a + 2, Math.ceil(pts.length * 0.78));
      veins.push({
        main: smoothOpenPath(pts),
        mid: smoothOpenPath(pts.slice(a, bIdx)),
        branches,
        flowDur: 3.8 + rand() * 2.8,
        flowDelay: rand() * 3.2,
      });
    }
    x += len * (0.5 + rand() * 0.3) + 20 + rand() * 70;
    top = !top;
  }
  return veins;
}

function buildTwig(x: number, yEdge: number, side: 'top' | 'bottom', k = 1.6): TwigGeo {
  const s = side === 'top' ? -1 : 1;
  const X = (o: number) => r1(x + o * k);
  const Y = (o: number) => r1(yEdge + s * o * k);
  const base = -1.4 / k;
  const body = `${X(-5)} ${Y(base)} Q${X(-3)} ${Y(5)} ${X(3)} ${Y(11)} L${X(9)} ${Y(8)} Q${X(3.6)} ${Y(3)} ${X(5)} ${Y(base)}`;
  return {
    fill: `M${body} Z`,
    edge: `M${body}`,
    shoot: `M${X(-1)} ${Y(5)} Q${X(-3.5)} ${Y(8)} ${X(-5.5)} ${Y(12)}`,
    color: side === 'top' ? WOOD.twigTop : WOOD.twigBottom,
    cap: {
      cx: x + 6 * k,
      cy: yEdge + s * 9.5 * k,
      rx: 3.35 * k,
      ry: 1.6 * k,
      rot: side === 'top' ? 26.6 : -26.6,
    },
  };
}

function buildLashing(
  rand: () => number,
  cx: number,
  y0: number,
  y1: number,
  bw: number
): LashGeo {
  const top = y0 - 5;
  const bottom = y1 + 5;
  const l = cx - bw / 2;
  const r = cx + bw / 2;
  const j = () => (rand() - 0.5) * 1.6;
  const H = bottom - top;

  // Cloth wrap bulges at top & bottom as if wound around the wood
  const cloth = `M${r1(l + j())} ${r1(top + 1.5)} Q${r1(cx)} ${r1(top - 2.6 + j())} ${r1(r + j())} ${r1(top + 1)} L${r1(r + 1 + j())} ${r1(bottom - 1)} Q${r1(cx)} ${r1(bottom + 2.6 + j())} ${r1(l + j())} ${r1(bottom - 1.5)} Z`;
  const folds = [
    `M${r1(l + 3)} ${r1(top + H * 0.16)} Q${r1(cx)} ${r1(top + H * 0.22)} ${r1(r - 3)} ${r1(top + H * 0.28)}`,
    `M${r1(l + 4)} ${r1(top + H * 0.72)} Q${r1(cx)} ${r1(top + H * 0.68)} ${r1(r - 2)} ${r1(top + H * 0.78)}`,
  ];

  const coils: string[] = [];
  const n = H > 62 ? 4 : 3;
  for (let k = 0; k < n; k++) {
    const yk = top + H * (0.22 + (0.56 * k) / (n - 1));
    coils.push(
      `M${r1(l - 3)} ${r1(yk + 3.2)} Q${r1(cx)} ${r1(yk + 1.4 + j() * 0.5)} ${r1(r + 3)} ${r1(yk - 3.2)}`
    );
  }
  return { cloth, folds, coils };
}

function buildPlankGeometry(o: {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  seed: number;
  endStyle: WoodEndStyle;
  lashings: number[];
  twigs: { x: number; side: 'top' | 'bottom' }[];
  quiet: [number, number] | null;
}): PlankGeometry {
  const { x0, y0, x1, y1 } = o;
  const rand = seededRandom(o.seed);
  const h = y1 - y0;
  const span = x1 - x0;

  const outline = buildOutline(rand, x0, y0, x1, y1, o.endStyle);

  const knotCount = Math.max(1, Math.round(span / 300));
  const knots: Knot[] = [];
  for (let k = 0; k < knotCount; k++) {
    knots.push({
      cx: x0 + span * ((k + 0.5) / knotCount) + (rand() - 0.5) * 60,
      cy: y0 + h * (0.32 + rand() * 0.36),
      rx: 7 + rand() * 6,
      ry: 2.4 + rand() * 1.4,
      rot: (rand() - 0.5) * 6,
    });
  }

  const grain = buildGrain(rand, x0, y0, x1, y1, knots);

  let fibers = '';
  const fiberCount = Math.round(span / 16);
  for (let i = 0; i < fiberCount; i++) {
    const fx = x0 + 6 + rand() * (span - 12);
    const fy = y0 + 4 + rand() * (h - 8);
    const len = 5 + rand() * 12;
    fibers += ` M${r1(fx)} ${r1(fy)} q${r1(len / 2)} ${r1((rand() - 0.5) * 1.6)} ${r1(len)} ${r1((rand() - 0.5) * 1)}`;
  }

  const lane = (y: number): string => {
    const pts: Pt[] = [];
    const steps = Math.max(2, Math.round(span / 90));
    for (let i = 0; i <= steps; i++) {
      pts.push([x0 + 6 + ((span - 12) * i) / steps, y + (rand() - 0.5) * 0.8]);
    }
    return smoothOpenPath(pts);
  };

  const bw = clamp(h * 0.34, 16, 26);

  return {
    outline,
    grain,
    knots,
    fibers: fibers.trim(),
    bevel: lane(y0 + 2.6),
    underside: lane(y1 - 2.6),
    veins: buildVeins(rand, x0, y0, x1, y1, o.quiet),
    twigs: o.twigs.map((t) => buildTwig(t.x, t.side === 'top' ? y0 : y1, t.side)),
    lashings: o.lashings.map((cx) => buildLashing(rand, cx, y0, y1, bw)),
  };
}

// ============================================================================
// Shared vein renderer (carved crack + glow + luminous core + travelling mana)
// ============================================================================
interface VeinStrokesProps {
  main: string;
  mid: string;
  branches: string[];
  veinHex: string;
  veinSoftHex: string;
  glowFilterId: string;
  flowDur: number;
  flowDelay: number;
  scale?: number;
}

const VeinStrokes: React.FC<VeinStrokesProps> = ({
  main,
  mid,
  branches,
  veinHex,
  veinSoftHex,
  glowFilterId,
  flowDur,
  flowDelay,
  scale = 1,
}) => (
  <g fill="none" strokeLinecap="round" strokeLinejoin="round">
    <g stroke="#06030a" strokeOpacity={0.62}>
      <path d={main} strokeWidth={3 * scale} />
      <path d={mid} strokeWidth={4.4 * scale} />
      {branches.map((b, i) => (
        <path key={i} d={b} strokeWidth={2.4 * scale} />
      ))}
    </g>
    <g
      filter={`url(#${glowFilterId})`}
      stroke={veinHex}
      strokeOpacity={0.62}
      className="mc-vein-pulse"
    >
      <path d={main} strokeWidth={3.6 * scale} />
      <path d={mid} strokeWidth={5.4 * scale} />
      {branches.map((b, i) => (
        <path key={i} d={b} strokeWidth={3 * scale} />
      ))}
    </g>
    <g stroke={veinHex}>
      <path d={main} strokeWidth={1.4 * scale} />
      <path d={mid} strokeWidth={2.3 * scale} />
      {branches.map((b, i) => (
        <path key={i} d={b} strokeWidth={1.1 * scale} />
      ))}
    </g>
    <g stroke={veinSoftHex}>
      <path d={main} strokeWidth={0.6 * scale} />
      <path d={mid} strokeWidth={1 * scale} />
      {branches.map((b, i) => (
        <path key={i} d={b} strokeWidth={0.5 * scale} />
      ))}
    </g>
    <path
      d={main}
      pathLength={1}
      className="mc-mana-flow"
      stroke="#ffffff"
      strokeWidth={1.6 * scale}
      style={
        {
          '--flow-dur': `${flowDur.toFixed(2)}s`,
          '--flow-delay': `${flowDelay.toFixed(2)}s`,
        } as React.CSSProperties
      }
    />
  </g>
);

// ============================================================================
// <ManaWoodPlank /> — painted plank or log pole with lashings & branch stubs
// ============================================================================
export interface ManaWoodPlankProps {
  /** SVG canvas size in px (rendered 1:1, never stretched) */
  width: number;
  height: number;
  /** Wood body bounds inside the canvas */
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  seed: number;
  veinHex: string;
  veinSoftHex: string;
  showVeins: boolean;
  endStyle: WoodEndStyle;
  shading?: 'plank' | 'pole';
  /** X centers of cloth + rope lashings */
  lashings?: number[];
  /** Small branch stubs growing out of the top/bottom edge */
  twigs?: { x: number; side: 'top' | 'bottom' }[];
  /** X range where veins stay on the outer edges (keeps the text lane readable) */
  veinQuietZone?: [number, number] | null;
  className?: string;
}

export const ManaWoodPlank: React.FC<ManaWoodPlankProps> = ({
  width,
  height,
  x0,
  y0,
  x1,
  y1,
  seed,
  veinHex,
  veinSoftHex,
  showVeins,
  endStyle,
  shading = 'plank',
  lashings = [],
  twigs = [],
  veinQuietZone = null,
  className = 'absolute inset-0 pointer-events-none',
}) => {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const woodId = `mcw${uid}`;
  const clothId = `mcc${uid}`;
  const clipId = `mck${uid}`;
  const glowId = `mcg${uid}`;

  const lashKey = lashings.map((n) => Math.round(n)).join(',');
  const twigKey = twigs.map((t) => `${Math.round(t.x)}${t.side}`).join(',');
  const quietKey = veinQuietZone ? veinQuietZone.map((n) => Math.round(n)).join('-') : '';

  const geo = useMemo(
    () =>
      buildPlankGeometry({
        x0,
        y0,
        x1,
        y1,
        seed,
        endStyle,
        lashings,
        twigs,
        quiet: veinQuietZone,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [x0, y0, x1, y1, seed, endStyle, lashKey, twigKey, quietKey]
  );

  const stops = shading === 'pole' ? POLE_STOPS : PLANK_STOPS;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={woodId} x1="0" y1="0" x2="0" y2="1">
          {stops.map(([offset, color]) => (
            <stop key={offset} offset={offset} stopColor={color} />
          ))}
        </linearGradient>
        <linearGradient id={clothId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={WOOD.clothLight} />
          <stop offset="100%" stopColor={WOOD.clothDark} />
        </linearGradient>
        <clipPath id={clipId}>
          <path d={geo.outline} />
        </clipPath>
        <filter
          id={glowId}
          filterUnits="userSpaceOnUse"
          x={-12}
          y={-12}
          width={width + 24}
          height={height + 24}
        >
          <feGaussianBlur stdDeviation="2.4" />
        </filter>
      </defs>

      {/* Wood body */}
      <path d={geo.outline} fill={`url(#${woodId})`} />

      <g clipPath={`url(#${clipId})`}>
        {geo.grain.map((g, i) => (
          <path
            key={i}
            d={g.d}
            fill="none"
            stroke={g.dark ? WOOD.grainDark : WOOD.grainLight}
            strokeOpacity={g.dark ? 0.6 : 0.22}
            strokeWidth={g.dark ? 1.3 : 0.9}
          />
        ))}
        <path
          d={geo.fibers}
          fill="none"
          stroke={WOOD.grainDark}
          strokeOpacity={0.45}
          strokeWidth={0.9}
          strokeLinecap="round"
        />
        {geo.knots.map((k, i) => (
          <g key={i} transform={`rotate(${r1(k.rot)} ${r1(k.cx)} ${r1(k.cy)})`}>
            <ellipse
              cx={r1(k.cx)}
              cy={r1(k.cy)}
              rx={r1(k.rx * 1.7)}
              ry={r1(k.ry * 1.9)}
              fill="none"
              stroke={WOOD.grainDark}
              strokeOpacity={0.5}
              strokeWidth={1}
            />
            <ellipse
              cx={r1(k.cx)}
              cy={r1(k.cy)}
              rx={r1(k.rx)}
              ry={r1(k.ry)}
              fill="#140c19"
              fillOpacity={0.75}
              stroke={WOOD.grainLight}
              strokeOpacity={0.22}
              strokeWidth={0.8}
            />
            <ellipse
              cx={r1(k.cx)}
              cy={r1(k.cy)}
              rx={r1(k.rx * 0.45)}
              ry={r1(k.ry * 0.45)}
              fill="#08050b"
              fillOpacity={0.7}
            />
          </g>
        ))}

        {/* Painted top bevel + shadowed underside */}
        <path
          d={geo.bevel}
          fill="none"
          stroke="#f1e2ff"
          strokeOpacity={0.1}
          strokeWidth={2}
          strokeLinecap="round"
        />
        <path
          d={geo.underside}
          fill="none"
          stroke="#000000"
          strokeOpacity={0.35}
          strokeWidth={3}
          strokeLinecap="round"
        />

        {showVeins &&
          geo.veins.map((v, i) => (
            <VeinStrokes
              key={i}
              main={v.main}
              mid={v.mid}
              branches={v.branches}
              veinHex={veinHex}
              veinSoftHex={veinSoftHex}
              glowFilterId={glowId}
              flowDur={v.flowDur}
              flowDelay={v.flowDelay}
            />
          ))}
      </g>

      {/* Ink outline */}
      <path
        d={geo.outline}
        fill="none"
        stroke={WOOD.outline}
        strokeWidth={2.2}
        strokeLinejoin="round"
      />

      {/* Branch stubs grow out of the body (drawn over the outline at the joint) */}
      {geo.twigs.map((t, i) => (
        <g key={i}>
          <path d={t.shoot} stroke={WOOD.outline} strokeWidth={4} strokeLinecap="round" fill="none" />
          <path d={t.shoot} stroke={t.color} strokeWidth={2} strokeLinecap="round" fill="none" />
          <path d={t.fill} fill={t.color} />
          <path
            d={t.edge}
            stroke={WOOD.outline}
            strokeWidth={1.8}
            strokeLinejoin="round"
            fill="none"
          />
          <ellipse
            cx={r1(t.cap.cx)}
            cy={r1(t.cap.cy)}
            rx={t.cap.rx}
            ry={t.cap.ry}
            transform={`rotate(${t.cap.rot} ${r1(t.cap.cx)} ${r1(t.cap.cy)})`}
            fill={WOOD.endgrainCenter}
            stroke={WOOD.outline}
            strokeWidth={1.2}
          />
        </g>
      ))}

      {/* Cloth wraps + twisted rope coils */}
      {geo.lashings.map((l, i) => (
        <g key={i}>
          <path
            d={l.cloth}
            fill={`url(#${clothId})`}
            stroke={WOOD.outline}
            strokeWidth={1.7}
            strokeLinejoin="round"
          />
          {l.folds.map((d, fi) => (
            <path
              key={fi}
              d={d}
              fill="none"
              stroke={WOOD.clothFold}
              strokeOpacity={0.75}
              strokeWidth={1}
            />
          ))}
          {l.coils.map((d, ci) => (
            <g key={ci} fill="none">
              <path d={d} stroke={WOOD.ropeDark} strokeWidth={5.6} strokeLinecap="round" />
              <path d={d} stroke={WOOD.rope} strokeWidth={3.4} strokeLinecap="round" />
              <path
                d={d}
                stroke={WOOD.ropeDark}
                strokeOpacity={0.5}
                strokeWidth={3.4}
                strokeDasharray="1.4 2.2"
              />
              <path
                d={d}
                transform="translate(0 -0.9)"
                stroke={WOOD.ropeLight}
                strokeOpacity={0.55}
                strokeWidth={0.8}
                strokeLinecap="round"
              />
            </g>
          ))}
        </g>
      ))}
    </svg>
  );
};

// ============================================================================
// <LogMedallion /> — sawn log slice with tree rings & a glowing mana split
// ============================================================================
interface LogMedallionProps {
  size: number;
  seed: number;
  veinHex: string;
  veinSoftHex: string;
  showVeins: boolean;
}

export const LogMedallion: React.FC<LogMedallionProps> = ({
  size,
  seed,
  veinHex,
  veinSoftHex,
  showVeins,
}) => {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const egId = `mle${uid}`;
  const scId = `mls${uid}`;
  const clId = `mlc${uid}`;
  const glId = `mlg${uid}`;

  const geo = useMemo(() => {
    const rand = seededRandom(seed);
    const ring = (r: number, jit: number, n = 28) => {
      const pts: Pt[] = [];
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const rr = r + (rand() - 0.5) * jit * 2;
        pts.push([50 + Math.cos(a) * rr, 50 + Math.sin(a) * rr]);
      }
      return smoothClosedPath(pts);
    };

    const bark = ring(48, 1.2, 32);
    const sap = ring(42.5, 0.8, 30);
    const darkRings = [35, 28, 21, 14].map((r) => ring(r, 0.9, 24));
    const lightRings = [31.5, 24.5, 17.5, 10.5].map((r) => ring(r, 0.7, 22));

    let ticks = '';
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2 + rand() * 0.1;
      const ra = 43.6 + rand() * 0.8;
      const rb = 47 + rand() * 0.8;
      ticks += ` M${r1(50 + Math.cos(a) * ra)} ${r1(50 + Math.sin(a) * ra)} L${r1(50 + Math.cos(a) * rb)} ${r1(50 + Math.sin(a) * rb)}`;
    }

    const polar = (a: number, r: number): Pt => [50 + Math.cos(a) * r, 50 + Math.sin(a) * r];
    const crack = (a0: number, rStart: number, rEnd: number): Pt[] => {
      const pts: Pt[] = [];
      for (let s = 0; s <= 5; s++) {
        const t = s / 5;
        pts.push(polar(a0 + (rand() - 0.5) * 0.16, rStart + (rEnd - rStart) * t));
      }
      return pts;
    };

    const c1 = crack(-0.78, 47.5, 12);
    const c1Branch: Pt[] = [c1[2], polar(-0.38, 27), polar(-0.22, 21)];
    const c2 = [polar(2.3, 47.5), polar(2.36, 39), polar(2.3, 31), polar(2.4, 24), polar(2.36, 19)];
    const c1Path = smoothOpenPath(c1);
    const c2Path = smoothOpenPath(c2);

    return {
      bark,
      sap,
      darkRings,
      lightRings,
      ticks: ticks.trim(),
      veins: [
        { main: c1Path, mid: smoothOpenPath(c1.slice(0, 4)), branches: [smoothOpenPath(c1Branch)], flowDur: 3.4, flowDelay: 0.4 },
        { main: c2Path, mid: smoothOpenPath(c2.slice(0, 3)), branches: [], flowDur: 4.1, flowDelay: 1.6 },
      ],
    };
  }, [seed]);

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className="block"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id={egId} cx="50%" cy="46%" r="55%">
          <stop offset="0%" stopColor={WOOD.endgrainCenter} />
          <stop offset="55%" stopColor={WOOD.endgrainMid} />
          <stop offset="100%" stopColor={WOOD.endgrainEdge} />
        </radialGradient>
        <radialGradient id={scId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#0a060d" stopOpacity={0.6} />
          <stop offset="100%" stopColor="#0a060d" stopOpacity={0} />
        </radialGradient>
        <clipPath id={clId}>
          <path d={geo.sap} />
        </clipPath>
        <filter id={glId} filterUnits="userSpaceOnUse" x={-10} y={-10} width={120} height={120}>
          <feGaussianBlur stdDeviation="2" />
        </filter>
      </defs>

      <path d={geo.bark} fill={WOOD.bark} stroke={WOOD.outline} strokeWidth={2.4} />
      <path d={geo.ticks} stroke={WOOD.outline} strokeOpacity={0.7} strokeWidth={1.1} fill="none" />
      <path d={geo.sap} fill={`url(#${egId})`} stroke="#140d18" strokeWidth={1.3} />

      <g clipPath={`url(#${clId})`}>
        {geo.lightRings.map((d, i) => (
          <path key={`l${i}`} d={d} fill="none" stroke={WOOD.grainLight} strokeOpacity={0.28} strokeWidth={0.8} />
        ))}
        {geo.darkRings.map((d, i) => (
          <path key={`d${i}`} d={d} fill="none" stroke={WOOD.grainDark} strokeOpacity={0.6} strokeWidth={1.1} />
        ))}
        <ellipse cx={50.5} cy={49.5} rx={2.2} ry={1.8} fill="#1a111f" />

        {showVeins &&
          geo.veins.map((v, i) => (
            <VeinStrokes
              key={i}
              main={v.main}
              mid={v.mid}
              branches={v.branches}
              veinHex={veinHex}
              veinSoftHex={veinSoftHex}
              glowFilterId={glId}
              flowDur={v.flowDur}
              flowDelay={v.flowDelay}
              scale={0.85}
            />
          ))}

        <circle cx={50} cy={50} r={25} fill={`url(#${scId})`} />
      </g>
    </svg>
  );
};

// ============================================================================
// <BranchRune /> — small branching rune glyph used as marker & separator
// ============================================================================
export const BranchRune: React.FC<{
  color: string;
  className?: string;
  style?: React.CSSProperties;
}> = ({ color, className = 'w-[9px] h-3', style }) => (
  <svg
    viewBox="0 0 12 16"
    className={className}
    style={style}
    aria-hidden="true"
    focusable="false"
  >
    <path
      d="M6 15.2V1.6M6 6.4 2.4 2.6M6 6.4l3.6-3.8M6 10.6 3.4 8.2"
      stroke={color}
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);
