/**
 * Canonical board schema: version 3 blocks.
 * Legacy v1/v2 { links, pipeline, sections } is upgraded on read.
 */

/** Bump when content migrations change. Persisted on meta.content_revision. */
export const CONTENT_REVISION = 1;

export type Meta = {
  title: string;
  subtitle: string;
  asOf: string;
  windowNewest: string;
  snap: string;
  footer: string;
  /** Product copy / link migrations applied (server-owned). */
  content_revision?: number;
};

export type LinkItem = { id: string; label: string; url: string };
export type Stage = { id: string; code: string; label: string; url: string };
export type ActionLink = { label: string; url: string };

export type ListItem = {
  id: string;
  time: string;
  source: string;
  text: string;
  tag: string;
  tagKind: string;
  kind: string;
  url: string;
  links?: ActionLink[];
};

const URL_RE = /\bhttps?:\/\/[^\s<>"'`)\]]+/gi;
const MAILTO_RE = /\bmailto:[^\s<>"'`)\]]+/gi;

function extractUrls(text: string): string[] {
  const s = String(text || "");
  const found: string[] = [];
  for (const re of [URL_RE, MAILTO_RE]) {
    const m = s.match(re) || [];
    for (let u of m) {
      u = u.replace(/[.,;:!?]+$/g, "");
      if (!found.includes(u)) found.push(u);
    }
  }
  return found;
}

function guessLinkLabel(url: string, index: number): string {
  const u = (url || "").toLowerCase();
  if (u.startsWith("mailto:")) return "Email";
  if (u.includes("openai.com") || u.includes("chatgpt.com")) return "OpenAI";
  if (u.includes("stripe.com")) return "Stripe";
  if (u.includes("shopify.com")) return "Shopify";
  if (u.includes("apple.com")) return "Apple";
  if (u.includes("base44")) return "Base44";
  if (u.includes("mail.google.com") || u.includes("gmail")) return "Email";
  if (u.includes("drive.google.com") || u.includes("docs.google.com"))
    return "Drive";
  if (u.includes("granola.ai")) return "Meeting";
  if (u.includes("github.com")) return "GitHub";
  if (u.includes("calendar.google.com")) return "Calendar";
  try {
    return new URL(url).hostname.replace(/^www\./, "") || "Go";
  } catch {
    return index === 0 ? "Go" : `Link ${index + 1}`;
  }
}

export function normalizeItemLinks(item: ListItem): ListItem {
  const links: ActionLink[] = [];
  const seen = new Set<string>();
  const add = (url?: string, label?: string) => {
    if (!url) return;
    const clean = String(url).trim().replace(/[.,;:!?]+$/g, "");
    if (!clean || seen.has(clean)) return;
    seen.add(clean);
    links.push({
      label: (label && label.trim()) || guessLinkLabel(clean, links.length),
      url: clean,
    });
  };
  if (Array.isArray(item.links)) {
    for (const l of item.links) {
      if (!l) continue;
      if (typeof l === "string") add(l);
      else add(l.url, l.label);
    }
  }
  add(item.url);
  for (const u of extractUrls(item.text || "")) add(u);
  for (const u of extractUrls(item.source || "")) add(u);
  return {
    ...item,
    links,
    url: links[0]?.url || item.url || "",
  };
}

export type LinksBlock = {
  type: "links";
  id: string;
  items: LinkItem[];
};
export type PipelineBlock = {
  type: "pipeline";
  id: string;
  title: string;
  stages: Stage[];
};
export type ListBlock = {
  type: "list";
  id: string;
  title: string;
  layout: "half" | "full";
  style: "normal" | "alert";
  empty: string;
  linkLabel?: string;
  linkUrl?: string;
  items: ListItem[];
};

export type Block = LinksBlock | PipelineBlock | ListBlock;

export type BoardV3 = {
  version: 3;
  meta: Meta;
  blocks: Block[];
};

/** Legacy shapes still in D1. */
export type LegacyBoard = {
  version?: number;
  meta?: Partial<Meta>;
  links?: LinkItem[];
  pipeline?: Stage[];
  sections?: Array<{
    id: string;
    title: string;
    layout?: string;
    style?: string;
    empty?: string;
    linkLabel?: string;
    linkUrl?: string;
    items?: ListItem[];
  }>;
  blocks?: Block[];
};

const DEFAULT_META: Meta = {
  title: "Pharos",
  subtitle: "What needs you",
  asOf: "",
  windowNewest: "",
  snap: "",
  footer: "Saves when you’re signed in.",
  // content_revision intentionally omitted — only set after migrate
};

const LIST_TITLE_MAP: Record<string, string> = {
  "Needs attention": "Needs you",
  "Mail to handle": "Mail",
  "EMERAULD vault": "EMERAULD",
  "EMERAULD · Git vault": "EMERAULD",
  "Paper writing steps": "Paper path",
};

const GRAPH_URL = "files/emerauld-graph";

function isGithubEmerauld(url: string): boolean {
  return /github\.com.*EMERAULD/i.test(url || "");
}

/**
 * Product-content migrations (copy, EMERAULD graph links). Idempotent.
 * Called from toBoardV3 when meta.content_revision < CONTENT_REVISION.
 */
export function migrateBoardContent(board: BoardV3): BoardV3 {
  const meta = { ...board.meta };
  if (
    !meta.title ||
    /Workbench|D1|HttpOnly|Cloudflare/i.test(meta.title)
  ) {
    meta.title = "Pharos";
  }
  if (
    !meta.subtitle ||
    /Tasks ·|local persistence|D1|OPERATIONAL/i.test(meta.subtitle)
  ) {
    meta.subtitle = "What needs you";
  }
  if (
    !meta.footer ||
    /OPERATIONAL|server-owned|Cloudflare|Changes save automatically/i.test(
      meta.footer
    )
  ) {
    meta.footer = "Saves when you’re signed in.";
  }
  meta.content_revision = CONTENT_REVISION;

  const blocks = board.blocks.map((b) => {
    if (b.type === "pipeline") {
      let title = b.title || "Paper path";
      if (/Paper Series|Paper writing|Pharos Paper|Drive —/i.test(title)) {
        title = "Paper path";
      }
      return { ...b, title };
    }
    if (b.type === "links") {
      return {
        ...b,
        items: (b.items || []).map((l) => {
          let label = l.label;
          let url = l.url;
          if (label === "Papers hub" || label === "Method hub") label = "Papers";
          if (label === "EMERAULD" && isGithubEmerauld(url)) url = GRAPH_URL;
          if (isGithubEmerauld(url)) url = GRAPH_URL;
          return { ...l, label, url };
        }),
      };
    }
    if (b.type === "list") {
      let title = LIST_TITLE_MAP[b.title] || b.title;
      if (/EMERAULD.*git/i.test(title)) title = "EMERAULD";
      let empty = b.empty || "";
      let linkLabel = b.linkLabel || "";
      let linkUrl = b.linkUrl || "";
      if (b.id === "sec_cal" && /No meetings or deadlines|No plans/i.test(empty)) {
        empty = "Clear.";
      }
      if (b.id === "sec_granola" && /No meeting notes/i.test(empty)) {
        empty = "None yet.";
      }
      if (b.id === "sec_actions" && /Nothing urgent/i.test(empty)) {
        empty = "Clear.";
      }
      if (b.id === "sec_mail" && /Inbox clear/i.test(empty)) {
        empty = "Clear.";
      }
      if (/Open Granola/i.test(linkLabel)) linkLabel = "Granola";
      if (/Open on GitHub/i.test(linkLabel)) linkLabel = "GitHub";

      let items = b.items || [];
      if (b.id === "sec_emerauld") {
        if (isGithubEmerauld(linkUrl) || !linkUrl) {
          linkUrl = GRAPH_URL;
          linkLabel = "Open graph";
        }
        items = items
          .filter((it) => !/github\.com.*EMERAULD\/tree/i.test(it.url || ""))
          .map((it) => {
            const wasGh =
              isGithubEmerauld(it.url || "") ||
              (it.links || []).some((l) => isGithubEmerauld(l.url || ""));
            if (
              wasGh ||
              /^(Vault|Index|Areas)$/i.test(it.text || "") ||
              /github\.com.*EMERAULD/i.test(it.url || "")
            ) {
              const hubs =
                /Index|Hubs|MOC/i.test(it.text || "") || it.id === "em_2";
              return {
                ...it,
                text: hubs
                  ? "Hubs — PHAROS, Writing, Research MOCs and Home"
                  : "Knowledge graph — wikilinks across the vault",
                url: GRAPH_URL,
                kind: "LINK",
                tag: hubs ? "hubs" : "graph",
                tagKind: hubs ? "" : "c-ok",
                links: [
                  {
                    label: hubs ? "Explore" : "Open graph",
                    url: GRAPH_URL,
                  },
                ],
              };
            }
            return it;
          });
        if (!items.length) {
          items = [
            {
              id: "em_1",
              time: "",
              source: "",
              text: "Knowledge graph — wikilinks across the vault",
              tag: "graph",
              tagKind: "c-ok",
              kind: "LINK",
              url: GRAPH_URL,
              links: [{ label: "Open graph", url: GRAPH_URL }],
            },
          ];
        }
      }

      return {
        ...b,
        title,
        empty,
        linkLabel,
        linkUrl,
        items: items.map((it) => normalizeItemLinks(it)),
      };
    }
    return b;
  });

  return { version: 3, meta, blocks };
}

/** Read content_revision from raw stored JSON (pre-migration). */
export function rawContentRevision(raw: unknown): number {
  if (!raw || typeof raw !== "object") return 0;
  const meta = (raw as { meta?: { content_revision?: number } }).meta;
  const n = Number(meta?.content_revision ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function isNotionOrSlack(title: string, id = ""): boolean {
  const t = `${title} ${id}`.toLowerCase();
  return t.includes("notion") || t.includes("slack");
}

export function legacyToBlocks(data: LegacyBoard): Block[] {
  if (Array.isArray(data.blocks) && data.blocks.length) {
    return data.blocks
      .map(normalizeBlock)
      .filter((b): b is Block => b !== null);
  }

  const blocks: Block[] = [];

  blocks.push({
    type: "links",
    id: "nav",
    items: (data.links || [])
      .filter((l) => !isNotionOrSlack(l.label || "", l.id || ""))
      .map((l) => ({
        id: l.id,
        label: l.label || "",
        url: l.url || "",
      })),
  });

  blocks.push({
    type: "pipeline",
    id: "pipeline",
    title: "Paper path",
    stages: (data.pipeline || []).map((s) => ({
      id: s.id,
      code: s.code || "",
      label: s.label || "",
      url: s.url || "",
    })),
  });

  for (const s of data.sections || []) {
    if (isNotionOrSlack(s.title || "", s.id || "")) continue;
    blocks.push({
      type: "list",
      id: s.id,
      title: s.title || "Untitled",
      layout: s.layout === "full" ? "full" : "half",
      style: s.style === "alert" ? "alert" : "normal",
      empty: s.empty || "Empty",
      linkLabel: s.linkLabel || "",
      linkUrl: s.linkUrl || "",
      items: (s.items || []).map((it) =>
        normalizeItemLinks({
          id: it.id,
          time: it.time || "",
          source: it.source || "",
          text: it.text || "",
          tag: it.tag || "",
          tagKind: it.tagKind || "",
          kind: it.kind || "",
          url: it.url || "",
          links: it.links,
        })
      ),
    });
  }

  return blocks;
}

function normalizeBlock(b: Block): Block | null {
  if (!b || typeof b !== "object" || !("type" in b)) return null;
  if (b.type === "links") {
    return {
      type: "links",
      id: b.id || "nav",
      items: (b.items || [])
        .filter((l) => !isNotionOrSlack(l.label || "", l.id || ""))
        .map((l) => ({
          id: l.id,
          label: l.label || "",
          url: l.url || "",
        })),
    };
  }
  if (b.type === "pipeline") {
    return {
      type: "pipeline",
      id: b.id || "pipeline",
      title: b.title || "Pipeline",
      stages: (b.stages || []).map((s) => ({
        id: s.id,
        code: s.code || "",
        label: s.label || "",
        url: s.url || "",
      })),
    };
  }
  if (b.type === "list") {
    if (isNotionOrSlack(b.title || "", b.id || "")) return null;
    return {
      type: "list",
      id: b.id,
      title: b.title || "Untitled",
      layout: b.layout === "full" ? "full" : "half",
      style: b.style === "alert" ? "alert" : "normal",
      empty: b.empty || "Empty",
      linkLabel: b.linkLabel || "",
      linkUrl: b.linkUrl || "",
      items: (b.items || []).map((it) =>
        normalizeItemLinks({
          id: it.id,
          time: it.time || "",
          source: it.source || "",
          text: it.text || "",
          tag: it.tag || "",
          tagKind: it.tagKind || "",
          kind: it.kind || "",
          url: it.url || "",
          links: it.links,
        })
      ),
    };
  }
  return null;
}

/** Canonicalize any stored payload to BoardV3 + content migrations. */
export function toBoardV3(raw: unknown): BoardV3 {
  const data = (raw && typeof raw === "object" ? raw : {}) as LegacyBoard;
  // Stamp from raw only — never inherit CONTENT_REVISION from defaults
  const fromRev = rawContentRevision(raw);
  const meta: Meta = { ...DEFAULT_META, ...(data.meta || {}) };
  let board: BoardV3 = {
    version: 3,
    meta,
    blocks: legacyToBlocks(data),
  };
  if (fromRev < CONTENT_REVISION) {
    board = migrateBoardContent(board);
  } else {
    board = {
      ...board,
      meta: { ...board.meta, content_revision: CONTENT_REVISION },
    };
  }
  return board;
}

/** Convenience views used by some callers. */
export function linksOf(board: BoardV3): LinkItem[] {
  const b = board.blocks.find((x) => x.type === "links") as LinksBlock | undefined;
  return b?.items || [];
}

export function pipelineOf(board: BoardV3): Stage[] {
  const b = board.blocks.find((x) => x.type === "pipeline") as
    | PipelineBlock
    | undefined;
  return b?.stages || [];
}

export function listBlocksOf(board: BoardV3): ListBlock[] {
  return board.blocks.filter((x): x is ListBlock => x.type === "list");
}

export function findBlock(board: BoardV3, id: string): Block | undefined {
  return board.blocks.find((b) => b.id === id);
}

export function findListItem(
  board: BoardV3,
  sectionId: string,
  itemId: string
): { block: ListBlock; item: ListItem; index: number } | null {
  const block = findBlock(board, sectionId);
  if (!block || block.type !== "list") return null;
  const index = block.items.findIndex((i) => i.id === itemId);
  if (index < 0) return null;
  return { block, item: block.items[index]!, index };
}

export function moveInArray<T>(arr: T[], index: number, dir: number): boolean {
  const j = index + dir;
  if (j < 0 || j >= arr.length) return false;
  const [x] = arr.splice(index, 1);
  arr.splice(j, 0, x!);
  return true;
}
