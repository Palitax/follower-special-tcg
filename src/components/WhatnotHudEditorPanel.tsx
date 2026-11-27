'use client';

import React from 'react';
import {
  DEFAULT_WHATNOT_HUD_SETTINGS,
  HudAnimSpeed,
  HudWidgetConfig,
  WhatnotHudSettings,
} from '../types/broadcastBars';
import { HUD_ELEMENTAL_STYLES, HUD_STYLE_LIST } from './WowElementalFrames';
import { HudWidgetKey, STANDALONE_HUD_STAGES } from './WhatnotHudOverlay';
import { sound } from '../utils/sound';
import { Check, Copy, Eye, EyeOff, RotateCcw, Zap } from 'lucide-react';

interface WhatnotHudEditorPanelProps {
  settings: WhatnotHudSettings;
  selectedKey: HudWidgetKey;
  onSelectWidget: (key: HudWidgetKey) => void;
  hudBaseUrl: string;
  hasUnsavedDraft: boolean;
  autoApplyLive: boolean;
  onToggleAutoApply: () => void;
  onConfirmDraft: () => void;
  onDiscardDraft: () => void;
  onUpdateSettings: (patch: Partial<WhatnotHudSettings>) => void;
  onUpdateWidget: (key: HudWidgetKey, patch: Partial<HudWidgetConfig>) => void;
  onResetWidget: (key: HudWidgetKey) => void;
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
    location: 'Eigene OBS-Quelle · Kreis (Unten Rechts)',
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
    location: 'Eigene OBS-Quelle · Rahmen (Oben Rechts)',
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
    location: 'Eigene OBS-Quelle · Kreis (Oben Links)',
    shapeLabel: 'Kreis-Durchmesser',
    defaultPresets: [
      { label: 'Rechts daneben', ox: 255, oy: 28 },
      { label: 'Unten-Rechts', ox: 220, oy: 130 },
    ],
  },
];

