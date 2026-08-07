/**
 * PHAROS Workbench API
 * Same-origin UI via Workers Assets; board on D1; HttpOnly session cookie.
 */

import {
  authorize,
  clearSessionCookie,
  COOKIE,
  corsHeaders,
  SESSION_TTL_SEC,
  sessionCookie,
  signSession,
  timingSafeEqualStr,
  type AuthEnv,
} from "./auth";
import {
  defaultBoardData,
  deleteBoard,
  getBoard,
  listHistory,
  parseBoardData,
  sanitizeBoard,
  writeBoard,
} from "./board";

export interface Env extends AuthEnv {
  DB: D1Database;
  ASSETS: Fetcher;
}

function json(
  env: Env,
  request: Request,
  body: unknown,
  status = 200,
  extra: HeadersInit = {}
): Response {
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

function boardIdOf(env: Env, url: URL): string {
  return url.searchParams.get("board") || env.BOARD_ID || "main";
}

function parseExpectedRevision(
  request: Request,
  body: { expected_revision?: number | null }
): number | null {
  const ifMatch = request.headers.get("If-Match");
  if (ifMatch) {
    const m = ifMatch.match(/(\d+)/);
    if (m) return Number(m[1]);
  }
  if (body.expected_revision === undefined || body.expected_revision === null) {
    return null;
  }
  return Number(body.expected_revision);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(env, request),
      });
    }

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";
    const boardId = boardIdOf(env, url);

    try {
      // ── Session ────────────────────────────────────────────────
      if (path === "/api/session/status" && request.method === "GET") {
        const ok = await authorize(request, env);
        return json(env, request, {
          authenticated: ok,
          mode: "cookie-or-bearer",
          cookie: COOKIE,
          board: boardId,
        });
      }

      if (path === "/api/session/login" && request.method === "POST") {
        let body: { key?: string } = {};
        try {
          body = (await request.json()) as { key?: string };
        } catch {
          body = {};
        }
        if (!body.key || !timingSafeEqualStr(body.key, env.WORKBENCH_API_KEY)) {
          return json(env, request, { error: "invalid_key" }, 401);
        }
        const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SEC;
        const token = await signSession(env.WORKBENCH_API_KEY, boardId, exp);
        return json(
          env,
          request,
          { ok: true, expires_at: new Date(exp * 1000).toISOString() },
          200,
          { "Set-Cookie": sessionCookie(token) }
        );
      }

      if (path === "/api/session/bootstrap" && request.method === "GET") {
        const key = url.searchParams.get("key") || "";
        if (!key || !timingSafeEqualStr(key, env.WORKBENCH_API_KEY)) {
          return json(env, request, { error: "invalid_key" }, 401);
        }
        const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SEC;
        const token = await signSession(env.WORKBENCH_API_KEY, boardId, exp);
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

      if (
        path === "/api/session/logout" &&
        (request.method === "POST" || request.method === "GET")
      ) {
        return json(env, request, { ok: true }, 200, {
          "Set-Cookie": clearSessionCookie(),
        });
      }

      if (path === "/api/health" || path === "/health") {
        return json(env, request, {
          ok: true,
          service: "pharos-workbench-api",
          time: new Date().toISOString(),
          board: boardId,
          auth: "httponly-cookie-or-bearer",
        });
      }

      // ── Board API (auth required) ──────────────────────────────
      if (path.startsWith("/api/")) {
        if (!(await authorize(request, env))) {
          return json(
            env,
            request,
            {
              error: "unauthorized",
              hint: "POST /api/session/login or open /api/session/bootstrap once",
            },
            401
          );
        }
      }

      if (path === "/api/board" && request.method === "GET") {
        const row = await getBoard(env.DB, boardId);
        if (!row) {
          // Server-owned empty: offer default without writing until client PUTs
          return json(
            env,
            request,
            {
              board_id: boardId,
              revision: 0,
              updated_at: null,
              exists: false,
              data: defaultBoardData(),
            },
            200,
            { ETag: 'W/"0"', "X-Board-Revision": "0" }
          );
        }
        const data = sanitizeBoard(parseBoardData(row) || defaultBoardData());
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
        const client =
          body.client ||
          request.headers.get("X-Workbench-Client") ||
          "web";
        const expected = parseExpectedRevision(request, body);

        let data = body.data as ReturnType<typeof defaultBoardData>;
        try {
          data = sanitizeBoard(data);
        } catch {
          /* keep raw */
        }

        try {
          const result = await writeBoard(env.DB, boardId, data, {
            expectedRevision: expected,
            client,
          });
          if (!result.ok) {
            return json(
              env,
              request,
              {
                error: "revision_conflict",
                current_revision: result.current_revision,
                expected_revision: result.expected_revision,
                updated_at: result.updated_at,
              },
              409,
              {
                ETag: `W/"${result.current_revision}"`,
                "X-Board-Revision": String(result.current_revision),
              }
            );
          }
          return json(
            env,
            request,
            {
              ok: true,
              board_id: boardId,
              revision: result.revision,
              updated_at: result.updated_at,
            },
            result.created ? 201 : 200,
            {
              ETag: `W/"${result.revision}"`,
              "X-Board-Revision": String(result.revision),
            }
          );
        } catch (e) {
          if (e instanceof Error && e.message === "payload_too_large") {
            return json(env, request, { error: "payload too large" }, 413);
          }
          throw e;
        }
      }

      if (path === "/api/board" && request.method === "DELETE") {
        const deleted = await deleteBoard(env.DB, boardId);
        return json(env, request, { ok: true, deleted });
      }

      if (path === "/api/board/history" && request.method === "GET") {
        const limit = Math.min(Number(url.searchParams.get("limit") || 20), 100);
        const events = await listHistory(env.DB, boardId, limit);
        return json(env, request, { board_id: boardId, events });
      }

      if (path === "/api/board/reset" && request.method === "POST") {
        const data = defaultBoardData();
        const result = await writeBoard(env.DB, boardId, data, {
          expectedRevision: null,
          client:
            request.headers.get("X-Workbench-Client") || "reset",
        });
        if (!result.ok) {
          return json(env, request, { error: "conflict", ...result }, 409);
        }
        return json(env, request, {
          ok: true,
          revision: result.revision,
          data,
        });
      }

      if (path.startsWith("/api/")) {
        return json(env, request, { error: "not_found", path }, 404);
      }

      if (env.ASSETS) return env.ASSETS.fetch(request);
      return json(env, request, { error: "not_found", path }, 404);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return json(env, request, { error: "internal", message }, 500);
    }
  },
};
