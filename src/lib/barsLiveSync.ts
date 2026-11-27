'use client';

import {
  BroadcastBarsSnapshot,
  ShowcasePreset,
  normalizeBroadcastBarsSnapshot,
} from '../types/broadcastBars';
import {
  cacheCustomImage,
  hashImageDataUrl,
  loadCachedImage,
} from './liveSync';

export const BARS_STORAGE_KEY = 'mc_broadcast_bars_state_v1';
const BARS_BROADCAST_CHANNEL = 'manacards_broadcast_bars_sync_v1';
const IMAGE_REF_PREFIX = 'idb:';

const uploadedBarsImages = new Set<string>();

export type BarsClientRole = 'studio' | 'overlay';

interface BarsSyncCallbacks {
  role: BarsClientRole;
  overlayKey?: string | null;
  getLocalSnapshot: (clientId: string) => BroadcastBarsSnapshot;
  onRemoteSnapshot: (snapshot: BroadcastBarsSnapshot) => void;
  onUnauthorized?: () => void;
}

async function dehydrateShowcases(showcases: ShowcasePreset[]): Promise<{
  wireShowcases: ShowcasePreset[];
  newImages: Record<string, string>;
}> {
  const newImages: Record<string, string> = {};
  const wireShowcases = await Promise.all(
    showcases.map(async (preset) => ({
      ...preset,
      images: await Promise.all(
        preset.images.map(async (im) => {
          if (im.url.startsWith('data:image/')) {
            const imgId = await hashImageDataUrl(im.url);
            await cacheCustomImage(imgId, im.url);
            newImages[imgId] = im.url;
            return { ...im, url: `${IMAGE_REF_PREFIX}${imgId}` };
          }
          return im;
        })
      ),
    }))
  );
  return { wireShowcases, newImages };
}

export async function hydrateBarsSnapshot(
  snapshot: BroadcastBarsSnapshot,
  fetchImageFromServer?: (imageId: string) => Promise<string | null>
): Promise<BroadcastBarsSnapshot> {
  const hydratedShowcases = await Promise.all(
    snapshot.showcases.map(async (preset) => ({
      ...preset,
      images: await Promise.all(
        preset.images.map(async (im) => {
          if (im.url.startsWith(IMAGE_REF_PREFIX)) {
            const imgId = im.url.slice(IMAGE_REF_PREFIX.length);
            let cached = await loadCachedImage(imgId);
            if (!cached && fetchImageFromServer) {
              cached = await fetchImageFromServer(imgId);
              if (cached) {
                await cacheCustomImage(imgId, cached);
              }
            }
            if (cached) {
              return { ...im, url: cached };
            }
          }
          return im;
        })
      ),
    }))
  );
  return { ...snapshot, showcases: hydratedShowcases };
}

export class BroadcastBarsSyncController {
  public readonly clientId: string;
  private bc: BroadcastChannel | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private disposed = false;
  private lastUpdatedAt = 0;

  constructor(private readonly cb: BarsSyncCallbacks) {
    const rand =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID().slice(0, 8)
        : Math.random().toString(36).slice(2, 10);
    this.clientId = `mc_bars_${cb.role}_${rand}`;
  }

  private get isReadOnly(): boolean {
    return this.cb.role === 'overlay';
  }

  private buildUrl(extra?: Record<string, string>): string {
    const params = new URLSearchParams(extra);
    if (this.cb.overlayKey) {
      params.set('key', this.cb.overlayKey);
    }
    const qs = params.toString();
    return qs ? `/api/bars-sync?${qs}` : '/api/bars-sync';
  }

  private fetchServerImage = async (imageId: string): Promise<string | null> => {
    try {
      const res = await fetch(this.buildUrl({ image: imageId }), {
        cache: 'no-store',
        headers: this.cb.overlayKey
          ? { 'x-overlay-key': this.cb.overlayKey }
          : undefined,
      });
      if (!res.ok) return null;
      const data = await res.json();
      return typeof data?.dataUrl === 'string' && data.dataUrl.startsWith('data:image/')
        ? data.dataUrl
        : null;
    } catch {
      return null;
    }
  };

