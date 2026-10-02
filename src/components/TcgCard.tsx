'use client';

import React, { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { TcgCardData } from '../types/card';
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
  const [frontTextValue, setFrontTextValue] = useState(card.front.notes || '');
  const [frontTitleValue, setFrontTitleValue] = useState(card.front.title || `Karte #${cardIndex + 1}`);

  // Inline editing states for Back Number
  const [isEditingBackNum, setIsEditingBackNum] = useState(false);
  const backCounter = card.back.counters[0] || { id: 'c1', label: 'Zahl', value: cardIndex + 1 };
  const [backNumValue, setBackNumValue] = useState<string>(backCounter.value.toString());
  const [backLabelValue, setBackLabelValue] = useState<string>(backCounter.label || 'Wert');

  // Determine size tier based on total cards
  const isMicro = totalCards > 36;
  const isMini = totalCards > 16 && totalCards <= 36;
  const isSmall = totalCards > 8 && totalCards <= 16;
  const isMedium = totalCards > 4 && totalCards <= 8;
  const isLarge = totalCards <= 4;

  const getWidthClass = () => {
    if (totalCards === 1) return 'w-[320px] sm:w-[380px] md:w-[420px]';
    if (totalCards === 2) return 'w-[280px] sm:w-[320px] md:w-[360px] lg:w-[390px]';
    if (totalCards <= 4) return 'w-[210px] sm:w-[250px] md:w-[280px]';
    if (totalCards <= 8) return 'w-[160px] sm:w-[190px] md:w-[220px]';
    if (totalCards <= 16) return 'w-[125px] sm:w-[145px] md:w-[165px]';
    if (totalCards <= 36) return 'w-[95px] sm:w-[110px] md:w-[125px]';
    return 'w-[75px] sm:w-[85px] md:w-[95px]'; // 37 to 100 cards
  };

  // 3D Tilt calculation
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

  return (
    <div className="flex flex-col items-center justify-center p-1 sm:p-1.5 select-none group/card">
      {/* Top Mini Controls Bar (only shown when cards <= 16 for clean layout) */}
      {!isMicro && !isMini && (
        <div className={`w-full ${getWidthClass()} flex items-center justify-between px-1 mb-1.5`}>
          <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10 text-[10px] font-semibold text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
            <span>#{cardIndex + 1}</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                sound.playCardFlip();
                onFlip(card.id);
              }}
              title="Umdrehen"
              className="p-1 rounded-full bg-amber-500/80 hover:bg-amber-400 text-black font-bold active:scale-95 transition-all text-[10px]"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  sound.playClick(400);
                  onDelete(card.id);
                }}
                title="Löschen"
                className="p-1 rounded-full bg-black/60 text-slate-400 hover:text-rose-400 active:scale-95 transition-all"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* 3D Perspective Card Container with Idle Floating State */}
      <motion.div
        animate={{
          y: isMicro ? [-2, 2, -2] : [-4, 4, -4],
          rotate: isMicro ? [-0.2, 0.2, -0.2] : [-0.4, 0.4, -0.4],
        }}
        transition={{
          duration: 4 + (cardIndex % 4) * 0.5,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: (cardIndex % 10) * 0.2,
        }}
        className={`perspective-container relative touch-manipulation cursor-pointer ${getWidthClass()}`}
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
          className="w-full h-full relative preserve-3d rounded-[14px] sm:rounded-[18px] md:rounded-[22px]"
          animate={{
            rotateY: card.isFlipped ? 180 : 0,
            rotateZ: card.rotation,
            rotateX: isInteracting ? tilt.x : 0,
          }}
          transition={{
            rotateY: { duration: 0.55, ease: [0.23, 1, 0.32, 1] },
            rotateZ: { duration: 0.3, ease: 'easeOut' },
            rotateX: { duration: 0.1, ease: 'easeOut' },
          }}
          style={{
            transformStyle: 'preserve-3d',
            filter: 'drop-shadow(0 12px 20px rgba(0, 0, 0, 0.6))',
          }}
        >
          {/* ======================================================== */}
          {/* FRONT FACE                                               */}
          {/* ======================================================== */}
          <div
            className={`absolute inset-0 w-full h-full rounded-[12px] sm:rounded-[16px] md:rounded-[20px] overflow-hidden backface-hidden border border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.15)] bg-gradient-to-b from-stone-900 via-neutral-900 to-black flex flex-col justify-between ${
              isMicro ? 'p-1.5' : isMini ? 'p-2' : isSmall ? 'p-2.5' : 'p-3.5'
            }`}
            style={{ transform: 'rotateY(0deg)' }}
          >
            {/* Background Texture */}
            {card.front.imageUrl && (
              <div
                className="absolute inset-0 w-full h-full bg-cover bg-center opacity-35 transition-transform duration-700 pointer-events-none"
                style={{
                  backgroundImage: `url(${card.front.imageUrl})`,
                  transform: isInteracting ? 'scale(1.05)' : 'scale(1)',
                }}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-black/90 pointer-events-none" />

            {/* Holo Glare */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `radial-gradient(circle at ${tilt.glareX}% ${tilt.glareY}%, rgba(255, 255, 255, ${
                  isInteracting ? '0.25' : '0.05'
                }) 0%, transparent 60%)`,
              }}
            />

            {/* Top Bar */}
            <div className="relative z-10 flex items-center justify-between">
              <span className={`font-black uppercase rounded bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 ${
                isMicro ? 'text-[7px] px-1' : isMini ? 'text-[8px] px-1' : 'text-[10px] px-2 py-0.5'
              }`}>
                #{cardIndex + 1}
              </span>
              {!isMicro && (
                <Sparkles className={`text-yellow-400 animate-pulse ${isMini ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5'}`} />
              )}
            </div>

            {/* Dashed Text Area on Hover */}
            <div className="relative z-10 my-auto py-1">
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditingFront(true);
                  sound.playClick(600);
                }}
                className={`w-full rounded-xl border-2 border-dashed transition-all cursor-text ${
                  isEditingFront
                    ? 'border-yellow-400 bg-black/95 shadow-xl ring-1 ring-yellow-400/40 p-2'
                    : 'border-white/25 hover:border-yellow-400/80 bg-black/50 hover:bg-black/75 p-1.5 sm:p-2'
                }`}
                title="Klicke hier, um den Kartentext zu bearbeiten"
              >
                {isEditingFront ? (
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      autoFocus
                      value={frontTitleValue}
                      onChange={(e) => setFrontTitleValue(e.target.value)}
                      placeholder="Titel..."
                      className="w-full px-1.5 py-0.5 bg-white/10 border border-yellow-400/50 rounded text-xs font-black text-yellow-300 focus:outline-none"
                    />
                    {!isMicro && !isMini && (
                      <textarea
                        rows={2}
                        value={frontTextValue}
                        onChange={(e) => setFrontTextValue(e.target.value)}
                        placeholder="Text..."
                        className="w-full px-1.5 py-0.5 bg-white/10 border border-white/20 rounded text-[11px] text-white focus:outline-none resize-none"
                      />
                    )}
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSaveFront();
                        }}
                        className="px-2 py-0.5 bg-yellow-400 hover:bg-yellow-300 text-black font-bold rounded text-[10px]"
                      >
                        OK
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center space-y-0.5">
                    <h3 className={`font-extrabold text-yellow-300 drop-shadow line-clamp-1 ${
                      isMicro ? 'text-[9px]' : isMini ? 'text-[11px]' : isSmall ? 'text-xs' : 'text-sm sm:text-base'
                    }`}>
                      {frontTitleValue || `Karte #${cardIndex + 1}`}
                    </h3>
                    {!isMicro && (
                      <p className={`text-slate-200 font-medium leading-tight drop-shadow italic line-clamp-2 ${
                        isMini ? 'text-[9px]' : isSmall ? 'text-[10px]' : 'text-xs'
                      }`}>
                        {frontTextValue ? `"${frontTextValue}"` : (
                          <span className="text-slate-400 not-italic">Text bearbeiten...</span>
                        )}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Hint */}
            <div className="relative z-10 text-center">
              <span className={`text-slate-400/70 uppercase tracking-widest font-semibold ${
                isMicro ? 'text-[6px]' : isMini ? 'text-[8px]' : 'text-[10px]'
              }`}>
                Flip ➔
              </span>
            </div>
          </div>

          {/* ======================================================== */}
          {/* BACK FACE                                                */}
          {/* ======================================================== */}
          <div
            className={`absolute inset-0 w-full h-full rounded-[12px] sm:rounded-[16px] md:rounded-[20px] overflow-hidden backface-hidden border border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.15)] bg-gradient-to-b from-slate-950 via-cyan-950/60 to-black flex flex-col justify-between ${
              isMicro ? 'p-1.5' : isMini ? 'p-2' : isSmall ? 'p-2.5' : 'p-3.5'
            }`}
            style={{ transform: 'rotateY(180deg)' }}
          >
            {/* Background Texture */}
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

            {/* Top Bar */}
            <div className="relative z-10 flex items-center justify-between">
              <span className={`font-black uppercase rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 ${
                isMicro ? 'text-[7px] px-1' : isMini ? 'text-[8px] px-1' : 'text-[10px] px-2 py-0.5'
              }`}>
                Wert
              </span>
              {!isMicro && <Hash className={`text-cyan-400 ${isMini ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5'}`} />}
            </div>

            {/* Big Floating Number Area */}
            <div className="relative z-10 my-auto py-1 flex flex-col items-center justify-center">
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditingBackNum(true);
                  sound.playClick(600);
                }}
                className={`w-full rounded-xl border-2 border-dashed transition-all cursor-text flex flex-col items-center justify-center ${
                  isEditingBackNum
                    ? 'border-cyan-400 bg-black/95 shadow-xl ring-1 ring-cyan-400/40 p-2'
                    : 'border-white/25 hover:border-cyan-400/80 bg-black/50 hover:bg-black/75 p-1.5 sm:p-2'
                }`}
                title="Klicke hier, um die Zahl einzugeben"
              >
                {isEditingBackNum ? (
                  <div className="space-y-1.5 w-full flex flex-col items-center">
                    <input
                      type="number"
                      autoFocus
                      value={backNumValue}
                      onChange={(e) => setBackNumValue(e.target.value)}
                      placeholder="0"
                      className="w-20 px-1 py-0.5 text-center bg-black border border-cyan-400 rounded text-base sm:text-xl font-black text-cyan-300 focus:outline-none"
                    />
                    <div className="flex justify-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSaveBackNum();
                        }}
                        className="px-2 py-0.5 bg-cyan-400 hover:bg-cyan-300 text-black font-extrabold rounded text-[10px]"
                      >
                        OK
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center space-y-0.5 text-center">
                    {!isMicro && (
                      <span className={`uppercase font-extrabold text-cyan-400/90 drop-shadow ${
                        isMini ? 'text-[8px]' : 'text-[10px]'
                      }`}>
                        {backLabelValue || 'Wert'}
                      </span>
                    )}

                    {/* Large Floating Number */}
                    <span className={`font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-cyan-200 to-cyan-400 drop-shadow-[0_0_15px_rgba(6,182,212,0.6)] ${
                      isMicro
                        ? 'text-lg sm:text-xl'
                        : isMini
                        ? 'text-2xl sm:text-3xl'
                        : isSmall
                        ? 'text-3xl sm:text-4xl'
                        : 'text-4xl sm:text-5xl md:text-6xl'
                    }`}>
                      {backNumValue || '0'}
                    </span>

                    {/* Stepper Buttons (when cards <= 16) */}
                    {!isMicro && !isMini && (
                      <div className="flex items-center gap-1 pt-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => changeBackNumberDelta(-1)}
                          className="w-5 h-5 sm:w-6 sm:h-6 rounded bg-white/10 hover:bg-rose-500/80 text-white flex items-center justify-center font-bold text-xs active:scale-90"
                          title="-1"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => changeBackNumberDelta(1)}
                          className="w-5 h-5 sm:w-6 sm:h-6 rounded bg-white/10 hover:bg-emerald-500/80 text-white flex items-center justify-center font-bold text-xs active:scale-90"
                          title="+1"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Hint */}
            <div className="relative z-10 text-center">
              <span className={`text-slate-400/70 uppercase tracking-widest font-semibold ${
                isMicro ? 'text-[6px]' : isMini ? 'text-[8px]' : 'text-[10px]'
              }`}>
                Flip ➔
              </span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};
