'use client';

import { CardRarity, PlaymatTheme, TcgCardData } from '../types/card';

export type SyncEventType = 'flip' | 'eliminate' | 'level-up' | 'setup' | 'update' | 'reset';

export type RarityDecks = Record<CardRarity, TcgCardData[]>;

export interface LiveArenaSnapshot {
  updatedAt: number;
  senderId: string;
  eventType?: SyncEventType;
  rarity: CardRarity;
  theme: PlaymatTheme;
  decks: RarityDecks;
}

export type SyncStatus = 'connecting' | 'live' | 'local';

const BROKERS = [
  'wss://broker.hivemq.com:8884/mqtt',
  'wss://broker.emqx.io:8084/mqtt',
];

const BROADCAST_CHANNEL_NAME = 'manacards_live_sync_v2';
const IDB_NAME = 'manacards_live_assets_v1';
const IDB_STORE = 'images';
const IMAGE_REF_PREFIX = 'idb:';
const CHUNK_CHARS = 12_000;

const memoryImageCache = new Map<string, string>();
const dataUrlToIdCache = new Map<string, string>();
const uploadedToServer = new Set<string>();
const streamedImagesOverWs = new Set<string>();

// ============================================================================
// IndexedDB Custom Image Cache (avoids 5MB localStorage ceiling & tiny wire packets)
// ============================================================================
function openImageDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function cacheCustomImage(imageId: string, dataUrl: string): Promise<void> {
  memoryImageCache.set(imageId, dataUrl);
  const db = await openImageDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(dataUrl, imageId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function loadCachedImage(imageId: string): Promise<string | null> {
  const mem = memoryImageCache.get(imageId);
  if (mem) return mem;
  const db = await openImageDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(imageId);
      req.onsuccess = () => {
        const val = typeof req.result === 'string' ? req.result : null;
        if (val) memoryImageCache.set(imageId, val);
        resolve(val);
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function hashImageDataUrl(dataUrl: string): Promise<string> {
  const existing = dataUrlToIdCache.get(dataUrl);
  if (existing) return existing;
  const bytes = new TextEncoder().encode(dataUrl);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const hex = Array.from(new Uint8Array(digest))
    .slice(0, 10)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const id = `img_${hex}`;
  dataUrlToIdCache.set(dataUrl, id);
  return id;
}

const ALL_RARITIES: CardRarity[] = ['rare', 'epic', 'legendary'];

async function dehydrateDecksForWire(decks: RarityDecks): Promise<{
  wireDecks: RarityDecks;
  newImages: Record<string, string>;
}> {
  const newImages: Record<string, string> = {};
  const wireDecks: RarityDecks = { rare: [], epic: [], legendary: [] };

  for (const tier of ALL_RARITIES) {
    const tierCards = decks[tier] || [];
    wireDecks[tier] = await Promise.all(
      tierCards.map(async (card) => {
        const url = card.front?.imageUrl || '';
        if (url.startsWith('data:image/')) {
          const alreadyKnown = dataUrlToIdCache.get(url);
          const imgId = alreadyKnown ?? (await hashImageDataUrl(url));
          if (!memoryImageCache.has(imgId)) {
            await cacheCustomImage(imgId, url);
          }
          newImages[imgId] = url;
          return {
            ...card,
            front: {
              ...card.front,
              imageUrl: `${IMAGE_REF_PREFIX}${imgId}`,
            },
          };
        }
        return card;
      })
    );
  }

  return { wireDecks, newImages };
}

async function hydrateDecksFromWire(decks: RarityDecks): Promise<{
  hydratedDecks: RarityDecks;
  missingImageIds: string[];
}> {
  const missing = new Set<string>();
  const hydratedDecks: RarityDecks = { rare: [], epic: [], legendary: [] };

  for (const tier of ALL_RARITIES) {
    const tierCards = decks?.[tier] || [];
    hydratedDecks[tier] = await Promise.all(
      tierCards.map(async (card) => {
        const url = card.front?.imageUrl || '';
        if (url.startsWith(IMAGE_REF_PREFIX)) {
          const imgId = url.slice(IMAGE_REF_PREFIX.length);
          const cached = await loadCachedImage(imgId);
          if (cached) {
            return {
              ...card,
              front: {
                ...card.front,
                imageUrl: cached,
              },
            };
          }
          missing.add(imgId);
        }
        return card;
      })
    );
  }

  return { hydratedDecks, missingImageIds: Array.from(missing) };
}

function hasAnyDeckCards(decks: RarityDecks | undefined): boolean {
  if (!decks) return false;
  return (
    (decks.rare?.length ?? 0) > 0 ||
    (decks.epic?.length ?? 0) > 0 ||
    (decks.legendary?.length ?? 0) > 0
  );
}

// ============================================================================
// Web Crypto AES-256-GCM End-to-End Encryption
// ============================================================================
async function importAesKey(hexKey: string): Promise<CryptoKey> {
  const raw = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    raw[i] = parseInt(hexKey.slice(i * 2, i * 2 + 2), 16) || 0;
  }
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

async function encryptJson(key: CryptoKey, data: unknown): Promise<Uint8Array> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plain = new TextEncoder().encode(JSON.stringify(data));
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plain);
  const out = new Uint8Array(12 + cipher.byteLength);
  out.set(iv, 0);
  out.set(new Uint8Array(cipher), 12);
  return out;
}

async function decryptJson<T = unknown>(key: CryptoKey, packet: Uint8Array): Promise<T | null> {
  if (packet.byteLength <= 28) return null;
  try {
    const iv = new Uint8Array(packet.slice(0, 12));
    const cipher = new Uint8Array(packet.slice(12));
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher);
    return JSON.parse(new TextDecoder().decode(plain)) as T;
  } catch {
    return null;
  }
}

// ============================================================================
// Minimal Native WebSocket MQTT 3.1.1 Client (Zero Dependencies)
// ============================================================================
function encodeVarLen(len: number): number[] {
  const out: number[] = [];
  let x = len;
  do {
    let digit = x % 128;
    x = Math.floor(x / 128);
    if (x > 0) digit |= 0x80;
    out.push(digit);
  } while (x > 0);
  return out;
}

function encodeUtf8Prefixed(str: string): Uint8Array {
  const bytes = new TextEncoder().encode(str);
  const out = new Uint8Array(2 + bytes.length);
  out[0] = (bytes.length >> 8) & 0xff;
  out[1] = bytes.length & 0xff;
  out.set(bytes, 2);
  return out;
}

function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((acc, a) => acc + a.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) {
    out.set(a, offset);
    offset += a.length;
  }
  return out;
}

