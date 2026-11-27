'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { RotatorBarSettings, RotatorSlide } from '../types/broadcastBars';

/**
 * Shared slide-cycling logic for every rotator design.
 * Supports:
 *  - Continuous loop (`restDurationSec === 0`)
 *  - Intermittent burst cycles (`restDurationSec > 0`): plays every enabled slide once,
 *    then cleanly hides for `restDurationSec` seconds before triggering the next full cycle.
 *  - Instant manual wake-up via `settings.triggerNonce`.
 *  - Pin override (`pinnedSlideId`) & Pause (`paused`).
 */
export function useRotatorCycle(
  slides: RotatorSlide[],
  settings: RotatorBarSettings,
  previewSlideId: string | null = null
) {
  const enabledSlides = useMemo(
    () => slides.filter((s) => s.enabled && (s.headline.trim() || s.eyebrow.trim())),
    [slides]
  );

  const [cycleIndex, setCycleIndex] = useState(0);
  const [turn, setTurn] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [restRemainingSec, setRestRemainingSec] = useState(0);
  const lastTriggerRef = useRef<number>(settings.triggerNonce ?? 0);

  // Clamp index when slide count shrinks
  useEffect(() => {
    if (cycleIndex >= enabledSlides.length) setCycleIndex(0);
  }, [enabledSlides.length, cycleIndex]);

  const pinnedSlide = useMemo(() => {
    const targetId = previewSlideId || settings.pinnedSlideId;
    if (!targetId) return null;
    return slides.find((s) => s.id === targetId) ?? null;
  }, [previewSlideId, settings.pinnedSlideId, slides]);

  const restSec = Math.max(0, settings.restDurationSec ?? 0);

  // Manual trigger from Studio wakes immediately from rest and restarts at slide 0
  useEffect(() => {
    const nonce = settings.triggerNonce ?? 0;
    if (nonce > 0 && nonce !== lastTriggerRef.current) {
      lastTriggerRef.current = nonce;
      setIsResting(false);
      setRestRemainingSec(0);
      setCycleIndex(0);
      setTurn((t) => t + 1);
    }
  }, [settings.triggerNonce]);

  // If pinned, hidden, paused, or rest disabled -> immediately leave rest phase
  useEffect(() => {
    if (pinnedSlide || !settings.visible || settings.paused || restSec === 0) {
      if (isResting) {
        setIsResting(false);
        setRestRemainingSec(0);
      }
    }
  }, [pinnedSlide, settings.visible, settings.paused, restSec, isResting]);

  const isCycling =
    settings.visible &&
    !settings.paused &&
    !pinnedSlide &&
    (enabledSlides.length > 1 || (enabledSlides.length === 1 && restSec > 0));

  // Main slide & rest state machine
  useEffect(() => {
    if (!isCycling || enabledSlides.length === 0) return;

    if (isResting) {
      const restEnd = Date.now() + restSec * 1000;
      setRestRemainingSec(restSec);

      const countdownId = setInterval(() => {
        const left = Math.max(0, Math.ceil((restEnd - Date.now()) / 1000));
        setRestRemainingSec(left);
      }, 500);

      const wakeId = setTimeout(() => {
        clearInterval(countdownId);
        setIsResting(false);
        setRestRemainingSec(0);
        setCycleIndex(0);
        setTurn((t) => t + 1);
      }, restSec * 1000);

      return () => {
        clearInterval(countdownId);
        clearTimeout(wakeId);
      };
    }

    const stepMs = Math.max(3000, settings.intervalSec * 1000);
    const nextTimer = setTimeout(() => {
      const isLastSlide = cycleIndex >= enabledSlides.length - 1;
      if (isLastSlide && restSec > 0) {
        setIsResting(true);
      } else {
        setCycleIndex((prev) => (prev + 1) % enabledSlides.length);
      }
    }, stepMs);

    return () => clearTimeout(nextTimer);
  }, [isCycling, isResting, cycleIndex, enabledSlides.length, settings.intervalSec, restSec]);

  const activeSlide: RotatorSlide | null =
    pinnedSlide ??
    (enabledSlides.length > 0 ? enabledSlides[cycleIndex % enabledSlides.length] : null);
  const activeId = activeSlide?.id ?? null;

  useEffect(() => {
    if (activeId && !isResting) setTurn((t) => t + 1);
  }, [activeId, isResting]);

  return {
    activeSlide,
    turn,
    isCycling,
    isResting: !pinnedSlide && isResting,
    restRemainingSec,
    slideIndex: cycleIndex,
    totalEnabled: enabledSlides.length,
  };
}
