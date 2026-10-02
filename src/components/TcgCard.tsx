'use client';

import React, { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { TcgCardData, CardSideData } from '../types/card';
import { sound } from '../utils/sound';
import {
  RotateCcw,
  Sparkles,
  RotateCw,
  Plus,
  Minus,
  Trash2,
  Type,
  Hash,
} from 'lucide-react';

interface TcgCardProps {
  card: TcgCardData;
  cardIndex: number;
  totalCards: number;
  onFlip: (id: string) => void;
  onRotate: (id: string) => void;
  onDelete?: (id: string) => void;
  onUpdateFrontText: (id: string, text: string, title?: string) => void;
  onUpdateBackNumber: (id: string, numberValue: number, label?: string) => void;
}

export const TcgCard: React.FC<TcgCardProps> = ({
  card,
  cardIndex,
  totalCards,
  onFlip,
  onRotate,
  onDelete,
  onUpdateFrontText,
  onUpdateBackNumber,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState<{ x: number; y: number; glareX: number; glareY: number }>({
    x: 0,
    y: 0,
    glareX: 50,
    glareY: 50,
  });
  const [isInteracting, setIsInteracting] = useState(false);

  // Inline editing states for Front Text
  const [isEditingFront, setIsEditingFront] = useState(false);
  const [frontTextValue, setFrontTextValue] = useState(card.front.notes || card.front.title || '');
  const [frontTitleValue, setFrontTitleValue] = useState(card.front.title || `Karte #${cardIndex + 1}`);

  // Inline editing states for Back Number
  const [isEditingBackNum, setIsEditingBackNum] = useState(false);
  const backCounter = card.back.counters[0] || { id: 'c1', label: 'Zahl', value: cardIndex + 1 };
  const [backNumValue, setBackNumValue] = useState<string>(backCounter.value.toString());
  const [backLabelValue, setBackLabelValue] = useState<string>(backCounter.label || 'Nummer / Wert');

  // 3D Tilt calculation on pointer / touch move
  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -10;
    const rotateY = ((x - centerX) / centerX) * 10;

    const glareX = (x / rect.width) * 100;
    const glareY = (y / rect.height) * 100;

    setTilt({ x: rotateX, y: rotateY, glareX, glareY });
  }, []);

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    // Don't flip if clicking an input, textarea, button or active editor
    if (
      target.closest('button') ||
      target.closest('input') ||
      target.closest('textarea') ||
      isEditingFront ||
      isEditingBackNum
    ) {
      return;
    }

    sound.playCardFlip();
    onFlip(card.id);
  };

  const handleSaveFront = () => {
    setIsEditingFront(false);
    onUpdateFrontText(card.id, frontTextValue, frontTitleValue);
    sound.playClick(800, 0.05);
  };

  const handleSaveBackNum = () => {
    setIsEditingBackNum(false);
    const parsed = parseInt(backNumValue, 10);
    const finalVal = isNaN(parsed) ? 0 : parsed;
    onUpdateBackNumber(card.id, finalVal, backLabelValue);
    sound.playClick(850, 0.05);
  };

  const changeBackNumberDelta = (delta: number) => {
    sound.playCounter(delta > 0);
    const current = parseInt(backNumValue, 10) || 0;
    const next = current + delta;
    setBackNumValue(next.toString());
    onUpdateBackNumber(card.id, next, backLabelValue);
  };

  // Card dynamic sizing based on card count
  const getCardWidthStyle = () => {
    if (totalCards === 1) return 'w-[320px] sm:w-[380px] md:w-[420px]';
    if (totalCards === 2) return 'w-[290px] sm:w-[340px] md:w-[380px] lg:w-[400px]';
    if (totalCards === 3) return 'w-[250px] sm:w-[290px] md:w-[320px] lg:w-[340px]';
    return 'w-[230px] sm:w-[270px] md:w-[290px]';
  };

  return (
    <div className="flex flex-col items-center justify-center p-2 select-none group/card">
      {/* Top Card Controls Bar */}
      <div className={`w-full ${getCardWidthStyle()} flex items-center justify-between px-2 mb-2`}>
        <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-xs font-semibold text-slate-300">
          <span className="w-2 h-2 rounded-full bg-yellow-400" />
          <span>#{cardIndex + 1} {card.isFlipped ? 'Rückseite' : 'Vorderseite'}</span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Rotate 90 deg */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              sound.playClick(500);
              onRotate(card.id);
            }}
            title="Karte drehen (90°)"
            className="p-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-slate-300 hover:text-cyan-400 active:scale-95 transition-all"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>

          {/* Flip Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              sound.playCardFlip();
              onFlip(card.id);
            }}
            title="Karte umdrehen"
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-bold text-xs shadow-md active:scale-95 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Flip</span>
          </button>

          {/* Delete Button (if more than 1 card) */}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                sound.playClick(400);
                onDelete(card.id);
              }}
              title="Karte entfernen"
              className="p-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-slate-400 hover:text-rose-400 active:scale-95 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 3D Perspective Card Container with Idle Floating State */}
      <motion.div
        animate={{
          y: [-4, 4, -4],
          rotate: [-0.4, 0.4, -0.4],
        }}
        transition={{
          duration: 4.5 + (cardIndex % 3) * 0.7,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: cardIndex * 0.4,
        }}
        className={`perspective-container relative touch-manipulation cursor-pointer ${getCardWidthStyle()}`}
        style={{
          aspectRatio: '5 / 7',
        }}
        onPointerMove={handlePointerMove}
        onPointerEnter={() => setIsInteracting(true)}
        onPointerLeave={() => {
          setIsInteracting(false);
          setTilt({ x: 0, y: 0, glareX: 50, glareY: 50 });
        }}
        onClick={handleCardClick}
      >
        <motion.div
          ref={cardRef}
          className="w-full h-full relative preserve-3d rounded-[22px]"
          animate={{
            rotateY: card.isFlipped ? 180 : 0,
            rotateZ: card.rotation,
            rotateX: isInteracting ? tilt.x : 0,
          }}
          transition={{
            rotateY: { duration: 0.6, ease: [0.23, 1, 0.32, 1] },
            rotateZ: { duration: 0.3, ease: 'easeOut' },
            rotateX: { duration: 0.1, ease: 'easeOut' },
          }}
          style={{
            transformStyle: 'preserve-3d',
            filter: 'drop-shadow(0 20px 30px rgba(0, 0, 0, 0.75))',
          }}
        >
          {/* ======================================================== */}
          {/* FRONT FACE: With Dashed Editable Text Area on Hover      */}
          {/* ======================================================== */}
          <div
            className="absolute inset-0 w-full h-full rounded-[20px] overflow-hidden backface-hidden border-2 border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.15)] bg-gradient-to-b from-stone-900 via-neutral-900 to-black flex flex-col justify-between p-4"
            style={{ transform: 'rotateY(0deg)' }}
          >
            {/* Background Texture & Holo Sheen */}
            {card.front.imageUrl && (
              <div
                className="absolute inset-0 w-full h-full bg-cover bg-center opacity-40 transition-transform duration-700 pointer-events-none"
                style={{
                  backgroundImage: `url(${card.front.imageUrl})`,
                  transform: isInteracting ? 'scale(1.05)' : 'scale(1)',
                }}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-black/90 pointer-events-none" />

            {/* Holo Glare / Reflection */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `radial-gradient(circle at ${tilt.glareX}% ${tilt.glareY}%, rgba(255, 255, 255, ${
                  isInteracting ? '0.25' : '0.06'
                }) 0%, transparent 60%)`,
              }}
            />

            {/* Top Bar of Front Face */}
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
                  TCG Card
                </span>
                <Sparkles className="w-3.5 h-3.5 text-yellow-400 animate-pulse" />
              </div>

              <span className="text-[11px] font-bold text-slate-400">
                ★ 1st Edition
              </span>
            </div>

            {/* Middle Section: Dashed Editable Text Area (Hover / Click to Edit) */}
            <div className="relative z-10 my-auto py-2">
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditingFront(true);
                  sound.playClick(600);
                }}
                className={`w-full rounded-2xl border-2 border-dashed transition-all p-3.5 cursor-text group/textarea ${
                  isEditingFront
                    ? 'border-yellow-400 bg-black/90 shadow-2xl ring-2 ring-yellow-400/30'
                    : 'border-white/25 hover:border-yellow-400/80 bg-black/50 hover:bg-black/75 hover:shadow-xl'
                }`}
                title="Klicke hier, um den Kartentext zu bearbeiten"
              >
                {isEditingFront ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      autoFocus
                      value={frontTitleValue}
                      onChange={(e) => setFrontTitleValue(e.target.value)}
                      placeholder="Kartentitel..."
                      className="w-full px-2 py-1 bg-white/10 border border-yellow-400/50 rounded text-sm font-black text-yellow-300 focus:outline-none"
                    />
                    <textarea
                      rows={3}
                      value={frontTextValue}
                      onChange={(e) => setFrontTextValue(e.target.value)}
                      placeholder="Text oder Beschreibung eingeben..."
                      className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-xs text-white focus:outline-none resize-none"
                    />
                    <div className="flex justify-end gap-1.5 pt-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSaveFront();
                        }}
                        className="px-3 py-1 bg-yellow-400 hover:bg-yellow-300 text-black font-bold rounded-lg text-xs transition-all active:scale-95"
                      >
                        Speichern
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5 text-center">
                    <h3 className="font-extrabold text-base sm:text-lg text-yellow-300 drop-shadow line-clamp-1 group-hover/textarea:text-yellow-200">
                      {frontTitleValue || `Karte #${cardIndex + 1}`}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-200 font-medium leading-relaxed drop-shadow italic line-clamp-4">
                      {frontTextValue ? `"${frontTextValue}"` : (
                        <span className="text-slate-400/80 not-italic flex items-center justify-center gap-1 text-xs">
                          <Type className="w-3.5 h-3.5" />
                          <span>Hier klicken für Text...</span>
                        </span>
                      )}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Hint */}
            <div className="relative z-10 text-center">
              <span className="text-[10px] text-slate-400/70 uppercase tracking-widest font-semibold">
                Tippen zum Umdrehen ➔
              </span>
            </div>
          </div>

          {/* ======================================================== */}
          {/* BACK FACE: With Large Floating Number Display            */}
          {/* ======================================================== */}
          <div
            className="absolute inset-0 w-full h-full rounded-[20px] overflow-hidden backface-hidden border-2 border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.15)] bg-gradient-to-b from-slate-950 via-cyan-950/60 to-black flex flex-col justify-between p-4"
            style={{ transform: 'rotateY(180deg)' }}
          >
            {/* Background Texture & Holo Sheen */}
            {card.back.imageUrl && (
              <div
                className="absolute inset-0 w-full h-full bg-cover bg-center opacity-30 transition-transform duration-700 pointer-events-none"
                style={{
                  backgroundImage: `url(${card.back.imageUrl})`,
                  transform: isInteracting ? 'scale(1.05)' : 'scale(1)',
                }}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-black/90 pointer-events-none" />

            {/* Holo Glare */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `radial-gradient(circle at ${tilt.glareX}% ${tilt.glareY}%, rgba(6, 182, 212, ${
                  isInteracting ? '0.3' : '0.08'
                }) 0%, transparent 60%)`,
              }}
            />

            {/* Top Bar of Back Face */}
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Rückseite
                </span>
                <Hash className="w-3.5 h-3.5 text-cyan-400" />
              </div>

              <span className="text-[11px] font-bold text-slate-400">
                Value Tracker
              </span>
            </div>

            {/* Middle Section: Big Floating Number Display (Editable) */}
            <div className="relative z-10 my-auto py-2 flex flex-col items-center justify-center">
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditingBackNum(true);
                  sound.playClick(600);
                }}
                className={`w-full rounded-2xl border-2 border-dashed transition-all p-4 cursor-text group/numarea flex flex-col items-center justify-center ${
                  isEditingBackNum
                    ? 'border-cyan-400 bg-black/90 shadow-2xl ring-2 ring-cyan-400/30'
                    : 'border-white/25 hover:border-cyan-400/80 bg-black/50 hover:bg-black/75 hover:shadow-xl'
                }`}
                title="Klicke hier, um die Zahl einzugeben"
              >
                {isEditingBackNum ? (
                  <div className="space-y-2.5 w-full flex flex-col items-center">
                    <input
                      type="text"
                      value={backLabelValue}
                      onChange={(e) => setBackLabelValue(e.target.value)}
                      placeholder="Label (z.B. Punkte, HP, Rang)..."
                      className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-center text-xs text-slate-300 focus:outline-none"
                    />
                    <input
                      type="number"
                      autoFocus
                      value={backNumValue}
                      onChange={(e) => setBackNumValue(e.target.value)}
                      placeholder="0"
                      className="w-32 px-2 py-1 text-center bg-black border-2 border-cyan-400 rounded-xl text-3xl font-black text-cyan-300 focus:outline-none"
                    />
                    <div className="flex justify-center gap-1.5 pt-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSaveBackNum();
                        }}
                        className="px-4 py-1.5 bg-cyan-400 hover:bg-cyan-300 text-black font-extrabold rounded-lg text-xs transition-all active:scale-95"
                      >
                        Speichern
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center space-y-1 text-center">
                    <span className="text-xs uppercase font-extrabold tracking-wider text-cyan-400/90 drop-shadow">
                      {backLabelValue || 'Zahl / Wert'}
                    </span>

                    {/* Prominent Large Floating Number */}
                    <div className="py-1">
                      <span className="font-black text-5xl sm:text-6xl text-transparent bg-clip-text bg-gradient-to-b from-white via-cyan-200 to-cyan-400 drop-shadow-[0_0_25px_rgba(6,182,212,0.6)]">
                        {backNumValue || '0'}
                      </span>
                    </div>

                    {/* Quick + / - Stepper Buttons */}
                    <div className="flex items-center gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => changeBackNumberDelta(-1)}
                        className="w-8 h-8 rounded-lg bg-white/10 hover:bg-rose-500/80 text-white flex items-center justify-center font-bold active:scale-90 transition-all"
                        title="-1"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => changeBackNumberDelta(1)}
                        className="w-8 h-8 rounded-lg bg-white/10 hover:bg-emerald-500/80 text-white flex items-center justify-center font-bold active:scale-90 transition-all"
                        title="+1"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Hint */}
            <div className="relative z-10 text-center">
              <span className="text-[10px] text-slate-400/70 uppercase tracking-widest font-semibold">
                Tippen zum Umdrehen ➔
              </span>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Card Footer Status */}
      <div className="mt-2 text-center text-[11px] text-slate-400/80 font-medium">
        <span>👆 Tippen zum Umdrehen</span>
      </div>
    </div>
  );
};
