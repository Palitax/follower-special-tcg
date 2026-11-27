'use client';

import React, { useState } from 'react';
import {
  DEFAULT_WHATNOT_HUD_SETTINGS,
  HudAnimSpeed,
  HudWidgetConfig,
  WhatnotHudSettings,
} from '../types/broadcastBars';
import { HUD_ELEMENTAL_STYLES, HUD_STYLE_LIST } from './WowElementalFrames';
import { HudWidgetKey } from './WhatnotHudOverlay';
import { sound } from '../utils/sound';
import { Check, Copy, Eye, EyeOff, RotateCcw, Zap } from 'lucide-react';

interface WhatnotHudEditorPanelProps {
  settings: WhatnotHudSettings;
  hudBaseUrl: string;
  onUpdateSettings: (patch: Partial<WhatnotHudSettings>) => void;
  onUpdateWidget: (key: HudWidgetKey, patch: Partial<HudWidgetConfig>) => void;
  onResetAll: () => void;
  onCopyUrl: (id: string, url: string) => void;
  copiedKey: string | null;
}

const WIDGET_META: {
  key: HudWidgetKey;
  title: string;
  location: string;
  shapeLabel: string;
  defaultPresets: { label: string; ox: number; oy: number }[];
}[] = [
  {
    key: 'shop',
    title: 'Shop-Button',
    location: 'Unten Rechts (Kreis)',
    shapeLabel: 'Kreis-Durchmesser',
    defaultPresets: [
      { label: 'Oben-Links', ox: -275, oy: -105 },
      { label: 'Direkt Links', ox: -330, oy: -12 },
      { label: 'Hoch über Shop', ox: -145, oy: -210 },
    ],
  },
  {
    key: 'giveaway',
    title: 'Giveaway-Box',
    location: 'Oben Rechts (Rahmen)',
    shapeLabel: 'Rahmen-Breite',
    defaultPresets: [
      { label: 'Links daneben', ox: -325, oy: 16 },
      { label: 'Unten-Links', ox: -280, oy: 150 },
      { label: 'Direkt darunter', ox: -40, oy: 185 },
    ],
  },
  {
    key: 'avatar',
    title: 'Avatar / Logo',
    location: 'Oben Links (Kreis)',
    shapeLabel: 'Kreis-Durchmesser',
    defaultPresets: [
      { label: 'Rechts daneben', ox: 255, oy: 28 },
      { label: 'Unten-Rechts', ox: 220, oy: 130 },
    ],
  },
];

