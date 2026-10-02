'use client';

import React, { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { TcgCardData, CardSideData, CardCounter } from '../types/card';
import { sound } from '../utils/sound';
import {
  RotateCcw,
  Sparkles,
  Edit3,
  Plus,
  Minus,
  RotateCw,
  Eye,
  Layers,
} from 'lucide-react';

interface TcgCardProps {
  card: TcgCardData;
  cardIndex: number; // 0 or 1
  isEditMode: boolean;
  onFlip: (id: string) => void;
  onRotate: (id: string) => void;
  onEdit: (card: TcgCardData, side: 'front' | 'back') => void;
  onUpdateCounter: (cardId: string, side: 'front' | 'back', counterId: string, delta: number) => void;
  onSetCounterValue: (cardId: string, side: 'front' | 'back', counterId: string, value: number) => void;
}

export const TcgCard: React.FC<TcgCardProps> = ({
  card,
  cardIndex,
  isEditMode,
  onFlip,
  onRotate,
  onEdit,
  onUpdateCounter,
  onSetCounterValue,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState<{ x: number; y: number; glareX: number; glareY: number }>({
    x: 0,
    y: 0,
    glareX: 50,
    glareY: 50,
  });
  const [isInteracting, setIsInteracting] = useState(false);
  const [editingCounterId, setEditingCounterId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');

  // 3D Tilt calculation on pointer / touch move
  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -12; // Max 12 deg tilt
    const rotateY = ((x - centerX) / centerX) * 12;

    const glareX = (x / rect.width) * 100;
    const glareY = (y / rect.height) * 100;

    setTilt({ x: rotateX, y: rotateY, glareX, glareY });
  }, []);

  const handlePointerEnter = () => {
    setIsInteracting(true);
  };

  const handlePointerLeave = () => {
    setIsInteracting(false);
    setTilt({ x: 0, y: 0, glareX: 50, glareY: 50 });
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // If clicking on a button or input inside the card, don't trigger flip
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('textarea')) {
      return;
    }

    // In Play Mode or default: Flip the card
    sound.playCardFlip();
    onFlip(card.id);
  };

  const currentSide: CardSideData = card.isFlipped ? card.back : card.front;
  const currentSideKey: 'front' | 'back' = card.isFlipped ? 'back' : 'front';

  // Get border class
  const getBorderClass = (style: TcgCardData['borderStyle']) => {
    switch (style) {
      case 'gold-border':
        return 'border-gold';
      case 'silver-border':
        return 'border-silver';
      case 'neon-cyan':
        return 'border-neon-cyan';
      case 'neon-magenta':
        return 'border-neon-magenta';
      case 'minimal':
        return 'border-minimal';
      case 'classic-black':
      default:
        return 'border-classic-black';
    }
  };

  // Get Holo Shader Class
  const getHoloClass = (holo: CardSideData['holoEffect']) => {
    switch (holo) {
      case 'rainbow':
        return 'holo-rainbow';
      case 'cosmo':
        return 'holo-cosmo';
      case 'gold':
        return 'holo-gold';
      case 'silver':
        return 'holo-silver';
      case 'galaxy':
        return 'holo-galaxy';
      case 'neon':
        return 'holo-neon';
      default:
        return '';
    }
  };

  const startCounterEdit = (counter: CardCounter, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCounterId(counter.id);
    setEditingValue(counter.value.toString());
  };

  const saveCounterEdit = (counterId: string) => {
    const num = parseInt(editingValue, 10);
    if (!isNaN(num)) {
      onSetCounterValue(card.id, currentSideKey, counterId, num);
      sound.playClick(800, 0.05);
    }
    setEditingCounterId(null);
  };

  return (
    <div className="flex flex-col items-center justify-center p-2 select-none">
      {/* Top Floating Card Action Header */}
      <div className="w-full max-w-[340px] sm:max-w-[380px] md:max-w-[420px] lg:max-w-[440px] flex items-center justify-between px-2 mb-2">
        <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-xs font-semibold text-slate-300">
          <Layers className="w-3.5 h-3.5 text-yellow-400" />
          <span>Karte {cardIndex + 1}: {card.isFlipped ? 'Rückseite' : 'Vorderseite'}</span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Rotate 90 deg button (Tap Card) */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              sound.playClick(500);
              onRotate(card.id);
            }}
            title="Karte um 90° drehen (Tapped State)"
            className={`p-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-slate-300 hover:text-cyan-400 hover:border-cyan-400/50 active:scale-95 transition-all ${
              card.rotation > 0 ? 'text-cyan-400 border-cyan-400/60 bg-cyan-950/40' : ''
            }`}
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {/* Quick Edit Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              sound.playClick(600);
              onEdit(card, currentSideKey);
            }}
            title="Karte bearbeiten"
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-slate-300 hover:text-yellow-400 hover:border-yellow-400/50 active:scale-95 text-xs font-medium transition-all"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button>

          {/* Flip Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              sound.playCardFlip();
              onFlip(card.id);
            }}
            title="Karte umdrehen"
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500/80 to-yellow-600/80 hover:from-amber-400 hover:to-yellow-500 text-black font-bold active:scale-95 text-xs shadow-lg shadow-amber-500/20 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Flip</span>
          </button>
        </div>
      </div>

      {/* 3D Perspective Card Container */}
      <div
        className="perspective-container relative touch-manipulation cursor-pointer"
        style={{
          width: 'clamp(280px, 38vw, 420px)',
          aspectRatio: '5 / 7', // Standard TCG Card Aspect Ratio
        }}
        onPointerMove={handlePointerMove}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onClick={handleCardClick}
      >
        <motion.div
          ref={cardRef}
          className="w-full h-full relative preserve-3d rounded-[22px]"
          animate={{
            rotateY: card.isFlipped ? 180 : 0,
            rotateZ: card.rotation,
            rotateX: isInteracting ? tilt.x : 0,
            x: 0,
          }}
          transition={{
            rotateY: { duration: 0.6, ease: [0.23, 1, 0.32, 1] },
            rotateZ: { duration: 0.3, ease: 'easeOut' },
            rotateX: { duration: 0.1, ease: 'easeOut' },
          }}
          style={{
            transformStyle: 'preserve-3d',
            filter: 'drop-shadow(0 20px 30px rgba(0, 0, 0, 0.7))',
          }}
        >
          {/* ======================================================== */}
          {/* FRONT FACE                                               */}
          {/* ======================================================== */}
          <div
            className={`absolute inset-0 w-full h-full rounded-[20px] overflow-hidden backface-hidden ${getBorderClass(
              card.borderStyle
            )} bg-gradient-to-b ${card.front.bgColor || 'from-slate-900 via-stone-900 to-black'}`}
            style={{
              transform: 'rotateY(0deg)',
            }}
          >
            <CardSideContent
              sideData={card.front}
              sideKey="front"
              cardId={card.id}
              isInteracting={isInteracting}
              tilt={tilt}
              isEditMode={isEditMode}
              editingCounterId={editingCounterId}
              editingValue={editingValue}
              setEditingValue={setEditingValue}
              startCounterEdit={startCounterEdit}
              saveCounterEdit={saveCounterEdit}
              onUpdateCounter={onUpdateCounter}
              onEdit={() => onEdit(card, 'front')}
              holoClass={getHoloClass(card.front.holoEffect)}
            />
          </div>

          {/* ======================================================== */}
          {/* BACK FACE                                                */}
          {/* ======================================================== */}
          <div
            className={`absolute inset-0 w-full h-full rounded-[20px] overflow-hidden backface-hidden ${getBorderClass(
              card.borderStyle
            )} bg-gradient-to-b ${card.back.bgColor || 'from-blue-950 via-indigo-950 to-black'}`}
            style={{
              transform: 'rotateY(180deg)',
            }}
          >
            <CardSideContent
              sideData={card.back}
              sideKey="back"
              cardId={card.id}
              isInteracting={isInteracting}
              tilt={tilt}
              isEditMode={isEditMode}
              editingCounterId={editingCounterId}
              editingValue={editingValue}
              setEditingValue={setEditingValue}
              startCounterEdit={startCounterEdit}
              saveCounterEdit={saveCounterEdit}
              onUpdateCounter={onUpdateCounter}
              onEdit={() => onEdit(card, 'back')}
              holoClass={getHoloClass(card.back.holoEffect)}
            />
          </div>
        </motion.div>
      </div>

      {/* Card Footer Hint */}
      <div className="mt-2 text-center text-[11px] text-slate-400/80 font-medium tracking-wide">
        <span>👆 Tippen zum Umdrehen</span>
        {currentSide.counters.length > 0 && (
          <span className="ml-2 text-yellow-400/90">• {currentSide.counters.length} aktive Zähler</span>
        )}
      </div>
    </div>
  );
};

