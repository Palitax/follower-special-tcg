'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { HudWidgetConfig, WhatnotHudSettings } from '../types/broadcastBars';
import { HudCalloutPointer, WowElementalFrame } from './WowElementalFrames';

export type HudWidgetKey = 'shop' | 'giveaway' | 'avatar';

/** Merges global "für alle Elemente" thickness & glow multipliers into one widget's config */
export function resolveHudWidget(settings: WhatnotHudSettings, key: HudWidgetKey): HudWidgetConfig {
  const cfg = settings[key];
  const tMul = (settings.frameThicknessPct ?? 100) / 100;
  const gMul = (settings.frameGlowPct ?? 100) / 100;
  return {
    ...cfg,
    thicknessPct: Math.round(cfg.thicknessPct * tMul),
    intensityPct: Math.round(cfg.intensityPct * gMul),
  };
}

const CANVAS_W = 1080;
const CANVAS_H = 1920;

/**
 * Generous, unclipped standalone OBS stage geometry for each independent widget.
 * Each widget gets its own self-contained Browser Source (?only=shop / ?only=giveaway / ?only=avatar)
 * with ample transparent margin on all sides so glowing auras, lightning arcs, and animated
 * callout arrows NEVER get clipped in OBS or Studio preview.
 */
export const STANDALONE_HUD_STAGES: Record<
  HudWidgetKey,
  {
    width: number;
    height: number;
    anchorX: number;
    anchorY: number;
    shape: 'circle' | 'rect';
  }
> = {
  shop: {
    width: 960,
    height: 720,
    anchorX: 650,
    anchorY: 445,
    shape: 'circle',
  },
  giveaway: {
    width: 1040,
    height: 720,
    anchorX: 690,
    anchorY: 320,
    shape: 'rect',
  },
  avatar: {
    width: 800,
    height: 560,
    anchorX: 250,
    anchorY: 265,
    shape: 'circle',
  },
};

interface SingleHudTargetProps {
  widgetKey: HudWidgetKey;
  shape: 'circle' | 'rect';
  config: HudWidgetConfig;
  canvasW: number;
  canvasH: number;
  centerX: number;
  centerY: number;
  forceCalloutVisible?: boolean;
  interactive?: boolean;
  previewScale?: number;
  onDragCallout?: (nextOffsetX: number, nextOffsetY: number) => void;
}

