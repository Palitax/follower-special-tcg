'use client';

import { useEffect, useRef, useState } from 'react';
import { TickerBarSettings } from '../types/broadcastBars';

export interface TickerCycleStatus {
  isShowing: boolean;
  isResting: boolean;
  remainingSec: number;
  cycleActive: boolean;
}

/**
 * Visibility & auto-cycle hook for the horizontal Ticker.
 * - When `visibleDurationSec === 0` or `hiddenDurationSec === 0`, the ticker stays continuously visible.
 * - When both > 0, alternates smoothly between showing (`visibleDurationSec`) and hidden rest (`hiddenDurationSec`).
 * - Bumping `triggerNonce` immediately wakes the ticker and increments `playNonce` so entrance animation replays.
 */
export function useTickerCycle(
  settings: TickerBarSettings,
  forcePreviewVisible = false,
  onCycleStatus?: (status: TickerCycleStatus) => void
) {
  const showSec = Math.max(0, settings.visibleDurationSec ?? 0);
  const hideSec = Math.max(0, settings.hiddenDurationSec ?? 0);
  const cycleEnabled = showSec > 0 && hideSec > 0;

  const [phase, setPhase] = useState<'showing' | 'resting'>('showing');
  const [remainingSec, setRemainingSec] = useState(0);
  const [playNonce, setPlayNonce] = useState(0);
  const lastTriggerRef = useRef<number>(settings.triggerNonce ?? 0);

  // Instant manual wake / entrance animation test from Studio
  useEffect(() => {
    const nonce = settings.triggerNonce ?? 0;
    if (nonce > 0 && nonce !== lastTriggerRef.current) {
      lastTriggerRef.current = nonce;
      setPhase('showing');
      setRemainingSec(cycleEnabled ? showSec : 0);
      setPlayNonce((n) => n + 1);
    }
  }, [settings.triggerNonce, cycleEnabled, showSec]);

  // Reset cleanly when cycle disabled or master visibility off
  useEffect(() => {
    if (!settings.visible || !cycleEnabled) {
      setPhase('showing');
      setRemainingSec(0);
    }
  }, [settings.visible, cycleEnabled]);

  // Main show <-> rest timer
  useEffect(() => {
    if (forcePreviewVisible || !settings.visible || !cycleEnabled) {
      setRemainingSec(0);
      return;
    }

    const durSec = phase === 'showing' ? showSec : hideSec;
    if (durSec <= 0) return;

    const endTs = Date.now() + durSec * 1000;
    setRemainingSec(durSec);

    const tickId = setInterval(() => {
      setRemainingSec(Math.max(0, Math.ceil((endTs - Date.now()) / 1000)));
    }, 500);

    const nextId = setTimeout(() => {
      clearInterval(tickId);
      setPhase((cur) => {
        const next = cur === 'showing' ? 'resting' : 'showing';
        if (next === 'showing') {
          setPlayNonce((n) => n + 1);
        }
        return next;
      });
    }, durSec * 1000);

    return () => {
      clearInterval(tickId);
      clearTimeout(nextId);
    };
  }, [forcePreviewVisible, settings.visible, cycleEnabled, phase, showSec, hideSec, playNonce]);

  const isResting = !forcePreviewVisible && settings.visible && cycleEnabled && phase === 'resting';
  const isShowing = forcePreviewVisible || (settings.visible && !isResting);

  useEffect(() => {
    onCycleStatus?.({
      isShowing,
      isResting,
      remainingSec,
      cycleActive: cycleEnabled,
    });
  }, [onCycleStatus, isShowing, isResting, remainingSec, cycleEnabled]);

  return {
    isShowing,
    isResting,
    remainingSec,
    cycleEnabled,
    playNonce,
  };
}
