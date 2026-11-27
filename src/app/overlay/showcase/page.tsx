'use client';

import React, { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  BroadcastBarsSnapshot,
  createDefaultBroadcastBarsSnapshot,
  normalizeBroadcastBarsSnapshot,
} from '../../../types/broadcastBars';
import {
  BARS_STORAGE_KEY,
  BroadcastBarsSyncController,
  hydrateBarsSnapshot,
} from '../../../lib/barsLiveSync';
import { PromoShowcaseOverlay } from '../../../components/PromoShowcaseOverlay';

type AlignMode = 'top' | 'center' | 'bottom';

const ALIGN_CLASSES: Record<AlignMode, string> = {
  top: 'items-start justify-center pt-6 px-4',
  center: 'items-center justify-center p-4',
  bottom: 'items-end justify-center pb-6 px-4',
};

function ShowcaseOverlaySurface() {
  const searchParams = useSearchParams();
  const overlayKey = searchParams.get('key');
  const alignParam = searchParams.get('align') as AlignMode | null;

  const [snapshot, setSnapshot] = useState<BroadcastBarsSnapshot>(() =>
    createDefaultBroadcastBarsSnapshot('showcase_overlay_init')
  );
  const [missingKeyHint, setMissingKeyHint] = useState(false);
  const [viewport, setViewport] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const snapshotRef = useRef<BroadcastBarsSnapshot>(snapshot);

  useEffect(() => {
    document.documentElement.classList.add('obs-overlay-root');
    return () => {
      document.documentElement.classList.remove('obs-overlay-root');
    };
  }, []);

  useEffect(() => {
    const updateVp = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    updateVp();
    window.addEventListener('resize', updateVp);
    return () => window.removeEventListener('resize', updateVp);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let controller: BroadcastBarsSyncController | null = null;

    async function bootstrap() {
      try {
        const raw = localStorage.getItem(BARS_STORAGE_KEY);
        if (raw) {
          const parsed = normalizeBroadcastBarsSnapshot(JSON.parse(raw), 'showcase_local');
          const hydrated = await hydrateBarsSnapshot(parsed);
          if (!cancelled) {
            snapshotRef.current = hydrated;
            setSnapshot(hydrated);
          }
        }
      } catch {
        // Ignore inside isolated OBS CEF
      }

      if (cancelled) return;

      controller = new BroadcastBarsSyncController({
        role: 'overlay',
        overlayKey,
        onUnauthorized: () => {
          if (!cancelled) setMissingKeyHint(true);
        },
        getLocalSnapshot: (clientId) => ({
          ...snapshotRef.current,
          senderId: clientId,
        }),
        onRemoteSnapshot: (incoming) => {
          if (cancelled) return;
          snapshotRef.current = incoming;
          setSnapshot(incoming);
        },
      });

      void controller.start();
    }

    void bootstrap();

    return () => {
      cancelled = true;
      controller?.stop();
    };
  }, [overlayKey]);

  const effectiveAlign: AlignMode =
    alignParam && alignParam in ALIGN_CLASSES ? alignParam : 'center';

  const activePreset =
    snapshot.showcases.find((p) => p.id === snapshot.showcase.activePresetId) ??
    snapshot.showcases[0] ??
    null;

  const q = snapshot.showcase.qualityScale ?? 2;
  const s = Math.max(0.6, Math.min(1.8, (snapshot.showcase.scalePct ?? 100) / 100));
  const renderedW = Math.round(780 * s * q);
  const renderedH = Math.round(560 * s * q);

  const safeFitScale =
    viewport.w > 0 && viewport.h > 0
      ? Math.min(
          1,
          (viewport.w - 24) / Math.max(1, renderedW),
          (viewport.h - 24) / Math.max(1, renderedH)
        )
      : 1;

  return (
    <main
      className={`w-screen h-screen overflow-hidden flex ${ALIGN_CLASSES[effectiveAlign]}`}
      style={{ background: 'transparent', backgroundColor: 'rgba(0, 0, 0, 0)' }}
    >
      {missingKeyHint ? (
        <div className="px-4 py-2.5 bg-zinc-950/95 border border-sky-400/50 text-xs font-bold text-sky-100 shadow-2xl text-center max-w-sm">
          Bitte im Regie-Studio unter „Social Rotator &amp; Ticker → KGA / Showcase“ die
          vollständige OBS Browser-Quellen-URL (inkl. ?key=…) kopieren.
        </div>
      ) : (
        <PromoShowcaseOverlay
          preset={activePreset}
          presets={snapshot.showcases}
          settings={snapshot.showcase}
          scale={safeFitScale}
        />
      )}
    </main>
  );
}

export default function ShowcaseOverlayPage() {
  return (
    <>
      <style>{`
        :root, html, body {
          color-scheme: normal !important;
          background: transparent !important;
          background-color: rgba(0, 0, 0, 0) !important;
          overflow: hidden !important;
        }
      `}</style>
      <Suspense fallback={null}>
        <ShowcaseOverlaySurface />
      </Suspense>
    </>
  );
}
