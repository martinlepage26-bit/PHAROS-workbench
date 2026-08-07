/** Board model: normalize + mutate helpers. */

export function uid(prefix = "id") {
  return (
    prefix +
    "_" +
    Math.random().toString(36).slice(2, 10) +
    Date.now().toString(36).slice(-4)
  );
}

export function emptyBoard() {
  return {
    version: 2,
    meta: {
      title: "Pharos · Workbench",
      subtitle: "Loading…",
      asOf: "",
      windowNewest: "",
      snap: "",
      footer: "",
    },
    links: [],
    pipeline: [],
    sections: [],
  };
}

/** Drop Notion/Slack leftovers; ensure arrays exist. */
export function normalizeBoard(raw) {
  const data = raw && typeof raw === "object" ? structuredClone(raw) : emptyBoard();
  data.version = data.version || 2;
  data.meta = data.meta || emptyBoard().meta;
  data.links = Array.isArray(data.links) ? data.links : [];
  data.pipeline = Array.isArray(data.pipeline) ? data.pipeline : [];
  data.sections = Array.isArray(data.sections) ? data.sections : [];

  data.sections = data.sections.filter((s) => {
    const t = (s.title || "").toLowerCase();
    const id = (s.id || "").toLowerCase();
    return (
      !t.includes("notion") &&
      !t.includes("slack") &&
      !id.includes("notion") &&
      !id.includes("slack")
    );
  });
  data.links = data.links.filter((l) => {
    const lab = (l.label || "").toLowerCase();
    return !lab.includes("notion") && !lab.includes("slack");
  });

  for (const s of data.sections) {
    s.items = Array.isArray(s.items) ? s.items : [];
    s.layout = s.layout === "full" ? "full" : "half";
    s.style = s.style === "alert" ? "alert" : "normal";
  }
  return data;
}

export function findSection(state, id) {
  return (state.sections || []).find((s) => s.id === id) || null;
}

export function findItem(state, sectionId, itemId) {
  const sec = findSection(state, sectionId);
  if (!sec) return null;
  const index = (sec.items || []).findIndex((i) => i.id === itemId);
  if (index < 0) return null;
  return { section: sec, item: sec.items[index], index };
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
