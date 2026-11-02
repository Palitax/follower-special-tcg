'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  ActiveGiveawaySelection,
  GiveawayPools,
  OverlayAnchorPosition,
  OverlayDisplaySettings,
} from '../../types/card';
import { GiveawayOverlayCard } from '../../components/GiveawayOverlayCard';
import {
  LiveGiveawaySnapshot,
  LiveGiveawaySyncController,
  loadCachedImage,
} from '../../lib/liveSync';

const STORAGE_KEY_STATE = 'mc_giveaway_overlay_state_v1';

const EMPTY_POOLS: GiveawayPools = {
  rare: [],
  epic: [],
  legendary: [],
};

const DEFAULT_OVERLAY_SETTINGS: OverlayDisplaySettings = {
  visible: true,
  badgeLabel: 'NÄCHSTES GIVEAWAY',
  showTierBadge: true,
  showSlotNumber: false,
  cardWidthPx: 300,
  anchor: 'compact',
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

  const [pools, setPools] = useState<GiveawayPools>(EMPTY_POOLS);
  const [active, setActive] = useState<ActiveGiveawaySelection | null>(null);
  const [settings, setSettings] = useState<OverlayDisplaySettings>(DEFAULT_OVERLAY_SETTINGS);

  const poolsRef = useRef<GiveawayPools>(EMPTY_POOLS);
  const activeRef = useRef<ActiveGiveawaySelection | null>(null);
  const settingsRef = useRef<OverlayDisplaySettings>(DEFAULT_OVERLAY_SETTINGS);
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
              updatedAtRef.current = parsed.updatedAt || 0;
              poolsRef.current = hydrated;
              activeRef.current = parsed.active ?? null;
              settingsRef.current = { ...DEFAULT_OVERLAY_SETTINGS, ...parsed.overlay };
              setPools(hydrated);
              setActive(parsed.active ?? null);
              setSettings({ ...DEFAULT_OVERLAY_SETTINGS, ...parsed.overlay });
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
        getLocalSnapshot: (clientId): LiveGiveawaySnapshot => ({
          updatedAt: updatedAtRef.current,
          senderId: clientId,
          pools: poolsRef.current,
          active: activeRef.current,
          overlay: settingsRef.current,
        }),
        onRemoteSnapshot: (snap) => {
          if (cancelled) return;
          updatedAtRef.current = snap.updatedAt;
          poolsRef.current = snap.pools;
          activeRef.current = snap.active;
          const mergedSettings = { ...DEFAULT_OVERLAY_SETTINGS, ...snap.overlay };
          settingsRef.current = mergedSettings;

          setPools(snap.pools);
          setActive(snap.active);
          setSettings(mergedSettings);
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

  const activeRarity = active?.rarity ?? 'rare';
  const tierList = pools[activeRarity] || [];
  const activeIdx = active ? tierList.findIndex((it) => it.id === active.itemId) : -1;
  const activeItem = activeIdx >= 0 ? tierList[activeIdx] : null;

  const effectiveAnchor: OverlayAnchorPosition =
    posParam && posParam in ANCHOR_CONTAINER_CLASSES ? posParam : settings.anchor;
  const effectiveWidth =
    widthParam >= 140 && widthParam <= 600 ? widthParam : settings.cardWidthPx;

  return (
    <main
      className={`w-screen h-screen overflow-hidden flex ${ANCHOR_CONTAINER_CLASSES[effectiveAnchor]}`}
      style={{ background: 'transparent' }}
    >
      <GiveawayOverlayCard
        item={activeItem}
        rarity={activeRarity}
        slotIndex={activeIdx}
        settings={{ ...settings, cardWidthPx: effectiveWidth }}
      />
    </main>
  );
}

export default function OverlayPage() {
  return (
    <>
      {/* Inline SSR style guarantees transparent alpha channel on Frame 0 inside OBS Browser Source */}
      <style>{`
        html, body {
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
