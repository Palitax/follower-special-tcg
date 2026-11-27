'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BroadcastBarsSnapshot,
  BroadcastDesign,
  DEFAULT_WHATNOT_HUD_SETTINGS,
  HudWidgetConfig,
  OverlayQualityScale,
  OverlayResizeMode,
  RotatorAnimationPreset,
  RotatorBarSettings,
  RotatorSlide,
  ShowcasePreset,
  ShowcaseSettings,
  SocialPlatform,
  TickerBarSettings,
  TickerEntranceAnimation,
  TickerItem,
  WhatnotHudSettings,
  createDefaultBroadcastBarsSnapshot,
  normalizeBroadcastBarsSnapshot,
} from '../types/broadcastBars';
import {
  BARS_STORAGE_KEY,
  BroadcastBarsSyncController,
  hydrateBarsSnapshot,
} from '../lib/barsLiveSync';
import { BroadcastRotator, BroadcastTicker } from './BroadcastBars';
import { PromoShowcaseOverlay } from './PromoShowcaseOverlay';
import { ShowcaseEditorPanel } from './ShowcaseEditorPanel';
import { WhatnotHudEditorPanel } from './WhatnotHudEditorPanel';
import {
  HudWidgetKey,
  STANDALONE_HUD_STAGES,
  StandaloneHudWidget,
} from './WhatnotHudOverlay';
import { BarSurfaceControls } from './BarSurfaceControls';
import { TickerCycleStatus } from './useTickerCycle';
import { PlatformBadge } from './WhatnotBars';
import { PLATFORM_THEMES } from './SocialBrandIcons';
import { sound } from '../utils/sound';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Pause,
  Pin,
  PinOff,
  Play,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Smartphone,
  Trash2,
  Monitor,
  Zap,
} from 'lucide-react';

interface BroadcastBarsStudioProps {
  overlayKey: string;
  originUrl: string;
}

type EditorSubTab = 'rotator' | 'ticker' | 'showcase' | 'hud';
type PreviewStageMode = 'checker' | 'dark' | 'portrait';

const PLATFORM_OPTIONS: { id: SocialPlatform; label: string }[] = [
  { id: 'instagram', label: 'Instagram' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'whatnot', label: 'Whatnot' },
  { id: 'buyback', label: 'Kartenankauf' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'discord', label: 'Discord' },
  { id: 'custom', label: 'ManaCards / Info' },
];

const ANIMATION_PRESETS: Record<
  BroadcastDesign,
  { id: RotatorAnimationPreset; label: string; desc: string }[]
> = {
  whatnot: [
    { id: 'unfold', label: 'Pop', desc: 'Sticker springt auf, Icon dreht sich' },
    { id: 'wipe', label: 'Slide', desc: 'Inhalte gleiten seitlich herein' },
    { id: 'mana-surge', label: 'Fade', desc: 'Ruhige Überblendung' },
  ],
  'mana-wood': [
    { id: 'unfold', label: 'Verzauberter Nebel', desc: 'Schrift schwebt aus arkanem Dunst' },
    { id: 'wipe', label: 'Runen-Rolle', desc: 'Zeilen rollen wie eine Holztrommel' },
    { id: 'mana-surge', label: 'Mana-Ausbruch', desc: 'Lettern entzünden sich im Mana-Blitz' },
  ],
};

const DESIGN_OPTIONS: { id: BroadcastDesign; label: string; desc: string }[] = [
  { id: 'whatnot', label: 'Whatnot Live', desc: 'Native Whatnot-Optik · Gelbe Sticker & App-Icons' },
  { id: 'mana-wood', label: 'ManaCards Holz', desc: 'Fantasy-Holz mit leuchtenden Mana-Adern' },
];

const TICKER_ENTRANCE_OPTIONS: {
  id: TickerEntranceAnimation;
  label: string;
  desc: string;
}[] = [
  { id: 'swipe-up', label: 'Swipe Unten', desc: 'Gleitet sanft von unten rein' },
  { id: 'swipe-left', label: 'Swipe Links', desc: 'Fährt von links ins Bild' },
  { id: 'swipe-right', label: 'Swipe Rechts', desc: 'Fährt von rechts ins Bild' },
  { id: 'zoom', label: 'Zoom / Pop', desc: 'Federt sauber aus der Mitte auf' },
  { id: 'wipe', label: 'Wipe (Aufziehen)', desc: 'TV-Blende zieht von links auf' },
  { id: 'fade', label: 'Sanftes Fade', desc: 'Ruhige weiche Überblendung' },
];

function describeTickerSpeed(pxPerSec: number): string {
  if (pxPerSec <= 16) return 'Ultra-Langsam';
  if (pxPerSec <= 30) return 'Sehr langsam';
  if (pxPerSec <= 46) return 'Langsam';
  if (pxPerSec <= 74) return 'Normal';
  if (pxPerSec <= 120) return 'Flott';
  return 'Schnell';
}

