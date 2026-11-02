import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE, deriveSyncCredentials, isValidSession } from '../../../lib/auth';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

export const dynamic = 'force-dynamic';

export interface WireBoardState {
  updatedAt: number;
  senderId: string;
  eventType?: 'flip' | 'eliminate' | 'level-up' | 'setup' | 'update' | 'reset';
  rarity: 'rare' | 'epic' | 'legendary';
  theme: string;
  cards: unknown[];
}

interface ServerSyncStore {
  state: WireBoardState | null;
  images: Record<string, string>;
}

const TMP_STATE_FILE = path.join(os.tmpdir(), 'manacards-follower-special-sync-v1.json');
const MAX_CACHED_IMAGES = 60;

declare global {
  // eslint-disable-next-line no-var
  var __mcSyncStore: ServerSyncStore | undefined;
}

async function getStore(): Promise<ServerSyncStore> {
  if (globalThis.__mcSyncStore) {
    return globalThis.__mcSyncStore;
  }
  try {
    const raw = await fs.readFile(TMP_STATE_FILE, 'utf8');
    const parsed = JSON.parse(raw) as ServerSyncStore;
    globalThis.__mcSyncStore = {
      state: parsed?.state ?? null,
      images: parsed?.images ?? {},
    };
    return globalThis.__mcSyncStore;
  } catch {
    globalThis.__mcSyncStore = { state: null, images: {} };
    return globalThis.__mcSyncStore;
  }
}

async function persistStore(store: ServerSyncStore): Promise<void> {
  try {
    await fs.writeFile(TMP_STATE_FILE, JSON.stringify(store), 'utf8');
  } catch {
    // Ignore read-only tmp edge cases
  }
}

function isNewer(incoming: WireBoardState, current: WireBoardState | null): boolean {
  if (!current) return true;
  if (incoming.updatedAt !== current.updatedAt) {
    return incoming.updatedAt > current.updatedAt;
  }
  return incoming.senderId > current.senderId;
}

export async function GET(request: NextRequest) {
  const authed = await isValidSession(request.cookies.get(AUTH_COOKIE)?.value);
  if (!authed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const store = await getStore();
  const imageId = request.nextUrl.searchParams.get('image');
  if (imageId) {
    const dataUrl = store.images[imageId] ?? null;
    return NextResponse.json(
      { imageId, dataUrl },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  }

  const credentials = await deriveSyncCredentials();
  return NextResponse.json(
    {
      credentials,
      snapshot: store.state,
      availableImages: Object.keys(store.images),
    },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } }
  );
}

export async function POST(request: NextRequest) {
  const authed = await isValidSession(request.cookies.get(AUTH_COOKIE)?.value);
  if (!authed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const store = await getStore();
    let changed = false;

    if (body?.images && typeof body.images === 'object') {
      const entries = Object.entries(body.images as Record<string, unknown>);
      for (const [id, dataUrl] of entries) {
        if (typeof id === 'string' && typeof dataUrl === 'string' && dataUrl.startsWith('data:image/')) {
          store.images[id] = dataUrl;
          changed = true;
        }
      }
      const keys = Object.keys(store.images);
      if (keys.length > MAX_CACHED_IMAGES) {
        for (const oldKey of keys.slice(0, keys.length - MAX_CACHED_IMAGES)) {
          delete store.images[oldKey];
        }
      }
    }

    if (body?.state && typeof body.state.updatedAt === 'number') {
      const incoming = body.state as WireBoardState;
      if (isNewer(incoming, store.state)) {
        store.state = incoming;
        changed = true;
      }
    }

    if (changed) {
      await persistStore(store);
    }

    return NextResponse.json(
      { ok: true, updatedAt: store.state?.updatedAt ?? 0 },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
}
