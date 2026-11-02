'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  ActiveGiveawaySelection,
  CardRarity,
  DEFAULT_OVERLAY_DISPLAY_SETTINGS,
  GiveawayItem,
  GiveawayPools,
  LevelUpEvent,
  OverlayAnchorPosition,
  OverlayDisplaySettings,
} from '../types/card';
import { PlaymatBackground } from './PlaymatBackground';
import { DEFAULT_GIVEAWAY_IMAGE, GiveawayOverlayCard } from './GiveawayOverlayCard';
import { TierSetupModal } from './TierSetupModal';
import {
  LiveGiveawaySnapshot,
  LiveGiveawaySyncController,
  SyncMeta,
  cacheCustomImage,
  computeTierProgress,
  hashImageDataUrl,
  loadCachedImage,
} from '../lib/liveSync';
import { sound } from '../utils/sound';
import {
  Droplets,
  Flame,
  Crown,
  Copy,
  Check,
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  ImagePlus,
  Maximize2,
  Trash2,
  Plus,
  Layers,
  ArrowLeft,
  ArrowRight,
  Radio,
  Volume2,
  VolumeX,
  LogOut,
  RotateCcw,
  Upload,
  Tv,
  Link2,
  Zap,
} from 'lucide-react';

const STORAGE_KEY_STATE = 'mc_giveaway_overlay_state_v1';
const ALL_RARITIES: CardRarity[] = ['rare', 'epic', 'legendary'];

const EMPTY_POOLS: GiveawayPools = {
  rare: [],
  epic: [],
  legendary: [],
};

type PreviewBackdropMode = 'checker' | 'dark' | 'light';

const TIER_CONFIG: Record<
  CardRarity,
  {
    label: string;
    subtitle: string;
    activeTabClass: string;
    ringBorderClass: string;
    badgeClass: string;
    ambientClass: string;
  }
> = {
  rare: {
    label: 'Rare',
    subtitle: 'Wasser-Blau',
    activeTabClass:
      'bg-gradient-to-r from-sky-400 to-blue-500 text-black shadow-[0_0_16px_rgba(56,189,248,0.45)]',
    ringBorderClass: 'border-sky-400/50',
    badgeClass: 'bg-sky-400/15 text-sky-200 border-sky-400/35',
    ambientClass: 'bg-sky-500/[0.07]',
  },
  epic: {
    label: 'Epic',
    subtitle: 'Lila Liquid',
    activeTabClass:
      'bg-gradient-to-r from-purple-600 via-fuchsia-500 to-violet-500 text-white shadow-[0_0_16px_rgba(168,85,247,0.55)]',
    ringBorderClass: 'border-purple-400/55',
    badgeClass: 'bg-purple-500/15 text-purple-200 border-purple-400/35',
    ambientClass: 'bg-purple-600/[0.08]',
  },
  legendary: {
    label: 'Legendary',
    subtitle: 'Gold',
    activeTabClass:
      'bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 text-black shadow-[0_0_18px_rgba(250,204,21,0.55)]',
    ringBorderClass: 'border-amber-300/65',
    badgeClass: 'bg-amber-400/15 text-amber-200 border-amber-300/40',
    ambientClass: 'bg-amber-400/[0.07]',
  },
};

function createBlankGiveawayItem(tier: CardRarity, index: number, seed: number): GiveawayItem {
  const rand = Math.random().toString(36).slice(2, 7);
  return {
    id: `gw_${tier}_${index + 1}_${seed}_${rand}`,
    title: '',
    imageUrl: DEFAULT_GIVEAWAY_IMAGE,
    imageFit: 'contain',
    isCompleted: false,
  };
}

function normalizePools(raw: Partial<Record<CardRarity, any[]>> | null | undefined): GiveawayPools {
  const seed = Date.now();
  const normTier = (list: any[] | undefined, tier: CardRarity): GiveawayItem[] => {
    if (!Array.isArray(list)) return [];
    return list.map((item, idx) => ({
      id:
        typeof item?.id === 'string' && item.id.startsWith(`gw_${tier}_`)
          ? item.id
          : `gw_${tier}_${idx + 1}_${seed}_${idx}`,
      title: typeof item?.title === 'string' ? item.title : '',
      imageUrl:
        typeof item?.imageUrl === 'string' && item.imageUrl.length > 0
          ? item.imageUrl
          : DEFAULT_GIVEAWAY_IMAGE,
      imageFit: item?.imageFit === 'cover' ? 'cover' : 'contain',
      isCompleted: Boolean(item?.isCompleted),
    }));
  };

  return {
    rare: normTier(raw?.rare, 'rare'),
    epic: normTier(raw?.epic, 'epic'),
    legendary: normTier(raw?.legendary, 'legendary'),
  };
}

function resolveValidActive(
  pools: GiveawayPools,
  preferred: ActiveGiveawaySelection | null
): ActiveGiveawaySelection | null {
  if (preferred) {
    const found = pools[preferred.rarity]?.some((it) => it.id === preferred.itemId);
    if (found) return preferred;
  }
  for (const tier of ALL_RARITIES) {
    if (pools[tier].length > 0) {
      return { rarity: tier, itemId: pools[tier][0].id };
    }
  }
  return null;
}

/**
 * Compresses uploaded image to crisp WebP while preserving 100% alpha transparency
 * and auto-trimming dead transparent outer padding around Booster / Slab PNGs.
 */
async function compressImageFile(file: File, maxDim = 780): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('File read error'));
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
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

        // Auto-trim excess transparent outer whitespace so cutout Boosters fill their target width cleanly
        try {
          const { data } = ctx.getImageData(0, 0, width, height);
          let minX = width;
          let minY = height;
          let maxX = -1;
          let maxY = -1;
          for (let y = 0; y < height; y++) {
            const rowOffset = y * width * 4;
            for (let x = 0; x < width; x++) {
              if (data[rowOffset + x * 4 + 3] > 10) {
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
                resolve(trimmed.toDataURL('image/webp', 0.85));
                return;
              }
            }
          }
        } catch {
          // Fallback to untrimmed canvas
        }

        resolve(canvas.toDataURL('image/webp', 0.85));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

async function persistSnapshotSafely(snapshot: LiveGiveawaySnapshot) {
  try {
    localStorage.setItem(STORAGE_KEY_STATE, JSON.stringify(snapshot));
  } catch {
    try {
      const compactPools: GiveawayPools = { rare: [], epic: [], legendary: [] };
      for (const tier of ALL_RARITIES) {
        compactPools[tier] = await Promise.all(
          snapshot.pools[tier].map(async (it) => {
            if (it.imageUrl?.startsWith('data:image/')) {
              const imgId = await hashImageDataUrl(it.imageUrl);
              await cacheCustomImage(imgId, it.imageUrl);
              return { ...it, imageUrl: `idb:${imgId}` };
            }
            return it;
          })
        );
      }
      localStorage.setItem(
        STORAGE_KEY_STATE,
        JSON.stringify({ ...snapshot, pools: compactPools })
      );
    } catch (err) {
      console.warn('LocalStorage persist error', err);
    }
  }
}

interface GiveawayStudioClientProps {
  initialOverlayKey: string;
}

