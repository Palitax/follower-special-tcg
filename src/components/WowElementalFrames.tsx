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
    subtitle: 'Gläserne Mana-Strömung',
    primary: '#38bdf8',
    secondary: '#1d4ed8',
    highlight: '#e0f2fe',
    glowRgb: '56, 189, 248',
    pillBorder: 'rgba(56, 189, 248, 0.72)',
  },
  'storm-lightning': {
    id: 'storm-lightning',
    label: 'Sturm-Blitz',
    subtitle: 'Einschlagende Kettenblitze',
    primary: '#7dd3fc',
    secondary: '#6366f1',
    highlight: '#ffffff',
    glowRgb: '125, 211, 252',
    pillBorder: 'rgba(129, 140, 248, 0.78)',
  },
  'wind-tempest': {
    id: 'wind-tempest',
    label: 'Wind-Wirbel',
    subtitle: 'Wirbelnde Zephyr-Ströme',
    primary: '#5eead4',
    secondary: '#0d9488',
    highlight: '#f0fdfa',
    glowRgb: '94, 234, 212',
    pillBorder: 'rgba(94, 234, 212, 0.72)',
  },
  'fel-flame': {
    id: 'fel-flame',
    label: 'Runen-Feuer',
    subtitle: 'Lodernde Runen-Glut',
    primary: '#FFE406',
    secondary: '#ea580c',
    highlight: '#fffbeb',
    glowRgb: '250, 204, 21',
    pillBorder: 'rgba(255, 228, 6, 0.78)',
  },
  'void-arcane': {
    id: 'void-arcane',
    label: 'Schatten-Arkan',
    subtitle: 'Rotierender Portal-Runenkreis',
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

type PerimeterPoint = { x: number; y: number; nx: number; ny: number };

/** Deterministic pseudo-random in [0, 1) so every render (Studio + OBS) is identical */
function seeded(i: number, salt = 1): number {
  const v = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return v - Math.floor(v);
}

/** Closed clockwise path of the base shape, grown outward (+) or shrunk inward (−) */
function offsetShapePath(
  shape: 'circle' | 'rect',
  cx: number,
  cy: number,
  pad: number,
  w: number,
  h: number,
  r: number,
  offset: number
): string {
  if (shape === 'circle') {
    const rr = Math.max(2, w / 2 + offset);
    return `M ${cx.toFixed(2)} ${(cy - rr).toFixed(2)} A ${rr.toFixed(2)} ${rr.toFixed(
      2
    )} 0 1 1 ${(cx - 0.01).toFixed(2)} ${(cy - rr).toFixed(2)} Z`;
  }
  return buildRoundedRectPath(
    pad - offset,
    pad - offset,
    Math.max(8, w + offset * 2),
    Math.max(8, h + offset * 2),
    Math.max(2, r + offset)
  );
}

interface CometTrailProps {
  d: string;
  color: string;
  headColor: string;
  width: number;
  durSec: number;
  /** Tail length in % of the perimeter */
  tail?: number;
  /** Phase offset 0..1 along the loop */
  phase?: number;
  reverse?: boolean;
  glow?: number;
}

/**
 * Tapered energy comet travelling along any closed path.
 * Four stacked dash layers share the same leading edge (aligned via negative animation-delay),
 * producing a soft fading tail out of pure crisp vector strokes — no blur filters, so it stays
 * razor-sharp in OBS Browser Sources.
 */
const CometTrail: React.FC<CometTrailProps> = ({
  d,
  color,
  headColor,
  width,
  durSec,
  tail = 30,
  phase = 0,
  reverse = false,
  glow = 1,
}) => {
  const layers = [
    { len: tail, op: 0.14 * glow, w: width * 2.8, c: color },
    { len: tail * 0.62, op: 0.34 * glow, w: width * 1.7, c: color },
    { len: tail * 0.34, op: 0.8, w: width * 1.1, c: color },
    { len: Math.max(1.4, tail * 0.1), op: 1, w: width * 0.9, c: headColor },
  ];
  return (
    <>
      {layers.map((l, idx) => {
        const shift = reverse ? 0 : (tail - l.len) / 100;
        const delay = -(((shift + phase) % 1) * durSec);
        return (
          <path
            key={`comet_${idx}`}
            d={d}
            pathLength={100}
            stroke={l.c}
            strokeOpacity={Math.min(1, l.op)}
            strokeWidth={l.w}
            strokeLinecap="round"
            strokeDasharray={`${l.len.toFixed(2)} ${(100 - l.len).toFixed(2)}`}
            className={reverse ? 'hud-flow-rev' : 'hud-flow'}
            style={{
              ['--hud-dur' as string]: `${durSec.toFixed(2)}s`,
              animationDelay: `${delay.toFixed(3)}s`,
            }}
          />
        );
      })}
    </>
  );
};

/** Crisp vector element gliding along a path via native SVG SMIL (GPU-cheap, sub-pixel smooth) */
const MotionAlongPath: React.FC<{
  path: string;
  durSec: number;
  phase: number;
  rotateAuto?: boolean;
  reverse?: boolean;
  children: React.ReactNode;
}> = ({ path, durSec, phase, rotateAuto = false, reverse = false, children }) => (
  <g>
    {children}
    <animateMotion
      path={path}
      dur={`${durSec.toFixed(2)}s`}
      begin={`${(-phase * durSec).toFixed(2)}s`}
      repeatCount="indefinite"
      calcMode="linear"
      rotate={rotateAuto ? 'auto' : undefined}
      keyPoints={reverse ? '1;0' : undefined}
      keyTimes={reverse ? '0;1' : undefined}
    />
  </g>
);

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
 * Hand-crafted WoW / high-fantasy elemental frames wrapping Whatnot's native Shop button,
 * Avatar logo and Giveaway card. Every style has its own clear visual signature:
 *
 *  - Liquid Mana:     glass orb ring, twin mana currents, glossy reflection, orbiting mana beads
 *  - Sturm-Blitz:     steel conduit ring, chain lightning that strikes in random bursts, spark nodes
 *  - Wind-Wirbel:     airy vortex — three counter-rotating zephyr streams + gliding wind curls
 *  - Runen-Feuer:     forged molten-gold ring, flickering flame tongues, rising embers, gold clasps
 *  - Schatten-Arkan:  mage portal circle with rotating rune glyph band, sigils & void comets
 *
 * Interior stays 100% transparent. Zero SVG/CSS blur filters → razor-sharp in OBS & Whatnot.
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
  const glow = Math.max(0.3, Math.min(1.6, intensityPct / 100));
  const bs = 3.6 * thick;

  // Generous transparent margin so flames, embers & outer rune bands never clip
  const pad = Math.round(58 * Math.max(0.85, thick));
  const w = Math.max(40, width);
  const h = shape === 'circle' ? w : Math.max(40, height);
  const svgW = w + pad * 2;
  const svgH = h + pad * 2;
  const cx = svgW / 2;
  const cy = svgH / 2;
  const r = shape === 'circle' ? w / 2 : Math.min(radius, w / 2, h / 2);

  const geo = useMemo(() => {
    const path = (off: number) => offsetShapePath(shape, cx, cy, pad, w, h, r, off);
    const points = (off: number, count: number): PerimeterPoint[] =>
      samplePerimeter(
        shape,
        cx,
        cy,
        w + off * 2,
        h + off * 2,
        Math.max(2, r + off),
        Math.max(4, count)
      );
    const perim =
      shape === 'circle' ? Math.PI * w : 2 * (w + h) - (8 - 2 * Math.PI) * Math.min(r, w / 2, h / 2);

    const boltPts = points(0, Math.max(48, Math.round(perim / 9)));

    return {
      base: path(0),
      outer1: path(bs * 1.6),
      outer2: path(bs * 2.9),
      inner1: path(-bs * 1.35),
      bolts: [1.7, 4.3, 7.9].map((seed, i) =>
        buildLightningPath(boltPts, (6 + i * 1.2) * thick, seed)
      ),
      flamePts: points(bs * 0.45, Math.round(perim / (23 * thick))),
      emberPts: points(bs * 0.9, shape === 'circle' ? 10 : 14),
      glyphPts: points(bs * 1.45, Math.round(perim / (19 * thick))),
      cardinals: [
        { x: cx, y: pad, angle: -90 },
        { x: pad + w, y: cy, angle: 0 },
        { x: cx, y: pad + h, angle: 90 },
        { x: pad, y: cy, angle: 180 },
      ],
    };
  }, [shape, cx, cy, pad, w, h, r, bs, thick]);

  const ringGradId = `hud_ring_${uid}`;
  const fireGradId = `hud_fire_${uid}`;
  const dur = (sec: number) => `${(sec * sp).toFixed(2)}s`;

  return (
    <svg
      width={svgW}
      height={svgH}
      viewBox={`0 0 ${svgW} ${svgH}`}
      fill="none"
      shapeRendering="geometricPrecision"
      className="pointer-events-none select-none overflow-visible"
      style={{ opacity: Math.min(1, 0.6 + glow * 0.4) }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={ringGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={meta.secondary} />
          <stop offset="30%" stopColor={meta.primary} />
          <stop offset="52%" stopColor={meta.highlight} />
          <stop offset="74%" stopColor={meta.primary} />
          <stop offset="100%" stopColor={meta.secondary} />
        </linearGradient>
        <linearGradient id={fireGradId} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#9a3412" />
          <stop offset="22%" stopColor={meta.secondary} />
          <stop offset="48%" stopColor={meta.primary} />
          <stop offset="60%" stopColor={meta.highlight} />
          <stop offset="78%" stopColor={meta.primary} />
          <stop offset="100%" stopColor={meta.secondary} />
        </linearGradient>
      </defs>

      {/* Atmospheric aura — stacked crisp vector halos (no blur filters) */}
      <path d={geo.base} stroke={meta.primary} strokeWidth={bs * 6.2} strokeOpacity={0.055 * glow} />
      <path
        d={geo.base}
        stroke={meta.primary}
        strokeWidth={bs * 3.4}
        strokeOpacity={0.12 * glow}
        className="hud-halo"
        style={{ ['--hud-dur' as string]: dur(3.4) }}
      />
      {/* Dark contrast rim so every style pops over bright or busy camera footage */}
      <path d={geo.base} stroke="#05060a" strokeWidth={bs * 2.1} strokeOpacity={0.5} />

      {/* ================================================================
          1. LIQUID MANA — glass orb ring with flowing mana currents
         ================================================================ */}
      {style === 'arcane-mana' && (
        <>
          <path d={geo.outer1} stroke={meta.primary} strokeWidth={bs * 0.32} strokeOpacity={0.55} />
          <path d={geo.base} stroke={`url(#${ringGradId})`} strokeWidth={bs * 1.15} />
          <path d={geo.inner1} stroke={meta.secondary} strokeWidth={bs * 0.4} strokeOpacity={0.75} />

          <CometTrail
            d={geo.base}
            color={meta.primary}
            headColor={meta.highlight}
            width={bs * 0.95}
            durSec={5.6 * sp}
            tail={34}
            glow={glow}
          />
          <CometTrail
            d={geo.base}
            color={meta.primary}
            headColor={meta.highlight}
            width={bs * 0.95}
            durSec={5.6 * sp}
            tail={34}
            phase={0.5}
            glow={glow}
          />

          {/* Glossy glass reflection (upper-left) */}
          <path
            d={geo.base}
            pathLength={100}
            stroke={meta.highlight}
            strokeOpacity={0.85}
            strokeWidth={bs * 0.38}
            strokeLinecap="round"
            strokeDasharray="11 89"
            strokeDashoffset={20}
          />

          {/* Orbiting mana beads */}
          {[0, 1 / 3, 2 / 3].map((ph) => (
            <MotionAlongPath key={`bead_${ph}`} path={geo.outer1} durSec={10 * sp} phase={ph}>
              <circle r={bs * 1.4} fill={meta.primary} fillOpacity={0.22 * glow} />
              <circle r={bs * 0.62} fill={meta.highlight} />
            </MotionAlongPath>
          ))}
        </>
      )}

      {/* ================================================================
          2. STURM-BLITZ — chain lightning striking in random bursts
         ================================================================ */}
      {style === 'storm-lightning' && (
        <>
          <path d={geo.base} stroke={meta.secondary} strokeWidth={bs * 1.0} strokeOpacity={0.9} />
          <path d={geo.base} stroke={meta.primary} strokeWidth={bs * 0.34} strokeOpacity={0.95} />
          <path d={geo.inner1} stroke={meta.primary} strokeWidth={bs * 0.26} strokeOpacity={0.45} />

          {geo.bolts.map((bd, i) => (
            <g
              key={`bolt_${i}`}
              className="hud-flash"
              style={{
                ['--hud-dur' as string]: dur(1.7 + i * 0.23),
                animationDelay: `${(-i * 0.57 * sp).toFixed(2)}s`,
              }}
            >
              <path
                d={bd}
                pathLength={100}
                stroke={meta.primary}
                strokeOpacity={0.32 * glow}
                strokeWidth={bs * 1.9}
                strokeLinejoin="round"
                strokeLinecap="round"
                strokeDasharray="36 64"
                strokeDashoffset={-i * 33}
              />
              <path
                d={bd}
                pathLength={100}
                stroke={meta.highlight}
                strokeWidth={bs * 0.55}
                strokeLinejoin="round"
                strokeLinecap="round"
                strokeDasharray="36 64"
                strokeDashoffset={-i * 33}
              />
            </g>
          ))}

          <CometTrail
            d={geo.base}
            color={meta.primary}
            headColor="#ffffff"
            width={bs * 0.8}
            durSec={2.6 * sp}
            tail={22}
            glow={glow}
          />

          {/* Crackling spark nodes */}
          {geo.cardinals.map((c, i) => {
            const s = 6.5 * thick;
            const k = s * 0.22;
            return (
              <g
                key={`spark_${i}`}
                className="hud-flash"
                style={{
                  ['--hud-dur' as string]: dur(1.3 + i * 0.31),
                  animationDelay: `${(-i * 0.41 * sp).toFixed(2)}s`,
                }}
              >
                <circle cx={c.x} cy={c.y} r={s * 1.1} fill={meta.primary} fillOpacity={0.25 * glow} />
                <polygon
                  points={`${c.x},${c.y - s} ${c.x + k},${c.y - k} ${c.x + s},${c.y} ${c.x + k},${
                    c.y + k
                  } ${c.x},${c.y + s} ${c.x - k},${c.y + k} ${c.x - s},${c.y} ${c.x - k},${c.y - k}`}
                  fill="#ffffff"
                />
              </g>
            );
          })}
        </>
      )}

      {/* ================================================================
          3. WIND-WIRBEL — airy vortex of counter-rotating zephyr streams
         ================================================================ */}
      {style === 'wind-tempest' && (
        <>
          <path d={geo.base} stroke={meta.secondary} strokeWidth={bs * 0.62} strokeOpacity={0.75} />
          <path
            d={geo.outer2}
            pathLength={100}
            stroke={meta.primary}
            strokeWidth={bs * 0.3}
            strokeOpacity={0.4}
            strokeDasharray="0.6 3.4"
            strokeLinecap="round"
          />

          <CometTrail
            d={geo.outer2}
            color={meta.primary}
            headColor={meta.highlight}
            width={bs * 0.55}
            durSec={3.6 * sp}
            tail={42}
            glow={glow}
          />
          <CometTrail
            d={geo.outer2}
            color={meta.primary}
            headColor={meta.highlight}
            width={bs * 0.55}
            durSec={3.6 * sp}
            tail={42}
            phase={0.5}
            glow={glow}
          />
          <CometTrail
            d={geo.base}
            color={meta.primary}
            headColor={meta.highlight}
            width={bs * 0.85}
            durSec={4.8 * sp}
            tail={38}
            phase={0.25}
            glow={glow}
          />
          <CometTrail
            d={geo.base}
            color={meta.primary}
            headColor={meta.highlight}
            width={bs * 0.85}
            durSec={4.8 * sp}
            tail={38}
            phase={0.75}
            glow={glow}
          />
          <CometTrail
            d={geo.inner1}
            color={meta.highlight}
            headColor="#ffffff"
            width={bs * 0.42}
            durSec={3.0 * sp}
            tail={30}
            reverse
            glow={glow}
          />

          {/* Gliding wind curls */}
          {[0.12, 0.45, 0.78].map((ph) => (
            <MotionAlongPath
              key={`curl_${ph}`}
              path={geo.outer2}
              durSec={3.6 * sp}
              phase={ph}
              rotateAuto
            >
              <g transform={`scale(${thick.toFixed(2)})`}>
                <path
                  d="M -9 2 Q -3 -7 5 -3 Q 9 0 5 3 Q 2 4 1 1"
                  stroke={meta.highlight}
                  strokeWidth={1.6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            </MotionAlongPath>
          ))}
        </>
      )}

      {/* ================================================================
          4. RUNEN-FEUER — forged molten gold, flame tongues & embers
         ================================================================ */}
      {style === 'fel-flame' && (
        <>
          <path d={geo.outer1} stroke={meta.primary} strokeWidth={bs * 0.3} strokeOpacity={0.5} />

          {/* Flickering flame tongues (bases tucked beneath the ring) */}
          {geo.flamePts.map((p, i) => {
            const tall = i % 2 === 0;
            const fh = (tall ? 17 : 11) * thick * (0.85 + 0.3 * seeded(i, 3));
            const bw = 9 * thick;
            const curl = (i % 3 === 0 ? 1 : -1) * bw * 0.22;
            const angle = (Math.atan2(p.ny, p.nx) * 180) / Math.PI;
            // Classic teardrop flame: rounded belly near the base, tapering into a curled tip
            const flamePath = (len: number, wid: number, tip: number) =>
              `M 0 ${(-wid / 2).toFixed(2)} C ${(len * 0.3).toFixed(2)} ${(-wid * 0.9).toFixed(2)} ${(
                len * 0.72
              ).toFixed(2)} ${(-wid * 0.28 + tip * 0.4).toFixed(2)} ${len.toFixed(2)} ${tip.toFixed(
                2
              )} C ${(len * 0.66).toFixed(2)} ${(wid * 0.2 + tip * 0.4).toFixed(2)} ${(len * 0.3).toFixed(
                2
              )} ${(wid * 0.85).toFixed(2)} 0 ${(wid / 2).toFixed(2)} Z`;
            const outer = flamePath(fh, bw, curl);
            const core = flamePath(fh * 0.58, bw * 0.5, curl * 0.6);
            return (
              <g
                key={`flame_${i}`}
                transform={`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${angle.toFixed(1)})`}
              >
                <g
                  className="hud-flicker"
                  style={{
                    ['--hud-dur' as string]: dur(1.1 + seeded(i, 7) * 0.8),
                    animationDelay: `${(-seeded(i, 11) * 1.6).toFixed(2)}s`,
                  }}
                >
                  <path d={outer} fill={meta.secondary} fillOpacity={0.9} />
                  <path d={core} fill={meta.primary} fillOpacity={0.95} />
                </g>
              </g>
            );
          })}

          <path d={geo.base} stroke={`url(#${fireGradId})`} strokeWidth={bs * 1.25} />
          <path d={geo.inner1} stroke="#7c2d12" strokeWidth={bs * 0.42} strokeOpacity={0.95} />

          <CometTrail
            d={geo.base}
            color={meta.primary}
            headColor={meta.highlight}
            width={bs * 0.85}
            durSec={4.6 * sp}
            tail={26}
            glow={glow}
          />

          {/* Rising embers */}
          {geo.emberPts.map((p, i) => {
            const s = 2.3 * thick;
            const dist = 30 * thick;
            return (
              <g
                key={`ember_${i}`}
                className="hud-ember"
                style={{
                  ['--ex' as string]: `${(p.nx * dist).toFixed(1)}px`,
                  ['--ey' as string]: `${(p.ny * dist - 9 * thick).toFixed(1)}px`,
                  ['--hud-dur' as string]: dur(2.4 + seeded(i, 5) * 1.2),
                  animationDelay: `${(-seeded(i, 9) * 3).toFixed(2)}s`,
                }}
              >
                <polygon
                  points={`${p.x},${p.y - s} ${p.x + s * 0.7},${p.y} ${p.x},${p.y + s} ${
                    p.x - s * 0.7
                  },${p.y}`}
                  fill={i % 3 === 0 ? meta.highlight : '#fdba74'}
                />
              </g>
            );
          })}

          {/* Forged gold clasps */}
          {geo.cardinals.map((c, i) => {
            const s = 7.5 * thick;
            return (
              <g key={`clasp_${i}`}>
                <polygon
                  points={`${c.x},${c.y - s} ${c.x + s},${c.y} ${c.x},${c.y + s} ${c.x - s},${c.y}`}
                  fill="#7c2d12"
                  stroke={meta.primary}
                  strokeWidth={1.8 * thick}
                />
                <polygon
                  points={`${c.x},${c.y - s * 0.45} ${c.x + s * 0.45},${c.y} ${c.x},${
                    c.y + s * 0.45
                  } ${c.x - s * 0.45},${c.y}`}
                  fill={meta.highlight}
                />
              </g>
            );
          })}
        </>
      )}

      {/* ================================================================
          5. SCHATTEN-ARKAN — mage portal circle with rotating rune band
         ================================================================ */}
      {style === 'void-arcane' && (
        <>
          <path d={geo.outer2} stroke={meta.primary} strokeWidth={bs * 0.42} strokeOpacity={0.85} />

          <g
            className={shape === 'circle' ? 'hud-orbit-cw' : 'hud-halo'}
            style={{ ['--hud-dur' as string]: dur(shape === 'circle' ? 36 : 4) }}
          >
            {geo.glyphPts.map((p, i) => {
              const s = 3.6 * thick;
              const angle = (Math.atan2(p.ny, p.nx) * 180) / Math.PI;
              const kind = [0, 3, 2, 3, 1, 3, 4, 3][i % 8];
              const sw = 1.3 * thick;
              return (
                <g
                  key={`glyph_${i}`}
                  transform={`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${angle.toFixed(1)})`}
                >
                  {kind === 0 && (
                    <line x1={-s} y1={0} x2={s} y2={0} stroke={meta.highlight} strokeWidth={sw} strokeLinecap="round" />
                  )}
                  {kind === 1 && (
                    <polygon
                      points={`0,${-s * 0.75} ${s * 0.75},0 0,${s * 0.75} ${-s * 0.75},0`}
                      fill={meta.highlight}
                    />
                  )}
                  {kind === 2 && (
                    <polyline
                      points={`${-s * 0.6},${-s * 0.7} ${s * 0.6},0 ${-s * 0.6},${s * 0.7}`}
                      stroke={meta.highlight}
                      strokeWidth={sw}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}
                  {kind === 3 && <circle r={s * 0.32} fill={meta.primary} />}
                  {kind === 4 && (
                    <>
                      <line x1={-s * 0.8} y1={-s * 0.45} x2={s * 0.8} y2={-s * 0.45} stroke={meta.highlight} strokeWidth={sw} strokeLinecap="round" />
                      <line x1={-s * 0.8} y1={s * 0.45} x2={s * 0.8} y2={s * 0.45} stroke={meta.highlight} strokeWidth={sw} strokeLinecap="round" />
                    </>
                  )}
                </g>
              );
            })}
          </g>

          <path d={geo.base} stroke={`url(#${ringGradId})`} strokeWidth={bs * 1.0} />
          <path
            d={geo.inner1}
            pathLength={100}
            stroke={meta.highlight}
            strokeWidth={bs * 0.3}
            strokeOpacity={0.75}
            strokeDasharray="0.8 1.7"
            className="hud-flow-rev"
            style={{ ['--hud-dur' as string]: dur(40) }}
          />

          <CometTrail
            d={geo.base}
            color={meta.primary}
            headColor={meta.highlight}
            width={bs * 0.8}
            durSec={6.4 * sp}
            tail={30}
            glow={glow}
          />
          <CometTrail
            d={geo.base}
            color={meta.primary}
            headColor={meta.highlight}
            width={bs * 0.8}
            durSec={6.4 * sp}
            tail={30}
            phase={0.5}
            glow={glow}
          />

          {/* Portal sigils */}
          {geo.cardinals.map((c, i) => {
            const s = 8.5 * thick;
            return (
              <g
                key={`sigil_${i}`}
                className="hud-halo"
                style={{
                  ['--hud-dur' as string]: dur(2.8),
                  animationDelay: `${(-i * 0.7 * sp).toFixed(2)}s`,
                }}
              >
                <circle cx={c.x} cy={c.y} r={s * 1.25} fill={meta.primary} fillOpacity={0.18 * glow} />
                <polygon
                  points={`${c.x},${c.y - s} ${c.x + s},${c.y} ${c.x},${c.y + s} ${c.x - s},${c.y}`}
                  fill="#1a0b2e"
                  stroke={meta.highlight}
                  strokeWidth={2 * thick}
                />
                <circle cx={c.x} cy={c.y} r={2.4 * thick} fill={meta.highlight} />
              </g>
            );
          })}
        </>
      )}
    </svg>
  );
};

interface HudCalloutPointerProps {
  /** Stage canvas width & height in logical px (e.g. 960x720 standalone or 1080x1920 full) */
  canvasW?: number;
  canvasH?: number;
  /** Center of the target widget in canvas px */
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
  /** Studio-only interactive drag handler to freely move the text pill & auto-aim arrow */
  interactive?: boolean;
  /** Current CSS scale of the preview stage (used to convert pointer deltas accurately) */
  previewScale?: number;
  onDragOffset?: (nextOffsetX: number, nextOffsetY: number) => void;
}

/**
 * Dynamic curved animated arrow + sleek ManaCards/Whatnot HUD pill that automatically
 * aims from the user's configured offset directly onto the Shop circle or Giveaway frame.
 * Supports direct pointer dragging inside the Studio preview.
 */
export const HudCalloutPointer: React.FC<HudCalloutPointerProps> = ({
  canvasW = 1080,
  canvasH = 1920,
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
  interactive = false,
  previewScale = 1,
  onDragOffset,
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

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive || !onDragOffset) return;
    e.preventDefault();
    e.stopPropagation();
    const targetEl = e.currentTarget;
    targetEl.setPointerCapture(e.pointerId);
    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const startOx = offsetX;
    const startOy = offsetY;
    const invScale = 1 / Math.max(0.15, previewScale);

    const onMove = (ev: PointerEvent) => {
      const deltaX = (ev.clientX - startClientX) * invScale;
      const deltaY = (ev.clientY - startClientY) * invScale;
      const clampedX = Math.max(-520, Math.min(520, Math.round(startOx + deltaX)));
      const clampedY = Math.max(-380, Math.min(380, Math.round(startOy + deltaY)));
      onDragOffset(clampedX, clampedY);
    };

    const onUp = (ev: PointerEvent) => {
      try {
        targetEl.releasePointerCapture(ev.pointerId);
      } catch {
        // ignore
      }
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  return (
    <div className="pointer-events-none absolute inset-0 select-none overflow-visible">
      {/* Curved Animated Arrow SVG */}
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${canvasW} ${canvasH}`}
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
          }}
        >
          {/* Crisp dark shadow stroke + pure vector aura halo (zero CSS filter raster blur!) */}
          <path
            d={`M ${sx.toFixed(1)} ${sy.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${ex.toFixed(
              1
            )} ${ey.toFixed(1)}`}
            stroke={meta.primary}
            strokeWidth={15 * sc}
            strokeOpacity={0.14}
            strokeLinecap="round"
          />
          <path
            d={`M ${sx.toFixed(1)} ${sy.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${ex.toFixed(
              1
            )} ${ey.toFixed(1)}`}
            stroke="#06070c"
            strokeWidth={9.5 * sc}
            strokeOpacity={0.55}
            strokeLinecap="round"
          />
          {/* Main glowing shaft */}
          <path
            d={`M ${sx.toFixed(1)} ${sy.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${ex.toFixed(
              1
            )} ${ey.toFixed(1)}`}
            stroke={`url(#${shaftGradId})`}
            strokeWidth={5 * sc}
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
          {/* Crisp dark outline under arrowhead + luminous chevron */}
          <path
            d={`M ${w1x.toFixed(1)} ${w1y.toFixed(1)} L ${ex.toFixed(1)} ${ey.toFixed(1)} L ${w2x.toFixed(
              1
            )} ${w2y.toFixed(1)}`}
            stroke="#06070c"
            strokeWidth={9.5 * sc}
            strokeOpacity={0.55}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
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

      {/* Floating Broadcast HUD Callout Text Pill (draggable inside Studio Preview) */}
      {(text.trim() || subtext.trim()) && (
        <div
          onPointerDown={handlePointerDown}
          title={interactive ? 'Ziehen zum Positionieren des Hinweis-Pfeils' : undefined}
          className={`absolute font-wn-sans mc-crisp-overlay ${
            interactive
              ? 'pointer-events-auto cursor-grab active:cursor-grabbing ring-2 ring-transparent hover:ring-[#FFE406]/80 rounded-2xl transition-shadow'
              : 'pointer-events-none'
          }`}
          style={{
            left: pillX,
            top: pillY,
            transform: 'translate(-50%, -50%)',
            maxWidth: Math.round(430 * sc),
            touchAction: interactive ? 'none' : undefined,
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