class MiniMqttWsClient {
  private ws: WebSocket | null = null;
  private rxBuf: Uint8Array = new Uint8Array(0);
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private disposed = false;
  private connected = false;
  private packetId = 1;

  constructor(
    private readonly brokerUrl: string,
    private readonly clientId: string,
    private readonly topics: string[],
    private readonly onMessage: (topic: string, payload: Uint8Array, isRetained: boolean) => void,
    private readonly onStatusChange: (connected: boolean, client: MiniMqttWsClient) => void
  ) {}

  start() {
    this.disposed = false;
    this.connect();
  }

  stop() {
    this.disposed = true;
    this.cleanupSocket();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  publish(topic: string, payload: Uint8Array, retain = false) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.connected) return;
    const topicBytes = encodeUtf8Prefixed(topic);
    const bodyLen = topicBytes.length + payload.length;
    const header = new Uint8Array([retain ? 0x31 : 0x30, ...encodeVarLen(bodyLen)]);
    try {
      this.ws.send(concatBytes(header, topicBytes, payload));
    } catch {
      // Socket closing; reconnect will handle
    }
  }

  private cleanupSocket() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    if (this.connected) {
      this.connected = false;
      this.onStatusChange(false, this);
    }
    if (this.ws) {
      try {
        this.ws.onopen = null;
        this.ws.onmessage = null;
        this.ws.onerror = null;
        this.ws.onclose = null;
        if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
          this.ws.close();
        }
      } catch {
        // ignore
      }
      this.ws = null;
    }
    this.rxBuf = new Uint8Array(0);
  }

  private scheduleReconnect(delayMs = 1600) {
    if (this.disposed || this.reconnectTimer) return;
    const jitter = Math.floor(Math.random() * 400);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delayMs + jitter);
  }

  private connect() {
    if (this.disposed) return;
    this.cleanupSocket();

    let ws: WebSocket;
    try {
      ws = new WebSocket(this.brokerUrl, 'mqtt');
    } catch {
      this.scheduleReconnect(2000);
      return;
    }

    ws.binaryType = 'arraybuffer';
    this.ws = ws;

    const handshakeTimeout = setTimeout(() => {
      if (!this.connected && this.ws === ws) {
        this.cleanupSocket();
        this.scheduleReconnect(1200);
      }
    }, 5000);

    ws.onopen = () => {
      if (this.disposed || this.ws !== ws) return;
      const proto = encodeUtf8Prefixed('MQTT');
      const cid = encodeUtf8Prefixed(this.clientId);
      // Protocol level 4 (3.1.1), Clean Session (0x02), KeepAlive 30s
      const varHeader = new Uint8Array([4, 0x02, 0, 30]);
      const body = concatBytes(proto, varHeader, cid);
      const header = new Uint8Array([0x10, ...encodeVarLen(body.length)]);
      ws.send(concatBytes(header, body));
    };

    ws.onmessage = (ev: MessageEvent) => {
      if (this.disposed || this.ws !== ws) return;
      const chunk = new Uint8Array(ev.data as ArrayBuffer);
      this.rxBuf = this.rxBuf.length === 0 ? chunk : concatBytes(this.rxBuf, chunk);
      this.drainBuffer(ws, handshakeTimeout);
    };

    ws.onerror = () => {
      clearTimeout(handshakeTimeout);
    };

    ws.onclose = () => {
      clearTimeout(handshakeTimeout);
      if (this.ws === ws) {
        this.cleanupSocket();
        this.scheduleReconnect(1600);
      }
    };
  }

  private drainBuffer(ws: WebSocket, handshakeTimeout: ReturnType<typeof setTimeout>) {
    while (this.rxBuf.length >= 2) {
      let multiplier = 1;
      let remLen = 0;
      let offset = 1;
      let completeHeader = false;

      while (offset < this.rxBuf.length) {
        const b = this.rxBuf[offset++];
        remLen += (b & 0x7f) * multiplier;
        if ((b & 0x80) === 0) {
          completeHeader = true;
          break;
        }
        multiplier *= 128;
        if (multiplier > 128 * 128 * 128) {
          this.cleanupSocket();
          this.scheduleReconnect(1800);
          return;
        }
      }

      if (!completeHeader) return;
      const totalLen = offset + remLen;
      if (this.rxBuf.length < totalLen) return;

      const packet = this.rxBuf.subarray(0, totalLen);
      this.rxBuf = this.rxBuf.subarray(totalLen);

      const type = packet[0] >> 4;
      if (type === 2) {
        // CONNACK
        clearTimeout(handshakeTimeout);
        const returnCode = packet[offset + 1];
        if (returnCode === 0) {
          this.connected = true;
          this.subscribeAll(ws);
          this.onStatusChange(true, this);
          this.pingTimer = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(new Uint8Array([0xc0, 0x00]));
            }
          }, 22_000);
        } else {
          this.cleanupSocket();
          this.scheduleReconnect(2000);
          return;
        }
      } else if (type === 3) {
        // PUBLISH
        const isRetained = (packet[0] & 0x01) === 1;
        const qos = (packet[0] >> 1) & 0x03;
        const topicLen = (packet[offset] << 8) | packet[offset + 1];
        const topicStart = offset + 2;
        const topicEnd = topicStart + topicLen;
        if (topicEnd <= packet.length) {
          const topic = new TextDecoder().decode(packet.subarray(topicStart, topicEnd));
          const payloadStart = qos > 0 ? topicEnd + 2 : topicEnd;
          if (payloadStart <= packet.length) {
            const payload = packet.slice(payloadStart);
            this.onMessage(topic, payload, isRetained);
          }
        }
      }
    }
  }

  private subscribeAll(ws: WebSocket) {
    if (this.topics.length === 0) return;
    const pid = this.packetId++ & 0xffff || 1;
    const pidBytes = new Uint8Array([(pid >> 8) & 0xff, pid & 0xff]);
    const topicParts: Uint8Array[] = [pidBytes];
    for (const t of this.topics) {
      topicParts.push(encodeUtf8Prefixed(t), new Uint8Array([0x00]));
    }
    const body = concatBytes(...topicParts);
    const header = new Uint8Array([0x82, ...encodeVarLen(body.length)]);
    ws.send(concatBytes(header, body));
  }
}

