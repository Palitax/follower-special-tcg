'use client';

import React, { useRef, useState } from 'react';
import {
  OverlayQualityScale,
  ShowcaseAnimation,
  ShowcaseCycleMode,
  ShowcaseImage,
  ShowcaseLayout,
  ShowcasePreset,
  ShowcaseSettings,
  ShowcaseTitleAnchor,
  ShowcaseTitleBgStyle,
} from '../types/broadcastBars';
import { sound } from '../utils/sound';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  ImagePlus,
  Plus,
  Trash2,
  X,
  Zap,
} from 'lucide-react';

interface ShowcaseEditorPanelProps {
  settings: ShowcaseSettings;
  presets: ShowcasePreset[];
  onUpdateSettings: <K extends keyof ShowcaseSettings>(
    key: K,
    value: ShowcaseSettings[K]
  ) => void;
  onTriggerShow: (presetId?: string) => void;
  onHide: () => void;
  onUpdatePreset: (presetId: string, patch: Partial<ShowcasePreset>) => void;
  onAddPreset: () => void;
  onDeletePreset: (presetId: string) => void;
}

const MAX_SHOWCASE_IMAGES = 10;

/**
 * Compresses dropped TTB / card images to crisp alpha-preserving WebP
 * and auto-trims dead transparent outer margins so cutout PNGs fill their showcase cleanly.
 */
async function compressShowcaseImage(file: File, maxDim = 760): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => resolve('');
    reader.onload = (ev) => {
      const dataUrl = String(ev.target?.result ?? '');
      const img = new Image();
      img.onerror = () => resolve(dataUrl);
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width >= height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Trim transparent outer margins around cutout PNGs
        try {
          const { data } = ctx.getImageData(0, 0, width, height);
          let minX = width;
          let minY = height;
          let maxX = -1;
          let maxY = -1;
          for (let y = 0; y < height; y++) {
            const row = y * width * 4;
            for (let x = 0; x < width; x++) {
              if (data[row + x * 4 + 3] > 10) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
              }
            }
          }
          if (maxX >= minX && maxY >= minY) {
            const pad = 2;
            const sx = Math.max(0, minX - pad);
            const sy = Math.max(0, minY - pad);
            const sw = Math.min(width - sx, maxX - minX + 1 + pad * 2);
            const sh = Math.min(height - sy, maxY - minY + 1 + pad * 2);
            if (sw > 16 && sh > 16 && (sw < width - 6 || sh < height - 6)) {
              const trimmed = document.createElement('canvas');
              trimmed.width = sw;
              trimmed.height = sh;
              const tCtx = trimmed.getContext('2d');
              if (tCtx) {
                tCtx.clearRect(0, 0, sw, sh);
                tCtx.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);
                resolve(trimmed.toDataURL('image/webp', 0.86));
                return;
              }
            }
          }
        } catch {
          // fallback untrimmed
        }

        resolve(canvas.toDataURL('image/webp', 0.86));
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