export const WhatnotHudEditorPanel: React.FC<WhatnotHudEditorPanelProps> = ({
  settings,
  selectedKey,
  onSelectWidget,
  hudBaseUrl,
  hasUnsavedDraft,
  autoApplyLive,
  onToggleAutoApply,
  onConfirmDraft,
  onDiscardDraft,
  onUpdateSettings,
  onUpdateWidget,
  onResetWidget,
  onCopyUrl,
  copiedKey,
}) => {
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
      {/* Unsaved Draft Confirmation Banner */}
      {hasUnsavedDraft && (
        <div className="p-3.5 border-2 border-[#FFE406]/80 bg-[#FFE406]/12 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.12em] text-[#FFE406]">
              Entwurf in der Vorschau — noch nicht live in OBS
            </div>
            <p className="text-[11px] text-slate-200 mt-0.5">
              Ziehe den Hinweis-Pfeil rechts in der Vorschau zurecht und klicke auf Bestätigen,
              um das Update in den Stream zu senden.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onDiscardDraft}
              className="h-9 px-3 border border-white/20 bg-black/60 hover:bg-white/10 text-xs font-bold text-slate-200"
            >
              Verwerfen
            </button>
            <button
              type="button"
              onClick={onConfirmDraft}
              className="h-9 px-4 bg-[#FFE406] hover:bg-[#f5dc00] text-[#1a1718] text-xs font-black uppercase tracking-[0.1em] flex items-center gap-1.5"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Bestätigen &amp; Live senden</span>
            </button>
          </div>
        </div>
      )}

      {/* Master Header + 3 Completely Independent Widget Cards */}
      <div className="p-4 border border-sky-400/30 bg-zinc-950/80 space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-black uppercase tracking-[0.16em] text-white">
              Whatnot HUD Highlights (3 völlig unabhängige OBS-Quellen)
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Shop, Giveaway und Logo sind komplett entkoppelt: Jedes Element hat seine eigene
              OBS-URL mit großzügigem Rand (kein Abschneiden!) und lässt sich einzeln in OBS
              platzieren.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleAutoApply}
              className={`h-8 px-2.5 border text-[10.5px] font-bold transition-colors ${
                autoApplyLive
                  ? 'bg-sky-400/15 border-sky-400/50 text-sky-200'
                  : 'bg-[#FFE406]/15 border-[#FFE406]/55 text-[#FFE406]'
              }`}
              title="Umschalten zwischen Entwurf-Bestätigung und Sofort-Live"
            >
              {autoApplyLive ? 'Modus: Sofort live' : 'Modus: Erst bestätigen'}
            </button>

            <button
              type="button"
              onClick={() => {
                sound.playClick(640);
                onUpdateSettings({ visible: !settings.visible });
              }}
              className={`h-8 px-3 border text-[11px] font-black uppercase tracking-[0.08em] flex items-center gap-1.5 ${
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
                  <span>Aus</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Global controls applied to ALL three elements at once */}
        <div className="p-3 border border-[#FFE406]/35 bg-[#FFE406]/[0.05] space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] font-black uppercase tracking-[0.12em] text-[#FFE406]">
              Für alle Elemente (Shop, Giveaway &amp; Logo)
            </span>
            <button
              type="button"
              onClick={() => {
                sound.playClick(540);
                onUpdateSettings({
                  frameThicknessPct: DEFAULT_WHATNOT_HUD_SETTINGS.frameThicknessPct,
                  frameGlowPct: DEFAULT_WHATNOT_HUD_SETTINGS.frameGlowPct,
                });
              }}
              className="h-7 px-2 border border-white/15 bg-black/45 hover:bg-white/10 text-[10px] font-bold text-slate-300 flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Standard</span>
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-200">Rahmen-Dicke (alle)</span>
                <span className="font-black text-[#FFE406]">{settings.frameThicknessPct}%</span>
              </div>
              <input
                type="range"
                min={50}
                max={300}
                step={5}
                value={settings.frameThicknessPct}
                onChange={(e) => onUpdateSettings({ frameThicknessPct: Number(e.target.value) })}
                className="w-full cursor-pointer"
              />
              <div className="flex flex-wrap gap-1">
                {[
                  { v: 100, label: 'Fein' },
                  { v: 140, label: 'Standard' },
                  { v: 200, label: 'Kräftig' },
                  { v: 260, label: 'Extra dick' },
                ].map((p) => (
                  <button
                    key={p.v}
                    type="button"
                    onClick={() => onUpdateSettings({ frameThicknessPct: p.v })}
                    className={`px-2 py-0.5 border text-[10px] font-bold ${
                      settings.frameThicknessPct === p.v
                        ? 'bg-[#FFE406]/20 border-[#FFE406]/65 text-[#FFE406]'
                        : 'bg-black/45 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-200">Leuchtkraft (alle)</span>
                <span className="font-black text-sky-300">{settings.frameGlowPct}%</span>
              </div>
              <input
                type="range"
                min={50}
                max={200}
                step={5}
                value={settings.frameGlowPct}
                onChange={(e) => onUpdateSettings({ frameGlowPct: Number(e.target.value) })}
                className="w-full cursor-pointer"
              />
              <p className="text-[10px] text-slate-400 leading-snug">
                Wirkt zusätzlich zu den Einzelwerten unten. Tipp: Wenn du eine Quelle in OBS stark
                verkleinerst, die Dicke erhöhen – sonst wirkt der Rahmen dünn und dunkel.
              </p>
            </div>
          </div>
        </div>

        {/* 3 Independent Target Cards — each with its own OBS Browser Source URL & native resolution */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {WIDGET_META.map((m) => {
            const cfg = settings[m.key];
            const st = HUD_ELEMENTAL_STYLES[cfg.style] ?? HUD_ELEMENTAL_STYLES['arcane-mana'];
            const stage = STANDALONE_HUD_STAGES[m.key];
            const isSelected = selectedKey === m.key;
            const urlId = `hud_${m.key}`;
            const isCopied = copiedKey === urlId;

            return (
              <div
                key={m.key}
                className={`p-3 border transition-colors flex flex-col justify-between gap-2.5 ${
                  isSelected
                    ? 'bg-sky-400/12 border-sky-400/75 text-white'
                    : 'bg-black/45 border-white/10 text-slate-300 hover:border-white/25'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick(660);
                    onSelectWidget(m.key);
                  }}
                  className="text-left w-full space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-black text-white">{m.title}</span>
                    <span
                      className={`px-1.5 py-0.5 text-[9.5px] font-black uppercase ${
                        cfg.enabled || cfg.calloutEnabled
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                          : 'bg-white/5 text-slate-500 border border-white/10'
                      }`}
                    >
                      {cfg.enabled && cfg.calloutEnabled
                        ? 'Rahmen + Pfeil'
                        : cfg.enabled
                        ? 'Nur Rahmen'
                        : cfg.calloutEnabled
                        ? 'Nur Pfeil'
                        : 'Aus'}
                    </span>
                  </div>
                  <div className="text-[10.5px] text-slate-400">
                    OBS: <code className="text-sky-300">{stage.width} × {stage.height} px</code>
                  </div>
                  <div className="flex items-center gap-1.5 pt-0.5">
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

                <button
                  type="button"
                  onClick={() => onCopyUrl(urlId, makeSingleUrl(m.key))}
                  className={`w-full h-8 px-2 text-[10.5px] font-black uppercase tracking-[0.08em] flex items-center justify-center gap-1 transition-colors ${
                    isCopied
                      ? 'bg-emerald-400 text-black'
                      : isSelected
                      ? 'bg-sky-400 hover:bg-sky-300 text-black'
                      : 'bg-white/10 hover:bg-white/20 text-white border border-white/15'
                  }`}
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3 h-3 stroke-[3]" />
                      <span>URL kopiert</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>OBS-URL ({m.title.split('-')[0]})</span>
                    </>
                  )}
                </button>
              </div>
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
                onResetWidget(selectedKey);
              }}
              className="h-8 px-2.5 border border-white/15 bg-black/45 hover:bg-white/10 text-[10.5px] font-bold text-slate-300 flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Standard</span>
            </button>
          </div>
        </div>

        {/* Display mode: frame and hint arrow are completely independent */}
        <div className="space-y-1.5">
          <span className="block text-[10.5px] font-bold uppercase tracking-[0.12em] text-slate-400">
            Was soll angezeigt werden?
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {[
              { id: 'both', label: 'Rahmen + Pfeil', frame: true, arrow: true },
              { id: 'frame', label: 'Nur Rahmen', frame: true, arrow: false },
              { id: 'arrow', label: 'Nur Hinweis-Pfeil', frame: false, arrow: true },
              { id: 'off', label: 'Nichts (Aus)', frame: false, arrow: false },
            ].map((m) => {
              const active = widget.enabled === m.frame && widget.calloutEnabled === m.arrow;
              return (
                <button
                  key={m.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    sound.playClick(660);
                    onUpdateWidget(selectedKey, {
                      enabled: m.frame,
                      calloutEnabled: m.arrow,
                      ...(m.arrow ? { calloutTriggerNonce: Date.now() } : {}),
                    });
                  }}
                  className={`min-h-[40px] px-2 border text-[11px] font-extrabold transition-colors ${
                    active
                      ? 'bg-sky-400/15 border-sky-400/70 text-white'
                      : 'bg-black/45 border-white/10 text-slate-300 hover:border-white/25'
                  }`}
                >
                  {m.label}
                </button>
              );
            })}
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

        {/* Aura Intensity, Thickness, Size & Speed */}
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
              max={250}
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

        {/* Independent Frame Dimensions */}
        <div className="p-3 border border-white/10 bg-black/35 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="block text-[10.5px] font-black uppercase tracking-[0.12em] text-slate-300">
              Rahmen-Größe (unabhängig von anderen Elementen)
            </span>
            <span className="text-[10px] text-slate-400">
              Position auf dem Screen schiebst du frei in OBS
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300">{activeMeta.shapeLabel}</span>
                <span className="font-black text-[#FFE406]">{widget.widthPx} px</span>
              </div>
              <input
                type="range"
                min={60}
                max={isRect ? 540 : 320}
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
                    max={340}
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
                Du kannst die Text-Box direkt rechts in der Vorschau mit der Maus greifen und frei
                verschieben!
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
                    calloutEnabled: true,
                    calloutTriggerNonce: Date.now(),
                  });
                }}
                className="h-8 px-3 bg-[#FFE406] hover:bg-[#f5dc00] text-[#1a1718] font-black text-[11px] uppercase tracking-[0.08em] flex items-center gap-1"
              >
                <Zap className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Animation testen</span>
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
                    min={-480}
                    max={480}
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
                    min={-340}
                    max={340}
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
                  Schnell-Position:
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

export { DEFAULT_WHATNOT_HUD_SETTINGS };
