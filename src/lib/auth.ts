// Shared auth helpers – Edge-runtime compatible (used by middleware + route handlers).
// Credentials can be overridden via environment variables on Vercel.

export const AUTH_COOKIE = 'mc_session';
export const AUTH_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

const USERNAME = process.env.AUTH_USERNAME ?? 'manacards';
const PASSWORD = process.env.AUTH_PASSWORD ?? 'manacardsfollow';
const SECRET = process.env.AUTH_SECRET ?? 'manacards-follower-special-v1';

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function checkCredentials(username: string, password: string): boolean {
  // Evaluate both comparisons to avoid leaking which field was wrong
  const userOk = timingSafeEqual(username.trim().toLowerCase(), USERNAME.toLowerCase());
  const passOk = timingSafeEqual(password, PASSWORD);
  return userOk && passOk;
}

/** Deterministic session token – changes automatically when credentials or secret change. */
export async function createSessionToken(): Promise<string> {
  const data = new TextEncoder().encode(`${USERNAME}:${PASSWORD}:${SECRET}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function isValidSession(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  return timingSafeEqual(token, await createSessionToken());
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Deterministic encrypted channel credentials for authenticated sessions.
 * Allows multiple windows / PCs logged into the same account to discover each other
 * and end-to-end encrypt all real-time sync traffic with AES-256-GCM.
 */
export async function deriveSyncCredentials(): Promise<{
  roomTopic: string;
  aesKeyHex: string;
}> {
  const topicHash = await sha256Hex(`mc-live-topic-v3:${USERNAME}:${PASSWORD}:${SECRET}`);
  const aesKeyHex = await sha256Hex(`mc-live-aes256-v3:${USERNAME}:${PASSWORD}:${SECRET}`);
  return {
    roomTopic: `mc/arena/v3/${topicHash.slice(0, 32)}`,
    aesKeyHex,
  };
}
