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

export type ShowcaseLayout = 'auto' | 'hero' | 'fan' | 'row';

export type ShowcaseAnimation = 'pop' | 'float-in' | 'spotlight';

export type ShowcaseTitleBgStyle = 'card' | 'none';

export type ShowcaseTitleAnchor = 'top' | 'bottom' | 'overlay';

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
  /** Seconds the rotator hides completely after playing through all slides once (0 = always visible / continuous) */
  restDurationSec: number;
  /** Monotonic timestamp bumped to immediately wake the rotator and start a fresh cycle */
  triggerNonce: number;
  /** Pauses automatic cycling on stream (useful while holding on a slide) */
  paused: boolean;
  /** Optional slide ID pinned immediately on stream (overrides cycle & rest until unpinned) */
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

export interface ShowcaseImage {
  id: string;
  /** data:image/webp;base64,... in memory or idb:img_<hash> on wire */
  url: string;
  label?: string;
}

export interface ShowcasePreset {
  id: string;
  /** Yellow sticker tag above headline (e.g. "HEUTIGES KGA") */
  eyebrow: string;
  /** Main bold headline (e.g. "Einzelkarten Giveaways heute sind:") */
  headline: string;
  /** Optional subtitle line */
  subline: string;
  /** Layout mode: 'auto' chooses hero (1 img), fan (2-5 imgs), or row (6+) */
  layout: ShowcaseLayout;
  /** Dropped transparent PNGs / product photos (up to 10 per showcase) */
  images: ShowcaseImage[];
}

export interface ShowcaseSettings {
  activePresetId: string;
  /** Master visibility toggle in OBS */
  visible: boolean;
  /** Monotonic timestamp bumped whenever the streamer triggers "Einblenden" */
  showTriggerId: number;
  /** Seconds the showcase stays visible before smoothly hiding (0 = stay visible until manually hidden) */
  displayDurationSec: number;
  /** Optional cooldown in seconds before auto-showing again (0 = manual trigger only) */
  autoRepeatRestSec: number;
  animation: ShowcaseAnimation;
  /** Overall scale percentage (60–180) */
  scalePct: number;
  /** Independent text & header scaling (50–220%) */
  textScalePct: number;
  /** Independent product / card image scaling (50–200%) */
  imageScalePct: number;
  /** Where the title sits relative to the images */
  titleAnchor: ShowcaseTitleAnchor;
  /** Free vertical title offset in logical px (-260 to +260) */
  titleOffsetY: number;
  /** Free horizontal title offset in logical px (-220 to +220) */
  titleOffsetX: number;
  /** Free vertical image offset in logical px (-160 to +160) */
  imageOffsetY: number;
  /** 'card' = charcoal HUD plate behind text; 'none' = pure floating text with zero background */
  titleBgStyle: ShowcaseTitleBgStyle;
  /** Whether to show the yellow eyebrow sticker above the headline */
  showSticker: boolean;
  qualityScale: OverlayQualityScale;
  /** Soft ambient spotlight glow behind cutout TTB / card images */
  showGlow: boolean;
}

export interface BroadcastBarsSnapshot {
  updatedAt: number;
  senderId: string;
  design: BroadcastDesign;
  rotator: RotatorBarSettings;
  slides: RotatorSlide[];
  ticker: TickerBarSettings;
  tickerItems: TickerItem[];
  showcase: ShowcaseSettings;
  showcases: ShowcasePreset[];
}

export const DEFAULT_BROADCAST_DESIGN: BroadcastDesign = 'whatnot';

