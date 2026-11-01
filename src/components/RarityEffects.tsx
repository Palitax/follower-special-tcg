'use client';

/**
 * RarityEffects – tier-specific energy effects rendered around a TCG card.
 *
 *  RARE       → Electric blue: crackling lightning bolts crawling along the frame,
 *               current racing around the rim, sparks popping off the edges.
 *  EPIC       → Arcane violet: intertwined sine-wave energy lines flowing along the sides,
 *               expanding ripple pulses and drifting purple smoke wisps.
 *  LEGENDARY  → Divine gold: rotating god-rays behind the card and a constant stream of
 *               rising golden embers & light streaks – clearly the final tier.
 *
 * All motion is CSS-driven (transform / opacity) so dozens of cards stay smooth on iPad.
 * Rendered in two layers: `back` (behind the card) and `front` (above the card).
 */

import React, { useId, useMemo, useState } from 'react';
import { CardRarity } from '../types/card';

export type EffectDensity = 'full' | 'reduced' | 'minimal' | 'none';

interface RarityEffectsProps {
  rarity: CardRarity;
  layer: 'back' | 'front';
  density: EffectDensity;
  seed: number;
}

// ---------------------------------------------------------------------------
// Deterministic PRNG so every card gets its own – but stable – particle layout
// ---------------------------------------------------------------------------
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
type Rng = () => number;
const range = (rng: Rng, min: number, max: number) => min + rng() * (max - min);

// ---------------------------------------------------------------------------
// SVG overlay geometry: the SVG extends 9% beyond the card on every side.
// viewBox 0..118 on both axes → the card occupies [9, 109] (non-uniformly scaled,
// strokes use `vector-effect: non-scaling-stroke` so line widths stay crisp).
// ---------------------------------------------------------------------------
const VB = 118;
const C0 = 9;
const C1 = 109;
// Card corner radius (rounded-[4.5%]) expressed in viewBox units for both axes
const RX = 4.5;
const RY = 4.5;

type Pt = [number, number];
type Edge = { a: Pt; b: Pt; n: Pt };
const EDGES: Edge[] = [
  { a: [C0, C0], b: [C1, C0], n: [0, -1] }, // top
  { a: [C1, C0], b: [C1, C1], n: [1, 0] }, // right
  { a: [C1, C1], b: [C0, C1], n: [0, 1] }, // bottom
  { a: [C0, C1], b: [C0, C0], n: [-1, 0] }, // left
];

const fmt = (p: Pt) => `${p[0].toFixed(2)} ${p[1].toFixed(2)}`;

/** Jagged lightning path between two points (+ optional fork) */
function jaggedPath(rng: Rng, from: Pt, to: Pt, segments: number, amp: number, normal: Pt, bias: number) {
  const pts: Pt[] = [from];
  for (let i = 1; i < segments; i++) {
    const t = i / segments;
    const envelope = Math.sin(Math.PI * t); // keep endpoints anchored
    const off = (rng() * 2 - 1) * amp * (0.45 + envelope * 0.55) + bias * envelope;
    pts.push([
      from[0] + (to[0] - from[0]) * t + normal[0] * off + (rng() - 0.5) * 0.8,
      from[1] + (to[1] - from[1]) * t + normal[1] * off + (rng() - 0.5) * 0.8,
    ]);
  }
  pts.push(to);
  return pts;
}

