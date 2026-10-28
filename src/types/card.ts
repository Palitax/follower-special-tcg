export type HoloEffectType = 'none' | 'rainbow' | 'cosmo' | 'gold' | 'silver' | 'galaxy' | 'neon';

export type CardRarity = 'rare' | 'epic' | 'legendary';

export interface CardCounter {
  id: string;
  label: string;
  value: number;
  color?: string; // tailwind color or hex
  min?: number;
  max?: number;
  step?: number;
}

export interface CardSideData {
  title: string;
  subtitle: string;
  notes: string;
  imageUrl: string;
  imageFit?: 'cover' | 'contain';
  holoEffect: HoloEffectType;
  bgColor?: string;
  textColor?: string;
  counters: CardCounter[];
  badge?: {
    text: string;
    color: string;
  };
}

export interface TcgCardData {
  id: string;
  name: string;
  isFlipped: boolean;
  rotation: number; // 0, 90, 180, 270 degrees
  borderStyle: 'classic-black' | 'gold-border' | 'silver-border' | 'neon-cyan' | 'neon-magenta' | 'minimal';
  front: CardSideData;
  back: CardSideData;
}

export type PlaymatTheme = 'dark-carbon' | 'felt-green' | 'cyber-neon' | 'mystic-violet' | 'wood-mahogany';
