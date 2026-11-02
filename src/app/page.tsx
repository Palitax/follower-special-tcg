'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { TcgCardData, PlaymatTheme, CardRarity } from '../types/card';
import { TcgCard } from '../components/TcgCard';
import { EmptyCardSlot } from '../components/EmptyCardSlot';
import { CardSetupModal } from '../components/CardSetupModal';
import { PlaymatBackground } from '../components/PlaymatBackground';
import { Header } from '../components/Header';
import { DiceCoinTool } from '../components/DiceCoinTool';
import { sound } from '../utils/sound';
import {
  LiveArenaSnapshot,
  LiveArenaSyncController,
  SyncEventType,
  SyncStatus,
  cacheCustomImage,
  hashImageDataUrl,
  loadCachedImage,
} from '../lib/liveSync';
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
  Droplets,
  Crown,
  Smartphone,
  Monitor,
  Eye,
  Undo2,
  Radio,
} from 'lucide-react';

const STORAGE_KEY_CARDS = 'tcg_cards_pokemon_front_v8';
const STORAGE_KEY_CARDS_LEGACY = 'tcg_cards_pokemon_front_v7';
const STORAGE_KEY_THEME = 'tcg_theme_pokemon_front_v8';
const STORAGE_KEY_RARITY = 'tcg_rarity_v8';
const STORAGE_KEY_VERTICAL = 'tcg_vertical_mode_v8';
const STORAGE_KEY_UPDATED_AT = 'tcg_updated_at_v8';

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
    label: 'Rare (Blau Wasser)',
    phaseLabel: 'Phase 1 · Rare',
    badgeClass:
      'bg-cyan-500/20 text-cyan-300 border-cyan-400/50 shadow-[0_0_12px_rgba(56,189,248,0.35)]',
    buttonClass:
      'from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-cyan-500/30',
    confettiColors: ['#bae6fd', '#7dd3fc', '#a5b4fc', '#e0f2fe'],
  },
  epic: {
    label: 'Epic (Magenta Flamme)',
    phaseLabel: 'Phase 2 · Epic',
    badgeClass:
      'bg-fuchsia-500/20 text-fuchsia-200 border-fuchsia-400/60 shadow-[0_0_15px_rgba(232,121,249,0.5)]',
    buttonClass:
      'from-fuchsia-600 via-pink-500 to-orange-400 hover:from-fuchsia-500 hover:to-orange-300 shadow-fuchsia-500/40',
    confettiColors: ['#e879f9', '#f472b6', '#fb923c', '#c026d3'],
  },
  legendary: {
    label: 'Legendary (Gold)',
    phaseLabel: 'Phase 3 · Legendary',
    badgeClass:
      'bg-amber-400/20 text-amber-200 border-amber-300/70 shadow-[0_0_18px_rgba(250,204,21,0.55)]',
    buttonClass:
      'from-yellow-300 via-amber-400 to-amber-600 hover:from-yellow-200 hover:to-amber-500 shadow-amber-400/50',
    confettiColors: ['#facc15', '#fde047', '#fef3c7', '#f59e0b'],
  },
};

// ============================================================================
// Optimal Grid & Card Sizing Solver (maximizes card size in 9:16 & 16:9)
// ============================================================================
function calcBleedPx(cardW: number, isVerticalMode: boolean): number {
  return Math.max(4, Math.min(isVerticalMode ? 15 : 22, Math.round(cardW * 0.068)));
}

function solveMaxCardWidth(
  slotW: number,
  slotH: number,
  isVerticalMode: boolean,
  maxCap: number
): number {
  let lo = 24;
  let hi = maxCap;
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2;
    const b = calcBleedPx(mid, isVerticalMode);
    const neededW = mid + 2 * b;
    const neededH = mid * (88 / 63) + 2 * b;
    if (neededW <= slotW && neededH <= slotH) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return Math.floor(lo);
}

