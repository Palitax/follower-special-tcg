'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  ActiveGiveawaySelection,
  CardRarity,
  DEFAULT_OVERLAY_DISPLAY_SETTINGS,
  GiveawayItem,
  GiveawayPools,
  LevelUpEvent,
  OverlayAnchorPosition,
  OverlayDisplaySettings,
  OverlayFrameStyle,
  TierProgressStats,
} from '../../types/card';
import { GiveawayOverlayCard } from '../../components/GiveawayOverlayCard';
import {
  DirectActiveOverlayPayload,
  LiveGiveawaySnapshot,
  LiveGiveawaySyncController,
  computeTierProgress,
  loadCachedImage,
} from '../../lib/liveSync';

const STORAGE_KEY_STATE = 'mc_giveaway_overlay_state_v1';

const EMPTY_POOLS: GiveawayPools = {
  rare: [],
  epic: [],
  legendary: [],
};

const ANCHOR_CONTAINER_CLASSES: Record<OverlayAnchorPosition, string> = {
  compact: 'items-center justify-center',
  'top-right': 'items-start justify-end p-5 sm:p-7',
  'top-left': 'items-start justify-start p-5 sm:p-7',
  'bottom-right': 'items-end justify-end p-5 sm:p-7',
  'bottom-left': 'items-end justify-start p-5 sm:p-7',
};

