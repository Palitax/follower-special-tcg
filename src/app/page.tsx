'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { TcgCardData, PlaymatTheme } from '../types/card';
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
} from 'lucide-react';

const STORAGE_KEY_CARDS = 'tcg_cards_pokemon_front_v7';
const STORAGE_KEY_THEME = 'tcg_theme_pokemon_front_v7';

export default function HomeView() {
  const [cards, setCards] = useState<TcgCardData[]>([]);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [theme, setTheme] = useState<PlaymatTheme>('dark-carbon');
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(sound.getMuted());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);

  // Load from LocalStorage
  useEffect(() => {
    try {
      const savedCards = localStorage.getItem(STORAGE_KEY_CARDS);
      if (savedCards) {
        const parsed = JSON.parse(savedCards);
        if (Array.isArray(parsed)) {
          // Ensure front image points to the new pokemon energy card
          const updated = parsed.map((c) => ({
            ...c,
            front: {
              ...c.front,
              imageUrl: '/images/pokemon-energy-front.png',
            },
          }));
          setCards(updated);
        }
      }
      const savedTheme = localStorage.getItem(STORAGE_KEY_THEME) as PlaymatTheme | null;
      if (savedTheme) {
        setTheme(savedTheme);
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
    } catch (e) {
      console.warn('LocalStorage save error', e);
    }
  }, [cards, theme, hasInitialized]);

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

  // Keyboard Shortcuts (Space: flip, Esc: exit fullscreen, C: confetti)
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
      } else if (e.key === 'c' || e.key === 'C') {
        sound.playShimmer();
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cards, isFullscreen, exitFullscreen]);

  // Create N cards with Pokémon card front & ManaCards back
  const handleGenerateCards = (count: number) => {
    const safeCount = Math.max(1, Math.min(100, count));
    const newCards: TcgCardData[] = [];
    for (let i = 0; i < safeCount; i++) {
      newCards.push({
        id: 'card_' + (i + 1) + '_' + Date.now(),
        name: `Karte #${i + 1}`,
        isFlipped: false,
        rotation: 0,
        borderStyle: 'neon-cyan',
        front: {
          title: `Karte #${i + 1}`,
          subtitle: '',
          notes: '',
          imageUrl: '/images/pokemon-energy-front.png',
          holoEffect: 'none',
          counters: [],
        },
        back: {
          title: '',
          subtitle: '',
          notes: '',
          imageUrl: '/images/manacards.jpg',
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
  };

  // Flip Single Card
  const handleFlipCard = (cardId: string) => {
    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, isFlipped: !c.isFlipped } : c))
    );
  };

  // Flip All Cards
  const handleFlipAll = () => {
    setCards((prev) => prev.map((c) => ({ ...c, isFlipped: !c.isFlipped })));
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

  return (
    <main className="relative w-screen h-screen overflow-hidden flex flex-col justify-between bg-black select-none">
      {/* Dynamic Playmat Background */}
      <PlaymatBackground theme={theme} />

      {/* Top Header - Hidden in Fullscreen Mode */}
      {!isFullscreen && (
        <Header
          onNewSetup={() => setIsSetupModalOpen(true)}
          onResetCards={() => setCards([])}
          hasCards={cards.length > 0}
        />
      )}

      {/* Main Content Area: in Fullscreen occupies 100% height */}
      {cards.length === 0 ? (
        /* ================= EMPTY HOME SCREEN ================= */
        <div className="relative z-20 flex-1 flex flex-col items-center justify-center p-4">
          <EmptyCardSlot onClick={() => setIsSetupModalOpen(true)} />
        </div>
      ) : (
        /* ================= CARDS ARENA VIEW (EXCLUSIVELY CARDS IN FULLSCREEN) ================= */
        <div
          className={`relative z-20 flex-1 flex flex-row flex-wrap items-center justify-center content-center gap-2 sm:gap-3 md:gap-4 lg:gap-6 px-3 py-2 overflow-y-auto ${
            isFullscreen ? 'h-full max-h-screen w-full' : 'max-h-[calc(100vh-70px)] pb-20 sm:pb-24'
          }`}
        >
          {cards.map((card, index) => (
            <TcgCard
              key={card.id}
              card={card}
              cardIndex={index}
              totalCards={cards.length}
              isFullscreen={isFullscreen}
              onFlip={handleFlipCard}
              onRotate={handleRotateCard}
              onDelete={cards.length > 1 ? handleDeleteCard : undefined}
              onUpdateFrontText={handleUpdateFrontText}
              onUpdateBackNumber={handleUpdateBackNumber}
            />
          ))}
        </div>
      )}

      {/* Discreet Exit Fullscreen Button in Fullscreen Mode */}
      {isFullscreen && (
        <div className="fixed top-3 right-3 z-50 opacity-20 hover:opacity-100 transition-opacity duration-300 pointer-events-auto">
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
      )}

      {/* Bottom Floating Control Dock - Hidden in Fullscreen Mode */}
      {!isFullscreen && cards.length > 0 && (
        <div className="fixed bottom-3 inset-x-0 z-40 flex items-center justify-center px-3 pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2 p-2 rounded-2xl bg-black/85 backdrop-blur-xl border border-white/20 shadow-2xl">
            
            {/* Flip All Cards */}
            <button
              onClick={() => {
                sound.playCardFlip();
                handleFlipAll();
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold text-xs shadow-md shadow-cyan-500/20 active:scale-95 transition-all"
              title="Alle Karten gleichzeitig umdrehen"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Alle umdrehen ({cards.length})</span>
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
                }}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-emerald-400 active:scale-95 transition-all"
                title="Hintergrund Design ändern"
              >
                <Palette className="w-4 h-4" />
              </button>

              {showThemeMenu && (
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-44 bg-stone-900 border border-white/20 rounded-xl p-2 shadow-2xl space-y-1">
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
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
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
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white active:scale-95 transition-all"
              title="Vollbildmodus aktivieren"
            >
              <Maximize className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Card Setup Modal */}
      <CardSetupModal
        isOpen={isSetupModalOpen}
        onClose={() => setIsSetupModalOpen(false)}
        onConfirm={handleGenerateCards}
        initialCount={cards.length > 0 ? cards.length : 2}
      />

      {/* Dice & Coin Tool Modal */}
      <DiceCoinTool
        isOpen={isToolsOpen}
        onClose={() => setIsToolsOpen(false)}
      />
    </main>
  );
}
