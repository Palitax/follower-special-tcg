'use client';

/**
 * RarityRing – animated outline AROUND a card (nothing is drawn on the card itself).
 *
 *  RARE       → Flowing water: cool blue / lilac / white currents gliding around the frame,
 *               with soft counter-flowing light reflections.
 *  EPIC       → Magenta flame: hot pink → orange → yellow fire racing around the frame,
 *               flickering heat glow.
 *  LEGENDARY  → Golden silk: thick polished gold frame with two bright comets sweeping
 *               around it, plus a second fine gold line – clearly the final tier.
 *
 * Motion is pure `transform: rotate()` on a conic gradient inside a masked ring
 * → compositor-only, perfectly fluid. The ring + glow fit inside `bleed` (the
 * reserved padding around each card), so neighbouring cards never overlap.
 */

import React from 'react';
import { CardRarity } from '../types/card';

interface RarityRingProps {
  rarity: CardRarity;
  /** Reserved space around the card in px */
  bleed: number;
  /** Moving blurred glow (disable for very dense grids) */
  glow: boolean;
}

const THICKNESS: Record<CardRarity, number> = { rare: 0.22, epic: 0.26, legendary: 0.3 };

export const RarityRing: React.FC<RarityRingProps> = ({ rarity, bleed, glow }) => {
  const ringW = Math.max(2, Math.round(bleed * THICKNESS[rarity]));
  const gap = bleed >= 12 ? 2 : 1;
  const free = Math.max(1, bleed - ringW - gap);
  const style = {
    '--ring-w': `${ringW}px`,
    '--ring-gap': `${gap}px`,
    '--glow-blur': `${Math.max(1.5, free * 0.38).toFixed(1)}px`,
    '--glow-spread': `${Math.max(0, free * 0.22).toFixed(1)}px`,
    '--shadow-blur': `${Math.max(2, free * 0.8).toFixed(1)}px`,
  } as React.CSSProperties;

  return (
    <div className={`rr rr--${rarity}`} style={style} aria-hidden>
      {glow && <span className="rr-glow" />}
      <span className="rr-ring" />
      <span className="rr-ring rr-ring--shine" />
      {rarity === 'legendary' && free >= 8 && <span className="rr-ring rr-ring--outer" />}
    </div>
  );
};
