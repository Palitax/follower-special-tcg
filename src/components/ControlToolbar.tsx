'use client';

import React, { useState } from 'react';
import { PlaymatTheme } from '../types/card';
import { sound } from '../utils/sound';
import {
  RotateCcw,
  ArrowLeftRight,
  Maximize,
  Minimize,
  Volume2,
  VolumeX,
  Palette,
  Dices,
  Sparkles,
  LayoutGrid,
  RefreshCw,
  Sliders,
  Play,
  Edit3,
} from 'lucide-react';

interface ControlToolbarProps {
  isEditMode: boolean;
  onToggleEditMode: () => void;
  onFlipBoth: () => void;
  onSwapCards: () => void;
  onResetAll: () => void;
  currentTheme: PlaymatTheme;
  onChangeTheme: (theme: PlaymatTheme) => void;
  onOpenPresets: () => void;
  onOpenTools: () => void;
}

export const ControlToolbar: React.FC<ControlToolbarProps> = ({
  isEditMode,
  onToggleEditMode,
  onFlipBoth,
  onSwapCards,
  onResetAll,
  currentTheme,
  onChangeTheme,
  onOpenPresets,
  onOpenTools,
}) => {
  const [isMuted, setIsMuted] = useState(sound.getMuted());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    sound.setMuted(next);
    if (!next) sound.playClick(700);
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
        sound.playClick(800);
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
          setIsFullscreen(false);
          sound.playClick(600);
        }
      }
    } catch (e) {
      console.warn('Fullscreen request rejected or not supported on this browser', e);
      // On iOS Safari, we can notify the user
      alert('Tipp: Auf dem iPad im Safari Teilen-Menü "Zum Home-Bildschirm" wählen, um die App im echten randlosen Fullscreen-Modus zu nutzen!');
    }
  };

  const THEMES: { id: PlaymatTheme; label: string; iconColor: string }[] = [
    { id: 'dark-carbon', label: 'Dark Carbon', iconColor: 'bg-zinc-800' },
    { id: 'felt-green', label: 'Felt Green (Matte)', iconColor: 'bg-emerald-800' },
    { id: 'cyber-neon', label: 'Cyber Neon', iconColor: 'bg-cyan-700' },
    { id: 'mystic-violet', label: 'Mystic Galaxy', iconColor: 'bg-purple-800' },
    { id: 'wood-mahogany', label: 'Wood Table', iconColor: 'bg-amber-900' },
  ];

  return (
    <div className="fixed bottom-3 inset-x-0 z-40 flex items-center justify-center px-3 pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 rounded-2xl bg-black/75 backdrop-blur-xl border border-white/20 shadow-2xl shadow-black/80">
        
        {/* Play / Edit Mode Toggle Button */}
        <button
          onClick={() => {
            sound.playClick(750);
            onToggleEditMode();
          }}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs transition-all active:scale-95 ${
            isEditMode
              ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/30'
              : 'bg-white/10 text-white hover:bg-white/20'
          }`}
          title={isEditMode ? 'Zurück zum Play-Modus' : 'In den Editier-Modus wechseln'}
        >
          {isEditMode ? <Edit3 className="w-4 h-4" /> : <Play className="w-4 h-4 text-emerald-400" />}
          <span className="hidden sm:inline">{isEditMode ? 'Edit Mode' : 'Play Mode'}</span>
        </button>

        <div className="h-5 w-[1px] bg-white/20 mx-0.5" />

        {/* Flip Both Cards */}
        <button
          onClick={() => {
            sound.playCardFlip();
            onFlipBoth();
          }}
          className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold active:scale-95 transition-all"
          title="Beide Karten gleichzeitig umdrehen"
        >
          <RotateCcw className="w-4 h-4 text-amber-400" />
          <span className="hidden md:inline">Beide umdrehen</span>
        </button>

        {/* Swap Cards Positions */}
        <button
          onClick={() => {
            sound.playClick(600);
            onSwapCards();
          }}
          className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white active:scale-95 transition-all"
          title="Kartenplätze tauschen (Links / Rechts)"
        >
          <ArrowLeftRight className="w-4 h-4 text-cyan-400" />
        </button>

        {/* Presets Drawer Button */}
        <button
          onClick={() => {
            sound.playClick(650);
            onOpenPresets();
          }}
          className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-gradient-to-r from-purple-600/80 to-indigo-600/80 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold active:scale-95 transition-all shadow-md shadow-purple-600/20"
          title="TCG Vorlagen laden (Pokémon, MTG, Yu-Gi-Oh, One Piece)"
        >
          <LayoutGrid className="w-4 h-4 text-purple-200" />
          <span>Presets</span>
        </button>

        {/* Dice & Coin Mini-Tools */}
        <button
          onClick={() => {
            sound.playClick(700);
            onOpenTools();
          }}
          className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-yellow-400 active:scale-95 transition-all"
          title="Würfel & Münzwurf Tool"
        >
          <Dices className="w-4 h-4" />
        </button>

        {/* Playmat Theme Selector */}
        <div className="relative">
          <button
            onClick={() => {
              sound.playClick(500);
              setShowThemeMenu(!showThemeMenu);
            }}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-emerald-400 active:scale-95 transition-all"
            title="Spielfeld / Matte Design ändern"
          >
            <Palette className="w-4 h-4" />
          </button>

          {showThemeMenu && (
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 bg-stone-900 border border-white/20 rounded-xl p-2 shadow-2xl space-y-1">
              <span className="block text-[10px] font-extrabold uppercase text-slate-400 px-2 py-1">
                Playmat Matte
              </span>
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    onChangeTheme(t.id);
                    setShowThemeMenu(false);
                    sound.playClick(600);
                  }}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    currentTheme === t.id
                      ? 'bg-yellow-400/20 text-yellow-300 font-bold'
                      : 'text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <span className={`w-3 h-3 rounded-full ${t.iconColor} border border-white/30`} />
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sound Toggle */}
        <button
          onClick={toggleMute}
          className={`p-2 rounded-xl transition-all active:scale-95 ${
            isMuted ? 'bg-rose-500/20 text-rose-400' : 'bg-white/10 text-white hover:bg-white/20'
          }`}
          title={isMuted ? 'Sound einschalten' : 'Sound stummschalten'}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
        </button>

        {/* Reset All */}
        <button
          onClick={() => {
            if (confirm('Möchtest du alle Karten und Zähler auf die Standardwerte zurücksetzen?')) {
              sound.playClick(400);
              onResetAll();
            }
          }}
          className="p-2 rounded-xl bg-white/10 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 active:scale-95 transition-all"
          title="Karten zurücksetzen"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        {/* Fullscreen Toggle */}
        <button
          onClick={toggleFullscreen}
          className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white active:scale-95 transition-all"
          title="Vollbildmodus aktivieren"
        >
          {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};