export const WhatnotHudEditorPanel: React.FC<WhatnotHudEditorPanelProps> = ({
  settings,
  hudBaseUrl,
  onUpdateSettings,
  onUpdateWidget,
  onResetAll,
  onCopyUrl,
  copiedKey,
}) => {
  const [selectedKey, setSelectedKey] = useState<HudWidgetKey>('shop');
  const activeMeta = WIDGET_META.find((m) => m.key === selectedKey) ?? WIDGET_META[0];
  const widget = settings[selectedKey];
  const activeStyle = HUD_ELEMENTAL_STYLES[widget.style] ?? HUD_ELEMENTAL_STYLES['arcane-mana'];
  const isRect = selectedKey === 'giveaway';

  const makeSingleUrl = (only: HudWidgetKey) => {
    if (!hudBaseUrl) return '';
    return hudBaseUrl.includes('?') ? `${hudBaseUrl}&only=${only}` : `${hudBaseUrl}?only=${only}`;
  };

  return (
    <div className="space-y-4">
      {/* Master Header + OBS URL Quick Copy */}
      <div className="p-4 border border-sky-400/30 bg-zinc-950/80 space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-black uppercase tracking-[0.16em] text-white">
              Whatnot HUD Highlights (WoW / RPG Elementar-Auren)
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Animierte Leucht-Rahmen &amp; Pfeil-Hinweise exakt für deinen 9:16 Whatnot-Screen
              (Shop, Giveaway &amp; Logo-Avatar).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                sound.playClick(640);
                onUpdateSettings({ visible: !settings.visible });
              }}
              className={`h-9 px-3 border text-xs font-black uppercase tracking-[0.08em] flex items-center gap-1.5 ${
                settings.visible
                  ? 'bg-emerald-500/15 border-emerald-400/50 text-emerald-200'
                  : 'bg-rose-500/15 border-rose-400/50 text-rose-200'
              }`}
            >
              {settings.visible ? (
                <>
                  <Eye className="w-3.5 h-3.5" />
                  <span>HUD Live</span>
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
                sound.playClick(520);
                onResetAll();
              }}
              className="h-9 px-2.5 border border-white/15 bg-white/5 hover:bg-white/10 text-[11px] font-bold text-slate-300 hover:text-white flex items-center gap-1.5"
              title="Alle 3 Whatnot-Standardpositionen wiederherstellen"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Whatnot-Reset</span>
            </button>
          </div>
        </div>

        {/* Full 9:16 + Individual OBS Source URLs */}
        <div className="p-2.5 border border-white/10 bg-black/45 flex flex-wrap items-center justify-between gap-2">
          <div className="text-[11px] text-slate-300">
            <strong className="text-white">OBS Browser-Quelle:</strong>{' '}
            <code className="text-sky-300">1080 × 1920 px</code> (oder einzelne Widgets separat in OBS ziehen)
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'hud_all', label: 'Gesamt-HUD (Alle 3)', url: hudBaseUrl, primary: true },
              { id: 'hud_shop', label: 'Nur Shop', url: makeSingleUrl('shop'), primary: false },
              {
                id: 'hud_giveaway',
                label: 'Nur Giveaway',
                url: makeSingleUrl('giveaway'),
                primary: false,
              },
              {
                id: 'hud_avatar',
                label: 'Nur Avatar',
                url: makeSingleUrl('avatar'),
                primary: false,
              },
            ].map((btn) => {
              const copied = copiedKey === btn.id;
              return (
                <button
                  key={btn.id}
                  type="button"
                  onClick={() => onCopyUrl(btn.id, btn.url)}
                  className={`h-8 px-2.5 text-[10.5px] font-black uppercase tracking-[0.08em] flex items-center gap-1 transition-colors ${
                    copied
                      ? 'bg-emerald-400 text-black'
                      : btn.primary
                      ? 'bg-sky-400 hover:bg-sky-300 text-black'
                      : 'bg-white/5 hover:bg-white/15 text-slate-200 border border-white/15'
                  }`}
                >
                  {copied ? <Check className="w-3 h-3 stroke-[3]" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Kopiert' : btn.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Target Switcher Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {WIDGET_META.map((m) => {
            const cfg = settings[m.key];
            const st = HUD_ELEMENTAL_STYLES[cfg.style] ?? HUD_ELEMENTAL_STYLES['arcane-mana'];
            const isSelected = selectedKey === m.key;
            return (
              <button
                key={m.key}
                type="button"
                onClick={() => {
                  sound.playClick(660);
                  setSelectedKey(m.key);
                }}
                className={`p-3 border text-left transition-colors relative overflow-hidden ${
                  isSelected
                    ? 'bg-sky-400/12 border-sky-400/70 text-white'
                    : 'bg-black/45 border-white/10 text-slate-300 hover:border-white/25'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-black">{m.title}</span>
                  <span
                    className={`px-1.5 py-0.5 text-[9.5px] font-black uppercase ${
                      cfg.enabled
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                        : 'bg-white/5 text-slate-500 border border-white/10'
                    }`}
                  >
                    {cfg.enabled ? 'Aktiv' : 'Aus'}
                  </span>
                </div>
                <div className="text-[10.5px] text-slate-400 mt-0.5">{m.location}</div>
                <div className="flex items-center gap-1.5 mt-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{
                      backgroundColor: st.primary,
                      boxShadow: `0 0 8px ${st.primary}`,
                    }}
                  />
                  <span className="text-[10.5px] font-bold text-slate-200 truncate">
                    {st.label}
                    {cfg.calloutEnabled ? ' · + Pfeil' : ''}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Widget Configuration Card */}
      <div className="p-4 border border-white/12 bg-zinc-950/80 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <span
              className="w-3.5 h-3.5 rounded-full shrink-0"
              style={{
                backgroundColor: activeStyle.primary,
                boxShadow: `0 0 10px ${activeStyle.primary}`,
              }}
            />
            <div>
              <h4 className="text-xs font-black uppercase tracking-[0.14em] text-white">
                {activeMeta.title} bearbeiten
              </h4>
              <p className="text-[11px] text-slate-400">{activeMeta.location}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                sound.playClick(640);
                onUpdateWidget(selectedKey, { enabled: !widget.enabled });
              }}
              className={`h-8 px-3 border text-[11px] font-bold ${
                widget.enabled
                  ? 'bg-emerald-500/15 border-emerald-400/50 text-emerald-200'
                  : 'bg-white/5 border-white/15 text-slate-400'
              }`}
            >
              {widget.enabled ? 'Rahmen: An' : 'Rahmen: Aus'}
            </button>
            <button
              type="button"
              onClick={() => {
                sound.playClick(540);
                const def = DEFAULT_WHATNOT_HUD_SETTINGS[selectedKey];
                onUpdateWidget(selectedKey, {
                  xPct: def.xPct,
                  yPct: def.yPct,
                  widthPx: def.widthPx,
                  heightPx: def.heightPx,
                  radiusPx: def.radiusPx,
                });
              }}
              className="h-8 px-2.5 border border-white/15 bg-black/45 hover:bg-white/10 text-[10.5px] font-bold text-slate-300"
            >
              Position Reset
            </button>
          </div>
        </div>

        {/* 5 WoW Elemental Artstyles */}
        <div className="space-y-1.5">
          <span className="block text-[10.5px] font-bold uppercase tracking-[0.12em] text-slate-400">
            WoW / RPG Elementar-Stil
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-1.5">
            {HUD_STYLE_LIST.map((st) => {
              const active = widget.style === st.id;
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => {
                    sound.playClick(680);
                    onUpdateWidget(selectedKey, { style: st.id });
                  }}
                  className={`p-2.5 border text-left transition-colors space-y-1.5 ${
                    active
                      ? 'bg-white/10 border-sky-400/75 text-white'
                      : 'bg-black/45 border-white/10 text-slate-300 hover:border-white/25'
                  }`}
                >
                  <div
                    className="h-2.5 w-full rounded-full"
                    style={{
                      background: `linear-gradient(90deg, ${st.secondary} 0%, ${st.primary} 55%, ${st.highlight} 100%)`,
                      boxShadow: active ? `0 0 10px rgba(${st.glowRgb}, 0.7)` : undefined,
                    }}
                  />
                  <div className="text-[11px] font-extrabold leading-tight">{st.label}</div>
                  <div className="text-[9.5px] text-slate-400 leading-snug">{st.subtitle}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Aura Intensity, Thickness & Speed */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-300">Leuchtkraft</span>
              <span className="font-black text-sky-300">{widget.intensityPct}%</span>
            </div>
            <input
              type="range"
              min={30}
              max={160}
              step={5}
              value={widget.intensityPct}
              onChange={(e) =>
                onUpdateWidget(selectedKey, { intensityPct: Number(e.target.value) })
              }
              className="w-full cursor-pointer"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-300">Rahmen-Stärke</span>
              <span className="font-black text-amber-300">{widget.thicknessPct}%</span>
            </div>
            <input
              type="range"
              min={60}
              max={180}
              step={5}
              value={widget.thicknessPct}
              onChange={(e) =>
                onUpdateWidget(selectedKey, { thicknessPct: Number(e.target.value) })
              }
              className="w-full cursor-pointer"
            />
          </div>

          <div className="space-y-1.5">
            <span className="block text-xs font-bold text-slate-300">Animations-Tempo</span>
            <div className="grid grid-cols-3 gap-1">
              {(
                [
                  { id: 'slow', label: 'Ruhig' },
                  { id: 'normal', label: 'Normal' },
                  { id: 'fast', label: 'Wild' },
                ] as { id: HudAnimSpeed; label: string }[]
              ).map((sp) => (
                <button
                  key={sp.id}
                  type="button"
                  onClick={() => onUpdateWidget(selectedKey, { animSpeed: sp.id })}
                  className={`h-8 border text-[11px] font-bold ${
                    widget.animSpeed === sp.id
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

        {/* Fine-Tuning Calibration Sliders (X, Y, Size) */}
        <div className="p-3 border border-white/10 bg-black/35 space-y-3">
          <span className="block text-[10.5px] font-black uppercase tracking-[0.12em] text-slate-300">
            Position &amp; Größe feinjustieren (9:16 Screen)
          </span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300">Links / Rechts (X)</span>
                <span className="font-black text-sky-300">{widget.xPct.toFixed(1)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={0.2}
                value={widget.xPct}
                onChange={(e) => onUpdateWidget(selectedKey, { xPct: Number(e.target.value) })}
                className="w-full cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300">Hoch / Runter (Y)</span>
                <span className="font-black text-sky-300">{widget.yPct.toFixed(1)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={0.2}
                value={widget.yPct}
                onChange={(e) => onUpdateWidget(selectedKey, { yPct: Number(e.target.value) })}
                className="w-full cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300">{activeMeta.shapeLabel}</span>
                <span className="font-black text-[#FFE406]">{widget.widthPx} px</span>
              </div>
              <input
                type="range"
                min={60}
                max={isRect ? 560 : 320}
                step={2}
                value={widget.widthPx}
                onChange={(e) =>
                  onUpdateWidget(selectedKey, {
                    widthPx: Number(e.target.value),
                    ...(isRect ? {} : { heightPx: Number(e.target.value) }),
                  })
                }
                className="w-full cursor-pointer"
              />
            </div>

            {isRect && (
              <>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-300">Rahmen-Höhe</span>
                    <span className="font-black text-[#FFE406]">{widget.heightPx} px</span>
                  </div>
                  <input
                    type="range"
                    min={60}
                    max={360}
                    step={2}
                    value={widget.heightPx}
                    onChange={(e) =>
                      onUpdateWidget(selectedKey, { heightPx: Number(e.target.value) })
                    }
                    className="w-full cursor-pointer"
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-300">Ecken-Abrundung</span>
                    <span className="font-black text-slate-200">{widget.radiusPx} px</span>
                  </div>
                  <input
                    type="range"
                    min={6}
                    max={90}
                    step={2}
                    value={Math.min(90, widget.radiusPx)}
                    onChange={(e) =>
                      onUpdateWidget(selectedKey, { radiusPx: Number(e.target.value) })
                    }
                    className="w-full cursor-pointer"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Animated Callout Arrow + Free Custom Text */}
        <div className="p-3.5 border border-[#FFE406]/30 bg-[#FFE406]/[0.04] space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="block text-xs font-extrabold text-white">
                Animierter Hinweis-Pfeil &amp; freier Text ({activeMeta.title})
              </span>
              <span className="block text-[11px] text-slate-400">
                Blendet ab und zu (oder dauerhaft) einen gebogenen Pfeil + Textbox ein, die auf
                das Element zeigt.
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  sound.playClick(640);
                  onUpdateWidget(selectedKey, { calloutEnabled: !widget.calloutEnabled });
                }}
                className={`h-8 px-3 border text-[11px] font-bold ${
                  widget.calloutEnabled
                    ? 'bg-emerald-500/15 border-emerald-400/50 text-emerald-200'
                    : 'bg-white/5 border-white/15 text-slate-400'
                }`}
              >
                {widget.calloutEnabled ? 'Pfeil: An' : 'Pfeil: Aus'}
              </button>
              <button
                type="button"
                onClick={() => {
                  sound.playClick(760);
                  onUpdateWidget(selectedKey, {
                    enabled: true,
                    calloutEnabled: true,
                    calloutTriggerNonce: Date.now(),
                  });
                }}
                className="h-8 px-3 bg-[#FFE406] hover:bg-[#f5dc00] text-[#1a1718] font-black text-[11px] uppercase tracking-[0.08em] flex items-center gap-1"
              >
                <Zap className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Jetzt zeigen</span>
              </button>
            </div>
          </div>

          {widget.calloutEnabled && (
            <div className="space-y-3">
              {/* Free Text Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                <label className="space-y-1">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Haupttext (frei formulierbar)
                  </span>
                  <input
                    type="text"
                    value={widget.calloutText}
                    onChange={(e) =>
                      onUpdateWidget(selectedKey, { calloutText: e.target.value })
                    }
                    placeholder={
                      selectedKey === 'shop'
                        ? 'z. B. Sofortkauf? Check den Shop!'
                        : 'z. B. Gratis Giveaway · Jetzt mitmachen!'
                    }
                    className="w-full h-9 px-2.5 bg-black/60 border border-white/15 text-xs font-extrabold text-white focus:outline-none focus:border-[#FFE406]"
                  />
                </label>

                <label className="space-y-1">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Untertext (optional)
                  </span>
                  <input
                    type="text"
                    value={widget.calloutSubtext}
                    onChange={(e) =>
                      onUpdateWidget(selectedKey, { calloutSubtext: e.target.value })
                    }
                    placeholder="z. B. Einzelkarten & Sealed direkt sichern"
                    className="w-full h-9 px-2.5 bg-black/60 border border-white/15 text-xs font-semibold text-slate-200 focus:outline-none focus:border-sky-400"
                  />
                </label>
              </div>

              {/* Callout Interval Sliders */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-300">Pfeil anzeigen für</span>
                    <span className="font-black text-[#FFE406]">
                      {widget.calloutVisibleSec === 0
                        ? 'Dauerhaft an'
                        : `${widget.calloutVisibleSec} Sek.`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={120}
                    step={2}
                    value={widget.calloutVisibleSec}
                    onChange={(e) =>
                      onUpdateWidget(selectedKey, { calloutVisibleSec: Number(e.target.value) })
                    }
                    className="w-full cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-300">Pause zwischen Hinweisen</span>
                    <span className="font-black text-sky-300">
                      {widget.calloutVisibleSec === 0
                        ? 'Inaktiv'
                        : `${widget.calloutHiddenSec} Sek.`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={600}
                    step={5}
                    disabled={widget.calloutVisibleSec === 0}
                    value={widget.calloutHiddenSec}
                    onChange={(e) =>
                      onUpdateWidget(selectedKey, { calloutHiddenSec: Number(e.target.value) })
                    }
                    className="w-full cursor-pointer disabled:opacity-35"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {[
                  { show: 0, hide: 30, label: 'Dauerhaft' },
                  { show: 10, hide: 30, label: '10s an · 30s Pause' },
                  { show: 12, hide: 45, label: '12s an · 45s Pause' },
                  { show: 15, hide: 90, label: '15s an · 90s Pause' },
                ].map((pr) => (
                  <button
                    key={pr.label}
                    type="button"
                    onClick={() => {
                      sound.playClick(640);
                      onUpdateWidget(selectedKey, {
                        calloutVisibleSec: pr.show,
                        calloutHiddenSec: pr.hide,
                        calloutTriggerNonce: Date.now(),
                      });
                    }}
                    className={`px-2 py-0.5 border text-[10.5px] font-bold ${
                      widget.calloutVisibleSec === pr.show &&
                      (pr.show === 0 || widget.calloutHiddenSec === pr.hide)
                        ? 'bg-[#FFE406]/20 border-[#FFE406]/65 text-[#FFE406]'
                        : 'bg-black/45 border-white/10 text-slate-300 hover:border-white/25'
                    }`}
                  >
                    {pr.label}
                  </button>
                ))}
              </div>

              {/* Arrow Position & Scale */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-white/10">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-300">Text X-Abstand</span>
                    <span className="font-black text-sky-300">{widget.calloutOffsetX} px</span>
                  </div>
                  <input
                    type="range"
                    min={-520}
                    max={520}
                    step={5}
                    value={widget.calloutOffsetX}
                    onChange={(e) =>
                      onUpdateWidget(selectedKey, { calloutOffsetX: Number(e.target.value) })
                    }
                    className="w-full cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-300">Text Y-Abstand</span>
                    <span className="font-black text-sky-300">{widget.calloutOffsetY} px</span>
                  </div>
                  <input
                    type="range"
                    min={-380}
                    max={380}
                    step={5}
                    value={widget.calloutOffsetY}
                    onChange={(e) =>
                      onUpdateWidget(selectedKey, { calloutOffsetY: Number(e.target.value) })
                    }
                    className="w-full cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-300">Pfeil- &amp; Text-Größe</span>
                    <span className="font-black text-amber-300">{widget.calloutScalePct}%</span>
                  </div>
                  <input
                    type="range"
                    min={70}
                    max={150}
                    step={5}
                    value={widget.calloutScalePct}
                    onChange={(e) =>
                      onUpdateWidget(selectedKey, { calloutScalePct: Number(e.target.value) })
                    }
                    className="w-full cursor-pointer"
                  />
                </div>
              </div>

              {/* Quick Arrow Position Chips */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1">
                  Pfeil-Position:
                </span>
                {activeMeta.defaultPresets.map((pos) => (
                  <button
                    key={pos.label}
                    type="button"
                    onClick={() => {
                      sound.playClick(640);
                      onUpdateWidget(selectedKey, {
                        calloutOffsetX: pos.ox,
                        calloutOffsetY: pos.oy,
                      });
                    }}
                    className="px-2 py-0.5 border border-white/15 bg-black/50 hover:bg-white/10 text-[10.5px] font-bold text-slate-200"
                  >
                    {pos.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
