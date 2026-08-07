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
export type ListItem = {
  id: string;
  time: string;
  source: string;
  text: string;
  tag: string;
  tagKind: string;
  kind: string;
  url: string;
};

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
      items: (s.items || []).map((it) => ({
        id: it.id,
        time: it.time || "",
        source: it.source || "",
        text: it.text || "",
        tag: it.tag || "",
        tagKind: it.tagKind || "",
        kind: it.kind || "",
        url: it.url || "",
      })),
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
      items: (b.items || []).map((it) => ({
        id: it.id,
        time: it.time || "",
        source: it.source || "",
        text: it.text || "",
        tag: it.tag || "",
        tagKind: it.tagKind || "",
        kind: it.kind || "",
        url: it.url || "",
      })),
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
