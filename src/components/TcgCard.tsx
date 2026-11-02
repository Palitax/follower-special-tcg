'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TcgCardData, CardRarity } from '../types/card';
import { sound } from '../utils/sound';
import {
  ImagePlus,
  Maximize2,
  RotateCw,
  Trash2,
  X,
  Undo2,
} from 'lucide-react';
import { RarityRing } from './RarityRing';

interface TcgCardProps {
  card: TcgCardData;
  cardIndex: number;
  totalCards: number;
  rarity: CardRarity;
  isFullscreen?: boolean;
  isVerticalMode?: boolean;
  /** Dynamically computed optimal card width in px from Arena ResizeObserver */
  cardWidthPx?: number;
  /** Dynamically computed outer padding/bleed in px so rarity glows never overlap */
  effectBleedPx?: number;
  onFlip: (id: string) => void;
  onToggleEliminated: (id: string) => void;
  onRotate?: (id: string) => void;
  onDelete?: (id: string) => void;
  onUpdateFrontText: (id: string, text: string) => void;
  onUpdateFrontImage: (id: string, imageUrl: string, imageFit?: 'cover' | 'contain') => void;
}

const DEFAULT_FRONT_IMAGE = '/images/pokemon-energy-front.png';
const DEFAULT_BACK_IMAGE = '/images/card-back-water.jpg';

// Compress uploaded image so dozens of card/slab photos sync & cache smoothly
async function compressImageFile(file: File, maxDim = 900): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('File read error'));
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/webp', 0.85));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

