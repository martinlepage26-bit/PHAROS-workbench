/**
 * PHAROS Workbench API + UI
 * - Static UI from assets (same origin)
 * - Board state on D1
 * - Auth: HttpOnly session cookie (preferred) or Bearer WORKBENCH_API_KEY
 */

export interface Env {
  DB: D1Database;
  WORKBENCH_API_KEY: string;
  BOARD_ID: string;
  CORS_ORIGINS: string;
  ASSETS: Fetcher;
}

type BoardRow = {
  id: string;
  data: string;
  revision: number;
  updated_at: string;
  updated_by: string | null;
};

const COOKIE = "wb_session";
const SESSION_TTL_SEC = 60 * 60 * 24 * 30; // 30 days
const encoder = new TextEncoder();

function corsHeaders(env: Env, request: Request): HeadersInit {
  const origin = request.headers.get("Origin") || "";
  const allow = origin || "*";
  return {
    "Access-Control-Allow-Origin": allow === "null" ? "null" : allow,
    "Access-Control-Allow-Methods": "GET,PUT,POST,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type, If-Match, X-Workbench-Client",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Expose-Headers": "ETag, X-Board-Revision",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(env: Env, request: Request, body: unknown, status = 200, extra: HeadersInit = {}) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...corsHeaders(env, request),
      ...extra,
    },
  });
}

function nowIso() {
  return new Date().toISOString();
}

function b64url(bytes: ArrayBuffer | Uint8Array): string {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
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

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

async function signSession(secret: string, exp: number): Promise<string> {
  const payload = `v1|main|${exp}`;
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return `${b64urlText(payload)}.${b64url(sig)}`;
}

async function verifySession(secret: string, token: string | null): Promise<boolean> {
  if (!token || !secret) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [payloadB64, sigB64] = parts;
  let payload: string;
  try {
    payload = new TextDecoder().decode(fromB64url(payloadB64));
  } catch {
    return false;
  }
  const bits = payload.split("|");
  if (bits.length !== 3 || bits[0] !== "v1") return false;
  const exp = Number(bits[2]);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false;
  try {
    const key = await hmacKey(secret);
    const sig = fromB64url(sigB64);
    // subtle.verify wants ArrayBuffer
    const ok = await crypto.subtle.verify("HMAC", key, sig, encoder.encode(payload));
    return ok;
  } catch {
    return false;
  }
}

function parseCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    out[k] = decodeURIComponent(v);
  }
  return out;
}