function makeBolt(rng: Rng): string {
  const edge = EDGES[Math.floor(rng() * 4)];
  const along: Pt = [edge.b[0] - edge.a[0], edge.b[1] - edge.a[1]];
  const len = Math.hypot(along[0], along[1]);
  const dir: Pt = [along[0] / len, along[1] / len];
  const at = (t: number, out: number): Pt => [
    edge.a[0] + along[0] * t + edge.n[0] * out,
    edge.a[1] + along[1] * t + edge.n[1] * out,
  ];

  let main: Pt[];
  if (rng() < 0.62) {
    // Crawling arc that hugs the frame
    const span = range(rng, 0.2, 0.45);
    const t0 = range(rng, 0.04, 0.96 - span);
    main = jaggedPath(rng, at(t0, range(rng, -0.5, 1.5)), at(t0 + span, range(rng, -0.5, 1.5)), 9 + Math.floor(rng() * 4), 3.2, edge.n, 2.2);
  } else {
    // Discharge leaping outward from the frame
    const t = range(rng, 0.08, 0.92);
    const start = at(t, 0);
    const reach = range(rng, 8, 15);
    const sideways = range(rng, -6, 6);
    const end: Pt = [start[0] + edge.n[0] * reach + dir[0] * sideways, start[1] + edge.n[1] * reach + dir[1] * sideways];
    const perp: Pt = [dir[0], dir[1]];
    main = jaggedPath(rng, start, end, 7 + Math.floor(rng() * 3), 2.4, perp, 0);
  }

  let d = `M ${main.map(fmt).join(' L ')}`;

  // Fork from a mid point
  if (rng() < 0.7) {
    const k = 2 + Math.floor(rng() * (main.length - 4));
    const origin = main[k];
    const forkEnd: Pt = [
      origin[0] + edge.n[0] * range(rng, 3, 7) + dir[0] * range(rng, -5, 5),
      origin[1] + edge.n[1] * range(rng, 3, 7) + dir[1] * range(rng, -5, 5),
    ];
    const fork = jaggedPath(rng, origin, forkEnd, 4, 1.4, [dir[0], dir[1]], 0);
    d += ` M ${fork.map(fmt).join(' L ')}`;
  }
  return d;
}

/** Sine wave as a smooth path. axis 'v' → runs vertically at x = base, 'h' → horizontally at y = base */
function wavePath(axis: 'v' | 'h', base: number, amp: number, wavelength: number, phase: number) {
  const parts: string[] = [];
  for (let s = -wavelength; s <= VB + wavelength; s += 1) {
    const o = base + amp * Math.sin((2 * Math.PI * s) / wavelength + phase);
    parts.push(axis === 'v' ? `${o.toFixed(2)} ${s}` : `${s} ${o.toFixed(2)}`);
  }
  return `M ${parts.join(' L ')}`;
}

// ---------------------------------------------------------------------------
// RARE – single lightning bolt that reshapes itself on every flash
// ---------------------------------------------------------------------------
const Bolt: React.FC<{ seed: number; duration: number; delay: number; thin: boolean; live?: boolean }> = ({
  seed,
  duration,
  delay,
  thin,
  live = false,
}) => {
  const [d, setD] = useState(() => makeBolt(mulberry32(seed)));
  return (
    <g
      className={live ? 'rfx-bolt rfx-bolt--live' : 'rfx-bolt'}
      style={{ animationDuration: `${duration}s`, animationDelay: `${delay}s` }}
      onAnimationIteration={() => setD(makeBolt(Math.random))}
    >
      <path d={d} className="rfx-bolt-glow" strokeWidth={thin ? 6 : 10} vectorEffect="non-scaling-stroke" />
      <path d={d} className="rfx-bolt-mid" strokeWidth={thin ? 2 : 3.2} vectorEffect="non-scaling-stroke" />
      <path d={d} className="rfx-bolt-core" strokeWidth={thin ? 0.9 : 1.4} vectorEffect="non-scaling-stroke" />
    </g>
  );
};

