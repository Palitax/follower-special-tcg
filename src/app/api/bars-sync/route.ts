import { NextRequest, NextResponse } from 'next/server';
import {
  AUTH_COOKIE,
  createOverlayToken,
  isValidOverlayKey,
  isValidSession,
} from '../../../lib/auth';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import type { BroadcastBarsSnapshot } from '../../../types/broadcastBars';

export const dynamic = 'force-dynamic';

interface ServerBarsStore {
  state: BroadcastBarsSnapshot | null;
}

const TMP_BARS_FILE = path.join(os.tmpdir(), 'manacards-broadcast-bars-v1.json');

declare global {
  // eslint-disable-next-line no-var
  var __mcBroadcastBarsStore: ServerBarsStore | undefined;
}

async function getStore(): Promise<ServerBarsStore> {
  if (globalThis.__mcBroadcastBarsStore) {
    return globalThis.__mcBroadcastBarsStore;
  }
  try {
    const raw = await fs.readFile(TMP_BARS_FILE, 'utf8');
    const parsed = JSON.parse(raw) as ServerBarsStore;
    globalThis.__mcBroadcastBarsStore = {
      state: parsed?.state ?? null,
    };
    return globalThis.__mcBroadcastBarsStore;
  } catch {
    globalThis.__mcBroadcastBarsStore = { state: null };
    return globalThis.__mcBroadcastBarsStore;
  }
}

async function persistStore(store: ServerBarsStore): Promise<void> {
  try {
    await fs.writeFile(TMP_BARS_FILE, JSON.stringify(store), 'utf8');
  } catch {
    // Ignore read-only tmp edge cases
  }
}

function isNewer(
  incoming: BroadcastBarsSnapshot,
  current: BroadcastBarsSnapshot | null
): boolean {
  if (!current) return true;
  if (incoming.updatedAt !== current.updatedAt) {
    return incoming.updatedAt > current.updatedAt;
  }
  return incoming.senderId > current.senderId;
}

export async function GET(request: NextRequest) {
  const sessionOk = await isValidSession(request.cookies.get(AUTH_COOKIE)?.value);
  const suppliedOverlayKey =
    request.nextUrl.searchParams.get('key') ?? request.headers.get('x-overlay-key');
  const overlayOk = !sessionOk && (await isValidOverlayKey(suppliedOverlayKey));

  if (!sessionOk && !overlayOk) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const store = await getStore();
  const sinceParam = request.nextUrl.searchParams.get('since');
  if (sinceParam !== null) {
    const since = Number(sinceParam);
    const curTs = store.state?.updatedAt ?? 0;
    if (!Number.isNaN(since) && curTs <= since) {
      return NextResponse.json(
        { unchanged: true, updatedAt: curTs },
        { headers: { 'Cache-Control': 'no-store, max-age=0' } }
      );
    }
  }

  const overlayKey = sessionOk ? await createOverlayToken() : undefined;

  return NextResponse.json(
    {
      overlayKey,
      snapshot: store.state,
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

    if (body?.state && typeof body.state.updatedAt === 'number') {
      const incoming = body.state as BroadcastBarsSnapshot;
      if (isNewer(incoming, store.state)) {
        store.state = incoming;
        await persistStore(store);
      }
    }

    return NextResponse.json(
      { ok: true, updatedAt: store.state?.updatedAt ?? 0 },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
}
