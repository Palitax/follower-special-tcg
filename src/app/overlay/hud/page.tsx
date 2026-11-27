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
import {
  HudWidgetKey,
  STANDALONE_HUD_STAGES,
  StandaloneHudWidget,
  WhatnotHudOverlay,
} from '../../../components/WhatnotHudOverlay';

function HudOverlaySurface() {
  const searchParams = useSearchParams();
  const overlayKey = searchParams.get('key');
  const onlyParam = searchParams.get('only');
  const only: HudWidgetKey | null =
    onlyParam === 'shop' || onlyParam === 'giveaway' || onlyParam === 'avatar'
      ? onlyParam
      : null;

  const [snapshot, setSnapshot] = useState<BroadcastBarsSnapshot>(() =>
    createDefaultBroadcastBarsSnapshot('hud_overlay_init')
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
        const parsed = normalizeBroadcastBarsSnapshot(JSON.parse(raw), 'hud_local');
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

  if (only) {
    const stage = STANDALONE_HUD_STAGES[only];
    const fitScale =
      viewport.w > 0 && viewport.h > 0
        ? Math.min(viewport.w / stage.width, viewport.h / stage.height)
        : 1;

    return (
      <main
        className="w-screen h-screen overflow-hidden flex items-center justify-center"
        style={{ background: 'transparent', backgroundColor: 'rgba(0, 0, 0, 0)' }}
      >
        {missingKeyHint ? (
          <div className="px-4 py-2.5 bg-zinc-950/95 border border-sky-400/50 text-xs font-bold text-sky-100 shadow-2xl text-center max-w-sm">
            Bitte im Regie-Studio unter „Whatnot HUD“ die vollständige OBS-URL (inkl. ?key=…)
            kopieren.
          </div>
        ) : (
          <StandaloneHudWidget
            widgetKey={only}
            config={snapshot.hud[only]}
            masterVisible={snapshot.hud.visible}
            scale={fitScale}
          />
        )}
      </main>
    );
  }

  // Fallback combined 9:16 1080x1920 mode
  const fitScale =
    viewport.w > 0 && viewport.h > 0
      ? Math.min(viewport.w / 1080, viewport.h / 1920)
      : 1;

  return (
    <main
      className="w-screen h-screen overflow-hidden flex items-center justify-center"
      style={{ background: 'transparent', backgroundColor: 'rgba(0, 0, 0, 0)' }}
    >
      {missingKeyHint ? (
        <div className="px-4 py-2.5 bg-zinc-950/95 border border-sky-400/50 text-xs font-bold text-sky-100 shadow-2xl text-center max-w-sm">
          Bitte im Regie-Studio unter „Whatnot HUD“ die vollständige OBS Browser-Quellen-URL
          (inkl. ?key=…) kopieren.
        </div>
      ) : (
        <WhatnotHudOverlay settings={snapshot.hud} scale={fitScale} />
      )}
    </main>
  );
}

export default function WhatnotHudOverlayPage() {
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
        <HudOverlaySurface />
      </Suspense>
    </>
  );
}
