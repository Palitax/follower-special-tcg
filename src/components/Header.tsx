'use client';

import React, { useState } from 'react';
import { Tablet, X, PlusCircle, RotateCcw, LogOut, Radio, RefreshCw } from 'lucide-react';
import { sound } from '../utils/sound';
import { SyncStatus } from '../lib/liveSync';

interface HeaderProps {
  onNewSetup?: () => void;
  onResetCards?: () => void;
  hasCards?: boolean;
  isVerticalMode?: boolean;
  syncStatus?: SyncStatus;
  connectedDevices?: number;
  onForceSync?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onNewSetup,
  onResetCards,
  hasCards,
  isVerticalMode = false,
  syncStatus = 'connecting',
  connectedDevices = 1,
  onForceSync,
}) => {
  const [showIpadGuide, setShowIpadGuide] = useState(false);
  const [showSyncInfo, setShowSyncInfo] = useState(false);

  const isMultiDevice = connectedDevices >= 2;

  return (
    <header
      className={`relative z-30 w-full shrink-0 flex items-center justify-between gap-2 pointer-events-none ${
        isVerticalMode ? 'px-2.5 pt-2 pb-1' : 'px-4 pt-2.5 pb-1.5'
      }`}
    >
      {/* Top Left: Discreet Live-Sync Status Pill */}
      <div className="pointer-events-auto relative">
        <button
          type="button"
          onClick={() => {
            sound.playClick(620);
            setShowSyncInfo((v) => !v);
          }}
          className={`flex items-center gap-1.5 backdrop-blur-md px-2.5 py-1 rounded-full border text-[11px] font-bold transition-all active:scale-95 ${
            isMultiDevice
              ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
              : syncStatus === 'live'
              ? 'bg-black/60 border-white/15 text-slate-300 hover:border-emerald-400/40 hover:text-emerald-200'
              : 'bg-black/60 border-white/10 text-slate-400 hover:text-white'
          }`}
          title="Live-Sync Status (automatische Synchronisation über mehrere Fenster & PCs)"
        >
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              isMultiDevice
                ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]'
                : syncStatus === 'live'
                ? 'bg-emerald-400'
                : syncStatus === 'local'
                ? 'bg-cyan-400'
                : 'bg-amber-400 animate-pulse'
            }`}
          />
          <Radio className="w-3 h-3 shrink-0" />
          <span>
            {isMultiDevice
              ? `Live · ${connectedDevices} aktiv`
              : syncStatus === 'live'
              ? isVerticalMode
                ? 'Live'
                : 'Live-Sync bereit'
              : 'Sync...'}
          </span>
        </button>

        {showSyncInfo && (
          <div className="absolute top-full mt-2 left-0 w-72 bg-stone-900/95 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl p-3.5 space-y-2.5 z-50 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-white flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-emerald-400" />
                Echtzeit Live-Sync
              </span>
              <button
                type="button"
                onClick={() => setShowSyncInfo(false)}
                className="text-slate-400 hover:text-white p-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              Öffne diese Seite einfach in einem <strong>zweiten Fenster</strong> oder auf einem{' '}
              <strong>anderen PC / iPad</strong> (mit demselben Login). Alle Karten-Flips,{' '}
              <strong>X-Markierungen</strong>, Bilder und Level-Ups werden sofort live übertragen.
            </p>
            <div className="flex items-center justify-between pt-1 border-t border-white/10 text-[11px]">
              <span className="text-slate-400">
                Verbundene Ansichten: <strong className="text-emerald-300">{connectedDevices}</strong>
              </span>
              {onForceSync && (
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick(700);
                    onForceSync();
                    setShowSyncInfo(false);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-200 font-bold active:scale-95 transition-all"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Jetzt pushen</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Top Right: Discreet Action Buttons */}
      <div className="pointer-events-auto flex items-center gap-1.5">
        {hasCards && (
          <>
            {onNewSetup && (
              <button
                type="button"
                onClick={() => {
                  sound.playClick(600);
                  onNewSetup();
                }}
                className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 text-xs font-semibold text-slate-300 hover:text-yellow-400 hover:border-yellow-400/50 transition-all active:scale-95"
                title="Kartenanzahl neu einstellen"
              >
                <PlusCircle className="w-3.5 h-3.5 text-yellow-400" />
                <span>{isVerticalMode ? 'Setup' : 'Karten Setup'}</span>
              </button>
            )}

            {onResetCards && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Möchtest du alle Karten leeren und zurück zum Home-Screen?')) {
                    sound.playClick(500);
                    onResetCards();
                  }
                }}
                className="p-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-slate-400 hover:text-rose-400 active:scale-95 transition-all"
                title="Alle Karten zurücksetzen"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </>
        )}

        <button
          type="button"
          onClick={() => {
            sound.playClick(600);
            setShowIpadGuide(true);
          }}
          className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 text-xs font-semibold text-slate-300 hover:text-yellow-400 hover:border-yellow-400/50 transition-all active:scale-95"
          title="Info & Steuerung"
        >
          <Tablet className="w-3.5 h-3.5 text-yellow-400" />
          {!isVerticalMode && <span className="hidden sm:inline">Info</span>}
        </button>

        <button
          type="button"
          onClick={async () => {
            sound.playClick(450);
            try {
              await fetch('/api/logout', { method: 'POST' });
            } finally {
              window.location.replace('/login');
            }
          }}
          className="p-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-slate-400 hover:text-rose-400 hover:border-rose-400/40 active:scale-95 transition-all"
          title="Abmelden"
          aria-label="Abmelden"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Info & iPad Setup Guide Modal */}
      {showIpadGuide && (
        <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-stone-900 border border-white/20 rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Tablet className="w-5 h-5 text-yellow-400" />
                <h3 className="font-bold text-white text-base">Steuerung & Stream Tipps</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowIpadGuide(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-200">
                <p className="font-bold mb-1">Vollbild ohne Adressleiste auf dem iPad:</p>
                <ol className="list-decimal list-inside space-y-1 text-slate-200">
                  <li>In Safari oben rechts auf das <strong>Teilen-Symbol</strong> tippen.</li>
                  <li><strong>&quot;Zum Home-Bildschirm&quot;</strong> auswählen.</li>
                  <li>App über das Icon starten – komplett randlos!</li>
                </ol>
              </div>

              <div className="space-y-1.5">
                <p className="font-semibold text-white">Schnellanleitung:</p>
                <ul className="list-disc list-inside space-y-1 text-slate-400">
                  <li><strong>Karte umdrehen:</strong> Einfach auf die Karte klicken.</li>
                  <li><strong>Als weg markieren (X):</strong> Oben rechts auf das <strong>X</strong> der Karte klicken oder <strong>Rechtsklick</strong> auf eine Karte.</li>
                  <li><strong>2 PCs / 2 Fenster:</strong> Automatischer Echtzeit-Sync auf allen eingeloggten Geräten.</li>
                  <li><strong>Gewinn-Bild & Text:</strong> Bild per Drag & Drop oder Icon oben links auf die Karte ziehen.</li>
                </ul>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIpadGuide(false)}
              className="w-full py-2.5 rounded-xl bg-yellow-400 text-black font-extrabold hover:bg-yellow-300 transition-colors"
            >
              Schließen
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
