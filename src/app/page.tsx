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
  RarityDecks,
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

const STORAGE_KEY_DECKS = 'tcg_decks_by_rarity_v9';
const STORAGE_KEY_CARDS_LEGACY_V8 = 'tcg_cards_pokemon_front_v8';
const STORAGE_KEY_CARDS_LEGACY_V7 = 'tcg_cards_pokemon_front_v7';
const STORAGE_KEY_THEME = 'tcg_theme_pokemon_front_v8';
const STORAGE_KEY_RARITY = 'tcg_rarity_v8';
const STORAGE_KEY_VERTICAL = 'tcg_vertical_mode_v8';
const STORAGE_KEY_UPDATED_AT = 'tcg_updated_at_v9';

const DEFAULT_FRONT_IMAGE = '/images/pokemon-energy-front.png';
const DEFAULT_BACK_IMAGE = '/images/card-back-water.jpg';
const ALL_RARITIES: CardRarity[] = ['rare', 'epic', 'legendary'];

const EMPTY_DECKS: RarityDecks = {
  rare: [],
  epic: [],
  legendary: [],
};

const RARITY_CONFIG: Record<
  CardRarity,
  {
    shortLabel: string;
    label: string;
    phaseLabel: string;
    activeTabClass: string;
    confettiColors: string[];
  }
> = {
  rare: {
    shortLabel: 'Rare',
    label: 'Rare (Blau Wasser)',
    phaseLabel: 'Phase 1 · Rare',
    activeTabClass:
      'bg-gradient-to-r from-cyan-400 to-blue-500 text-black shadow-[0_0_12px_rgba(56,189,248,0.65)]',
    confettiColors: ['#bae6fd', '#7dd3fc', '#a5b4fc', '#e0f2fe'],
  },
  epic: {
    shortLabel: 'Epic',
    label: 'Epic (Magenta Flamme)',
    phaseLabel: 'Phase 2 · Epic',
    activeTabClass:
      'bg-gradient-to-r from-fuchsia-600 via-pink-500 to-orange-400 text-white shadow-[0_0_12px_rgba(236,72,153,0.7)]',
    confettiColors: ['#e879f9', '#f472b6', '#fb923c', '#c026d3'],
  },
  legendary: {
    shortLabel: 'Legendary',
    label: 'Legendary (Gold)',
    phaseLabel: 'Phase 3 · Legendary',
    activeTabClass:
      'bg-gradient-to-r from-yellow-300 via-amber-400 to-amber-600 text-black shadow-[0_0_14px_rgba(250,204,21,0.75)]',
    confettiColors: ['#facc15', '#fde047', '#fef3c7', '#f59e0b'],
  },
};

function createBlankCard(tier: CardRarity, index: number, seed: number): TcgCardData {
  return {
    id: `card_${tier}_${index + 1}_${seed}`,
    name: `${tier.toUpperCase()} #${index + 1}`,
    isFlipped: true, // Start showing numbers 1..N on the back
    isEliminated: false,
    rotation: 0,
    borderStyle: 'neon-cyan',
    front: {
      title: `Karte #${index + 1}`,
      subtitle: '',
      notes: '',
      imageUrl: DEFAULT_FRONT_IMAGE,
      imageFit: 'contain',
      holoEffect: 'none',
      counters: [],
    },
    back: {
      title: '',
      subtitle: '',
      notes: '',
      imageUrl: DEFAULT_BACK_IMAGE,
      holoEffect: 'none',
      counters: [
        {
          id: 'cnt_1',
          label: '',
          value: index + 1,
          step: 1,
        },
      ],
    },
  };
}

