import React from 'react';
import { createOverlayToken } from '../lib/auth';
import { GiveawayStudioClient } from '../components/GiveawayStudioClient';

export const dynamic = 'force-dynamic';

export default async function GiveawayStudioPage() {
  const overlayKey = await createOverlayToken();
  return <GiveawayStudioClient initialOverlayKey={overlayKey} />;
}