const RareFront: React.FC<{ density: EffectDensity; seed: number }> = ({ density, seed }) => {
  const config = useMemo(() => {
    const rng = mulberry32(seed * 7919 + 11);
    const boltCount = density === 'full' ? 10 : density === 'reduced' ? 6 : 3;
    const liveCount = density === 'full' ? 2 : density === 'reduced' ? 1 : 0;
    const sparkCount = density === 'full' ? 16 : density === 'reduced' ? 8 : 3;
    const bolts = Array.from({ length: boltCount }, (_, i) => ({
      seed: seed * 131 + i * 977,
      duration: range(rng, 1.1, 2.4),
      delay: range(rng, 0, 2.2),
      live: false,
    }));
    // "Live" arcs: permanently crackling, reshaping several times per second
    for (let i = 0; i < liveCount; i++) {
      bolts.push({ seed: seed * 733 + i * 389, duration: range(rng, 0.32, 0.5), delay: range(rng, 0, 0.4), live: true });
    }
    const sparks = Array.from({ length: sparkCount }, () => {
      const side = Math.floor(rng() * 4);
      const t = range(rng, 0.06, 0.94) * 100;
      const dist = range(rng, 16, 34);
      const spread = range(rng, -14, 14);
      const pos =
        side === 0 ? { left: t, top: 0, dx: spread, dy: -dist }
        : side === 1 ? { left: 100, top: t, dx: dist, dy: spread }
        : side === 2 ? { left: t, top: 100, dx: spread, dy: dist }
        : { left: 0, top: t, dx: -dist, dy: spread };
      return {
        ...pos,
        rot: (Math.atan2(pos.dy, pos.dx) * 180) / Math.PI + 90,
        dur: range(rng, 1.1, 2.2),
        delay: range(rng, 0, 2.5),
      };
    });
    return { bolts, sparks };
  }, [density, seed]);

  const thin = density !== 'full';

  return (
    <>
      <svg
        className={`rfx-svg ${density === 'full' ? 'rfx-svg--glow-blue' : ''}`}
        viewBox={`0 0 ${VB} ${VB}`}
        preserveAspectRatio="none"
        aria-hidden
      >
        {/* Current racing around the frame */}
        <rect x={C0} y={C0} width={C1 - C0} height={C1 - C0} rx={RX} ry={RY} pathLength={100}
          className="rfx-rare-rim-glow" strokeWidth={thin ? 3 : 5} vectorEffect="non-scaling-stroke" />
        <rect x={C0} y={C0} width={C1 - C0} height={C1 - C0} rx={RX} ry={RY} pathLength={100}
          className="rfx-rare-rim" strokeWidth={thin ? 1 : 1.5} vectorEffect="non-scaling-stroke" />
        <rect x={C0} y={C0} width={C1 - C0} height={C1 - C0} rx={RX} ry={RY} pathLength={100}
          className="rfx-rare-rim-fast" strokeWidth={1} vectorEffect="non-scaling-stroke" />

        {config.bolts.map((b, i) => (
          <Bolt key={i} seed={b.seed} duration={b.duration} delay={b.delay} thin={thin} live={b.live} />
        ))}
      </svg>

      {config.sparks.map((s, i) => (
        <span
          key={i}
          className="rfx-spark"
          style={
            {
              left: `${s.left}%`,
              top: `${s.top}%`,
              '--dx': `${s.dx}px`,
              '--dy': `${s.dy}px`,
              '--rot': `${s.rot}deg`,
              animationDuration: `${s.dur}s`,
              animationDelay: `${s.delay}s`,
            } as React.CSSProperties
          }
        />
      ))}
    </>
  );
};

