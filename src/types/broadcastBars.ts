export type SocialPlatform =
  | 'instagram'
  | 'tiktok'
  | 'whatnot'
  | 'buyback'
  | 'whatsapp'
  | 'discord'
  | 'custom';

/** Visual design language shared by rotator + ticker */
export type BroadcastDesign = 'whatnot' | 'mana-wood';

export type RotatorAnimationPreset = 'unfold' | 'wipe' | 'mana-surge';

export type VeinColorMode = 'mana-blue' | 'platform';

export type BarEdgeStyle = 'sharp' | 'angled';

export type TickerSpeed = 'slow' | 'normal' | 'fast';

/** 'together' scales text + icon along with height; 'background-only' resizes only the container */
export type OverlayResizeMode = 'together' | 'background-only';

/** 'fixed' uses widthPx directly for the card background; 'auto' shrinks card to fit each slide's text */
export type RotatorWidthMode = 'fixed' | 'auto';

/** Native HiDPI pixel multiplier so OBS Browser Sources never upscale blurry textures */
export type OverlayQualityScale = 1 | 1.5 | 2;

export interface RotatorSlide {
  id: string;
  platform: SocialPlatform;
  eyebrow: string;
  headline: string;
  subline: string;
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
  /** Independent background / container width in logical px */
  widthPx: number;
  /** Independent background / container height in logical px */
  heightPx: number;
  /** Whether widthPx sets exact card width ('fixed') or acts as max-width ('auto') */
  widthMode: RotatorWidthMode;
  /** Whether resizing scales text+icon together or only changes the background box */
  resizeMode: OverlayResizeMode;
  /** Text & icon scale in percent (60–200), independent in 'background-only' mode */
  contentScale: number;
  /** HiDPI native render multiplier (1x, 1.5x, 2x) for razor-sharp OBS output */
  qualityScale: OverlayQualityScale;
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
  /** Independent width in logical px (used when fullWidth is false) */
  widthPx: number;
  /** Fill 100% of OBS Browser Source width */
  fullWidth: boolean;
  /** Independent background height in logical px */
  heightPx: number;
  /** Whether heightPx scales text+icons together or only changes the background bar */
  resizeMode: OverlayResizeMode;
  /** Text & icon scale in percent (60–200) */
  contentScale: number;
  /** HiDPI native render multiplier (1x, 1.5x, 2x) for razor-sharp OBS output */
  qualityScale: OverlayQualityScale;
}

export interface BroadcastBarsSnapshot {
  updatedAt: number;
  senderId: string;
  design: BroadcastDesign;
  rotator: RotatorBarSettings;
  slides: RotatorSlide[];
  ticker: TickerBarSettings;
  tickerItems: TickerItem[];
}

export const DEFAULT_BROADCAST_DESIGN: BroadcastDesign = 'whatnot';

export const DEFAULT_ROTATOR_SETTINGS: RotatorBarSettings = {
  visible: true,
  intervalSec: 7,
  paused: false,
  pinnedSlideId: null,
  animationPreset: 'unfold',
  veinColorMode: 'mana-blue',
  edgeStyle: 'angled',
  widthPx: 540,
  heightPx: 92,
  widthMode: 'fixed',
  resizeMode: 'together',
  contentScale: 105,
  qualityScale: 2,
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
  widthPx: 960,
  fullWidth: true,
  heightPx: 54,
  resizeMode: 'together',
  contentScale: 105,
  qualityScale: 2,
};

export const DEFAULT_ROTATOR_SLIDES: RotatorSlide[] = [
  {
    id: 'slide_instagram',
    platform: 'instagram',
    eyebrow: 'Folgt uns auf Instagram',
    headline: '@manacards_de_',
    subline: 'Drops, Hits & Behind the Scenes',
    enabled: true,
  },
  {
    id: 'slide_tiktok',
    platform: 'tiktok',
    eyebrow: 'Folgt uns auf TikTok',
    headline: '@manacards_de',
    subline: 'Tägliche Pulls & Stream-Clips',
    enabled: true,
  },
  {
    id: 'slide_whatnot',
    platform: 'whatnot',
    eyebrow: 'Account adden · Whatnot',
    headline: 'manacards_de',
    subline: 'Bookmark & kein Live-Break verpassen',
    enabled: true,
  },
  {
    id: 'slide_buyback',
    platform: 'buyback',
    eyebrow: 'Wir kaufen eure Karten an',
    headline: 'manacards.de/ankauf',
    subline: 'Einzelkarten & Sammlungen · Schnell übers Formular',
    enabled: true,
  },
  {
    id: 'slide_whatsapp',
    platform: 'whatsapp',
    eyebrow: 'WhatsApp Community',
    headline: 'ManaCards Community',
    subline: 'Stream-Alerts, Restocks & exklusive Infos',
    enabled: true,
  },
  {
    id: 'slide_discord',
    platform: 'discord',
    eyebrow: 'Discord Server',
    headline: 'ManaCards Discord',
    subline: 'Tauschen, Pulls teilen & Community-Talk',
    enabled: true,
  },
];

