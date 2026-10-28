'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TcgCardData, CardRarity } from '../types/card';
import { sound } from '../utils/sound';
import {
  RotateCcw,
  Minus,
  Plus,
  Trash2,
  ImagePlus,
  Maximize2,
  RotateCw,
} from 'lucide-react';

interface TcgCardProps {
  card: TcgCardData;
  cardIndex: number;
  totalCards: number;
  rarity: CardRarity;
  isFullscreen?: boolean;
  isVerticalMode?: boolean;
  onFlip: (id: string) => void;
  onRotate?: (id: string) => void;
  onDelete?: (id: string) => void;
  onUpdateFrontText: (id: string, text: string) => void;
  onUpdateFrontImage: (id: string, imageUrl: string, imageFit?: 'cover' | 'contain') => void;
  onUpdateBackNumber: (id: string, numberValue: number) => void;
}

const DEFAULT_FRONT_IMAGE = '/images/pokemon-energy-front.png';
const DEFAULT_BACK_IMAGE = '/images/card-back-water.jpg';

// Compress uploaded image so dozens of card/slab photos fit in LocalStorage smoothly
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
        resolve(canvas.toDataURL('image/webp', 0.86));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

// Particle configurations around the card per rarity tier
const PARTICLE_POSITIONS = [
  { left: '6%', top: '8%', delay: '0s', duration: '2.4s', size: 6 },
  { left: '92%', top: '12%', delay: '0.4s', duration: '2.1s', size: 7 },
  { left: '4%', top: '38%', delay: '0.8s', duration: '2.6s', size: 5 },
  { left: '95%', top: '44%', delay: '0.2s', duration: '2.3s', size: 8 },
  { left: '8%', top: '72%', delay: '1.1s', duration: '2.5s', size: 6 },
  { left: '93%', top: '76%', delay: '0.6s', duration: '2.0s', size: 7 },
  { left: '24%', top: '3%', delay: '0.9s', duration: '2.2s', size: 6 },
  { left: '76%', top: '4%', delay: '0.3s', duration: '2.4s', size: 7 },
  { left: '28%', top: '95%', delay: '0.5s', duration: '2.1s', size: 6 },
  { left: '72%', top: '96%', delay: '1.2s', duration: '2.3s', size: 8 },
  { left: '50%', top: '2%', delay: '0.7s', duration: '1.9s', size: 8 },
  { left: '50%', top: '97%', delay: '0.1s', duration: '2.0s', size: 7 },
];