  async start(): Promise<void> {
    this.disposed = false;
    const local = this.cb.getLocalSnapshot(this.clientId);
    this.lastUpdatedAt = local.updatedAt;

    // 1. Instant same-machine sync via BroadcastChannel (0ms latency)
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.bc = new BroadcastChannel(BARS_BROADCAST_CHANNEL);
        this.bc.onmessage = (ev: MessageEvent) => {
          const msg = ev.data;
          if (!msg || msg.senderId === this.clientId) return;

          if (msg.type === 'state' && msg.snapshot) {
            void this.applyIncoming(msg.snapshot);
          } else if (msg.type === 'sync_req' && !this.isReadOnly) {
            const cur = this.cb.getLocalSnapshot(this.clientId);
            if (cur.updatedAt > (msg.since ?? 0)) {
              this.bc?.postMessage({
                type: 'state',
                senderId: this.clientId,
                snapshot: cur,
              });
            }
          }
        };

        this.bc.postMessage({
          type: 'sync_req',
          senderId: this.clientId,
          since: local.updatedAt,
        });
      } catch {
        // Ignore inside restricted contexts
      }
    }

    // 2. Initial server fetch
    await this.pollServer(true);

    // 3. Lightweight delta polling (?since= returns ~35B when unchanged)
    this.pollTimer = setInterval(() => {
      if (!this.disposed) {
        void this.pollServer(false);
      }
    }, 1200);
  }

  stop(): void {
    this.disposed = true;
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    if (this.bc) {
      this.bc.close();
      this.bc = null;
    }
  }

  async publish(snapshot: BroadcastBarsSnapshot): Promise<void> {
    if (this.disposed || this.isReadOnly) return;
    if (snapshot.updatedAt >= this.lastUpdatedAt) {
      this.lastUpdatedAt = snapshot.updatedAt;
    }

    // Dehydrate showcase images to compact idb: references for localStorage & HTTP sync
    const { wireShowcases, newImages } = await dehydrateShowcases(snapshot.showcases);
    const wireSnapshot: BroadcastBarsSnapshot = {
      ...snapshot,
      showcases: wireShowcases,
    };

    // 1. Local storage persistence (always compact, never overflows 5MB limit)
    try {
      localStorage.setItem(BARS_STORAGE_KEY, JSON.stringify(wireSnapshot));
    } catch {
      // ignore
    }

    // 2. Instant BroadcastChannel push (full snapshot with hydrated dataUrls)
    try {
      this.bc?.postMessage({
        type: 'state',
        senderId: this.clientId,
        snapshot,
      });
    } catch {
      // ignore
    }

    // 3. Push compact state + only un-uploaded images to server store
    const imagesToUpload: Record<string, string> = {};
    for (const [imgId, dataUrl] of Object.entries(newImages)) {
      if (!uploadedBarsImages.has(imgId)) {
        uploadedBarsImages.add(imgId);
        imagesToUpload[imgId] = dataUrl;
      }
    }

    try {
      const res = await fetch('/api/bars-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          state: wireSnapshot,
          ...(Object.keys(imagesToUpload).length > 0 ? { images: imagesToUpload } : {}),
        }),
      });
      if (!res.ok) {
        for (const imgId of Object.keys(imagesToUpload)) {
          uploadedBarsImages.delete(imgId);
        }
      }
    } catch {
      for (const imgId of Object.keys(imagesToUpload)) {
        uploadedBarsImages.delete(imgId);
      }
    }
  }

  private async applyIncoming(raw: BroadcastBarsSnapshot) {
    if (this.disposed) return;
    const normalized = normalizeBroadcastBarsSnapshot(raw, this.clientId);
    if (normalized.updatedAt <= this.lastUpdatedAt) return;
    this.lastUpdatedAt = normalized.updatedAt;

    try {
      const { wireShowcases } = await dehydrateShowcases(normalized.showcases);
      localStorage.setItem(
        BARS_STORAGE_KEY,
        JSON.stringify({ ...normalized, showcases: wireShowcases })
      );
    } catch {
      // ignore
    }

    const hydrated = await hydrateBarsSnapshot(normalized, this.fetchServerImage);
    if (!this.disposed) {
      this.cb.onRemoteSnapshot(hydrated);
    }
  }

  private async pollServer(initial: boolean): Promise<void> {
    try {
      const url = initial
        ? this.buildUrl()
        : this.buildUrl({ since: String(this.lastUpdatedAt) });
      const res = await fetch(url, {
        cache: 'no-store',
        headers: this.cb.overlayKey
          ? { 'x-overlay-key': this.cb.overlayKey }
          : undefined,
      });
      if (res.status === 401) {
        this.cb.onUnauthorized?.();
        return;
      }
      if (!res.ok) return;
      const data = await res.json();
      if (data?.unchanged) return;
      if (data?.snapshot) {
        await this.applyIncoming(data.snapshot);
      } else if (initial && !this.isReadOnly) {
        const local = this.cb.getLocalSnapshot(this.clientId);
        if (local.updatedAt > 0) {
          void this.publish(local);
        }
      }
    } catch {
      // Transient network hiccup; next poll recovers
    }
  }
}
