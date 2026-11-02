export type CardRarity = 'rare' | 'epic' | 'legendary';

export type PlaymatTheme = 'dark-carbon';

export type OverlayAnchorPosition =
  | 'compact'
  | 'top-right'
  | 'top-left'
  | 'bottom-right'
  | 'bottom-left';

export type OverlayFrameStyle = 'glow-ring' | 'cutout';

export interface GiveawayItem {
  id: string;
  title: string;
  imageUrl: string;
  imageFit: 'contain' | 'cover';
  /** Streamer-only status marker in the Control Studio (never hides transparency on stream) */
  isCompleted: boolean;
}

export type GiveawayPools = Record<CardRarity, GiveawayItem[]>;

export interface ActiveGiveawaySelection {
  rarity: CardRarity;
  itemId: string;
}

export interface TierProgressStats {
  completed: number;
  total: number;
}

export interface LevelUpEvent {
  /** Monotonic timestamp id so each Level-Up plays once across all connected overlays */
  id: number;
  fromRarity: CardRarity;
  toRarity: CardRarity;
  /** Total giveaways in the newly unlocked tier (e.g. 15 Epic or 10 Legendary) */
  newTierTotal: number;
}

export interface OverlayDisplaySettings {
  /** Whether the giveaway is currently shown in OBS (false = 100% transparent / empty) */
  visible: boolean;
  /** 'glow-ring' = animated Rare/Epic/Legendary border; 'cutout' = pure floating booster/image with zero frame */
  frameStyle: OverlayFrameStyle;
  /** Keep interior behind contained images/boosters 100% transparent (no dark box behind transparent PNGs) */
  transparentCardFill: boolean;
  /** Show the segmented vertical liquid bar on the left of the giveaway */
  showLiquidBar: boolean;
  /** Custom number of points / segments in the liquid bar per tier (0 = auto / matches giveaway count) */
  tierBarPoints?: Record<CardRarity, number>;
  /** Booster / card width in px inside the OBS Browser Source */
  cardWidthPx: number;
  /** 'compact' centers cleanly for free OBS positioning; corner anchors place it in a full-canvas OBS source */
  anchor: OverlayAnchorPosition;
}

export const DEFAULT_OVERLAY_DISPLAY_SETTINGS: OverlayDisplaySettings = {
  visible: true,
  frameStyle: 'glow-ring',
  transparentCardFill: true,
  showLiquidBar: true,
  tierBarPoints: {
    rare: 0,
    epic: 0,
    legendary: 0,
  },
  cardWidthPx: 300,
  anchor: 'compact',
};
