/** Session cookie + CORS + secret compare */

export interface AuthEnv {
  WORKBENCH_API_KEY: string;
  BOARD_ID: string;
  CORS_ORIGINS: string;
}

export const COOKIE = "wb_session";
export const SESSION_TTL_SEC = 60 * 60 * 24 * 30;

const encoder = new TextEncoder();

function b64url(bytes: ArrayBuffer | Uint8Array): string {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]!);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function b64urlText(text: string): string {
  return b64url(encoder.encode(text));
}

function fromB64url(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Constant-time string equality (UTF-8 bytes). */
export function timingSafeEqualStr(a: string, b: string): boolean {
  const ba = encoder.encode(a);
  const bb = encoder.encode(b);
  if (ba.length !== bb.length) {
    // still walk to reduce length-oracle noise
    let acc = ba.length ^ bb.length;
    const n = Math.max(ba.length, bb.length);
    for (let i = 0; i < n; i++) {
      acc |= (ba[i % ba.length] ?? 0) ^ (bb[i % bb.length] ?? 0);
    }
    return acc === 0 && ba.length === bb.length;
  }
  let acc = 0;
  for (let i = 0; i < ba.length; i++) acc |= ba[i]! ^ bb[i]!;
  return acc === 0;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function signSession(
  secret: string,
  boardId: string,
  exp: number
): Promise<string> {
  const payload = `v1|${boardId}|${exp}`;
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return `${b64urlText(payload)}.${b64url(sig)}`;
}

export async function verifySession(
  secret: string,
  boardId: string,
  token: string | null
): Promise<boolean> {
  if (!token || !secret) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [payloadB64, sigB64] = parts;
  let payload: string;
  try {
    payload = new TextDecoder().decode(fromB64url(payloadB64!));
  } catch {
    return false;
  }
  const bits = payload.split("|");
  if (bits.length !== 3 || bits[0] !== "v1") return false;
  if (bits[1] !== boardId) return false;
  const exp = Number(bits[2]);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false;
  try {
    const key = await hmacKey(secret);
    const sig = fromB64url(sigB64!);
    return await crypto.subtle.verify("HMAC", key, sig, encoder.encode(payload));
  } catch {
    return false;
  }
}

export function parseCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

export function sessionCookie(value: string, maxAge = SESSION_TTL_SEC): string {
  return `${COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export function clearSessionCookie(): string {
  return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

/** Same-origin friendly CORS: only listed origins (or the request origin if listed). */
export function corsHeaders(env: AuthEnv, request: Request): HeadersInit {
  const origin = request.headers.get("Origin") || "";
  const allowed = (env.CORS_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  let allow: string | null = null;
  if (origin && allowed.includes(origin)) allow = origin;
  else if (!origin) allow = null; // same-origin / non-browser: no ACAO needed

  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET,PUT,POST,DELETE,OPTIONS",
    "Access-Control-Allow-Headers":
      "Authorization, Content-Type, If-Match, X-Workbench-Client, X-CSRF-Token",
    "Access-Control-Expose-Headers": "ETag, X-Board-Revision",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
  if (allow) {
    headers["Access-Control-Allow-Origin"] = allow;
    headers["Access-Control-Allow-Credentials"] = "true";
  }
  return headers;
}

export async function authorize(
  request: Request,
  env: AuthEnv
): Promise<boolean> {
  const key = env.WORKBENCH_API_KEY;
  if (!key) return false;
  const boardId = env.BOARD_ID || "main";

  const auth = request.headers.get("Authorization") || "";
  if (auth.startsWith("Bearer ")) {
    const token = auth.slice("Bearer ".length).trim();
    if (timingSafeEqualStr(token, key)) return true;
  }

  // Query-key auth intentionally removed (logs / history / Referer).

  const cookies = parseCookies(request.headers.get("Cookie"));
  return verifySession(key, boardId, cookies[COOKIE] || null);
}
