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
} from '../../../lib/barsLiveSync';
import { BroadcastRotator, BroadcastTicker } from '../../../components/BroadcastBars';

type AlignMode = 'top' | 'center' | 'bottom';

const ALIGN_CLASSES: Record<AlignMode, string> = {
  top: 'items-start justify-center pt-5 px-4',
  center: 'items-center justify-center p-4',
  bottom: 'items-end justify-center pb-5 px-4',
};

function RotatorOverlaySurface() {
  const searchParams = useSearchParams();
  const overlayKey = searchParams.get('key');
  const alignParam = searchParams.get('align') as AlignMode | null;
  const widthParam = Number(searchParams.get('w') || '0');
  const heightParam = Number(searchParams.get('h') || '0');
  const includeTicker = searchParams.get('ticker') === '1';

  const [snapshot, setSnapshot] = useState<BroadcastBarsSnapshot>(() =>
    createDefaultBroadcastBarsSnapshot('overlay_init')
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

    try {
      const raw = localStorage.getItem(BARS_STORAGE_KEY);
      if (raw) {
        const parsed = normalizeBroadcastBarsSnapshot(JSON.parse(raw), 'overlay_local');
        snapshotRef.current = parsed;
        setSnapshot(parsed);
      }
    } catch {
      // Ignore inside isolated OBS CEF
    }

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

    return () => {
      cancelled = true;
      controller?.stop();
    };
  }, [overlayKey]);

  const effectiveAlign: AlignMode =
    alignParam && alignParam in ALIGN_CLASSES ? alignParam : 'center';
  const effectiveWidth =
    widthParam >= 300 && widthParam <= 1200 ? widthParam : snapshot.rotator.widthPx;
  const effectiveHeight =
    heightParam >= 60 && heightParam <= 260 ? heightParam : snapshot.rotator.heightPx;

  const q = snapshot.rotator.qualityScale ?? 2;
  const renderedW = Math.round(effectiveWidth * q);
  const renderedH = Math.round((effectiveHeight + 36) * q);

  // Never upscale; only scale down safely if OBS Browser Source box is smaller than the HiDPI target
  const safeFitScale =
    viewport.w > 0 && viewport.h > 0
      ? Math.min(
          1,
          (viewport.w - 24) / Math.max(1, renderedW),
          (viewport.h - 24) / Math.max(1, includeTicker ? renderedH + Math.round(snapshot.ticker.heightPx * (snapshot.ticker.qualityScale ?? 2) + 28) : renderedH)
        )
      : 1;

  return (
    <main
      className={`w-screen h-screen overflow-hidden flex ${ALIGN_CLASSES[effectiveAlign]}`}
      style={{ background: 'transparent', backgroundColor: 'rgba(0, 0, 0, 0)' }}
    >
      {missingKeyHint ? (
        <div className="px-4 py-2.5 bg-zinc-950/95 border border-sky-400/50 text-xs font-bold text-sky-100 shadow-2xl text-center max-w-sm">
          Bitte im Regie-Studio unter „Social Rotator &amp; Ticker“ die vollständige
          OBS Browser-Quellen-URL (inkl. ?key=…) kopieren.
        </div>
      ) : includeTicker ? (
        <div
          className="flex flex-col items-center gap-3 max-w-full"
          style={{ width: `${Math.round(renderedW * safeFitScale)}px` }}
        >
          <BroadcastRotator
            design={snapshot.design}
            slides={snapshot.slides}
            settings={{
              ...snapshot.rotator,
              widthPx: effectiveWidth,
              heightPx: effectiveHeight,
            }}
            scale={safeFitScale}
          />
          <BroadcastTicker
            design={snapshot.design}
            items={snapshot.tickerItems}
            settings={{ ...snapshot.ticker, fullWidth: true }}
            scale={safeFitScale}
          />
        </div>
      ) : (
        <BroadcastRotator
          design={snapshot.design}
          slides={snapshot.slides}
          settings={{
            ...snapshot.rotator,
            widthPx: effectiveWidth,
            heightPx: effectiveHeight,
          }}
          scale={safeFitScale}
        />
      )}
    </main>
  );
}

export default function RotatorOverlayPage() {
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
        <RotatorOverlaySurface />
      </Suspense>
    </>
  );
}
