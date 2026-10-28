'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { TcgCardData, PlaymatTheme, CardRarity } from '../types/card';
import { TcgCard } from '../components/TcgCard';
import { EmptyCardSlot } from '../components/EmptyCardSlot';
import { CardSetupModal } from '../components/CardSetupModal';
import { PlaymatBackground } from '../components/PlaymatBackground';
import { Header } from '../components/Header';
import { DiceCoinTool } from '../components/DiceCoinTool';
import { sound } from '../utils/sound';
import confetti from 'canvas-confetti';
import {
  RotateCcw,
  ArrowLeftRight,
  Maximize,
  Minimize,
  Volume2,
  VolumeX,
  Palette,
  Dices,
  Home,
  Layers,
  Flame,
  Sparkles,
  Smartphone,
  Monitor,
  Eye,
} from 'lucide-react';

const STORAGE_KEY_CARDS = 'tcg_cards_pokemon_front_v8';
const STORAGE_KEY_CARDS_LEGACY = 'tcg_cards_pokemon_front_v7';
const STORAGE_KEY_THEME = 'tcg_theme_pokemon_front_v8';
const STORAGE_KEY_RARITY = 'tcg_rarity_v8';
const STORAGE_KEY_VERTICAL = 'tcg_vertical_mode_v8';

const RARITY_CONFIG: Record<
  CardRarity,
  {
    label: string;
    phaseLabel: string;
    badgeClass: string;
    buttonClass: string;
    confettiColors: string[];
  }
> = {
  rare: {
    label: 'Rare (Blau Mana)',
    phaseLabel: 'Phase 1 · Rare',
    badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/50 shadow-[0_0_12px_rgba(56,189,248,0.35)]',
    buttonClass: 'from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-cyan-500/30',
    confettiColors: ['#38bdf8', '#0ea5e9', '#bae6fd', '#0284c7'],
  },
  epic: {
    label: 'Epic (Lila Arcane)',
    phaseLabel: 'Phase 2 · Epic',
    badgeClass: 'bg-purple-500/25 text-purple-200 border-purple-400/60 shadow-[0_0_15px_rgba(192,132,252,0.5)]',
    buttonClass: 'from-purple-600 via-fuchsia-500 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-purple-500/40',
    confettiColors: ['#c084fc', '#e879f9', '#9333ea', '#f0abfc'],
  },
  legendary: {
    label: 'Legendary (Molten Lava)',
    phaseLabel: 'Phase 3 · Legendary',
    badgeClass: 'bg-amber-500/25 text-amber-200 border-amber-400/70 shadow-[0_0_18px_rgba(251,146,60,0.65)]',
    buttonClass: 'from-amber-400 via-orange-500 to-red-600 hover:from-amber-300 hover:to-red-500 shadow-orange-500/50',
    confettiColors: ['#facc15', '#f97316', '#ef4444', '#fde047'],
  },
};

