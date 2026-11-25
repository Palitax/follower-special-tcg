'use client';

import React from 'react';
import {
  BroadcastDesign,
  RotatorBarSettings,
  RotatorSlide,
  TickerBarSettings,
  TickerItem,
} from '../types/broadcastBars';
import { SocialRotatorBar } from './SocialRotatorBar';
import { LiveTickerBar } from './LiveTickerBar';
import { MinimalLowerThird, MinimalTicker } from './MinimalBars';

interface BroadcastRotatorProps {
  design: BroadcastDesign;
  slides: RotatorSlide[];
  settings: RotatorBarSettings;
  previewSlideId?: string | null;
  scale?: number;
}

/** Renders the social rotator in the selected design language */
export const BroadcastRotator: React.FC<BroadcastRotatorProps> = ({ design, ...props }) =>
  design === 'mana-wood' ? <SocialRotatorBar {...props} /> : <MinimalLowerThird {...props} />;

interface BroadcastTickerProps {
  design: BroadcastDesign;
  items: TickerItem[];
  settings: TickerBarSettings;
  className?: string;
}

/** Renders the horizontal ticker in the selected design language */
export const BroadcastTicker: React.FC<BroadcastTickerProps> = ({ design, ...props }) =>
  design === 'mana-wood' ? <LiveTickerBar {...props} /> : <MinimalTicker {...props} />;
