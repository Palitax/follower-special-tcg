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
import { WhatnotLowerThird, WhatnotTicker } from './WhatnotBars';
import { TickerCycleStatus } from './useTickerCycle';

interface BroadcastRotatorProps {
  design: BroadcastDesign;
  slides: RotatorSlide[];
  settings: RotatorBarSettings;
  previewSlideId?: string | null;
  scale?: number;
  onCycleStatus?: (status: {
    isResting: boolean;
    restRemainingSec: number;
    slideIndex: number;
    totalEnabled: number;
  }) => void;
}

/** Renders the social rotator in the selected design language */
export const BroadcastRotator: React.FC<BroadcastRotatorProps> = ({ design, ...props }) =>
  design === 'mana-wood' ? <SocialRotatorBar {...props} /> : <WhatnotLowerThird {...props} />;

interface BroadcastTickerProps {
  design: BroadcastDesign;
  items: TickerItem[];
  settings: TickerBarSettings;
  className?: string;
  scale?: number;
  forcePreviewVisible?: boolean;
  onCycleStatus?: (status: TickerCycleStatus) => void;
}

/** Renders the horizontal ticker in the selected design language */
export const BroadcastTicker: React.FC<BroadcastTickerProps> = ({ design, ...props }) =>
  design === 'mana-wood' ? <LiveTickerBar {...props} /> : <WhatnotTicker {...props} />;
