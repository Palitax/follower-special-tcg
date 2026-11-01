'use client';

/**
 * RarityEffects – tier-specific animated frame art rendered INSIDE a card face.
 *
 *  RARE       → Floating water: iridescent glass-like water ribbons gliding around the frame,
 *               swirling vortex arcs in the corners and drifting bubbles.
 *  EPIC       → Magenta flame: fluid pink/orange flame tendrils licking up the sides and
 *               flickering flame tongues rising from the bottom edge.
 *  LEGENDARY  → Golden silk: sweeping bundles of golden silk strands, soft light pillars,
 *               fluttering golden leaves and glittering dust – clearly the final tier.
 *
 * Technique: a dark tier-coloured vignette darkens the card edges; the luminous layer is
 * blended with `mix-blend-mode: screen`, so effects glow inside the dark frame band and
 * naturally vanish towards the bright card centre (number stays perfectly readable).
 * Everything is clipped to the card → no overlap with neighbouring cards (9:16 mode!).
 */

import React, { useId, useMemo } from 'react';
import { CardRarity } from '../types/card';

export type EffectDensity = 'full' | 'reduced' | 'minimal' | 'none';

interface RarityEffectsProps {
  rarity: CardRarity;
  density: EffectDensity;
  seed: number;
  /** Show a one-shot flash (used right after a tier change) */
  flash?: boolean;
}

// Deterministic PRNG → stable, per-card unique particle layout
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

/** Random point inside the frame band (percent coordinates) */
function bandPoint(rng: Rng, zones: Array<'left' | 'right' | 'bottom' | 'top'>) {
  const zone = zones[Math.floor(rng() * zones.length)];
  switch (zone) {
    case 'left':
      return { zone, left: range(rng, 2, 13), top: range(rng, 20, 98) };
    case 'right':
      return { zone, left: range(rng, 87, 98), top: range(rng, 20, 98) };
    case 'top':
      return { zone, left: range(rng, 10, 90), top: range(rng, 3, 12) };
    default:
      return { zone, left: range(rng, 6, 94), top: range(rng, 90, 100) };
  }
}

const count = (density: EffectDensity, full: number, reduced: number, minimal: number) =>
  density === 'full' ? full : density === 'reduced' ? reduced : density === 'minimal' ? minimal : 0;

type CSSVars = React.CSSProperties & Record<`--${string}`, string | number>;

// SVG coordinate system matching the 63:88 card (≈ 100 × 140)
const VW = 100;
const VH = 140;

/** Closed loop following the card's rounded rect, undulating along its normal (integer `waves` → seamless) */
function wavyLoop(inset: number, r: number, amp: number, waves: number, phase: number, steps = 260) {
  const x0 = inset, y0 = inset, x1 = VW - inset, y1 = VH - inset;
  const w = x1 - x0 - 2 * r;
  const h = y1 - y0 - 2 * r;
  const arc = (Math.PI * r) / 2;
  const L = 2 * w + 2 * h + 4 * arc;
  const at = (s: number): [number, number, number, number] => {
    // returns x, y, nx, ny (outward normal)
    if (s < w) return [x0 + r + s, y0, 0, -1];
    s -= w;
    if (s < arc) { const a = -Math.PI / 2 + s / r; return [x1 - r + r * Math.cos(a), y0 + r + r * Math.sin(a), Math.cos(a), Math.sin(a)]; }
    s -= arc;
    if (s < h) return [x1, y0 + r + s, 1, 0];
    s -= h;
    if (s < arc) { const a = s / r; return [x1 - r + r * Math.cos(a), y1 - r + r * Math.sin(a), Math.cos(a), Math.sin(a)]; }
    s -= arc;
    if (s < w) return [x1 - r - s, y1, 0, 1];
    s -= w;
    if (s < arc) { const a = Math.PI / 2 + s / r; return [x0 + r + r * Math.cos(a), y1 - r + r * Math.sin(a), Math.cos(a), Math.sin(a)]; }
    s -= arc;
    if (s < h) return [x0, y1 - r - s, -1, 0];
    s -= h;
    const a = Math.PI + s / r;
    return [x0 + r + r * Math.cos(a), y0 + r + r * Math.sin(a), Math.cos(a), Math.sin(a)];
  };
  const pts: string[] = [];
  for (let i = 0; i < steps; i++) {
    const [x, y, nx, ny] = at((i / steps) * L);
    const off = amp * Math.sin((2 * Math.PI * waves * i) / steps + phase);
    pts.push(`${(x + nx * off).toFixed(2)} ${(y + ny * off).toFixed(2)}`);
  }
  return `M ${pts.join(' L ')} Z`;
}