export const GiveawayStudioClient: React.FC<GiveawayStudioClientProps> = ({
  initialOverlayKey,
}) => {
  const [pools, setPools] = useState<GiveawayPools>(EMPTY_POOLS);
  const [active, setActive] = useState<ActiveGiveawaySelection | null>(null);
  const [overlaySettings, setOverlaySettings] = useState<OverlayDisplaySettings>(
    DEFAULT_OVERLAY_DISPLAY_SETTINGS
  );
  const [levelUpEvent, setLevelUpEvent] = useState<LevelUpEvent | null>(null);
  const [selectedTab, setSelectedTab] = useState<CardRarity>('rare');
  const [hasInitialized, setHasInitialized] = useState(false);

  // Welcome quick-setup counts (shown when all 3 pools are empty)
  const [welcomeCounts, setWelcomeCounts] = useState<Record<CardRarity, number>>({
    rare: 30,
    epic: 15,
    legendary: 10,
  });

  // UI Modals & Preview state
  const [isTierModalOpen, setIsTierModalOpen] = useState(false);
  const [overlayKey, setOverlayKey] = useState<string>(initialOverlayKey);
  const [originUrl, setOriginUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [previewBg, setPreviewBg] = useState<PreviewBackdropMode>('checker');
  const [isMuted, setIsMuted] = useState(sound.getMuted());
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);

  // Sync status
  const [syncMeta, setSyncMeta] = useState<SyncMeta>({
    status: 'connecting',
    totalDevices: 1,
    overlayCount: 0,
  });

  // File inputs
  const tierBulkInputRef = useRef<HTMLInputElement>(null);
  const slotFileInputRef = useRef<HTMLInputElement>(null);
  const pendingUploadSlotIdxRef = useRef<number>(0);

  // Atomic state refs for conflict-free Live Sync
  const poolsRef = useRef<GiveawayPools>(EMPTY_POOLS);
  const activeRef = useRef<ActiveGiveawaySelection | null>(null);
  const overlaySettingsRef = useRef<OverlayDisplaySettings>(DEFAULT_OVERLAY_DISPLAY_SETTINGS);
  const levelUpRef = useRef<LevelUpEvent | null>(null);
  const updatedAtRef = useRef<number>(0);
  const syncControllerRef = useRef<LiveGiveawaySyncController | null>(null);

  useEffect(() => {
    setOriginUrl(window.location.origin);
  }, []);

  useEffect(() => {
    poolsRef.current = pools;
  }, [pools]);
  useEffect(() => {
    activeRef.current = active;
  }, [active]);
  useEffect(() => {
    overlaySettingsRef.current = overlaySettings;
  }, [overlaySettings]);

  // Bootstrap from LocalStorage + IndexedDB and start real-time sync controller
  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      let hadRestoredLocalState = false;
      try {
        const raw = localStorage.getItem(STORAGE_KEY_STATE);
        if (raw) {
          const parsed = JSON.parse(raw) as LiveGiveawaySnapshot;
          if (parsed?.pools) {
            const normalized = normalizePools(parsed.pools);
            const hydrated: GiveawayPools = { rare: [], epic: [], legendary: [] };
            for (const tier of ALL_RARITIES) {
              hydrated[tier] = await Promise.all(
                normalized[tier].map(async (it) => {
                  if (it.imageUrl.startsWith('idb:')) {
                    const cached = await loadCachedImage(it.imageUrl.slice(4));
                    if (cached) return { ...it, imageUrl: cached };
                  }
                  return it;
                })
              );
            }
            const mergedOverlay = { ...DEFAULT_OVERLAY_DISPLAY_SETTINGS, ...parsed.overlay };
            const validActive = resolveValidActive(hydrated, parsed.active ?? null);

            if (!cancelled) {
              updatedAtRef.current = parsed.updatedAt || 0;
              poolsRef.current = hydrated;
              activeRef.current = validActive;
              overlaySettingsRef.current = mergedOverlay;

              setPools(hydrated);
              setActive(validActive);
              setOverlaySettings(mergedOverlay);
              if (validActive) {
                setSelectedTab(validActive.rarity);
              }
              hadRestoredLocalState =
                (parsed.updatedAt || 0) > 0 &&
                (hydrated.rare.length + hydrated.epic.length + hydrated.legendary.length > 0);
            }
          }
        }
      } catch (err) {
        console.warn('Bootstrap storage load error', err);
      } finally {
        if (!cancelled) setHasInitialized(true);
      }

      if (cancelled) return;

      const controller = new LiveGiveawaySyncController({
        role: 'studio',
        getLocalSnapshot: (clientId): LiveGiveawaySnapshot => ({
          updatedAt: updatedAtRef.current,
          senderId: clientId,
          pools: poolsRef.current,
          active: activeRef.current,
          overlay: overlaySettingsRef.current,
          levelUp: levelUpRef.current,
        }),
        onRemoteSnapshot: (snap) => {
          if (cancelled) return;
          const cleanPools = normalizePools(snap.pools);
          const mergedOverlay = { ...DEFAULT_OVERLAY_DISPLAY_SETTINGS, ...snap.overlay };
          const validActive = resolveValidActive(cleanPools, snap.active);

          updatedAtRef.current = snap.updatedAt;
          poolsRef.current = cleanPools;
          activeRef.current = validActive;
          overlaySettingsRef.current = mergedOverlay;
          if (snap.levelUp) {
            levelUpRef.current = snap.levelUp;
            setLevelUpEvent(snap.levelUp);
          }

          setPools(cleanPools);
          setActive(validActive);
          setOverlaySettings(mergedOverlay);

          void persistSnapshotSafely({
            ...snap,
            pools: cleanPools,
            active: validActive,
            overlay: mergedOverlay,
          });
        },
        onImageHydrated: (imageId, dataUrl) => {
          if (cancelled) return;
          setPools((prev) => {
            const next: GiveawayPools = {
              rare: prev.rare.map((it) =>
                it.imageUrl === `idb:${imageId}` ? { ...it, imageUrl: dataUrl } : it
              ),
              epic: prev.epic.map((it) =>
                it.imageUrl === `idb:${imageId}` ? { ...it, imageUrl: dataUrl } : it
              ),
              legendary: prev.legendary.map((it) =>
                it.imageUrl === `idb:${imageId}` ? { ...it, imageUrl: dataUrl } : it
              ),
            };
            poolsRef.current = next;
            void persistSnapshotSafely({
              updatedAt: updatedAtRef.current,
              senderId: 'local',
              pools: next,
              active: activeRef.current,
              overlay: overlaySettingsRef.current,
            });
            return next;
          });
        },
        onMetaChange: (meta) => {
          if (!cancelled) setSyncMeta(meta);
        },
        onOverlayKeyReceived: (key) => {
          if (!cancelled && key) setOverlayKey(key);
        },
      });

      syncControllerRef.current = controller;
      await controller.start();

      // Re-sync local state to server & connected OBS Browser Sources right after startup
      if (!cancelled && hadRestoredLocalState && updatedAtRef.current > 0) {
        void controller.publishSnapshot({
          updatedAt: updatedAtRef.current,
          senderId: controller.clientId,
          pools: poolsRef.current,
          active: activeRef.current,
          overlay: overlaySettingsRef.current,
        });
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
      syncControllerRef.current?.stop();
      syncControllerRef.current = null;
    };
  }, []);

  // Central atomic commit + instant Live Sync publish to OBS & peer studios
  const commitStudioUpdate = useCallback(
    (
      updater: (cur: {
        pools: GiveawayPools;
        active: ActiveGiveawaySelection | null;
        overlay: OverlayDisplaySettings;
      }) => {
        pools?: GiveawayPools;
        active?: ActiveGiveawaySelection | null;
        overlay?: OverlayDisplaySettings;
        levelUp?: LevelUpEvent | null;
      }
    ) => {
      const patch = updater({
        pools: poolsRef.current,
        active: activeRef.current,
        overlay: overlaySettingsRef.current,
      });

      const nextPools = patch.pools ?? poolsRef.current;
      const rawNextActive = patch.active !== undefined ? patch.active : activeRef.current;
      const nextActive = resolveValidActive(nextPools, rawNextActive);
      const nextOverlay = patch.overlay ?? overlaySettingsRef.current;
      const nextLevelUp =
        patch.levelUp !== undefined ? patch.levelUp : levelUpRef.current;
      const nextUpdatedAt = Math.max(Date.now(), updatedAtRef.current + 1);

      poolsRef.current = nextPools;
      activeRef.current = nextActive;
      overlaySettingsRef.current = nextOverlay;
      levelUpRef.current = nextLevelUp;
      updatedAtRef.current = nextUpdatedAt;

      setPools(nextPools);
      setActive(nextActive);
      setOverlaySettings(nextOverlay);
      if (patch.levelUp !== undefined) {
        setLevelUpEvent(patch.levelUp);
      }

      const controller = syncControllerRef.current;
      const snapshot: LiveGiveawaySnapshot = {
        updatedAt: nextUpdatedAt,
        senderId: controller?.clientId ?? 'studio_local',
        pools: nextPools,
        active: nextActive,
        overlay: nextOverlay,
        levelUp: nextLevelUp,
      };

      void persistSnapshotSafely(snapshot);
      if (controller) {
        void controller.publishSnapshot(snapshot);
      }
    },
    []
  );

  // Configure all 3 tiers at once (e.g. 30 Rare, 15 Epic, 10 Legendary)
  const handleApplyTierCounts = useCallback(
    (counts: Record<CardRarity, number>, clearExistingUploads = false) => {
      const seed = Date.now();
      commitStudioUpdate(({ pools: curPools, active: curActive }) => {
        const nextPools: GiveawayPools = { rare: [], epic: [], legendary: [] };
        for (const tier of ALL_RARITIES) {
          const targetLen = Math.max(0, Math.min(100, counts[tier] || 0));
          const existing = clearExistingUploads ? [] : curPools[tier] || [];
          const list: GiveawayItem[] = [];
          for (let i = 0; i < targetLen; i++) {
            if (existing[i]) {
              list.push(existing[i]);
            } else {
              list.push(createBlankGiveawayItem(tier, i, seed));
            }
          }
          nextPools[tier] = list;
        }
        return {
          pools: nextPools,
          active: clearExistingUploads ? null : curActive,
        };
      });

      if ((counts[selectedTab] || 0) === 0) {
        const firstNonEmpty = ALL_RARITIES.find((t) => (counts[t] || 0) > 0);
        if (firstNonEmpty) setSelectedTab(firstNonEmpty);
      }
    },
    [commitStudioUpdate, selectedTab]
  );

  // Resize ONLY a single tier directly from the inline count stepper
  const handleSetSingleTierCount = useCallback(
    (tier: CardRarity, rawCount: number) => {
      const targetLen = Math.max(0, Math.min(100, Math.round(rawCount)));
      const seed = Date.now();
      commitStudioUpdate(({ pools: curPools }) => {
        const existing = curPools[tier] || [];
        if (existing.length === targetLen) return {};
        const nextList: GiveawayItem[] = [];
        for (let i = 0; i < targetLen; i++) {
          nextList.push(existing[i] ?? createBlankGiveawayItem(tier, i, seed));
        }
        return {
          pools: {
            ...curPools,
            [tier]: nextList,
          },
        };
      });
    },
    [commitStudioUpdate]
  );

  // Select any giveaway card to display LIVE in the OBS Browser Source immediately
  const handleSelectActiveGiveaway = useCallback(
    (rarity: CardRarity, itemId: string) => {
      const prevActive = activeRef.current;
      const tierChanged = prevActive?.rarity !== rarity;
      if (tierChanged) {
        sound.playLevelUp(rarity);
      } else {
        sound.playCardFlip();
      }
      commitStudioUpdate(({ overlay }) => ({
        active: { rarity, itemId },
        overlay: { ...overlay, visible: true },
      }));
    },
    [commitStudioUpdate]
  );

  // Step Prev / Next Giveaway (optionally marking the current active giveaway as completed + auto Level-Up on 100%)
  const handleStepGiveaway = useCallback(
    (direction: 1 | -1, markCurrentCompleted = false) => {
      commitStudioUpdate(({ pools: curPools, active: curActive, overlay }) => {
        if (!curActive) return {};
        const curTier = curActive.rarity;
        const curList = curPools[curTier] || [];
        const curIdx = curList.findIndex((it) => it.id === curActive.itemId);
        if (curIdx < 0) return {};

        let updatedPools = curPools;
        if (markCurrentCompleted) {
          const updatedTierList = curList.map((it, idx) =>
            idx === curIdx ? { ...it, isCompleted: true } : it
          );
          updatedPools = {
            ...curPools,
            [curTier]: updatedTierList,
          };

          const allCompletedInTier =
            updatedTierList.length > 0 && updatedTierList.every((it) => it.isCompleted);

          if (!allCompletedInTier) {
            // Find next uncompleted giveaway in the same tier (wrapping around if needed)
            let nextOpenIdx = -1;
            for (let step = 1; step < updatedTierList.length; step++) {
              const candIdx = (curIdx + step) % updatedTierList.length;
              if (!updatedTierList[candIdx].isCompleted) {
                nextOpenIdx = candIdx;
                break;
              }
            }
            sound.playCardFlip();
            return {
              pools: updatedPools,
              active:
                nextOpenIdx >= 0
                  ? { rarity: curTier, itemId: updatedTierList[nextOpenIdx].id }
                  : curActive,
              overlay: { ...overlay, visible: true },
            };
          }

          // ALL giveaways in curTier (e.g. 30/30 Rare or 15/15 Epic) are now completed -> LEVEL UP!
          const tierOrderIdx = ALL_RARITIES.indexOf(curTier);
          for (let t = tierOrderIdx + 1; t < ALL_RARITIES.length; t++) {
            const nextTier = ALL_RARITIES[t];
            const nextTierList = updatedPools[nextTier] || [];
            if (nextTierList.length > 0) {
              const firstOpenInNext =
                nextTierList.find((it) => !it.isCompleted) ?? nextTierList[0];
              sound.playLevelUp(nextTier);
              setSelectedTab(nextTier);
              return {
                pools: updatedPools,
                active: { rarity: nextTier, itemId: firstOpenInNext.id },
                overlay: { ...overlay, visible: true },
                levelUp: {
                  id: Date.now(),
                  fromRarity: curTier,
                  toRarity: nextTier,
                  newTierTotal: nextTierList.length,
                },
              };
            }
          }

          // Final tier (Legendary) 100% completed
          sound.playShimmer();
          return { pools: updatedPools };
        }

        const nextIdx = curIdx + direction;
        if (nextIdx >= 0 && nextIdx < curList.length) {
          sound.playCardFlip();
          return {
            pools: updatedPools,
            active: { rarity: curTier, itemId: curList[nextIdx].id },
            overlay: { ...overlay, visible: true },
          };
        }

        if (direction === 1) {
          const tierOrderIdx = ALL_RARITIES.indexOf(curTier);
          for (let t = tierOrderIdx + 1; t < ALL_RARITIES.length; t++) {
            const nextTier = ALL_RARITIES[t];
            if (updatedPools[nextTier].length > 0) {
              sound.playLevelUp(nextTier);
              setSelectedTab(nextTier);
              return {
                pools: updatedPools,
                active: { rarity: nextTier, itemId: updatedPools[nextTier][0].id },
                overlay: { ...overlay, visible: true },
              };
            }
          }
        } else if (direction === -1) {
          const tierOrderIdx = ALL_RARITIES.indexOf(curTier);
          for (let t = tierOrderIdx - 1; t >= 0; t--) {
            const prevTier = ALL_RARITIES[t];
            const prevLen = updatedPools[prevTier].length;
            if (prevLen > 0) {
              sound.playClick(620);
              setSelectedTab(prevTier);
              return {
                pools: updatedPools,
                active: { rarity: prevTier, itemId: updatedPools[prevTier][prevLen - 1].id },
                overlay: { ...overlay, visible: true },
              };
            }
          }
        }

        return { pools: updatedPools };
      });
    },
    [commitStudioUpdate]
  );

  // Upload one or multiple images starting at `startIndex` inside `tier`
  const handleUploadImagesToTier = useCallback(
    async (tier: CardRarity, startIndex: number, files: File[]) => {
      const imageFiles = files.filter((f) => f.type.startsWith('image/'));
      if (imageFiles.length === 0) return;
      try {
        const compressedUrls = await Promise.all(imageFiles.map((f) => compressImageFile(f)));
        const seed = Date.now();
        sound.playShimmer();

        commitStudioUpdate(({ pools: curPools }) => {
          const nextList = [...(curPools[tier] || [])];
          const requiredLen = Math.min(100, startIndex + compressedUrls.length);
          while (nextList.length < requiredLen) {
            nextList.push(createBlankGiveawayItem(tier, nextList.length, seed));
          }
          for (let offset = 0; offset < compressedUrls.length; offset++) {
            const idx = startIndex + offset;
            if (idx >= 100) break;
            nextList[idx] = {
              ...nextList[idx],
              imageUrl: compressedUrls[offset],
            };
          }
          return {
            pools: {
              ...curPools,
              [tier]: nextList,
            },
          };
        });
      } catch (err) {
        console.warn('Image upload failed', err);
      }
    },
    [commitStudioUpdate]
  );

  const handleUpdateItemField = useCallback(
    (tier: CardRarity, itemId: string, patch: Partial<GiveawayItem>) => {
      commitStudioUpdate(({ pools: curPools }) => ({
        pools: {
          ...curPools,
          [tier]: curPools[tier].map((it) => (it.id === itemId ? { ...it, ...patch } : it)),
        },
      }));
    },
    [commitStudioUpdate]
  );

  // Toggle 'verlost' directly on a card tile (+1 Liquid Bar; auto Level-Up when tier hits 100%)
  const handleToggleItemCompleted = useCallback(
    (tier: CardRarity, itemId: string) => {
      commitStudioUpdate(({ pools: curPools, active: curActive, overlay }) => {
        const curList = curPools[tier] || [];
        const targetIdx = curList.findIndex((it) => it.id === itemId);
        if (targetIdx < 0) return {};

        const nextCompletedState = !curList[targetIdx].isCompleted;
        const updatedTierList = curList.map((it, idx) =>
          idx === targetIdx ? { ...it, isCompleted: nextCompletedState } : it
        );
        const updatedPools: GiveawayPools = {
          ...curPools,
          [tier]: updatedTierList,
        };

        if (!nextCompletedState) {
          sound.playCounter(false);
          return { pools: updatedPools };
        }

        const allCompletedInTier =
          updatedTierList.length > 0 && updatedTierList.every((it) => it.isCompleted);

        if (allCompletedInTier) {
          const tierOrderIdx = ALL_RARITIES.indexOf(tier);
          for (let t = tierOrderIdx + 1; t < ALL_RARITIES.length; t++) {
            const nextTier = ALL_RARITIES[t];
            const nextTierList = updatedPools[nextTier] || [];
            if (nextTierList.length > 0) {
              const firstOpenInNext =
                nextTierList.find((it) => !it.isCompleted) ?? nextTierList[0];
              sound.playLevelUp(nextTier);
              setSelectedTab(nextTier);
              return {
                pools: updatedPools,
                active: { rarity: nextTier, itemId: firstOpenInNext.id },
                overlay: { ...overlay, visible: true },
                levelUp: {
                  id: Date.now(),
                  fromRarity: tier,
                  toRarity: nextTier,
                  newTierTotal: nextTierList.length,
                },
              };
            }
          }
        }

        // If the marked item was the currently displayed giveaway, advance cleanly to the next open one
        if (curActive?.rarity === tier && curActive?.itemId === itemId) {
          for (let step = 1; step < updatedTierList.length; step++) {
            const candIdx = (targetIdx + step) % updatedTierList.length;
            if (!updatedTierList[candIdx].isCompleted) {
              sound.playCardFlip();
              return {
                pools: updatedPools,
                active: { rarity: tier, itemId: updatedTierList[candIdx].id },
                overlay: { ...overlay, visible: true },
              };
            }
          }
        }

        sound.playCounter(true);
        return { pools: updatedPools };
      });
    },
    [commitStudioUpdate]
  );

  const handleTriggerPreviewLevelUp = useCallback(
    (toRarity: 'epic' | 'legendary') => {
      const fromRarity: CardRarity = toRarity === 'legendary' ? 'epic' : 'rare';
      sound.playLevelUp(toRarity);
      commitStudioUpdate(({ pools: curPools, active: curActive, overlay }) => {
        const targetList = curPools[toRarity] || [];
        const nextActive =
          targetList.length > 0
            ? {
                rarity: toRarity,
                itemId: (targetList.find((it) => !it.isCompleted) ?? targetList[0]).id,
              }
            : curActive;
        if (targetList.length > 0) {
          setSelectedTab(toRarity);
        }
        return {
          active: nextActive,
          overlay: { ...overlay, visible: true },
          levelUp: {
            id: Date.now(),
            fromRarity,
            toRarity,
            newTierTotal: targetList.length,
          },
        };
      });
    },
    [commitStudioUpdate]
  );

  const handleDeleteSlot = useCallback(
    (tier: CardRarity, itemId: string) => {
      sound.playClick(450);
      commitStudioUpdate(({ pools: curPools }) => ({
        pools: {
          ...curPools,
          [tier]: curPools[tier].filter((it) => it.id !== itemId),
        },
      }));
    },
    [commitStudioUpdate]
  );

  const handleResetTierCompleted = useCallback(
    (tier: CardRarity) => {
      sound.playClick(680);
      commitStudioUpdate(({ pools: curPools }) => ({
        pools: {
          ...curPools,
          [tier]: curPools[tier].map((it) => ({ ...it, isCompleted: false })),
        },
      }));
    },
    [commitStudioUpdate]
  );

  const updateOverlaySetting = useCallback(
    <K extends keyof OverlayDisplaySettings>(key: K, value: OverlayDisplaySettings[K]) => {
      commitStudioUpdate(({ overlay }) => ({
        overlay: {
          ...overlay,
          [key]: value,
        },
      }));
    },
    [commitStudioUpdate]
  );

  const obsOverlayUrl = useMemo(() => {
    const base = originUrl ? `${originUrl}/overlay` : '/overlay';
    return overlayKey ? `${base}?key=${overlayKey}` : base;
  }, [originUrl, overlayKey]);

  const handleCopyOverlayLink = async () => {
    sound.playClick(760);
    const fullUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}/overlay${overlayKey ? `?key=${overlayKey}` : ''}`
        : obsOverlayUrl;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2400);
    } catch {
      const inp = document.createElement('input');
      inp.value = fullUrl;
      document.body.appendChild(inp);
      inp.select();
      document.execCommand('copy');
      document.body.removeChild(inp);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2400);
    }
  };

  const totalPoolItems =
    pools.rare.length + pools.epic.length + pools.legendary.length;

  const hasAnyCustomUploads = useMemo(() => {
    return ALL_RARITIES.some((t) =>
      pools[t].some(
        (it) =>
          (it.imageUrl && it.imageUrl !== DEFAULT_GIVEAWAY_IMAGE) ||
          Boolean(it.title?.trim())
      )
    );
  }, [pools]);

  const tierProgress = useMemo(() => computeTierProgress(pools), [pools]);

  const activeTier = active?.rarity ?? 'rare';
  const activeTierItems = pools[activeTier] || [];
  const activeSlotIdx = active
    ? activeTierItems.findIndex((it) => it.id === active.itemId)
    : -1;
  const activeItem = activeSlotIdx >= 0 ? activeTierItems[activeSlotIdx] : null;

  const currentTabItems = pools[selectedTab] || [];
  const currentTabCompletedCount = useMemo(
    () => currentTabItems.filter((it) => it.isCompleted).length,
    [currentTabItems]
  );

  const firstEmptyIndexInTab = useMemo(() => {
    const idx = currentTabItems.findIndex((it) => it.imageUrl === DEFAULT_GIVEAWAY_IMAGE);
    return idx >= 0 ? idx : currentTabItems.length;
  }, [currentTabItems]);

  return (
    <div className="studio-shell relative h-screen h-[100dvh] w-full overflow-hidden flex flex-col bg-[#090a0f] text-white">
      <PlaymatBackground />

      {/* Subtle ambient glow matching currently viewed tier */}
      <div
        className={`pointer-events-none absolute -top-24 left-1/3 w-[560px] h-[340px] rounded-full blur-[130px] transition-colors duration-500 ${TIER_CONFIG[selectedTab].ambientClass}`}
      />

      {/* Hidden File Inputs */}
      <input
        ref={tierBulkInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length > 0) {
            void handleUploadImagesToTier(selectedTab, firstEmptyIndexInTab, files);
          }
          e.target.value = '';
        }}
      />
      <input
        ref={slotFileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length > 0) {
            void handleUploadImagesToTier(
              selectedTab,
              pendingUploadSlotIdxRef.current,
              files
            );
          }
          e.target.value = '';
        }}
      />

      {/* =====================================================================
          TOP STUDIO HEADER BAR
         ===================================================================== */}
      <header className="relative z-30 shrink-0 h-16 px-4 sm:px-6 border-b border-white/10 bg-stone-950/75 backdrop-blur-xl flex items-center justify-between gap-3">
        {/* Left: Brand + OBS Sync Status */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2.5 select-none">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-600 text-black flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
              <Tv className="w-4.5 h-4.5 stroke-[2.5]" />
            </div>
            <div className="leading-tight">
              <h1 className="text-sm sm:text-base font-black tracking-tight text-white">
                ManaCards <span className="text-amber-300">Overlay Regie</span>
              </h1>
              <p className="text-[11px] font-medium text-slate-400 hidden sm:block">
                Steuerzentrale · Browser-Quellen-URL rechts für OBS Studio kopieren
              </p>
            </div>
          </div>

          <div
            className={`hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-bold select-none ${
              syncMeta.overlayCount > 0
                ? 'bg-emerald-500/15 border-emerald-400/45 text-emerald-200 shadow-[0_0_14px_rgba(16,185,129,0.2)]'
                : syncMeta.status === 'live'
                ? 'bg-white/5 border-white/15 text-slate-300'
                : 'bg-amber-500/10 border-amber-400/30 text-amber-200'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                syncMeta.overlayCount > 0
                  ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]'
                  : syncMeta.status === 'live'
                  ? 'bg-sky-400'
                  : 'bg-amber-400 animate-pulse'
              }`}
            />
            <Radio className="w-3 h-3" />
            <span>
              {syncMeta.overlayCount > 0
                ? `OBS Browser-Quelle aktiv (${syncMeta.overlayCount})`
                : syncMeta.status === 'live'
                ? 'Live-Sync bereit'
                : 'Verbinde…'}
            </span>
          </div>
        </div>

        {/* Right: Quick OBS Copy + Standalone Open + Tier Setup + Mute + Logout */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyOverlayLink}
            className={`h-9 px-3 sm:px-3.5 rounded-xl font-extrabold text-xs flex items-center gap-1.5 transition-all active:scale-95 select-none ${
              copiedLink
                ? 'bg-emerald-400 text-black shadow-lg shadow-emerald-400/25'
                : 'bg-amber-400 hover:bg-amber-300 text-black shadow-lg shadow-amber-400/15'
            }`}
            title="Transparente Browser-Quellen-URL für OBS Studio kopieren"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>Browser-Quellen-URL kopiert!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Browser-Quellen-URL kopieren</span>
              </>
            )}
          </button>

          <a
            href={obsOverlayUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="h-9 px-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-bold text-slate-200 hover:text-white flex items-center gap-1.5 transition-all select-none"
            title="Nur-Giveaway-Ansicht (transparenter Hintergrund) in eigenem Tab öffnen"
          >
            <ExternalLink className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden lg:inline">Browser-Quelle öffnen</span>
          </a>

          <button
            type="button"
            onClick={() => {
              sound.playClick(620);
              setIsTierModalOpen(true);
            }}
            className="h-9 px-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-bold text-slate-200 hover:text-white flex items-center gap-1.5 transition-all active:scale-95 select-none"
            title="Giveaway-Anzahl für Rare, Epic & Legendary anpassen"
          >
            <Layers className="w-3.5 h-3.5 text-cyan-300" />
            <span className="hidden sm:inline">Stufen-Anzahl</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const next = !isMuted;
              setIsMuted(next);
              sound.setMuted(next);
              if (!next) sound.playClick(700);
            }}
            className={`h-9 w-9 rounded-xl border flex items-center justify-center transition-all active:scale-95 ${
              isMuted
                ? 'bg-rose-500/15 border-rose-400/35 text-rose-300'
                : 'bg-white/5 hover:bg-white/15 border-white/15 text-slate-300'
            }`}
            title={isMuted ? 'Regie-Sound aktivieren' : 'Regie-Sound stummschalten'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={async () => {
              sound.playClick(450);
              try {
                await fetch('/api/logout', { method: 'POST' });
              } finally {
                window.location.replace('/login');
              }
            }}
            className="h-9 w-9 rounded-xl bg-white/5 hover:bg-rose-500/20 border border-white/15 hover:border-rose-400/40 text-slate-400 hover:text-rose-300 flex items-center justify-center transition-all active:scale-95"
            title="Abmelden"
            aria-label="Abmelden"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* =====================================================================
          MAIN STUDIO BODY
         ===================================================================== */}
      {hasInitialized && totalPoolItems === 0 ? (
        /* Initial First-Run Setup View (pre-filled with 30 Rare / 15 Epic / 10 Legendary) */
        <main className="relative z-20 flex-1 overflow-y-auto studio-scroll flex items-center justify-center p-4 sm:p-8">
          <div className="w-full max-w-xl rounded-3xl bg-stone-900/85 backdrop-blur-xl border border-white/15 shadow-[0_30px_80px_rgba(0,0,0,0.75)] p-6 sm:p-8 space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-amber-400/15 border border-amber-400/40 text-amber-300 flex items-center justify-center mx-auto">
                <Layers className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight">
                Giveaway-Pool einrichten
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
                Lege für <strong className="text-sky-300">Rare</strong>,{' '}
                <strong className="text-pink-300">Epic</strong> und{' '}
                <strong className="text-amber-300">Legendary</strong> jeweils unabhängig fest, wie
                viele Giveaways du anlegen möchtest.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {ALL_RARITIES.map((tier) => {
                const cfg = TIER_CONFIG[tier];
                const val = welcomeCounts[tier];
                return (
                  <div
                    key={tier}
                    className={`rounded-2xl p-4 bg-black/50 border ${cfg.ringBorderClass} flex flex-col items-center gap-3`}
                  >
                    <div className="flex items-center gap-1.5">
                      {tier === 'legendary' ? (
                        <Crown className="w-4 h-4 text-amber-300" />
                      ) : tier === 'epic' ? (
                        <Flame className="w-4 h-4 text-pink-300" />
                      ) : (
                        <Droplets className="w-4 h-4 text-sky-300" />
                      )}
                      <span className="font-black text-sm text-white">{cfg.label}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          sound.playCounter(false);
                          setWelcomeCounts((p) => ({
                            ...p,
                            [tier]: Math.max(0, p[tier] - 1),
                          }));
                        }}
                        className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 font-black text-white"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={val}
                        onChange={(e) => {
                          const n = parseInt(e.target.value, 10);
                          setWelcomeCounts((p) => ({
                            ...p,
                            [tier]: Number.isNaN(n) ? 0 : Math.max(0, Math.min(100, n)),
                          }));
                        }}
                        className="w-16 h-10 text-center rounded-xl bg-black/80 border border-white/20 font-black text-lg text-white focus:outline-none focus:border-amber-400"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          sound.playCounter(true);
                          setWelcomeCounts((p) => ({
                            ...p,
                            [tier]: Math.min(100, p[tier] + 1),
                          }));
                        }}
                        className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 font-black text-white"
                      >
                        +
                      </button>
                    </div>

                    <span className="text-[11px] font-semibold text-slate-400 text-center whitespace-nowrap">
                      {cfg.subtitle}
                    </span>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              disabled={
                welcomeCounts.rare + welcomeCounts.epic + welcomeCounts.legendary === 0
              }
              onClick={() => {
                sound.playShimmer();
                handleApplyTierCounts(welcomeCounts, false);
              }}
              className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 disabled:opacity-40 text-black font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-amber-500/20 active:scale-[0.99] transition-all"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>
                Giveaways anlegen ({welcomeCounts.rare} Rare · {welcomeCounts.epic} Epic ·{' '}
                {welcomeCounts.legendary} Legendary)
              </span>
            </button>
          </div>
        </main>
      ) : (
        <div className="relative z-20 flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
          {/* =================================================================
              LEFT MAIN PANEL: INDEPENDENT PER-TIER GIVEAWAY GRID
             ================================================================= */}
          <section className="flex-1 min-w-0 min-h-0 flex flex-col border-b lg:border-b-0 lg:border-r border-white/10">
            {/* Tier Tabs + Inline Tier Toolbar */}
            <div className="shrink-0 px-4 sm:px-6 py-3 bg-stone-950/45 border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
              {/* 3 Independent Tier Tabs */}
              <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-black/60 border border-white/15 select-none">
                {ALL_RARITIES.map((tier) => {
                  const isTabSelected = selectedTab === tier;
                  const tierCount = pools[tier].length;
                  const tierDone = tierProgress[tier].completed;
                  const isLiveInThisTier = active?.rarity === tier && activeSlotIdx >= 0;
                  return (
                    <button
                      key={tier}
                      type="button"
                      onClick={() => {
                        sound.playClick(620);
                        setSelectedTab(tier);
                      }}
                      className={`px-3 sm:px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all active:scale-95 ${
                        isTabSelected
                          ? TIER_CONFIG[tier].activeTabClass
                          : 'text-slate-300 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {tier === 'legendary' ? (
                        <Crown className="w-3.5 h-3.5 shrink-0" />
                      ) : tier === 'epic' ? (
                        <Flame className="w-3.5 h-3.5 shrink-0" />
                      ) : (
                        <Droplets className="w-3.5 h-3.5 shrink-0" />
                      )}
                      <span>{TIER_CONFIG[tier].label}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded-md text-[10px] font-black leading-none tabular-nums ${
                          isTabSelected
                            ? 'bg-black/25 text-current'
                            : 'bg-white/10 text-slate-300'
                        }`}
                      >
                        {tierDone > 0 ? `${tierDone}/${tierCount}` : tierCount}
                      </span>
                      {isLiveInThisTier && (
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                            isTabSelected
                              ? 'bg-black/75 text-emerald-300'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                          }`}
                          title="Aktives OBS-Giveaway läuft gerade in dieser Stufe"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          #{activeSlotIdx + 1}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Active Tab Direct Controls: Independent Count + Multi-Image Upload */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-black/55 border border-white/15 text-xs">
                  <span className="text-slate-400 font-semibold mr-1 select-none">
                    Anzahl {TIER_CONFIG[selectedTab].label}:
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      sound.playCounter(false);
                      handleSetSingleTierCount(selectedTab, currentTabItems.length - 1);
                    }}
                    className="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 text-white font-black flex items-center justify-center active:scale-90"
                    title="Ein Giveaway weniger in dieser Stufe"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={currentTabItems.length}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!Number.isNaN(val)) {
                        handleSetSingleTierCount(selectedTab, val);
                      }
                    }}
                    className="w-12 h-6 text-center rounded-md bg-transparent text-white font-black text-xs focus:outline-none focus:bg-white/10"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      sound.playCounter(true);
                      handleSetSingleTierCount(selectedTab, currentTabItems.length + 1);
                    }}
                    className="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 text-white font-black flex items-center justify-center active:scale-90"
                    title="Ein weiteres Giveaway in dieser Stufe hinzufügen"
                  >
                    +
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => tierBulkInputRef.current?.click()}
                  className="h-8 px-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-bold text-white flex items-center gap-1.5 transition-all active:scale-95 select-none"
                  title="Ein oder mehrere Booster-/Karten-Bilder für diese Stufe auswählen"
                >
                  <Upload className="w-3.5 h-3.5 text-amber-300" />
                  <span>Bilder hochladen</span>
                </button>

                {currentTabCompletedCount > 0 && (
                  <button
                    type="button"
                    onClick={() => handleResetTierCompleted(selectedTab)}
                    className="h-8 px-2.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/15 text-[11px] font-bold text-slate-300 hover:text-white flex items-center gap-1 transition-all active:scale-95 select-none"
                    title="Alle Verlost-Markierungen in dieser Stufe zurücksetzen"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Verlost frei ({currentTabCompletedCount})</span>
                  </button>
                )}
              </div>
            </div>

            {/* Giveaway Cards Grid for selectedTab */}
            <div className="flex-1 min-h-0 overflow-y-auto studio-scroll p-4 sm:p-6">
              {currentTabItems.length === 0 ? (
                <div className="h-full min-h-[260px] flex flex-col items-center justify-center text-center gap-3 rounded-3xl border border-dashed border-white/15 bg-black/30 p-8">
                  <p className="text-sm font-bold text-slate-300">
                    Noch keine Giveaways in {TIER_CONFIG[selectedTab].label} angelegt.
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSetSingleTierCount(selectedTab, 10)}
                      className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-xs transition-all"
                    >
                      10 Giveaways anlegen
                    </button>
                    <button
                      type="button"
                      onClick={() => tierBulkInputRef.current?.click()}
                      className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white font-bold text-xs transition-all"
                    >
                      Bilder direkt hochladen
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3.5 sm:gap-4">
                  {currentTabItems.map((item, idx) => {
                    const isLiveCard =
                      active?.rarity === selectedTab && active?.itemId === item.id;
                    const resolvedImg =
                      item.imageUrl && !item.imageUrl.startsWith('idb:')
                        ? item.imageUrl
                        : DEFAULT_GIVEAWAY_IMAGE;
                    const hasCustomImg = resolvedImg !== DEFAULT_GIVEAWAY_IMAGE;
                    const isDragTarget = dragOverItemId === item.id;

                    return (
                      <div
                        key={item.id}
                        onDragOver={(e) => {
                          e.preventDefault();
                          if (dragOverItemId !== item.id) setDragOverItemId(item.id);
                        }}
                        onDragLeave={() => {
                          if (dragOverItemId === item.id) setDragOverItemId(null);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          setDragOverItemId(null);
                          const droppedFiles = Array.from(e.dataTransfer.files ?? []);
                          if (droppedFiles.length > 0) {
                            void handleUploadImagesToTier(selectedTab, idx, droppedFiles);
                          }
                        }}
                        className={`studio-card-tile group relative rounded-2xl p-2.5 flex flex-col gap-2 border ${
                          isDragTarget
                            ? 'bg-emerald-950/50 border-emerald-400 ring-2 ring-emerald-400/50'
                            : isLiveCard
                            ? 'bg-stone-900/95 border-emerald-400 ring-2 ring-emerald-400/35 shadow-[0_12px_32px_rgba(16,185,129,0.22)]'
                            : item.isCompleted
                            ? 'bg-stone-950/70 border-white/10 opacity-60 hover:opacity-95'
                            : 'bg-stone-900/75 border-white/15 hover:border-white/30 shadow-lg'
                        }`}
                      >
                        {/* Top Bar inside Tile */}
                        <div className="flex items-center justify-between gap-1 select-none">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span
                              className={`px-2 py-0.5 rounded-lg text-[11px] font-black border ${
                                isLiveCard
                                  ? 'bg-emerald-400 text-black border-emerald-300'
                                  : TIER_CONFIG[selectedTab].badgeClass
                              }`}
                            >
                              #{idx + 1}
                            </span>
                            {isLiveCard ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-300 truncate">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                                Live
                              </span>
                            ) : item.isCompleted ? (
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">
                                Verlost
                              </span>
                            ) : null}
                          </div>

                          <div className="flex items-center gap-0.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                pendingUploadSlotIdxRef.current = idx;
                                slotFileInputRef.current?.click();
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-white/10 transition-colors"
                              title="Booster-/Gewinn-Bild hochladen"
                            >
                              <ImagePlus className="w-3.5 h-3.5" />
                            </button>

                            {hasCustomImg && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  sound.playClick(640);
                                  handleUpdateItemField(selectedTab, item.id, {
                                    imageFit:
                                      item.imageFit === 'contain' ? 'cover' : 'contain',
                                  });
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-sky-300 hover:bg-white/10 transition-colors"
                                title={
                                  item.imageFit === 'contain'
                                    ? 'Ganzes Bild einpassen (Klicken für Ausfüllen)'
                                    : 'Karte ausfüllen (Klicken für Einpassen)'
                                }
                              >
                                <Maximize2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleItemCompleted(selectedTab, item.id);
                              }}
                              className={`p-1.5 rounded-lg transition-colors ${
                                item.isCompleted
                                  ? 'text-emerald-400 bg-emerald-500/15 hover:bg-emerald-500/25'
                                  : 'text-slate-400 hover:text-emerald-300 hover:bg-white/10'
                              }`}
                              title={
                                item.isCompleted
                                  ? 'Verlost-Markierung aufheben (-1 im Liquid-Balken)'
                                  : 'Als verlost markieren (+1 im Liquid-Balken)'
                              }
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSlot(selectedTab, item.id);
                              }}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/15 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                              title="Diesen Slot entfernen"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Clickable Prize Artwork Preview */}
                        <button
                          type="button"
                          onClick={() => handleSelectActiveGiveaway(selectedTab, item.id)}
                          className="obs-checkerboard relative w-full aspect-[63/88] rounded-xl overflow-hidden border border-white/10 flex items-center justify-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-400 select-none"
                          title="Klicken, um dieses Giveaway sofort in der OBS Browser-Quelle anzuzeigen"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={resolvedImg}
                            alt={item.title || `${TIER_CONFIG[selectedTab].label} #${idx + 1}`}
                            decoding="async"
                            draggable={false}
                            className={`w-full h-full ${
                              item.imageFit === 'cover' ? 'object-cover' : 'object-contain'
                            } ${!hasCustomImg ? 'opacity-35' : ''}`}
                          />

                          {!hasCustomImg && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center bg-black/35">
                              <span className="px-2.5 py-1 rounded-lg bg-black/75 border border-white/15 text-[10px] font-bold text-slate-300">
                                Bild reinziehen
                              </span>
                            </div>
                          )}
                        </button>

                        {/* Inline Optional Prize Title Input */}
                        <input
                          type="text"
                          value={item.title}
                          onChange={(e) =>
                            handleUpdateItemField(selectedTab, item.id, {
                              title: e.target.value,
                            })
                          }
                          placeholder="Gewinn-Titel (optional)…"
                          className="w-full h-8 px-2.5 rounded-lg bg-black/55 border border-white/10 text-xs font-semibold text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400/70 transition-colors"
                        />

                        {/* Explicit 1-Click Activate Button */}
                        <button
                          type="button"
                          onClick={() => handleSelectActiveGiveaway(selectedTab, item.id)}
                          className={`w-full py-1.5 px-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all active:scale-95 select-none ${
                            isLiveCard
                              ? 'bg-emerald-400 text-black shadow-md shadow-emerald-400/20'
                              : 'bg-white/10 hover:bg-white/15 text-slate-200 hover:text-white border border-white/10'
                          }`}
                        >
                          {isLiveCard ? (
                            <>
                              <Radio className="w-3.5 h-3.5" />
                              <span>Aktiv in Browser-Quelle</span>
                            </>
                          ) : (
                            <span>In Browser-Quelle zeigen</span>
                          )}
                        </button>
                      </div>
                    );
                  })}

                  {/* Quick "+ Add Giveaway" Tile */}
                  {currentTabItems.length < 100 && (
                    <button
                      type="button"
                      onClick={() => {
                        sound.playCounter(true);
                        handleSetSingleTierCount(selectedTab, currentTabItems.length + 1);
                      }}
                      className="min-h-[240px] rounded-2xl border-2 border-dashed border-white/15 hover:border-white/30 bg-white/[0.02] hover:bg-white/[0.05] flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-white transition-all active:scale-[0.99] select-none p-4"
                    >
                      <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center">
                        <Plus className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold">
                        Weiteres {TIER_CONFIG[selectedTab].label}-Giveaway
                      </span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* =================================================================
              RIGHT SIDEBAR: DEDICATED OBS BROWSER-SOURCE URL + PREVIEW + SETTINGS
             ================================================================= */}
          <aside className="w-full lg:w-[395px] xl:w-[415px] shrink-0 bg-stone-950/85 backdrop-blur-xl overflow-y-auto studio-scroll p-4 sm:p-5 space-y-4">
            {/* 1. DEDICATED OBS BROWSER-SOURCE URL BOX (prominent right at top!) */}
            <div className="rounded-2xl bg-gradient-to-b from-amber-500/10 via-stone-900/90 to-stone-900/90 border border-amber-400/35 p-3.5 space-y-2.5 shadow-lg">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 select-none">
                  <Link2 className="w-4 h-4 text-amber-300 shrink-0" />
                  <h2 className="text-xs font-black uppercase tracking-wider text-amber-200">
                    OBS Browser-Quelle (Transparent)
                  </h2>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border select-none ${
                    syncMeta.overlayCount > 0
                      ? 'bg-emerald-500/20 border-emerald-400/45 text-emerald-200'
                      : 'bg-black/45 border-white/15 text-slate-300'
                  }`}
                >
                  {syncMeta.overlayCount > 0
                    ? `OBS verbunden (${syncMeta.overlayCount})`
                    : '100 % Alpha-Transparent'}
                </span>
              </div>

              <p className="text-[11px] text-slate-300 leading-snug">
                Füge <strong className="text-white">genau diese URL</strong> in OBS unter{' '}
                <strong className="text-amber-300">Quellen → + → Browser</strong> ein. Dort wird{' '}
                <strong className="text-white">nur das Giveaway</strong> (mit Wipp-Animation &
                transparentem Hintergrund) eingeblendet:
              </p>

              {/* Selectable URL Field + Copy Button */}
              <div className="flex items-center gap-1.5">
                <input
                  type="url"
                  readOnly
                  value={obsOverlayUrl}
                  onFocus={(e) => e.currentTarget.select()}
                  onClick={(e) => e.currentTarget.select()}
                  aria-label="OBS Browser-Quellen-URL"
                  className="flex-1 min-w-0 h-9 px-2.5 rounded-xl bg-black/75 border border-white/15 text-[11px] font-mono text-amber-200 focus:outline-none focus:border-amber-400"
                />
                <button
                  type="button"
                  onClick={handleCopyOverlayLink}
                  className={`h-9 px-3 rounded-xl font-extrabold text-xs flex items-center gap-1.5 shrink-0 transition-all active:scale-95 select-none ${
                    copiedLink
                      ? 'bg-emerald-400 text-black'
                      : 'bg-amber-400 hover:bg-amber-300 text-black'
                  }`}
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>Kopiert</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Kopieren</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between gap-2 pt-0.5 text-[11px]">
                <span className="text-slate-400 font-semibold whitespace-nowrap">
                  OBS-Maße: <strong className="text-slate-200">540 × 760 px</strong>
                </span>
                <a
                  href={obsOverlayUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-bold text-amber-300 hover:text-amber-200 underline underline-offset-2 whitespace-nowrap"
                >
                  <span>Nur-Giveaway öffnen</span>
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              </div>
            </div>

            {/* 2. BROWSER-SOURCE PREVIEW MONITOR */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 select-none">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      overlaySettings.visible && activeItem
                        ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]'
                        : 'bg-slate-500'
                    }`}
                  />
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-300">
                    Vorschau der Browser-Quelle
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Preview Backdrop Tester */}
                  <div
                    className="flex items-center rounded-lg bg-black/60 border border-white/10 p-0.5 text-[10px] font-bold select-none"
                    title="Nur Vorschau-Hintergrund hier im Studio testen (in OBS immer 100 % transparent)"
                  >
                    {(
                      [
                        { id: 'checker', label: 'Raster' },
                        { id: 'dark', label: 'Dunkel' },
                        { id: 'light', label: 'Hell' },
                      ] as { id: PreviewBackdropMode; label: string }[]
                    ).map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPreviewBg(m.id)}
                        className={`px-1.5 py-0.5 rounded-md transition-colors ${
                          previewBg === m.id
                            ? 'bg-white/20 text-white'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      sound.playClick(overlaySettings.visible ? 450 : 720);
                      updateOverlaySetting('visible', !overlaySettings.visible);
                    }}
                    className={`px-2 py-1 rounded-lg text-[10px] font-extrabold flex items-center gap-1 border transition-all active:scale-95 select-none ${
                      overlaySettings.visible
                        ? 'bg-emerald-500/15 border-emerald-400/45 text-emerald-200 hover:bg-emerald-500/25'
                        : 'bg-rose-500/15 border-rose-400/45 text-rose-200 hover:bg-rose-500/25'
                    }`}
                  >
                    {overlaySettings.visible ? (
                      <>
                        <Eye className="w-3 h-3" />
                        <span>Sichtbar</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3 h-3" />
                        <span>Aus</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div
                className={`relative rounded-2xl border border-white/15 min-h-[320px] flex items-center justify-center overflow-hidden px-2 pt-3 pb-7 transition-colors ${
                  previewBg === 'checker'
                    ? 'obs-checkerboard'
                    : previewBg === 'light'
                    ? 'bg-slate-200'
                    : 'bg-[#0b101d]'
                }`}
              >
                {overlaySettings.visible && activeItem ? (
                  <GiveawayOverlayCard
                    item={activeItem}
                    rarity={activeTier}
                    slotIndex={activeSlotIdx}
                    settings={overlaySettings}
                    tierProgress={tierProgress}
                    levelUpEvent={levelUpEvent}
                    widthOverridePx={148}
                  />
                ) : (
                  <div className="text-center px-6 py-8 space-y-2 select-none">
                    <EyeOff className="w-7 h-7 text-slate-500 mx-auto" />
                    <p className="text-xs font-bold text-slate-400">
                      Browser-Quelle ist aktuell ausgeblendet
                    </p>
                    <p className="text-[11px] text-slate-500">
                      In OBS ist die Quelle jetzt komplett unsichtbar (100 % transparent).
                    </p>
                  </div>
                )}

                <span
                  className={`absolute bottom-2 right-2.5 text-[10px] font-semibold select-none ${
                    previewBg === 'light' ? 'text-slate-600' : 'text-slate-400/85'
                  }`}
                >
                  Nur Vorschau · In OBS 100 % transparent
                </span>
              </div>

              {/* Above-the-fold Quick Mode Switcher: Framed vs Pure Booster Cutout */}
              <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick(640);
                    updateOverlaySetting('frameStyle', 'glow-ring');
                  }}
                  className={`py-1.5 px-2.5 rounded-xl text-[11px] font-extrabold border transition-all select-none ${
                    overlaySettings.frameStyle !== 'cutout'
                      ? 'bg-amber-400 text-black border-amber-300 shadow-sm'
                      : 'bg-black/45 text-slate-300 border-white/10 hover:bg-white/10'
                  }`}
                >
                  Mit Rarity-Rahmen
                </button>
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick(640);
                    updateOverlaySetting('frameStyle', 'cutout');
                  }}
                  className={`py-1.5 px-2.5 rounded-xl text-[11px] font-extrabold border transition-all select-none ${
                    overlaySettings.frameStyle === 'cutout'
                      ? 'bg-amber-400 text-black border-amber-300 shadow-sm'
                      : 'bg-black/45 text-slate-300 border-white/10 hover:bg-white/10'
                  }`}
                >
                  Freigestellt (Nur Booster)
                </button>
              </div>
            </div>

            {/* 3. ACTIVE GIVEAWAY QUICK SWITCHER */}
            {activeItem && (
              <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-semibold">Aktuell in OBS aktiv:</span>
                  <button
                    type="button"
                    onClick={() => setSelectedTab(activeTier)}
                    className="font-black text-white hover:text-amber-300 transition-colors"
                  >
                    {TIER_CONFIG[activeTier].label} #{activeSlotIdx + 1} /{' '}
                    {activeTierItems.length}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleStepGiveaway(1, true)}
                  className="w-full py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-black font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/15 active:scale-[0.98] transition-all select-none"
                >
                  <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                  <span>Verlost & Nächstes Giveaway →</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleStepGiveaway(-1, false)}
                    className="py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-bold text-slate-200 flex items-center justify-center gap-1.5 active:scale-95 transition-all select-none"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Vorheriges</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStepGiveaway(1, false)}
                    className="py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-bold text-slate-200 flex items-center justify-center gap-1.5 active:scale-95 transition-all select-none"
                  >
                    <span>Nächstes</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* 4. OVERLAY APPEARANCE SETTINGS */}
            <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-3.5 space-y-3.5">
              <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-400 select-none">
                Darstellung in der Browser-Quelle
              </h3>

              {overlaySettings.frameStyle !== 'cutout' && (
                <label className="flex items-center justify-between gap-2 text-xs text-slate-300 cursor-pointer">
                  <span>Innenbereich transparent (für Booster-PNGs)</span>
                  <input
                    type="checkbox"
                    checked={overlaySettings.transparentCardFill ?? true}
                    onChange={(e) =>
                      updateOverlaySetting('transparentCardFill', e.target.checked)
                    }
                    className="w-4 h-4 rounded accent-amber-400 cursor-pointer"
                  />
                </label>
              )}

              {/* Liquid Progress Bar & Level-Up Controls */}
              <div
                className={`space-y-2.5 ${
                  overlaySettings.frameStyle !== 'cutout' ? 'pt-2 border-t border-white/10' : ''
                }`}
              >
                <label className="flex items-center justify-between gap-2 text-xs text-slate-300 cursor-pointer">
                  <span>Liquid-Fortschrittsbalken links anzeigen</span>
                  <input
                    type="checkbox"
                    checked={overlaySettings.showLiquidBar !== false}
                    onChange={(e) =>
                      updateOverlaySetting('showLiquidBar', e.target.checked)
                    }
                    className="w-4 h-4 rounded accent-amber-400 cursor-pointer"
                  />
                </label>

                <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] font-extrabold tabular-nums select-none">
                  <div className="rounded-lg bg-sky-500/15 border border-sky-400/35 px-2 py-1 text-sky-200">
                    <div className="text-[9px] uppercase text-sky-300/80">Rare</div>
                    <div>
                      {tierProgress.rare.completed}/{tierProgress.rare.total}
                    </div>
                  </div>
                  <div className="rounded-lg bg-purple-500/15 border border-purple-400/40 px-2 py-1 text-purple-200">
                    <div className="text-[9px] uppercase text-purple-300/80">Epic</div>
                    <div>
                      {tierProgress.epic.completed}/{tierProgress.epic.total}
                    </div>
                  </div>
                  <div className="rounded-lg bg-amber-400/15 border border-amber-300/45 px-2 py-1 text-amber-200">
                    <div className="text-[9px] uppercase text-amber-300/80">Legendary</div>
                    <div>
                      {tierProgress.legendary.completed}/{tierProgress.legendary.total}
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="block text-[10px] font-bold text-slate-400">
                    Level-Up-Effekt live in Vorschau & OBS testen:
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleTriggerPreviewLevelUp('epic')}
                      className="py-1.5 px-2 rounded-lg text-[10px] font-extrabold bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/45 text-purple-100 flex items-center justify-center gap-1 transition-all active:scale-95 select-none"
                    >
                      <Zap className="w-3 h-3 text-purple-300" />
                      <span>Epic Level-Up</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTriggerPreviewLevelUp('legendary')}
                      className="py-1.5 px-2 rounded-lg text-[10px] font-extrabold bg-amber-400/20 hover:bg-amber-400/30 border border-amber-300/50 text-amber-100 flex items-center justify-center gap-1 transition-all active:scale-95 select-none"
                    >
                      <Crown className="w-3 h-3 text-amber-300" />
                      <span>Legendary Level-Up</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Card Width Slider in OBS */}
              <div className="space-y-1 pt-1 border-t border-white/10">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300">Größe in OBS</span>
                  <span className="font-black text-amber-300">
                    {overlaySettings.cardWidthPx} px
                  </span>
                </div>
                <input
                  type="range"
                  min={180}
                  max={440}
                  step={10}
                  value={overlaySettings.cardWidthPx}
                  onChange={(e) =>
                    updateOverlaySetting('cardWidthPx', Number(e.target.value))
                  }
                  className="w-full cursor-pointer"
                />
              </div>

              {/* Position inside OBS Browser Source */}
              <div className="space-y-1.5">
                <span className="block text-[11px] font-bold text-slate-300">
                  Position innerhalb der Browser-Quelle
                </span>
                <div className="grid grid-cols-2 gap-1.5 text-[11px] font-bold">
                  {(
                    [
                      { id: 'compact', label: 'Zentriert (frei in OBS verschiebbar)' },
                      { id: 'top-right', label: 'Ecke oben rechts' },
                      { id: 'top-left', label: 'Ecke oben links' },
                      { id: 'bottom-right', label: 'Ecke unten rechts' },
                      { id: 'bottom-left', label: 'Ecke unten links' },
                    ] as { id: OverlayAnchorPosition; label: string }[]
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        sound.playClick(600);
                        updateOverlaySetting('anchor', opt.id);
                      }}
                      className={`py-1.5 px-2.5 rounded-lg border text-left transition-all select-none ${
                        opt.id === 'compact' ? 'col-span-2' : ''
                      } ${
                        overlaySettings.anchor === opt.id
                          ? 'bg-sky-400/20 border-sky-400/60 text-sky-200'
                          : 'bg-black/45 border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Tier Count Configuration Modal */}
      <TierSetupModal
        isOpen={isTierModalOpen}
        onClose={() => setIsTierModalOpen(false)}
        currentCounts={{
          rare: pools.rare.length,
          epic: pools.epic.length,
          legendary: pools.legendary.length,
        }}
        hasExistingUploads={hasAnyCustomUploads}
        onConfirm={handleApplyTierCounts}
      />
    </div>
  );
};
