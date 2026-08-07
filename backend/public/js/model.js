/**
 * Board model v3 — blocks only.
 * Legacy { links, pipeline, sections } is upgraded on load.
 */

export function uid(prefix = "id") {
  return (
    prefix +
    "_" +
    Math.random().toString(36).slice(2, 10) +
    Date.now().toString(36).slice(-4)
  );
}

const URL_RE =
  /\bhttps?:\/\/[^\s<>"'`)\]]+/gi;
const MAILTO_RE = /\bmailto:[^\s<>"'`)\]]+/gi;

/** Pull http(s)/mailto URLs from free text. */
export function extractUrls(text) {
  const s = String(text || "");
  const found = [];
  for (const re of [URL_RE, MAILTO_RE]) {
    const m = s.match(re) || [];
    for (let u of m) {
      u = u.replace(/[.,;:!?]+$/g, "");
      if (!found.includes(u)) found.push(u);
    }
  }
  return found;
}

function guessLinkLabel(url, index) {
  const u = (url || "").toLowerCase();
  if (u.startsWith("mailto:")) return "Email";
  if (u.includes("openai.com") || u.includes("chatgpt.com")) return "OpenAI billing";
  if (u.includes("stripe.com")) return "Stripe";
  if (u.includes("shopify.com")) return "Shopify";
  if (u.includes("apple.com") || u.includes("reportaproblem.apple.com"))
    return "Apple";
  if (u.includes("base44")) return "Base44";
  if (u.includes("mail.google.com") || u.includes("gmail.com")) return "Open email";
  if (u.includes("drive.google.com") || u.includes("docs.google.com"))
    return "Open Drive";
  if (u.includes("granola.ai")) return "Open meeting";
  if (u.includes("github.com")) return "Open on GitHub";
  if (u.includes("calendar.google.com")) return "Open calendar";
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host || "Open link";
  } catch {
    return index === 0 ? "Open" : "Open link " + (index + 1);
  }
}

/**
 * Normalize item.links[] from url + links + URLs found in text.
 * Always returns { url, links: [{label,url}] }.
 */
export function normalizeItemLinks(item) {
  const it = item && typeof item === "object" ? { ...item } : {};
  const links = [];
  const seen = new Set();

  function add(url, label) {
    if (!url || typeof url !== "string") return;
    const clean = url.trim().replace(/[.,;:!?]+$/g, "");
    if (!clean || seen.has(clean)) return;
    seen.add(clean);
    links.push({
      label: (label && String(label).trim()) || guessLinkLabel(clean, links.length),
      url: clean,
    });
  }

  // Explicit multi-links first
  if (Array.isArray(it.links)) {
    for (const l of it.links) {
      if (!l) continue;
      if (typeof l === "string") add(l);
      else add(l.url, l.label);
    }
  }
  // Legacy single url
  add(it.url);
  // URLs embedded in the body text (emails, paste, etc.)
  for (const u of extractUrls(it.text)) add(u);
  for (const u of extractUrls(it.source)) add(u);

  it.links = links;
  it.url = links[0]?.url || it.url || "";
  return it;
}

export function emptyBoard() {
  return {
    version: 3,
    meta: {
      title: "Pharos · Workbench",
      subtitle: "Loading…",
      asOf: "",
      windowNewest: "",
      snap: "",
      footer: "",
    },
    blocks: [
      { type: "links", id: "nav", items: [] },
      {
        type: "pipeline",
        id: "pipeline",
        title: "Drive — Pharos Paper Series OS pipeline",
        stages: [],
      },
    ],
  };
}

function isNoise(title, id = "") {
  const t = `${title || ""} ${id || ""}`.toLowerCase();
  return t.includes("notion") || t.includes("slack");
}

/** Upgrade any stored/imported payload to v3 blocks. */
export function normalizeBoard(raw) {
  if (!raw || typeof raw !== "object") return emptyBoard();
  const data = structuredClone(raw);
  const meta = Object.assign(emptyBoard().meta, data.meta || {});

  if (Array.isArray(data.blocks) && data.blocks.length) {
    const blocks = data.blocks
      .map(normalizeBlock)
      .filter(Boolean);
    return { version: 3, meta, blocks };
  }

  // Legacy v1/v2
  const blocks = [];
  blocks.push({
    type: "links",
    id: "nav",
    items: (data.links || [])
      .filter((l) => !isNoise(l.label, l.id))
      .map((l) => ({
        id: l.id || uid("link"),
        label: l.label || "",
        url: l.url || "",
      })),
  });
  blocks.push({
    type: "pipeline",
    id: "pipeline",
    title: "Drive — Pharos Paper Series OS pipeline",
    stages: (data.pipeline || []).map((s) => ({
      id: s.id || uid("pipe"),
      code: s.code || "",
      label: s.label || "",
      url: s.url || "",
    })),
  });
  for (const s of data.sections || []) {
    if (isNoise(s.title, s.id)) continue;
    blocks.push({
      type: "list",
      id: s.id || uid("sec"),
      title: s.title || "Untitled",
      layout: s.layout === "full" ? "full" : "half",
      style: s.style === "alert" ? "alert" : "normal",
      empty: s.empty || "Empty",
      linkLabel: s.linkLabel || "",
      linkUrl: s.linkUrl || "",
      items: (s.items || []).map((it) =>
        normalizeItemLinks({
          id: it.id || uid("item"),
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
  return { version: 3, meta, blocks };
}

function normalizeBlock(b) {
  if (!b || !b.type) return null;
  if (b.type === "links") {
    return {
      type: "links",
      id: b.id || "nav",
      items: (b.items || [])
        .filter((l) => !isNoise(l.label, l.id))
        .map((l) => ({
          id: l.id || uid("link"),
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
        id: s.id || uid("pipe"),
        code: s.code || "",
        label: s.label || "",
        url: s.url || "",
      })),
    };
  }
  if (b.type === "list") {
    if (isNoise(b.title, b.id)) return null;
    return {
      type: "list",
      id: b.id || uid("sec"),
      title: b.title || "Untitled",
      layout: b.layout === "full" ? "full" : "half",
      style: b.style === "alert" ? "alert" : "normal",
      empty: b.empty || "Empty",
      linkLabel: b.linkLabel || "",
      linkUrl: b.linkUrl || "",
      items: (b.items || []).map((it) =>
        normalizeItemLinks({
          id: it.id || uid("item"),
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

export function linksBlock(state) {
  return (
    (state.blocks || []).find((b) => b.type === "links") || {
      type: "links",
      id: "nav",
      items: [],
    }
  );
}

export function pipelineBlock(state) {
  return (
    (state.blocks || []).find((b) => b.type === "pipeline") || {
      type: "pipeline",
      id: "pipeline",
      title: "Pipeline",
      stages: [],
    }
  );
}

export function listBlocks(state) {
  return (state.blocks || []).filter((b) => b.type === "list");
}

export function findBlock(state, id) {
  return (state.blocks || []).find((b) => b.id === id) || null;
}

export function findListItem(state, sectionId, itemId) {
  const block = findBlock(state, sectionId);
  if (!block || block.type !== "list") return null;
  const index = block.items.findIndex((i) => i.id === itemId);
  if (index < 0) return null;
  return { block, item: block.items[index], index };
}

export function moveInArray(arr, index, dir) {
  const j = index + dir;
  if (j < 0 || j >= arr.length) return false;
  const [x] = arr.splice(index, 1);
  arr.splice(j, 0, x);
  return true;
}

export function kindClass(k) {
  return (
    {
      DOC: "k-doc",
      MD: "k-md",
      HTML: "k-html",
      JSON: "k-json",
      ZIP: "k-zip",
      LINK: "k-link",
    }[k] || ""
  );
}

export function ensureCoreBlocks(state) {
  if (!state.blocks) state.blocks = [];
  if (!state.blocks.some((b) => b.type === "links")) {
    state.blocks.unshift({ type: "links", id: "nav", items: [] });
  }
  if (!state.blocks.some((b) => b.type === "pipeline")) {
    state.blocks.splice(1, 0, {
      type: "pipeline",
      id: "pipeline",
      title: "Drive — Pharos Paper Series OS pipeline",
      stages: [],
    });
  }
  return state;
}