// ===========================================================================
// RARE · FLOATING WATER
// ===========================================================================
const RareWater: React.FC<{ density: EffectDensity; seed: number }> = ({ density, seed }) => {
  const uid = useId().replace(/:/g, '');
  const liquid = density === 'full';

  const bubbles = useMemo(() => {
    const rng = mulberry32(seed * 7919 + 17);
    return Array.from({ length: count(density, 10, 6, 3) }, () => {
      const p = bandPoint(rng, ['left', 'right', 'left', 'right', 'bottom']);
      return {
        left: p.left,
        top: p.top,
        size: range(rng, 2, 4.6),
        sway: range(rng, -3, 3),
        dur: range(rng, 5.5, 9.5),
        delay: -range(rng, 0, 9),
      };
    });
  }, [density, seed]);

  // Each ribbon = bundle of intertwined undulating strands → twisting, liquid look
  const ribbons = useMemo(
    () => ({
      a1: wavyLoop(5, 7, 2.3, 9, 0),
      a2: wavyLoop(5, 7, 1.7, 9, 1.1),
      a3: wavyLoop(5, 7, 2.6, 9, 2.2),
      b1: wavyLoop(11, 5, 1.6, 7, 0.6),
      b2: wavyLoop(11, 5, 1.2, 7, 2.1),
    }),
    []
  );

  const arcs = (cx: number, cy: number, sx: number, sy: number) =>
    [13, 19, 26].map((r) => `M ${cx} ${cy + sy * r} A ${r} ${r} 0 0 ${sx * sy > 0 ? 0 : 1} ${cx + sx * r} ${cy}`);

  return (
    <>
      <svg className="rfx-svg" viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="none" aria-hidden>
        <defs>
          <linearGradient id={`${uid}-g`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={VW} y2={VH}>
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.22" stopColor="#bae6fd" />
            <stop offset="0.45" stopColor="#a5b4fc" />
            <stop offset="0.62" stopColor="#7dd3fc" />
            <stop offset="0.82" stopColor="#e9d5ff" />
            <stop offset="1" stopColor="#e0f2fe" />
            <animateTransform attributeName="gradientTransform" type="rotate" from={`0 ${VW / 2} ${VH / 2}`} to={`360 ${VW / 2} ${VH / 2}`} dur="14s" repeatCount="indefinite" />
          </linearGradient>
          {liquid && (
            <filter id={`${uid}-f`} x="-10%" y="-10%" width="120%" height="120%">
              <feTurbulence type="fractalNoise" baseFrequency="0.028 0.02" numOctaves="1" seed={seed % 97} result="noise" />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="3.2" xChannelSelector="R" yChannelSelector="G" />
            </filter>
          )}
        </defs>

        <g filter={liquid ? `url(#${uid}-f)` : undefined} stroke={`url(#${uid}-g)`}>
          {/* Outer twisting water ribbon */}
          <path d={ribbons.a1} pathLength={100} className="rfx-water rfx-water--a rfx-water--soft" strokeWidth={9} />
          <path d={ribbons.a1} pathLength={100} className="rfx-water rfx-water--a" strokeWidth={3.6} />
          <path d={ribbons.a2} pathLength={100} className="rfx-water rfx-water--a" strokeWidth={1.8} />
          <path d={ribbons.a3} pathLength={100} className="rfx-water rfx-water--a-hl" stroke="#ffffff" strokeWidth={0.9} />
          <path d={ribbons.a1} pathLength={100} className="rfx-water rfx-water--a-hl" stroke="#ffffff" strokeWidth={0.6} />
          {/* Inner counter-flowing ribbon */}
          <path d={ribbons.b1} pathLength={100} className="rfx-water rfx-water--b" strokeWidth={2.6} />
          <path d={ribbons.b2} pathLength={100} className="rfx-water rfx-water--b-hl" stroke="#ffffff" strokeWidth={0.7} />

          {/* Vortex swirls in two opposite corners */}
          <g className="rfx-swirl rfx-swirl--bl">
            {arcs(0, VH, 1, -1).map((d, i) => (
              <path key={i} d={d} className={`rfx-swirl-arc rfx-swirl-arc--${i}`} strokeWidth={[3.4, 2.2, 1.3][i]} pathLength={100} />
            ))}
          </g>
          <g className="rfx-swirl rfx-swirl--tr">
            {arcs(VW, 0, -1, 1).map((d, i) => (
              <path key={i} d={d} className={`rfx-swirl-arc rfx-swirl-arc--${i}`} strokeWidth={[3.4, 2.2, 1.3][i]} pathLength={100} />
            ))}
          </g>
        </g>
      </svg>

      {bubbles.map((b, i) => (
        <span
          key={i}
          className="rfx-bubble"
          style={{
            left: `${b.left}%`,
            top: `${b.top}%`,
            '--s': `${b.size}cqw`,
            '--sway': `${b.sway}cqw`,
            animationDuration: `${b.dur}s`,
            animationDelay: `${b.delay}s`,
          } as CSSVars}
        />
      ))}
    </>
  );
};

// ===========================================================================
// EPIC · MAGENTA FLAME
// ===========================================================================
const TENDRILS = [
  { d: 'M 5 146 C -2 118, 13 98, 6 74 S 0 34, 11 2', dur: 2.6, delay: 0 },
  { d: 'M 95 146 C 102 118, 87 98, 94 74 S 100 34, 89 2', dur: 2.9, delay: -1.2 },
  { d: 'M 11 146 C 19 126, 2 106, 12 86 S 6 60, 3 48', dur: 2.2, delay: -0.6 },
  { d: 'M 89 146 C 81 126, 98 106, 88 86 S 94 60, 97 48', dur: 2.4, delay: -1.8 },
  { d: 'M 24 147 C 15 133, 4 131, 2 112', dur: 1.9, delay: -0.3 },
  { d: 'M 76 147 C 85 133, 96 131, 98 112', dur: 2.1, delay: -1.4 },
];

const EpicFlame: React.FC<{ density: EffectDensity; seed: number }> = ({ density, seed }) => {
  const uid = useId().replace(/:/g, '');
  const wispy = density === 'full';
  const tendrils = density === 'minimal' ? TENDRILS.slice(0, 2) : density === 'reduced' ? TENDRILS.slice(0, 4) : TENDRILS;

  const { flames, motes } = useMemo(() => {
    const rng = mulberry32(seed * 3571 + 5);
    const flames = Array.from({ length: count(density, 26, 15, 8) }, (_, i) => {
      const p = bandPoint(rng, i % 2 === 0 ? ['bottom'] : ['left', 'right']);
      return {
        left: p.left,
        top: p.zone === 'bottom' ? range(rng, 96, 104) : range(rng, 32, 102),
        w: p.zone === 'bottom' ? range(rng, 11, 18) : range(rng, 7, 12),
        rot: range(rng, -14, 14),
        dur: range(rng, 1.1, 1.9),
        delay: -range(rng, 0, 2),
      };
    });
    const motes = Array.from({ length: count(density, 8, 4, 0) }, () => {
      const p = bandPoint(rng, ['left', 'right', 'bottom']);
      return {
        left: p.left,
        top: p.top,
        size: range(rng, 0.8, 1.6),
        dx: range(rng, -4, 4),
        dur: range(rng, 1.8, 3),
        delay: -range(rng, 0, 3),
      };
    });
    return { flames, motes };
  }, [density, seed]);

  return (
    <>
      <span className="rfx-fire-bed" />
      <span className="rfx-fire-side rfx-fire-side--l" />
      <span className="rfx-fire-side rfx-fire-side--r" />
      {flames.map((f, i) => (
        <span
          key={i}
          className="rfx-flame"
          style={{
            left: `${f.left}%`,
            top: `${f.top}%`,
            '--w': `${f.w}cqw`,
            '--rot': `${f.rot}deg`,
            animationDuration: `${f.dur}s`,
            animationDelay: `${f.delay}s`,
          } as CSSVars}
        />
      ))}

      <svg className="rfx-svg" viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="none" aria-hidden>
        <defs>
          <linearGradient id={`${uid}-g`} gradientUnits="userSpaceOnUse" x1="0" y1={VH} x2="0" y2="0">
            <stop offset="0" stopColor="#fde68a" />
            <stop offset="0.18" stopColor="#fb923c" />
            <stop offset="0.42" stopColor="#f472b6" />
            <stop offset="0.7" stopColor="#d946ef" />
            <stop offset="1" stopColor="#a21caf" />
          </linearGradient>
          {wispy && (
            <filter id={`${uid}-f`} x="-20%" y="-10%" width="140%" height="120%">
              <feTurbulence type="fractalNoise" baseFrequency="0.045 0.022" numOctaves="1" seed={seed % 89} result="noise" />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="5" xChannelSelector="R" yChannelSelector="G" />
            </filter>
          )}
        </defs>
        <g filter={wispy ? `url(#${uid}-f)` : undefined} stroke={`url(#${uid}-g)`}>
          {tendrils.map((t, i) => (
            <g key={i} className="rfx-tendril" style={{ animationDuration: `${t.dur}s`, animationDelay: `${t.delay}s` }}>
              <path d={t.d} pathLength={100} className="rfx-tendril-path rfx-tendril-path--glow" strokeWidth={10} style={{ animationDuration: `${t.dur}s`, animationDelay: `${t.delay}s` }} />
              <path d={t.d} pathLength={100} className="rfx-tendril-path" strokeWidth={3.6} style={{ animationDuration: `${t.dur}s`, animationDelay: `${t.delay}s` }} />
              <path d={t.d} pathLength={100} className="rfx-tendril-path rfx-tendril-path--core" stroke="#fff7ed" strokeWidth={1.1} style={{ animationDuration: `${t.dur}s`, animationDelay: `${t.delay}s` }} />
            </g>
          ))}
        </g>
      </svg>

      {motes.map((m, i) => (
        <span
          key={i}
          className="rfx-mote rfx-mote--pink"
          style={{
            left: `${m.left}%`,
            top: `${m.top}%`,
            '--s': `${m.size}cqw`,
            '--dx': `${m.dx}cqw`,
            animationDuration: `${m.dur}s`,
            animationDelay: `${m.delay}s`,
          } as CSSVars}
        />
      ))}
    </>
  );
};

// ===========================================================================
// LEGENDARY · GOLDEN SILK
// ===========================================================================
const SILK_BUNDLES = [
  { d: 'M -15 128 C 20 100, 55 150, 115 106', dur: 9, off: [0, 1.3] as const },
  { d: 'M -15 22 C 25 -2, 70 46, 115 12', dur: 11, off: [0, 1.3] as const },
  { d: 'M 4 156 C -8 105, 22 72, 3 30 S 10 -6, 18 -14', dur: 8, off: [1.2, 0] as const },
  { d: 'M 96 156 C 108 105, 78 72, 97 30 S 90 -6, 82 -14', dur: 10, off: [-1.2, 0] as const },
  { d: 'M -12 88 C 8 110, 16 132, 44 152', dur: 7, off: [1, 1] as const },
];
const STRANDS = [
  { w: 1.4, o: 0.95, shift: 0 },
  { w: 0.5, o: 0.75, shift: 0.8 },
  { w: 0.9, o: 0.85, shift: 1.6 },
  { w: 0.35, o: 0.65, shift: 2.4 },
  { w: 0.7, o: 0.8, shift: 3.2 },
  { w: 0.3, o: 0.55, shift: 4 },
];

const LegendarySilk: React.FC<{ density: EffectDensity; seed: number }> = ({ density, seed }) => {
  const uid = useId().replace(/:/g, '');
  const bundles = density === 'minimal' ? SILK_BUNDLES.slice(2, 4) : density === 'reduced' ? SILK_BUNDLES.slice(0, 4) : SILK_BUNDLES;
  const strands = density === 'full' ? STRANDS : density === 'reduced' ? STRANDS.slice(0, 4) : STRANDS.slice(0, 3);

  const { leaves, dust } = useMemo(() => {
    const rng = mulberry32(seed * 6151 + 3);
    const leaves = Array.from({ length: count(density, 16, 9, 4) }, () => {
      const p = bandPoint(rng, ['left', 'right', 'bottom', 'left', 'right']);
      return {
        left: p.left,
        top: p.top,
        w: range(rng, 5, 8),
        dx: (p.left < 50 ? 1 : -1) * range(rng, 2, 10),
        dy: -range(rng, 16, 34),
        spin: range(rng, 90, 260) * (rng() < 0.5 ? -1 : 1),
        dur: range(rng, 5, 9),
        flutter: range(rng, 1.4, 2.6),
        delay: -range(rng, 0, 9),
        ember: rng() < 0.22,
      };
    });
    const dust = Array.from({ length: count(density, 16, 9, 4) }, () => {
      const p = bandPoint(rng, ['left', 'right', 'bottom', 'top']);
      return {
        left: p.left,
        top: p.top,
        size: range(rng, 0.6, 1.4),
        dx: range(rng, -3, 3),
        dur: range(rng, 2.5, 4.5),
        delay: -range(rng, 0, 4.5),
      };
    });
    return { leaves, dust };
  }, [density, seed]);

  return (
    <>
      {density !== 'minimal' && (
        <>
          <span className="rfx-pillar" style={{ left: '6%', animationDelay: '0s' }} />
          <span className="rfx-pillar" style={{ left: '90%', animationDelay: '-2.6s' }} />
        </>
      )}

      <svg className="rfx-svg" viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="none" aria-hidden>
        <defs>
          <linearGradient id={`${uid}-g`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={VW} y2={VH}>
            <stop offset="0" stopColor="#fffbeb" />
            <stop offset="0.28" stopColor="#fde047" />
            <stop offset="0.52" stopColor="#f59e0b" />
            <stop offset="0.74" stopColor="#fef3c7" />
            <stop offset="1" stopColor="#fbbf24" />
            <animateTransform attributeName="gradientTransform" type="rotate" from={`0 ${VW / 2} ${VH / 2}`} to={`360 ${VW / 2} ${VH / 2}`} dur="18s" repeatCount="indefinite" />
          </linearGradient>
        </defs>
        <g stroke={`url(#${uid}-g)`}>
          {bundles.map((b, bi) => (
            <g key={bi}>
              <path d={b.d} className="rfx-silk rfx-silk--glow" strokeWidth={5} pathLength={100}
                style={{ animationDuration: `${b.dur}s` } as CSSVars} />
              {strands.map((s, si) => (
                <path
                  key={si}
                  d={b.d}
                  transform={`translate(${b.off[0] * s.shift} ${b.off[1] * s.shift})`}
                  className="rfx-silk"
                  strokeWidth={s.w}
                  opacity={s.o}
                  pathLength={100}
                  style={{ animationDuration: `${b.dur + si * 0.7}s`, '--o': -si * 6 } as CSSVars}
                />
              ))}
            </g>
          ))}
        </g>
      </svg>

      {leaves.map((l, i) => (
        <span
          key={i}
          className="rfx-leaf-path"
          style={{
            left: `${l.left}%`,
            top: `${l.top}%`,
            '--dx': `${l.dx}cqw`,
            '--dy': `${l.dy}cqh`,
            animationDuration: `${l.dur}s`,
            animationDelay: `${l.delay}s`,
          } as CSSVars}
        >
          <span
            className={`rfx-leaf ${l.ember ? 'rfx-leaf--ember' : ''}`}
            style={{ '--w': `${l.w}cqw`, '--spin': `${l.spin}deg`, animationDuration: `${l.flutter}s` } as CSSVars}
          />
        </span>
      ))}

      {dust.map((m, i) => (
        <span
          key={i}
          className="rfx-mote rfx-mote--gold"
          style={{
            left: `${m.left}%`,
            top: `${m.top}%`,
            '--s': `${m.size}cqw`,
            '--dx': `${m.dx}cqw`,
            animationDuration: `${m.dur}s`,
            animationDelay: `${m.delay}s`,
          } as CSSVars}
        />
      ))}
    </>
  );
};

// ===========================================================================
// Public component
// ===========================================================================
export const RarityEffects: React.FC<RarityEffectsProps> = ({ rarity, density, seed, flash = false }) => (
  <div className="rfx" aria-hidden>
    <div className={`rfx-vignette rfx-vignette--${rarity}`} />
    <div className="rfx-light">
      {density !== 'none' && rarity === 'rare' && <RareWater density={density} seed={seed} />}
      {density !== 'none' && rarity === 'epic' && <EpicFlame density={density} seed={seed} />}
      {density !== 'none' && rarity === 'legendary' && <LegendarySilk density={density} seed={seed} />}
      {flash && <span className={`rfx-enter rfx-enter--${rarity}`} />}
    </div>
  </div>
);