// ============================================================================
// High-Level LiveArenaSync Controller
// ============================================================================
type RpcPacket =
  | { kind: 'presence'; senderId: string; updatedAt: number }
  | { kind: 'bye'; senderId: string }
  | { kind: 'sync_req'; senderId: string; currentUpdatedAt: number }
  | { kind: 'image_req'; senderId: string; imageIds: string[] }
  | { kind: 'image_chunk'; senderId: string; imageId: string; index: number; total: number; chunk: string };

interface LiveSyncCallbacks {
  getLocalSnapshot: (clientId: string) => LiveArenaSnapshot;
  onRemoteSnapshot: (snapshot: LiveArenaSnapshot) => void;
  onImageHydrated: (imageId: string, dataUrl: string) => void;
  onMetaChange: (status: SyncStatus, peerCount: number) => void;
}

export class LiveArenaSyncController {
  public readonly clientId: string;
  private bc: BroadcastChannel | null = null;
  private mqttClients: MiniMqttWsClient[] = [];
  private aesKey: CryptoKey | null = null;
  private roomTopic: string | null = null;
  private peers = new Map<string, number>();
  private incomingChunks = new Map<string, { parts: string[]; received: number; total: number }>();
  private inFlightImages = new Set<string>();
  private recentImageStreams = new Map<string, number>();
  private lastAppliedKey = '';
  private highestClaimedUpdatedAt = 0;
  private highestClaimedSenderId = '';
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private safetyPollTimer: ReturnType<typeof setInterval> | null = null;
  private wsConnected = false;
  private disposed = false;

