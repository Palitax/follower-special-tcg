'use client';

import { useEffect, useMemo, useState } from 'react';
import { RotatorBarSettings, RotatorSlide } from '../types/broadcastBars';

/**
 * Shared slide-cycling logic for every rotator design.
 * Handles enabled filtering, pinning, pause and the switch interval.
 * `turn` increments on every slide change so designs can re-key choreography.
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

  useEffect(() => {
    if (cycleIndex >= enabledSlides.length) setCycleIndex(0);
  }, [enabledSlides.length, cycleIndex]);

  const pinnedSlide = useMemo(() => {
    const targetId = previewSlideId || settings.pinnedSlideId;
    if (!targetId) return null;
    return slides.find((s) => s.id === targetId) ?? null;
  }, [previewSlideId, settings.pinnedSlideId, slides]);

  const isCycling =
    settings.visible && !settings.paused && !pinnedSlide && enabledSlides.length > 1;

  useEffect(() => {
    if (!isCycling) return;
    const ms = Math.max(3000, settings.intervalSec * 1000);
    const id = setInterval(() => {
      setCycleIndex((prev) => (prev + 1) % enabledSlides.length);
    }, ms);
    return () => clearInterval(id);
  }, [isCycling, settings.intervalSec, enabledSlides.length]);

  const activeSlide: RotatorSlide | null =
    pinnedSlide ??
    (enabledSlides.length > 0 ? enabledSlides[cycleIndex % enabledSlides.length] : null);
  const activeId = activeSlide?.id ?? null;

  useEffect(() => {
    if (activeId) setTurn((t) => t + 1);
  }, [activeId]);

  return { activeSlide, turn, isCycling };
}
