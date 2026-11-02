export type CardRarity = 'rare' | 'epic' | 'legendary';

export type PlaymatTheme = 'dark-carbon';

export type OverlayAnchorPosition =
  | 'compact'
  | 'top-right'
  | 'top-left'
  | 'bottom-right'
  | 'bottom-left';

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
  /** Whether the giveaway card is currently shown in OBS (false = transparent / hidden) */
  visible: boolean;
  /** Header badge text above the card, e.g. 'NÄCHSTES GIVEAWAY' or 'AKTUELLES GIVEAWAY' */
  badgeLabel: string;
  /** Show rarity tier pill (RARE / EPIC / LEGENDARY) inside the header badge */
  showTierBadge: boolean;
  /** Optional: show #1, #2... inside the header badge */
  showSlotNumber: boolean;
  /** Card width in px inside the OBS Browser Source */
  cardWidthPx: number;
  /** 'compact' centers cleanly for free OBS positioning; corner anchors place it in a full-canvas OBS source */
  anchor: OverlayAnchorPosition;
}