  constructor(private readonly cb: LiveSyncCallbacks) {
    const rand =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID().slice(0, 8)
        : Math.random().toString(36).slice(2, 10);
    this.clientId = `mc_${rand}`;
  }

  private getLocal(): LiveArenaSnapshot {
    return this.cb.getLocalSnapshot(this.clientId);
  }

  private publishAllMqtt(topic: string, payload: Uint8Array, retain = false) {
    for (const client of this.mqttClients) {
      if (client.isConnected()) {
        client.publish(topic, payload, retain);
      }
    }
  }

  private tryClaimSnapshot(snap: LiveArenaSnapshot | null | undefined): boolean {
    if (!snap || !snap.decks || snap.senderId === this.clientId) return false;
    if (!this.isNewerThanLocal(snap)) return false;

    const key = `${snap.updatedAt}:${snap.senderId}`;
    if (key === this.lastAppliedKey) return false;

    if (
      snap.updatedAt < this.highestClaimedUpdatedAt ||
      (snap.updatedAt === this.highestClaimedUpdatedAt &&
        snap.senderId <= this.highestClaimedSenderId)
    ) {
      return false;
    }

    this.lastAppliedKey = key;
    this.highestClaimedUpdatedAt = snap.updatedAt;
    this.highestClaimedSenderId = snap.senderId;
    return true;
  }