export const DEFAULT_TICKER_ITEMS: TickerItem[] = [
  {
    id: 'tick_buyback',
    platform: 'buyback',
    label: 'Kartenankauf',
    highlight: 'Wir kaufen eure Karten & Sammlungen · manacards.de/ankauf',
    enabled: true,
  },
  {
    id: 'tick_instagram',
    platform: 'instagram',
    label: 'Instagram',
    highlight: '@manacards_de_',
    enabled: true,
  },
  {
    id: 'tick_tiktok',
    platform: 'tiktok',
    label: 'TikTok',
    highlight: '@manacards_de',
    enabled: true,
  },
  {
    id: 'tick_whatnot',
    platform: 'whatnot',
    label: 'Whatnot',
    highlight: 'Account adden: manacards_de',
    enabled: true,
  },
  {
    id: 'tick_whatsapp',
    platform: 'whatsapp',
    label: 'WhatsApp',
    highlight: 'Join unsere WhatsApp Community',
    enabled: true,
  },
  {
    id: 'tick_discord',
    platform: 'discord',
    label: 'Discord',
    highlight: 'Join unseren Discord Server · Link in Bio',
    enabled: true,
  },
];

export function createDefaultBroadcastBarsSnapshot(senderId = 'init'): BroadcastBarsSnapshot {
  return {
    updatedAt: 0,
    senderId,
    design: DEFAULT_BROADCAST_DESIGN,
    rotator: { ...DEFAULT_ROTATOR_SETTINGS },
    slides: DEFAULT_ROTATOR_SLIDES.map((s) => ({ ...s })),
    ticker: { ...DEFAULT_TICKER_SETTINGS },
    tickerItems: DEFAULT_TICKER_ITEMS.map((t) => ({ ...t })),
  };
}

function normQualityScale(val: unknown, fallback: OverlayQualityScale): OverlayQualityScale {
  if (val === 1 || val === 1.5 || val === 2) return val;
  return fallback;
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

  const rawRot = raw.rotator && typeof raw.rotator === 'object' ? raw.rotator : undefined;
  const rawTick = raw.ticker && typeof raw.ticker === 'object' ? raw.ticker : undefined;

  return {
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : 0,
    senderId: typeof raw.senderId === 'string' ? raw.senderId : fallbackSenderId,
    design: raw.design === 'mana-wood' ? 'mana-wood' : DEFAULT_BROADCAST_DESIGN,
    rotator: {
      ...DEFAULT_ROTATOR_SETTINGS,
      ...rawRot,
      intervalSec: Math.max(
        3,
        Math.min(30, Number(rawRot?.intervalSec ?? DEFAULT_ROTATOR_SETTINGS.intervalSec) || 7)
      ),
      widthPx: Math.max(
        300,
        Math.min(1200, Number(rawRot?.widthPx ?? DEFAULT_ROTATOR_SETTINGS.widthPx) || 540)
      ),
      heightPx: Math.max(
        60,
        Math.min(260, Number(rawRot?.heightPx ?? DEFAULT_ROTATOR_SETTINGS.heightPx) || 92)
      ),
      widthMode: rawRot?.widthMode === 'auto' ? 'auto' : 'fixed',
      resizeMode: rawRot?.resizeMode === 'background-only' ? 'background-only' : 'together',
      contentScale: Math.max(
        60,
        Math.min(220, Number(rawRot?.contentScale ?? DEFAULT_ROTATOR_SETTINGS.contentScale) || 105)
      ),
      qualityScale: normQualityScale(rawRot?.qualityScale, DEFAULT_ROTATOR_SETTINGS.qualityScale),
    },
    slides,
    ticker: {
      ...DEFAULT_TICKER_SETTINGS,
      ...rawTick,
      widthPx: Math.max(
        360,
        Math.min(1400, Number(rawTick?.widthPx ?? DEFAULT_TICKER_SETTINGS.widthPx) || 960)
      ),
      fullWidth: rawTick?.fullWidth !== false,
      heightPx: Math.max(
        38,
        Math.min(160, Number(rawTick?.heightPx ?? DEFAULT_TICKER_SETTINGS.heightPx) || 54)
      ),
      resizeMode: rawTick?.resizeMode === 'background-only' ? 'background-only' : 'together',
      contentScale: Math.max(
        60,
        Math.min(220, Number(rawTick?.contentScale ?? DEFAULT_TICKER_SETTINGS.contentScale) || 105)
      ),
      qualityScale: normQualityScale(rawTick?.qualityScale, DEFAULT_TICKER_SETTINGS.qualityScale),
    },
    tickerItems,
  };
}
