'use client';

import React, { useState } from 'react';
import { Tablet, X, PlusCircle, RotateCcw } from 'lucide-react';
import { sound } from '../utils/sound';

interface HeaderProps {
  onNewSetup?: () => void;
  onResetCards?: () => void;
  hasCards?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onNewSetup, onResetCards, hasCards }) => {
  const [showIpadGuide, setShowIpadGuide] = useState(false);

  return (
    <header className="relative z-30 w-full px-4 pt-3 pb-2 flex items-center justify-end pointer-events-none">
      {/* Top Right Discreet Action Buttons (No Logo on Top Left) */}
      <div className="pointer-events-auto flex items-center gap-2">
        {hasCards && (
          <>
            {onNewSetup && (
              <button
                onClick={() => {
                  sound.playClick(600);
                  onNewSetup();
                }}
                className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-xs font-semibold text-slate-300 hover:text-yellow-400 hover:border-yellow-400/50 transition-all active:scale-95"
                title="Kartenanzahl neu einstellen"
              >
                <PlusCircle className="w-3.5 h-3.5 text-yellow-400" />
                <span>Karten Setup</span>
              </button>
            )}

            {onResetCards && (
              <button
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
          onClick={() => {
            sound.playClick(600);
            setShowIpadGuide(true);
          }}
          className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-xs font-semibold text-slate-300 hover:text-yellow-400 hover:border-yellow-400/50 transition-all active:scale-95"
          title="iPad Vollbild-Info"
        >
          <Tablet className="w-3.5 h-3.5 text-yellow-400" />
          <span className="hidden sm:inline">iPad Info</span>
        </button>
      </div>

      {/* iPad Setup Guide Modal */}
      {showIpadGuide && (
        <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-stone-900 border border-white/20 rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Tablet className="w-5 h-5 text-yellow-400" />
                <h3 className="font-bold text-white text-base">iPad Fullscreen Tipps</h3>
              </div>
              <button
                onClick={() => setShowIpadGuide(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-200">
                <p className="font-bold mb-1">💡 Vollbild ohne Adressleiste auf dem iPad:</p>
                <ol className="list-decimal list-inside space-y-1 text-slate-200">
                  <li>In Safari oben rechts auf das <strong>Teilen-Symbol</strong> tippen.</li>
                  <li><strong>"Zum Home-Bildschirm"</strong> auswählen.</li>
                  <li>App über das Icon starten – schon ist alles 100% randlos!</li>
                </ol>
              </div>

              <div className="space-y-1.5">
                <p className="font-semibold text-white">✨ Schnellanleitung:</p>
                <ul className="list-disc list-inside space-y-1 text-slate-400">
                  <li><strong>Vorderseite:</strong> Auf den umstrichelten Bereich klicken für Text.</li>
                  <li><strong>Rückseite:</strong> Karte umdrehen und auf die Zahl klicken zur Eingabe.</li>
                  <li><strong>3D-Glanzeffekt:</strong> Finger über die Karte bewegen.</li>
                </ul>
              </div>
            </div>

            <button
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