export const TcgCard: React.FC<TcgCardProps> = ({
  card,
  cardIndex,
  totalCards,
  rarity,
  isFullscreen = false,
  isVerticalMode = false,
  onFlip,
  onDelete,
  onUpdateFrontText,
  onUpdateFrontImage,
  onUpdateBackNumber,
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

  // Inline editing states for Front Text (ONLY active when !isFullscreen)
  const [isEditingFront, setIsEditingFront] = useState(false);
  const [frontTextValue, setFrontTextValue] = useState(card.front.notes || '');

  // Inline editing states for Back Number (ONLY active when !isFullscreen)
  const [isEditingBackNum, setIsEditingBackNum] = useState(false);
  const backCounter = card.back.counters[0] || { id: 'c1', label: '', value: cardIndex + 1 };
  const [backNumValue, setBackNumValue] = useState<string>(backCounter.value.toString());

  // Sync local values when card props change (e.g., on Giveaway Level Up or Reset)
  useEffect(() => {
    setFrontTextValue(card.front.notes || '');
  }, [card.front.notes]);

  useEffect(() => {
    const val = card.back.counters[0]?.value ?? cardIndex + 1;
    setBackNumValue(val.toString());
  }, [card.back.counters, cardIndex]);

  // Never allow editing state to stay open in Fullscreen / Presentation mode
  useEffect(() => {
    if (isFullscreen) {
      setIsEditingFront(false);
      setIsEditingBackNum(false);
    }
  }, [isFullscreen]);

  // Dynamic responsive card sizing
  const isMicro = totalCards > 36;
  const isMini = totalCards > 16 && totalCards <= 36;
  const isSmall = totalCards > 8 && totalCards <= 16;
  const isMedium = totalCards > 4 && totalCards <= 8;

  const getWidthClass = () => {
    // Vertical 9:16 Stream Mode (Whatnot / Instagram)
    if (isVerticalMode) {
      if (isFullscreen) {
        if (totalCards === 1) return 'w-[270px] sm:w-[320px]';
        if (totalCards === 2) return 'w-[185px] sm:w-[215px]';
        if (totalCards <= 4) return 'w-[150px] sm:w-[175px]';
        if (totalCards <= 6) return 'w-[125px] sm:w-[145px]';
        if (totalCards <= 9) return 'w-[105px] sm:w-[120px]';
        if (totalCards <= 12) return 'w-[92px] sm:w-[105px]';
        if (totalCards <= 16) return 'w-[82px] sm:w-[92px]';
        if (totalCards <= 20) return 'w-[74px] sm:w-[84px]';
        if (totalCards <= 30) return 'w-[62px] sm:w-[70px]';
        return 'w-[50px] sm:w-[58px]';
      }
      if (totalCards === 1) return 'w-[230px] sm:w-[260px]';
      if (totalCards === 2) return 'w-[160px] sm:w-[185px]';
      if (totalCards <= 4) return 'w-[130px] sm:w-[150px]';
      if (totalCards <= 6) return 'w-[110px] sm:w-[125px]';
      if (totalCards <= 9) return 'w-[92px] sm:w-[105px]';
      if (totalCards <= 12) return 'w-[82px] sm:w-[94px]';
      if (totalCards <= 16) return 'w-[74px] sm:w-[84px]';
      if (totalCards <= 20) return 'w-[66px] sm:w-[76px]';
      if (totalCards <= 30) return 'w-[56px] sm:w-[64px]';
      return 'w-[46px] sm:w-[52px]';
    }

    // Standard Landscape / Full Arena Mode
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
    // In Fullscreen / Presentation Mode, clicking ANYWHERE on the card always flips it!
    if (isFullscreen) {
      sound.playCardFlip();
      onFlip(card.id);
      return;
    }

    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.closest('input') ||
      target.closest('textarea') ||
      target.closest('label') ||
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
    if (isFullscreen) return;
    sound.playCounter(delta > 0);
    const current = parseInt(backNumValue, 10) || 0;
    const next = current + delta;
    setBackNumValue(next.toString());
    onUpdateBackNumber(card.id, next);
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

  const cardFrontImage = card.front.imageUrl || DEFAULT_FRONT_IMAGE;
  const hasCustomFrontImage = Boolean(
    card.front.imageUrl && card.front.imageUrl !== DEFAULT_FRONT_IMAGE
  );
  const imageFit = card.front.imageFit || 'contain';
  const cardBackImage = DEFAULT_BACK_IMAGE;

  // Rarity visual classes & particle styles
  const rarityFrameClass =
    rarity === 'legendary'
      ? 'rarity-frame-legendary'
      : rarity === 'epic'
      ? 'rarity-frame-epic'
      : 'rarity-frame-rare';

  const visibleParticles =
    rarity === 'legendary'
      ? PARTICLE_POSITIONS
      : rarity === 'epic'
      ? PARTICLE_POSITIONS.slice(0, 10)
      : PARTICLE_POSITIONS.slice(0, 6);

  return (
    <div
      className={`flex flex-col items-center justify-center ${
        isVerticalMode ? 'p-0.5 sm:p-1' : 'p-1 sm:p-1.5'
      } select-none group/card`}
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

      {/* Top Mini Bar (ONLY in Preview Mode !isFullscreen & <= 20 cards) */}
      {!isFullscreen && !isMicro && (
        <div
          className={`w-full ${getWidthClass()} flex items-center justify-between px-0.5 mb-1 gap-1`}
        >
          <div className="flex items-center gap-1 bg-black/75 backdrop-blur-md px-2 py-0.5 rounded-full border border-cyan-500/30 text-[9px] sm:text-[10px] font-bold text-cyan-200 truncate">
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                rarity === 'legendary'
                  ? 'bg-amber-400'
                  : rarity === 'epic'
                  ? 'bg-purple-400'
                  : 'bg-cyan-400'
              }`}
            />
            <span className="truncate">
              #{cardIndex + 1} {card.isFlipped ? '(Zahl)' : '(Gewinn)'}
            </span>
          </div>

          <div className="flex items-center gap-0.5 shrink-0">
            {/* Upload Prize Image Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              title="Gewinn-Bild für diese Karte hochladen"
              className={`p-1 rounded-full font-bold active:scale-95 transition-all text-[10px] ${
                hasCustomFrontImage
                  ? 'bg-emerald-500 text-black hover:bg-emerald-400'
                  : 'bg-white/15 hover:bg-amber-400 text-amber-300 hover:text-black'
              }`}
            >
              <ImagePlus className="w-3 h-3" />
            </button>

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
          y: isMicro ? [-1.5, 1.5, -1.5] : [-4, 4, -4],
          rotate: isMicro ? [-0.15, 0.15, -0.15] : [-0.3, 0.3, -0.3],
        }}
        transition={{
          duration: 4 + (cardIndex % 4) * 0.5,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: (cardIndex % 10) * 0.2,
        }}
        className={`perspective-container relative touch-manipulation cursor-pointer ${getWidthClass()}`}
        style={{
          aspectRatio: '63 / 88', // Authentic Pokémon TCG (2.5 x 3.5 in / 63 x 88 mm) proportion
          maxHeight: isFullscreen ? 'calc(94vh - 20px)' : 'calc(100vh - 215px)',
          maxWidth: 'calc(100vw - 24px)',
          perspective: '1200px',
        }}
        onPointerMove={handlePointerMove}
        onPointerEnter={() => setIsInteracting(true)}
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
      >
        {/* ============================================================ */}
        {/* RARITY AMBIENT AURA & FLOATING PARTICLES AROUND THE CARD     */}
        {/* ============================================================ */}
        <div
          className={`absolute -inset-1.5 sm:-inset-2 rounded-[6%] pointer-events-none transition-all duration-700 ${
            rarity === 'legendary'
              ? 'bg-gradient-to-tr from-red-600/50 via-orange-500/55 to-yellow-300/60 blur-md animate-pulse'
              : rarity === 'epic'
              ? 'bg-gradient-to-tr from-purple-700/50 via-fuchsia-500/45 to-violet-400/55 blur-md animate-pulse'
              : 'bg-gradient-to-tr from-blue-600/35 via-cyan-400/35 to-sky-300/40 blur-sm'
          }`}
        />

        {/* Animated Floating Rarity Particles */}
        {!isMicro && (
          <div className="absolute -inset-2 pointer-events-none overflow-visible z-30">
            {visibleParticles.map((p, idx) => (
              <span
                key={idx}
                style={{
                  left: p.left,
                  top: p.top,
                  width: `${rarity === 'legendary' ? p.size + 2 : rarity === 'epic' ? p.size + 1 : p.size}px`,
                  height: `${rarity === 'legendary' ? p.size + 2 : rarity === 'epic' ? p.size + 1 : p.size}px`,
                  animation: `floatParticle ${p.duration} ease-in-out ${p.delay} infinite`,
                }}
                className={`absolute rounded-full ${
                  rarity === 'legendary'
                    ? 'bg-gradient-to-t from-red-500 via-orange-400 to-yellow-200 shadow-[0_0_12px_#facc15,0_0_20px_#ea580c]'
                    : rarity === 'epic'
                    ? 'bg-gradient-to-t from-purple-500 via-fuchsia-300 to-white shadow-[0_0_12px_#d946ef,0_0_18px_#9333ea]'
                    : 'bg-gradient-to-t from-blue-400 via-cyan-200 to-white shadow-[0_0_10px_#38bdf8,0_0_15px_#0284c7]'
                }`}
              />
            ))}
          </div>
        )}

        <div
          ref={cardRef}
          className="w-full h-full relative"
          style={{
            transformStyle: 'preserve-3d',
            transform: isInteracting ? `rotateX(${tilt.x}deg)` : 'none',
            transition: 'transform 0.1s ease-out',
          }}
        >
          {/* ======================================================== */}
          {/* SEITE 1 (FRONT / GEWINN-SEITE): PRIZE IMAGE OR CARD ART  */}
          {/* Rotates from 0deg (visible) to 180deg (hidden)           */}
          {/* ======================================================== */}
          <motion.div
            className={`absolute inset-0 w-full h-full rounded-[4.5%] overflow-hidden flex flex-col justify-between items-center bg-slate-950 ${rarityFrameClass} ${
              isDragOver ? 'ring-4 ring-emerald-400' : ''
            }`}
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
            {/* Molten Lava Inner Border Rim for Legendary */}
            {rarity === 'legendary' && (
              <div className="absolute inset-0 pointer-events-none rounded-[4.5%] border-[3px] border-orange-500/80 shadow-[inset_0_0_20px_rgba(234,88,12,0.85)] z-20" />
            )}
            {rarity === 'epic' && (
              <div className="absolute inset-0 pointer-events-none rounded-[4.5%] border-[2px] border-fuchsia-400/70 shadow-[inset_0_0_18px_rgba(192,132,252,0.75)] z-20" />
            )}

            {/* Card Front Image (Custom Uploaded Prize / Slab or Default Energy Card) */}
            <div
              className={`absolute inset-0 w-full h-full bg-no-repeat ${
                imageFit === 'cover' ? 'bg-cover' : 'bg-contain'
              } bg-center transition-transform duration-500 pointer-events-none rounded-[4%]`}
              style={{
                backgroundImage: `url(${cardFrontImage})`,
                transform: isInteracting ? 'scale(1.015)' : 'scale(1)',
              }}
            />

            {/* Subtle Holo Light Glare */}
            <div
              className="absolute inset-0 pointer-events-none rounded-[4%] z-10"
              style={{
                background: `radial-gradient(circle at ${tilt.glareX}% ${tilt.glareY}%, rgba(255, 255, 255, ${
                  isInteracting ? '0.28' : '0.05'
                }) 0%, transparent 60%)`,
              }}
            />

            {/* Top Controls on Front Side (ONLY in Preview Mode !isFullscreen) */}
            {!isFullscreen && !isMicro && (
              <div
                className="relative z-20 w-full flex items-center justify-between p-1.5 gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-black/80 hover:bg-amber-400 text-amber-300 hover:text-black border border-amber-400/50 text-[10px] font-extrabold shadow-lg transition-all active:scale-95"
                  title="Individuelles Gewinn-Bild (z.B. Karte oder Slab) hochladen"
                >
                  <ImagePlus className="w-3 h-3 shrink-0" />
                  {!isMini && <span>{hasCustomFrontImage ? 'Bild ändern' : 'Bild hochladen'}</span>}
                </button>

                {hasCustomFrontImage && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        const nextFit = imageFit === 'contain' ? 'cover' : 'contain';
                        onUpdateFrontImage(card.id, cardFrontImage, nextFit);
                        sound.playClick(650);
                      }}
                      className="p-1 rounded-lg bg-black/80 hover:bg-white/20 text-cyan-300 border border-white/20 text-[9px] font-bold"
                      title={imageFit === 'contain' ? 'Ganzer Slab/Karte sichtbar (Klicken für Ausfüllen)' : 'Bild füllt Karte (Klicken für Einpassen)'}
                    >
                      <Maximize2 className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateFrontImage(card.id, DEFAULT_FRONT_IMAGE, 'contain');
                        sound.playClick(450);
                      }}
                      className="p-1 rounded-lg bg-black/80 hover:bg-rose-500/80 text-rose-300 hover:text-white border border-white/20 text-[9px] font-bold"
                      title="Standard-Kartenbild wiederherstellen"
                    >
                      <RotateCw className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Center / Bottom Area: Optional Prize Text */}
            <div className="relative z-20 w-full px-2 my-auto flex flex-col items-center justify-center">
              {isFullscreen ? (
                /* FULLSCREEN PRESENTATION MODE: Strictly NO editing, only display text if set */
                frontTextValue ? (
                  <div className="w-full max-w-[90%] bg-black/75 backdrop-blur-md border border-white/20 shadow-xl p-2 rounded-xl text-center pointer-events-none">
                    <p
                      className={`font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,1)] leading-snug break-words ${
                        isMicro
                          ? 'text-[8px]'
                          : isMini
                          ? 'text-[10px]'
                          : isSmall
                          ? 'text-xs'
                          : isMedium
                          ? 'text-sm sm:text-base'
                          : 'text-base sm:text-lg'
                      }`}
                    >
                      {frontTextValue}
                    </p>
                  </div>
                ) : null
              ) : (
                /* PREVIEW MODE (!isFullscreen): Allow editing prize text */
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditingFront(true);
                    sound.playClick(600);
                  }}
                  className={`w-full max-w-[88%] rounded-2xl transition-all cursor-text flex flex-col items-center justify-center ${
                    isEditingFront
                      ? 'border-2 border-cyan-400 bg-black/95 shadow-2xl ring-2 ring-cyan-400/40 p-2'
                      : frontTextValue
                      ? 'border-2 border-dashed border-cyan-400/60 bg-black/75 hover:bg-black/90 shadow-lg p-1.5 sm:p-2 backdrop-blur-md'
                      : 'border-2 border-dashed border-transparent hover:border-cyan-400/50 hover:bg-black/60 p-1.5 transition-all group-hover/card:border-cyan-400/30'
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
                        placeholder="Gewinn-Text (optional)..."
                        className="w-full px-2 py-1 bg-white/10 border border-cyan-400/60 rounded text-xs text-cyan-100 focus:outline-none resize-none font-bold text-center"
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
                      {frontTextValue ? (
                        <p
                          className={`font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,1)] leading-snug break-words ${
                            isMicro
                              ? 'text-[8px]'
                              : isMini
                              ? 'text-[10px]'
                              : isSmall
                              ? 'text-xs'
                              : isMedium
                              ? 'text-sm'
                              : 'text-sm sm:text-base'
                          }`}
                        >
                          {frontTextValue}
                        </p>
                      ) : (
                        <span className="text-cyan-200/90 font-bold italic text-[10px] sm:text-xs drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] opacity-0 group-hover/card:opacity-100 transition-opacity">
                          {isMicro || isMini ? '+ Text' : '+ Text (optional)'}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="h-2" />
          </motion.div>

          {/* ======================================================== */}
          {/* SEITE 2 (BACK): MANACARDS ARTWORK & DUNKELBLAUE ZAHL     */}
          {/* Rotates from -180deg (hidden) to 0deg (visible & upright)*/}
          {/* ======================================================== */}
          <motion.div
            className={`absolute inset-0 w-full h-full rounded-[4.5%] overflow-hidden shadow-2xl bg-white flex flex-col justify-between p-2 sm:p-3 ${rarityFrameClass}`}
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
            {/* Inner Rarity Border Accent on Back */}
            {rarity === 'legendary' && (
              <div className="absolute inset-0 pointer-events-none rounded-[4.5%] border-[3px] border-orange-500/85 shadow-[inset_0_0_22px_rgba(234,88,12,0.85)] z-20" />
            )}
            {rarity === 'epic' && (
              <div className="absolute inset-0 pointer-events-none rounded-[4.5%] border-[2.5px] border-purple-500/80 shadow-[inset_0_0_20px_rgba(168,85,247,0.75)] z-20" />
            )}

            {/* ManaCards Background Image */}
            <div
              className="absolute inset-0 w-full h-full bg-no-repeat bg-cover bg-center transition-transform duration-500 pointer-events-none rounded-[4%]"
              style={{
                backgroundImage: `url(${cardBackImage})`,
                opacity: 1,
                transform: isInteracting ? 'scale(1.015)' : 'scale(1)',
              }}
            />

            {/* Subtle Holo Light Glare */}
            <div
              className="absolute inset-0 pointer-events-none z-10"
              style={{
                background: `radial-gradient(circle at ${tilt.glareX}% ${tilt.glareY}%, rgba(147, 197, 253, ${
                  isInteracting ? '0.3' : '0.06'
                }) 0%, transparent 60%)`,
              }}
            />

            {/* Top Bar on Flipped Card: Small Card Number Badge */}
            <div className="relative z-20 flex items-center justify-between px-0.5 pointer-events-none">
              <span
                className={`text-[8px] sm:text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full border backdrop-blur-sm ${
                  rarity === 'legendary'
                    ? 'bg-amber-950/85 text-amber-200 border-amber-400/60'
                    : rarity === 'epic'
                    ? 'bg-purple-950/85 text-purple-200 border-purple-400/60'
                    : 'bg-slate-950/80 text-cyan-200 border-cyan-400/50'
                }`}
              >
                #{cardIndex + 1}
              </span>
            </div>

            {/* Center Area: Big Dark-Blue Gradient Number */}
            <div className="relative z-20 w-full my-auto px-1 flex flex-col items-center justify-center">
              {isFullscreen ? (
                /* FULLSCREEN PRESENTATION MODE: Strictly NO click-to-edit on the number! Clicking flips the card. */
                <div className="w-full flex flex-col items-center justify-center p-1 pointer-events-none">
                  <span
                    className={`font-black text-transparent bg-clip-text bg-gradient-to-b from-[#020617] via-[#0f296b] to-[#1d4ed8] drop-shadow-[0_0_12px_rgba(255,255,255,0.98)] drop-shadow-[0_4px_10px_rgba(15,23,42,0.55)] tracking-tight select-none ${
                      isMicro
                        ? 'text-2xl'
                        : isMini
                        ? 'text-3xl sm:text-4xl'
                        : isSmall
                        ? 'text-4xl sm:text-5xl'
                        : isMedium
                        ? 'text-5xl sm:text-6xl'
                        : 'text-6xl sm:text-7xl md:text-8xl'
                    }`}
                    style={{
                      WebkitTextStroke: isMicro ? '0.5px rgba(255,255,255,0.7)' : '1.5px rgba(240,249,255,0.85)',
                    }}
                  >
                    {backNumValue || '0'}
                  </span>
                </div>
              ) : (
                /* PREVIEW MODE (!isFullscreen): Allow editing the number */
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditingBackNum(true);
                    sound.playClick(600);
                  }}
                  className={`w-full max-w-[90%] rounded-2xl transition-all cursor-text flex flex-col items-center justify-center ${
                    isEditingBackNum
                      ? 'border-2 border-cyan-400 bg-black/95 shadow-2xl ring-2 ring-cyan-400/40 p-2'
                      : 'border-2 border-dashed border-blue-900/40 hover:border-blue-700 bg-white/35 hover:bg-white/55 shadow-lg p-1.5 sm:p-2 backdrop-blur-[2px]'
                  }`}
                  title="Klicke hier in der Voransicht, um die Zahl anzupassen"
                >
                  {isEditingBackNum ? (
                    <div className="space-y-1.5 w-full flex flex-col items-center">
                      <input
                        type="number"
                        autoFocus
                        value={backNumValue}
                        onChange={(e) => setBackNumValue(e.target.value)}
                        placeholder="0"
                        className="w-20 sm:w-24 px-1 py-0.5 text-center bg-black border border-cyan-400 rounded text-xl sm:text-2xl font-black text-cyan-300 focus:outline-none"
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
                      {/* Prominent Dark-Blue Gradient Number */}
                      <span
                        className={`font-black text-transparent bg-clip-text bg-gradient-to-b from-[#020617] via-[#0f296b] to-[#1d4ed8] drop-shadow-[0_0_10px_rgba(255,255,255,0.95)] drop-shadow-[0_3px_8px_rgba(15,23,42,0.5)] tracking-tight ${
                          isMicro
                            ? 'text-xl'
                            : isMini
                            ? 'text-2xl sm:text-3xl'
                            : isSmall
                            ? 'text-3xl sm:text-4xl'
                            : isMedium
                            ? 'text-4xl sm:text-5xl'
                            : 'text-5xl sm:text-6xl md:text-7xl'
                        }`}
                        style={{
                          WebkitTextStroke: isMicro ? '0.5px rgba(255,255,255,0.7)' : '1.2px rgba(240,249,255,0.85)',
                        }}
                      >
                        {backNumValue || '0'}
                      </span>

                      {/* Stepper Buttons (ONLY in Preview Mode !isFullscreen & <= 16 cards) */}
                      {!isMicro && !isMini && (
                        <div
                          className="flex items-center gap-1.5 pt-0.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => changeBackNumberDelta(-1)}
                            className="w-5 h-5 sm:w-6 sm:h-6 rounded bg-slate-900/80 hover:bg-rose-600 text-white flex items-center justify-center font-bold text-xs active:scale-90"
                            title="-1"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => changeBackNumberDelta(1)}
                            className="w-5 h-5 sm:w-6 sm:h-6 rounded bg-slate-900/80 hover:bg-emerald-600 text-white flex items-center justify-center font-bold text-xs active:scale-90"
                            title="+1"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Spacer */}
            <div className="h-2" />
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};
