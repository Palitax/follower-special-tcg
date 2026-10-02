'use client';

import React, { useState } from 'react';
import { Sparkles, HelpCircle, Tablet, X, Flame } from 'lucide-react';
import { sound } from '../utils/sound';

export const Header: React.FC = () => {
  const [showIpadGuide, setShowIpadGuide] = useState(false);

  return (
    <header className="relative z-30 w-full px-4 pt-3 pb-2 flex items-center justify-between pointer-events-none">
      {/* Title / Logo */}
      <div className="pointer-events-auto flex items-center gap-2.5 bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 shadow-lg">
        <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-yellow-500 to-amber-400 flex items-center justify-center text-black font-black text-xs shadow-md">
          <Flame className="w-3.5 h-3.5 fill-black" />
        </div>
        <div>
          <h1 className="text-xs sm:text-sm font-black tracking-tight text-white flex items-center gap-1.5">
            <span>TCG Dual Arena</span>
            <span className="text-[10px] uppercase font-extrabold px-1.5 py-0.2 bg-yellow-400 text-black rounded">
              iPad Pro
            </span>
          </h1>
        </div>
      </div>

      {/* iPad / Help Guide Button */}
      <div className="pointer-events-auto flex items-center gap-2">
        <button
          onClick={() => {
            sound.playClick(600);
            setShowIpadGuide(true);
          }}
          className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-xs font-semibold text-slate-300 hover:text-yellow-400 hover:border-yellow-400/50 transition-all active:scale-95"
          title="iPad Vollbild-Anleitung"
        >
          <Tablet className="w-3.5 h-3.5 text-yellow-400" />
          <span className="hidden sm:inline">iPad Fullscreen Info</span>
        </button>
      </div>

      {/* iPad Setup Guide Modal */}
      {showIpadGuide && (
        <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-stone-900 border border-white/20 rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Tablet className="w-5 h-5 text-yellow-400" />
                <h3 className="font-bold text-white text-base">iPad Fullscreen Experience</h3>
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
                <p className="font-bold mb-1">💡 So wird die App auf dem iPad zu 100% randlos:</p>
                <ol className="list-decimal list-inside space-y-1 text-slate-200">
                  <li>Öffne diese URL in <strong>Safari auf deinem iPad</strong>.</li>
                  <li>Tippe oben rechts in Safari auf das <strong>Teilen-Symbol (Share)</strong>.</li>
                  <li>Wähle <strong>"Zum Home-Bildschirm" (Add to Home Screen)</strong>.</li>
                  <li>Starte das App-Icon vom Home-Screen – die Adressleiste ist komplett ausgeblendet!</li>
                </ol>
              </div>

              <div className="space-y-1.5">
                <p className="font-semibold text-white">🔥 Touch & Gesten Steuerung:</p>
                <ul className="list-disc list-inside space-y-1 text-slate-400">
                  <li><strong>Tap auf die Karte:</strong> Dreht die Karte mit 3D-Sound um.</li>
                  <li><strong>Finger über die Karte ziehen:</strong> Erzeugt realistischen Holo-Foil Glanz & 3D-Kippeffekt.</li>
                  <li><strong>Zahlen antippen:</strong> Ändere Werte direkt oder nutze die <code className="text-yellow-400">+</code>/<code className="text-yellow-400">-</code> Buttons.</li>
                  <li><strong>Edit Mode (unten links):</strong> Passe Titel, Bilder und Zähler frei an.</li>
                </ul>
              </div>
            </div>

            <button
              onClick={() => setShowIpadGuide(false)}
              className="w-full py-2.5 rounded-xl bg-yellow-400 text-black font-extrabold hover:bg-yellow-300 transition-colors"
            >
              Verstanden!
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
