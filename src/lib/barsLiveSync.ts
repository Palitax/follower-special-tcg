'use client';

import {
  BroadcastBarsSnapshot,
  normalizeBroadcastBarsSnapshot,
} from '../types/broadcastBars';

export const BARS_STORAGE_KEY = 'mc_broadcast_bars_state_v1';
const BARS_BROADCAST_CHANNEL = 'manacards_broadcast_bars_sync_v1';

export type BarsClientRole = 'studio' | 'overlay';

interface BarsSyncCallbacks {
  role: BarsClientRole;
  overlayKey?: string | null;
  getLocalSnapshot: (clientId: string) => BroadcastBarsSnapshot;
  onRemoteSnapshot: (snapshot: BroadcastBarsSnapshot) => void;
  onUnauthorized?: () => void;
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
            this.applyIncoming(msg.snapshot);
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
    }, 1400);
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

    // 1. Local storage persistence
    try {
      localStorage.setItem(BARS_STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
      // ignore
    }

    // 2. Instant BroadcastChannel push
    try {
      this.bc?.postMessage({
        type: 'state',
        senderId: this.clientId,
        snapshot,
      });
    } catch {
      // ignore
    }

    // 3. Push to server store for cross-device / isolated OBS CEF sync
    try {
      await fetch('/api/bars-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: snapshot }),
      });
    } catch {
      // Retry happens on next edit
    }
  }

  private applyIncoming(raw: BroadcastBarsSnapshot) {
    if (this.disposed) return;
    const normalized = normalizeBroadcastBarsSnapshot(raw, this.clientId);
    if (normalized.updatedAt <= this.lastUpdatedAt) return;
    this.lastUpdatedAt = normalized.updatedAt;
    try {
      localStorage.setItem(BARS_STORAGE_KEY, JSON.stringify(normalized));
    } catch {
      // ignore
    }
    this.cb.onRemoteSnapshot(normalized);
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
        this.applyIncoming(data.snapshot);
      } else if (initial && !this.isReadOnly) {
        // Seed server with local studio snapshot if server is fresh
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
