'use client';

import React, { useState, useEffect } from 'react';
import { TcgCardData, PlaymatTheme } from '../types/card';
import { PRESETS, TcgPreset } from '../data/presets';
import { TcgCard } from '../components/TcgCard';
import { PlaymatBackground } from '../components/PlaymatBackground';
import { ControlToolbar } from '../components/ControlToolbar';
import { CardEditorModal } from '../components/CardEditorModal';
import { PresetsModal } from '../components/PresetsModal';
import { DiceCoinTool } from '../components/DiceCoinTool';
import { Header } from '../components/Header';
import { sound } from '../utils/sound';
import confetti from 'canvas-confetti';

const STORAGE_KEY_CARDS = 'tcg_cards_v1';
const STORAGE_KEY_THEME = 'tcg_theme_v1';

export default function Home() {
  const [cards, setCards] = useState<[TcgCardData, TcgCardData]>(() => {
    const defaultPreset = PRESETS[0];
    return [defaultPreset.card1, defaultPreset.card2];
  });

  const [theme, setTheme] = useState<PlaymatTheme>('dark-carbon');
  const [isEditMode, setIsEditMode] = useState(false);

  // Modals state
  const [editorCard, setEditorCard] = useState<TcgCardData | null>(null);
  const [editorSide, setEditorSide] = useState<'front' | 'back'>('front');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isPresetsOpen, setIsPresetsOpen] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false);

  // Load from LocalStorage on mount
  useEffect(() => {
    try {
      const savedCards = localStorage.getItem(STORAGE_KEY_CARDS);
      if (savedCards) {
        const parsed = JSON.parse(savedCards);
        if (Array.isArray(parsed) && parsed.length === 2) {
          setCards(parsed as [TcgCardData, TcgCardData]);
        }
      }

      const savedTheme = localStorage.getItem(STORAGE_KEY_THEME) as PlaymatTheme | null;
      if (savedTheme) {
        setTheme(savedTheme);
      }
    } catch (e) {
      console.warn('Failed to load saved state from localStorage', e);
    }
  }, []);

  // Save to LocalStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CARDS, JSON.stringify(cards));
      localStorage.setItem(STORAGE_KEY_THEME, theme);
    } catch (e) {
      console.warn('Failed to save state to localStorage', e);
    }
  }, [cards, theme]);

  // Keyboard shortcuts for convenience
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently typing in an input / textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (e.code === 'Space') {
        e.preventDefault();
        sound.playCardFlip();
        handleFlipBoth();
      } else if (e.key === '1') {
        sound.playCardFlip();
        handleFlipCard(cards[0].id);
      } else if (e.key === '2') {
        sound.playCardFlip();
        handleFlipCard(cards[1].id);
      } else if (e.key.toLowerCase() === 'e') {
        setIsEditMode((prev) => !prev);
      } else if (e.key.toLowerCase() === 'c') {
        sound.playShimmer();
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cards]);

  // Flip a single card
  const handleFlipCard = (cardId: string) => {
    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, isFlipped: !c.isFlipped } : c)) as [
        TcgCardData,
        TcgCardData
      ]
    );
  };

  // Rotate a card by 90 degrees (tapped/exhausted state in TCGs)
  const handleRotateCard = (cardId: string) => {
    setCards((prev) =>
      prev.map((c) =>
        c.id === cardId ? { ...c, rotation: (c.rotation + 90) % 360 } : c
      ) as [TcgCardData, TcgCardData]
    );
  };

  // Flip both cards simultaneously
  const handleFlipBoth = () => {
    setCards((prev) =>
      prev.map((c) => ({ ...c, isFlipped: !c.isFlipped })) as [
        TcgCardData,
        TcgCardData
      ]
    );
  };

  // Swap Left & Right cards
  const handleSwapCards = () => {
    setCards(([c1, c2]) => [c2, c1]);
  };

  // Reset to default Follower Special preset
  const handleResetAll = () => {
    const defaultPreset = PRESETS[0];
    setCards([
      { ...defaultPreset.card1, isFlipped: false, rotation: 0 },
      { ...defaultPreset.card2, isFlipped: false, rotation: 0 },
    ]);
  };

  // Counter delta update (+ / -)
  const handleUpdateCounter = (
    cardId: string,
    side: 'front' | 'back',
    counterId: string,
    delta: number
  ) => {
    setCards((prev) =>
      prev.map((card) => {
        if (card.id !== cardId) return card;
        const sideData = card[side];
        const updatedCounters = sideData.counters.map((cnt) => {
          if (cnt.id !== counterId) return cnt;
          const nextVal = cnt.value + delta;
          const clamped = cnt.min !== undefined ? Math.max(cnt.min, nextVal) : nextVal;
          return { ...cnt, value: clamped };
        });
        return {
          ...card,
          [side]: {
            ...sideData,
            counters: updatedCounters,
          },
        };
      }) as [TcgCardData, TcgCardData]
    );
  };

  // Set counter direct number
  const handleSetCounterValue = (
    cardId: string,
    side: 'front' | 'back',
    counterId: string,
    value: number
  ) => {
    setCards((prev) =>
      prev.map((card) => {
        if (card.id !== cardId) return card;
        const sideData = card[side];
        const updatedCounters = sideData.counters.map((cnt) => {
          if (cnt.id !== counterId) return cnt;
          return { ...cnt, value };
        });
        return {
          ...card,
          [side]: {
            ...sideData,
            counters: updatedCounters,
          },
        };
      }) as [TcgCardData, TcgCardData]
    );
  };

  // Open Editor
  const handleOpenEdit = (card: TcgCardData, side: 'front' | 'back') => {
    setEditorCard(card);
    setEditorSide(side);
    setIsEditorOpen(true);
  };

  // Save Card from Editor
  const handleSaveCard = (updatedCard: TcgCardData) => {
    setCards((prev) =>
      prev.map((c) => (c.id === updatedCard.id ? updatedCard : c)) as [
        TcgCardData,
        TcgCardData
      ]
    );
  };

  // Select Preset
  const handleSelectPreset = (preset: TcgPreset) => {
    setCards([
      { ...preset.card1, isFlipped: false, rotation: 0 },
      { ...preset.card2, isFlipped: false, rotation: 0 },
    ]);
  };

  return (
    <main className="relative w-screen h-screen overflow-hidden flex flex-col justify-between bg-black select-none">
      {/* Dynamic Themed Playmat Background */}
      <PlaymatBackground theme={theme} />

      {/* Top Header */}
      <Header />

      {/* Center Dual Cards Arena */}
      <div className="relative z-20 flex-1 flex flex-col lg:flex-row items-center justify-center gap-6 sm:gap-10 lg:gap-16 px-4 py-2 overflow-y-auto lg:overflow-visible">
        {cards.map((card, index) => (
          <TcgCard
            key={card.id}
            card={card}
            cardIndex={index}
            isEditMode={isEditMode}
            onFlip={handleFlipCard}
            onRotate={handleRotateCard}
            onEdit={handleOpenEdit}
            onUpdateCounter={handleUpdateCounter}
            onSetCounterValue={handleSetCounterValue}
          />
        ))}
      </div>

      {/* Spacer for bottom toolbar */}
      <div className="h-16 w-full pointer-events-none" />

      {/* Floating Bottom Control Toolbar */}
      <ControlToolbar
        isEditMode={isEditMode}
        onToggleEditMode={() => setIsEditMode(!isEditMode)}
        onFlipBoth={handleFlipBoth}
        onSwapCards={handleSwapCards}
        onResetAll={handleResetAll}
        currentTheme={theme}
        onChangeTheme={setTheme}
        onOpenPresets={() => setIsPresetsOpen(true)}
        onOpenTools={() => setIsToolsOpen(true)}
      />

      {/* Modals & Dialogs */}
      <CardEditorModal
        card={editorCard}
        initialSide={editorSide}
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        onSave={handleSaveCard}
      />

      <PresetsModal
        isOpen={isPresetsOpen}
        onClose={() => setIsPresetsOpen(false)}
        onSelectPreset={handleSelectPreset}
      />

      <DiceCoinTool
        isOpen={isToolsOpen}
        onClose={() => setIsToolsOpen(false)}
      />
    </main>
  );
}