// ---------------------------------------------------------------------------
// EPIC – arcane waves + smoke
// ---------------------------------------------------------------------------
const EpicBack: React.FC<{ density: EffectDensity; seed: number }> = ({ density, seed }) => {
  const wisps = useMemo(() => {
    const rng = mulberry32(seed * 3571 + 5);
    const count = density === 'full' ? 12 : density === 'reduced' ? 7 : 4;
    return Array.from({ length: count }, (_, i) => {
      // Spawn zones: sides (subtle, neighbours are close) · top edge (billows upward) · bottom corners
      const zone = i % 3;
      const side = i % 2 === 0 ? -1 : 1;
      let left: number;
      let top: number;
      let size: number;
      let dx: number;
      if (zone === 0) {
        left = side < 0 ? range(rng, -3, 5) : range(rng, 95, 103);
        top = range(rng, 35, 95);
        size = range(rng, 36, 52);
        dx = side * range(rng, 4, 12);
      } else if (zone === 1) {
        left = range(rng, 12, 88);
        top = range(rng, 0, 8);
        size = range(rng, 40, 58);
        dx = (left < 50 ? -1 : 1) * range(rng, 8, 22);
      } else {
        left = side < 0 ? range(rng, 2, 20) : range(rng, 80, 98);
        top = range(rng, 94, 104);
        size = range(rng, 46, 66);
        dx = side * range(rng, 6, 16);
      }
      return {
        left,
        top,
        size,
        dx,
        dy: -range(rng, 40, 85),
        rot: range(rng, -140, 140),
        op: range(rng, 0.8, 1),
        dur: range(rng, 5, 8),
        delay: -range(rng, 0, 8),
        tone: rng() < 0.45 ? 'fuchsia' : 'violet',
      };
    });
  }, [density, seed]);

  return (
    <>
      <div className="rfx-epic-glow" />
      {wisps.map((w, i) => (
        <span
          key={i}
          className={`rfx-smoke rfx-smoke--${w.tone}`}
          style={
            {
              left: `${w.left}%`,
              top: `${w.top}%`,
              width: `${w.size}%`,
              '--dx': `${w.dx}px`,
              '--dy': `${w.dy}px`,
              '--rot': `${w.rot}deg`,
              '--op': w.op,
              animationDuration: `${w.dur}s`,
              animationDelay: `${w.delay}s`,
            } as React.CSSProperties
          }
        />
      ))}
    </>
  );
};

