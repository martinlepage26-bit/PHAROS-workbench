/**
 * PHAROS Workbench API
 * Durable board state on Cloudflare D1.
 *
 * Auth: Authorization: Bearer <WORKBENCH_API_KEY>
 * Board: GET/PUT /api/board  ·  history GET /api/board/history  ·  health GET /api/health
 */

export interface Env {
  DB: D1Database;
  WORKBENCH_API_KEY: string;
  BOARD_ID: string;
  CORS_ORIGINS: string;
}

type BoardRow = {
  id: string;
  data: string;
  revision: number;
  updated_at: string;
  updated_by: string | null;
};

function corsHeaders(env: Env, request: Request): HeadersInit {
  const origin = request.headers.get("Origin") || "";
  const allowed = (env.CORS_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  // Allow github pages, local file:// (null), localhost, and same-origin tooling
  let allow = "*";
  if (origin && (allowed.includes(origin) || allowed.includes("*"))) {
    allow = origin;
  } else if (origin.endsWith(".github.io") || origin.includes("localhost") || origin.includes("127.0.0.1")) {
    allow = origin;
  } else if (origin) {
    allow = origin; // personal workbench; open CORS for browser clients with key
  }
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET,PUT,POST,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type, If-Match, X-Workbench-Client",
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

function unauthorized(env: Env, request: Request) {
  return json(env, request, { error: "unauthorized", hint: "Send Authorization: Bearer <WORKBENCH_API_KEY>" }, 401);
}

function authorize(request: Request, env: Env): boolean {
  const key = env.WORKBENCH_API_KEY;
  if (!key) return false;
  const auth = request.headers.get("Authorization") || "";
  if (auth === `Bearer ${key}`) return true;
  const q = new URL(request.url).searchParams.get("key");
  if (q && q === key) return true;
  return false;
}

function nowIso() {
  return new Date().toISOString();
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
      if (path === "/api/health" || path === "/health") {
        return json(env, request, {
          ok: true,
          service: "pharos-workbench-api",
          time: nowIso(),
          board: boardId,
        });
      }

      // Auth required for all board ops (personal operational data)
      if (path.startsWith("/api/")) {
        if (!authorize(request, env)) return unauthorized(env, request);
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
          {
            ETag: `W/"${row.revision}"`,
            "X-Board-Revision": String(row.revision),
          }
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
            {
              ETag: `W/"${existing.revision}"`,
              "X-Board-Revision": String(existing.revision),
            }
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

      return json(env, request, { error: "not_found", path }, 404);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return json(env, request, { error: "internal", message }, 500);
    }
  },
};