function OverlaySurface() {
  const searchParams = useSearchParams();
  const overlayKey = searchParams.get('key');
  const posParam = searchParams.get('pos') as OverlayAnchorPosition | null;
  const widthParam = Number(searchParams.get('w') || '0');
  const modeParam = searchParams.get('mode');
  const barParam = searchParams.get('bar');

  const [pools, setPools] = useState<GiveawayPools>(EMPTY_POOLS);
  const [active, setActive] = useState<ActiveGiveawaySelection | null>(null);
  const [directActive, setDirectActive] = useState<{
    updatedAt: number;
    rarity: CardRarity;
    slotIndex: number;
    item: GiveawayItem | null;
    tierProgress: Record<CardRarity, TierProgressStats>;
  } | null>(null);
  const [levelUpEvent, setLevelUpEvent] = useState<LevelUpEvent | null>(null);
  const [settings, setSettings] = useState<OverlayDisplaySettings>(
    DEFAULT_OVERLAY_DISPLAY_SETTINGS
  );
  const [missingKeyHint, setMissingKeyHint] = useState(false);

  const poolsRef = useRef<GiveawayPools>(EMPTY_POOLS);
  const activeRef = useRef<ActiveGiveawaySelection | null>(null);
  const settingsRef = useRef<OverlayDisplaySettings>(DEFAULT_OVERLAY_DISPLAY_SETTINGS);
  const levelUpRef = useRef<LevelUpEvent | null>(null);
  const updatedAtRef = useRef<number>(0);

  useEffect(() => {
    document.documentElement.classList.add('obs-overlay-root');
    return () => {
      document.documentElement.classList.remove('obs-overlay-root');
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let activeController: LiveGiveawaySyncController | null = null;

    async function bootstrap() {
      // Load local snapshot immediately if opened in same browser profile
      try {
        const raw = localStorage.getItem(STORAGE_KEY_STATE);
        if (raw) {
          const parsed = JSON.parse(raw) as LiveGiveawaySnapshot;
          if (parsed?.pools) {
            const hydrated: GiveawayPools = { rare: [], epic: [], legendary: [] };
            for (const tier of ['rare', 'epic', 'legendary'] as const) {
              hydrated[tier] = await Promise.all(
                (parsed.pools[tier] || []).map(async (it) => {
                  if (it.imageUrl?.startsWith('idb:')) {
                    const cached = await loadCachedImage(it.imageUrl.slice(4));
                    if (cached) return { ...it, imageUrl: cached };
                  }
                  return it;
                })
              );
            }
            if (!cancelled) {
              const merged = { ...DEFAULT_OVERLAY_DISPLAY_SETTINGS, ...parsed.overlay };
              updatedAtRef.current = parsed.updatedAt || 0;
              poolsRef.current = hydrated;
              activeRef.current = parsed.active ?? null;
              settingsRef.current = merged;
              levelUpRef.current = parsed.levelUp ?? null;
              setPools(hydrated);
              setActive(parsed.active ?? null);
              setSettings(merged);
              if (parsed.levelUp) setLevelUpEvent(parsed.levelUp);
            }
          }
        }
      } catch {
        // Ignore storage restrictions inside isolated OBS CEF
      }

      if (cancelled) return;

      const controller = new LiveGiveawaySyncController({
        role: 'overlay',
        overlayKey,
        onUnauthorized: () => {
          if (!cancelled) setMissingKeyHint(true);
        },
        getLocalSnapshot: (clientId): LiveGiveawaySnapshot => ({
          updatedAt: updatedAtRef.current,
          senderId: clientId,
          pools: poolsRef.current,
          active: activeRef.current,
          overlay: settingsRef.current,
          levelUp: levelUpRef.current,
        }),
        onDirectActiveOverlay: (payload: DirectActiveOverlayPayload) => {
          if (cancelled) return;
          const mergedSettings = {
            ...DEFAULT_OVERLAY_DISPLAY_SETTINGS,
            ...payload.overlay,
          };
          updatedAtRef.current = payload.updatedAt;
          settingsRef.current = mergedSettings;
          if (payload.levelUp) {
            levelUpRef.current = payload.levelUp;
            setLevelUpEvent(payload.levelUp);
          }
          setSettings(mergedSettings);
          setDirectActive({
            updatedAt: payload.updatedAt,
            rarity: payload.rarity,
            slotIndex: payload.slotIndex,
            item: payload.item,
            tierProgress: payload.tierProgress ?? computeTierProgress(poolsRef.current),
          });
        },
        onRemoteSnapshot: (snap) => {
          if (cancelled) return;
          const mergedSettings = {
            ...DEFAULT_OVERLAY_DISPLAY_SETTINGS,
            ...snap.overlay,
          };
          updatedAtRef.current = snap.updatedAt;
          poolsRef.current = snap.pools;
          activeRef.current = snap.active;
          settingsRef.current = mergedSettings;
          if (snap.levelUp) {
            levelUpRef.current = snap.levelUp;
            setLevelUpEvent(snap.levelUp);
          }

          setDirectActive(null);
          setPools(snap.pools);
          setActive(snap.active);
          setSettings(mergedSettings);
        },
        onImageHydrated: (imageId, dataUrl) => {
          if (cancelled) return;
          setDirectActive((prev) => {
            if (!prev || prev.item?.imageUrl !== `idb:${imageId}`) return prev;
            return {
              ...prev,
              item: { ...prev.item, imageUrl: dataUrl },
            };
          });
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
            return next;
          });
        },
      });

      activeController = controller;
      await controller.start();
    }

    void bootstrap();

    return () => {
      cancelled = true;
      activeController?.stop();
      activeController = null;
    };
  }, [overlayKey]);

  let resolvedRarity: CardRarity = 'rare';
  let resolvedIdx = -1;
  let resolvedItem: GiveawayItem | null = null;
  let resolvedTierProgress: Record<CardRarity, TierProgressStats>;

  if (directActive) {
    resolvedRarity = directActive.rarity;
    resolvedIdx = directActive.slotIndex;
    resolvedItem = directActive.item;
    resolvedTierProgress = directActive.tierProgress;
  } else {
    resolvedRarity = active?.rarity ?? 'rare';
    const tierList = pools[resolvedRarity] || [];
    resolvedIdx = active ? tierList.findIndex((it) => it.id === active.itemId) : -1;
    resolvedItem = resolvedIdx >= 0 ? tierList[resolvedIdx] : null;
    resolvedTierProgress = computeTierProgress(pools);
  }

  const effectiveAnchor: OverlayAnchorPosition =
    posParam && posParam in ANCHOR_CONTAINER_CLASSES ? posParam : settings.anchor;
  const effectiveWidth =
    widthParam >= 140 && widthParam <= 600 ? widthParam : settings.cardWidthPx;
  const effectiveFrameStyle: OverlayFrameStyle =
    modeParam === 'cutout'
      ? 'cutout'
      : modeParam === 'ring'
      ? 'glow-ring'
      : settings.frameStyle;
  const effectiveShowLiquidBar =
    barParam === '0' ? false : barParam === '1' ? true : settings.showLiquidBar;

  return (
    <main
      className={`w-screen h-screen overflow-hidden flex ${ANCHOR_CONTAINER_CLASSES[effectiveAnchor]}`}
      style={{ background: 'transparent', backgroundColor: 'rgba(0, 0, 0, 0)' }}
    >
      {missingKeyHint && !resolvedItem ? (
        <div className="px-4 py-2.5 rounded-2xl bg-zinc-950/95 border border-amber-400/50 text-xs font-bold text-amber-200 shadow-2xl text-center max-w-xs">
          Bitte in der Regie rechts oben auf „Kopieren“ klicken und die vollständige
          Browser-Quellen-URL (inkl. ?key=…) einfügen.
        </div>
      ) : (
        <GiveawayOverlayCard
          item={resolvedItem}
          rarity={resolvedRarity}
          slotIndex={resolvedIdx}
          tierProgress={resolvedTierProgress}
          levelUpEvent={levelUpEvent}
          settings={{
            ...settings,
            cardWidthPx: effectiveWidth,
            frameStyle: effectiveFrameStyle,
            showLiquidBar: effectiveShowLiquidBar,
          }}
        />
      )}
    </main>
  );
}

export default function OverlayPage() {
  return (
    <>
      {/* Inline SSR style guarantees 100% alpha transparency & color-scheme: normal on Frame 0 inside OBS Browser Source */}
      <style>{`
        :root, html, body {
          color-scheme: normal !important;
          background: transparent !important;
          background-color: rgba(0, 0, 0, 0) !important;
          overflow: hidden !important;
        }
      `}</style>
      <Suspense fallback={null}>
        <OverlaySurface />
      </Suspense>
    </>
  );
}