const EpicFront: React.FC<{ density: EffectDensity }> = ({ density }) => {
  const uid = useId().replace(/:/g, '');
  const thin = density !== 'full';
  // Two intertwined strands per side form a rising arcane helix
  const strands = useMemo(
    () => [
      { d: wavePath('v', C0 - 4, 2.6, 34, 0), tone: 'violet', dur: 3.2 },
      { d: wavePath('v', C0 - 4, 2.6, 34, Math.PI), tone: 'fuchsia', dur: 3.2 },
      { d: wavePath('v', C1 + 4, 2.6, 34, Math.PI / 2), tone: 'violet', dur: 3.6 },
      { d: wavePath('v', C1 + 4, 2.6, 34, Math.PI * 1.5), tone: 'fuchsia', dur: 3.6 },
    ],
    []
  );
  const rippleCount = density === 'minimal' ? 1 : density === 'reduced' ? 2 : 3;

  return (
    <>
      {Array.from({ length: rippleCount }, (_, i) => (
        <span key={i} className="rfx-ripple" style={{ animationDelay: `${(i * 3.3) / rippleCount}s` }} />
      ))}

      <svg className={`rfx-svg ${density === 'full' ? 'rfx-svg--glow-violet' : ''}`} viewBox={`0 0 ${VB} ${VB}`} preserveAspectRatio="none" aria-hidden>
        <defs>
          {/* Strands fade in from the bottom and dissolve towards the top → reads as rising energy, not a frame */}
          <linearGradient id={`${uid}-fv`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset="0.2" stopColor="#fff" stopOpacity="1" />
            <stop offset="0.6" stopColor="#fff" stopOpacity="0.85" />
            <stop offset="0.92" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <mask id={`${uid}-mv`} maskUnits="userSpaceOnUse" x="0" y="0" width={VB} height={VB}>
            <rect x="0" y="0" width={VB} height={VB} fill={`url(#${uid}-fv)`} />
          </mask>
        </defs>

        <g mask={`url(#${uid}-mv)`}>
          {strands.map((st, i) => (
            <g key={i} className="rfx-wave-v" style={{ animationDuration: `${st.dur}s` }}>
              <path d={st.d} className={`rfx-wave-glow rfx-wave-${st.tone}`} strokeWidth={thin ? 4 : 7} vectorEffect="non-scaling-stroke" />
              <path d={st.d} className={`rfx-wave-line rfx-wave-${st.tone}`} strokeWidth={thin ? 1.1 : 1.8} vectorEffect="non-scaling-stroke" />
            </g>
          ))}
        </g>
      </svg>
    </>
  );
};

// ---------------------------------------------------------------------------
// LEGENDARY – god rays + rising golden embers
// ---------------------------------------------------------------------------
const LegendaryBack: React.FC<{ density: EffectDensity }> = ({ density }) => (
  <>
    <div className={`rfx-legend-rays ${density === 'full' ? '' : 'rfx-legend-rays--compact'}`} />
    {density === 'full' && <div className="rfx-legend-rays rfx-legend-rays--counter" />}
    <div className="rfx-legend-glow" />
  </>
);

const LegendaryFront: React.FC<{ density: EffectDensity; seed: number }> = ({ density, seed }) => {
  const embers = useMemo(() => {
    const rng = mulberry32(seed * 6151 + 3);
    const count = density === 'full' ? 36 : density === 'reduced' ? 18 : 9;
    return Array.from({ length: count }, (_, i) => {
      const zone = rng();
      // 65 % hug the left/right edges, 35 % rise across the card face
      const left =
        zone < 0.325 ? range(rng, -7, 12) : zone < 0.65 ? range(rng, 88, 107) : range(rng, 14, 86);
      const isStreak = rng() < 0.28;
      const overFace = zone >= 0.65;
      return {
        left,
        streak: isStreak,
        size: isStreak ? range(rng, 10, 20) : overFace ? range(rng, 2, 3.5) : range(rng, 3, 6.5),
        from: range(rng, 0, 38),
        to: range(rng, 82, 98),
        dur: isStreak ? range(rng, 1.6, 2.6) : range(rng, 2.6, 4.8),
        delay: -range(rng, 0, 5) - i * 0.05,
        sway: range(rng, 3, 9),
        swayDur: range(rng, 1.2, 2.4),
        faint: overFace,
      };
    });
  }, [density, seed]);

  return (
    <>
      {embers.map((e, i) => (
        <span key={i} className="rfx-ember-track" style={{ left: `${e.left}%` }}>
          <span
            className="rfx-ember-rise"
            style={
              {
                '--from': e.from,
                '--to': e.to,
                animationDuration: `${e.dur}s`,
                animationDelay: `${e.delay}s`,
              } as React.CSSProperties
            }
          >
            <span
              className="rfx-ember-sway"
              style={{ '--sway': e.sway, animationDuration: `${e.swayDur}s` } as React.CSSProperties}
            >
              <span
                className={`rfx-ember ${e.streak ? 'rfx-ember--streak' : ''} ${e.faint ? 'rfx-ember--faint' : ''}`}
                style={{ '--size': `${e.size}px` } as React.CSSProperties}
              />
            </span>
          </span>
        </span>
      ))}
    </>
  );
};

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------
export const RarityEffects: React.FC<RarityEffectsProps> = ({ rarity, layer, density, seed }) => {
  if (layer === 'back') {
    return (
      <div className="rfx-root rfx-root--back" aria-hidden>
        {rarity === 'rare' && <div className="rfx-rare-field" />}
        {rarity === 'epic' && density !== 'none' && <EpicBack density={density} seed={seed} />}
        {rarity === 'epic' && density === 'none' && <div className="rfx-epic-glow" />}
        {rarity === 'legendary' && density !== 'none' && <LegendaryBack density={density} />}
        {rarity === 'legendary' && density === 'none' && <div className="rfx-legend-glow" />}
      </div>
    );
  }

  return (
    <div className="rfx-root rfx-root--front" aria-hidden>
      {/* One-shot flash whenever the tier changes (parent keys this layer by rarity) */}
      <span className={`rfx-enter rfx-enter--${rarity}`} />
      {density !== 'none' && rarity === 'rare' && <RareFront density={density} seed={seed} />}
      {density !== 'none' && rarity === 'epic' && <EpicFront density={density} />}
      {density !== 'none' && rarity === 'legendary' && <LegendaryFront density={density} seed={seed} />}
    </div>
  );
};