function normalizeTierCards(rawCards: any[], tier: CardRarity): TcgCardData[] {
  if (!Array.isArray(rawCards)) return [];
  return rawCards.map((c, idx) => {
    const rawId = typeof c?.id === 'string' ? c.id : '';
    const ensuredId = rawId.startsWith(`card_${tier}_`)
      ? rawId
      : `card_${tier}_${idx + 1}_${rawId || Date.now()}`;
    return {
      ...c,
      id: ensuredId,
      isEliminated: Boolean(c?.isEliminated),
      front: {
        ...c?.front,
        title: c?.front?.title || `Karte #${idx + 1}`,
        subtitle: c?.front?.subtitle || '',
        notes: c?.front?.notes || '',
        imageUrl: c?.front?.imageUrl || DEFAULT_FRONT_IMAGE,
        imageFit: c?.front?.imageFit || 'contain',
        holoEffect: c?.front?.holoEffect || 'none',
        counters: c?.front?.counters || [],
      },
      back: {
        ...c?.back,
        title: '',
        subtitle: '',
        notes: '',
        imageUrl: DEFAULT_BACK_IMAGE,
        holoEffect: 'none',
        counters: [
          {
            id: 'cnt_1',
            label: '',
            value: idx + 1,
            step: 1,
          },
        ],
      },
    };
  });
}

function normalizeDecks(raw: Partial<Record<CardRarity, any[]>> | null | undefined): RarityDecks {
  const rare = normalizeTierCards(raw?.rare ?? [], 'rare');
  const epic = normalizeTierCards(raw?.epic ?? [], 'epic');
  const legendary = normalizeTierCards(raw?.legendary ?? [], 'legendary');

  // Ensure if one tier has cards and another was empty (e.g. legacy migration), counts stay aligned
  const targetLen = Math.max(rare.length, epic.length, legendary.length);
  if (targetLen === 0) return { rare: [], epic: [], legendary: [] };

  const seed = Date.now();
  const padTier = (arr: TcgCardData[], tier: CardRarity) => {
    if (arr.length === targetLen) return arr;
    const next = [...arr];
    for (let i = arr.length; i < targetLen; i++) {
      next.push(createBlankCard(tier, i, seed));
    }
    return next;
  };

  return {
    rare: padTier(rare, 'rare'),
    epic: padTier(epic, 'epic'),
    legendary: padTier(legendary, 'legendary'),
  };
}

