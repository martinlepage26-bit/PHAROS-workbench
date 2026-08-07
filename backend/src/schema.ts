/**
 * Canonical board schema: version 3 blocks.
 * Legacy v1/v2 { links, pipeline, sections } is upgraded on read.
 */

export type Meta = {
  title: string;
  subtitle: string;
  asOf: string;
  windowNewest: string;
  snap: string;
  footer: string;
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
  if (u.includes("openai.com") || u.includes("chatgpt.com")) return "OpenAI billing";
  if (u.includes("stripe.com")) return "Stripe";
  if (u.includes("shopify.com")) return "Shopify";
  if (u.includes("apple.com")) return "Apple";
  if (u.includes("base44")) return "Base44";
  if (u.includes("mail.google.com") || u.includes("gmail")) return "Open email";
  if (u.includes("drive.google.com") || u.includes("docs.google.com"))
    return "Open Drive";
  if (u.includes("granola.ai")) return "Open meeting";
  if (u.includes("github.com")) return "Open on GitHub";
  try {
    return new URL(url).hostname.replace(/^www\./, "") || "Open link";
  } catch {
    return index === 0 ? "Open" : `Open link ${index + 1}`;
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
  title: "Pharos · Workbench",
  subtitle: "",
  asOf: "",
  windowNewest: "",
  snap: "",
  footer: "",
};

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
    title: "Drive — Pharos Paper Series OS pipeline",
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

/** Canonicalize any stored payload to BoardV3. */
export function toBoardV3(raw: unknown): BoardV3 {
  const data = (raw && typeof raw === "object" ? raw : {}) as LegacyBoard;
  const meta: Meta = { ...DEFAULT_META, ...(data.meta || {}) };
  return {
    version: 3,
    meta,
    blocks: legacyToBlocks(data),
  };
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
