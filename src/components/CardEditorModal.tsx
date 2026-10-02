'use client';

import React, { useState } from 'react';
import { TcgCardData, CardSideData, CardCounter, HoloEffectType } from '../types/card';
import { sound } from '../utils/sound';
import {
  X,
  Plus,
  Trash2,
  Image as ImageIcon,
  Sparkles,
  Upload,
  Check,
  Palette,
  Layers,
} from 'lucide-react';

interface CardEditorModalProps {
  card: TcgCardData | null;
  initialSide?: 'front' | 'back';
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedCard: TcgCardData) => void;
}

const PRESET_IMAGES = [
  { label: 'Gold Abstract', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop' },
  { label: 'Cosmic Nebula', url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?q=80&w=1000&auto=format&fit=crop' },
  { label: 'Cyber Grid', url: 'https://images.unsplash.com/photo-1563089145-599997674d42?q=80&w=1000&auto=format&fit=crop' },
  { label: 'Fire & Dragon', url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1000&auto=format&fit=crop' },
  { label: 'Magic Card Back', url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=1000&auto=format&fit=crop' },
  { label: 'Blue Galaxy Back', url: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?q=80&w=1000&auto=format&fit=crop' },
  { label: 'Dark Portal', url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1000&auto=format&fit=crop' },
  { label: 'Mystic Spells', url: 'https://images.unsplash.com/photo-1514533450685-4493e01d1fdc?q=80&w=1000&auto=format&fit=crop' },
];

export const CardEditorModal: React.FC<CardEditorModalProps> = ({
  card,
  initialSide = 'front',
  isOpen,
  onClose,
  onSave,
}) => {
  if (!isOpen || !card) return null;

  const [activeSide, setActiveSide] = useState<'front' | 'back'>(initialSide);
  const [editedCard, setEditedCard] = useState<TcgCardData>({ ...card });

  const currentSideData: CardSideData = editedCard[activeSide];

  const updateSideField = <K extends keyof CardSideData>(field: K, value: CardSideData[K]) => {
    setEditedCard((prev) => ({
      ...prev,
      [activeSide]: {
        ...prev[activeSide],
        [field]: value,
      },
    }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          updateSideField('imageUrl', event.target.result as string);
          sound.playClick(700);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddCounter = () => {
    sound.playClick(650);
    const newCounter: CardCounter = {
      id: 'c_' + Date.now(),
      label: 'Neuer Zähler',
      value: 10,
      step: 1,
      color: 'text-yellow-400',
    };
    updateSideField('counters', [...currentSideData.counters, newCounter]);
  };

  const handleUpdateCounter = (index: number, updated: Partial<CardCounter>) => {
    const newCounters = [...currentSideData.counters];
    newCounters[index] = { ...newCounters[index], ...updated };
    updateSideField('counters', newCounters);
  };

  const handleDeleteCounter = (index: number) => {
    sound.playClick(400);
    const newCounters = currentSideData.counters.filter((_, i) => i !== index);
    updateSideField('counters', newCounters);
  };

  const handleSave = () => {
    sound.playShimmer();
    onSave(editedCard);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-stone-900 border border-white/20 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-black/40">
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-yellow-400" />
            <h2 className="text-lg font-bold text-white">Karte bearbeiten & anpassen</h2>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Side Tabs (Front / Back) */}
        <div className="flex border-b border-white/10 bg-black/20 p-2 gap-2">
          <button
            onClick={() => {
              sound.playClick(500);
              setActiveSide('front');
            }}
            className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
              activeSide === 'front'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-black shadow-lg'
                : 'text-slate-300 hover:bg-white/5'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Vorderseite (Front)</span>
          </button>

          <button
            onClick={() => {
              sound.playClick(500);
              setActiveSide('back');
            }}
            className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
              activeSide === 'back'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-black shadow-lg'
                : 'text-slate-300 hover:bg-white/5'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Rückseite (Back)</span>
          </button>
        </div>

        {/* Modal Body / Form */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 text-sm">
          {/* Section: Titles & Text */}
          <div className="space-y-3">
            <h3 className="text-xs uppercase font-extrabold tracking-wider text-yellow-400">
              Texte & Beschriftung ({activeSide === 'front' ? 'Vorderseite' : 'Rückseite'})
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Kartentitel / Name
              </label>
              <input
                type="text"
                value={currentSideData.title}
                onChange={(e) => updateSideField('title', e.target.value)}
                placeholder="z.B. Glurak EX, 10k Follower Special..."
                className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/15 text-white focus:border-yellow-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Untertitel / Typ / Kategorie
              </label>
              <input
                type="text"
                value={currentSideData.subtitle}
                onChange={(e) => updateSideField('subtitle', e.target.value)}
                placeholder="z.B. Phase 2 Pokémon, Legendary Artifact..."
                className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/15 text-white focus:border-yellow-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Notizen / Kartentext / Regelbeschreibung
              </label>
              <textarea
                rows={2}
                value={currentSideData.notes}
                onChange={(e) => updateSideField('notes', e.target.value)}
                placeholder="z.B. Attackentext, Gewinnspiel-Code, Livestream Notizen..."
                className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/15 text-white focus:border-yellow-400 focus:outline-none resize-none"
              />
            </div>
          </div>

          <hr className="border-white/10" />

          {/* Section: Image & Hologram */}
          <div className="space-y-3">
            <h3 className="text-xs uppercase font-extrabold tracking-wider text-yellow-400 flex items-center gap-1.5">
              <ImageIcon className="w-4 h-4" />
              <span>Kartenbild & Holo-Foil Glanzeffekt</span>
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Bild-URL oder Datei hochladen (iPad Fotos / Kamera)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={currentSideData.imageUrl}
                  onChange={(e) => updateSideField('imageUrl', e.target.value)}
                  placeholder="https://..."
                  className="flex-1 px-3 py-2 rounded-lg bg-black/50 border border-white/15 text-white text-xs focus:border-yellow-400 focus:outline-none"
                />
                <label className="flex items-center gap-1 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer transition-colors text-xs font-medium">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Foto</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Quick Preset Images */}
            <div>
              <span className="block text-xs text-slate-400 mb-1.5">Schnellauswahl Hintergründe:</span>
              <div className="grid grid-cols-4 gap-2">
                {PRESET_IMAGES.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      updateSideField('imageUrl', preset.url);
                      sound.playClick(600);
                    }}
                    className={`relative rounded-lg overflow-hidden border h-14 transition-all ${
                      currentSideData.imageUrl === preset.url
                        ? 'border-yellow-400 ring-2 ring-yellow-400/40'
                        : 'border-white/10 hover:border-white/30'
                    }`}
                  >
                    <div
                      className="absolute inset-0 bg-cover bg-center"
                      style={{ backgroundImage: `url(${preset.url})` }}
                    />
                    <span className="absolute bottom-0 inset-x-0 bg-black/75 text-[10px] text-white truncate px-1 py-0.5 text-center font-medium">
                      {preset.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Holo Effect Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                <span>Holographischer Foil-Effekt</span>
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {(['none', 'rainbow', 'cosmo', 'gold', 'silver', 'galaxy', 'neon'] as HoloEffectType[]).map(
                  (effect) => (
                    <button
                      key={effect}
                      type="button"
                      onClick={() => {
                        updateSideField('holoEffect', effect);
                        sound.playShimmer();
                      }}
                      className={`py-2 px-2.5 rounded-lg border text-xs font-bold capitalize transition-all ${
                        currentSideData.holoEffect === effect
                          ? 'border-yellow-400 bg-yellow-400/20 text-yellow-300'
                          : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      {effect === 'none' ? 'Kein Foil' : effect}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Card Border Style */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Kartenrahmen (Rahmen-Design)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: 'classic-black', label: 'Classic Black' },
                    { id: 'gold-border', label: 'Gold Metallic' },
                    { id: 'silver-border', label: 'Silver Metallic' },
                    { id: 'neon-cyan', label: 'Neon Cyan' },
                    { id: 'neon-magenta', label: 'Neon Pink' },
                    { id: 'minimal', label: 'Minimal Clean' },
                  ] as const
                ).map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => {
                      setEditedCard((prev) => ({ ...prev, borderStyle: b.id }));
                      sound.playClick(500);
                    }}
                    className={`py-2 px-2 rounded-lg border text-xs font-bold transition-all ${
                      editedCard.borderStyle === b.id
                        ? 'border-yellow-400 bg-yellow-400/20 text-yellow-300'
                        : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <hr className="border-white/10" />

          {/* Section: Counters & Values */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs uppercase font-extrabold tracking-wider text-yellow-400">
                Zähler & Werte ({currentSideData.counters.length})
              </h3>
              <button
                type="button"
                onClick={handleAddCounter}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 text-xs font-bold hover:bg-yellow-500/30"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Zähler hinzufügen</span>
              </button>
            </div>

            <div className="space-y-2">
              {currentSideData.counters.map((counter, idx) => (
                <div
                  key={counter.id}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-black/40 border border-white/10"
                >
                  <div className="flex-1 grid grid-cols-3 gap-2">
                    <div>
                      <span className="block text-[10px] text-slate-400 mb-0.5">Name / Label</span>
                      <input
                        type="text"
                        value={counter.label}
                        onChange={(e) => handleUpdateCounter(idx, { label: e.target.value })}
                        placeholder="z.B. HP, ATK..."
                        className="w-full px-2 py-1 bg-black/60 border border-white/15 rounded text-xs text-white"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400 mb-0.5">Aktueller Wert</span>
                      <input
                        type="number"
                        value={counter.value}
                        onChange={(e) => handleUpdateCounter(idx, { value: parseInt(e.target.value, 10) || 0 })}
                        className="w-full px-2 py-1 bg-black/60 border border-white/15 rounded text-xs text-yellow-400 font-bold"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400 mb-0.5">Schrittweite (+ / -)</span>
                      <input
                        type="number"
                        value={counter.step || 1}
                        onChange={(e) => handleUpdateCounter(idx, { step: parseInt(e.target.value, 10) || 1 })}
                        className="w-full px-2 py-1 bg-black/60 border border-white/15 rounded text-xs text-white"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteCounter(idx)}
                    className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Zähler löschen"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-white/10 bg-black/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-300 hover:bg-white/10 font-semibold transition-colors"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-extrabold shadow-lg shadow-amber-500/25 hover:from-amber-400 hover:to-yellow-400 active:scale-95 transition-all"
          >
            <Check className="w-4 h-4" />
            <span>Änderungen speichern</span>
          </button>
        </div>
      </div>
    </div>
  );
};
