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
import { BroadcastTicker } from '../../../components/BroadcastBars';

type AlignMode = 'top' | 'center' | 'bottom';

const ALIGN_CLASSES: Record<AlignMode, string> = {
  top: 'items-start',
  center: 'items-center',
  bottom: 'items-end',
};

function TickerOverlaySurface() {
  const searchParams = useSearchParams();
  const overlayKey = searchParams.get('key');
  const alignParam = searchParams.get('align') as AlignMode | null;

  const [snapshot, setSnapshot] = useState<BroadcastBarsSnapshot>(() =>
    createDefaultBroadcastBarsSnapshot('ticker_overlay_init')
  );
  const [missingKeyHint, setMissingKeyHint] = useState(false);
  const snapshotRef = useRef<BroadcastBarsSnapshot>(snapshot);

  useEffect(() => {
    document.documentElement.classList.add('obs-overlay-root');
    return () => {
      document.documentElement.classList.remove('obs-overlay-root');
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let controller: BroadcastBarsSyncController | null = null;

    try {
      const raw = localStorage.getItem(BARS_STORAGE_KEY);
      if (raw) {
        const parsed = normalizeBroadcastBarsSnapshot(JSON.parse(raw), 'ticker_local');
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

  return (
    <main
      className={`w-screen h-screen overflow-hidden flex justify-center ${ALIGN_CLASSES[effectiveAlign]}`}
      style={{ background: 'transparent', backgroundColor: 'rgba(0, 0, 0, 0)' }}
    >
      {missingKeyHint ? (
        <div className="px-4 py-2.5 bg-zinc-950/95 border border-sky-400/50 text-xs font-bold text-sky-100 shadow-2xl text-center max-w-sm">
          Bitte im Regie-Studio unter „Social Rotator &amp; Ticker“ die vollständige
          Ticker-URL (inkl. ?key=…) kopieren.
        </div>
      ) : (
        <div className="w-full">
          <BroadcastTicker
            design={snapshot.design}
            items={snapshot.tickerItems}
            settings={snapshot.ticker}
          />
        </div>
      )}
    </main>
  );
}

export default function TickerOverlayPage() {
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
        <TickerOverlaySurface />
      </Suspense>
    </>
  );
}
