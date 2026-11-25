export type SocialPlatform =
  | 'instagram'
  | 'tiktok'
  | 'whatnot'
  | 'buyback'
  | 'whatsapp'
  | 'discord'
  | 'custom';

export type RotatorAnimationPreset = 'unfold' | 'wipe' | 'mana-surge';

export type VeinColorMode = 'mana-blue' | 'platform';

export type BarEdgeStyle = 'sharp' | 'angled';

export type TickerSpeed = 'slow' | 'normal' | 'fast';

export interface RotatorSlide {
  id: string;
  platform: SocialPlatform;
  eyebrow: string;
  headline: string;
  subline: string;
  badgeText: string;
  enabled: boolean;
}

export interface RotatorBarSettings {
  visible: boolean;
  /** Seconds each slide stays visible before switching */
  intervalSec: number;
  /** Pauses automatic cycling on stream (useful while holding on a slide) */
  paused: boolean;
  /** Optional slide ID pinned immediately on stream (overrides cycle until unpinned) */
  pinnedSlideId: string | null;
  animationPreset: RotatorAnimationPreset;
  veinColorMode: VeinColorMode;
  edgeStyle: BarEdgeStyle;
  /** Target width in px inside the OBS Browser Source (portrait-ready) */
  widthPx: number;
  showProgressBar: boolean;
  showWoodVeins: boolean;
}

export interface TickerItem {
  id: string;
  platform: SocialPlatform;
  label: string;
  highlight: string;
  enabled: boolean;
}

export interface TickerBarSettings {
  visible: boolean;
  paused: boolean;
  speed: TickerSpeed;
  veinColorMode: VeinColorMode;
  edgeStyle: BarEdgeStyle;
  showBrandAnchor: boolean;
  brandAnchorText: string;
  showWoodVeins: boolean;
  heightPx: number;
}

export interface BroadcastBarsSnapshot {
  updatedAt: number;
  senderId: string;
  rotator: RotatorBarSettings;
  slides: RotatorSlide[];
  ticker: TickerBarSettings;
  tickerItems: TickerItem[];
}

export const DEFAULT_ROTATOR_SETTINGS: RotatorBarSettings = {
  visible: true,
  intervalSec: 7,
  paused: false,
  pinnedSlideId: null,
  animationPreset: 'unfold',
  veinColorMode: 'mana-blue',
  edgeStyle: 'angled',
  widthPx: 680,
  showProgressBar: true,
  showWoodVeins: true,
};

export const DEFAULT_TICKER_SETTINGS: TickerBarSettings = {
  visible: true,
  paused: false,
  speed: 'normal',
  veinColorMode: 'mana-blue',
  edgeStyle: 'angled',
  showBrandAnchor: true,
  brandAnchorText: 'MANACARDS',
  showWoodVeins: true,
  heightPx: 48,
};

export const DEFAULT_ROTATOR_SLIDES: RotatorSlide[] = [
  {
    id: 'slide_instagram',
    platform: 'instagram',
    eyebrow: 'FOLGT UNS AUF INSTAGRAM',
    headline: '@manacards_de_',
    subline: 'Drops, Hits & Behind the Scenes',
    badgeText: 'FOLLOW',
    enabled: true,
  },
  {
    id: 'slide_tiktok',
    platform: 'tiktok',
    eyebrow: 'FOLGT UNS AUF TIKTOK',
    headline: '@manacards_de',
    subline: 'Tägliche Pulls & Stream-Clips',
    badgeText: 'TIKTOK',
    enabled: true,
  },
  {
    id: 'slide_whatnot',
    platform: 'whatnot',
    eyebrow: 'ACCOUNT ADDEN · WHATNOT',
    headline: 'manacards_de',
    subline: 'Bookmark & kein Live-Break verpassen',
    badgeText: 'ADD ACCOUNT',
    enabled: true,
  },
  {
    id: 'slide_buyback',
    platform: 'buyback',
    eyebrow: 'WIR KAUFEN EURE KARTEN AN',
    headline: 'manacards.de',
    subline: 'Einzelkarten & Sammlungen · Schnell übers Formular',
    badgeText: 'ANKAUF',
    enabled: true,
  },
  {
    id: 'slide_whatsapp',
    platform: 'whatsapp',
    eyebrow: 'WHATSAPP COMMUNITY',
    headline: 'ManaCards Community',
    subline: 'Stream-Alerts, Restocks & exklusive Infos',
    badgeText: 'JOIN',
    enabled: true,
  },
  {
    id: 'slide_discord',
    platform: 'discord',
    eyebrow: 'DISCORD SERVER',
    headline: 'ManaCards Discord',
    subline: 'Tauschen, Pulls teilen & Community-Talk',
    badgeText: 'JOIN',
    enabled: true,
  },
];