function sessionCookie(value: string, maxAge = SESSION_TTL_SEC): string {
  // Secure + HttpOnly + SameSite=Lax — same-origin Worker UI
  return `${COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

function clearSessionCookie(): string {
  return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

async function authorize(request: Request, env: Env): Promise<boolean> {
  const key = env.WORKBENCH_API_KEY;
  if (!key) return false;

  const auth = request.headers.get("Authorization") || "";
  if (auth === `Bearer ${key}`) return true;

  const url = new URL(request.url);
  const q = url.searchParams.get("key");
  if (q && q === key) return true;

  const cookies = parseCookies(request.headers.get("Cookie"));
  if (await verifySession(key, cookies[COOKIE] || null)) return true;

  return false;
}

async function getBoard(env: Env, boardId: string): Promise<BoardRow | null> {
  return await env.DB.prepare(
    "SELECT id, data, revision, updated_at, updated_by FROM boards WHERE id = ?"
  )
    .bind(boardId)
    .first<BoardRow>();
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(env, request) });
    }

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";
    const boardId = url.searchParams.get("board") || env.BOARD_ID || "main";

    try {
      // ── Session endpoints ──────────────────────────────────────────
      if (path === "/api/session/status" && request.method === "GET") {
        const ok = await authorize(request, env);
        return json(env, request, {
          authenticated: ok,
          mode: "cookie-or-bearer",
          cookie: COOKIE,
        });
      }

      if (path === "/api/session/login" && request.method === "POST") {
        let body: { key?: string } = {};
        try {
          body = (await request.json()) as { key?: string };
        } catch {
          body = {};
        }
        if (!body.key || body.key !== env.WORKBENCH_API_KEY) {
          return json(env, request, { error: "invalid_key" }, 401);
        }
        const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SEC;
        const token = await signSession(env.WORKBENCH_API_KEY, exp);
        return json(
          env,
          request,
          { ok: true, expires_at: new Date(exp * 1000).toISOString() },
          200,
          { "Set-Cookie": sessionCookie(token) }
        );
      }

      // One-shot browser bootstrap: sets HttpOnly cookie and redirects home
      if (path === "/api/session/bootstrap" && request.method === "GET") {
        const key = url.searchParams.get("key") || "";
        if (!key || key !== env.WORKBENCH_API_KEY) {
          return json(env, request, { error: "invalid_key" }, 401);
        }
        const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SEC;
        const token = await signSession(env.WORKBENCH_API_KEY, exp);
        const dest = new URL("/", url.origin);
        dest.searchParams.set("session", "ok");
        return new Response(null, {
          status: 302,
          headers: {
            Location: dest.toString(),
            "Set-Cookie": sessionCookie(token),
            "Cache-Control": "no-store",
          },
        });
      }

      if (path === "/api/session/logout" && (request.method === "POST" || request.method === "GET")) {
        return json(
          env,
          request,
          { ok: true },
          200,
          { "Set-Cookie": clearSessionCookie() }
        );
      }

      if (path === "/api/health" || path === "/health") {
        return json(env, request, {
          ok: true,
          service: "pharos-workbench-api",
          time: nowIso(),
          board: boardId,
          auth: "httponly-cookie-or-bearer",
        });
      }

      // ── Board API (auth required) ──────────────────────────────────
      if (path.startsWith("/api/")) {
        if (!(await authorize(request, env))) {
          return json(
            env,
            request,
            {
              error: "unauthorized",
              hint: "Open /api/session/bootstrap?key=… once, or POST /api/session/login, or send Bearer key",
            },
            401
          );
        }
      }

      if (path === "/api/board" && request.method === "GET") {
        const row = await getBoard(env, boardId);
        if (!row) {
          return json(
            env,
            request,
            { board_id: boardId, revision: 0, updated_at: null, data: null, exists: false },
            200,
            { ETag: 'W/"0"', "X-Board-Revision": "0" }
          );
        }
        let data: unknown = null;
        try {
          data = JSON.parse(row.data);
        } catch {
          data = row.data;
        }
        return json(
          env,
          request,
          {
            board_id: row.id,
            revision: row.revision,
            updated_at: row.updated_at,
            updated_by: row.updated_by,
            exists: true,
            data,
          },
          200,
          { ETag: `W/"${row.revision}"`, "X-Board-Revision": String(row.revision) }
        );
      }

      if (path === "/api/board" && request.method === "PUT") {
        const body = (await request.json()) as {
          data?: unknown;
          expected_revision?: number | null;
          client?: string;
        };
        if (body.data === undefined || body.data === null) {
          return json(env, request, { error: "data required" }, 400);
        }
        const payload = JSON.stringify(body.data);
        if (payload.length > 4_500_000) {
          return json(env, request, { error: "payload too large (max ~4.5MB)" }, 413);
        }

        const client = body.client || request.headers.get("X-Workbench-Client") || "web";
        const ifMatch = request.headers.get("If-Match");
        let expected =
          body.expected_revision === undefined || body.expected_revision === null
            ? null
            : Number(body.expected_revision);
        if (ifMatch) {
          const m = ifMatch.match(/(\d+)/);
          if (m) expected = Number(m[1]);
        }

        const existing = await getBoard(env, boardId);
        const ts = nowIso();

        if (!existing) {
          const rev = 1;
          await env.DB.batch([
            env.DB.prepare(
              "INSERT INTO boards (id, data, revision, updated_at, updated_by) VALUES (?, ?, ?, ?, ?)"
            ).bind(boardId, payload, rev, ts, client),
            env.DB.prepare(
              "INSERT INTO board_events (board_id, revision, action, created_at, payload) VALUES (?, ?, ?, ?, ?)"
            ).bind(boardId, rev, "create", ts, JSON.stringify({ client })),
          ]);
          return json(
            env,
            request,
            { ok: true, board_id: boardId, revision: rev, updated_at: ts },
            201,
            { ETag: `W/"${rev}"`, "X-Board-Revision": String(rev) }
          );
        }

        if (expected !== null && expected !== existing.revision) {
          return json(
            env,
            request,
            {
              error: "revision_conflict",
              current_revision: existing.revision,
              expected_revision: expected,
              updated_at: existing.updated_at,
            },
            409,
            { ETag: `W/"${existing.revision}"`, "X-Board-Revision": String(existing.revision) }
          );
        }

        const rev = existing.revision + 1;
        await env.DB.batch([
          env.DB.prepare(
            "UPDATE boards SET data = ?, revision = ?, updated_at = ?, updated_by = ? WHERE id = ?"
          ).bind(payload, rev, ts, client, boardId),
          env.DB.prepare(
            "INSERT INTO board_events (board_id, revision, action, created_at, payload) VALUES (?, ?, ?, ?, ?)"
          ).bind(boardId, rev, "update", ts, JSON.stringify({ client, from: existing.revision })),
        ]);

        return json(
          env,
          request,
          { ok: true, board_id: boardId, revision: rev, updated_at: ts },
          200,
          { ETag: `W/"${rev}"`, "X-Board-Revision": String(rev) }
        );
      }

      if (path === "/api/board" && request.method === "DELETE") {
        const existing = await getBoard(env, boardId);
        if (!existing) return json(env, request, { ok: true, deleted: false });
        const ts = nowIso();
        await env.DB.batch([
          env.DB.prepare("DELETE FROM boards WHERE id = ?").bind(boardId),
          env.DB.prepare(
            "INSERT INTO board_events (board_id, revision, action, created_at, payload) VALUES (?, ?, ?, ?, ?)"
          ).bind(boardId, existing.revision + 1, "delete", ts, null),
        ]);
        return json(env, request, { ok: true, deleted: true });
      }

      if (path === "/api/board/history" && request.method === "GET") {
        const limit = Math.min(Number(url.searchParams.get("limit") || 20), 100);
        const { results } = await env.DB.prepare(
          "SELECT id, board_id, revision, action, created_at, payload FROM board_events WHERE board_id = ? ORDER BY id DESC LIMIT ?"
        )
          .bind(boardId, limit)
          .all();
        return json(env, request, { board_id: boardId, events: results || [] });
      }

      if (path.startsWith("/api/")) {
        return json(env, request, { error: "not_found", path }, 404);
      }

      // Non-API routes: normally served by Workers Assets (run_worker_first=/api/*).
      // Fallback if a non-api path reaches the Worker:
      if (env.ASSETS) {
        return env.ASSETS.fetch(request);
      }
      return json(env, request, { error: "not_found", path }, 404);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return json(env, request, { error: "internal", message }, 500);
    }
  },
};