/** Manages one widget's glowing WoW elemental frame + independent interval callout arrow */
const SingleHudTarget: React.FC<SingleHudTargetProps> = ({
  widgetKey,
  shape,
  config,
  canvasW,
  canvasH,
  centerX,
  centerY,
  forceCalloutVisible = false,
  interactive = false,
  previewScale = 1,
  onDragCallout,
}) => {
  const reduce = useReducedMotion() ?? false;
  const showSec = Math.max(0, config.calloutVisibleSec ?? 0);
  const hideSec = Math.max(5, config.calloutHiddenSec ?? 30);
  const cycleOn = config.calloutEnabled && showSec > 0;

  const [calloutPhase, setCalloutPhase] = useState<'showing' | 'resting'>('showing');
  const [playNonce, setPlayNonce] = useState(0);
  const lastTriggerRef = useRef(config.calloutTriggerNonce ?? 0);

  // Manual trigger from Studio wakes callout immediately & replays pop-in
  useEffect(() => {
    const n = config.calloutTriggerNonce ?? 0;
    if (n > 0 && n !== lastTriggerRef.current) {
      lastTriggerRef.current = n;
      setCalloutPhase('showing');
      setPlayNonce((p) => p + 1);
    }
  }, [config.calloutTriggerNonce]);

  // Reset phase when interval disabled
  useEffect(() => {
    if (!cycleOn) {
      setCalloutPhase('showing');
    }
  }, [cycleOn]);

  // Callout show <-> hide timer
  useEffect(() => {
    if (forceCalloutVisible || !config.enabled || !cycleOn) return;
    const ms = (calloutPhase === 'showing' ? showSec : hideSec) * 1000;
    const id = setTimeout(() => {
      setCalloutPhase((cur) => {
        const next = cur === 'showing' ? 'resting' : 'showing';
        if (next === 'showing') setPlayNonce((p) => p + 1);
        return next;
      });
    }, ms);
    return () => clearTimeout(id);
  }, [forceCalloutVisible, config.enabled, cycleOn, calloutPhase, showSec, hideSec, playNonce]);

  if (!config.enabled) return null;

  const w = config.widthPx;
  const h = shape === 'circle' ? config.widthPx : config.heightPx;
  const showCallout =
    config.calloutEnabled &&
    (config.calloutText.trim().length > 0 || config.calloutSubtext.trim().length > 0) &&
    (forceCalloutVisible || !cycleOn || calloutPhase === 'showing');

  return (
    <>
      {/* Glowing WoW Elemental Aura Frame */}
      <motion.div
        key={`frame_${widgetKey}_${config.style}`}
        initial={{ opacity: 0, scale: reduce ? 1 : 0.88 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: reduce ? 1 : 0.9 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="pointer-events-none absolute flex items-center justify-center overflow-visible"
        style={{
          left: centerX,
          top: centerY,
          transform: 'translate(-50%, -50%)',
        }}
      >
        <WowElementalFrame
          shape={shape}
          style={config.style}
          width={w}
          height={h}
          radius={config.radiusPx}
          intensityPct={config.intensityPct}
          thicknessPct={config.thicknessPct}
          animSpeed={config.animSpeed}
        />
      </motion.div>

      {/* Animated Pointing Arrow + Custom Text Callout */}
      <AnimatePresence mode="wait">
        {showCallout && (
          <motion.div
            key={`callout_${widgetKey}_${playNonce}`}
            initial={{ opacity: 0, scale: reduce ? 1 : 0.86 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: reduce ? 1 : 0.9 }}
            transition={{ type: 'spring', stiffness: 360, damping: 26 }}
            className="pointer-events-none absolute inset-0 overflow-visible"
          >
            <HudCalloutPointer
              canvasW={canvasW}
              canvasH={canvasH}
              targetX={centerX}
              targetY={centerY}
              targetHalfW={w / 2}
              targetHalfH={h / 2}
              offsetX={config.calloutOffsetX}
              offsetY={config.calloutOffsetY}
              text={config.calloutText}
              subtext={config.calloutSubtext}
              style={config.style}
              scalePct={config.calloutScalePct}
              interactive={interactive}
              previewScale={previewScale}
              onDragOffset={onDragCallout}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

/** Studio-only translucent mock of JUST the selected Whatnot element inside its standalone stage */
const StandaloneGhostTarget: React.FC<{
  widgetKey: HudWidgetKey;
  centerX: number;
  centerY: number;
  width: number;
  height: number;
  radius: number;
}> = ({ widgetKey, centerX, centerY, width, height, radius }) => {
  if (widgetKey === 'shop') {
    const inner = Math.max(48, Math.round(width * 0.82));
    return (
      <div
        aria-hidden="true"
        className="pointer-events-none absolute flex flex-col items-center select-none font-wn-sans"
        style={{ left: centerX, top: centerY, transform: 'translate(-50%, -50%)' }}
      >
        <div
          className="rounded-full border-2 border-white/45 bg-black/65 flex items-center justify-center text-white font-extrabold"
          style={{ width: inner, height: inner, fontSize: Math.max(16, Math.round(inner * 0.2)) }}
        >
          SHOP
        </div>
      </div>
    );
  }

  if (widgetKey === 'giveaway') {
    const innerW = Math.max(100, Math.round(width * 0.94));
    const innerH = Math.max(60, Math.round(height * 0.92));
    const r = Math.min(radius, innerH / 2);
    return (
      <div
        aria-hidden="true"
        className="pointer-events-none absolute flex flex-col justify-center select-none font-wn-sans"
        style={{
          left: centerX,
          top: centerY,
          width: innerW,
          height: innerH,
          transform: 'translate(-50%, -50%)',
          borderRadius: r,
          background: 'rgba(26, 36, 62, 0.82)',
          border: '2px solid rgba(255,255,255,0.22)',
          padding: '16px 24px',
        }}
      >
        <div className="text-white font-extrabold" style={{ fontSize: 28 }}>
          Giveaway
        </div>
        <div className="text-white/75 font-semibold mt-1" style={{ fontSize: 20 }}>
          0 Teilnahmen
        </div>
      </div>
    );
  }

  // Avatar
  const inner = Math.max(48, Math.round(width * 0.72));
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute flex items-center gap-4 select-none font-wn-sans"
      style={{
        left: centerX,
        top: centerY,
        transform: `translate(-${Math.round(inner / 2)}px, -50%)`,
      }}
    >
      <div
        className="rounded-full border-2 border-white/45 bg-sky-950/80 overflow-hidden shrink-0"
        style={{ width: inner, height: inner }}
      >
        <img
          src="/images/logos/mana-bottle.png"
          alt=""
          className="w-full h-full object-cover opacity-90"
        />
      </div>
      <div className="whitespace-nowrap opacity-70">
        <div className="text-white font-extrabold leading-tight" style={{ fontSize: 26 }}>
          manacards_de
        </div>
        <div className="text-white/70 font-semibold" style={{ fontSize: 18 }}>
          5.0 · &lt;1d
        </div>
      </div>
    </div>
  );
};

interface StandaloneHudWidgetProps {
  widgetKey: HudWidgetKey;
  config: HudWidgetConfig;
  masterVisible: boolean;
  /** Scale multiplier to fit cleanly inside OBS Browser Source or Studio Preview */
  scale?: number;
  forceCalloutVisible?: boolean;
  showGhostTarget?: boolean;
  /** Enables direct pointer dragging of the Callout Pill inside Studio Preview */
  interactive?: boolean;
  onDragCallout?: (nextOffsetX: number, nextOffsetY: number) => void;
}

/**
 * Self-contained, completely independent & unclipped single-widget stage for OBS (?only=shop|giveaway|avatar)
 * and the crisp high-res interactive Studio Preview.
 */
export const StandaloneHudWidget: React.FC<StandaloneHudWidgetProps> = ({
  widgetKey,
  config,
  masterVisible,
  scale = 1,
  forceCalloutVisible = false,
  showGhostTarget = false,
  interactive = false,
  onDragCallout,
}) => {
  const stage = STANDALONE_HUD_STAGES[widgetKey];
  const scaledW = Math.round(stage.width * scale);
  const scaledH = Math.round(stage.height * scale);

  return (
    <div
      className="relative select-none shrink-0 overflow-visible"
      style={{ width: scaledW, height: scaledH }}
    >
      <div
        className="absolute left-0 top-0 overflow-visible"
        style={{
          width: stage.width,
          height: stage.height,
          transform: scale !== 1 ? `scale(${scale})` : undefined,
          transformOrigin: 'top left',
        }}
      >
        {showGhostTarget && (
          <StandaloneGhostTarget
            widgetKey={widgetKey}
            centerX={stage.anchorX}
            centerY={stage.anchorY}
            width={config.widthPx}
            height={stage.shape === 'circle' ? config.widthPx : config.heightPx}
            radius={config.radiusPx}
          />
        )}

        {masterVisible && (
          <SingleHudTarget
            widgetKey={widgetKey}
            shape={stage.shape}
            config={config}
            canvasW={stage.width}
            canvasH={stage.height}
            centerX={stage.anchorX}
            centerY={stage.anchorY}
            forceCalloutVisible={forceCalloutVisible}
            interactive={interactive}
            previewScale={scale}
            onDragCallout={onDragCallout}
          />
        )}
      </div>
    </div>
  );
};

interface WhatnotHudOverlayProps {
  settings: WhatnotHudSettings;
  scale?: number;
  forceCalloutVisible?: boolean;
}

/** Optional combined 9:16 1080x1920 HUD canvas when using /overlay/hud without ?only=... */
export const WhatnotHudOverlay: React.FC<WhatnotHudOverlayProps> = ({
  settings,
  scale = 1,
  forceCalloutVisible = false,
}) => {
  const scaledW = Math.round(CANVAS_W * scale);
  const scaledH = Math.round(CANVAS_H * scale);

  return (
    <div
      className="relative select-none shrink-0 overflow-visible"
      style={{ width: scaledW, height: scaledH }}
    >
      <div
        className="absolute left-0 top-0 overflow-visible"
        style={{
          width: CANVAS_W,
          height: CANVAS_H,
          transform: scale !== 1 ? `scale(${scale})` : undefined,
          transformOrigin: 'top left',
        }}
      >
        {settings.visible && (
          <>
            <SingleHudTarget
              widgetKey="avatar"
              shape="circle"
              config={resolveHudWidget(settings, 'avatar')}
              canvasW={CANVAS_W}
              canvasH={CANVAS_H}
              centerX={Math.round((settings.avatar.xPct / 100) * CANVAS_W)}
              centerY={Math.round((settings.avatar.yPct / 100) * CANVAS_H)}
              forceCalloutVisible={forceCalloutVisible}
            />
            <SingleHudTarget
              widgetKey="giveaway"
              shape="rect"
              config={resolveHudWidget(settings, 'giveaway')}
              canvasW={CANVAS_W}
              canvasH={CANVAS_H}
              centerX={Math.round((settings.giveaway.xPct / 100) * CANVAS_W)}
              centerY={Math.round((settings.giveaway.yPct / 100) * CANVAS_H)}
              forceCalloutVisible={forceCalloutVisible}
            />
            <SingleHudTarget
              widgetKey="shop"
              shape="circle"
              config={resolveHudWidget(settings, 'shop')}
              canvasW={CANVAS_W}
              canvasH={CANVAS_H}
              centerX={Math.round((settings.shop.xPct / 100) * CANVAS_W)}
              centerY={Math.round((settings.shop.yPct / 100) * CANVAS_H)}
              forceCalloutVisible={forceCalloutVisible}
            />
          </>
        )}
      </div>
    </div>
  );
};