  async start() {
    this.disposed = false;
    const initialLocal = this.getLocal();
    this.highestClaimedUpdatedAt = initialLocal.updatedAt;
    this.highestClaimedSenderId = initialLocal.senderId;
    this.emitMeta();

    // 1. Local Dual-Window Sync via BroadcastChannel (0ms same-PC latency)
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.bc = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        this.bc.onmessage = (ev) => {
          void this.handleLocalBroadcast(ev.data);
        };
        this.bc.postMessage({
          type: 'sync_req',
          senderId: this.clientId,
          currentUpdatedAt: initialLocal.updatedAt,
        });
        this.bc.postMessage({
          type: 'presence',
          senderId: this.clientId,
          updatedAt: initialLocal.updatedAt,
        });
      } catch {
        // Ignore if disabled in restricted webview
      }
    }

    // 2. Fetch Encrypted Channel Credentials & Server Snapshot + Connect Dual MQTT Brokers
    await this.initNetworkSync();

    // 3. Periodic Presence Heartbeat & Stale Peer Cleanup
    this.heartbeatTimer = setInterval(() => {
      this.prunePeers();
      this.sendPresence();
    }, 7_000);

    // 4. Lightweight HTTP Safety Poll (?since= returns 35B when unchanged; guarantees sub-second delivery even behind strict firewalls)
    this.safetyPollTimer = setInterval(() => {
      if (!this.disposed) {
        void this.pollServerSnapshot();
      }
    }, 1_000);

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', this.handleBeforeUnload);
    }
  }

  stop() {
    this.disposed = true;
    this.handleBeforeUnload();
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', this.handleBeforeUnload);
    }
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.safetyPollTimer) clearInterval(this.safetyPollTimer);
    if (this.bc) {
      this.bc.close();
      this.bc = null;
    }
    for (const client of this.mqttClients) {
      client.stop();
    }
    this.mqttClients = [];
  }

  /** Broadcasts a user-initiated state update across tabs, dual WebSocket brokers, and Server */
  async publishSnapshot(snapshot: LiveArenaSnapshot): Promise<void> {
    if (this.disposed) return;

    if (snapshot.updatedAt >= this.highestClaimedUpdatedAt) {
      this.highestClaimedUpdatedAt = snapshot.updatedAt;
      this.highestClaimedSenderId = snapshot.senderId;
    }

    // 1. Instant local BroadcastChannel (sends full cards incl. dataUrls directly)
    if (this.bc) {
      try {
        this.bc.postMessage({ type: 'state', senderId: this.clientId, snapshot });
      } catch {
        // ignore
      }
    }

    // 2. Dehydrate custom data:image URLs into compact idb:img_<hash> refs across all 3 phases
    const { wireDecks, newImages } = await dehydrateDecksForWire(snapshot.decks);
    const wireState: LiveArenaSnapshot = {
      ...snapshot,
      decks: wireDecks,
    };

    // Prepare server backup payload
    const imagesToUpload: Record<string, string> = {};
    for (const [imgId, dataUrl] of Object.entries(newImages)) {
      if (!uploadedToServer.has(imgId)) {
        uploadedToServer.add(imgId);
        imagesToUpload[imgId] = dataUrl;
      }
    }

    const serverPostPromise = fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        state: wireState,
        images: Object.keys(imagesToUpload).length > 0 ? imagesToUpload : undefined,
      }),
    }).catch(() => {
      // Allow re-uploading image if server POST failed transiently
      for (const imgId of Object.keys(imagesToUpload)) {
        uploadedToServer.delete(imgId);
      }
    });

    // 3. Encrypted Real-Time WSS Publish across ALL connected brokers (prevents broker split-brain)
    if (this.aesKey && this.roomTopic && this.wsConnected) {
      // Stream any brand-new custom images FIRST so peers already have them cached when /state arrives
      for (const [imgId, dataUrl] of Object.entries(newImages)) {
        if (!streamedImagesOverWs.has(imgId)) {
          streamedImagesOverWs.add(imgId);
          await this.streamImageOverWs(imgId, dataUrl);
        }
      }

      const encrypted = await encryptJson(this.aesKey, wireState);
      // Use retain=false (0x30) so public MQTT brokers never throttle or drop retained payloads;
      // late joiners receive state immediately via /api/sync + sync_req RPC.
      this.publishAllMqtt(`${this.roomTopic}/state`, encrypted, false);
    }

    await serverPostPromise;
  }

  private handleBeforeUnload = () => {
    try {
      this.bc?.postMessage({ type: 'bye', senderId: this.clientId });
      if (this.aesKey && this.roomTopic && this.wsConnected) {
        void encryptJson(this.aesKey, { kind: 'bye', senderId: this.clientId } satisfies RpcPacket).then(
          (pkt) => this.publishAllMqtt(`${this.roomTopic}/rpc`, pkt, false)
        );
      }
    } catch {
      // ignore
    }
  };

  private isNewerThanLocal(incoming: { updatedAt: number; senderId: string }): boolean {
    const local = this.getLocal();
    if (incoming.updatedAt !== local.updatedAt) {
      return incoming.updatedAt > local.updatedAt;
    }
    return incoming.senderId > local.senderId;
  }

  private markPeerSeen(peerId: string) {
    if (!peerId || peerId === this.clientId) return;
    const prevSize = this.peers.size;
    this.peers.set(peerId, Date.now());
    if (this.peers.size !== prevSize) {
      this.emitMeta();
    }
  }

  private prunePeers() {
    const now = Date.now();
    let removed = false;
    for (const [id, lastSeen] of this.peers.entries()) {
      if (now - lastSeen > 20_000) {
        this.peers.delete(id);
        removed = true;
      }
    }
    if (removed) this.emitMeta();
  }

  private emitMeta() {
    const status: SyncStatus = this.wsConnected
      ? 'live'
      : this.bc
      ? 'local'
      : 'connecting';
    // Total connected windows/PCs including this window
    this.cb.onMetaChange(status, 1 + this.peers.size);
  }

  private sendPresence() {
    const updatedAt = this.getLocal().updatedAt;
    try {
      this.bc?.postMessage({ type: 'presence', senderId: this.clientId, updatedAt });
    } catch {
      // ignore
    }
    if (this.aesKey && this.roomTopic && this.wsConnected) {
      void encryptJson(this.aesKey, {
        kind: 'presence',
        senderId: this.clientId,
        updatedAt,
      } satisfies RpcPacket).then((pkt) => {
        this.publishAllMqtt(`${this.roomTopic}/rpc`, pkt, false);
      });
    }
  }

  private async handleLocalBroadcast(msg: any) {
    if (!msg || msg.senderId === this.clientId) return;

    if (msg.type === 'bye') {
      if (this.peers.delete(msg.senderId)) this.emitMeta();
      return;
    }

    if (msg.senderId) this.markPeerSeen(msg.senderId);

    if (msg.type === 'presence' || msg.type === 'sync_req') {
      const local = this.getLocal();
      const peerUpdated = typeof msg.updatedAt === 'number' ? msg.updatedAt : msg.currentUpdatedAt ?? 0;
      if (local.updatedAt > peerUpdated && hasAnyDeckCards(local.decks)) {
        this.bc?.postMessage({ type: 'state', senderId: this.clientId, snapshot: local });
      }
      return;
    }

    if (msg.type === 'state' && msg.snapshot) {
      const snap = msg.snapshot as LiveArenaSnapshot;
      if (!snap.decks || snap.senderId === this.clientId) return;
      this.markPeerSeen(snap.senderId);
      if (this.tryClaimSnapshot(snap)) {
        await this.applyIncomingWireSnapshot(snap);
      }
    }
  }

  private async initNetworkSync() {
    try {
      const res = await fetch('/api/sync', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      if (this.disposed) return;

      // Apply server snapshot if newer than local storage
      if (data?.snapshot?.decks && typeof data.snapshot.updatedAt === 'number') {
        const snap = data.snapshot as LiveArenaSnapshot;
        if (this.tryClaimSnapshot(snap)) {
          await this.applyIncomingWireSnapshot(snap);
        }
      }

      if (
        this.mqttClients.length === 0 &&
        data?.credentials?.roomTopic &&
        data?.credentials?.aesKeyHex
      ) {
        this.roomTopic = data.credentials.roomTopic;
        this.aesKey = await importAesKey(data.credentials.aesKeyHex);

        const stateTopic = `${this.roomTopic}/state`;
        const rpcTopic = `${this.roomTopic}/rpc`;

        // Connect to ALL configured brokers in parallel so two PCs never land on isolated brokers
        this.mqttClients = BROKERS.map((brokerUrl, idx) => {
          const client = new MiniMqttWsClient(
            brokerUrl,
            `${this.clientId}_b${idx}`,
            [stateTopic, rpcTopic],
            (topic, payload, isRetained) => {
              void this.handleWsMessage(topic, payload, isRetained);
            },
            (connected, sock) => {
              this.wsConnected = this.mqttClients.some((c) => c.isConnected());
              this.emitMeta();
              if (connected && this.aesKey && this.roomTopic) {
                const updatedAt = this.getLocal().updatedAt;
                void encryptJson(this.aesKey, {
                  kind: 'presence',
                  senderId: this.clientId,
                  updatedAt,
                } satisfies RpcPacket).then((pkt) => {
                  sock.publish(`${this.roomTopic}/rpc`, pkt, false);
                });
                void encryptJson(this.aesKey, {
                  kind: 'sync_req',
                  senderId: this.clientId,
                  currentUpdatedAt: updatedAt,
                } satisfies RpcPacket).then((pkt) => {
                  sock.publish(`${this.roomTopic}/rpc`, pkt, false);
                });
              }
            }
          );
          client.start();
          return client;
        });
      }
    } catch {
      // Will retry via safety poll
    }
  }

  private async pollServerSnapshot() {
    try {
      if (this.mqttClients.length === 0) {
        await this.initNetworkSync();
        return;
      }

      const since = Math.max(this.getLocal().updatedAt, this.highestClaimedUpdatedAt);
      const res = await fetch(`/api/sync?since=${since}`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      if (data?.unchanged) return;

      if (data?.snapshot?.decks && typeof data.snapshot.updatedAt === 'number') {
        const snap = data.snapshot as LiveArenaSnapshot;
        if (this.tryClaimSnapshot(snap)) {
          await this.applyIncomingWireSnapshot(snap);
        }
      }
    } catch {
      // ignore offline
    }
  }

  private async handleWsMessage(topic: string, payload: Uint8Array, isRetained: boolean) {
    if (!this.aesKey || !this.roomTopic || this.disposed) return;

    if (topic === `${this.roomTopic}/state`) {
      const snap = await decryptJson<LiveArenaSnapshot>(this.aesKey, payload);
      if (!snap || snap.senderId === this.clientId) return;

      // Only count live (non-retained) state broadcasts toward active connected devices
      if (!isRetained) {
        this.markPeerSeen(snap.senderId);
      }

      if (this.tryClaimSnapshot(snap)) {
        await this.applyIncomingWireSnapshot(snap);
      } else {
        // If our local deck is newer than the retained broker state, refresh the broker's retained snapshot
        const local = this.getLocal();
        if (
          isRetained &&
          (!snap.decks || local.updatedAt > snap.updatedAt) &&
          hasAnyDeckCards(local.decks)
        ) {
          void this.publishSnapshot(local);
        }
      }
      return;
    }

    if (topic === `${this.roomTopic}/rpc`) {
      const rpc = await decryptJson<RpcPacket>(this.aesKey, payload);
      if (!rpc || rpc.senderId === this.clientId) return;

      if (rpc.kind === 'bye') {
        if (this.peers.delete(rpc.senderId)) this.emitMeta();
        return;
      }

      this.markPeerSeen(rpc.senderId);

      if (rpc.kind === 'presence' || rpc.kind === 'sync_req') {
        const peerTs = rpc.kind === 'presence' ? rpc.updatedAt : rpc.currentUpdatedAt;
        const local = this.getLocal();
        if (local.updatedAt > peerTs && hasAnyDeckCards(local.decks)) {
          const { wireDecks } = await dehydrateDecksForWire(local.decks);
          const pkt = await encryptJson(this.aesKey, { ...local, decks: wireDecks });
          this.publishAllMqtt(`${this.roomTopic}/state`, pkt, false);
        }
      } else if (rpc.kind === 'image_req') {
        const now = Date.now();
        for (const imgId of rpc.imageIds) {
          const lastSent = this.recentImageStreams.get(imgId) ?? 0;
          if (now - lastSent < 800) continue;
          const cached = await loadCachedImage(imgId);
          if (cached) {
            this.recentImageStreams.set(imgId, Date.now());
            await this.streamImageOverWs(imgId, cached);
          }
        }
      } else if (rpc.kind === 'image_chunk') {
        await this.handleImageChunk(rpc);
      }
    }
  }

  private async applyIncomingWireSnapshot(wireSnap: LiveArenaSnapshot) {
    const { hydratedDecks, missingImageIds } = await hydrateDecksFromWire(wireSnap.decks);
    this.cb.onRemoteSnapshot({
      ...wireSnap,
      decks: hydratedDecks,
    });

    if (missingImageIds.length > 0) {
      void this.fetchMissingImages(missingImageIds);
    }
  }

  private async tryFetchImageFromServer(imgId: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/sync?image=${encodeURIComponent(imgId)}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (typeof data?.dataUrl === 'string' && data.dataUrl.startsWith('data:image/')) {
          await cacheCustomImage(imgId, data.dataUrl);
          this.cb.onImageHydrated(imgId, data.dataUrl);
          return true;
        }
      }
    } catch {
      // ignore
    }
    return false;
  }

  private async fetchMissingImages(imageIds: string[]) {
    const needWs: string[] = [];

    for (const imgId of imageIds) {
      if (this.inFlightImages.has(imgId)) continue;
      const alreadyCached = await loadCachedImage(imgId);
      if (alreadyCached) {
        this.cb.onImageHydrated(imgId, alreadyCached);
        continue;
      }

      this.inFlightImages.add(imgId);
      try {
        const ok = await this.tryFetchImageFromServer(imgId);
        if (!ok) {
          needWs.push(imgId);
        }
      } finally {
        this.inFlightImages.delete(imgId);
      }
    }

    // Ask live connected peers over encrypted WSS if server didn't have it yet
    if (needWs.length > 0 && this.aesKey && this.roomTopic && this.wsConnected) {
      const pkt = await encryptJson(this.aesKey, {
        kind: 'image_req',
        senderId: this.clientId,
        imageIds: needWs,
      } satisfies RpcPacket);
      this.publishAllMqtt(`${this.roomTopic}/rpc`, pkt, false);
    }

    // Schedule one retry against /api/sync in case sender's POST finished right after WSS packet
    if (needWs.length > 0) {
      setTimeout(() => {
        if (this.disposed) return;
        for (const imgId of needWs) {
          void loadCachedImage(imgId).then((cached) => {
            if (!cached) {
              void this.tryFetchImageFromServer(imgId);
            }
          });
        }
      }, 650);
    }
  }

  private async streamImageOverWs(imageId: string, dataUrl: string) {
    if (!this.aesKey || !this.roomTopic || !this.wsConnected) return;
    const total = Math.max(1, Math.ceil(dataUrl.length / CHUNK_CHARS));
    for (let i = 0; i < total; i++) {
      const chunk = dataUrl.slice(i * CHUNK_CHARS, (i + 1) * CHUNK_CHARS);
      const pkt = await encryptJson(this.aesKey, {
        kind: 'image_chunk',
        senderId: this.clientId,
        imageId,
        index: i,
        total,
        chunk,
      } satisfies RpcPacket);
      this.publishAllMqtt(`${this.roomTopic}/rpc`, pkt, false);
      if (i > 0 && i % 4 === 0) {
        await new Promise((r) => setTimeout(r, 4));
      }
    }
  }

  private async handleImageChunk(
    msg: Extract<RpcPacket, { kind: 'image_chunk' }>
  ) {
    const { imageId, index, total, chunk } = msg;
    if (total <= 0 || total > 120 || index < 0 || index >= total) return;

    let entry = this.incomingChunks.get(imageId);
    if (!entry || entry.total !== total) {
      entry = { parts: new Array(total).fill(''), received: 0, total };
      this.incomingChunks.set(imageId, entry);
    }
    if (!entry.parts[index]) {
      entry.parts[index] = chunk;
      entry.received += 1;
    }

    if (entry.received === entry.total) {
      this.incomingChunks.delete(imageId);
      const fullDataUrl = entry.parts.join('');
      if (fullDataUrl.startsWith('data:image/')) {
        await cacheCustomImage(imageId, fullDataUrl);
        this.cb.onImageHydrated(imageId, fullDataUrl);
      }
    }
  }
}