function computeOptimalCardLayout(
  totalCards: number,
  arenaWidth: number,
  arenaHeight: number,
  isFullscreen: boolean,
  isVerticalMode: boolean
): { cols: number; rows: number; cardW: number; bleed: number; needsScroll: boolean } {
  if (totalCards <= 0 || arenaWidth <= 0 || arenaHeight <= 0) {
    const fallbackW = isVerticalMode ? 165 : 220;
    return {
      cols: Math.min(totalCards || 1, 3),
      rows: 1,
      cardW: fallbackW,
      bleed: calcBleedPx(fallbackW, isVerticalMode),
      needsScroll: false,
    };
  }

  const padX = isVerticalMode ? 8 : 20;
  const padY = isFullscreen ? (isVerticalMode ? 14 : 22) : 8;
  const availW = Math.max(120, arenaWidth - padX);
  const availH = Math.max(120, arenaHeight - padY);
  const maxCap = isVerticalMode ? 540 : 470;

  let bestCols = 1;
  let bestRows = totalCards;
  let bestCardW = 24;
  let bestScore = -1;

  for (let cols = 1; cols <= totalCards; cols++) {
    const rows = Math.ceil(totalCards / cols);
    const slotW = availW / cols;
    const slotH = availH / rows;
    const cardW = solveMaxCardWidth(slotW, slotH, isVerticalMode, maxCap);
    const lastRowItems = totalCards - (rows - 1) * cols;
    const fillRatio = lastRowItems / cols;
    // Maximize card size with a subtle tie-breaker for balanced rows
    const score = cardW * (0.975 + 0.025 * fillRatio);
    if (score > bestScore) {
      bestScore = score;
      bestCols = cols;
      bestRows = rows;
      bestCardW = cardW;
    }
  }

  const minFloorW = 46;
  if (bestCardW < minFloorW) {
    const fallbackBleed = calcBleedPx(minFloorW, isVerticalMode);
    const fitCols = Math.max(1, Math.floor(availW / (minFloorW + 2 * fallbackBleed)));
    const fitCardW = Math.max(
      minFloorW,
      Math.floor(availW / fitCols - 2 * fallbackBleed)
    );
    return {
      cols: fitCols,
      rows: Math.ceil(totalCards / fitCols),
      cardW: fitCardW,
      bleed: calcBleedPx(fitCardW, isVerticalMode),
      needsScroll: true,
    };
  }

  const bleed = calcBleedPx(bestCardW, isVerticalMode);
  return {
    cols: bestCols,
    rows: bestRows,
    cardW: bestCardW,
    bleed,
    needsScroll: false,
  };
}

function normalizeLoadedCards(rawCards: any[]): TcgCardData[] {
  return rawCards.map((c, idx) => ({
    ...c,
    isEliminated: Boolean(c?.isEliminated),
    front: {
      ...c.front,
      imageUrl: c.front?.imageUrl || '/images/pokemon-energy-front.png',
      imageFit: c.front?.imageFit || 'contain',
    },
    back: {
      ...c.back,
      imageUrl: '/images/card-back-water.jpg',
      counters: [
        {
          id: 'cnt_1',
          label: '',
          value: idx + 1,
          step: 1,
        },
      ],
    },
  }));
}