export default function HomeView() {
  const [cards, setCards] = useState<TcgCardData[]>([]);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [theme, setTheme] = useState<PlaymatTheme>('dark-carbon');
  const [rarity, setRarity] = useState<CardRarity>('rare');
  const [isVerticalMode, setIsVerticalMode] = useState(false);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(sound.getMuted());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showRarityMenu, setShowRarityMenu] = useState(false);

  // Load from LocalStorage (preserving individual uploaded card images)
  useEffect(() => {
    try {
      const savedCards =
        localStorage.getItem(STORAGE_KEY_CARDS) ||
        localStorage.getItem(STORAGE_KEY_CARDS_LEGACY);
      if (savedCards) {
        const parsed = JSON.parse(savedCards);
        if (Array.isArray(parsed)) {
          const updated = parsed.map((c, idx) => ({
            ...c,
            front: {
              ...c.front,
              imageUrl: c.front?.imageUrl || '/images/pokemon-energy-front.png',
              imageFit: c.front?.imageFit || 'contain',
            },
            back: {
              ...c.back,
              imageUrl: '/images/card-back-water.jpg',
              counters:
                c.back?.counters && c.back.counters.length > 0
                  ? c.back.counters
                  : [{ id: 'cnt_1', label: '', value: idx + 1, step: 1 }],
            },
          }));
          setCards(updated);
        }
      }
      const savedTheme = localStorage.getItem(STORAGE_KEY_THEME) as PlaymatTheme | null;
      if (savedTheme) {
        setTheme(savedTheme);
      }
      const savedRarity = localStorage.getItem(STORAGE_KEY_RARITY) as CardRarity | null;
      if (savedRarity === 'rare' || savedRarity === 'epic' || savedRarity === 'legendary') {
        setRarity(savedRarity);
      }
      const savedVertical = localStorage.getItem(STORAGE_KEY_VERTICAL);
      if (savedVertical === 'true') {
        setIsVerticalMode(true);
      }
    } catch (e) {
      console.warn('LocalStorage load error', e);
    } finally {
      setHasInitialized(true);
    }
  }, []);

  // Save to LocalStorage
  useEffect(() => {
    if (!hasInitialized) return;
    try {
      localStorage.setItem(STORAGE_KEY_CARDS, JSON.stringify(cards));
      localStorage.setItem(STORAGE_KEY_THEME, theme);
      localStorage.setItem(STORAGE_KEY_RARITY, rarity);
      localStorage.setItem(STORAGE_KEY_VERTICAL, String(isVerticalMode));
    } catch (e) {
      console.warn('LocalStorage save error', e);
    }
  }, [cards, theme, rarity, isVerticalMode, hasInitialized]);

  // Sync fullscreen change events (browser or Esc)
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isDocFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isDocFullscreen);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const exitFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch (e) {
      console.warn('Exit fullscreen failed', e);
    }
    setIsFullscreen(false);
  }, []);

  // Flip All Cards
  const handleFlipAll = useCallback(() => {
    setCards((prev) => prev.map((c) => ({ ...c, isFlipped: !c.isFlipped })));
  }, []);

  // Set All Cards to Back (Number side 1..X) or Front (Prize side)
  const handleSetAllFlipped = useCallback((showNumbersSide: boolean) => {
    sound.playCardFlip();
    setCards((prev) =>
      prev.map((c, idx) => ({
        ...c,
        isFlipped: showNumbersSide,
        back: {
          ...c.back,
          counters: [
            {
              ...(c.back.counters[0] || { id: 'cnt_1', label: '', step: 1 }),
              value: c.back.counters[0]?.value ?? idx + 1,
            },
          ],
        },
      }))
    );
  }, []);

  // GIVEAWAY LEVEL UP:
  // Advances Rarity (Rare -> Epic -> Legendary -> Rare) AND flips all cards 1..X back to the Number Side!
  const handleGiveawayLevelUp = useCallback(
    (targetRarity?: CardRarity) => {
      const nextRarity: CardRarity =
        targetRarity ??
        (rarity === 'rare' ? 'epic' : rarity === 'epic' ? 'legendary' : 'rare');

      setRarity(nextRarity);
      sound.playLevelUp(nextRarity);

      // Turn all cards back to the number side (1..X) so the new giveaway round starts fresh
      setCards((prev) =>
        prev.map((c, idx) => ({
          ...c,
          isFlipped: true, // true = Back side with big number 1..X
          back: {
            ...c.back,
            counters: [
              {
                ...(c.back.counters[0] || { id: 'cnt_1', label: '', step: 1 }),
                value: c.back.counters[0]?.value || idx + 1,
              },
            ],
          },
        }))
      );

      // Trigger celebratory particle burst matching the new rarity
      const colors = RARITY_CONFIG[nextRarity].confettiColors;
      confetti({
        particleCount: nextRarity === 'legendary' ? 95 : nextRarity === 'epic' ? 65 : 40,
        spread: 75,
        origin: { y: 0.6 },
        colors,
      });
    },
    [rarity]
  );

  // Keyboard Shortcuts (Space: flip all, L: Giveaway Level Up, V: Vertical mode, Esc: exit fullscreen, C: confetti)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (e.key === 'Escape' || e.code === 'Escape') {
        if (isFullscreen) {
          e.preventDefault();
          exitFullscreen();
          sound.playClick(600);
        }
      } else if (e.code === 'Space') {
        e.preventDefault();
        sound.playCardFlip();
        handleFlipAll();
      } else if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        handleGiveawayLevelUp();
      } else if (e.key === 'v' || e.key === 'V') {
        e.preventDefault();
        sound.playClick(650);
        setIsVerticalMode((prev) => !prev);
      } else if (e.key === 'c' || e.key === 'C') {
        sound.playShimmer();
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: RARITY_CONFIG[rarity].confettiColors,
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, exitFullscreen, handleFlipAll, handleGiveawayLevelUp, rarity]);

  // Create N cards with Pokémon card front & ManaCards back (starting on Rare)
  const handleGenerateCards = (count: number) => {
    const safeCount = Math.max(1, Math.min(100, count));
    const newCards: TcgCardData[] = [];
    for (let i = 0; i < safeCount; i++) {
      newCards.push({
        id: 'card_' + (i + 1) + '_' + Date.now(),
        name: `Karte #${i + 1}`,
        isFlipped: true, // Start showing numbers 1..N on the back (can flip in preview to upload prize image)
        rotation: 0,
        borderStyle: 'neon-cyan',
        front: {
          title: `Karte #${i + 1}`,
          subtitle: '',
          notes: '',
          imageUrl: '/images/pokemon-energy-front.png',
          imageFit: 'contain',
          holoEffect: 'none',
          counters: [],
        },
        back: {
          title: '',
          subtitle: '',
          notes: '',
          imageUrl: '/images/card-back-water.jpg',
          holoEffect: 'none',
          counters: [
            {
              id: 'cnt_1',
              label: '',
              value: i + 1,
              step: 1,
            },
          ],
        },
      });
    }
    setCards(newCards);
    setRarity('rare');
  };

  // Flip Single Card
  const handleFlipCard = (cardId: string) => {
    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, isFlipped: !c.isFlipped } : c))
    );
  };

  // Rotate Card
  const handleRotateCard = (cardId: string) => {
    setCards((prev) =>
      prev.map((c) =>
        c.id === cardId ? { ...c, rotation: (c.rotation + 90) % 360 } : c
      )
    );
  };

  // Delete Single Card
  const handleDeleteCard = (cardId: string) => {
    setCards((prev) => prev.filter((c) => c.id !== cardId));
  };

  // Update Front Text
  const handleUpdateFrontText = (cardId: string, text: string) => {
    setCards((prev) =>
      prev.map((c) => {
        if (c.id !== cardId) return c;
        return {
          ...c,
          front: {
            ...c.front,
            notes: text,
          },
        };
      })
    );
  };

  // Update Front Individual Prize Image
  const handleUpdateFrontImage = (
    cardId: string,
    imageUrl: string,
    imageFit: 'cover' | 'contain' = 'contain'
  ) => {
    setCards((prev) =>
      prev.map((c) => {
        if (c.id !== cardId) return c;
        return {
          ...c,
          front: {
            ...c.front,
            imageUrl,
            imageFit,
          },
        };
      })
    );
  };

  // Update Back Number
  const handleUpdateBackNumber = (cardId: string, numberValue: number) => {
    setCards((prev) =>
      prev.map((c) => {
        if (c.id !== cardId) return c;
        const currentCounter = c.back.counters[0] || { id: 'c1', label: '', value: 0 };
        return {
          ...c,
          back: {
            ...c.back,
            counters: [
              {
                ...currentCounter,
                value: numberValue,
              },
            ],
          },
        };
      })
    );
  };

  // Swap / Reverse Order
  const handleSwapCards = () => {
    setCards((prev) => [...prev].reverse());
  };

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
        await exitFullscreen();
        sound.playClick(600);
      }
    } catch (e) {
      console.warn('Fullscreen request error', e);
      setIsFullscreen(!isFullscreen);
    }
  };

  const THEMES: { id: PlaymatTheme; label: string; color: string }[] = [
    { id: 'dark-carbon', label: 'Dark Carbon', color: 'bg-zinc-800' },
    { id: 'felt-green', label: 'Felt Green', color: 'bg-emerald-800' },
    { id: 'cyber-neon', label: 'Cyber Neon', color: 'bg-cyan-700' },
    { id: 'mystic-violet', label: 'Mystic Galaxy', color: 'bg-purple-800' },
    { id: 'wood-mahogany', label: 'Wood Table', color: 'bg-amber-900' },
  ];

  const nextRarityLabel =
    rarity === 'rare' ? 'Epic (Lila)' : rarity === 'epic' ? 'Legendary (Lava)' : 'Rare (Reset)';

  return (
    <main className="relative w-screen h-screen overflow-hidden flex items-center justify-center bg-black select-none">
      {/* =====================================================================
          STAGE CONTAINER:
          When isVerticalMode is active (for Whatnot / Instagram 9:16 streams),
          nothing is rendered on the left or right outside this 9:16 portrait stage!
         ===================================================================== */}
      <div
        className={`relative h-screen flex flex-col justify-between overflow-hidden transition-all duration-300 ${
          isVerticalMode
            ? 'aspect-[9/16] w-auto max-w-full bg-black shadow-[0_0_80px_rgba(0,0,0,1)]'
            : 'w-screen'
        }`}
      >
        {/* Dynamic Playmat Background (strictly inside stage so left/right stay pure black in 9:16 mode) */}
        <PlaymatBackground theme={theme} />

        {/* Top Header - Hidden in Fullscreen Mode */}
        {!isFullscreen && (
          <Header
            onNewSetup={() => setIsSetupModalOpen(true)}
            onResetCards={() => setCards([])}
            hasCards={cards.length > 0}
          />
        )}

        {/* Fullscreen Discreet Top Control Bar (Level Up, Rarity, Vertical Toggle, Esc) */}
        {isFullscreen && (
          <div className="relative z-50 w-full px-3 pt-2.5 pb-1 flex flex-wrap items-center justify-between gap-2 opacity-30 hover:opacity-100 focus-within:opacity-100 transition-opacity duration-300 pointer-events-auto">
            {/* Left: Current Rarity Badge & Direct Rarity Switcher */}
            <div className="flex items-center gap-1 bg-black/85 backdrop-blur-md p-1 rounded-full border border-white/15 shadow-xl">
              {(['rare', 'epic', 'legendary'] as CardRarity[]).map((r) => (
                <button
                  key={r}
                  onClick={() => handleGiveawayLevelUp(r)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 ${
                    rarity === r
                      ? r === 'legendary'
                        ? 'bg-gradient-to-r from-amber-400 via-orange-500 to-red-600 text-black shadow-[0_0_12px_rgba(251,146,60,0.8)]'
                        : r === 'epic'
                        ? 'bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white shadow-[0_0_12px_rgba(192,132,252,0.8)]'
                        : 'bg-gradient-to-r from-cyan-400 to-blue-500 text-black shadow-[0_0_10px_rgba(56,189,248,0.8)]'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title={`Zu ${RARITY_CONFIG[r].label} wechseln & Karten auf 1–${cards.length} drehen`}
                >
                  {r === 'rare' ? 'Rare' : r === 'epic' ? 'Epic' : 'Legendary'}
                </button>
              ))}
            </div>

            {/* Center/Right: Giveaway Level Up Button + 9:16 Toggle + Esc */}
            <div className="flex items-center gap-1.5">
              {cards.length > 0 && (
                <button
                  onClick={() => handleGiveawayLevelUp()}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r ${
                    rarity === 'rare'
                      ? 'from-purple-600 via-fuchsia-500 to-indigo-600 text-white shadow-[0_0_20px_rgba(192,132,252,0.7)]'
                      : rarity === 'epic'
                      ? 'from-amber-400 via-orange-500 to-red-600 text-black shadow-[0_0_24px_rgba(251,146,60,0.85)]'
                      : 'from-cyan-400 via-sky-500 to-blue-600 text-black shadow-[0_0_18px_rgba(56,189,248,0.7)]'
                  } font-black text-xs active:scale-95 transition-all border border-white/30`}
                  title={`Giveaway Level Up (${nextRarityLabel}) – dreht alle Karten auf 1 bis ${cards.length}`}
                >
                  <Flame className="w-3.5 h-3.5" />
                  <span>Giveaway Level Up ({nextRarityLabel})</span>
                </button>
              )}

              <button
                onClick={() => {
                  sound.playClick(650);
                  setIsVerticalMode((v) => !v);
                }}
                className={`px-2.5 py-1.5 rounded-full backdrop-blur-md border text-xs font-bold flex items-center gap-1 shadow-xl active:scale-95 transition-all ${
                  isVerticalMode
                    ? 'bg-emerald-500/30 border-emerald-400 text-emerald-200'
                    : 'bg-black/80 border-white/20 text-slate-300 hover:text-white'
                }`}
                title="Vertikaler 9:16 Modus (Whatnot / Instagram)"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">9:16</span>
              </button>

              <button
                onClick={() => {
                  exitFullscreen();
                  sound.playClick(600);
                }}
                className="px-3 py-1.5 rounded-full bg-black/80 backdrop-blur-md border border-white/20 text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 shadow-2xl active:scale-95 transition-all"
                title="Vollbild beenden (Esc)"
              >
                <Minimize className="w-3.5 h-3.5" />
                <span>Esc</span>
              </button>
            </div>
          </div>
        )}

        {/* Main Content Area: in Fullscreen occupies full stage */}
        {cards.length === 0 ? (
          /* ================= EMPTY HOME SCREEN ================= */
          <div className="relative z-20 flex-1 flex flex-col items-center justify-center p-4">
            <EmptyCardSlot onClick={() => setIsSetupModalOpen(true)} />
          </div>
        ) : (
          /* ================= CARDS ARENA VIEW ================= */
          <div
            className={`relative z-20 flex-1 flex flex-row flex-wrap items-center justify-center content-center ${
              isVerticalMode
                ? 'gap-1.5 sm:gap-2 px-2 py-1'
                : 'gap-2 sm:gap-3 md:gap-4 lg:gap-6 px-3 py-2'
            } overflow-y-auto ${
              isFullscreen
                ? 'h-full max-h-[calc(100vh-48px)] w-full'
                : 'max-h-[calc(100vh-70px)] pb-24 sm:pb-28'
            }`}
          >
            {cards.map((card, index) => (
              <TcgCard
                key={card.id}
                card={card}
                cardIndex={index}
                totalCards={cards.length}
                rarity={rarity}
                isFullscreen={isFullscreen}
                isVerticalMode={isVerticalMode}
                onFlip={handleFlipCard}
                onRotate={handleRotateCard}
                onDelete={cards.length > 1 ? handleDeleteCard : undefined}
                onUpdateFrontText={handleUpdateFrontText}
                onUpdateFrontImage={handleUpdateFrontImage}
                onUpdateBackNumber={handleUpdateBackNumber}
              />
            ))}
          </div>
        )}

        {/* Bottom Floating Control Dock - Hidden in Fullscreen Mode */}
        {!isFullscreen && cards.length > 0 && (
          <div className="fixed bottom-3 inset-x-0 z-40 flex items-center justify-center px-2 sm:px-3 pointer-events-none">
            <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 p-2 rounded-2xl bg-black/90 backdrop-blur-xl border border-white/20 shadow-2xl max-w-[98vw]">
              {/* Quick Mode Helper: Show Prize Side vs Show Numbers Side (1..X) */}
              <button
                onClick={() => handleSetAllFlipped(false)}
                className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 font-bold text-xs active:scale-95 transition-all"
                title="Alle Karten auf die Gewinn-Seite (Vorderseite) drehen, um Bilder hochzuladen"
              >
                <Eye className="w-3.5 h-3.5 text-amber-400" />
                <span>Gewinne bearbeiten</span>
              </button>

              <button
                onClick={() => handleSetAllFlipped(true)}
                className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-200 font-bold text-xs active:scale-95 transition-all"
                title="Alle Karten auf die Rückseite mit den Zahlen (1 bis X) drehen"
              >
                <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
                <span>Alle auf 1–{cards.length}</span>
              </button>

              {/* GIVEAWAY LEVEL UP BUTTON */}
              <button
                onClick={() => handleGiveawayLevelUp()}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r ${
                  rarity === 'rare'
                    ? 'from-purple-600 via-fuchsia-500 to-indigo-600 text-white shadow-purple-500/30'
                    : rarity === 'epic'
                    ? 'from-amber-400 via-orange-500 to-red-600 text-black shadow-orange-500/40'
                    : 'from-cyan-400 via-sky-500 to-blue-600 text-black shadow-cyan-500/30'
                } font-black text-xs shadow-lg active:scale-95 transition-all`}
                title={`Giveaway Level Up: Wechselt zu ${nextRarityLabel} und dreht alle Karten auf 1–${cards.length}`}
              >
                <Flame className="w-4 h-4" />
                <span>Giveaway Level Up ({nextRarityLabel})</span>
              </button>

              {/* Rarity Direct Settings Dropdown */}
              <div className="relative">
                <button
                  onClick={() => {
                    sound.playClick(550);
                    setShowRarityMenu((prev) => !prev);
                    setShowThemeMenu(false);
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl border text-xs font-extrabold active:scale-95 transition-all ${RARITY_CONFIG[rarity].badgeClass}`}
                  title="Rarität direkt auswählen (Rare / Epic / Legendary)"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">{RARITY_CONFIG[rarity].phaseLabel}</span>
                </button>

                {showRarityMenu && (
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-56 bg-stone-900 border border-white/20 rounded-xl p-2 shadow-2xl space-y-1 z-50">
                    <span className="block text-[10px] font-extrabold uppercase text-slate-400 px-2 py-1">
                      Karten-Rarität wählen
                    </span>
                    {(['rare', 'epic', 'legendary'] as CardRarity[]).map((r) => (
                      <button
                        key={r}
                        onClick={() => {
                          setRarity(r);
                          setShowRarityMenu(false);
                          sound.playLevelUp(r);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-bold transition-colors ${
                          rarity === r
                            ? 'bg-white/15 text-white ring-1 ring-white/30'
                            : 'text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-3 h-3 rounded-full ${
                              r === 'legendary'
                                ? 'bg-gradient-to-tr from-red-500 via-orange-400 to-yellow-300 shadow-[0_0_8px_#f97316]'
                                : r === 'epic'
                                ? 'bg-gradient-to-tr from-purple-600 to-fuchsia-400 shadow-[0_0_8px_#c084fc]'
                                : 'bg-gradient-to-tr from-blue-500 to-cyan-300 shadow-[0_0_8px_#38bdf8]'
                            }`}
                          />
                          <span>{RARITY_CONFIG[r].label}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Vertical 9:16 Stream Mode Toggle (Whatnot / Instagram) */}
              <button
                onClick={() => {
                  sound.playClick(650);
                  setIsVerticalMode((prev) => !prev);
                }}
                className={`flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-bold active:scale-95 transition-all border ${
                  isVerticalMode
                    ? 'bg-emerald-500/25 border-emerald-400 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                    : 'bg-white/10 border-transparent hover:bg-white/20 text-slate-200'
                }`}
                title="Vertikaler 9:16 Modus für Whatnot & Instagram (Rechts & Links komplett frei)"
              >
                {isVerticalMode ? (
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Monitor className="w-4 h-4 text-cyan-400" />
                )}
                <span className="hidden sm:inline">
                  {isVerticalMode ? '9:16 Vertikal AN' : '9:16 Vertikal'}
                </span>
              </button>

              {/* Swap Order */}
              {cards.length > 1 && (
                <button
                  onClick={() => {
                    sound.playClick(600);
                    handleSwapCards();
                  }}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white active:scale-95 transition-all"
                  title="Kartenreihenfolge umkehren"
                >
                  <ArrowLeftRight className="w-4 h-4 text-cyan-400" />
                </button>
              )}

              {/* Adjust Card Setup / Count */}
              <button
                onClick={() => {
                  sound.playClick(600);
                  setIsSetupModalOpen(true);
                }}
                className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold active:scale-95 transition-all"
                title="Kartenanzahl ändern"
              >
                <Layers className="w-4 h-4 text-cyan-400" />
                <span className="hidden sm:inline">Anzahl ({cards.length})</span>
              </button>

              {/* Dice & Coin Tools */}
              <button
                onClick={() => {
                  sound.playClick(700);
                  setIsToolsOpen(true);
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
                    setShowRarityMenu(false);
                  }}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-emerald-400 active:scale-95 transition-all"
                  title="Hintergrund Design ändern"
                >
                  <Palette className="w-4 h-4" />
                </button>

                {showThemeMenu && (
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-44 bg-stone-900 border border-white/20 rounded-xl p-2 shadow-2xl space-y-1 z-50">
                    {THEMES.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => {
                          setTheme(t.id);
                          setShowThemeMenu(false);
                          sound.playClick(600);
                        }}
                        className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          theme === t.id
                            ? 'bg-cyan-400/20 text-cyan-300 font-bold'
                            : 'text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        <span className={`w-3 h-3 rounded-full ${t.color}`} />
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
                title={isMuted ? 'Sound an' : 'Sound aus'}
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                )}
              </button>

              {/* Home Screen / Clear Cards */}
              <button
                onClick={() => {
                  if (confirm('Zurück zum Home-Screen?')) {
                    sound.playClick(400);
                    setCards([]);
                  }
                }}
                className="p-2 rounded-xl bg-white/10 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 active:scale-95 transition-all"
                title="Zurück zum leeren Home-Screen"
              >
                <Home className="w-4 h-4" />
              </button>

              {/* Fullscreen Toggle */}
              <button
                onClick={toggleFullscreen}
                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs active:scale-95 transition-all shadow-md shadow-emerald-500/20"
                title="Präsentationsmodus / Vollbild starten (Kein Editieren mehr, nur noch Karten umdrehen)"
              >
                <Maximize className="w-4 h-4" />
                <span className="hidden sm:inline">Präsentation</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Card Setup Modal */}
      <CardSetupModal
        isOpen={isSetupModalOpen}
        onClose={() => setIsSetupModalOpen(false)}
        onConfirm={handleGenerateCards}
        initialCount={cards.length > 0 ? cards.length : 10}
      />

      {/* Dice & Coin Tool Modal */}
      <DiceCoinTool isOpen={isToolsOpen} onClose={() => setIsToolsOpen(false)} />
    </main>
  );
}
