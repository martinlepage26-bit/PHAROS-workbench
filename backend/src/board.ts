/** D1 board read/write with revision lock and event prune. */

import { buildDefaultBoard, type BoardData } from "./default-board";

export type BoardRow = {
  id: string;
  data: string;
  revision: number;
  updated_at: string;
  updated_by: string | null;
};

export type WriteResult =
  | { ok: true; revision: number; updated_at: string; created: boolean }
  | {
      ok: false;
      conflict: true;
      current_revision: number;
      expected_revision: number;
      updated_at: string;
    };

const MAX_EVENTS = 100;

function nowIso(): string {
  return new Date().toISOString();
}

export async function getBoard(
  db: D1Database,
  boardId: string
): Promise<BoardRow | null> {
  return await db
    .prepare(
      "SELECT id, data, revision, updated_at, updated_by FROM boards WHERE id = ?"
    )
    .bind(boardId)
    .first<BoardRow>();
}

export function parseBoardData(row: BoardRow | null): BoardData | null {
  if (!row) return null;
  try {
    return JSON.parse(row.data) as BoardData;
  } catch {
    return null;
  }
}

/** Strip Notion/Slack leftovers if any older boards still carry them. */
export function sanitizeBoard(data: BoardData): BoardData {
  const sections = (data.sections || []).filter((s) => {
    const t = (s.title || "").toLowerCase();
    const id = (s.id || "").toLowerCase();
    return !t.includes("notion") && !t.includes("slack") && !id.includes("notion") && !id.includes("slack");
  });
  const links = (data.links || []).filter((l) => {
    const lab = (l.label || "").toLowerCase();
    return !lab.includes("notion") && !lab.includes("slack");
  });
  return { ...data, sections, links };
}

export async function writeBoard(
  db: D1Database,
  boardId: string,
  data: unknown,
  opts: {
    expectedRevision: number | null;
    client: string;
  }
): Promise<WriteResult> {
  const payload = JSON.stringify(data);
  if (payload.length > 4_500_000) {
    throw new Error("payload_too_large");
  }

  const existing = await getBoard(db, boardId);
  const ts = nowIso();
  const client = opts.client || "web";

  if (!existing) {
    const rev = 1;
    await db.batch([
      db
        .prepare(
          "INSERT INTO boards (id, data, revision, updated_at, updated_by) VALUES (?, ?, ?, ?, ?)"
        )
        .bind(boardId, payload, rev, ts, client),
      db
        .prepare(
          "INSERT INTO board_events (board_id, revision, action, created_at, payload) VALUES (?, ?, ?, ?, ?)"
        )
        .bind(boardId, rev, "create", ts, JSON.stringify({ client })),
    ]);
    await pruneEvents(db, boardId);
    return { ok: true, revision: rev, updated_at: ts, created: true };
  }

  if (
    opts.expectedRevision !== null &&
    opts.expectedRevision !== existing.revision
  ) {
    return {
      ok: false,
      conflict: true,
      current_revision: existing.revision,
      expected_revision: opts.expectedRevision,
      updated_at: existing.updated_at,
    };
  }

  const rev = existing.revision + 1;
  await db.batch([
    db
      .prepare(
        "UPDATE boards SET data = ?, revision = ?, updated_at = ?, updated_by = ? WHERE id = ?"
      )
      .bind(payload, rev, ts, client, boardId),
    db
      .prepare(
        "INSERT INTO board_events (board_id, revision, action, created_at, payload) VALUES (?, ?, ?, ?, ?)"
      )
      .bind(
        boardId,
        rev,
        "update",
        ts,
        JSON.stringify({ client, from: existing.revision })
      ),
  ]);
  await pruneEvents(db, boardId);
  return { ok: true, revision: rev, updated_at: ts, created: false };
}

export async function deleteBoard(
  db: D1Database,
  boardId: string
): Promise<boolean> {
  const existing = await getBoard(db, boardId);
  if (!existing) return false;
  const ts = nowIso();
  await db.batch([
    db.prepare("DELETE FROM boards WHERE id = ?").bind(boardId),
    db
      .prepare(
        "INSERT INTO board_events (board_id, revision, action, created_at, payload) VALUES (?, ?, ?, ?, ?)"
      )
      .bind(boardId, existing.revision + 1, "delete", ts, null),
  ]);
  return true;
}

export async function listHistory(
  db: D1Database,
  boardId: string,
  limit: number
) {
  const { results } = await db
    .prepare(
      "SELECT id, board_id, revision, action, created_at, payload FROM board_events WHERE board_id = ? ORDER BY id DESC LIMIT ?"
    )
    .bind(boardId, limit)
    .all();
  return results || [];
}

async function pruneEvents(db: D1Database, boardId: string): Promise<void> {
  // Keep newest MAX_EVENTS rows per board
  await db
    .prepare(
      `DELETE FROM board_events WHERE board_id = ? AND id NOT IN (
         SELECT id FROM board_events WHERE board_id = ? ORDER BY id DESC LIMIT ?
       )`
    )
    .bind(boardId, boardId, MAX_EVENTS)
    .run();
}

export function defaultBoardData(): BoardData {
  return buildDefaultBoard();
}
