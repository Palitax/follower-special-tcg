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

export interface OverlayDisplaySettings {
  /** Whether the giveaway is currently shown in OBS (false = 100% transparent / empty) */
  visible: boolean;
  /** 'glow-ring' = animated Rare/Epic/Legendary border; 'cutout' = pure floating booster/image with zero frame */
  frameStyle: OverlayFrameStyle;
  /** Keep interior behind contained images/boosters 100% transparent (no dark box behind transparent PNGs) */
  transparentCardFill: boolean;
  /** Show top header pill ('NÄCHSTES GIVEAWAY') above the booster/card */
  showHeaderBadge: boolean;
  /** Header badge text above the card, e.g. 'NÄCHSTES GIVEAWAY' or 'AKTUELLES GIVEAWAY' */
  badgeLabel: string;
  /** Show rarity tier pill (RARE / EPIC / LEGENDARY) inside the header badge */
  showTierBadge: boolean;
  /** Optional: show #1, #2... inside the header badge */
  showSlotNumber: boolean;
  /** Booster / card width in px inside the OBS Browser Source */
  cardWidthPx: number;
  /** 'compact' centers cleanly for free OBS positioning; corner anchors place it in a full-canvas OBS source */
  anchor: OverlayAnchorPosition;
}

export const DEFAULT_OVERLAY_DISPLAY_SETTINGS: OverlayDisplaySettings = {
  visible: true,
  frameStyle: 'glow-ring',
  transparentCardFill: true,
  showHeaderBadge: true,
  badgeLabel: 'NÄCHSTES GIVEAWAY',
  showTierBadge: true,
  showSlotNumber: false,
  cardWidthPx: 300,
  anchor: 'compact',
};
