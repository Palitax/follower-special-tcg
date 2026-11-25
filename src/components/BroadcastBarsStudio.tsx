'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BroadcastBarsSnapshot,
  RotatorAnimationPreset,
  RotatorBarSettings,
  RotatorSlide,
  SocialPlatform,
  TickerBarSettings,
  TickerItem,
  TickerSpeed,
  createDefaultBroadcastBarsSnapshot,
  normalizeBroadcastBarsSnapshot,
} from '../types/broadcastBars';
import {
  BARS_STORAGE_KEY,
  BroadcastBarsSyncController,
} from '../lib/barsLiveSync';
import { SocialRotatorBar } from './SocialRotatorBar';
import { LiveTickerBar } from './LiveTickerBar';
import { PLATFORM_THEMES, SocialBrandIcon } from './SocialBrandIcons';
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
} from 'lucide-react';

interface BroadcastBarsStudioProps {
  overlayKey: string;
  originUrl: string;
}

type EditorSubTab = 'rotator' | 'ticker';
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

const ANIMATION_PRESETS: { id: RotatorAnimationPreset; label: string; desc: string }[] = [
  { id: 'unfold', label: 'Verzauberter Nebel', desc: 'Schrift schwebt aus arkanem Dunst' },
  { id: 'wipe', label: 'Runen-Rolle', desc: 'Zeilen rollen wie eine Holztrommel' },
  { id: 'mana-surge', label: 'Mana-Ausbruch', desc: 'Lettern entzünden sich im Mana-Blitz' },
];

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

  const snapshotRef = useRef<BroadcastBarsSnapshot>(snapshot);
  const controllerRef = useRef<BroadcastBarsSyncController | null>(null);

  useEffect(() => {
    let cancelled = false;

    try {
      const raw = localStorage.getItem(BARS_STORAGE_KEY);
      if (raw) {
        const parsed = normalizeBroadcastBarsSnapshot(JSON.parse(raw), 'studio_local');
        snapshotRef.current = parsed;
        setSnapshot(parsed);
      }
    } catch {
      // ignore
    }

    const controller = new BroadcastBarsSyncController({
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

    return () => {
      cancelled = true;
      controller.stop();
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
          badgeText: 'INFO',
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

  // Preview scale so wide rotators fit comfortably inside the right-hand monitor
  const previewScale = useMemo(() => {
    const targetBoxWidth = previewMode === 'portrait' ? 270 : 420;
    return Math.min(1, targetBoxWidth / Math.max(380, snapshot.rotator.widthPx));
  }, [previewMode, snapshot.rotator.widthPx]);

  return (
    <div className="relative z-20 flex-1 min-h-0 flex flex-col xl:flex-row overflow-hidden">
      {/* ===================================================================
          LEFT: OBS URLS + ROTATOR / TICKER EDITOR
         =================================================================== */}
      <section className="flex-1 min-w-0 min-h-0 overflow-y-auto studio-scroll p-4 sm:p-6 space-y-5">
        {/* OBS Browser-Source Quick Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            {
              id: 'rotator',
              title: 'Social Rotator',
              sizeHint: 'OBS: 800 × 140 px',
              url: obsUrls.rotator,
              accent: 'border-sky-400/35 bg-sky-500/[0.06]',
            },
            {
              id: 'ticker',
              title: 'Horizontal Ticker',
              sizeHint: 'OBS: 1080 × 76 px',
              url: obsUrls.ticker,
              accent: 'border-amber-400/35 bg-amber-500/[0.06]',
            },
            {
              id: 'combined',
              title: 'Kombi-Dock (Beide)',
              sizeHint: 'OBS: 960 × 210 px',
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Interval Slider */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-300">Wechsel-Takt</span>
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

                {/* Width Slider */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-300">Breite in OBS</span>
                    <span className="font-black text-sky-300">
                      {snapshot.rotator.widthPx} px
                    </span>
                  </div>
                  <input
                    type="range"
                    min={400}
                    max={980}
                    step={20}
                    value={snapshot.rotator.widthPx}
                    onChange={(e) => updateRotator('widthPx', Number(e.target.value))}
                    className="w-full cursor-pointer"
                  />
                </div>
              </div>

              {/* Animation Preset Picker */}
              <div className="space-y-1.5">
                <span className="block text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  Animations-Stil
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {ANIMATION_PRESETS.map((p) => {
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

              {/* Style Toggles Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-bold">
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

                <button
                  type="button"
                  onClick={() =>
                    updateRotator('showProgressBar', !snapshot.rotator.showProgressBar)
                  }
                  className="py-2 px-2.5 border border-white/15 bg-black/45 hover:bg-white/10 text-left"
                >
                  <div className="text-[9.5px] uppercase tracking-wider text-slate-400">
                    Mana-Kanal (Timer)
                  </div>
                  <div className={snapshot.rotator.showProgressBar ? 'text-emerald-300 mt-0.5' : 'text-slate-400 mt-0.5'}>
                    {snapshot.rotator.showProgressBar ? 'Sichtbar' : 'Aus'}
                  </div>
                </button>
              </div>
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
                          <div
                            className="w-8 h-8 flex items-center justify-center bg-black/60 border border-white/15 shrink-0"
                            style={{ color: theme.accentHex }}
                          >
                            <SocialBrandIcon platform={slide.platform} className="w-4 h-4" />
                          </div>

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

                        <label className="space-y-1">
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

                        <label className="space-y-1">
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            CTA-Tag rechts (optional)
                          </span>
                          <input
                            type="text"
                            value={slide.badgeText}
                            onChange={(e) =>
                              updateSlide(slide.id, { badgeText: e.target.value })
                            }
                            placeholder="z. B. ANKAUF / FOLLOW / JOIN"
                            className="w-full h-9 px-2.5 bg-black/55 border border-white/12 text-xs font-bold uppercase text-white placeholder:text-slate-600 focus:outline-none focus:border-sky-400"
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Speed Picker */}
                <div className="space-y-1.5">
                  <span className="block text-[11px] font-bold text-slate-300">
                    Laufgeschwindigkeit
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(
                      [
                        { id: 'slow', label: 'Langsam' },
                        { id: 'normal', label: 'Normal' },
                        { id: 'fast', label: 'Schnell' },
                      ] as { id: TickerSpeed; label: string }[]
                    ).map((sp) => (
                      <button
                        key={sp.id}
                        type="button"
                        onClick={() => updateTicker('speed', sp.id)}
                        className={`h-9 border text-xs font-bold transition-colors ${
                          snapshot.ticker.speed === sp.id
                            ? 'bg-sky-400/20 border-sky-400/60 text-sky-200'
                            : 'bg-black/45 border-white/10 text-slate-400 hover:text-white'
                        }`}
                      >
                        {sp.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Height Slider */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-300">Höhe der Ticker-Leiste</span>
                    <span className="font-black text-sky-300">
                      {snapshot.ticker.heightPx} px
                    </span>
                  </div>
                  <input
                    type="range"
                    min={38}
                    max={68}
                    step={2}
                    value={snapshot.ticker.heightPx}
                    onChange={(e) => updateTicker('heightPx', Number(e.target.value))}
                    className="w-full cursor-pointer"
                  />
                </div>
              </div>

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
                </div>
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
                      <div className="flex items-center gap-2">
                        <span style={{ color: theme.accentHex }}>
                          <SocialBrandIcon platform={item.platform} className="w-4 h-4" />
                        </span>
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
        {previewMode === 'portrait' ? (
          <div className="mx-auto w-[300px] aspect-[9/16] relative border border-white/20 bg-gradient-to-b from-[#11121a] via-[#171320] to-[#0a0a0f] overflow-hidden flex flex-col justify-between shadow-2xl">
            {/* Simulated Top Whatnot Header Safe Zone */}
            <div className="px-3 py-2.5 flex items-center justify-between bg-black/45 border-b border-white/10 text-[10px] font-bold text-slate-400">
              <span>manacards_de · LIVE</span>
              <span className="px-1.5 py-0.5 bg-rose-500/80 text-white text-[9px] font-black">
                9:16
              </span>
            </div>

            {/* Simulated Card Playmat Center + Positioned Horizontal Rotator */}
            <div className="flex-1 flex flex-col items-center justify-between py-4 px-2">
              <div className="w-full flex justify-center">
                <SocialRotatorBar
                  slides={snapshot.slides}
                  settings={snapshot.rotator}
                  scale={previewScale}
                />
              </div>

              <div className="text-center px-4 py-6 border border-dashed border-white/10 text-[10px] uppercase tracking-[0.2em] text-slate-500">
                Kamera / Spielmatte
              </div>

              {/* Horizontal Ticker positioned cleanly above Whatnot chat zone */}
              <div className="w-full">
                <LiveTickerBar items={snapshot.tickerItems} settings={snapshot.ticker} />
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
            {/* Rotator Preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                <span>1 · Social Rotator (/overlay/rotator)</span>
                <span className="text-sky-300">
                  {snapshot.rotator.paused
                    ? 'Pausiert'
                    : pinnedSlide
                    ? 'Gepinnt'
                    : `${snapshot.rotator.intervalSec}s Takt`}
                </span>
              </div>
              <div className="min-h-[96px] flex items-center justify-center overflow-hidden">
                {snapshot.rotator.visible ? (
                  <SocialRotatorBar
                    slides={snapshot.slides}
                    settings={snapshot.rotator}
                    scale={previewScale}
                  />
                ) : (
                  <span className="text-xs font-bold text-slate-500">
                    Rotator im Stream ausgeblendet
                  </span>
                )}
              </div>
            </div>

            {/* Ticker Preview */}
            <div className="space-y-2 pt-3 border-t border-white/10">
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                <span>2 · Horizontal Ticker (/overlay/ticker)</span>
                <span className="text-amber-300">
                  {snapshot.ticker.paused ? 'Pausiert' : `Speed: ${snapshot.ticker.speed}`}
                </span>
              </div>
              <div className="min-h-[56px] flex items-center justify-center">
                {snapshot.ticker.visible ? (
                  <LiveTickerBar items={snapshot.tickerItems} settings={snapshot.ticker} />
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
            OBS Einrichtung (9:16 Portrait)
          </div>
          <p>
            1. Neue <strong>Browser-Quelle</strong> in OBS anlegen und URL oben kopieren.
          </p>
          <p>
            2. Für den <strong>Social Rotator</strong> z. B. <code className="text-sky-200">800 × 140</code>, für den{' '}
            <strong>Ticker</strong> <code className="text-amber-200">1080 × 76</code> eintragen.
          </p>
          <p>
            3. Alle Änderungen (Texte, Takt, Pinnen, Ein/Aus) landen automatisch live im Stream.
          </p>
        </div>
      </aside>
    </div>
  );
};