export const DEFAULT_TICKER_ITEMS: TickerItem[] = [
  {
    id: 'tick_buyback',
    platform: 'buyback',
    label: 'KARTENANKAUF',
    highlight: 'Wir kaufen eure Karten & Sammlungen · Formular auf manacards.de',
    enabled: true,
  },
  {
    id: 'tick_instagram',
    platform: 'instagram',
    label: 'INSTAGRAM',
    highlight: 'Folgt uns: @manacards_de_',
    enabled: true,
  },
  {
    id: 'tick_tiktok',
    platform: 'tiktok',
    label: 'TIKTOK',
    highlight: 'Clips & Pulls: @manacards_de',
    enabled: true,
  },
  {
    id: 'tick_whatnot',
    platform: 'whatnot',
    label: 'WHATNOT',
    highlight: 'Account adden: manacards_de',
    enabled: true,
  },
  {
    id: 'tick_whatsapp',
    platform: 'whatsapp',
    label: 'WHATSAPP',
    highlight: 'Join unsere WhatsApp Community',
    enabled: true,
  },
  {
    id: 'tick_discord',
    platform: 'discord',
    label: 'DISCORD',
    highlight: 'Join unseren Discord Server · Link in Bio',
    enabled: true,
  },
];

export function createDefaultBroadcastBarsSnapshot(senderId = 'init'): BroadcastBarsSnapshot {
  return {
    updatedAt: 0,
    senderId,
    rotator: { ...DEFAULT_ROTATOR_SETTINGS },
    slides: DEFAULT_ROTATOR_SLIDES.map((s) => ({ ...s })),
    ticker: { ...DEFAULT_TICKER_SETTINGS },
    tickerItems: DEFAULT_TICKER_ITEMS.map((t) => ({ ...t })),
  };
}

export function normalizeBroadcastBarsSnapshot(
  raw: Partial<BroadcastBarsSnapshot> | null | undefined,
  fallbackSenderId = 'local'
): BroadcastBarsSnapshot {
  const base = createDefaultBroadcastBarsSnapshot(fallbackSenderId);
  if (!raw || typeof raw !== 'object') return base;

  const validPlatforms: SocialPlatform[] = [
    'instagram',
    'tiktok',
    'whatnot',
    'buyback',
    'whatsapp',
    'discord',
    'custom',
  ];
  const normPlatform = (val: unknown): SocialPlatform =>
    typeof val === 'string' && validPlatforms.includes(val as SocialPlatform)
      ? (val as SocialPlatform)
      : 'custom';

  const slides: RotatorSlide[] = Array.isArray(raw.slides)
    ? raw.slides
        .filter((s) => s && typeof s === 'object')
        .map((s, idx) => ({
          id: typeof s.id === 'string' && s.id.trim() ? s.id : `slide_${idx + 1}`,
          platform: normPlatform(s.platform),
          eyebrow: typeof s.eyebrow === 'string' ? s.eyebrow : '',
          headline: typeof s.headline === 'string' ? s.headline : '',
          subline: typeof s.subline === 'string' ? s.subline : '',
          badgeText: typeof s.badgeText === 'string' ? s.badgeText : '',
          enabled: s.enabled !== false,
        }))
    : base.slides;

  const tickerItems: TickerItem[] = Array.isArray(raw.tickerItems)
    ? raw.tickerItems
        .filter((t) => t && typeof t === 'object')
        .map((t, idx) => ({
          id: typeof t.id === 'string' && t.id.trim() ? t.id : `tick_${idx + 1}`,
          platform: normPlatform(t.platform),
          label: typeof t.label === 'string' ? t.label : '',
          highlight: typeof t.highlight === 'string' ? t.highlight : '',
          enabled: t.enabled !== false,
        }))
    : base.tickerItems;

  return {
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : 0,
    senderId: typeof raw.senderId === 'string' ? raw.senderId : fallbackSenderId,
    rotator: {
      ...DEFAULT_ROTATOR_SETTINGS,
      ...(raw.rotator && typeof raw.rotator === 'object' ? raw.rotator : {}),
      intervalSec: Math.max(
        3,
        Math.min(30, Number(raw.rotator?.intervalSec ?? DEFAULT_ROTATOR_SETTINGS.intervalSec) || 7)
      ),
      widthPx: Math.max(
        380,
        Math.min(1040, Number(raw.rotator?.widthPx ?? DEFAULT_ROTATOR_SETTINGS.widthPx) || 680)
      ),
    },
    slides,
    ticker: {
      ...DEFAULT_TICKER_SETTINGS,
      ...(raw.ticker && typeof raw.ticker === 'object' ? raw.ticker : {}),
      heightPx: Math.max(
        38,
        Math.min(72, Number(raw.ticker?.heightPx ?? DEFAULT_TICKER_SETTINGS.heightPx) || 48)
      ),
    },
    tickerItems,
  };
}