// Subcomponent for rendering the content of a single card side (Front or Back)
interface CardSideContentProps {
  sideData: CardSideData;
  sideKey: 'front' | 'back';
  cardId: string;
  isInteracting: boolean;
  tilt: { x: number; y: number; glareX: number; glareY: number };
  isEditMode: boolean;
  editingCounterId: string | null;
  editingValue: string;
  setEditingValue: (v: string) => void;
  startCounterEdit: (counter: CardCounter, e: React.MouseEvent) => void;
  saveCounterEdit: (counterId: string) => void;
  onUpdateCounter: (cardId: string, side: 'front' | 'back', counterId: string, delta: number) => void;
  onEdit: () => void;
  holoClass: string;
}

const CardSideContent: React.FC<CardSideContentProps> = ({
  sideData,
  sideKey,
  cardId,
  isInteracting,
  tilt,
  isEditMode,
  editingCounterId,
  editingValue,
  setEditingValue,
  startCounterEdit,
  saveCounterEdit,
  onUpdateCounter,
  onEdit,
  holoClass,
}) => {
  return (
    <div className="relative w-full h-full flex flex-col justify-between p-3.5 overflow-hidden">
      {/* Background Image */}
      {sideData.imageUrl && (
        <div
          className="absolute inset-0 w-full h-full bg-cover bg-center transition-transform duration-700 ease-out"
          style={{
            backgroundImage: `url(${sideData.imageUrl})`,
            backgroundSize: sideData.imageFit === 'contain' ? 'contain' : 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            opacity: 0.82,
            transform: isInteracting ? `scale(1.04) translate(${-tilt.x * 0.4}px, ${-tilt.y * 0.4}px)` : 'scale(1)',
          }}
        />
      )}

      {/* Dark Vignette & Gradient Overlay for High Readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/70 pointer-events-none" />

      {/* Holographic / Foil Sheen Overlay */}
      {holoClass && (
        <div
          className={`absolute inset-0 ${holoClass}`}
          style={{
            opacity: isInteracting ? 0.85 : 0.45,
            backgroundPosition: `${tilt.glareX}% ${tilt.glareY}%`,
            transition: 'opacity 0.2s ease',
          }}
        />
      )}

      {/* Tactile Glare / Reflection Highlight */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-150"
        style={{
          background: `radial-gradient(circle at ${tilt.glareX}% ${tilt.glareY}%, rgba(255, 255, 255, ${
            isInteracting ? '0.35' : '0.08'
          }) 0%, transparent 60%)`,
        }}
      />

      {/* ================= TOP BAR OF CARD ================= */}
      <div className="relative z-10 flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            {sideData.badge && (
              <span className={`text-[10px] uppercase px-2 py-0.5 rounded shadow-md tracking-wider ${sideData.badge.color}`}>
                {sideData.badge.text}
              </span>
            )}
            {sideData.holoEffect !== 'none' && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  sound.playShimmer();
                }}
                title="Holo Shimmer Effekt"
                className="cursor-pointer p-0.5 text-yellow-300 hover:text-white transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              </span>
            )}
          </div>

          <h3
            className={`font-black text-lg sm:text-xl tracking-tight leading-snug drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] ${
              sideData.textColor || 'text-white'
            }`}
          >
            {sideData.title || (sideKey === 'front' ? 'Kartentitel' : 'Rückseite')}
          </h3>

          {sideData.subtitle && (
            <p className="text-[11px] font-medium text-slate-300/90 drop-shadow line-clamp-1">
              {sideData.subtitle}
            </p>
          )}
        </div>

        {isEditMode && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              sound.playClick(600);
              onEdit();
            }}
            className="p-1.5 rounded-lg bg-yellow-500/90 text-black font-bold text-xs shadow hover:bg-yellow-400 active:scale-95"
            title="Diese Seite anpassen"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* ================= MIDDLE / COUNTERS AREA ================= */}
      <div className="relative z-10 my-auto py-2 flex flex-col gap-2">
        {sideData.counters && sideData.counters.length > 0 && (
          <div className="grid grid-cols-1 gap-1.5 bg-black/60 backdrop-blur-md rounded-xl p-2 border border-white/15 shadow-2xl">
            {sideData.counters.map((counter) => {
              const isEditing = editingCounterId === counter.id;
              const step = counter.step || 1;

              return (
                <div
                  key={counter.id}
                  className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 transition-all"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Label */}
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wider truncate max-w-[110px]">
                    {counter.label}
                  </span>

                  {/* Value & Controls */}
                  <div className="flex items-center gap-1.5">
                    {/* Minus Button */}
                    <button
                      onClick={() => {
                        sound.playCounter(false);
                        onUpdateCounter(cardId, sideKey, counter.id, -step);
                      }}
                      className="w-7 h-7 rounded-md bg-white/10 hover:bg-rose-500/80 text-white flex items-center justify-center font-bold active:scale-90 transition-all"
                      title={`-${step}`}
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>

                    {/* Numeric Display or Input */}
                    {isEditing ? (
                      <input
                        type="number"
                        autoFocus
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        onBlur={() => saveCounterEdit(counter.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveCounterEdit(counter.id);
                        }}
                        className="w-16 px-1 py-0.5 text-center bg-black/90 text-yellow-400 border border-yellow-400 rounded text-sm font-black focus:outline-none"
                      />
                    ) : (
                      <span
                        onClick={(e) => startCounterEdit(counter, e)}
                        title="Tippen zum direkten Ändern der Zahl"
                        className={`min-w-[48px] text-center font-black text-base sm:text-lg cursor-pointer hover:underline ${
                          counter.color || 'text-yellow-400'
                        } drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]`}
                      >
                        {counter.value}
                      </span>
                    )}

                    {/* Plus Button */}
                    <button
                      onClick={() => {
                        sound.playCounter(true);
                        onUpdateCounter(cardId, sideKey, counter.id, step);
                      }}
                      className="w-7 h-7 rounded-md bg-white/10 hover:bg-emerald-500/80 text-white flex items-center justify-center font-bold active:scale-90 transition-all"
                      title={`+${step}`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ================= BOTTOM / FLAVOR TEXT & NOTES ================= */}
      <div className="relative z-10">
        {sideData.notes ? (
          <div className="bg-black/60 backdrop-blur-md rounded-lg p-2 border border-white/10">
            <p className="text-[11px] text-slate-200/90 leading-relaxed font-sans italic line-clamp-3">
              "{sideData.notes}"
            </p>
          </div>
        ) : (
          <div className="h-2" />
        )}
      </div>
    </div>
  );
};