export const TcgCard: React.FC<TcgCardProps> = ({
  card,
  cardIndex,
  totalCards,
  rarity,
  isFullscreen = false,
  isVerticalMode = false,
  cardWidthPx,
  effectBleedPx,
  onFlip,
  onToggleEliminated,
  onDelete,
  onUpdateFrontText,
  onUpdateFrontImage,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tilt, setTilt] = useState<{ x: number; y: number; glareX: number; glareY: number }>({
    x: 0,
    y: 0,
    glareX: 50,
    glareY: 50,
  });
  const [isInteracting, setIsInteracting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Inline editing state for Front Prize Text (ONLY active when !isFullscreen)
  const [isEditingFront, setIsEditingFront] = useState(false);
  const [frontTextValue, setFrontTextValue] = useState(card.front.notes || '');

  useEffect(() => {
    setFrontTextValue(card.front.notes || '');
  }, [card.front.notes]);

  useEffect(() => {
    if (isFullscreen) {
      setIsEditingFront(false);
    }
  }, [isFullscreen]);

  const isEliminated = Boolean(card.isEliminated);
  const displayNumber = card.back?.counters?.[0]?.value ?? cardIndex + 1;

  // Effective width & bleed (dynamic exact px from Arena observer, with safe fallback)
  const effectiveW = cardWidthPx ?? (isVerticalMode ? 160 : 220);
  const effectBleed =
    effectBleedPx ??
    Math.max(4, Math.min(isVerticalMode ? 15 : 22, Math.round(effectiveW * 0.068)));

  const isCompactCard = effectiveW < 95;
  const isTinyCard = effectiveW < 68;

  // Scale idle float proportionally to bleed so adjacent RarityRings never touch
  const floatAmp = isEliminated
    ? 0
    : Math.min(3.2, Math.max(0.8, +(effectBleed * 0.17).toFixed(2)));

  // Scale back-side number typography smoothly to the exact card pixel width
  const digits = String(displayNumber).length;
  const numberFontPx = Math.max(
    14,
    Math.round(effectiveW * (digits >= 3 ? 0.31 : digits === 2 ? 0.39 : 0.44))
  );
  const numberStrokePx = Math.max(0.5, +(effectiveW * 0.0085).toFixed(2));

  // 3D Tilt calculation
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!cardRef.current || isEliminated) return;
      const rect = cardRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = ((y - centerY) / centerY) * -9;
      const rotateY = ((x - centerX) / centerX) * 9;

      const glareX = (x / rect.width) * 100;
      const glareY = (y / rect.height) * 100;

      setTilt({ x: rotateX, y: rotateY, glareX, glareY });
    },
    [isEliminated]
  );

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.closest('input') ||
      target.closest('textarea') ||
      target.closest('label')
    ) {
      return;
    }

    // Eliminated cards are out of the active pool — prevent accidental flips
    if (isEliminated) {
      sound.playClick(320, 0.04);
      return;
    }

    if (!isFullscreen && isEditingFront) {
      return;
    }

    sound.playCardFlip();
    onFlip(card.id);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    sound.playClick(isEliminated ? 720 : 420);
    onToggleEliminated(card.id);
  };

  const handleSaveFront = () => {
    setIsEditingFront(false);
    onUpdateFrontText(card.id, frontTextValue);
    sound.playClick(800, 0.05);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file);
      onUpdateFrontImage(card.id, compressed, card.front.imageFit || 'contain');
      sound.playShimmer();
    } catch (err) {
      console.warn('Image upload failed', err);
    } finally {
      e.target.value = '';
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (isFullscreen) return;

    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      try {
        const compressed = await compressImageFile(file);
        onUpdateFrontImage(card.id, compressed, card.front.imageFit || 'contain');
        sound.playShimmer();
      } catch (err) {
        console.warn('Drop image upload failed', err);
      }
    }
  };

  const cardFrontImage =
    card.front.imageUrl && !card.front.imageUrl.startsWith('idb:')
      ? card.front.imageUrl
      : DEFAULT_FRONT_IMAGE;
  const hasCustomFrontImage = Boolean(
    cardFrontImage && cardFrontImage !== DEFAULT_FRONT_IMAGE
  );
  const imageFit = card.front.imageFit || 'contain';
  const cardBackImage = DEFAULT_BACK_IMAGE;

  const rarityFrameClass =
    rarity === 'legendary'
      ? 'rarity-frame-legendary'
      : rarity === 'epic'
      ? 'rarity-frame-epic'
      : 'rarity-frame-rare';

  const ringGlow = totalCards <= 16 && !isEliminated;

  return (
    <div
      className="flex flex-col items-center justify-center select-none group/card"
      style={{ padding: effectBleed }}
    >
      {/* Hidden file input for individual prize image upload */}
      {!isFullscreen && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      )}

      {/* 3D Perspective Card Container */}
      <motion.div
        animate={
          isEliminated
            ? { y: 0, rotate: 0 }
            : {
                y: [-floatAmp, floatAmp, -floatAmp],
                rotate: [-0.22, 0.22, -0.22],
              }
        }
        transition={
          isEliminated
            ? { duration: 0.25 }
            : {
                duration: 4 + (cardIndex % 4) * 0.5,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: (cardIndex % 10) * 0.2,
              }
        }
        className={`perspective-container relative touch-manipulation ${
          isEliminated ? 'cursor-default' : 'cursor-pointer'
        }`}
        style={
          {
            width: `${effectiveW}px`,
            aspectRatio: '63 / 88', // Authentic Pokémon TCG (63 x 88 mm) proportion
            perspective: '1200px',
          } as React.CSSProperties
        }
        onPointerMove={handlePointerMove}
        onPointerEnter={() => !isEliminated && setIsInteracting(true)}
        onPointerLeave={() => {
          setIsInteracting(false);
          setTilt({ x: 0, y: 0, glareX: 50, glareY: 50 });
        }}
        onDragOver={(e) => {
          if (isFullscreen) return;
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={handleCardClick}
        onContextMenu={handleContextMenu}
      >
        {/* Animated rarity outline AROUND the card (hidden cleanly when marked out of pool) */}
        {!isEliminated ? (
          <RarityRing key={rarity} rarity={rarity} bleed={effectBleed} glow={ringGlow} />
        ) : (
          <div
            className="absolute -inset-[2px] rounded-[5%] border border-slate-600/50 pointer-events-none"
            aria-hidden
          />
        )}

        {/* ================================================================
            QUICK OVERLAY CONTROLS (Zero vertical layout space stolen!)
            - Preview Mode: appears cleanly on card hover (always visible on touch devices)
            - Fullscreen Mode: completely invisible unless mouse hovers card corner
           ================================================================ */}
        {!isFullscreen ? (
          <div
            className={`absolute top-1.5 inset-x-1.5 z-40 flex items-center justify-between gap-1 pointer-events-none transition-opacity duration-150 ${
              isEliminated
                ? 'opacity-0 group-hover/card:opacity-100 focus-within:opacity-100 [@media(hover:none)]:opacity-95'
                : 'opacity-0 group-hover/card:opacity-100 focus-within:opacity-100 [@media(hover:none)]:opacity-85'
            }`}
          >
            {/* Left: Image Upload & Fit Controls (hidden on ultra-tiny grids) */}
            <div className="flex items-center gap-1 pointer-events-auto">
              {!isTinyCard && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  title="Gewinn-Bild für diese Karte hochladen"
                  className={`p-1 sm:p-1.5 rounded-full backdrop-blur-md border shadow-md active:scale-90 transition-all ${
                    hasCustomFrontImage
                      ? 'bg-emerald-500/90 border-emerald-300/60 text-black hover:bg-emerald-400'
                      : 'bg-black/70 border-white/20 text-amber-300 hover:bg-amber-400 hover:text-black hover:border-amber-300'
                  }`}
                >
                  <ImagePlus className={isCompactCard ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5'} />
                </button>
              )}

              {!isCompactCard && !card.isFlipped && hasCustomFrontImage && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const nextFit = imageFit === 'contain' ? 'cover' : 'contain';
                      onUpdateFrontImage(card.id, cardFrontImage, nextFit);
                      sound.playClick(650);
                    }}
                    className="p-1 sm:p-1.5 rounded-full bg-black/70 hover:bg-white/25 backdrop-blur-md text-cyan-300 border border-white/20 shadow-md active:scale-90 transition-all"
                    title={
                      imageFit === 'contain'
                        ? 'Ganzer Slab/Karte sichtbar (Klicken für Ausfüllen)'
                        : 'Bild füllt Karte (Klicken für Einpassen)'
                    }
                  >
                    <Maximize2 className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateFrontImage(card.id, DEFAULT_FRONT_IMAGE, 'contain');
                      sound.playClick(450);
                    }}
                    className="p-1 sm:p-1.5 rounded-full bg-black/70 hover:bg-rose-500/80 backdrop-blur-md text-rose-300 hover:text-white border border-white/20 shadow-md active:scale-90 transition-all"
                    title="Standard-Kartenbild wiederherstellen"
                  >
                    <RotateCw className="w-3 h-3" />
                  </button>
                </>
              )}
            </div>

            {/* Right: Mark as Out ("weg" / X) + Optional Delete */}
            <div className="flex items-center gap-1 pointer-events-auto ml-auto">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  sound.playClick(isEliminated ? 720 : 420);
                  onToggleEliminated(card.id);
                }}
                title={
                  isEliminated
                    ? 'Karte wieder in den Pool nehmen (Rechtsklick geht auch)'
                    : 'Karte als weg markieren (X) (Rechtsklick geht auch)'
                }
                className={`p-1 sm:p-1.5 rounded-full backdrop-blur-md border shadow-md active:scale-90 transition-all ${
                  isEliminated
                    ? 'bg-rose-600 hover:bg-emerald-500 border-rose-300/70 text-white'
                    : 'bg-black/70 hover:bg-rose-600 border-white/20 hover:border-rose-300 text-slate-200 hover:text-white'
                }`}
              >
                {isEliminated ? (
                  <Undo2 className={isCompactCard ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5'} />
                ) : (
                  <X className={isCompactCard ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5'} />
                )}
              </button>

              {onDelete && !isCompactCard && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    sound.playClick(400);
                    onDelete(card.id);
                  }}
                  title="Karte löschen"
                  className="p-1 sm:p-1.5 rounded-full bg-black/70 hover:bg-rose-600 backdrop-blur-md border border-white/15 text-slate-400 hover:text-white shadow-md opacity-0 group-hover/card:opacity-100 active:scale-90 transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Fullscreen Presentation Mode: Discreet hover-only X toggle in top-right corner */
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              sound.playClick(isEliminated ? 720 : 420);
              onToggleEliminated(card.id);
            }}
            title={
              isEliminated
                ? 'Karte wieder freigeben (oder Rechtsklick)'
                : 'Karte als weg markieren (oder Rechtsklick)'
            }
            className={`absolute top-1.5 right-1.5 z-40 p-1.5 rounded-full backdrop-blur-md border shadow-lg opacity-0 group-hover/card:opacity-95 focus:opacity-100 active:scale-90 transition-all ${
              isEliminated
                ? 'bg-rose-600/90 hover:bg-emerald-500 border-rose-300/60 text-white'
                : 'bg-black/75 hover:bg-rose-600 border-white/25 text-slate-200 hover:text-white'
            }`}
          >
            {isEliminated ? (
              <Undo2 className={isCompactCard ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5'} />
            ) : (
              <X className={isCompactCard ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5'} />
            )}
          </button>
        )}

        <div
          ref={cardRef}
          className="w-full h-full relative"
          style={{
            transformStyle: 'preserve-3d',
            transform: isInteracting && !isEliminated ? `rotateX(${tilt.x}deg) rotateY(${tilt.y * 0.35}deg)` : 'none',
            transition: 'transform 0.12s ease-out, filter 0.3s ease',
            filter: isEliminated
              ? 'grayscale(1) brightness(0.6) contrast(0.88)'
              : 'none',
          }}
        >
          {/* ======================================================== */}
          {/* SEITE 1 (FRONT / GEWINN-SEITE): PRIZE IMAGE OR CARD ART  */}
          {/* ======================================================== */}
          <motion.div
            className={`absolute inset-0 w-full h-full rounded-[4.5%] overflow-hidden flex flex-col justify-center items-center bg-slate-950 ${rarityFrameClass} ${
              isDragOver ? 'ring-4 ring-emerald-400' : ''
            }`}
            animate={{
              rotateY: card.isFlipped ? 180 : 0,
            }}
            transition={{
              duration: 0.58,
              ease: [0.23, 1, 0.32, 1],
            }}
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transformStyle: 'preserve-3d',
              zIndex: card.isFlipped ? 0 : 2,
            }}
          >
            {/* Card Front Image */}
            <div
              className={`absolute inset-0 w-full h-full bg-no-repeat ${
                imageFit === 'cover' ? 'bg-cover' : 'bg-contain'
              } bg-center transition-transform duration-500 pointer-events-none rounded-[4%]`}
              style={{
                backgroundImage: `url(${cardFrontImage})`,
                transform: isInteracting && !isEliminated ? 'scale(1.015)' : 'scale(1)',
              }}
            />

            {/* Subtle Holo Light Glare */}
            {!isEliminated && (
              <div
                className="absolute inset-0 pointer-events-none rounded-[4%] z-10"
                style={{
                  background: `radial-gradient(circle at ${tilt.glareX}% ${tilt.glareY}%, rgba(255, 255, 255, ${
                    isInteracting ? '0.26' : '0.04'
                  }) 0%, transparent 60%)`,
                }}
              />
            )}

            {/* Center Area: Optional Prize Text */}
            <div className="relative z-20 w-full px-2 flex flex-col items-center justify-center">
              {isFullscreen ? (
                frontTextValue ? (
                  <div className="w-full max-w-[90%] bg-black/75 backdrop-blur-md border border-white/20 shadow-xl p-2 rounded-xl text-center pointer-events-none">
                    <p
                      className="font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,1)] leading-snug break-words"
                      style={{
                        fontSize: `${Math.max(10, Math.min(18, Math.round(effectiveW * 0.085)))}px`,
                      }}
                    >
                      {frontTextValue}
                    </p>
                  </div>
                ) : null
              ) : (
                !isTinyCard && (
                  <div
                    onClick={(e) => {
                      if (isEliminated) return;
                      e.stopPropagation();
                      setIsEditingFront(true);
                      sound.playClick(600);
                    }}
                    className={`w-full max-w-[88%] rounded-xl transition-all cursor-text flex flex-col items-center justify-center ${
                      isEditingFront
                        ? 'border-2 border-cyan-400 bg-black/95 shadow-2xl ring-2 ring-cyan-400/40 p-2'
                        : frontTextValue
                        ? 'border border-dashed border-cyan-400/60 bg-black/75 hover:bg-black/90 shadow-lg p-1.5 backdrop-blur-md'
                        : 'border border-dashed border-transparent hover:border-cyan-400/50 hover:bg-black/60 p-1.5 transition-all'
                    }`}
                    title="Optionaler Gewinn-Text (in der Voransicht bearbeitbar)"
                  >
                    {isEditingFront ? (
                      <div className="space-y-1.5 w-full">
                        <textarea
                          rows={2}
                          autoFocus
                          value={frontTextValue}
                          onChange={(e) => setFrontTextValue(e.target.value)}
                          placeholder="Gewinn-Text..."
                          className="w-full px-2 py-1 bg-white/10 border border-cyan-400/60 rounded text-xs text-cyan-100 focus:outline-none resize-none font-bold text-center"
                        />
                        <div className="flex justify-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSaveFront();
                            }}
                            className="px-2.5 py-1 bg-cyan-400 hover:bg-cyan-300 text-black font-extrabold rounded-lg text-[11px] active:scale-95"
                          >
                            Speichern
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center w-full">
                        {frontTextValue ? (
                          <p
                            className="font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,1)] leading-snug break-words"
                            style={{
                              fontSize: `${Math.max(10, Math.min(16, Math.round(effectiveW * 0.082)))}px`,
                            }}
                          >
                            {frontTextValue}
                          </p>
                        ) : (
                          <span className="text-cyan-200/90 font-bold italic text-[10px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] opacity-0 group-hover/card:opacity-100 transition-opacity">
                            + Text
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
          </motion.div>

          {/* ======================================================== */}
          {/* SEITE 2 (BACK): MANACARDS ARTWORK & SEQUENTIAL NUMBER    */}
          {/* Clean fixed 1..N number — no +/- buttons or edit boxes   */}
          {/* ======================================================== */}
          <motion.div
            className={`absolute inset-0 w-full h-full rounded-[4.5%] overflow-hidden shadow-2xl bg-white flex items-center justify-center ${rarityFrameClass}`}
            animate={{
              rotateY: card.isFlipped ? 0 : -180,
            }}
            transition={{
              duration: 0.58,
              ease: [0.23, 1, 0.32, 1],
            }}
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transformStyle: 'preserve-3d',
              zIndex: card.isFlipped ? 2 : 0,
            }}
          >
            {/* ManaCards Water Energy Background Artwork */}
            <div
              className="absolute inset-0 w-full h-full bg-no-repeat bg-cover bg-center transition-transform duration-500 pointer-events-none rounded-[4%]"
              style={{
                backgroundImage: `url(${cardBackImage})`,
                transform: isInteracting && !isEliminated ? 'scale(1.015)' : 'scale(1)',
              }}
            />

            {/* Subtle Holo Light Glare */}
            {!isEliminated && (
              <div
                className="absolute inset-0 pointer-events-none z-10"
                style={{
                  background: `radial-gradient(circle at ${tilt.glareX}% ${tilt.glareY}%, rgba(147, 197, 253, ${
                    isInteracting ? '0.28' : '0.05'
                  }) 0%, transparent 60%)`,
                }}
              />
            )}

            {/* Clean Centered Dark-Blue Gradient Number (1..N) */}
            <div className="relative z-20 w-full px-1 flex items-center justify-center pointer-events-none">
              <span
                className="font-black leading-none text-transparent bg-clip-text bg-gradient-to-b from-[#020617] via-[#0f296b] to-[#1d4ed8] drop-shadow-[0_0_12px_rgba(255,255,255,0.98)] drop-shadow-[0_4px_10px_rgba(15,23,42,0.55)] tracking-tight select-none"
                style={{
                  fontSize: `${numberFontPx}px`,
                  WebkitTextStroke: `${numberStrokePx}px rgba(240,249,255,0.88)`,
                }}
              >
                {displayNumber}
              </span>
            </div>
          </motion.div>
        </div>

        {/* ================================================================
            OUT-OF-POOL ("WEG") X OVERLAY
            Sits cleanly over the desaturated card so viewers immediately see
            this slot is no longer selectable, while the number remains visible underneath.
           ================================================================ */}
        <AnimatePresence>
          {isEliminated && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="absolute inset-0 z-30 rounded-[4.5%] pointer-events-none flex items-center justify-center bg-slate-950/30 ring-1 ring-inset ring-white/15"
            >
              <svg
                viewBox="0 0 100 100"
                className="w-[68%] h-[68%] overflow-visible drop-shadow-[0_2px_10px_rgba(0,0,0,0.75)] opacity-90"
                aria-label="Karte aus dem Pool genommen"
              >
                <defs>
                  <linearGradient id={`elimGrad_${card.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fb7185" />
                    <stop offset="50%" stopColor="#f43f5e" />
                    <stop offset="100%" stopColor="#e11d48" />
                  </linearGradient>
                </defs>
                {/* Dark contrast halo so the X reads clearly on both white & dark art */}
                <path
                  d="M 16 16 L 84 84 M 84 16 L 16 84"
                  stroke="rgba(2, 6, 23, 0.85)"
                  strokeWidth="12.5"
                  strokeLinecap="round"
                  fill="none"
                />
                {/* Crisp rose-red X stroke */}
                <path
                  d="M 16 16 L 84 84 M 84 16 L 16 84"
                  stroke={`url(#elimGrad_${card.id})`}
                  strokeWidth="8"
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