async function persistCardsSafely(cards: TcgCardData[], updatedAt: number) {
  try {
    localStorage.setItem(STORAGE_KEY_UPDATED_AT, String(updatedAt));
    localStorage.setItem(STORAGE_KEY_CARDS, JSON.stringify(cards));
  } catch {
    // QuotaExceededError fallback: store custom base64 images in IndexedDB and refs in localStorage
    try {
      const compact = await Promise.all(
        cards.map(async (c) => {
          const url = c.front?.imageUrl || '';
          if (url.startsWith('data:image/')) {
            const imgId = await hashImageDataUrl(url);
            await cacheCustomImage(imgId, url);
            return { ...c, front: { ...c.front, imageUrl: `idb:${imgId}` } };
          }
          return c;
        })
      );
      localStorage.setItem(STORAGE_KEY_CARDS, JSON.stringify(compact));
    } catch (err) {
      console.warn('LocalStorage fallback save error', err);
    }
  }
}

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

  // Live Sync status
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('connecting');
  const [connectedDevices, setConnectedDevices] = useState<number>(1);

  // Live Arena container dimensions for exact responsive card sizing
  const arenaRef = useRef<HTMLDivElement>(null);
  const [arenaSize, setArenaSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  // Atomic state refs for conflict-free Live Sync
  const cardsRef = useRef<TcgCardData[]>([]);
  const rarityRef = useRef<CardRarity>('rare');
  const themeRef = useRef<PlaymatTheme>('dark-carbon');
  const updatedAtRef = useRef<number>(0);
  const syncControllerRef = useRef<LiveArenaSyncController | null>(null);

  // Keep refs mirrored
  useEffect(() => {
    cardsRef.current = cards;
  }, [cards]);
  useEffect(() => {
    rarityRef.current = rarity;
  }, [rarity]);
  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  // Measure Arena container with ResizeObserver
  useEffect(() => {
    const el = arenaRef.current;
    if (!el) return;

    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      setArenaSize((prev) =>
        Math.abs(prev.width - rect.width) > 0.5 || Math.abs(prev.height - rect.height) > 0.5
          ? { width: rect.width, height: rect.height }
          : prev
      );
    };

    updateSize();
    const ro = new ResizeObserver(() => updateSize());
    ro.observe(el);
    window.addEventListener('resize', updateSize);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, [cards.length, isVerticalMode, isFullscreen, hasInitialized]);

  // Load initial state from LocalStorage (+ IndexedDB custom images) AND start Live Sync
  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const savedTs = Number(localStorage.getItem(STORAGE_KEY_UPDATED_AT) || '0');
        if (!Number.isNaN(savedTs) && savedTs > 0) {
          updatedAtRef.current = savedTs;
        }

        const savedCards =
          localStorage.getItem(STORAGE_KEY_CARDS) ||
          localStorage.getItem(STORAGE_KEY_CARDS_LEGACY);
        if (savedCards) {
          const parsed = JSON.parse(savedCards);
          if (Array.isArray(parsed)) {
            const normalized = normalizeLoadedCards(parsed);
            const hydrated = await Promise.all(
              normalized.map(async (c) => {
                const url = c.front.imageUrl;
                if (url.startsWith('idb:')) {
                  const cached = await loadCachedImage(url.slice(4));
                  if (cached) {
                    return { ...c, front: { ...c.front, imageUrl: cached } };
                  }
                }
                return c;
              })
            );
            if (!cancelled) {
              cardsRef.current = hydrated;
              setCards(hydrated);
            }
          }
        }

        const savedTheme = localStorage.getItem(STORAGE_KEY_THEME) as PlaymatTheme | null;
        if (savedTheme && !cancelled) {
          themeRef.current = savedTheme;
          setTheme(savedTheme);
        }

        const savedRarity = localStorage.getItem(STORAGE_KEY_RARITY) as CardRarity | null;
        if (
          (savedRarity === 'rare' || savedRarity === 'epic' || savedRarity === 'legendary') &&
          !cancelled
        ) {
          rarityRef.current = savedRarity;
          setRarity(savedRarity);
        }

        const savedVertical = localStorage.getItem(STORAGE_KEY_VERTICAL);
        if (savedVertical === 'true' && !cancelled) {
          setIsVerticalMode(true);
        }
      } catch (e) {
        console.warn('LocalStorage load error', e);
      } finally {
        if (!cancelled) setHasInitialized(true);
      }

      if (cancelled) return;

      // Start Cross-Window + Cross-PC Live Sync Controller
      const controller = new LiveArenaSyncController({
        getLocalSnapshot: (clientId: string): LiveArenaSnapshot => ({
          updatedAt: updatedAtRef.current,
          senderId: clientId,
          rarity: rarityRef.current,
          theme: themeRef.current,
          cards: cardsRef.current,
        }),
        onRemoteSnapshot: (snap: LiveArenaSnapshot) => {
          if (cancelled) return;
          const cleanCards = normalizeLoadedCards(snap.cards);
          updatedAtRef.current = snap.updatedAt;
          cardsRef.current = cleanCards;
          rarityRef.current = snap.rarity;
          themeRef.current = snap.theme;

          setCards(cleanCards);
          setRarity(snap.rarity);
          setTheme(snap.theme);

          void persistCardsSafely(cleanCards, snap.updatedAt);
          try {
            localStorage.setItem(STORAGE_KEY_RARITY, snap.rarity);
            localStorage.setItem(STORAGE_KEY_THEME, snap.theme);
          } catch {
            // ignore
          }

          // Play live feedback on stream / second screen!
          if (snap.eventType === 'level-up') {
            sound.playLevelUp(snap.rarity);
            const colors = RARITY_CONFIG[snap.rarity].confettiColors;
            confetti({
              particleCount:
                snap.rarity === 'legendary' ? 95 : snap.rarity === 'epic' ? 65 : 40,
              spread: 75,
              origin: { y: 0.6 },
              colors,
            });
          } else if (snap.eventType === 'flip') {
            sound.playCardFlip();
          } else if (snap.eventType === 'eliminate') {
            sound.playClick(450, 0.05);
          }
        },
        onImageHydrated: (imageId: string, dataUrl: string) => {
          if (cancelled) return;
          setCards((prev) => {
            const next = prev.map((c) =>
              c.front.imageUrl === `idb:${imageId}`
                ? { ...c, front: { ...c.front, imageUrl: dataUrl } }
                : c
            );
            cardsRef.current = next;
            void persistCardsSafely(next, updatedAtRef.current);
            return next;
          });
        },
        onMetaChange: (status, peerCount) => {
          if (!cancelled) {
            setSyncStatus(status);
            setConnectedDevices(peerCount);
          }
        },
      });

      syncControllerRef.current = controller;
      await controller.start();
    }

    void bootstrap();

    return () => {
      cancelled = true;
      syncControllerRef.current?.stop();
      syncControllerRef.current = null;
    };
  }, []);

  // Persist local per-window Vertical Mode preference
  useEffect(() => {
    if (!hasInitialized) return;
    try {
      localStorage.setItem(STORAGE_KEY_VERTICAL, String(isVerticalMode));
    } catch {
      // ignore
    }
  }, [isVerticalMode, hasInitialized]);

  // Central atomic helper for user-initiated state changes + instant Live Sync publish
  const commitArenaUpdate = useCallback(
    (
      updater: (current: {
        cards: TcgCardData[];
        rarity: CardRarity;
        theme: PlaymatTheme;
      }) => {
        cards?: TcgCardData[];
        rarity?: CardRarity;
        theme?: PlaymatTheme;
      },
      eventType: SyncEventType = 'update'
    ) => {
      const patch = updater({
        cards: cardsRef.current,
        rarity: rarityRef.current,
        theme: themeRef.current,
      });

      const nextCards = patch.cards ?? cardsRef.current;
      const nextRarity = patch.rarity ?? rarityRef.current;
      const nextTheme = patch.theme ?? themeRef.current;
      const nextUpdatedAt = Math.max(Date.now(), updatedAtRef.current + 1);

      cardsRef.current = nextCards;
      rarityRef.current = nextRarity;
      themeRef.current = nextTheme;
      updatedAtRef.current = nextUpdatedAt;

      setCards(nextCards);
      setRarity(nextRarity);
      setTheme(nextTheme);

      void persistCardsSafely(nextCards, nextUpdatedAt);
      try {
        localStorage.setItem(STORAGE_KEY_RARITY, nextRarity);
        localStorage.setItem(STORAGE_KEY_THEME, nextTheme);
      } catch {
        // ignore
      }

      const controller = syncControllerRef.current;
      if (controller) {
        void controller.publishSnapshot({
          updatedAt: nextUpdatedAt,
          senderId: controller.clientId,
          eventType,
          rarity: nextRarity,
          theme: nextTheme,
          cards: nextCards,
        });
      }
    },
    []
  );

  const handleForceSyncPush = useCallback(() => {
    commitArenaUpdate((cur) => ({ ...cur }), 'update');
  }, [commitArenaUpdate]);

  // Sync fullscreen change events (browser or Esc)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
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

  // Flip All Active (non-eliminated) Cards
  const handleFlipAll = useCallback(() => {
    commitArenaUpdate(
      ({ cards: prev }) => ({
        cards: prev.map((c) => (c.isEliminated ? c : { ...c, isFlipped: !c.isFlipped })),
      }),
      'flip'
    );
  }, [commitArenaUpdate]);

  // Set All Cards to Back (Number side 1..N) or Front (Prize side)
  const handleSetAllFlipped = useCallback(
    (showNumbersSide: boolean) => {
      sound.playCardFlip();
      commitArenaUpdate(
        ({ cards: prev }) => ({
          cards: prev.map((c, idx) => ({
            ...c,
            isFlipped: showNumbersSide,
            back: {
              ...c.back,
              counters: [{ id: 'cnt_1', label: '', value: idx + 1, step: 1 }],
            },
          })),
        }),
        'flip'
      );
    },
    [commitArenaUpdate]
  );

  // GIVEAWAY LEVEL UP:
  // Advances Rarity (Rare -> Epic -> Legendary -> Rare), resets pool & flips all cards back to 1..N
  const handleGiveawayLevelUp = useCallback(
    (targetRarity?: CardRarity) => {
      const currentRarity = rarityRef.current;
      const nextRarity: CardRarity =
        targetRarity ??
        (currentRarity === 'rare'
          ? 'epic'
          : currentRarity === 'epic'
          ? 'legendary'
          : 'rare');

      sound.playLevelUp(nextRarity);

      commitArenaUpdate(
        ({ cards: prev }) => ({
          rarity: nextRarity,
          cards: prev.map((c, idx) => ({
            ...c,
            isFlipped: true,
            isEliminated: false,
            back: {
              ...c.back,
              counters: [{ id: 'cnt_1', label: '', value: idx + 1, step: 1 }],
            },
          })),
        }),
        'level-up'
      );

      const colors = RARITY_CONFIG[nextRarity].confettiColors;
      confetti({
        particleCount: nextRarity === 'legendary' ? 95 : nextRarity === 'epic' ? 65 : 40,
        spread: 75,
        origin: { y: 0.6 },
        colors,
      });
    },
    [commitArenaUpdate]
  );

  // Keyboard Shortcuts (Space: flip all, L: Giveaway Level Up, V: Vertical mode, Esc: exit fullscreen, C: confetti)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (e.key === 'Escape' || e.code === 'Escape') {
        if (isFullscreen) {
          e.preventDefault();
          void exitFullscreen();
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
          colors: RARITY_CONFIG[rarityRef.current].confettiColors,
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, exitFullscreen, handleFlipAll, handleGiveawayLevelUp]);

  // Create N cards numbered 1..N (starting on Rare)
  const handleGenerateCards = useCallback(
    (count: number) => {
      const safeCount = Math.max(1, Math.min(100, count));
      const newCards: TcgCardData[] = [];
      const now = Date.now();
      for (let i = 0; i < safeCount; i++) {
        newCards.push({
          id: `card_${i + 1}_${now}`,
          name: `Karte #${i + 1}`,
          isFlipped: true, // Show sequential numbers 1..N on the back
          isEliminated: false,
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
      commitArenaUpdate(() => ({ cards: newCards, rarity: 'rare' }), 'setup');
    },
    [commitArenaUpdate]
  );

  // Flip Single Card
  const handleFlipCard = useCallback(
    (cardId: string) => {
      commitArenaUpdate(
        ({ cards: prev }) => ({
          cards: prev.map((c) => (c.id === cardId ? { ...c, isFlipped: !c.isFlipped } : c)),
        }),
        'flip'
      );
    },
    [commitArenaUpdate]
  );

  // Toggle Card Out-of-Pool ("als weg markieren" / X)
  const handleToggleEliminated = useCallback(
    (cardId: string) => {
      commitArenaUpdate(
        ({ cards: prev }) => ({
          cards: prev.map((c) =>
            c.id === cardId ? { ...c, isEliminated: !c.isEliminated } : c
          ),
        }),
        'eliminate'
      );
    },
    [commitArenaUpdate]
  );

  // Clear all X marks (return all cards to active pool)
  const handleClearAllEliminated = useCallback(() => {
    sound.playClick(720);
    commitArenaUpdate(
      ({ cards: prev }) => ({
        cards: prev.map((c) => ({ ...c, isEliminated: false })),
      }),
      'eliminate'
    );
  }, [commitArenaUpdate]);

  // Update Front Text
  const handleUpdateFrontText = useCallback(
    (cardId: string, text: string) => {
      commitArenaUpdate(
        ({ cards: prev }) => ({
          cards: prev.map((c) =>
            c.id === cardId ? { ...c, front: { ...c.front, notes: text } } : c
          ),
        }),
        'update'
      );
    },
    [commitArenaUpdate]
  );

  // Update Front Individual Prize Image
  const handleUpdateFrontImage = useCallback(
    (cardId: string, imageUrl: string, imageFit: 'cover' | 'contain' = 'contain') => {
      commitArenaUpdate(
        ({ cards: prev }) => ({
          cards: prev.map((c) =>
            c.id === cardId
              ? { ...c, front: { ...c.front, imageUrl, imageFit } }
              : c
          ),
        }),
        'update'
      );
    },
    [commitArenaUpdate]
  );

  // Swap / Reverse Order (re-numbering 1..N or preserving card slots)
  const handleSwapCards = useCallback(() => {
    commitArenaUpdate(
      ({ cards: prev }) => ({
        cards: [...prev].reverse(),
      }),
      'update'
    );
  }, [commitArenaUpdate]);

  const handleResetCards = useCallback(() => {
    commitArenaUpdate(() => ({ cards: [] }), 'reset');
  }, [commitArenaUpdate]);

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
    rarity === 'rare' ? 'Epic' : rarity === 'epic' ? 'Legendary' : 'Rare (Reset)';

  const eliminatedCount = useMemo(
    () => cards.filter((c) => c.isEliminated).length,
    [cards]
  );

  const layout = useMemo(
    () =>
      computeOptimalCardLayout(
        cards.length,
        arenaSize.width,
        arenaSize.height,
        isFullscreen,
        isVerticalMode
      ),
    [cards.length, arenaSize.width, arenaSize.height, isFullscreen, isVerticalMode]
  );

  const maxRowWidthPx = layout.cols * (layout.cardW + 2 * layout.bleed) + 4;

  return (
    <main className="relative w-full h-screen h-[100dvh] overflow-hidden flex items-center justify-center bg-black select-none">
      {/* =====================================================================
          STAGE CONTAINER:
          When isVerticalMode is active (for Whatnot / Instagram 9:16 streams),
          nothing is rendered on the left or right outside this 9:16 portrait stage!
         ===================================================================== */}
      <div
        className={`relative h-full flex flex-col justify-between overflow-hidden transition-all duration-300 ${
          isVerticalMode
            ? 'aspect-[9/16] w-auto max-w-full bg-black shadow-[0_0_80px_rgba(0,0,0,1)]'
            : 'w-full'
        }`}
      >
        {/* Dynamic Playmat Background */}
        <PlaymatBackground theme={theme} />

        {/* Top Header - Hidden in Fullscreen Mode */}
        {!isFullscreen && (
          <Header
            onNewSetup={() => setIsSetupModalOpen(true)}
            onResetCards={handleResetCards}
            hasCards={cards.length > 0}
            isVerticalMode={isVerticalMode}
            syncStatus={syncStatus}
            connectedDevices={connectedDevices}
            onForceSync={handleForceSyncPush}
          />
        )}

        {/* Fullscreen Discreet Floating Top Control Bar (0px layout height stolen!) */}
        {isFullscreen && (
          <div className="absolute top-0 inset-x-0 z-50 px-3 pt-2 pb-2 flex flex-wrap items-center justify-between gap-1.5 opacity-0 hover:opacity-100 focus-within:opacity-100 transition-opacity duration-250 pointer-events-auto">
            {/* Left: Current Rarity Switcher + Live Sync indicator */}
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1 bg-black/85 backdrop-blur-md p-1 rounded-full border border-white/15 shadow-xl">
                {(['rare', 'epic', 'legendary'] as CardRarity[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => handleGiveawayLevelUp(r)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 ${
                      rarity === r
                        ? r === 'legendary'
                          ? 'bg-gradient-to-r from-yellow-300 via-amber-400 to-amber-600 text-black shadow-[0_0_12px_rgba(250,204,21,0.8)]'
                          : r === 'epic'
                          ? 'bg-gradient-to-r from-fuchsia-600 via-pink-500 to-orange-400 text-white shadow-[0_0_12px_rgba(236,72,153,0.8)]'
                          : 'bg-gradient-to-r from-cyan-400 to-blue-500 text-black shadow-[0_0_10px_rgba(56,189,248,0.8)]'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title={`Zu ${RARITY_CONFIG[r].label} wechseln & Karten auf 1–${cards.length} drehen`}
                  >
                    {r === 'rare' ? 'Rare' : r === 'epic' ? 'Epic' : 'Legendary'}
                  </button>
                ))}
              </div>

              {connectedDevices >= 2 && (
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/85 backdrop-blur-md border border-emerald-400/40 text-[10px] font-bold text-emerald-300 shadow-xl">
                  <Radio className="w-3 h-3 text-emerald-400" />
                  <span>{connectedDevices} aktiv</span>
                </div>
              )}
            </div>

            {/* Right: Reset X Marks + Giveaway Level Up + 9:16 Toggle + Esc */}
            <div className="flex items-center gap-1.5">
              {eliminatedCount > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllEliminated}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-rose-600/90 hover:bg-rose-500 text-white border border-rose-300/50 text-[11px] font-bold shadow-xl active:scale-95 transition-all"
                  title="Alle X-Markierungen aufheben (alle Karten wieder im Pool)"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  <span>X aufheben ({eliminatedCount})</span>
                </button>
              )}

              {cards.length > 0 && (
                <button
                  type="button"
                  onClick={() => handleGiveawayLevelUp()}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r ${
                    rarity === 'rare'
                      ? 'from-fuchsia-600 via-pink-500 to-orange-400 text-white shadow-[0_0_20px_rgba(236,72,153,0.7)]'
                      : rarity === 'epic'
                      ? 'from-yellow-300 via-amber-400 to-amber-600 text-black shadow-[0_0_24px_rgba(250,204,21,0.85)]'
                      : 'from-cyan-400 via-sky-500 to-blue-600 text-black shadow-[0_0_18px_rgba(56,189,248,0.7)]'
                  } font-black text-xs active:scale-95 transition-all border border-white/30`}
                  title={`Giveaway Level Up (${nextRarityLabel}) – dreht alle Karten auf 1 bis ${cards.length}`}
                >
                  <Flame className="w-3.5 h-3.5" />
                  <span>Level Up ({nextRarityLabel})</span>
                </button>
              )}

              <button
                type="button"
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
                type="button"
                onClick={() => {
                  void exitFullscreen();
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

        {/* Main Arena Area: Definite flex-1 min-h-0 size container */}
        <div
          ref={arenaRef}
          className={`relative z-20 flex-1 min-h-0 w-full [container-type:size] flex items-center justify-center ${
            layout.needsScroll ? 'overflow-y-auto' : 'overflow-clip'
          }`}
        >
          {cards.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-4">
              <EmptyCardSlot onClick={() => setIsSetupModalOpen(true)} />
            </div>
          ) : (
            <div
              className="flex flex-row flex-wrap items-center justify-center content-center mx-auto"
              style={{
                maxWidth: arenaSize.width > 0 ? `${maxRowWidthPx}px` : '100%',
              }}
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
                  cardWidthPx={arenaSize.width > 0 ? layout.cardW : undefined}
                  effectBleedPx={arenaSize.width > 0 ? layout.bleed : undefined}
                  onFlip={handleFlipCard}
                  onToggleEliminated={handleToggleEliminated}
                  onUpdateFrontText={handleUpdateFrontText}
                  onUpdateFrontImage={handleUpdateFrontImage}
                />
              ))}
            </div>
          )}
        </div>

        {/* Bottom Control Dock (in normal flow so it never overlaps cards & gives exact height to Arena) */}
        {!isFullscreen && cards.length > 0 && (
          <div
            className={`relative z-40 shrink-0 w-full flex items-center justify-center ${
              isVerticalMode ? 'px-1.5 pb-2 pt-1' : 'px-3 pb-2.5 pt-1'
            }`}
          >
            <div
              className={`flex flex-wrap [flex-wrap:balance] items-center justify-center rounded-2xl bg-black/90 backdrop-blur-xl border border-white/20 shadow-2xl max-w-full ${
                isVerticalMode ? 'gap-1 px-2 py-1.5 text-[11px]' : 'gap-1.5 sm:gap-2 p-2'
              }`}
            >
              {/* Show Prize Side vs Show Numbers Side (1..N) */}
              <button
                type="button"
                onClick={() => handleSetAllFlipped(false)}
                className={`flex items-center gap-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 font-bold active:scale-95 transition-all ${
                  isVerticalMode ? 'px-2 py-1 text-[11px]' : 'px-2.5 py-2 text-xs'
                }`}
                title="Alle Karten auf die Gewinn-Seite (Vorderseite) drehen, um Bilder hochzuladen"
              >
                <Eye className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>{isVerticalMode ? 'Gewinne' : 'Gewinne bearbeiten'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleSetAllFlipped(true)}
                className={`flex items-center gap-1 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-200 font-bold active:scale-95 transition-all ${
                  isVerticalMode ? 'px-2 py-1 text-[11px]' : 'px-2.5 py-2 text-xs'
                }`}
                title="Alle Karten auf die Rückseite mit den Zahlen (1 bis N) drehen"
              >
                <RotateCcw className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>{isVerticalMode ? `1–${cards.length}` : `Alle auf 1–${cards.length}`}</span>
              </button>

              {/* Reset Eliminated X Marks (shown whenever >=1 card is marked out) */}
              {eliminatedCount > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllEliminated}
                  className={`flex items-center gap-1 rounded-xl bg-rose-500/20 hover:bg-rose-500/35 border border-rose-400/50 text-rose-200 font-bold active:scale-95 transition-all ${
                    isVerticalMode ? 'px-2 py-1 text-[11px]' : 'px-2.5 py-2 text-xs'
                  }`}
                  title="Alle X-Markierungen aufheben (alle Karten wieder in den Pool nehmen)"
                >
                  <Undo2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>{isVerticalMode ? `X frei (${eliminatedCount})` : `X aufheben (${eliminatedCount})`}</span>
                </button>
              )}

              {/* GIVEAWAY LEVEL UP BUTTON */}
              <button
                type="button"
                onClick={() => handleGiveawayLevelUp()}
                className={`flex items-center gap-1 rounded-xl bg-gradient-to-r ${
                  rarity === 'rare'
                    ? 'from-fuchsia-600 via-pink-500 to-orange-400 text-white shadow-fuchsia-500/30'
                    : rarity === 'epic'
                    ? 'from-yellow-300 via-amber-400 to-amber-600 text-black shadow-amber-400/40'
                    : 'from-cyan-400 via-sky-500 to-blue-600 text-black shadow-cyan-500/30'
                } font-black shadow-lg active:scale-95 transition-all ${
                  isVerticalMode ? 'px-2 py-1 text-[11px]' : 'px-3 py-2 text-xs'
                }`}
                title={`Giveaway Level Up: Wechselt zu ${nextRarityLabel}, gibt alle Karten frei und dreht auf 1–${cards.length}`}
              >
                <Flame className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {isVerticalMode
                    ? `Level Up`
                    : `Giveaway Level Up (${nextRarityLabel})`}
                </span>
              </button>

              {/* Rarity Direct Settings Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick(550);
                    setShowRarityMenu((prev) => !prev);
                    setShowThemeMenu(false);
                  }}
                  className={`flex items-center gap-1.5 rounded-xl border text-xs font-extrabold active:scale-95 transition-all ${
                    RARITY_CONFIG[rarity].badgeClass
                  } ${isVerticalMode ? 'px-2 py-1.5' : 'px-2.5 py-2'}`}
                  title="Rarität direkt auswählen (ohne Karten zurückzusetzen)"
                >
                  {rarity === 'legendary' ? (
                    <Crown className="w-3.5 h-3.5" />
                  ) : rarity === 'epic' ? (
                    <Flame className="w-3.5 h-3.5" />
                  ) : (
                    <Droplets className="w-3.5 h-3.5" />
                  )}
                  {!isVerticalMode && (
                    <span className="hidden md:inline">{RARITY_CONFIG[rarity].phaseLabel}</span>
                  )}
                </button>

                {showRarityMenu && (
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-56 bg-stone-900 border border-white/20 rounded-xl p-2 shadow-2xl space-y-1 z-50">
                    <span className="block text-[10px] font-extrabold uppercase text-slate-400 px-2 py-1">
                      Karten-Rarität wählen
                    </span>
                    {(['rare', 'epic', 'legendary'] as CardRarity[]).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => {
                          commitArenaUpdate(() => ({ rarity: r }), 'update');
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
                                ? 'bg-gradient-to-tr from-amber-500 via-yellow-400 to-yellow-100 shadow-[0_0_8px_#facc15]'
                                : r === 'epic'
                                ? 'bg-gradient-to-tr from-fuchsia-600 via-pink-500 to-orange-300 shadow-[0_0_8px_#f472b6]'
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

              {/* Vertical 9:16 Stream Mode Toggle */}
              <button
                type="button"
                onClick={() => {
                  sound.playClick(650);
                  setIsVerticalMode((prev) => !prev);
                }}
                className={`flex items-center gap-1 rounded-xl text-xs font-bold active:scale-95 transition-all border ${
                  isVerticalMode
                    ? 'bg-emerald-500/25 border-emerald-400 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)] px-2 py-1.5'
                    : 'bg-white/10 border-transparent hover:bg-white/20 text-slate-200 px-2.5 py-2'
                }`}
                title="Vertikaler 9:16 Modus für Whatnot & Instagram (Rechts & Links komplett frei)"
              >
                {isVerticalMode ? (
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Monitor className="w-4 h-4 text-cyan-400" />
                )}
                <span className="hidden sm:inline">
                  {isVerticalMode ? '9:16 AN' : '9:16 Vertikal'}
                </span>
              </button>

              {/* Swap Order */}
              {cards.length > 1 && !isVerticalMode && (
                <button
                  type="button"
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
                type="button"
                onClick={() => {
                  sound.playClick(600);
                  setIsSetupModalOpen(true);
                }}
                className={`flex items-center gap-1 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold active:scale-95 transition-all ${
                  isVerticalMode ? 'px-2 py-1.5' : 'px-2.5 py-2'
                }`}
                title="Kartenanzahl ändern"
              >
                <Layers className="w-4 h-4 text-cyan-400" />
                <span className="hidden sm:inline">
                  {isVerticalMode ? `${cards.length}` : `Anzahl (${cards.length})`}
                </span>
              </button>

              {/* Dice & Coin Tools */}
              <button
                type="button"
                onClick={() => {
                  sound.playClick(700);
                  setIsToolsOpen(true);
                }}
                className={`${
                  isVerticalMode ? 'p-1.5' : 'p-2'
                } rounded-xl bg-white/10 hover:bg-white/20 text-yellow-400 active:scale-95 transition-all`}
                title="Würfel & Münzwurf Tool"
              >
                <Dices className="w-4 h-4" />
              </button>

              {/* Playmat Theme Selector */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick(500);
                    setShowThemeMenu(!showThemeMenu);
                    setShowRarityMenu(false);
                  }}
                  className={`${
                    isVerticalMode ? 'p-1.5' : 'p-2'
                  } rounded-xl bg-white/10 hover:bg-white/20 text-emerald-400 active:scale-95 transition-all`}
                  title="Hintergrund Design ändern"
                >
                  <Palette className="w-4 h-4" />
                </button>

                {showThemeMenu && (
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-44 bg-stone-900 border border-white/20 rounded-xl p-2 shadow-2xl space-y-1 z-50">
                    {THEMES.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          commitArenaUpdate(() => ({ theme: t.id }), 'update');
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
                type="button"
                onClick={toggleMute}
                className={`${
                  isVerticalMode ? 'p-1.5' : 'p-2'
                } rounded-xl transition-all active:scale-95 ${
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
              {!isVerticalMode && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Zurück zum Home-Screen?')) {
                      sound.playClick(400);
                      handleResetCards();
                    }
                  }}
                  className="p-2 rounded-xl bg-white/10 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 active:scale-95 transition-all"
                  title="Zurück zum leeren Home-Screen"
                >
                  <Home className="w-4 h-4" />
                </button>
              )}

              {/* Fullscreen Toggle */}
              <button
                type="button"
                onClick={toggleFullscreen}
                className={`flex items-center gap-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs active:scale-95 transition-all shadow-md shadow-emerald-500/20 ${
                  isVerticalMode ? 'px-2.5 py-1.5' : 'px-3 py-2'
                }`}
                title="Präsentationsmodus / Vollbild starten"
              >
                <Maximize className="w-4 h-4" />
                {!isVerticalMode && <span className="hidden sm:inline">Präsentation</span>}
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
