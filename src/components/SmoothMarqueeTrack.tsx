'use client';

import React, { useEffect, useRef, useState } from 'react';

interface SmoothMarqueeTrackProps {
  /** Logical scroll speed in px/sec (multiplied internally by qualityScale for crisp HiDPI parity) */
  speedPxPerSec: number;
  /** HiDPI render multiplier (1, 1.5, 2) */
  qualityScale: number;
  /** Freezes scroll offset cleanly in place when true */
  paused: boolean;
  /** Renders one full logical cycle of ticker items */
  renderSegment: (copyKey: string) => React.ReactNode;
  /** Change token to re-measure segment width when items/fonts/sizing change */
  measureKey: string;
}

/**
 * OBS-optimized GPU marquee engine.
 *
 * Why this eliminates OBS Browser Source stutter compared to CSS `@keyframes translate3d(-50%)`:
 * 1. Syncs directly to OBS CEF's `BeginMainFrame` (`requestAnimationFrame`) with clamped & lightly
 *    smoothed delta-time so variable frame pacing or 30/60Hz capture ticks never produce hitches.
 * 2. Wraps at the exact measured pixel width of a single segment (`offset %= segmentW`) instead of
 *    a floating percentage of an ultra-wide flex container.
 * 3. Speed changes via the Studio slider apply live on the very next frame with zero restart jump.
 * 4. Keeps the scrolling layer lean (pure GPU `translate3d`, `backface-visibility: hidden`, no nested
 *    CSS `mask-image` layers forcing CPU re-rasterization in OBS Off-Screen Rendering).
 */
export const SmoothMarqueeTrack: React.FC<SmoothMarqueeTrackProps> = ({
  speedPxPerSec,
  qualityScale,
  paused,
  renderSegment,
  measureKey,
}) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const segmentRef = useRef<HTMLDivElement>(null);

  const [copyCount, setCopyCount] = useState(2);

  const offsetRef = useRef(0);
  const segWidthRef = useRef(0);
  const velocityRef = useRef(speedPxPerSec * qualityScale);
  const pausedRef = useRef(paused);

  // Live velocity & pause updates without interrupting the rAF loop
  useEffect(() => {
    velocityRef.current = Math.max(4, speedPxPerSec) * qualityScale;
  }, [speedPxPerSec, qualityScale]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  // Measure single-segment width & compute minimum duplicate copies to guarantee seamless wrap
  useEffect(() => {
    const segEl = segmentRef.current;
    const vpEl = viewportRef.current;
    if (!segEl || !vpEl) return;

    const measure = () => {
      const segW = segEl.getBoundingClientRect().width;
      const vpW = vpEl.getBoundingClientRect().width;
      if (segW > 2) {
        segWidthRef.current = segW;
        if (offsetRef.current >= segW) {
          offsetRef.current = offsetRef.current % segW;
        }
        const needed = Math.max(2, Math.min(6, Math.ceil(vpW / segW) + 2));
        setCopyCount((prev) => (prev === needed ? prev : needed));
      }
    };

    measure();
    const rafMeasure = requestAnimationFrame(measure);
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      void document.fonts.ready.then(measure);
    }

    if (typeof ResizeObserver === 'undefined') {
      return () => cancelAnimationFrame(rafMeasure);
    }
    const ro = new ResizeObserver(measure);
    ro.observe(segEl);
    ro.observe(vpEl);
    return () => {
      cancelAnimationFrame(rafMeasure);
      ro.disconnect();
    };
  }, [measureKey]);

  // Precision rAF transform loop locked to OBS CEF frame clock
  useEffect(() => {
    let rafId = 0;
    let lastTs = 0;
    let smoothDt = 1 / 60;

    const step = (ts: number) => {
      if (lastTs === 0) {
        lastTs = ts;
      }
      const rawDt = Math.max(0, Math.min(0.05, (ts - lastTs) / 1000));
      lastTs = ts;

      // Gentle exponential smoothing dampens 1-2ms OS/CEF timer jitter without lag
      smoothDt = smoothDt * 0.72 + rawDt * 0.28;

      const segW = segWidthRef.current;
      if (!pausedRef.current && segW > 2 && rawDt > 0) {
        let next = offsetRef.current + velocityRef.current * smoothDt;
        if (next >= segW) {
          next -= Math.floor(next / segW) * segW;
        }
        offsetRef.current = next;

        const el = trackRef.current;
        if (el) {
          el.style.transform = `translate3d(${(-next).toFixed(3)}px, 0, 0)`;
        }
      }

      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const copies = Array.from({ length: copyCount }, (_, idx) => idx);

  return (
    <div
      ref={viewportRef}
      className="relative flex-1 min-w-0 h-full flex items-center overflow-hidden"
    >
      <div
        ref={trackRef}
        className="flex items-center w-max"
        style={{
          willChange: 'transform',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          contain: 'layout style',
          transform: 'translate3d(0px, 0, 0)',
        }}
      >
        {copies.map((copyIdx) => (
          <div
            key={`seg_${copyIdx}`}
            ref={copyIdx === 0 ? segmentRef : undefined}
            className="flex items-center shrink-0"
          >
            {renderSegment(`c${copyIdx}`)}
          </div>
        ))}
      </div>
    </div>
  );
};