async function hydrateDeckImagesFromIdb(decks: RarityDecks): Promise<RarityDecks> {
  const out: RarityDecks = { rare: [], epic: [], legendary: [] };
  for (const tier of ALL_RARITIES) {
    out[tier] = await Promise.all(
      decks[tier].map(async (c) => {
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
  }
  return out;
}

async function persistDecksSafely(decks: RarityDecks, updatedAt: number) {
  try {
    localStorage.setItem(STORAGE_KEY_UPDATED_AT, String(updatedAt));
    localStorage.setItem(STORAGE_KEY_DECKS, JSON.stringify(decks));
  } catch {
    // QuotaExceededError fallback: store custom base64 images in IndexedDB and compact refs in localStorage
    try {
      const compact: RarityDecks = { rare: [], epic: [], legendary: [] };
      for (const tier of ALL_RARITIES) {
        compact[tier] = await Promise.all(
          decks[tier].map(async (c) => {
            const url = c.front?.imageUrl || '';
            if (url.startsWith('data:image/')) {
              const imgId = await hashImageDataUrl(url);
              await cacheCustomImage(imgId, url);
              return { ...c, front: { ...c.front, imageUrl: `idb:${imgId}` } };
            }
            return c;
          })
        );
      }
      localStorage.setItem(STORAGE_KEY_DECKS, JSON.stringify(compact));
    } catch (err) {
      console.warn('LocalStorage fallback save error', err);
    }
  }
}

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
    const fitCardW = Math.max(minFloorW, Math.floor(availW / fitCols - 2 * fallbackBleed));
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

export default function HomeView() {
  const [decks, setDecks] = useState<RarityDecks>(EMPTY_DECKS);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [theme, setTheme] = useState<PlaymatTheme>('dark-carbon');
  const [rarity, setRarity] = useState<CardRarity>('rare');
  const [isVerticalMode, setIsVerticalMode] = useState(false);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(sound.getMuted());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);

  // Live Sync status
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('connecting');
  const [connectedDevices, setConnectedDevices] = useState<number>(1);

  // Active cards belong strictly to the current phase (Rare, Epic, or Legendary)
  const cards = decks[rarity];

  // Live Arena container dimensions for exact responsive card sizing
  const arenaRef = useRef<HTMLDivElement>(null);
  const [arenaSize, setArenaSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  // Atomic state refs for conflict-free Live Sync
  const decksRef = useRef<RarityDecks>(EMPTY_DECKS);
  const rarityRef = useRef<CardRarity>('rare');
  const themeRef = useRef<PlaymatTheme>('dark-carbon');
  const updatedAtRef = useRef<number>(0);
  const syncControllerRef = useRef<LiveArenaSyncController | null>(null);

  useEffect(() => {
    decksRef.current = decks;
  }, [decks]);
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

  // Load initial per-phase decks from LocalStorage (+ IndexedDB custom images) AND start Live Sync
  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const savedTs = Number(localStorage.getItem(STORAGE_KEY_UPDATED_AT) || '0');
        if (!Number.isNaN(savedTs) && savedTs > 0) {
          updatedAtRef.current = savedTs;
        }

        const savedRarityRaw = localStorage.getItem(STORAGE_KEY_RARITY) as CardRarity | null;
        const initialRarity: CardRarity =
          savedRarityRaw === 'rare' ||
          savedRarityRaw === 'epic' ||
          savedRarityRaw === 'legendary'
            ? savedRarityRaw
            : 'rare';

        if (!cancelled) {
          rarityRef.current = initialRarity;
          setRarity(initialRarity);
        }

        const savedDecksJson = localStorage.getItem(STORAGE_KEY_DECKS);
        if (savedDecksJson) {
          const parsed = JSON.parse(savedDecksJson);
          const normalized = normalizeDecks(parsed);
          const hydrated = await hydrateDeckImagesFromIdb(normalized);
          if (!cancelled) {
            decksRef.current = hydrated;
            setDecks(hydrated);
          }
        } else {
          // One-time migration from legacy single-deck v8/v7 into the active phase ONLY,
          // creating fresh independent cards for the other two phases!
          const legacyJson =
            localStorage.getItem(STORAGE_KEY_CARDS_LEGACY_V8) ||
            localStorage.getItem(STORAGE_KEY_CARDS_LEGACY_V7);
          if (legacyJson) {
            const parsedLegacy = JSON.parse(legacyJson);
            if (Array.isArray(parsedLegacy) && parsedLegacy.length > 0) {
              const migrated = normalizeDecks({ [initialRarity]: parsedLegacy });
              const hydrated = await hydrateDeckImagesFromIdb(migrated);
              if (!cancelled) {
                decksRef.current = hydrated;
                setDecks(hydrated);
              }
            }
          }
        }

        const savedTheme = localStorage.getItem(STORAGE_KEY_THEME) as PlaymatTheme | null;
        if (savedTheme && !cancelled) {
          themeRef.current = savedTheme;
          setTheme(savedTheme);
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
          decks: decksRef.current,
        }),
        onRemoteSnapshot: (snap: LiveArenaSnapshot) => {
          if (cancelled) return;
          const cleanDecks = normalizeDecks(snap.decks);
          updatedAtRef.current = snap.updatedAt;
          decksRef.current = cleanDecks;
          rarityRef.current = snap.rarity;
          themeRef.current = snap.theme;

          setDecks(cleanDecks);
          setRarity(snap.rarity);
          setTheme(snap.theme);

          void persistDecksSafely(cleanDecks, snap.updatedAt);
          try {
            localStorage.setItem(STORAGE_KEY_RARITY, snap.rarity);
            localStorage.setItem(STORAGE_KEY_THEME, snap.theme);
          } catch {
            // ignore
          }

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
          setDecks((prev) => {
            const next: RarityDecks = {
              rare: prev.rare.map((c) =>
                c.front.imageUrl === `idb:${imageId}`
                  ? { ...c, front: { ...c.front, imageUrl: dataUrl } }
                  : c
              ),
              epic: prev.epic.map((c) =>
                c.front.imageUrl === `idb:${imageId}`
                  ? { ...c, front: { ...c.front, imageUrl: dataUrl } }
                  : c
              ),
              legendary: prev.legendary.map((c) =>
                c.front.imageUrl === `idb:${imageId}`
                  ? { ...c, front: { ...c.front, imageUrl: dataUrl } }
                  : c
              ),
            };
            decksRef.current = next;
            void persistDecksSafely(next, updatedAtRef.current);
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
        decks: RarityDecks;
        rarity: CardRarity;
        theme: PlaymatTheme;
      }) => {
        decks?: RarityDecks;
        rarity?: CardRarity;
        theme?: PlaymatTheme;
      },
      eventType: SyncEventType = 'update'
    ) => {
      const patch = updater({
        decks: decksRef.current,
        rarity: rarityRef.current,
        theme: themeRef.current,
      });

      const nextDecks = patch.decks ?? decksRef.current;
      const nextRarity = patch.rarity ?? rarityRef.current;
      const nextTheme = patch.theme ?? themeRef.current;
      const nextUpdatedAt = Math.max(Date.now(), updatedAtRef.current + 1);

      decksRef.current = nextDecks;
      rarityRef.current = nextRarity;
      themeRef.current = nextTheme;
      updatedAtRef.current = nextUpdatedAt;

      setDecks(nextDecks);
      setRarity(nextRarity);
      setTheme(nextTheme);

      void persistDecksSafely(nextDecks, nextUpdatedAt);
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
          decks: nextDecks,
        });
      }
    },
    []
  );

  // Helper to update ONLY the currently active phase's deck (100% phase isolation)
  const commitCurrentPhaseCards = useCallback(
    (
      mapCards: (phaseCards: TcgCardData[], activeRarity: CardRarity) => TcgCardData[],
      eventType: SyncEventType = 'update'
    ) => {
      commitArenaUpdate(({ decks: curDecks, rarity: curRarity }) => {
        const updatedPhaseCards = mapCards(curDecks[curRarity], curRarity);
        return {
          decks: {
            ...curDecks,
            [curRarity]: updatedPhaseCards,
          },
        };
      }, eventType);
    },
    [commitArenaUpdate]
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

  // Flip All Active (non-eliminated) Cards in the current phase
  const handleFlipAll = useCallback(() => {
    commitCurrentPhaseCards(
      (prev) => prev.map((c) => (c.isEliminated ? c : { ...c, isFlipped: !c.isFlipped })),
      'flip'
    );
  }, [commitCurrentPhaseCards]);

  // Uncover current phase to edit prizes (`showNumbersSide = false`) OR cover ALL phases back to 1..N (`showNumbersSide = true`)
  const handleSetAllFlipped = useCallback(
    (showNumbersSide: boolean) => {
      sound.playCardFlip();
      if (showNumbersSide) {
        // Cover all 3 phases onto 1..N so no phase is accidentally left face-up before going live
        commitArenaUpdate(
          ({ decks: curDecks }) => {
            const nextDecks: RarityDecks = { rare: [], epic: [], legendary: [] };
            for (const tier of ALL_RARITIES) {
              nextDecks[tier] = curDecks[tier].map((c, idx) => ({
                ...c,
                isFlipped: true,
                back: {
                  ...c.back,
                  counters: [{ id: 'cnt_1', label: '', value: idx + 1, step: 1 }],
                },
              }));
            }
            return { decks: nextDecks };
          },
          'flip'
        );
      } else {
        // Flip only the current phase to its prize side so the user can inspect/upload its unique cards
        commitCurrentPhaseCards(
          (prev) => prev.map((c) => ({ ...c, isFlipped: false })),
          'flip'
        );
      }
    },
    [commitArenaUpdate, commitCurrentPhaseCards]
  );

  // Switch phase directly in Preview Mode (for editing/viewing each phase's unique cards)
  const handleSelectPhaseDirect = useCallback(
    (targetRarity: CardRarity) => {
      if (targetRarity === rarityRef.current) return;
      sound.playClick(640);
      commitArenaUpdate(() => ({ rarity: targetRarity }), 'update');
    },
    [commitArenaUpdate]
  );

  // GIVEAWAY LEVEL UP:
  // Advances Rarity (Rare -> Epic -> Legendary -> Rare) and starts that phase's OWN unique deck on 1..N!
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
        ({ decks: curDecks }) => ({
          rarity: nextRarity,
          decks: {
            ...curDecks,
            [nextRarity]: curDecks[nextRarity].map((c, idx) => ({
              ...c,
              isFlipped: true,
              isEliminated: false,
              back: {
                ...c.back,
                counters: [{ id: 'cnt_1', label: '', value: idx + 1, step: 1 }],
              },
            })),
          },
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

  // Create N independent cards for EACH phase (Rare, Epic, Legendary) numbered 1..N
  const handleGenerateCards = useCallback(
    (count: number, keepExistingPrizes = false) => {
      const safeCount = Math.max(1, Math.min(100, count));
      const now = Date.now();

      commitArenaUpdate(
        ({ decks: curDecks }) => {
          const nextDecks: RarityDecks = { rare: [], epic: [], legendary: [] };
          for (const tier of ALL_RARITIES) {
            const existingTier = curDecks[tier] || [];
            const tierList: TcgCardData[] = [];
            for (let i = 0; i < safeCount; i++) {
              const blank = createBlankCard(tier, i, now);
              const prevCard = keepExistingPrizes ? existingTier[i] : undefined;
              if (prevCard) {
                tierList.push({
                  ...blank,
                  front: { ...prevCard.front },
                });
              } else {
                tierList.push(blank);
              }
            }
            nextDecks[tier] = tierList;
          }
          return {
            decks: nextDecks,
            rarity: keepExistingPrizes ? rarityRef.current : 'rare',
          };
        },
        'setup'
      );
    },
    [commitArenaUpdate]
  );

  // Flip Single Card (strictly in current phase)
  const handleFlipCard = useCallback(
    (cardId: string) => {
      commitCurrentPhaseCards(
        (prev) => prev.map((c) => (c.id === cardId ? { ...c, isFlipped: !c.isFlipped } : c)),
        'flip'
      );
    },
    [commitCurrentPhaseCards]
  );

  // Toggle Card Out-of-Pool ("als weg markieren" / X) strictly in current phase
  const handleToggleEliminated = useCallback(
    (cardId: string) => {
      commitCurrentPhaseCards(
        (prev) =>
          prev.map((c) => (c.id === cardId ? { ...c, isEliminated: !c.isEliminated } : c)),
        'eliminate'
      );
    },
    [commitCurrentPhaseCards]
  );

  // Clear all X marks in current phase
  const handleClearAllEliminated = useCallback(() => {
    sound.playClick(720);
    commitCurrentPhaseCards(
      (prev) => prev.map((c) => ({ ...c, isEliminated: false })),
      'eliminate'
    );
  }, [commitCurrentPhaseCards]);

  // Update Front Text strictly in current phase
  const handleUpdateFrontText = useCallback(
    (cardId: string, text: string) => {
      commitCurrentPhaseCards(
        (prev) =>
          prev.map((c) => (c.id === cardId ? { ...c, front: { ...c.front, notes: text } } : c)),
        'update'
      );
    },
    [commitCurrentPhaseCards]
  );

  // Update Single Card Front Prize Image strictly in current phase
  const handleUpdateFrontImage = useCallback(
    (cardId: string, imageUrl: string, imageFit: 'cover' | 'contain' = 'contain') => {
      commitCurrentPhaseCards(
        (prev) =>
          prev.map((c) =>
            c.id === cardId ? { ...c, front: { ...c.front, imageUrl, imageFit } } : c
          ),
        'update'
      );
    },
    [commitCurrentPhaseCards]
  );

  // Batch-upload multiple dropped/selected prize images sequentially strictly in current phase
  const handleBatchUpdateFrontImages = useCallback(
    (startIndex: number, imageUrls: string[]) => {
      commitCurrentPhaseCards((prev) => {
        const next = [...prev];
        for (let offset = 0; offset < imageUrls.length; offset++) {
          const targetIdx = startIndex + offset;
          if (targetIdx >= next.length) break;
          next[targetIdx] = {
            ...next[targetIdx],
            front: {
              ...next[targetIdx].front,
              imageUrl: imageUrls[offset],
              imageFit: next[targetIdx].front.imageFit || 'contain',
            },
          };
        }
        return next;
      }, 'update');
    },
    [commitCurrentPhaseCards]
  );

  // Reverse prize order strictly in current phase while keeping slot numbers 1..N sequential
  const handleSwapCards = useCallback(() => {
    commitCurrentPhaseCards((prev) => {
      const reversedFronts = [...prev].reverse().map((c) => c.front);
      return prev.map((c, idx) => ({
        ...c,
        front: reversedFronts[idx],
      }));
    }, 'update');
  }, [commitCurrentPhaseCards]);

  const handleResetCards = useCallback(() => {
    commitArenaUpdate(() => ({ decks: EMPTY_DECKS, rarity: 'rare' }), 'reset');
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

  // Count how many unique custom prize images/texts are configured per phase
  const uploadedCountsByTier = useMemo(() => {
    const countCustom = (list: TcgCardData[]) =>
      list.filter(
        (c) =>
          (c.front.imageUrl && c.front.imageUrl !== DEFAULT_FRONT_IMAGE) ||
          Boolean(c.front.notes?.trim())
      ).length;
    return {
      rare: countCustom(decks.rare),
      epic: countCustom(decks.epic),
      legendary: countCustom(decks.legendary),
    };
  }, [decks]);

  const hasAnyCustomUploads =
    uploadedCountsByTier.rare > 0 ||
    uploadedCountsByTier.epic > 0 ||
    uploadedCountsByTier.legendary > 0;

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
                {ALL_RARITIES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => handleGiveawayLevelUp(r)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 ${
                      rarity === r
                        ? RARITY_CONFIG[r].activeTabClass
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title={`Zu ${RARITY_CONFIG[r].label} wechseln (eigenes Karten-Set 1–${cards.length})`}
                  >
                    {RARITY_CONFIG[r].shortLabel}
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
                  title="Alle X-Markierungen dieser Phase aufheben"
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
                  title={`Giveaway Level Up (${nextRarityLabel}) – lädt das eigene ${nextRarityLabel}-Kartenset auf 1 bis ${cards.length}`}
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
                  onBatchUpdateFrontImages={handleBatchUpdateFrontImages}
                />
              ))}
            </div>
          )}
        </div>

        {/* Bottom Control Dock */}
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
              {/* Direct 3-Phase Deck Switcher (each phase holds its OWN unique cards!) */}
              <div
                className="flex items-center gap-0.5 p-0.5 rounded-xl bg-white/5 border border-white/15"
                title="Jede Phase (Rare, Epic, Legendary) besitzt eigene, unabhängige Gewinn-Karten"
              >
                {ALL_RARITIES.map((r) => {
                  const isActive = rarity === r;
                  const uploaded = uploadedCountsByTier[r];
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => handleSelectPhaseDirect(r)}
                      className={`flex items-center gap-1 rounded-lg font-extrabold transition-all active:scale-95 ${
                        isVerticalMode ? 'px-1.5 py-1 text-[10px]' : 'px-2.5 py-1.5 text-xs'
                      } ${
                        isActive
                          ? RARITY_CONFIG[r].activeTabClass
                          : 'text-slate-300 hover:text-white hover:bg-white/10'
                      }`}
                      title={`${RARITY_CONFIG[r].phaseLabel} bearbeiten (${uploaded}/${decks[r].length} eigene Gewinne geladen)`}
                    >
                      {r === 'legendary' ? (
                        <Crown className="w-3 h-3 shrink-0" />
                      ) : r === 'epic' ? (
                        <Flame className="w-3 h-3 shrink-0" />
                      ) : (
                        <Droplets className="w-3 h-3 shrink-0" />
                      )}
                      <span>
                        {isVerticalMode
                          ? r === 'legendary'
                            ? 'Leg.'
                            : RARITY_CONFIG[r].shortLabel
                          : RARITY_CONFIG[r].shortLabel}
                      </span>
                      {uploaded > 0 && (
                        <span
                          className={`px-1 rounded text-[9px] font-black leading-tight ${
                            isActive
                              ? 'bg-black/25 text-current'
                              : 'bg-white/15 text-emerald-300'
                          }`}
                        >
                          {uploaded}/{decks[r].length}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Uncover current phase prizes vs Cover all phases to 1..N */}
              <button
                type="button"
                onClick={() => handleSetAllFlipped(false)}
                className={`flex items-center gap-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 font-bold active:scale-95 transition-all ${
                  isVerticalMode ? 'px-2 py-1 text-[11px]' : 'px-2.5 py-2 text-xs'
                }`}
                title={`Karten von ${RARITY_CONFIG[rarity].shortLabel} aufdecken, um eigene Gewinn-Bilder hochzuladen`}
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
                title="Alle Phasen verdecken (auf die Zahlen 1 bis N drehen)"
              >
                <RotateCcw className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>{isVerticalMode ? `1–${cards.length}` : `Alle auf 1–${cards.length}`}</span>
              </button>

              {/* Reset Eliminated X Marks in current phase */}
              {eliminatedCount > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllEliminated}
                  className={`flex items-center gap-1 rounded-xl bg-rose-500/20 hover:bg-rose-500/35 border border-rose-400/50 text-rose-200 font-bold active:scale-95 transition-all ${
                    isVerticalMode ? 'px-2 py-1 text-[11px]' : 'px-2.5 py-2 text-xs'
                  }`}
                  title="Alle X-Markierungen dieser Phase aufheben"
                >
                  <Undo2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>
                    {isVerticalMode ? `X frei (${eliminatedCount})` : `X aufheben (${eliminatedCount})`}
                  </span>
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
                title={`Giveaway Level Up: Startet ${nextRarityLabel} mit dem eigenen ${nextRarityLabel}-Kartenset (verdeckt auf 1–${cards.length})`}
              >
                <Flame className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {isVerticalMode ? 'Level Up' : `Level Up (${nextRarityLabel})`}
                </span>
              </button>

              {/* Vertical 9:16 Stream Mode Toggle */}
              <button
                type="button"
                onClick={() => {
                  sound.playClick(650);
                  setIsVerticalMode((prev) => !prev);
                }}
                className={`flex items-center gap-1 rounded-xl text-xs font-bold active:scale-95 transition-all border ${
                  isVerticalMode
                    ? 'bg-emerald-500/25 border-emerald-400 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)] px-2 py-1'
                    : 'bg-white/10 border-transparent hover:bg-white/20 text-slate-200 px-2.5 py-2'
                }`}
                title="Vertikaler 9:16 Modus für Whatnot & Instagram (Rechts & Links komplett frei)"
              >
                {isVerticalMode ? (
                  <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Monitor className="w-4 h-4 text-cyan-400" />
                )}
                <span className="hidden sm:inline">{isVerticalMode ? '9:16 AN' : '9:16'}</span>
              </button>

              {/* Swap Prize Order in current phase */}
              {cards.length > 1 && !isVerticalMode && (
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick(600);
                    handleSwapCards();
                  }}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white active:scale-95 transition-all"
                  title="Gewinn-Reihenfolge in dieser Phase umkehren"
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
                  isVerticalMode ? 'px-2 py-1' : 'px-2.5 py-2'
                }`}
                title="Kartenanzahl ändern"
              >
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
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
                    if (confirm('Zurück zum Home-Screen (alle Phasen leeren)?')) {
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
                  isVerticalMode ? 'px-2.5 py-1' : 'px-3 py-2'
                }`}
                title="Präsentationsmodus / Vollbild starten"
              >
                <Maximize className="w-3.5 h-3.5" />
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
        hasExistingUploads={hasAnyCustomUploads}
      />

      {/* Dice & Coin Tool Modal */}
      <DiceCoinTool isOpen={isToolsOpen} onClose={() => setIsToolsOpen(false)} />
    </main>
  );
}
