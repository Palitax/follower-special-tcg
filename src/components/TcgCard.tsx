'use client';

import React, { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { TcgCardData } from '../types/card';
import { sound } from '../utils/sound';
import {
  RotateCcw,
  Minus,
  Plus,
  Trash2,
} from 'lucide-react';

interface TcgCardProps {
  card: TcgCardData;
  cardIndex: number;
  totalCards: number;
  isFullscreen?: boolean;
  onFlip: (id: string) => void;
  onRotate?: (id: string) => void;
  onDelete?: (id: string) => void;
  onUpdateFrontText: (id: string, text: string) => void;
  onUpdateBackNumber: (id: string, numberValue: number) => void;
}

export const TcgCard: React.FC<TcgCardProps> = ({
  card,
  cardIndex,
  totalCards,
  isFullscreen = false,
  onFlip,
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

  // Inline editing states for Front Text (ausschließlich Text)
  const [isEditingFront, setIsEditingFront] = useState(false);
  const [frontTextValue, setFrontTextValue] = useState(card.front.notes || '');

  // Inline editing states for Back Number (ausschließlich Zahl)
  const [isEditingBackNum, setIsEditingBackNum] = useState(false);
  const backCounter = card.back.counters[0] || { id: 'c1', label: '', value: cardIndex + 1 };
  const [backNumValue, setBackNumValue] = useState<string>(backCounter.value.toString());

  // Dynamic responsive card sizing
  const isMicro = totalCards > 36;
  const isMini = totalCards > 16 && totalCards <= 36;
  const isSmall = totalCards > 8 && totalCards <= 16;
  const isMedium = totalCards > 4 && totalCards <= 8;

  const getWidthClass = () => {
    if (isFullscreen) {
      if (totalCards === 1) return 'w-[360px] sm:w-[440px] md:w-[480px] lg:w-[520px]';
      if (totalCards === 2) return 'w-[320px] sm:w-[380px] md:w-[420px] lg:w-[460px]';
      if (totalCards <= 4) return 'w-[240px] sm:w-[280px] md:w-[320px]';
      if (totalCards <= 8) return 'w-[180px] sm:w-[210px] md:w-[240px]';
      if (totalCards <= 16) return 'w-[135px] sm:w-[155px] md:w-[175px]';
      if (totalCards <= 36) return 'w-[100px] sm:w-[115px] md:w-[130px]';
      return 'w-[80px] sm:w-[90px] md:w-[105px]';
    }
    if (totalCards === 1) return 'w-[320px] sm:w-[380px] md:w-[420px]';
    if (totalCards === 2) return 'w-[280px] sm:w-[320px] md:w-[360px] lg:w-[390px]';
    if (totalCards <= 4) return 'w-[210px] sm:w-[250px] md:w-[280px]';
    if (totalCards <= 8) return 'w-[160px] sm:w-[190px] md:w-[220px]';
    if (totalCards <= 16) return 'w-[125px] sm:w-[145px] md:w-[165px]';
    if (totalCards <= 36) return 'w-[95px] sm:w-[110px] md:w-[125px]';
    return 'w-[75px] sm:w-[85px] md:w-[95px]';
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
    onUpdateFrontText(card.id, frontTextValue);
    sound.playClick(800, 0.05);
  };

  const handleSaveBackNum = () => {
    setIsEditingBackNum(false);
    const parsed = parseInt(backNumValue, 10);
    const finalVal = isNaN(parsed) ? 0 : parsed;
    onUpdateBackNumber(card.id, finalVal);
    sound.playClick(850, 0.05);
  };

  const changeBackNumberDelta = (delta: number) => {
    sound.playCounter(delta > 0);
    const current = parseInt(backNumValue, 10) || 0;
    const next = current + delta;
    setBackNumValue(next.toString());
    onUpdateBackNumber(card.id, next);
  };

  const cardBgImage = '/images/manacards.jpg';
  const paddedCardNumber = String(cardIndex + 1).padStart(2, '0');
  const paddedTotalCards = String(totalCards).padStart(2, '0');

  return (
    <div className="flex flex-col items-center justify-center p-1 sm:p-1.5 select-none group/card">
      {/* Top Mini Bar (only in normal mode & <= 16 cards) */}
      {!isFullscreen && !isMicro && !isMini && (
        <div className={`w-full ${getWidthClass()} flex items-center justify-between px-1 mb-1.5`}>
          <div className="flex items-center gap-1 bg-black/70 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-cyan-500/30 text-[10px] font-bold text-cyan-200">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span>#{cardIndex + 1} {card.isFlipped ? '(Zahl)' : '(Text)'}</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                sound.playCardFlip();
                onFlip(card.id);
              }}
              title="Karte umdrehen"
              className="p-1 rounded-full bg-cyan-500/80 hover:bg-cyan-400 text-black font-bold active:scale-95 transition-all text-[10px]"
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
          rotate: isMicro ? [-0.2, 0.2, -0.2] : [-0.3, 0.3, -0.3],
        }}
        transition={{
          duration: 4 + (cardIndex % 4) * 0.5,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: (cardIndex % 10) * 0.2,
        }}
        className={`perspective-container relative touch-manipulation cursor-pointer ${getWidthClass()}`}
        style={{
          aspectRatio: '63 / 88', // Authentic TCG 2.5 x 3.5 in (63 x 88 mm) proportion
          perspective: '1200px',
        }}
        onPointerMove={handlePointerMove}
        onPointerEnter={() => setIsInteracting(true)}
        onPointerLeave={() => {
          setIsInteracting(false);
          setTilt({ x: 0, y: 0, glareX: 50, glareY: 50 });
        }}
        onClick={handleCardClick}
      >
        <div
          ref={cardRef}
          className="w-full h-full relative"
          style={{
            transformStyle: 'preserve-3d',
            transform: isInteracting ? `rotateX(${tilt.x}deg)` : 'none',
            transition: 'transform 0.1s ease-out',
            filter: 'drop-shadow(0 15px 25px rgba(0, 0, 0, 0.85))',
          }}
        >
          {/* ======================================================== */}
          {/* SEITE 1: AUSSCHLIESSLICH TEXT                            */}
          {/* Rotates from 0deg (visible) to 180deg (hidden)           */}
          {/* ======================================================== */}
          <motion.div
            className="absolute inset-0 w-full h-full rounded-[14px] sm:rounded-[18px] md:rounded-[22px] overflow-hidden border-[3px] border-[#2e1d44] shadow-[0_0_20px_rgba(147,51,234,0.3)] bg-[#180e29] flex flex-col justify-between p-2 sm:p-3"
            animate={{
              rotateY: card.isFlipped ? 180 : 0,
            }}
            transition={{
              duration: 0.6,
              ease: [0.23, 1, 0.32, 1],
            }}
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transformStyle: 'preserve-3d',
              zIndex: card.isFlipped ? 0 : 2,
            }}
          >
            {/* ManaCards Background Image (Fully Visible & Vibrant) */}
            <div
              className="absolute inset-0 w-full h-full bg-cover bg-center transition-transform duration-500 pointer-events-none"
              style={{
                backgroundImage: `url(${cardBgImage})`,
                opacity: 1,
                transform: isInteracting ? 'scale(1.02)' : 'scale(1)',
              }}
            />

            {/* Inner TCG Card Border Frame (Pokémon TCG style inner line) */}
            <div className="absolute inset-1.5 sm:inset-2 rounded-[10px] sm:rounded-[14px] border border-cyan-400/30 pointer-events-none shadow-[inset_0_0_12px_rgba(6,182,212,0.15)]" />

            {/* Holo Light Glare */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `radial-gradient(circle at ${tilt.glareX}% ${tilt.glareY}%, rgba(147, 197, 253, ${
                  isInteracting ? '0.35' : '0.08'
                }) 0%, transparent 60%)`,
              }}
            />

            {/* Top Bar of Front Side: Clean Card Number badge */}
            <div className="relative z-10 flex items-center justify-between px-1">
              <span className="text-[9px] sm:text-[11px] font-black tracking-wider uppercase text-cyan-300 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-full border border-cyan-400/40">
                #{cardIndex + 1}
              </span>
            </div>

            {/* Center Area: Text Plate (TCG Attack/Description Style) */}
            <div className="relative z-10 w-full my-auto px-1 flex flex-col items-center justify-center">
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditingFront(true);
                  sound.playClick(600);
                }}
                className={`w-full max-w-[94%] rounded-xl transition-all cursor-text flex flex-col items-center justify-center ${
                  isEditingFront
                    ? 'border-2 border-cyan-400 bg-black/95 shadow-2xl ring-2 ring-cyan-400/40 p-2.5'
                    : isFullscreen
                    ? 'bg-black/60 hover:bg-black/75 shadow-xl p-2.5 sm:p-3 backdrop-blur-sm border border-cyan-400/30'
                    : 'border-2 border-dashed border-cyan-400/50 hover:border-cyan-300 bg-black/65 hover:bg-black/80 shadow-lg p-2 sm:p-2.5 backdrop-blur-sm'
                }`}
                title="Klicke hier, um den Text einzugeben"
              >
                {isEditingFront ? (
                  <div className="space-y-1.5 w-full">
                    <textarea
                      rows={3}
                      autoFocus
                      value={frontTextValue}
                      onChange={(e) => setFrontTextValue(e.target.value)}
                      placeholder="Text hier eingeben..."
                      className="w-full px-2 py-1 bg-white/10 border border-cyan-400/60 rounded text-xs sm:text-sm text-cyan-200 focus:outline-none resize-none font-medium text-center"
                    />
                    <div className="flex justify-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSaveFront();
                        }}
                        className="px-3 py-1 bg-cyan-400 hover:bg-cyan-300 text-black font-extrabold rounded-lg text-xs active:scale-95"
                      >
                        Speichern
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center w-full">
                    <p className={`font-bold text-cyan-100 drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] leading-snug break-words ${
                      isMicro
                        ? 'text-[8px]'
                        : isMini
                        ? 'text-[10px]'
                        : isSmall
                        ? 'text-xs'
                        : isMedium
                        ? 'text-sm sm:text-base'
                        : 'text-base sm:text-lg'
                    }`}>
                      {frontTextValue || (
                        <span className="text-cyan-300/70 font-normal italic text-xs">
                          {isMicro || isMini ? 'Text' : 'Text hier eingeben...'}
                        </span>
                      )}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom TCG Collector Bar */}
            <div className="relative z-10 flex items-center justify-between px-1 text-[8px] sm:text-[9px] text-cyan-300/80 font-mono font-bold drop-shadow">
              <span>{paddedCardNumber}/{paddedTotalCards}</span>
              <span>★ TCG</span>
            </div>
          </motion.div>

          {/* ======================================================== */}
          {/* SEITE 2: AUSSCHLIESSLICH GROSSE ZAHL                     */}
          {/* Rotates from -180deg (hidden) to 0deg (visible & upright)*/}
          {/* ======================================================== */}
          <motion.div
            className="absolute inset-0 w-full h-full rounded-[14px] sm:rounded-[18px] md:rounded-[22px] overflow-hidden border-[3px] border-[#2e1d44] shadow-[0_0_20px_rgba(147,51,234,0.3)] bg-[#180e29] flex flex-col justify-between p-2 sm:p-3"
            animate={{
              rotateY: card.isFlipped ? 0 : -180,
            }}
            transition={{
              duration: 0.6,
              ease: [0.23, 1, 0.32, 1],
            }}
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transformStyle: 'preserve-3d',
              zIndex: card.isFlipped ? 2 : 0,
            }}
          >
            {/* ManaCards Background Image (Fully Visible & Vibrant) */}
            <div
              className="absolute inset-0 w-full h-full bg-cover bg-center transition-transform duration-500 pointer-events-none"
              style={{
                backgroundImage: `url(${cardBgImage})`,
                opacity: 1,
                transform: isInteracting ? 'scale(1.02)' : 'scale(1)',
              }}
            />

            {/* Inner TCG Card Border Frame (Pokémon TCG style inner line) */}
            <div className="absolute inset-1.5 sm:inset-2 rounded-[10px] sm:rounded-[14px] border border-cyan-400/30 pointer-events-none shadow-[inset_0_0_12px_rgba(6,182,212,0.15)]" />

            {/* Holo Light Glare */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `radial-gradient(circle at ${tilt.glareX}% ${tilt.glareY}%, rgba(147, 197, 253, ${
                  isInteracting ? '0.35' : '0.08'
                }) 0%, transparent 60%)`,
              }}
            />

            {/* Top Bar on Flipped Card: Small Card Number Badge */}
            <div className="relative z-10 flex items-center justify-between px-1">
              <span className="text-[9px] sm:text-[11px] font-black tracking-wider uppercase text-cyan-300 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-full border border-cyan-400/40">
                #{cardIndex + 1}
              </span>
            </div>

            {/* Center Area: Big Prominent Number (NO DASHED BOX IN FULLSCREEN) */}
            <div className="relative z-10 w-full my-auto px-1 flex flex-col items-center justify-center">
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditingBackNum(true);
                  sound.playClick(600);
                }}
                className={`w-full max-w-[90%] rounded-2xl transition-all cursor-text flex flex-col items-center justify-center ${
                  isEditingBackNum
                    ? 'border-2 border-cyan-400 bg-black/95 shadow-2xl ring-2 ring-cyan-400/40 p-2.5'
                    : isFullscreen
                    ? 'bg-transparent p-1' /* NO LINED / DASHED BOX IN FULLSCREEN */
                    : 'border-2 border-dashed border-cyan-400/40 hover:border-cyan-300 bg-black/50 hover:bg-black/70 shadow-lg p-2 sm:p-2.5 backdrop-blur-sm'
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
                      className="w-24 px-1 py-0.5 text-center bg-black border border-cyan-400 rounded text-xl sm:text-2xl font-black text-cyan-300 focus:outline-none"
                    />
                    <div className="flex justify-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSaveBackNum();
                        }}
                        className="px-3 py-1 bg-cyan-400 hover:bg-cyan-300 text-black font-extrabold rounded-lg text-xs active:scale-95"
                      >
                        Speichern
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center space-y-1 text-center">
                    {/* Exclusively Large Floating Glowing Number */}
                    <span className={`font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-cyan-200 to-cyan-400 drop-shadow-[0_0_30px_rgba(6,182,212,0.9)] tracking-tight ${
                      isMicro
                        ? 'text-2xl'
                        : isMini
                        ? 'text-3xl sm:text-4xl'
                        : isSmall
                        ? 'text-4xl sm:text-5xl'
                        : isMedium
                        ? 'text-5xl sm:text-6xl'
                        : 'text-6xl sm:text-7xl md:text-8xl'
                    }`}>
                      {backNumValue || '0'}
                    </span>

                    {/* Stepper Buttons (when not in fullscreen and <= 16 cards) */}
                    {!isFullscreen && !isMicro && !isMini && (
                      <div className="flex items-center gap-1.5 pt-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => changeBackNumberDelta(-1)}
                          className="w-6 h-6 rounded bg-white/10 hover:bg-rose-500/80 text-white flex items-center justify-center font-bold text-xs active:scale-90"
                          title="-1"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => changeBackNumberDelta(1)}
                          className="w-6 h-6 rounded bg-white/10 hover:bg-emerald-500/80 text-white flex items-center justify-center font-bold text-xs active:scale-90"
                          title="+1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom TCG Collector Bar */}
            <div className="relative z-10 flex items-center justify-between px-1 text-[8px] sm:text-[9px] text-cyan-300/80 font-mono font-bold drop-shadow">
              <span>{paddedCardNumber}/{paddedTotalCards}</span>
              <span>★ TCG</span>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};