export const ShowcaseEditorPanel: React.FC<ShowcaseEditorPanelProps> = ({
  settings,
  presets,
  onUpdateSettings,
  onTriggerShow,
  onHide,
  onUpdatePreset,
  onAddPreset,
  onDeletePreset,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const activePreset =
    presets.find((p) => p.id === settings.activePresetId) ?? presets[0] ?? null;

  const handleFiles = async (files: FileList | File[] | null) => {
    if (!files || !activePreset) return;
    const remaining = MAX_SHOWCASE_IMAGES - activePreset.images.length;
    if (remaining <= 0) return;

    const imageFiles = Array.from(files)
      .filter((f) => f.type.startsWith('image/'))
      .slice(0, remaining);
    if (imageFiles.length === 0) return;

    setIsProcessing(true);
    try {
      const urls = await Promise.all(imageFiles.map((f) => compressShowcaseImage(f)));
      const newEntries: ShowcaseImage[] = urls
        .filter((u) => u.startsWith('data:image/'))
        .map((url, idx) => ({
          id: `scimg_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
          url,
          label: imageFiles[idx]?.name.replace(/\.[^.]+$/, ''),
        }));
      if (newEntries.length > 0) {
        sound.playShimmer();
        onUpdatePreset(activePreset.id, {
          images: [...activePreset.images, ...newEntries].slice(0, MAX_SHOWCASE_IMAGES),
        });
      }
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeImage = (imgId: string) => {
    if (!activePreset) return;
    sound.playClick(450);
    onUpdatePreset(activePreset.id, {
      images: activePreset.images.filter((im) => im.id !== imgId),
    });
  };

  const moveImage = (idx: number, delta: -1 | 1) => {
    if (!activePreset) return;
    const target = idx + delta;
    if (target < 0 || target >= activePreset.images.length) return;
    sound.playClick(600);
    const copy = [...activePreset.images];
    const [moved] = copy.splice(idx, 1);
    copy.splice(target, 0, moved);
    onUpdatePreset(activePreset.id, { images: copy });
  };

  return (
    <div className="space-y-4">
      {/* =================================================================
          LIVE TRIGGER & PRESET SWITCHER
         ================================================================= */}
      <div className="p-4 border border-white/10 bg-zinc-950/75 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.14em] text-white">
              KGA / Einzelkarten Einblendung (OBS: /overlay/showcase)
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              TTB, Display oder mehrere Einzelkarten per Drag &amp; Drop konfigurieren und auf Knopfdruck animiert einblenden.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                sound.playClick(760);
                onTriggerShow(
                  settings.cycleMode === 'rotate' ? undefined : activePreset?.id
                );
              }}
              className="h-9 px-4 bg-[#FFE406] hover:bg-[#f5dc00] text-[#1a1718] font-black text-xs uppercase tracking-[0.1em] flex items-center gap-1.5 transition-colors"
            >
              <Zap className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>
                {settings.cycleMode === 'rotate'
                  ? 'Wechsel-Zyklus starten'
                  : settings.displayDurationSec > 0
                  ? `Jetzt einblenden (${settings.displayDurationSec}s)`
                  : 'Im Stream einblenden'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                sound.playClick(480);
                onHide();
              }}
              className={`h-9 px-3 border text-xs font-bold flex items-center gap-1.5 transition-colors ${
                settings.visible
                  ? 'bg-rose-500/20 border-rose-400/50 text-rose-200 hover:bg-rose-500/30'
                  : 'bg-white/5 border-white/15 text-slate-400'
              }`}
            >
              {settings.visible ? (
                <>
                  <EyeOff className="w-3.5 h-3.5" />
                  <span>Ausblenden</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5" />
                  <span>Ausgeblendet</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Cycle Mode Switcher: Single vs. Auto-Rotate (KGA -> Einzelkarten -> Pause) */}
        <div className="p-3 border border-sky-400/30 bg-sky-500/[0.06] space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="block text-[11px] font-black uppercase tracking-[0.12em] text-white">
                Ablauf-Modus in OBS (eine gemeinsame Quelle)
              </span>
              <span className="block text-[10.5px] text-slate-300 mt-0.5">
                Wechselt automatisch in deiner einen OBS-Quelle zwischen KGA, Einzelkarten und Pause.
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(
              [
                {
                  id: 'rotate',
                  label: 'Alle im Wechsel (KGA → Einzelkarten → Pause)',
                  desc: 'Spielt alle aktivierten Einblendungen nacheinander ab, macht X Sek. Pause und startet von vorn',
                },
                {
                  id: 'single',
                  label: 'Nur ausgewählte Einblendung',
                  desc: 'Zeigt nur das aktuell ausgewählte Showcase an',
                },
              ] as { id: ShowcaseCycleMode; label: string; desc: string }[]
            ).map((m) => {
              const active = (settings.cycleMode ?? 'single') === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    sound.playClick(660);
                    onUpdateSettings('cycleMode', m.id);
                    if (m.id === 'rotate') {
                      onTriggerShow();
                    }
                  }}
                  className={`p-2.5 border text-left transition-colors ${
                    active
                      ? 'bg-[#FFE406]/15 border-[#FFE406]/70 text-white'
                      : 'bg-black/45 border-white/10 text-slate-300 hover:border-white/25'
                  }`}
                >
                  <div className="text-xs font-extrabold">{m.label}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{m.desc}</div>
                </button>
              );
            })}
          </div>

          {settings.cycleMode === 'rotate' && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-white/10 text-[10.5px]">
              <span className="font-bold uppercase tracking-wider text-slate-400 mr-1">
                Ablauf:
              </span>
              {presets
                .filter((p) => p.includeInCycle !== false)
                .map((p, idx) => (
                  <React.Fragment key={`seq_${p.id}`}>
                    {idx > 0 && <span className="text-slate-500 font-black">→</span>}
                    <span className="px-2 py-0.5 bg-black/55 border border-sky-400/40 text-sky-200 font-bold">
                      {p.eyebrow || p.headline || `Slide ${idx + 1}`}{' '}
                      <strong className="text-[#FFE406]">({p.durationSec ?? 12}s)</strong>
                    </span>
                  </React.Fragment>
                ))}
              <span className="text-slate-500 font-black">→</span>
              <span className="px-2 py-0.5 bg-black/55 border border-white/15 text-slate-300 font-bold">
                {settings.autoRepeatRestSec > 0
                  ? `Pause (${settings.autoRepeatRestSec}s) → ↺`
                  : 'Direkt von vorn ↺'}
              </span>
            </div>
          )}
        </div>

        {/* Preset Tabs */}
        <div className="space-y-2 pt-2 border-t border-white/10">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate-400">
              Gespeicherte Einblendungen ({presets.length})
            </span>
            <button
              type="button"
              onClick={onAddPreset}
              className="h-7 px-2.5 bg-sky-400 hover:bg-sky-300 text-black text-[11px] font-black uppercase tracking-[0.08em] flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Neu</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {presets.map((p) => {
              const isSelected = p.id === activePreset?.id;
              const inCycle = p.includeInCycle !== false;
              return (
                <div
                  key={p.id}
                  className={`flex items-center justify-between gap-2 p-2.5 border transition-colors ${
                    isSelected
                      ? 'bg-sky-400/15 border-sky-400/65 text-white'
                      : 'bg-black/45 border-white/10 text-slate-300 hover:border-white/25'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      sound.playClick(640);
                      onUpdateSettings('activePresetId', p.id);
                    }}
                    className="flex-1 min-w-0 text-left"
                  >
                    <div className="text-xs font-extrabold truncate">
                      {p.headline || p.eyebrow || 'Unbenanntes Showcase'}
                    </div>
                    <div className="text-[10.5px] text-slate-400 mt-0.5">
                      {p.images.length} Bild{p.images.length === 1 ? '' : 'er'} ·{' '}
                      {p.durationSec ?? 12}s Dauer · {p.eyebrow || 'Ohne Sticker'}
                    </div>
                  </button>

                  <div className="flex items-center gap-1 shrink-0">
                    {settings.cycleMode === 'rotate' && (
                      <button
                        type="button"
                        onClick={() => {
                          sound.playClick(620);
                          onUpdatePreset(p.id, { includeInCycle: !inCycle });
                        }}
                        className={`h-7 px-2 border text-[10px] font-black uppercase transition-colors ${
                          inCycle
                            ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200'
                            : 'bg-white/5 border-white/15 text-slate-500'
                        }`}
                        title="In den automatischen Wechsel einbeziehen"
                      >
                        {inCycle ? 'Im Wechsel' : 'Aus'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        sound.playClick(760);
                        onTriggerShow(p.id);
                      }}
                      className="h-7 px-2 bg-[#FFE406]/20 hover:bg-[#FFE406] border border-[#FFE406]/45 text-[#FFE406] hover:text-black text-[10px] font-black uppercase transition-colors"
                      title="Diese Einblendung sofort live im Stream abspielen"
                    >
                      Live
                    </button>
                    {presets.length > 1 && (
                      <button
                        type="button"
                        onClick={() => onDeletePreset(p.id)}
                        className="h-7 w-7 border border-white/10 bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 flex items-center justify-center"
                        aria-label="Einblendung löschen"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* =================================================================
          ACTIVE PRESET EDITOR: IMAGE DROP + TEXTS + LAYOUT
         ================================================================= */}
      {activePreset && (
        <div className="p-4 border border-white/10 bg-zinc-950/80 space-y-4">
          {/* Texts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <label className="space-y-1">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Gelber Sticker oben
              </span>
              <input
                type="text"
                value={activePreset.eyebrow}
                onChange={(e) => onUpdatePreset(activePreset.id, { eyebrow: e.target.value })}
                placeholder="z. B. HEUTIGES KGA"
                className="w-full h-9 px-2.5 bg-black/55 border border-white/15 text-xs font-extrabold uppercase text-[#FFE406] placeholder:text-slate-600 focus:outline-none focus:border-sky-400"
              />
            </label>

            <label className="space-y-1">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Haupt-Überschrift
              </span>
              <input
                type="text"
                value={activePreset.headline}
                onChange={(e) => onUpdatePreset(activePreset.id, { headline: e.target.value })}
                placeholder="z. B. Einzelkarten Giveaways heute sind:"
                className="w-full h-9 px-2.5 bg-black/55 border border-white/15 text-xs font-extrabold text-white placeholder:text-slate-600 focus:outline-none focus:border-sky-400"
              />
            </label>

            <label className="space-y-1 sm:col-span-2">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Unterzeile (optional)
              </span>
              <input
                type="text"
                value={activePreset.subline}
                onChange={(e) => onUpdatePreset(activePreset.id, { subline: e.target.value })}
                placeholder="z. B. Jeder Kauf nimmt automatisch teil!"
                className="w-full h-9 px-2.5 bg-black/55 border border-white/15 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-sky-400"
              />
            </label>
          </div>

          {/* Drag & Drop Image Area */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-200">
                Bilder per Drag &amp; Drop ({activePreset.images.length}/{MAX_SHOWCASE_IMAGES})
              </span>
              <span className="text-[11px] text-slate-400">
                Transparente PNGs (TTB, Karten) werden automatisch zugeschnitten
              </span>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => void handleFiles(e.target.files)}
            />

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                void handleFiles(e.dataTransfer.files);
              }}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              className={`min-h-[104px] p-4 border-2 border-dashed flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer transition-colors ${
                isDragging
                  ? 'border-[#FFE406] bg-[#FFE406]/10 text-white'
                  : 'border-sky-400/40 bg-black/45 hover:border-sky-400/75 hover:bg-sky-500/[0.06] text-slate-200'
              }`}
            >
              <ImagePlus className="w-6 h-6 text-sky-300" />
              <div className="text-xs font-extrabold">
                {isProcessing
                  ? 'Bilder werden optimiert & freigestellt…'
                  : 'TTB-Bild oder mehrere Einzelkarten hier reinziehen (oder klicken)'}
              </div>
              <div className="text-[11px] text-slate-400">
                1 Bild = Hero Produkt · 2–5 Bilder = Karten-Fächer · 6–10 Bilder = Galerie-Reihe
              </div>
            </div>

            {/* Uploaded Thumbnails with Reorder & Delete */}
            {activePreset.images.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 pt-1">
                {activePreset.images.map((im, idx) => (
                  <div
                    key={im.id}
                    className="relative group aspect-square border border-white/15 obs-checkerboard p-1.5 flex items-center justify-center overflow-hidden"
                  >
                    <img
                      src={im.url}
                      alt={im.label || `Bild ${idx + 1}`}
                      className="max-w-full max-h-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(im.id)}
                      aria-label={`Bild ${idx + 1} entfernen`}
                      className="absolute top-1 right-1 w-6 h-6 bg-black/85 hover:bg-rose-500 text-white flex items-center justify-center"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <div className="absolute bottom-1 inset-x-1 flex items-center justify-between gap-1">
                      <button
                        type="button"
                        onClick={() => moveImage(idx, -1)}
                        disabled={idx === 0}
                        className="w-5 h-5 bg-black/80 hover:bg-sky-400 hover:text-black disabled:opacity-30 text-white flex items-center justify-center"
                        aria-label="Nach links"
                      >
                        <ChevronLeft className="w-3 h-3" />
                      </button>
                      <span className="text-[9.5px] font-black bg-black/75 px-1 text-slate-200">
                        {idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => moveImage(idx, 1)}
                        disabled={idx === activePreset.images.length - 1}
                        className="w-5 h-5 bg-black/80 hover:bg-sky-400 hover:text-black disabled:opacity-30 text-white flex items-center justify-center"
                        aria-label="Nach rechts"
                      >
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Layout & Animation Pickers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-white/10">
            <div className="space-y-1.5">
              <span className="block text-[10.5px] font-bold uppercase tracking-[0.12em] text-slate-400">
                Anordnung / Layout
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {(
                  [
                    { id: 'auto', label: 'Auto (Smart)' },
                    { id: 'hero', label: 'Hero (TTB / 1x)' },
                    { id: 'fan', label: 'Karten-Fächer' },
                    { id: 'row', label: 'Reihe / Raster' },
                  ] as { id: ShowcaseLayout; label: string }[]
                ).map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => onUpdatePreset(activePreset.id, { layout: l.id })}
                    className={`h-8 px-2 border text-[11px] font-bold transition-colors ${
                      activePreset.layout === l.id
                        ? 'bg-sky-400/20 border-sky-400/60 text-sky-200'
                        : 'bg-black/45 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="block text-[10.5px] font-bold uppercase tracking-[0.12em] text-slate-400">
                Einblend-Animation
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    { id: 'pop', label: 'Fächer-Pop' },
                    { id: 'float-in', label: 'Aufsteigen' },
                    { id: 'spotlight', label: 'Zoom' },
                  ] as { id: ShowcaseAnimation; label: string }[]
                ).map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => onUpdateSettings('animation', a.id)}
                    className={`h-8 px-2 border text-[11px] font-bold transition-colors ${
                      settings.animation === a.id
                        ? 'bg-sky-400/20 border-sky-400/60 text-sky-200'
                        : 'bg-black/45 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Auto-Hide Duration (per-preset in rotate mode!) & Pause After Full Cycle */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-white/10">
            {settings.cycleMode === 'rotate' ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs gap-2">
                  <span className="font-bold text-slate-300 truncate">
                    Anzeigedauer ({activePreset.eyebrow || activePreset.headline || 'Aktiv'})
                  </span>
                  <span className="font-black text-[#FFE406] shrink-0">
                    {activePreset.durationSec ?? 12} Sek.
                  </span>
                </div>
                <input
                  type="range"
                  min={3}
                  max={90}
                  step={1}
                  value={activePreset.durationSec ?? 12}
                  onChange={(e) =>
                    onUpdatePreset(activePreset.id, { durationSec: Number(e.target.value) })
                  }
                  className="w-full cursor-pointer"
                />
                <div className="flex flex-wrap gap-1">
                  {[
                    { v: 6, l: '6s' },
                    { v: 10, l: '10s' },
                    { v: 15, l: '15s' },
                    { v: 20, l: '20s' },
                    { v: 30, l: '30s' },
                  ].map((opt) => (
                    <button
                      key={opt.v}
                      type="button"
                      onClick={() => onUpdatePreset(activePreset.id, { durationSec: opt.v })}
                      className={`px-2 py-0.5 text-[10px] font-bold border ${
                        (activePreset.durationSec ?? 12) === opt.v
                          ? 'bg-[#FFE406]/20 border-[#FFE406]/60 text-[#FFE406]'
                          : 'bg-black/40 border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      {opt.l}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300">Anzeigedauer pro Einblendung</span>
                  <span className="font-black text-[#FFE406]">
                    {settings.displayDurationSec === 0
                      ? 'Dauerhaft'
                      : `${settings.displayDurationSec} Sek.`}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={60}
                  step={2}
                  value={settings.displayDurationSec}
                  onChange={(e) =>
                    onUpdateSettings('displayDurationSec', Number(e.target.value))
                  }
                  className="w-full cursor-pointer"
                />
                <div className="flex flex-wrap gap-1">
                  {[
                    { v: 0, l: 'Dauerhaft' },
                    { v: 8, l: '8s' },
                    { v: 12, l: '12s' },
                    { v: 20, l: '20s' },
                    { v: 30, l: '30s' },
                  ].map((opt) => (
                    <button
                      key={opt.v}
                      type="button"
                      onClick={() => onUpdateSettings('displayDurationSec', opt.v)}
                      className={`px-2 py-0.5 text-[10px] font-bold border ${
                        settings.displayDurationSec === opt.v
                          ? 'bg-[#FFE406]/20 border-[#FFE406]/60 text-[#FFE406]'
                          : 'bg-black/40 border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      {opt.l}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300">
                  {settings.cycleMode === 'rotate'
                    ? 'Pause nach Durchlauf (unsichtbar)'
                    : 'Auto-Wiederholung (Pause)'}
                </span>
                <span className="font-black text-sky-300">
                  {settings.autoRepeatRestSec === 0
                    ? settings.cycleMode === 'rotate'
                      ? '0s (endlos)'
                      : 'Nur manuell'
                    : `${settings.autoRepeatRestSec} Sek. Pause`}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={600}
                step={5}
                value={settings.autoRepeatRestSec}
                onChange={(e) =>
                  onUpdateSettings('autoRepeatRestSec', Number(e.target.value))
                }
                className="w-full cursor-pointer"
              />
              <div className="flex flex-wrap gap-1">
                {[
                  { v: 0, l: settings.cycleMode === 'rotate' ? '0s (Endlos)' : 'Manuell' },
                  { v: 15, l: '15s' },
                  { v: 30, l: '30s' },
                  { v: 60, l: '60s' },
                  { v: 180, l: '3m' },
                ].map((opt) => (
                  <button
                    key={opt.v}
                    type="button"
                    onClick={() => onUpdateSettings('autoRepeatRestSec', opt.v)}
                    className={`px-2 py-0.5 text-[10px] font-bold border ${
                      settings.autoRepeatRestSec === opt.v
                        ? 'bg-sky-400/20 border-sky-400/60 text-sky-200'
                        : 'bg-black/40 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    {opt.l}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Title Position, Background Mode & Independent Text/Image Scaling */}
          <div className="p-3 border border-sky-400/25 bg-sky-500/[0.04] space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-black uppercase tracking-[0.14em] text-sky-300">
                Titel-Position, Hintergrund &amp; Freie Skalierung
              </span>
              <button
                type="button"
                onClick={() => {
                  onUpdateSettings('titleAnchor', 'top');
                  onUpdateSettings('titleOffsetY', 0);
                  onUpdateSettings('titleOffsetX', 0);
                  onUpdateSettings('imageOffsetY', 0);
                  onUpdateSettings('textScalePct', 100);
                  onUpdateSettings('imageScalePct', 100);
                }}
                className="px-2 py-0.5 border border-white/15 bg-black/50 hover:bg-white/10 text-[10px] font-bold text-slate-300"
              >
                Position zurücksetzen
              </button>
            </div>

            {/* Title Background Style & Sticker Toggle */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {(
                [
                  { id: 'card', label: 'Mit Karten-Hintergrund' },
                  { id: 'none', label: 'Kein Hintergrund (Nur Text)' },
                ] as { id: ShowcaseTitleBgStyle; label: string }[]
              ).map((bg) => (
                <button
                  key={bg.id}
                  type="button"
                  onClick={() => {
                    sound.playClick(620);
                    onUpdateSettings('titleBgStyle', bg.id);
                  }}
                  className={`h-9 px-2.5 border text-[11px] font-bold transition-colors ${
                    settings.titleBgStyle === bg.id
                      ? 'bg-[#FFE406]/20 border-[#FFE406]/65 text-[#FFE406]'
                      : 'bg-black/45 border-white/10 text-slate-300 hover:text-white'
                  }`}
                >
                  {bg.label}
                </button>
              ))}

              <button
                type="button"
                onClick={() => onUpdateSettings('showSticker', !settings.showSticker)}
                className={`h-9 px-2.5 border text-[11px] font-bold transition-colors ${
                  settings.showSticker
                    ? 'bg-sky-400/15 border-sky-400/60 text-sky-200'
                    : 'bg-black/45 border-white/10 text-slate-400'
                }`}
              >
                Gelber Sticker: {settings.showSticker ? 'An' : 'Aus'}
              </button>
            </div>

            {/* Title Anchor Quick Position */}
            <div className="space-y-1.5">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Titel-Anker (Grundposition)
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    { id: 'top', label: 'Oben' },
                    { id: 'overlay', label: 'Mitte (über Bild)' },
                    { id: 'bottom', label: 'Unten' },
                  ] as { id: ShowcaseTitleAnchor; label: string }[]
                ).map((anc) => (
                  <button
                    key={anc.id}
                    type="button"
                    onClick={() => {
                      sound.playClick(600);
                      onUpdateSettings('titleAnchor', anc.id);
                      onUpdateSettings('titleOffsetY', 0);
                    }}
                    className={`h-8 px-2 border text-[11px] font-bold transition-colors ${
                      settings.titleAnchor === anc.id
                        ? 'bg-sky-400/20 border-sky-400/60 text-sky-200'
                        : 'bg-black/45 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    {anc.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Free Position & Independent Scaling Sliders */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300">Titel Hoch / Runter (Y)</span>
                  <span className="font-black text-sky-300">
                    {settings.titleOffsetY > 0 ? `+${settings.titleOffsetY}` : settings.titleOffsetY} px
                  </span>
                </div>
                <input
                  type="range"
                  min={-240}
                  max={240}
                  step={4}
                  value={settings.titleOffsetY}
                  onChange={(e) => onUpdateSettings('titleOffsetY', Number(e.target.value))}
                  className="w-full cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300">Titel Links / Rechts (X)</span>
                  <span className="font-black text-sky-300">
                    {settings.titleOffsetX > 0 ? `+${settings.titleOffsetX}` : settings.titleOffsetX} px
                  </span>
                </div>
                <input
                  type="range"
                  min={-200}
                  max={200}
                  step={4}
                  value={settings.titleOffsetX}
                  onChange={(e) => onUpdateSettings('titleOffsetX', Number(e.target.value))}
                  className="w-full cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300">Text-Größe (unabhängig)</span>
                  <span className="font-black text-[#FFE406]">{settings.textScalePct}%</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={220}
                  step={5}
                  value={settings.textScalePct}
                  onChange={(e) => onUpdateSettings('textScalePct', Number(e.target.value))}
                  className="w-full cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300">Bild-Größe (TTB / Karten)</span>
                  <span className="font-black text-amber-300">{settings.imageScalePct}%</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={200}
                  step={5}
                  value={settings.imageScalePct}
                  onChange={(e) => onUpdateSettings('imageScalePct', Number(e.target.value))}
                  className="w-full cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300">Bilder Hoch / Runter (Y)</span>
                  <span className="font-black text-slate-200">
                    {settings.imageOffsetY > 0 ? `+${settings.imageOffsetY}` : settings.imageOffsetY} px
                  </span>
                </div>
                <input
                  type="range"
                  min={-160}
                  max={160}
                  step={4}
                  value={settings.imageOffsetY}
                  onChange={(e) => onUpdateSettings('imageOffsetY', Number(e.target.value))}
                  className="w-full cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300">Gesamt-Größe</span>
                  <span className="font-black text-slate-200">{settings.scalePct}%</span>
                </div>
                <input
                  type="range"
                  min={60}
                  max={160}
                  step={5}
                  value={settings.scalePct}
                  onChange={(e) => onUpdateSettings('scalePct', Number(e.target.value))}
                  className="w-full cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Quality & Glow */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-white/10 items-end">
            <div className="space-y-1">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                OBS Schärfe
              </span>
              <div className="grid grid-cols-3 gap-1">
                {([1, 1.5, 2] as OverlayQualityScale[]).map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => onUpdateSettings('qualityScale', q)}
                    className={`h-8 border text-[11px] font-black ${
                      settings.qualityScale === q
                        ? 'bg-emerald-400/15 border-emerald-400/60 text-emerald-200'
                        : 'bg-black/45 border-white/10 text-slate-400'
                    }`}
                  >
                    {q}×
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => onUpdateSettings('showGlow', !settings.showGlow)}
              className={`h-8 px-3 border text-xs font-bold transition-colors ${
                settings.showGlow
                  ? 'bg-sky-400/15 border-sky-400/60 text-sky-200'
                  : 'bg-black/45 border-white/15 text-slate-400'
              }`}
            >
              Spotlight-Glow: {settings.showGlow ? 'An' : 'Aus'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