export const DEFAULT_ROTATOR_SETTINGS: RotatorBarSettings = {
  visible: true,
  intervalSec: 7,
  restDurationSec: 0,
  triggerNonce: 0,
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

export const DEFAULT_SHOWCASE_PRESETS: ShowcasePreset[] = [
  {
    id: 'sc_kga',
    eyebrow: 'HEUTIGES KGA',
    headline: 'Heutiges Käufer-Giveaway',
    subline: 'Jeder Kauf im Stream landet automatisch im Topf',
    layout: 'auto',
    images: [],
  },
  {
    id: 'sc_singles',
    eyebrow: 'GIVEAWAY LINEUP',
    headline: 'Einzelkarten Giveaways heute sind:',
    subline: 'Folgen & im Stream bleiben!',
    layout: 'auto',
    images: [],
  },
];

export const DEFAULT_SHOWCASE_SETTINGS: ShowcaseSettings = {
  activePresetId: 'sc_kga',
  visible: false,
  showTriggerId: 0,
  displayDurationSec: 12,
  autoRepeatRestSec: 0,
  animation: 'pop',
  scalePct: 100,
  textScalePct: 100,
  imageScalePct: 100,
  titleAnchor: 'top',
  titleOffsetY: 0,
  titleOffsetX: 0,
  imageOffsetY: 0,
  titleBgStyle: 'card',
  showSticker: true,
  qualityScale: 2,
  showGlow: true,
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
    showcase: { ...DEFAULT_SHOWCASE_SETTINGS },
    showcases: DEFAULT_SHOWCASE_PRESETS.map((p) => ({
      ...p,
      images: p.images.map((im) => ({ ...im })),
    })),
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

  const validLayouts: ShowcaseLayout[] = ['auto', 'hero', 'fan', 'row'];
  const validAnims: ShowcaseAnimation[] = ['pop', 'float-in', 'spotlight'];

  const showcases: ShowcasePreset[] =
    Array.isArray(raw.showcases) && raw.showcases.length > 0
      ? raw.showcases
          .filter((p) => p && typeof p === 'object')
          .map((p, idx) => ({
            id: typeof p.id === 'string' && p.id.trim() ? p.id : `sc_${idx + 1}`,
            eyebrow: typeof p.eyebrow === 'string' ? p.eyebrow : '',
            headline: typeof p.headline === 'string' ? p.headline : '',
            subline: typeof p.subline === 'string' ? p.subline : '',
            layout: validLayouts.includes(p.layout as ShowcaseLayout) ? p.layout : 'auto',
            images: Array.isArray(p.images)
              ? p.images
                  .filter((im) => im && typeof im === 'object' && typeof im.url === 'string' && im.url.length > 0)
                  .slice(0, 10)
                  .map((im, iIdx) => ({
                    id: typeof im.id === 'string' && im.id.trim() ? im.id : `sc_img_${iIdx + 1}`,
                    url: im.url,
                    label: typeof im.label === 'string' ? im.label : undefined,
                  }))
              : [],
          }))
      : base.showcases;

  const rawRot = raw.rotator && typeof raw.rotator === 'object' ? raw.rotator : undefined;
  const rawTick = raw.ticker && typeof raw.ticker === 'object' ? raw.ticker : undefined;
  const rawSc = raw.showcase && typeof raw.showcase === 'object' ? raw.showcase : undefined;

  const activePresetId =
    rawSc?.activePresetId && showcases.some((p) => p.id === rawSc.activePresetId)
      ? rawSc.activePresetId
      : showcases[0]?.id ?? 'sc_kga';

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
      restDurationSec: Math.max(
        0,
        Math.min(600, Number(rawRot?.restDurationSec ?? DEFAULT_ROTATOR_SETTINGS.restDurationSec) || 0)
      ),
      triggerNonce: Number(rawRot?.triggerNonce ?? 0) || 0,
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
    showcase: {
      ...DEFAULT_SHOWCASE_SETTINGS,
      ...rawSc,
      activePresetId,
      visible: Boolean(rawSc?.visible),
      showTriggerId: Number(rawSc?.showTriggerId ?? 0) || 0,
      displayDurationSec: Math.max(
        0,
        Math.min(120, Number(rawSc?.displayDurationSec ?? DEFAULT_SHOWCASE_SETTINGS.displayDurationSec) || 0)
      ),
      autoRepeatRestSec: Math.max(
        0,
        Math.min(900, Number(rawSc?.autoRepeatRestSec ?? DEFAULT_SHOWCASE_SETTINGS.autoRepeatRestSec) || 0)
      ),
      animation: validAnims.includes(rawSc?.animation as ShowcaseAnimation)
        ? (rawSc!.animation as ShowcaseAnimation)
        : DEFAULT_SHOWCASE_SETTINGS.animation,
      scalePct: Math.max(
        60,
        Math.min(180, Number(rawSc?.scalePct ?? DEFAULT_SHOWCASE_SETTINGS.scalePct) || 100)
      ),
      textScalePct: Math.max(
        50,
        Math.min(220, Number(rawSc?.textScalePct ?? DEFAULT_SHOWCASE_SETTINGS.textScalePct) || 100)
      ),
      imageScalePct: Math.max(
        50,
        Math.min(200, Number(rawSc?.imageScalePct ?? DEFAULT_SHOWCASE_SETTINGS.imageScalePct) || 100)
      ),
      titleAnchor:
        rawSc?.titleAnchor === 'bottom' || rawSc?.titleAnchor === 'overlay'
          ? rawSc.titleAnchor
          : 'top',
      titleOffsetY: Math.max(
        -260,
        Math.min(260, Number(rawSc?.titleOffsetY ?? 0) || 0)
      ),
      titleOffsetX: Math.max(
        -220,
        Math.min(220, Number(rawSc?.titleOffsetX ?? 0) || 0)
      ),
      imageOffsetY: Math.max(
        -160,
        Math.min(160, Number(rawSc?.imageOffsetY ?? 0) || 0)
      ),
      titleBgStyle: rawSc?.titleBgStyle === 'none' ? 'none' : 'card',
      showSticker: rawSc?.showSticker !== false,
      qualityScale: normQualityScale(rawSc?.qualityScale, DEFAULT_SHOWCASE_SETTINGS.qualityScale),
      showGlow: rawSc?.showGlow !== false,
    },
    showcases,
  };
}
