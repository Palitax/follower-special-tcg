'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { HudWidgetConfig, WhatnotHudSettings } from '../types/broadcastBars';
import { HudCalloutPointer, WowElementalFrame } from './WowElementalFrames';

export type HudWidgetKey = 'shop' | 'giveaway' | 'avatar';

const CANVAS_W = 1080;
const CANVAS_H = 1920;

interface SingleHudTargetProps {
  widgetKey: HudWidgetKey;
  shape: 'circle' | 'rect';
  config: HudWidgetConfig;
  forceCalloutVisible?: boolean;
}

/** Manages one widget's glowing WoW elemental frame + independent interval callout arrow */
const SingleHudTarget: React.FC<SingleHudTargetProps> = ({
  widgetKey,
  shape,
  config,
  forceCalloutVisible = false,
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

  const cx = Math.round((config.xPct / 100) * CANVAS_W);
  const cy = Math.round((config.yPct / 100) * CANVAS_H);
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
        className="pointer-events-none absolute flex items-center justify-center"
        style={{
          left: cx,
          top: cy,
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
            className="pointer-events-none absolute inset-0"
          >
            <HudCalloutPointer
              targetX={cx}
              targetY={cy}
              targetHalfW={w / 2}
              targetHalfH={h / 2}
              offsetX={config.calloutOffsetX}
              offsetY={config.calloutOffsetY}
              text={config.calloutText}
              subtext={config.calloutSubtext}
              style={config.style}
              scalePct={config.calloutScalePct}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

/**
 * Translucent Whatnot 9:16 mobile UI calibration skeleton (Studio preview only, NEVER shown in OBS).
 * Mirrors the exact measured coordinates from the user's live Whatnot screenshot.
 */
const WhatnotGhostReferenceUi: React.FC = () => (
  <div
    aria-hidden="true"
    className="pointer-events-none absolute inset-0 select-none font-wn-sans"
    style={{ opacity: 0.85 }}
  >
    {/* Top Status Bar */}
    <div
      className="absolute inset-x-0 top-0 flex items-center justify-between text-white/60 font-bold"
      style={{ padding: '40px 64px 0', fontSize: 34 }}
    >
      <span>15:18</span>
      <span>64%</span>
    </div>

    {/* Top-Left Avatar & Name (center x=7.8%, y=9.3%) */}
    <div
      className="absolute flex items-center gap-4"
      style={{
        left: `${7.8}%`,
        top: `${9.3}%`,
        transform: 'translate(-44px, -50%)',
      }}
    >
      <div
        className="rounded-full border-2 border-white/40 bg-sky-900/70 flex items-center justify-center overflow-hidden shrink-0"
        style={{ width: 88, height: 88 }}
      >
        <img
          src="/images/logos/mana-bottle.png"
          alt=""
          className="w-full h-full object-cover opacity-90"
        />
      </div>
      <div className="whitespace-nowrap">
        <div className="text-white font-extrabold leading-tight" style={{ fontSize: 32 }}>
          manacards_de
        </div>
        <div className="text-white/70 font-semibold" style={{ fontSize: 24 }}>
          5.0 · &lt;1d
        </div>
      </div>
    </div>

    {/* Top-Right Viewer Count */}
    <div
      className="absolute flex items-center gap-4"
      style={{ right: 36, top: `${9.3}%`, transform: 'translateY(-50%)' }}
    >
      <div
        className="rounded-full bg-black/55 border border-white/20 text-white font-bold flex items-center gap-2"
        style={{ padding: '12px 26px', fontSize: 28 }}
      >
        <span className="w-5 h-5 rounded-full bg-rose-500 inline-block" />
        <span>2</span>
      </div>
      <div
        className="rounded-full bg-black/55 border border-white/20 text-white/80 flex items-center justify-center font-bold"
        style={{ width: 72, height: 72, fontSize: 32 }}
      >
        v
      </div>
    </div>

    {/* Top-Right Giveaway Card (center x=86.4%, y=23.5%, 294x164) */}
    <div
      className="absolute flex flex-col justify-center"
      style={{
        left: `${86.4}%`,
        top: `${23.5}%`,
        width: 294,
        height: 164,
        transform: 'translate(-50%, -50%)',
        borderRadius: '34px 0 0 34px',
        background: 'rgba(26, 36, 62, 0.78)',
        border: '2px solid rgba(255,255,255,0.22)',
        padding: '18px 26px',
      }}
    >
      <div className="text-white font-extrabold" style={{ fontSize: 30 }}>
        Giveaway
      </div>
      <div className="text-white/75 font-semibold mt-1" style={{ fontSize: 22 }}>
        0 Teilnahmen
      </div>
    </div>

    {/* Right Action Rail (Mehr, Clip, Watchlist, Teilen, Wallet) */}
    {[
      { label: 'Mehr', y: 54 },
      { label: 'Clip', y: 60.5 },
      { label: 'Watchlist', y: 67.5 },
      { label: 'Teilen', y: 74 },
      { label: 'Wallet', y: 80.5 },
    ].map((item) => (
      <div
        key={item.label}
        className="absolute flex flex-col items-center text-white/60"
        style={{
          left: `${92.2}%`,
          top: `${item.y}%`,
          transform: 'translate(-50%, -50%)',
        }}
      >
        <div
          className="rounded-full border border-white/25 bg-black/35"
          style={{ width: 64, height: 64 }}
        />
        <span className="font-semibold mt-1" style={{ fontSize: 20 }}>
          {item.label}
        </span>
      </div>
    ))}

    {/* Bottom-Right Shop Circle (center x=92.2%, y=87.5%, 116px) */}
    <div
      className="absolute flex flex-col items-center"
      style={{
        left: `${92.2}%`,
        top: `${87.5}%`,
        transform: 'translate(-50%, -50%)',
      }}
    >
      <div
        className="rounded-full border-2 border-white/45 bg-black/55 flex items-center justify-center text-white font-extrabold"
        style={{ width: 116, height: 116, fontSize: 24 }}
      >
        SHOP
      </div>
    </div>

    {/* Bottom Chat Input Bar */}
    <div
      className="absolute flex items-center gap-4"
      style={{ left: 36, top: `${88.5}%`, transform: 'translateY(-50%)' }}
    >
      <div
        className="rounded-full border border-white/30 bg-black/45 text-white/55 font-medium flex items-center"
        style={{ width: 650, height: 84, paddingLeft: 32, fontSize: 28 }}
      >
        Schreibe etwas ...
      </div>
      <div
        className="rounded-full border border-white/30 bg-black/45 text-amber-300 flex items-center justify-center font-black"
        style={{ width: 112, height: 84, fontSize: 28 }}
      >
        1
      </div>
    </div>
  </div>
);

interface WhatnotHudOverlayProps {
  settings: WhatnotHudSettings;
  /** Optional single-element filter for independent OBS sources (?only=shop|giveaway|avatar) */
  only?: HudWidgetKey | null;
  /** Scale multiplier to fit the 1080x1920 stage cleanly into any viewport or Studio monitor */
  scale?: number;
  /** Keep callout arrows visible in Studio Monitor regardless of rest cooldown */
  forceCalloutVisible?: boolean;
  /** Show translucent Whatnot mobile UI reference skeleton (Studio calibration only!) */
  showWhatnotGhostUi?: boolean;
}

export const WhatnotHudOverlay: React.FC<WhatnotHudOverlayProps> = ({
  settings,
  only = null,
  scale = 1,
  forceCalloutVisible = false,
  showWhatnotGhostUi = false,
}) => {
  const showShop = !only || only === 'shop';
  const showGiveaway = !only || only === 'giveaway';
  const showAvatar = !only || only === 'avatar';

  const scaledW = Math.round(CANVAS_W * scale);
  const scaledH = Math.round(CANVAS_H * scale);

  return (
    <div
      className="relative overflow-hidden select-none shrink-0"
      style={{ width: scaledW, height: scaledH }}
    >
      <div
        className="absolute left-0 top-0"
        style={{
          width: CANVAS_W,
          height: CANVAS_H,
          transform: scale !== 1 ? `scale(${scale})` : undefined,
          transformOrigin: 'top left',
        }}
      >
        {/* Optional Studio-only translucent Whatnot UI calibration skeleton */}
        {showWhatnotGhostUi && <WhatnotGhostReferenceUi />}

        {/* Live Animated WoW Elemental Frames & Callouts */}
        {settings.visible && (
          <>
            {showAvatar && (
              <SingleHudTarget
                widgetKey="avatar"
                shape="circle"
                config={settings.avatar}
                forceCalloutVisible={forceCalloutVisible}
              />
            )}
            {showGiveaway && (
              <SingleHudTarget
                widgetKey="giveaway"
                shape="rect"
                config={settings.giveaway}
                forceCalloutVisible={forceCalloutVisible}
              />
            )}
            {showShop && (
              <SingleHudTarget
                widgetKey="shop"
                shape="circle"
                config={settings.shop}
                forceCalloutVisible={forceCalloutVisible}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};