export const BroadcastBarsStudio: React.FC<BroadcastBarsStudioProps> = ({
  overlayKey,
  originUrl,
}) => {
  const [snapshot, setSnapshot] = useState<BroadcastBarsSnapshot>(() =>
    createDefaultBroadcastBarsSnapshot('studio_init')
  );
  const [subTab, setSubTab] = useState<EditorSubTab>('rotator');
  const [previewMode, setPreviewMode] = useState<PreviewStageMode>('checker');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [rotatorStatus, setRotatorStatus] = useState({
    isResting: false,
    restRemainingSec: 0,
    slideIndex: 0,
    totalEnabled: 0,
  });
  const [tickerStatus, setTickerStatus] = useState<TickerCycleStatus>({
    isShowing: true,
    isResting: false,
    remainingSec: 0,
    cycleActive: false,
  });
  const [tickerPreviewAlwaysOn, setTickerPreviewAlwaysOn] = useState(false);
  const [showcasePreviewAlwaysOn, setShowcasePreviewAlwaysOn] = useState(true);
  const [hudShowGhostUi, setHudShowGhostUi] = useState(true);
  const [hudForceCallouts, setHudForceCallouts] = useState(true);
  const [selectedHudWidget, setSelectedHudWidget] = useState<HudWidgetKey>('shop');
  const [hudDraft, setHudDraft] = useState<WhatnotHudSettings | null>(null);
  const [hudAutoApplyLive, setHudAutoApplyLive] = useState(false);

  const snapshotRef = useRef<BroadcastBarsSnapshot>(snapshot);
  const controllerRef = useRef<BroadcastBarsSyncController | null>(null);

  useEffect(() => {
    let cancelled = false;
    let controller: BroadcastBarsSyncController | null = null;

    async function bootstrap() {
      try {
        const raw = localStorage.getItem(BARS_STORAGE_KEY);
        if (raw) {
          const parsed = normalizeBroadcastBarsSnapshot(JSON.parse(raw), 'studio_local');
          const hydrated = await hydrateBarsSnapshot(parsed);
          if (!cancelled) {
            snapshotRef.current = hydrated;
            setSnapshot(hydrated);
          }
        }
      } catch {
        // ignore
      }

      if (cancelled) return;

      controller = new BroadcastBarsSyncController({
        role: 'studio',
        overlayKey,
        getLocalSnapshot: (clientId) => ({
          ...snapshotRef.current,
          senderId: clientId,
        }),
        onRemoteSnapshot: (incoming) => {
          if (cancelled) return;
          snapshotRef.current = incoming;
          setSnapshot(incoming);
        },
      });

      controllerRef.current = controller;
      void controller.start();
    }

    void bootstrap();

    return () => {
      cancelled = true;
      controller?.stop();
      controllerRef.current = null;
    };
  }, [overlayKey]);

  const commitUpdate = useCallback(
    (updater: (cur: BroadcastBarsSnapshot) => Partial<BroadcastBarsSnapshot>) => {
      const cur = snapshotRef.current;
      const patch = updater(cur);
      const next: BroadcastBarsSnapshot = {
        ...cur,
        ...patch,
        updatedAt: Math.max(Date.now(), cur.updatedAt + 1),
        senderId: controllerRef.current?.clientId ?? 'studio_local',
      };
      snapshotRef.current = next;
      setSnapshot(next);
      void controllerRef.current?.publish(next);
    },
    []
  );

  const updateRotator = useCallback(
    <K extends keyof RotatorBarSettings>(key: K, value: RotatorBarSettings[K]) => {
      commitUpdate((cur) => ({
        rotator: { ...cur.rotator, [key]: value },
      }));
    },
    [commitUpdate]
  );

  const updateTicker = useCallback(
    <K extends keyof TickerBarSettings>(key: K, value: TickerBarSettings[K]) => {
      commitUpdate((cur) => ({
        ticker: { ...cur.ticker, [key]: value },
      }));
    },
    [commitUpdate]
  );

  const updateSlide = useCallback(
    (slideId: string, patch: Partial<RotatorSlide>) => {
      commitUpdate((cur) => ({
        slides: cur.slides.map((s) => (s.id === slideId ? { ...s, ...patch } : s)),
      }));
    },
    [commitUpdate]
  );

  const moveSlide = useCallback(
    (index: number, delta: -1 | 1) => {
      sound.playClick(580);
      commitUpdate((cur) => {
        const target = index + delta;
        if (target < 0 || target >= cur.slides.length) return {};
        const copy = [...cur.slides];
        const [item] = copy.splice(index, 1);
        copy.splice(target, 0, item);
        return { slides: copy };
      });
    },
    [commitUpdate]
  );

  const addSlide = useCallback(() => {
    sound.playClick(720);
    const id = `slide_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    commitUpdate((cur) => ({
      slides: [
        ...cur.slides,
        {
          id,
          platform: 'custom',
          eyebrow: 'MANACARDS HINWEIS',
          headline: 'Neuer Stream-Hinweis',
          subline: 'manacards.de',
          enabled: true,
        },
      ],
    }));
  }, [commitUpdate]);

  const deleteSlide = useCallback(
    (slideId: string) => {
      sound.playClick(450);
      commitUpdate((cur) => ({
        slides: cur.slides.filter((s) => s.id !== slideId),
        rotator:
          cur.rotator.pinnedSlideId === slideId
            ? { ...cur.rotator, pinnedSlideId: null }
            : cur.rotator,
      }));
    },
    [commitUpdate]
  );

  const updateTickerItem = useCallback(
    (itemId: string, patch: Partial<TickerItem>) => {
      commitUpdate((cur) => ({
        tickerItems: cur.tickerItems.map((it) =>
          it.id === itemId ? { ...it, ...patch } : it
        ),
      }));
    },
    [commitUpdate]
  );

  const moveTickerItem = useCallback(
    (index: number, delta: -1 | 1) => {
      sound.playClick(580);
      commitUpdate((cur) => {
        const target = index + delta;
        if (target < 0 || target >= cur.tickerItems.length) return {};
        const copy = [...cur.tickerItems];
        const [item] = copy.splice(index, 1);
        copy.splice(target, 0, item);
        return { tickerItems: copy };
      });
    },
    [commitUpdate]
  );

  const addTickerItem = useCallback(() => {
    sound.playClick(720);
    const id = `tick_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    commitUpdate((cur) => ({
      tickerItems: [
        ...cur.tickerItems,
        {
          id,
          platform: 'custom',
          label: 'INFO',
          highlight: 'Neuer Ticker-Text · manacards.de',
          enabled: true,
        },
      ],
    }));
  }, [commitUpdate]);

  const deleteTickerItem = useCallback(
    (itemId: string) => {
      sound.playClick(450);
      commitUpdate((cur) => ({
        tickerItems: cur.tickerItems.filter((it) => it.id !== itemId),
      }));
    },
    [commitUpdate]
  );

  const updateShowcaseSettings = useCallback(
    <K extends keyof ShowcaseSettings>(key: K, value: ShowcaseSettings[K]) => {
      commitUpdate((cur) => ({
        showcase: { ...cur.showcase, [key]: value },
      }));
    },
    [commitUpdate]
  );

  const triggerShowShowcase = useCallback(
    (presetId?: string) => {
      commitUpdate((cur) => ({
        showcase: {
          ...cur.showcase,
          activePresetId: presetId || cur.showcase.activePresetId,
          visible: true,
          showTriggerId: Date.now(),
        },
      }));
    },
    [commitUpdate]
  );

  const hideShowcase = useCallback(() => {
    commitUpdate((cur) => ({
      showcase: { ...cur.showcase, visible: false },
    }));
  }, [commitUpdate]);

  const updateShowcasePreset = useCallback(
    (presetId: string, patch: Partial<ShowcasePreset>) => {
      commitUpdate((cur) => ({
        showcases: cur.showcases.map((p) => (p.id === presetId ? { ...p, ...patch } : p)),
      }));
    },
    [commitUpdate]
  );

  const addShowcasePreset = useCallback(() => {
    sound.playClick(720);
    const id = `sc_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
    commitUpdate((cur) => ({
      showcases: [
        ...cur.showcases,
        {
          id,
          eyebrow: 'HIGHLIGHT',
          headline: 'Neues Giveaway-Highlight',
          subline: '',
          layout: 'auto',
          images: [],
        },
      ],
      showcase: { ...cur.showcase, activePresetId: id },
    }));
  }, [commitUpdate]);

  const deleteShowcasePreset = useCallback(
    (presetId: string) => {
      sound.playClick(450);
      commitUpdate((cur) => {
        const remaining = cur.showcases.filter((p) => p.id !== presetId);
        if (remaining.length === 0) return {};
        return {
          showcases: remaining,
          showcase:
            cur.showcase.activePresetId === presetId
              ? { ...cur.showcase, activePresetId: remaining[0].id }
              : cur.showcase,
        };
      });
    },
    [commitUpdate]
  );

  const triggerRotatorCycleNow = useCallback(() => {
    sound.playClick(760);
    commitUpdate((cur) => ({
      rotator: {
        ...cur.rotator,
        visible: true,
        paused: false,
        pinnedSlideId: null,
        triggerNonce: Date.now(),
      },
    }));
  }, [commitUpdate]);

  const triggerTickerNow = useCallback(() => {
    sound.playClick(760);
    commitUpdate((cur) => ({
      ticker: {
        ...cur.ticker,
        visible: true,
        triggerNonce: Date.now(),
      },
    }));
  }, [commitUpdate]);

  const displayedHud = hudDraft ?? snapshot.hud;

  const updateHudSettings = useCallback(
    (patch: Partial<WhatnotHudSettings>) => {
      if (hudAutoApplyLive) {
        setHudDraft(null);
        commitUpdate((cur) => ({
          hud: { ...cur.hud, ...patch },
        }));
      } else {
        setHudDraft((prev) => ({
          ...(prev ?? snapshotRef.current.hud),
          ...patch,
        }));
      }
    },
    [commitUpdate, hudAutoApplyLive]
  );

  const updateHudWidget = useCallback(
    (key: HudWidgetKey, patch: Partial<HudWidgetConfig>) => {
      if (hudAutoApplyLive) {
        setHudDraft(null);
        commitUpdate((cur) => ({
          hud: {
            ...cur.hud,
            [key]: { ...cur.hud[key], ...patch },
          },
        }));
      } else {
        setHudDraft((prev) => {
          const base = prev ?? snapshotRef.current.hud;
          return {
            ...base,
            [key]: { ...base[key], ...patch },
          };
        });
      }
    },
    [commitUpdate, hudAutoApplyLive]
  );

  const resetHudWidget = useCallback(
    (key: HudWidgetKey) => {
      const def = { ...DEFAULT_WHATNOT_HUD_SETTINGS[key] };
      if (hudAutoApplyLive) {
        setHudDraft(null);
        commitUpdate((cur) => ({
          hud: { ...cur.hud, [key]: def },
        }));
      } else {
        setHudDraft((prev) => {
          const base = prev ?? snapshotRef.current.hud;
          return { ...base, [key]: def };
        });
      }
    },
    [commitUpdate, hudAutoApplyLive]
  );

  const confirmHudDraft = useCallback(() => {
    if (!hudDraft) return;
    sound.playClick(780);
    const toCommit = hudDraft;
    setHudDraft(null);
    commitUpdate(() => ({ hud: toCommit }));
  }, [commitUpdate, hudDraft]);

  const discardHudDraft = useCallback(() => {
    sound.playClick(460);
    setHudDraft(null);
  }, []);

  const resetDefaults = useCallback(() => {
    sound.playClick(520);
    const defaults = createDefaultBroadcastBarsSnapshot(
      controllerRef.current?.clientId ?? 'studio_reset'
    );
    commitUpdate(() => ({
      rotator: defaults.rotator,
      slides: defaults.slides,
      ticker: defaults.ticker,
      tickerItems: defaults.tickerItems,
    }));
  }, [commitUpdate]);

  const obsUrls = useMemo(() => {
    const base = originUrl || '';
    const qs = overlayKey ? `?key=${overlayKey}` : '';
    const comboQs = overlayKey ? `?key=${overlayKey}&ticker=1` : '?ticker=1';
    return {
      rotator: `${base}/overlay/rotator${qs}`,
      ticker: `${base}/overlay/ticker${qs}`,
      showcase: `${base}/overlay/showcase${qs}`,
      hud: `${base}/overlay/hud${qs}`,
      combined: `${base}/overlay/rotator${comboQs}`,
    };
  }, [originUrl, overlayKey]);

  const handleCopyUrl = async (id: string, url: string) => {
    sound.playClick(760);
    const resolved =
      typeof window !== 'undefined' && url.startsWith('/')
        ? `${window.location.origin}${url}`
        : url;
    try {
      await navigator.clipboard.writeText(resolved);
    } catch {
      const inp = document.createElement('input');
      inp.value = resolved;
      document.body.appendChild(inp);
      inp.select();
      document.execCommand('copy');
      document.body.removeChild(inp);
    }
    setCopiedKey(id);
    setTimeout(() => setCopiedKey((cur) => (cur === id ? null : cur)), 2200);
  };

  const activeSlideCount = snapshot.slides.filter((s) => s.enabled).length;
  const activeTickerCount = snapshot.tickerItems.filter((t) => t.enabled).length;
  const pinnedSlide = snapshot.slides.find((s) => s.id === snapshot.rotator.pinnedSlideId);

  // Recommended OBS Browser Source dimensions matching native HiDPI qualityScale (0 upscaling blur)
  const rotQ = snapshot.rotator.qualityScale ?? 2;
  const tickQ = snapshot.ticker.qualityScale ?? 2;
  const obsRotatorW = Math.max(800, Math.round((snapshot.rotator.widthPx + 40) * rotQ));
  const obsRotatorH = Math.max(180, Math.round((snapshot.rotator.heightPx + 56) * rotQ));
  const obsTickerW = snapshot.ticker.fullWidth
    ? Math.round(1080 * Math.min(1.5, tickQ))
    : Math.max(640, Math.round((snapshot.ticker.widthPx + 32) * tickQ));
  const obsTickerH = Math.max(100, Math.round((snapshot.ticker.heightPx + 32) * tickQ));
  const obsComboW = Math.max(obsRotatorW, obsTickerW);
  const obsComboH = obsRotatorH + obsTickerH;

  // Preview scale factors so HiDPI 2x overlays render razor-sharp inside the monitor without overflow
  const previewScale = useMemo(() => {
    const targetBoxWidth = previewMode === 'portrait' ? 268 : 420;
    const renderedW = Math.max(300, snapshot.rotator.widthPx) * rotQ;
    return Math.min(1 / rotQ, targetBoxWidth / renderedW);
  }, [previewMode, snapshot.rotator.widthPx, rotQ]);

  const tickerPreviewScale = useMemo(() => {
    const targetBoxWidth = previewMode === 'portrait' ? 276 : 420;
    if (snapshot.ticker.fullWidth) {
      return Math.min(1, 1 / tickQ);
    }
    const renderedW = Math.max(360, snapshot.ticker.widthPx) * tickQ;
    return Math.min(1 / tickQ, targetBoxWidth / renderedW);
  }, [previewMode, snapshot.ticker.fullWidth, snapshot.ticker.widthPx, tickQ]);

  const activeShowcasePreset =
    snapshot.showcases.find((p) => p.id === snapshot.showcase.activePresetId) ??
    snapshot.showcases[0] ??
    null;

  const scQ = snapshot.showcase.qualityScale ?? 2;
  const scS = Math.max(0.6, Math.min(1.8, (snapshot.showcase.scalePct ?? 100) / 100));
  const obsShowcaseW = Math.round(780 * scS * scQ);
  const obsShowcaseH = Math.round(560 * scS * scQ);

  const showcasePreviewScale = useMemo(() => {
    const targetW = previewMode === 'portrait' ? 276 : 420;
    const renderedW = Math.round(780 * scS * scQ);
    return Math.min(1 / scQ, targetW / Math.max(1, renderedW));
  }, [previewMode, scS, scQ]);

  return (
    <div className="relative z-20 flex-1 min-h-0 flex flex-col xl:flex-row overflow-hidden">
      {/* ===================================================================
          LEFT: OBS URLS + ROTATOR / TICKER / SHOWCASE EDITOR
         =================================================================== */}
      <section className="flex-1 min-w-0 min-h-0 overflow-y-auto studio-scroll p-4 sm:p-6 space-y-5">
        {/* OBS Browser-Source Quick Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {[
            {
              id: 'rotator',
              title: 'Social Rotator',
              sizeHint: `OBS: ${obsRotatorW} × ${obsRotatorH} px (${rotQ}×)`,
              url: obsUrls.rotator,
              accent: 'border-sky-400/35 bg-sky-500/[0.06]',
            },
            {
              id: 'ticker',
              title: 'Horizontal Ticker',
              sizeHint: `OBS: ${obsTickerW} × ${obsTickerH} px (${tickQ}×)`,
              url: obsUrls.ticker,
              accent: 'border-amber-400/35 bg-amber-500/[0.06]',
            },
            {
              id: 'showcase',
              title: 'KGA / Showcase',
              sizeHint: `OBS: ${obsShowcaseW} × ${obsShowcaseH} px (${scQ}×)`,
              url: obsUrls.showcase,
              accent: 'border-[#FFE406]/45 bg-[#FFE406]/[0.07]',
            },
            {
              id: 'hud',
              title: 'Whatnot HUD',
              sizeHint: '3 Einzel-Quellen (Shop/GA/Logo)',
              url: `${obsUrls.hud}${obsUrls.hud.includes('?') ? '&' : '?'}only=shop`,
              accent: 'border-teal-400/40 bg-teal-500/[0.07]',
            },
            {
              id: 'combined',
              title: 'Kombi (Rot+Tick)',
              sizeHint: `OBS: ${obsComboW} × ${obsComboH} px`,
              url: obsUrls.combined,
              accent: 'border-purple-400/35 bg-purple-500/[0.06]',
            },
          ].map((src) => {
            const isCopied = copiedKey === src.id;
            return (
              <div
                key={src.id}
                className={`p-3.5 border ${src.accent} bg-zinc-950/70 backdrop-blur-md flex flex-col justify-between gap-2.5`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-xs font-black uppercase tracking-[0.14em] text-white">
                      {src.title}
                    </h2>
                    <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                      {src.sizeHint}
                    </p>
                  </div>
                  <a
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 border border-white/15 bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white transition-colors"
                    title={`${src.title} in neuem Tab öffnen`}
                    aria-label={`${src.title} in neuem Tab öffnen`}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                <button
                  type="button"
                  onClick={() => void handleCopyUrl(src.id, src.url)}
                  className={`w-full h-9 px-3 text-[11px] font-black uppercase tracking-[0.12em] flex items-center justify-center gap-1.5 transition-all active:scale-[0.99] select-none ${
                    isCopied
                      ? 'bg-emerald-400 text-black'
                      : 'bg-white/10 hover:bg-sky-400 text-white hover:text-black border border-white/15 hover:border-sky-300'
                  }`}
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>URL kopiert</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>OBS-URL kopieren</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Design language switch (applies to rotator + ticker) */}
        <div className="p-4 border border-white/10 bg-zinc-950/75 space-y-2.5">
          <span className="block text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
            Design-Stil (Rotator &amp; Ticker)
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {DESIGN_OPTIONS.map((opt) => {
              const active = snapshot.design === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    sound.playClick(660);
                    commitUpdate(() => ({ design: opt.id }));
                  }}
                  className={`min-h-[44px] p-2.5 border text-left transition-colors ${
                    active
                      ? 'bg-sky-400/15 border-sky-400/60 text-white'
                      : 'bg-black/40 border-white/10 text-slate-300 hover:border-white/25'
                  }`}
                >
                  <div className="text-xs font-extrabold">{opt.label}</div>
                  <div className="text-[10.5px] text-slate-400 mt-0.5">{opt.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sub-Tab Bar: Rotator vs. Ticker */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-2">
          <div
            role="tablist"
            aria-label="Broadcast-Bar Bereiche"
            className="flex items-center gap-1"
          >
            <button
              type="button"
              role="tab"
              id="bars-tab-rotator"
              aria-selected={subTab === 'rotator'}
              onClick={() => {
                sound.playClick(640);
                setSubTab('rotator');
              }}
              className={`mc-studio-tab px-4 py-2 text-xs font-black uppercase tracking-[0.14em] transition-colors select-none ${
                subTab === 'rotator'
                  ? 'text-sky-300 bg-sky-400/10'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Social Rotator ({activeSlideCount}/{snapshot.slides.length})
            </button>
            <button
              type="button"
              role="tab"
              id="bars-tab-ticker"
              aria-selected={subTab === 'ticker'}
              onClick={() => {
                sound.playClick(640);
                setSubTab('ticker');
              }}
              className={`mc-studio-tab px-4 py-2 text-xs font-black uppercase tracking-[0.14em] transition-colors select-none ${
                subTab === 'ticker'
                  ? 'text-sky-300 bg-sky-400/10'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Ticker Bar ({activeTickerCount}/{snapshot.tickerItems.length})
            </button>
            <button
              type="button"
              role="tab"
              id="bars-tab-showcase"
              aria-selected={subTab === 'showcase'}
              onClick={() => {
                sound.playClick(640);
                setSubTab('showcase');
              }}
              className={`mc-studio-tab px-4 py-2 text-xs font-black uppercase tracking-[0.14em] transition-colors select-none ${
                subTab === 'showcase'
                  ? 'text-[#FFE406] bg-[#FFE406]/10'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              KGA / Showcase ({snapshot.showcases.length})
            </button>
            <button
              type="button"
              role="tab"
              id="bars-tab-hud"
              aria-selected={subTab === 'hud'}
              onClick={() => {
                sound.playClick(640);
                setSubTab('hud');
              }}
              className={`mc-studio-tab px-4 py-2 text-xs font-black uppercase tracking-[0.14em] transition-colors select-none ${
                subTab === 'hud'
                  ? 'text-teal-300 bg-teal-400/10'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Whatnot HUD (
              {[
                snapshot.hud.shop.enabled,
                snapshot.hud.giveaway.enabled,
                snapshot.hud.avatar.enabled,
              ].filter(Boolean).length}
              /3)
            </button>
          </div>

          <button
            type="button"
            onClick={resetDefaults}
            className="h-8 px-3 border border-white/15 bg-white/5 hover:bg-white/10 text-[11px] font-bold text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors select-none"
            title="Alle ManaCards Standard-Slides und Ticker-Texte wiederherstellen"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>ManaCards Presets laden</span>
          </button>
        </div>

        {/* ===============================================================
            PANEL 1: SOCIAL ROTATOR SETTINGS & SLIDES
           =============================================================== */}
        <div
          role="tabpanel"
          aria-labelledby="bars-tab-rotator"
          hidden={subTab !== 'rotator'}
        >
          <div className="space-y-4">
            {/* Global Rotator Style & Timing Controls */}
            <div className="p-4 border border-white/10 bg-zinc-950/75 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-slate-200">
                  <SlidersHorizontal className="w-4 h-4 text-sky-300" />
                  <span>Rotator Design &amp; Timing</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      sound.playClick(600);
                      updateRotator('visible', !snapshot.rotator.visible);
                    }}
                    className={`h-8 px-3 border text-[11px] font-bold flex items-center gap-1.5 transition-colors ${
                      snapshot.rotator.visible
                        ? 'bg-emerald-500/15 border-emerald-400/45 text-emerald-200'
                        : 'bg-rose-500/15 border-rose-400/45 text-rose-200'
                    }`}
                  >
                    {snapshot.rotator.visible ? (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        <span>Im Stream sichtbar</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>Ausgeblendet</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      sound.playClick(600);
                      updateRotator('paused', !snapshot.rotator.paused);
                    }}
                    className={`h-8 px-3 border text-[11px] font-bold flex items-center gap-1.5 transition-colors ${
                      snapshot.rotator.paused
                        ? 'bg-amber-400/20 border-amber-400/50 text-amber-200'
                        : 'bg-white/5 border-white/15 text-slate-200 hover:bg-white/10'
                    }`}
                  >
                    {snapshot.rotator.paused ? (
                      <>
                        <Play className="w-3.5 h-3.5" />
                        <span>Abspielen</span>
                      </>
                    ) : (
                      <>
                        <Pause className="w-3.5 h-3.5" />
                        <span>Pause</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Resize Mode & HiDPI Quality Selector */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 border-t border-white/10">
                <div className="space-y-1.5">
                  <span className="block text-[10.5px] font-bold uppercase tracking-[0.12em] text-slate-400">
                    Größen-Modus
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(
                      [
                        {
                          id: 'together',
                          label: 'Zusammen',
                          sub: 'Hintergrund + Text',
                        },
                        {
                          id: 'background-only',
                          label: 'Nur Hintergrund',
                          sub: 'Text bleibt fix',
                        },
                      ] as { id: OverlayResizeMode; label: string; sub: string }[]
                    ).map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          sound.playClick(620);
                          updateRotator('resizeMode', m.id);
                        }}
                        className={`p-2 border text-left transition-colors ${
                          snapshot.rotator.resizeMode === m.id
                            ? 'bg-sky-400/15 border-sky-400/60 text-white'
                            : 'bg-black/40 border-white/10 text-slate-300 hover:border-white/25'
                        }`}
                      >
                        <div className="text-[11px] font-extrabold">{m.label}</div>
                        <div className="text-[10px] text-slate-400">{m.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="block text-[10.5px] font-bold uppercase tracking-[0.12em] text-slate-400">
                    OBS Schärfe / Auflösung
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(
                      [
                        { id: 1, label: '1×', sub: 'Standard' },
                        { id: 1.5, label: '1.5×', sub: 'HD' },
                        { id: 2, label: '2×', sub: 'Retina' },
                      ] as { id: OverlayQualityScale; label: string; sub: string }[]
                    ).map((qOpt) => (
                      <button
                        key={qOpt.id}
                        type="button"
                        onClick={() => {
                          sound.playClick(640);
                          updateRotator('qualityScale', qOpt.id);
                        }}
                        className={`p-2 border text-center transition-colors ${
                          snapshot.rotator.qualityScale === qOpt.id
                            ? 'bg-emerald-400/15 border-emerald-400/60 text-emerald-200'
                            : 'bg-black/40 border-white/10 text-slate-300 hover:border-white/25'
                        }`}
                      >
                        <div className="text-xs font-black">{qOpt.label}</div>
                        <div className="text-[9.5px] text-slate-400">{qOpt.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Independent Width, Height, Content Scale & Interval Sliders */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Width Slider + Fixed/Auto toggle */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs gap-2">
                    <span className="font-bold text-slate-300">
                      {snapshot.rotator.resizeMode === 'background-only'
                        ? 'Hintergrund-Breite'
                        : 'Breite (unabhängig)'}
                    </span>
                    <div className="flex items-center gap-2">
                      {snapshot.design === 'whatnot' && (
                        <button
                          type="button"
                          onClick={() =>
                            updateRotator(
                              'widthMode',
                              snapshot.rotator.widthMode === 'fixed' ? 'auto' : 'fixed'
                            )
                          }
                          className="px-1.5 py-0.5 text-[10px] font-bold border border-white/15 bg-white/5 hover:bg-white/10 text-slate-200"
                          title="Fix verwendet exakt den Breiten-Regler; Auto passt die Karte an den Text an"
                        >
                          {snapshot.rotator.widthMode === 'fixed' ? 'Fix' : 'Auto'}
                        </button>
                      )}
                      <span className="font-black text-sky-300">
                        {snapshot.rotator.widthPx} px
                      </span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={300}
                    max={1100}
                    step={10}
                    value={snapshot.rotator.widthPx}
                    onChange={(e) => updateRotator('widthPx', Number(e.target.value))}
                    className="w-full cursor-pointer"
                  />
                </div>

                {/* Independent Height Slider */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-300">
                      {snapshot.rotator.resizeMode === 'background-only'
                        ? 'Hintergrund-Höhe'
                        : 'Höhe (unabhängig)'}
                    </span>
                    <span className="font-black text-sky-300">
                      {snapshot.rotator.heightPx} px
                    </span>
                  </div>
                  <input
                    type="range"
                    min={60}
                    max={260}
                    step={2}
                    value={snapshot.rotator.heightPx}
                    onChange={(e) => updateRotator('heightPx', Number(e.target.value))}
                    className="w-full cursor-pointer"
                  />
                </div>

                {/* Independent Text & Icon Scale */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-300">
                      Text- &amp; Logo-Größe
                    </span>
                    <span className="font-black text-amber-300">
                      {snapshot.rotator.contentScale}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={60}
                    max={220}
                    step={5}
                    value={snapshot.rotator.contentScale}
                    onChange={(e) => updateRotator('contentScale', Number(e.target.value))}
                    className="w-full cursor-pointer"
                  />
                </div>

                {/* Interval Slider */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-300">Wechsel-Takt pro Slide</span>
                    <span className="font-black text-sky-300">
                      alle {snapshot.rotator.intervalSec} Sek.
                    </span>
                  </div>
                  <input
                    type="range"
                    min={3}
                    max={30}
                    step={1}
                    value={snapshot.rotator.intervalSec}
                    onChange={(e) => updateRotator('intervalSec', Number(e.target.value))}
                    className="w-full cursor-pointer"
                  />
                </div>
              </div>

              {/* Intermittent Cooldown / Rest Duration between full cycles */}
              <div className="p-3 border border-sky-400/25 bg-sky-500/[0.05] space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="block text-xs font-extrabold text-white">
                      Pause zwischen Durchläufen (Overlay zeitweise ausblenden)
                    </span>
                    <span className="block text-[11px] text-slate-400 mt-0.5">
                      Spielt alle aktiven Socials einmal komplett ab und blendet die Bar danach für die gewählte Pause aus.
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={triggerRotatorCycleNow}
                    className="h-8 px-3 bg-[#FFE406] hover:bg-[#f5dc00] text-[#1a1718] font-black text-[11px] uppercase tracking-[0.08em] flex items-center gap-1.5 shrink-0"
                  >
                    <Zap className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Jetzt Durchlauf starten</span>
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300">Ruhepause nach Durchlauf</span>
                  <span className="font-black text-[#FFE406]">
                    {snapshot.rotator.restDurationSec === 0
                      ? 'Aus (dauerhaft sichtbar)'
                      : `${snapshot.rotator.restDurationSec} Sek. unsichtbar`}
                  </span>
                </div>

                <input
                  type="range"
                  min={0}
                  max={600}
                  step={5}
                  value={snapshot.rotator.restDurationSec}
                  onChange={(e) => updateRotator('restDurationSec', Number(e.target.value))}
                  className="w-full cursor-pointer"
                />

                <div className="flex flex-wrap gap-1.5">
                  {[
                    { sec: 0, label: 'Dauerhaft (0s)' },
                    { sec: 20, label: '20 Sek.' },
                    { sec: 45, label: '45 Sek.' },
                    { sec: 60, label: '1 Min.' },
                    { sec: 120, label: '2 Min.' },
                    { sec: 300, label: '5 Min.' },
                  ].map((opt) => (
                    <button
                      key={opt.sec}
                      type="button"
                      onClick={() => {
                        sound.playClick(620);
                        updateRotator('restDurationSec', opt.sec);
                      }}
                      className={`px-2.5 py-1 border text-[11px] font-bold transition-colors ${
                        snapshot.rotator.restDurationSec === opt.sec
                          ? 'bg-[#FFE406]/20 border-[#FFE406]/65 text-[#FFE406]'
                          : 'bg-black/45 border-white/10 text-slate-300 hover:border-white/25'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Animation Preset Picker */}
              <div className="space-y-1.5">
                <span className="block text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  Animations-Stil
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {ANIMATION_PRESETS[snapshot.design].map((p) => {
                    const active = snapshot.rotator.animationPreset === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          sound.playClick(650);
                          updateRotator('animationPreset', p.id);
                        }}
                        className={`p-2.5 border text-left transition-colors ${
                          active
                            ? 'bg-sky-400/15 border-sky-400/60 text-white'
                            : 'bg-black/40 border-white/10 text-slate-300 hover:border-white/25'
                        }`}
                      >
                        <div className="text-xs font-extrabold">{p.label}</div>
                        <div className="text-[10.5px] text-slate-400 mt-0.5">{p.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Background Opacity & Pattern Look (Whatnot design) */}
              {snapshot.design === 'whatnot' && (
                <BarSurfaceControls
                  bgOpacityPct={snapshot.rotator.bgOpacityPct ?? 96}
                  bgPattern={snapshot.rotator.bgPattern ?? 'logos'}
                  patternOpacityPct={snapshot.rotator.patternOpacityPct ?? 60}
                  onChangeBgOpacity={(v) => updateRotator('bgOpacityPct', v)}
                  onChangePattern={(v) => updateRotator('bgPattern', v)}
                  onChangePatternOpacity={(v) => updateRotator('patternOpacityPct', v)}
                />
              )}

              {/* Style Toggles Row (wood design only) */}
              {snapshot.design === 'mana-wood' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() =>
                    updateRotator(
                      'veinColorMode',
                      snapshot.rotator.veinColorMode === 'mana-blue' ? 'platform' : 'mana-blue'
                    )
                  }
                  className="py-2 px-2.5 border border-white/15 bg-black/45 hover:bg-white/10 text-left"
                >
                  <div className="text-[9.5px] uppercase tracking-wider text-slate-400">
                    Adern-Farbe
                  </div>
                  <div className="text-sky-300 mt-0.5">
                    {snapshot.rotator.veinColorMode === 'mana-blue'
                      ? 'Mana-Blau (Brand)'
                      : 'Plattform-Farbe'}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    updateRotator(
                      'edgeStyle',
                      snapshot.rotator.edgeStyle === 'angled' ? 'sharp' : 'angled'
                    )
                  }
                  className="py-2 px-2.5 border border-white/15 bg-black/45 hover:bg-white/10 text-left"
                >
                  <div className="text-[9.5px] uppercase tracking-wider text-slate-400">
                    Holzenden
                  </div>
                  <div className="text-white mt-0.5">
                    {snapshot.rotator.edgeStyle === 'angled' ? 'Rau gebrochen' : 'Glatt gesägt'}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => updateRotator('showWoodVeins', !snapshot.rotator.showWoodVeins)}
                  className="py-2 px-2.5 border border-white/15 bg-black/45 hover:bg-white/10 text-left"
                >
                  <div className="text-[9.5px] uppercase tracking-wider text-slate-400">
                    Holzadern-Glow
                  </div>
                  <div className={snapshot.rotator.showWoodVeins ? 'text-emerald-300 mt-0.5' : 'text-slate-400 mt-0.5'}>
                    {snapshot.rotator.showWoodVeins ? 'Aktiviert' : 'Nur Holztextur'}
                  </div>
                </button>
              </div>
              )}
            </div>

            {/* Slides Header + Add Button */}
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-black uppercase tracking-[0.16em] text-slate-300">
                Rotator-Slides ({snapshot.slides.length})
              </h3>
              <button
                type="button"
                onClick={addSlide}
                className="h-8 px-3 bg-sky-400 hover:bg-sky-300 text-black text-xs font-black uppercase tracking-[0.1em] flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>Slide hinzufügen</span>
              </button>
            </div>

            {/* Editable Slide Cards */}
            <div className="space-y-3">
              {snapshot.slides.map((slide, idx) => {
                const theme = PLATFORM_THEMES[slide.platform] ?? PLATFORM_THEMES.custom;
                const isPinned = snapshot.rotator.pinnedSlideId === slide.id;
                return (
                  <div
                    key={slide.id}
                    className={`relative border transition-colors ${
                      isPinned
                        ? 'border-amber-400/70 bg-amber-500/[0.06]'
                        : slide.enabled
                        ? 'border-white/12 bg-zinc-950/80'
                        : 'border-white/5 bg-zinc-950/40 opacity-60'
                    }`}
                  >
                    {/* Left brand accent stripe */}
                    <div
                      className="absolute left-0 top-0 bottom-0 w-1"
                      style={{ backgroundColor: theme.accentHex }}
                    />

                    <div className="p-3.5 pl-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <PlatformBadge
                            platform={slide.platform}
                            size={34}
                            radius={9}
                          />

                          <select
                            aria-label="Plattform"
                            value={slide.platform}
                            onChange={(e) =>
                              updateSlide(slide.id, {
                                platform: e.target.value as SocialPlatform,
                              })
                            }
                            className="h-8 px-2 bg-black/60 border border-white/15 text-xs font-bold text-white focus:outline-none focus:border-sky-400"
                          >
                            {PLATFORM_OPTIONS.map((opt) => (
                              <option key={opt.id} value={opt.id}>
                                {opt.label}
                              </option>
                            ))}
                          </select>

                          <span className="text-[11px] font-bold text-slate-500">
                            #{idx + 1}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {/* Pin Live Button */}
                          <button
                            type="button"
                            onClick={() => {
                              sound.playClick(700);
                              updateRotator(
                                'pinnedSlideId',
                                isPinned ? null : slide.id
                              );
                            }}
                            className={`h-8 px-2.5 border text-[11px] font-bold flex items-center gap-1 transition-colors ${
                              isPinned
                                ? 'bg-amber-400 text-black border-amber-300'
                                : 'bg-white/5 border-white/15 text-slate-300 hover:text-white hover:bg-white/10'
                            }`}
                            title={
                              isPinned
                                ? 'Pin lösen (normal weiterrotieren)'
                                : 'Diesen Slide sofort dauerhaft im Stream festhalten'
                            }
                          >
                            {isPinned ? (
                              <>
                                <PinOff className="w-3.5 h-3.5" />
                                <span>Gepinnt</span>
                              </>
                            ) : (
                              <>
                                <Pin className="w-3.5 h-3.5" />
                                <span>Pinnen</span>
                              </>
                            )}
                          </button>

                          {/* Active Toggle */}
                          <button
                            type="button"
                            onClick={() =>
                              updateSlide(slide.id, { enabled: !slide.enabled })
                            }
                            className={`h-8 px-2.5 border text-[11px] font-bold transition-colors ${
                              slide.enabled
                                ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-200'
                                : 'bg-white/5 border-white/10 text-slate-400'
                            }`}
                          >
                            {slide.enabled ? 'Aktiv' : 'Aus'}
                          </button>

                          {/* Reorder */}
                          <button
                            type="button"
                            onClick={() => moveSlide(idx, -1)}
                            disabled={idx === 0}
                            className="h-8 w-8 border border-white/10 bg-white/5 hover:bg-white/15 disabled:opacity-30 flex items-center justify-center text-slate-300"
                            aria-label="Nach oben"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveSlide(idx, 1)}
                            disabled={idx === snapshot.slides.length - 1}
                            className="h-8 w-8 border border-white/10 bg-white/5 hover:bg-white/15 disabled:opacity-30 flex items-center justify-center text-slate-300"
                            aria-label="Nach unten"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => deleteSlide(slide.id)}
                            className="h-8 w-8 border border-white/10 bg-white/5 hover:bg-rose-500/20 hover:border-rose-400/40 text-slate-400 hover:text-rose-300 flex items-center justify-center"
                            aria-label="Slide löschen"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Text Inputs Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <label className="space-y-1">
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Kicker (kleine Zeile oben)
                          </span>
                          <input
                            type="text"
                            value={slide.eyebrow}
                            onChange={(e) =>
                              updateSlide(slide.id, { eyebrow: e.target.value })
                            }
                            placeholder="z. B. FOLGT UNS AUF INSTAGRAM"
                            className="w-full h-9 px-2.5 bg-black/55 border border-white/12 text-xs font-semibold text-white placeholder:text-slate-600 focus:outline-none focus:border-sky-400"
                          />
                        </label>

                        <label className="space-y-1">
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Hauptzeile / Handle
                          </span>
                          <input
                            type="text"
                            value={slide.headline}
                            onChange={(e) =>
                              updateSlide(slide.id, { headline: e.target.value })
                            }
                            placeholder="z. B. @manacards_de_"
                            className="w-full h-9 px-2.5 bg-black/55 border border-white/12 text-xs font-extrabold text-white placeholder:text-slate-600 focus:outline-none focus:border-sky-400"
                          />
                        </label>

                        <label className="space-y-1 sm:col-span-2">
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Unterzeile (optional)
                          </span>
                          <input
                            type="text"
                            value={slide.subline}
                            onChange={(e) =>
                              updateSlide(slide.id, { subline: e.target.value })
                            }
                            placeholder="z. B. Einzelkarten & Sammlungen übers Formular"
                            className="w-full h-9 px-2.5 bg-black/55 border border-white/12 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-sky-400"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ===============================================================
            PANEL 2: HORIZONTAL TICKER BAR SETTINGS & ITEMS
           =============================================================== */}
        <div
          role="tabpanel"
          aria-labelledby="bars-tab-ticker"
          hidden={subTab !== 'ticker'}
        >
          <div className="space-y-4">
            {/* Ticker Global Controls */}
            <div className="p-4 border border-white/10 bg-zinc-950/75 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-slate-200">
                  <SlidersHorizontal className="w-4 h-4 text-amber-300" />
                  <span>Ticker-Laufband Einstellungen</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateTicker('visible', !snapshot.ticker.visible)}
                    className={`h-8 px-3 border text-[11px] font-bold flex items-center gap-1.5 ${
                      snapshot.ticker.visible
                        ? 'bg-emerald-500/15 border-emerald-400/45 text-emerald-200'
                        : 'bg-rose-500/15 border-rose-400/45 text-rose-200'
                    }`}
                  >
                    {snapshot.ticker.visible ? (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        <span>Sichtbar</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>Ausgeblendet</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => updateTicker('paused', !snapshot.ticker.paused)}
                    className={`h-8 px-3 border text-[11px] font-bold flex items-center gap-1.5 ${
                      snapshot.ticker.paused
                        ? 'bg-amber-400/20 border-amber-400/50 text-amber-200'
                        : 'bg-white/5 border-white/15 text-slate-200 hover:bg-white/10'
                    }`}
                  >
                    {snapshot.ticker.paused ? (
                      <>
                        <Play className="w-3.5 h-3.5" />
                        <span>Abspielen</span>
                      </>
                    ) : (
                      <>
                        <Pause className="w-3.5 h-3.5" />
                        <span>Pause</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Ticker Resize Mode & HiDPI Quality */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 border-t border-white/10">
                <div className="space-y-1.5">
                  <span className="block text-[10.5px] font-bold uppercase tracking-[0.12em] text-slate-400">
                    Größen-Modus
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(
                      [
                        { id: 'together', label: 'Zusammen', sub: 'Hintergrund + Text' },
                        { id: 'background-only', label: 'Nur Hintergrund', sub: 'Text bleibt fix' },
                      ] as { id: OverlayResizeMode; label: string; sub: string }[]
                    ).map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => updateTicker('resizeMode', m.id)}
                        className={`p-2 border text-left transition-colors ${
                          snapshot.ticker.resizeMode === m.id
                            ? 'bg-sky-400/15 border-sky-400/60 text-white'
                            : 'bg-black/40 border-white/10 text-slate-300 hover:border-white/25'
                        }`}
                      >
                        <div className="text-[11px] font-extrabold">{m.label}</div>
                        <div className="text-[10px] text-slate-400">{m.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="block text-[10.5px] font-bold uppercase tracking-[0.12em] text-slate-400">
                    OBS Schärfe / Auflösung
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(
                      [
                        { id: 1, label: '1×', sub: 'Standard' },
                        { id: 1.5, label: '1.5×', sub: 'HD' },
                        { id: 2, label: '2×', sub: 'Retina' },
                      ] as { id: OverlayQualityScale; label: string; sub: string }[]
                    ).map((qOpt) => (
                      <button
                        key={qOpt.id}
                        type="button"
                        onClick={() => updateTicker('qualityScale', qOpt.id)}
                        className={`p-2 border text-center transition-colors ${
                          snapshot.ticker.qualityScale === qOpt.id
                            ? 'bg-emerald-400/15 border-emerald-400/60 text-emerald-200'
                            : 'bg-black/40 border-white/10 text-slate-300 hover:border-white/25'
                        }`}
                      >
                        <div className="text-xs font-black">{qOpt.label}</div>
                        <div className="text-[9.5px] text-slate-400">{qOpt.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Width Slider + Full Width Toggle */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs gap-2">
                    <span className="font-bold text-slate-300">
                      {snapshot.ticker.resizeMode === 'background-only'
                        ? 'Hintergrund-Breite'
                        : 'Breite (unabhängig)'}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateTicker('fullWidth', !snapshot.ticker.fullWidth)}
                        className="px-1.5 py-0.5 text-[10px] font-bold border border-white/15 bg-white/5 hover:bg-white/10 text-slate-200"
                      >
                        {snapshot.ticker.fullWidth ? '100% OBS' : 'Fix px'}
                      </button>
                      <span className="font-black text-sky-300">
                        {snapshot.ticker.fullWidth ? 'Voll' : `${snapshot.ticker.widthPx} px`}
                      </span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={360}
                    max={1400}
                    step={20}
                    disabled={snapshot.ticker.fullWidth}
                    value={snapshot.ticker.widthPx}
                    onChange={(e) => updateTicker('widthPx', Number(e.target.value))}
                    className="w-full cursor-pointer disabled:opacity-40"
                  />
                </div>

                {/* Height Slider */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-300">
                      {snapshot.ticker.resizeMode === 'background-only'
                        ? 'Hintergrund-Höhe'
                        : 'Höhe (unabhängig)'}
                    </span>
                    <span className="font-black text-sky-300">
                      {snapshot.ticker.heightPx} px
                    </span>
                  </div>
                  <input
                    type="range"
                    min={38}
                    max={160}
                    step={2}
                    value={snapshot.ticker.heightPx}
                    onChange={(e) => updateTicker('heightPx', Number(e.target.value))}
                    className="w-full cursor-pointer"
                  />
                </div>

                {/* Text & Icon Scale */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-300">Text- &amp; Logo-Größe</span>
                    <span className="font-black text-amber-300">
                      {snapshot.ticker.contentScale}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={60}
                    max={220}
                    step={5}
                    value={snapshot.ticker.contentScale}
                    onChange={(e) => updateTicker('contentScale', Number(e.target.value))}
                    className="w-full cursor-pointer"
                  />
                </div>

                {/* Continuous Precision Speed Slider (ultra-slow 8 px/s up to fast 220 px/s) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs gap-2">
                    <span className="font-bold text-slate-300">Laufgeschwindigkeit</span>
                    <span className="font-black text-sky-300">
                      {snapshot.ticker.speedPxPerSec} px/s ·{' '}
                      <span className="text-[#FFE406]">
                        {describeTickerSpeed(snapshot.ticker.speedPxPerSec)}
                      </span>
                    </span>
                  </div>
                  <input
                    type="range"
                    min={8}
                    max={220}
                    step={2}
                    value={snapshot.ticker.speedPxPerSec}
                    onChange={(e) => updateTicker('speedPxPerSec', Number(e.target.value))}
                    className="w-full cursor-pointer"
                  />
                  <div className="flex flex-wrap gap-1">
                    {[
                      { v: 14, label: 'Ultra-Langsam' },
                      { v: 26, label: 'Sehr langsam' },
                      { v: 44, label: 'Langsam' },
                      { v: 62, label: 'Normal' },
                      { v: 110, label: 'Schnell' },
                    ].map((sp) => (
                      <button
                        key={sp.v}
                        type="button"
                        onClick={() => {
                          sound.playClick(620);
                          updateTicker('speedPxPerSec', sp.v);
                        }}
                        className={`px-2 py-0.5 border text-[10px] font-bold transition-colors ${
                          Math.abs(snapshot.ticker.speedPxPerSec - sp.v) <= 3
                            ? 'bg-sky-400/20 border-sky-400/60 text-sky-200'
                            : 'bg-black/45 border-white/10 text-slate-400 hover:text-white'
                        }`}
                      >
                        {sp.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Auto Show / Hide Interval Cycle + Entrance Animation */}
              <div className="p-3 border border-sky-400/25 bg-sky-500/[0.05] space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="block text-xs font-extrabold text-white">
                      Automatisches Ein- &amp; Ausblenden + Animation
                    </span>
                    <span className="block text-[11px] text-slate-400 mt-0.5">
                      Zeigt den Ticker für X Sekunden an, blendet ihn sauber aus und startet nach der Pause erneut.
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={triggerTickerNow}
                    className="h-8 px-3 bg-[#FFE406] hover:bg-[#f5dc00] text-[#1a1718] font-black text-[11px] uppercase tracking-[0.08em] flex items-center gap-1.5 shrink-0"
                  >
                    <Zap className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Animation testen</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-300">Sichtbar für</span>
                      <span className="font-black text-[#FFE406]">
                        {snapshot.ticker.visibleDurationSec === 0
                          ? 'Dauerhaft an'
                          : `${snapshot.ticker.visibleDurationSec} Sek.`}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={300}
                      step={5}
                      value={snapshot.ticker.visibleDurationSec}
                      onChange={(e) =>
                        updateTicker('visibleDurationSec', Number(e.target.value))
                      }
                      className="w-full cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-300">Pause / Ausgeblendet für</span>
                      <span className="font-black text-sky-300">
                        {snapshot.ticker.visibleDurationSec === 0
                          ? 'Inaktiv'
                          : `${snapshot.ticker.hiddenDurationSec} Sek.`}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={5}
                      max={600}
                      step={5}
                      disabled={snapshot.ticker.visibleDurationSec === 0}
                      value={Math.max(5, snapshot.ticker.hiddenDurationSec)}
                      onChange={(e) =>
                        updateTicker('hiddenDurationSec', Number(e.target.value))
                      }
                      className="w-full cursor-pointer disabled:opacity-35"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {[
                    { show: 0, hide: 20, label: 'Dauerhaft sichtbar' },
                    { show: 20, hide: 20, label: '20s an · 20s aus' },
                    { show: 30, hide: 45, label: '30s an · 45s aus' },
                    { show: 45, hide: 90, label: '45s an · 90s aus' },
                    { show: 60, hide: 120, label: '1 Min an · 2 Min aus' },
                  ].map((preset) => {
                    const active =
                      snapshot.ticker.visibleDurationSec === preset.show &&
                      (preset.show === 0 || snapshot.ticker.hiddenDurationSec === preset.hide);
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          sound.playClick(640);
                          commitUpdate((cur) => ({
                            ticker: {
                              ...cur.ticker,
                              visible: true,
                              visibleDurationSec: preset.show,
                              hiddenDurationSec: preset.hide,
                              triggerNonce: Date.now(),
                            },
                          }));
                        }}
                        className={`px-2.5 py-1 border text-[11px] font-bold transition-colors ${
                          active
                            ? 'bg-[#FFE406]/20 border-[#FFE406]/65 text-[#FFE406]'
                            : 'bg-black/45 border-white/10 text-slate-300 hover:border-white/25'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>

                {/* Entrance Animation Picker */}
                <div className="space-y-1.5 pt-1 border-t border-white/10">
                  <span className="block text-[10.5px] font-bold uppercase tracking-[0.12em] text-slate-400">
                    Ein- &amp; Ausblend-Animation
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {TICKER_ENTRANCE_OPTIONS.map((anim) => {
                      const active = snapshot.ticker.entranceAnimation === anim.id;
                      return (
                        <button
                          key={anim.id}
                          type="button"
                          onClick={() => {
                            sound.playClick(660);
                            commitUpdate((cur) => ({
                              ticker: {
                                ...cur.ticker,
                                visible: true,
                                entranceAnimation: anim.id,
                                triggerNonce: Date.now(),
                              },
                            }));
                          }}
                          className={`p-2 border text-left transition-colors ${
                            active
                              ? 'bg-sky-400/15 border-sky-400/65 text-white'
                              : 'bg-black/45 border-white/10 text-slate-300 hover:border-white/25'
                          }`}
                        >
                          <div className="text-[11px] font-extrabold">{anim.label}</div>
                          <div className="text-[9.5px] text-slate-400 mt-0.5">{anim.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Background Opacity & Pattern Selector (independent opacity sliders!) */}
              <BarSurfaceControls
                bgOpacityPct={snapshot.ticker.bgOpacityPct ?? 96}
                bgPattern={snapshot.ticker.bgPattern ?? 'logos'}
                patternOpacityPct={snapshot.ticker.patternOpacityPct ?? 60}
                onChangeBgOpacity={(v) => updateTicker('bgOpacityPct', v)}
                onChangePattern={(v) => updateTicker('bgPattern', v)}
                onChangePatternOpacity={(v) => updateTicker('patternOpacityPct', v)}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="space-y-1">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Linker Brand-Anker Text
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={snapshot.ticker.brandAnchorText}
                      onChange={(e) =>
                        updateTicker('brandAnchorText', e.target.value)
                      }
                      className="flex-1 h-9 px-2.5 bg-black/55 border border-white/15 text-xs font-extrabold uppercase text-white focus:outline-none focus:border-sky-400"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        updateTicker('showBrandAnchor', !snapshot.ticker.showBrandAnchor)
                      }
                      className={`h-9 px-3 border text-xs font-bold ${
                        snapshot.ticker.showBrandAnchor
                          ? 'bg-emerald-500/15 border-emerald-400/45 text-emerald-200'
                          : 'bg-white/5 border-white/15 text-slate-400'
                      }`}
                    >
                      {snapshot.ticker.showBrandAnchor ? 'An' : 'Aus'}
                    </button>
                  </div>
                </label>

                {snapshot.design === 'mana-wood' && (
                <div className="grid grid-cols-3 gap-1.5 items-end">
                  <button
                    type="button"
                    onClick={() =>
                      updateTicker(
                        'veinColorMode',
                        snapshot.ticker.veinColorMode === 'mana-blue' ? 'platform' : 'mana-blue'
                      )
                    }
                    className="h-9 px-2 border border-white/15 bg-black/45 hover:bg-white/10 text-[10.5px] font-bold text-sky-300 truncate"
                  >
                    {snapshot.ticker.veinColorMode === 'mana-blue'
                      ? 'Icons: Mana'
                      : 'Icons: Bunt'}
                  </button>
                  <>
                      <button
                        type="button"
                        onClick={() =>
                          updateTicker(
                            'edgeStyle',
                            snapshot.ticker.edgeStyle === 'sharp' ? 'angled' : 'sharp'
                          )
                        }
                        className="h-9 px-2 border border-white/15 bg-black/45 hover:bg-white/10 text-[10.5px] font-bold text-white truncate"
                      >
                        {snapshot.ticker.edgeStyle === 'sharp' ? 'Glatt gesägt' : 'Rau gebrochen'}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateTicker('showWoodVeins', !snapshot.ticker.showWoodVeins)
                        }
                        className="h-9 px-2 border border-white/15 bg-black/45 hover:bg-white/10 text-[10.5px] font-bold text-emerald-300 truncate"
                      >
                        {snapshot.ticker.showWoodVeins ? 'Adern: An' : 'Adern: Aus'}
                      </button>
                    </>
                </div>
                )}
              </div>
            </div>

            {/* Ticker Items Header + Add */}
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-black uppercase tracking-[0.16em] text-slate-300">
                Ticker-Einträge ({snapshot.tickerItems.length})
              </h3>
              <button
                type="button"
                onClick={addTickerItem}
                className="h-8 px-3 bg-amber-400 hover:bg-amber-300 text-black text-xs font-black uppercase tracking-[0.1em] flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>Eintrag hinzufügen</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {snapshot.tickerItems.map((item, idx) => {
                const theme = PLATFORM_THEMES[item.platform] ?? PLATFORM_THEMES.custom;
                return (
                  <div
                    key={item.id}
                    className={`relative border p-3 pl-4 space-y-2.5 ${
                      item.enabled
                        ? 'border-white/12 bg-zinc-950/80'
                        : 'border-white/5 bg-zinc-950/40 opacity-55'
                    }`}
                  >
                    <div
                      className="absolute left-0 top-0 bottom-0 w-1"
                      style={{ backgroundColor: theme.accentHex }}
                    />
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <PlatformBadge
                          platform={item.platform}
                          size={30}
                          radius={8}
                        />
                        <select
                          aria-label="Ticker Plattform"
                          value={item.platform}
                          onChange={(e) =>
                            updateTickerItem(item.id, {
                              platform: e.target.value as SocialPlatform,
                            })
                          }
                          className="h-8 px-2 bg-black/60 border border-white/15 text-xs font-bold text-white"
                        >
                          {PLATFORM_OPTIONS.map((opt) => (
                            <option key={opt.id} value={opt.id}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            updateTickerItem(item.id, { enabled: !item.enabled })
                          }
                          className={`h-8 px-2.5 border text-[11px] font-bold ${
                            item.enabled
                              ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-200'
                              : 'bg-white/5 border-white/10 text-slate-400'
                          }`}
                        >
                          {item.enabled ? 'Aktiv' : 'Aus'}
                        </button>
                        <button
                          type="button"
                          onClick={() => moveTickerItem(idx, -1)}
                          disabled={idx === 0}
                          className="h-8 w-8 border border-white/10 bg-white/5 hover:bg-white/15 disabled:opacity-30 flex items-center justify-center text-slate-300"
                          aria-label="Nach oben"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveTickerItem(idx, 1)}
                          disabled={idx === snapshot.tickerItems.length - 1}
                          className="h-8 w-8 border border-white/10 bg-white/5 hover:bg-white/15 disabled:opacity-30 flex items-center justify-center text-slate-300"
                          aria-label="Nach unten"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteTickerItem(item.id)}
                          className="h-8 w-8 border border-white/10 bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 flex items-center justify-center"
                          aria-label="Eintrag löschen"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={item.label}
                        onChange={(e) =>
                          updateTickerItem(item.id, { label: e.target.value })
                        }
                        placeholder="Label (z. B. KARTENANKAUF)"
                        className="h-9 px-2.5 bg-black/55 border border-white/12 text-xs font-extrabold uppercase text-sky-200 focus:outline-none focus:border-sky-400"
                      />
                      <input
                        type="text"
                        value={item.highlight}
                        onChange={(e) =>
                          updateTickerItem(item.id, { highlight: e.target.value })
                        }
                        placeholder="Laufband-Text"
                        className="sm:col-span-2 h-9 px-2.5 bg-black/55 border border-white/12 text-xs font-semibold text-white focus:outline-none focus:border-sky-400"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ===============================================================
            PANEL 3: KGA / PRODUCT & SINGLE-CARD SHOWCASE
           =============================================================== */}
        <div
          role="tabpanel"
          aria-labelledby="bars-tab-showcase"
          hidden={subTab !== 'showcase'}
        >
          <ShowcaseEditorPanel
            settings={snapshot.showcase}
            presets={snapshot.showcases}
            onUpdateSettings={updateShowcaseSettings}
            onTriggerShow={triggerShowShowcase}
            onHide={hideShowcase}
            onUpdatePreset={updateShowcasePreset}
            onAddPreset={addShowcasePreset}
            onDeletePreset={deleteShowcasePreset}
          />
        </div>

        {/* ===============================================================
            PANEL 4: WHATNOT HUD HIGHLIGHTS (SHOP / GIVEAWAY / AVATAR)
           =============================================================== */}
        <div
          role="tabpanel"
          aria-labelledby="bars-tab-hud"
          hidden={subTab !== 'hud'}
        >
          <WhatnotHudEditorPanel
            settings={displayedHud}
            selectedKey={selectedHudWidget}
            onSelectWidget={setSelectedHudWidget}
            hudBaseUrl={obsUrls.hud}
            hasUnsavedDraft={hudDraft !== null}
            autoApplyLive={hudAutoApplyLive}
            onToggleAutoApply={() => {
              sound.playClick(640);
              setHudAutoApplyLive((v) => {
                const next = !v;
                if (next && hudDraft) {
                  const toCommit = hudDraft;
                  setHudDraft(null);
                  commitUpdate(() => ({ hud: toCommit }));
                }
                return next;
              });
            }}
            onConfirmDraft={confirmHudDraft}
            onDiscardDraft={discardHudDraft}
            onUpdateSettings={updateHudSettings}
            onUpdateWidget={updateHudWidget}
            onResetWidget={resetHudWidget}
            onCopyUrl={(id, url) => void handleCopyUrl(id, url)}
            copiedKey={copiedKey}
          />
        </div>
      </section>

      {/* ===================================================================
          RIGHT: LIVE OBS MONITOR & 9:16 PORTRAIT SAFE-ZONE PREVIEW
         =================================================================== */}
      <aside className="w-full xl:w-[490px] shrink-0 border-t xl:border-t-0 xl:border-l border-white/10 bg-stone-950/70 backdrop-blur-xl p-4 sm:p-5 flex flex-col gap-4 overflow-y-auto studio-scroll">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-xs font-black uppercase tracking-[0.16em] text-white">
              Live OBS Monitor
            </h2>
            <p className="text-[11px] text-slate-400">
              Echtzeit-Vorschau · 100 % transparent in OBS
            </p>
          </div>

          <div className="flex items-center gap-1 border border-white/15 bg-black/50 p-0.5 text-[11px] font-bold">
            {(
              [
                { id: 'checker', label: 'Alpha', icon: Monitor },
                { id: 'dark', label: 'Dunkel', icon: Monitor },
                { id: 'portrait', label: '9:16', icon: Smartphone },
              ] as const
            ).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setPreviewMode(m.id)}
                className={`px-2.5 py-1 flex items-center gap-1 transition-colors ${
                  previewMode === m.id
                    ? 'bg-sky-400 text-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Active Pin Alert Banner */}
        {pinnedSlide && (
          <div className="p-2.5 border border-amber-400/50 bg-amber-400/10 flex items-center justify-between gap-2 text-xs">
            <div className="min-w-0">
              <span className="font-black text-amber-300 uppercase tracking-wider text-[10px] block">
                Slide im Stream gepinnt
              </span>
              <span className="font-bold text-white truncate block">
                {pinnedSlide.eyebrow} · {pinnedSlide.headline}
              </span>
            </div>
            <button
              type="button"
              onClick={() => updateRotator('pinnedSlideId', null)}
              className="shrink-0 px-2.5 py-1 bg-amber-400 text-black font-black text-[11px] uppercase"
            >
              Lösen
            </button>
          </div>
        )}

        {/* Preview Stage */}
        {subTab === 'hud' ? (
          (() => {
            const stage = STANDALONE_HUD_STAGES[selectedHudWidget];
            const previewW = 438;
            const hudScale = Math.min(1, previewW / stage.width);
            const previewH = Math.round(stage.height * hudScale);
            const labelMap: Record<HudWidgetKey, string> = {
              shop: 'Shop-Button (?only=shop)',
              giveaway: 'Giveaway-Box (?only=giveaway)',
              avatar: 'Avatar / Logo (?only=avatar)',
            };
            return (
              <div className="space-y-3">
                {/* Quick Widget Switcher directly on Monitor */}
                <div className="grid grid-cols-3 gap-1 border border-white/15 bg-black/55 p-1 text-[10.5px] font-extrabold">
                  {(
                    [
                      { key: 'shop', label: 'Shop' },
                      { key: 'giveaway', label: 'Giveaway' },
                      { key: 'avatar', label: 'Avatar / Logo' },
                    ] as { key: HudWidgetKey; label: string }[]
                  ).map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => {
                        sound.playClick(640);
                        setSelectedHudWidget(item.key);
                      }}
                      className={`py-1.5 transition-colors ${
                        selectedHudWidget === item.key
                          ? 'bg-sky-400 text-black'
                          : 'text-slate-300 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                  <span>{labelMap[selectedHudWidget]}</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setHudShowGhostUi((v) => !v)}
                      className={`px-2 py-0.5 border text-[9.5px] font-bold ${
                        hudShowGhostUi
                          ? 'bg-sky-400/20 border-sky-400/60 text-sky-200'
                          : 'bg-black/50 border-white/15 text-slate-400'
                      }`}
                    >
                      Dummy-Icon: {hudShowGhostUi ? 'An' : 'Aus'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setHudForceCallouts((v) => !v)}
                      className={`px-2 py-0.5 border text-[9.5px] font-bold ${
                        hudForceCallouts
                          ? 'bg-[#FFE406]/20 border-[#FFE406]/60 text-[#FFE406]'
                          : 'bg-black/50 border-white/15 text-slate-400'
                      }`}
                    >
                      Pfeil: {hudForceCallouts ? 'Immer an' : 'Intervall'}
                    </button>
                  </div>
                </div>

                {/* High-Res Interactive Standalone Preview Stage (Drag Text Pill Directly!) */}
                <div
                  className={`mx-auto relative border border-white/20 shadow-2xl overflow-hidden flex items-center justify-center ${
                    previewMode === 'checker'
                      ? 'obs-checkerboard'
                      : 'bg-gradient-to-b from-[#0f1320] via-[#151520] to-[#08090e]'
                  }`}
                  style={{ width: previewW, height: previewH }}
                >
                  <StandaloneHudWidget
                    widgetKey={selectedHudWidget}
                    config={displayedHud[selectedHudWidget]}
                    masterVisible={displayedHud.visible}
                    scale={hudScale}
                    forceCalloutVisible={hudForceCallouts}
                    showGhostTarget={hudShowGhostUi}
                    interactive={true}
                    onDragCallout={(nextOx, nextOy) =>
                      updateHudWidget(selectedHudWidget, {
                        calloutOffsetX: nextOx,
                        calloutOffsetY: nextOy,
                      })
                    }
                  />

                  <div className="pointer-events-none absolute bottom-2 inset-x-2 flex justify-center">
                    <span className="px-2.5 py-1 bg-black/75 border border-white/15 text-[10px] font-bold text-slate-200">
                      Text-Box mit Maus greifen &amp; schieben · OBS: {stage.width} × {stage.height} px
                    </span>
                  </div>
                </div>

                {/* Confirm / Discard Bar right underneath the Interactive Preview */}
                {hudDraft !== null ? (
                  <div className="p-2.5 border border-[#FFE406]/70 bg-[#FFE406]/12 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-black text-[#FFE406]">
                      Entwurf bereit zum Senden
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={discardHudDraft}
                        className="h-8 px-2.5 border border-white/20 bg-black/60 text-[11px] font-bold text-slate-200 hover:bg-white/10"
                      >
                        Verwerfen
                      </button>
                      <button
                        type="button"
                        onClick={confirmHudDraft}
                        className="h-8 px-3 bg-[#FFE406] hover:bg-[#f5dc00] text-[#1a1718] text-[11px] font-black uppercase tracking-[0.08em] flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Bestätigen</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-[10.5px] font-semibold text-emerald-300/90">
                    Synchron mit OBS Live-Overlay
                  </div>
                )}
              </div>
            );
          })()
        ) : previewMode === 'portrait' ? (
          <div className="mx-auto w-[300px] aspect-[9/16] relative border border-white/20 bg-gradient-to-b from-[#11121a] via-[#171320] to-[#0a0a0f] overflow-hidden flex flex-col justify-between shadow-2xl">
            {/* Simulated Top Whatnot Header Safe Zone */}
            <div className="px-3 py-2.5 flex items-center justify-between bg-black/45 border-b border-white/10 text-[10px] font-bold text-slate-400">
              <span>manacards_de · LIVE</span>
              <span className="px-1.5 py-0.5 bg-rose-500/80 text-white text-[9px] font-black">
                9:16
              </span>
            </div>

            {/* Simulated Card Playmat Center + Positioned Horizontal Rotator + Optional Showcase */}
            <div className="flex-1 flex flex-col items-center justify-between py-3 px-2 gap-2">
              <div className="w-full flex justify-center">
                <BroadcastRotator
                  design={snapshot.design}
                  slides={snapshot.slides}
                  settings={snapshot.rotator}
                  scale={previewScale}
                  onCycleStatus={setRotatorStatus}
                />
              </div>

              {subTab === 'showcase' || snapshot.showcase.visible ? (
                <div className="w-full flex justify-center">
                  <PromoShowcaseOverlay
                    preset={activeShowcasePreset}
                    settings={snapshot.showcase}
                    scale={showcasePreviewScale}
                    forcePreviewVisible={subTab === 'showcase' && showcasePreviewAlwaysOn}
                  />
                </div>
              ) : (
                <div className="text-center px-4 py-6 border border-dashed border-white/10 text-[10px] uppercase tracking-[0.2em] text-slate-500">
                  Kamera / Spielmatte
                </div>
              )}

              {/* Horizontal Ticker positioned cleanly above Whatnot chat zone */}
              <div className="w-full flex justify-center">
                <BroadcastTicker
                  design={snapshot.design}
                  items={snapshot.tickerItems}
                  settings={snapshot.ticker}
                  scale={tickerPreviewScale}
                  forcePreviewVisible={tickerPreviewAlwaysOn}
                  onCycleStatus={setTickerStatus}
                />
              </div>
            </div>

            {/* Simulated Bottom Whatnot Chat Safe Zone */}
            <div className="h-[24%] bg-black/65 border-t border-white/10 p-3 flex flex-col justify-end gap-1 text-[10px] text-slate-500">
              <div className="uppercase tracking-widest text-[9px] text-slate-400 font-bold">
                Whatnot / TikTok Chat Safe-Zone
              </div>
              <div className="h-2 w-2/3 bg-white/10" />
              <div className="h-2 w-1/2 bg-white/10" />
            </div>
          </div>
        ) : (
          <div
            className={`relative border border-white/15 p-5 space-y-6 overflow-hidden ${
              previewMode === 'checker' ? 'obs-checkerboard' : 'bg-[#08090e]'
            }`}
          >
            {/* Showcase Preview (prominent when on Showcase tab or live) */}
            {(subTab === 'showcase' || snapshot.showcase.visible) && (
              <div className="space-y-2 pb-4 border-b border-white/10">
                <div className="flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                  <span>KGA / Showcase (/overlay/showcase)</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowcasePreviewAlwaysOn((v) => !v)}
                      className="px-1.5 py-0.5 border border-white/15 bg-black/50 text-[9.5px] font-bold text-slate-200"
                    >
                      {showcasePreviewAlwaysOn ? 'Vorschau: Immer an' : 'Vorschau: Echtzeit'}
                    </button>
                    <span className={snapshot.showcase.visible ? 'text-[#FFE406]' : 'text-slate-500'}>
                      {snapshot.showcase.visible ? 'LIVE' : 'Standby'}
                    </span>
                  </div>
                </div>
                <div className="min-h-[210px] flex items-center justify-center overflow-hidden">
                  <PromoShowcaseOverlay
                    preset={activeShowcasePreset}
                    settings={snapshot.showcase}
                    scale={showcasePreviewScale}
                    forcePreviewVisible={showcasePreviewAlwaysOn}
                  />
                </div>
              </div>
            )}

            {/* Rotator Preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                <span>1 · Social Rotator (/overlay/rotator)</span>
                <div className="flex items-center gap-2">
                  {rotatorStatus.isResting && (
                    <button
                      type="button"
                      onClick={triggerRotatorCycleNow}
                      className="px-1.5 py-0.5 bg-[#FFE406] text-black text-[9.5px] font-black"
                    >
                      Jetzt zeigen
                    </button>
                  )}
                  <span className={rotatorStatus.isResting ? 'text-amber-300' : 'text-sky-300'}>
                    {snapshot.rotator.paused
                      ? 'Pausiert'
                      : pinnedSlide
                      ? 'Gepinnt'
                      : rotatorStatus.isResting
                      ? `Ruhepause (${rotatorStatus.restRemainingSec}s)`
                      : snapshot.rotator.restDurationSec > 0
                      ? `Slide ${rotatorStatus.slideIndex + 1}/${Math.max(1, rotatorStatus.totalEnabled)} · danach ${snapshot.rotator.restDurationSec}s Pause`
                      : `${snapshot.rotator.intervalSec}s Takt`}
                  </span>
                </div>
              </div>
              <div className="relative min-h-[104px] py-2 flex items-center justify-center overflow-visible">
                {snapshot.rotator.visible ? (
                  <>
                    <BroadcastRotator
                      design={snapshot.design}
                      slides={snapshot.slides}
                      settings={snapshot.rotator}
                      scale={previewScale}
                      onCycleStatus={setRotatorStatus}
                    />
                    {rotatorStatus.isResting && (
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-center px-3">
                        <span className="text-xs font-bold text-slate-300 bg-black/70 border border-white/10 px-3 py-1.5">
                          Im Stream unsichtbar · nächster Durchlauf in{' '}
                          <strong className="text-[#FFE406]">
                            {rotatorStatus.restRemainingSec}s
                          </strong>
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <span className="text-xs font-bold text-slate-500">
                    Rotator im Stream ausgeblendet
                  </span>
                )}
              </div>
            </div>

            {/* Ticker Preview */}
            <div className="space-y-2 pt-3 border-t border-white/10">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                <span>2 · Horizontal Ticker (/overlay/ticker)</span>
                <div className="flex items-center gap-1.5">
                  {tickerStatus.cycleActive && (
                    <button
                      type="button"
                      onClick={() => setTickerPreviewAlwaysOn((v) => !v)}
                      className="px-1.5 py-0.5 border border-white/15 bg-black/50 text-[9.5px] font-bold text-slate-200"
                    >
                      {tickerPreviewAlwaysOn ? 'Vorschau: Immer an' : 'Vorschau: Zyklus'}
                    </button>
                  )}
                  {tickerStatus.isResting && (
                    <button
                      type="button"
                      onClick={triggerTickerNow}
                      className="px-1.5 py-0.5 bg-[#FFE406] text-black text-[9.5px] font-black"
                    >
                      Jetzt zeigen
                    </button>
                  )}
                  <span className="text-amber-300">
                    {snapshot.ticker.paused
                      ? 'Pausiert'
                      : tickerStatus.isResting
                      ? `Pause (${tickerStatus.remainingSec}s)`
                      : tickerStatus.cycleActive && !tickerPreviewAlwaysOn
                      ? `${snapshot.ticker.speedPxPerSec} px/s · noch ${tickerStatus.remainingSec}s`
                      : `${snapshot.ticker.speedPxPerSec} px/s`}
                  </span>
                </div>
              </div>
              <div className="relative min-h-[72px] py-3 flex items-center justify-center overflow-visible">
                {snapshot.ticker.visible ? (
                  <>
                    <BroadcastTicker
                      design={snapshot.design}
                      items={snapshot.tickerItems}
                      settings={snapshot.ticker}
                      scale={tickerPreviewScale}
                      forcePreviewVisible={tickerPreviewAlwaysOn}
                      onCycleStatus={setTickerStatus}
                    />
                    {tickerStatus.isResting && !tickerPreviewAlwaysOn && (
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-center px-3">
                        <span className="text-xs font-bold text-slate-300 bg-black/70 border border-white/10 px-3 py-1.5">
                          Ticker im Stream ausgeblendet · kommt wieder in{' '}
                          <strong className="text-[#FFE406]">
                            {tickerStatus.remainingSec}s
                          </strong>
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <span className="text-xs font-bold text-slate-500">
                    Ticker im Stream ausgeblendet
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Quick OBS Setup Tips for Portrait Streams */}
        <div className="p-3.5 border border-white/10 bg-black/45 space-y-1.5 text-[11px] text-slate-300 leading-relaxed">
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-sky-300">
            OBS Schärfe- &amp; 60-FPS-Tipp (kein Stocken &amp; kein Verpixeln)
          </div>
          <p>
            1. <strong>Gegen Stocken beim Ticker in OBS:</strong> Aktiviere in den Eigenschaften der
            Browser-Quelle <strong>„Benutzerdefinierte Bildrate verwenden“</strong> und stelle sie auf{' '}
            <strong className="text-[#FFE406]">60 FPS</strong> (OBS nutzt standardmäßig nur 30 FPS!).
            Prüfe außerdem unter <em>OBS → Einstellungen → Erweitert</em>, dass die{' '}
            <strong>Hardwarebeschleunigung für Browserquellen</strong> aktiv ist.
          </p>
          <p>
            2. Trage die oben berechnete <strong>2× Retina-Auflösung</strong> ein:
            Rotator <code className="text-sky-200">{obsRotatorW} × {obsRotatorH}</code>, Ticker{' '}
            <code className="text-amber-200">{obsTickerW} × {obsTickerH}</code> — und skaliere in OBS nur herunter.
          </p>
          <p>
            3. Über <strong>Hintergrund-Deckkraft (0 %)</strong> &amp; <strong>Muster-Sichtbarkeit</strong> kannst du
            Text, Hintergrund und Muster (Wellen, Punkte, Carbon, Hexagon …) völlig unabhängig kombinieren.
          </p>
        </div>
      </aside>
    </div>
  );
};
