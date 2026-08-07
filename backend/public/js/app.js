/** Workbench app: data-action dispatcher over v3 blocks. */

import { createApi } from "./api.js";
import {
  emptyBoard,
  ensureCoreBlocks,
  extractUrls,
  findBlock,
  findListItem,
  linksBlock,
  listBlocks,
  moveInArray,
  normalizeBoard,
  normalizeItemLinks,
  pipelineBlock,
  uid,
} from "./model.js";
import { renderBoard } from "./render.js";

const CACHE_KEY = "pharos-workbench-v3-cache";
const $ = (id) => document.getElementById(id);

function setStatus(text, kind) {
  const el = $("status-pill");
  if (!el) return;
  el.textContent = text;
  el.classList.remove("ok", "warn");
  if (kind === "ok") el.classList.add("ok");
  if (kind === "warn") el.classList.add("warn");
}

const api = createApi({
  onStatus: (text, ok) => setStatus(text, ok ? "ok" : "warn"),
});

let state = emptyBoard();
let saveTimer = null;
let remoteTimer = null;
let syncing = false;
let editCtx = null;

function cacheLocal() {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(state));
  } catch (_) {
    /* ignore */
  }
}

function loadLocalCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return ensureCoreBlocks(normalizeBoard(JSON.parse(raw)));
  } catch {
    return null;
  }
}

function scheduleSave() {
  setStatus("Saving…", "warn");
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    cacheLocal();
    clearTimeout(remoteTimer);
    remoteTimer = setTimeout(() => syncNow(false), 450);
  }, 180);
}

function closeModals() {
  document.querySelectorAll(".modal-bg").forEach((m) => m.classList.remove("open"));
  editCtx = null;
}

function openModal(id) {
  closeModals();
  $(id)?.classList.add("open");
}

function fillSelectSections(selected) {
  const sel = $("m-section");
  if (!sel) return;
  sel.innerHTML = listBlocks(state)
    .map(
      (s) =>
        `<option value="${s.id}" ${s.id === selected ? "selected" : ""}>${escapeAttr(s.title)}</option>`
    )
    .join("");
}

function escapeAttr(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

function paint() {
  ensureCoreBlocks(state);
  renderBoard(state, scheduleSave);
}

/* ── item ───────────────────────────────────────────────── */

function openItemModal(sectionId, itemId) {
  const lists = listBlocks(state);
  editCtx = {
    kind: "item",
    sectionId: sectionId || lists[0]?.id,
    itemId: itemId || null,
  };
  if (!editCtx.sectionId) {
    alert("Add a section first.");
    return;
  }
  fillSelectSections(editCtx.sectionId);
  let item = {
    time: "",
    source: "",
    text: "",
    tag: "",
    tagKind: "",
    kind: "",
    url: "",
    links: [],
  };
  if (itemId) {
    const hit = findListItem(state, editCtx.sectionId, itemId);
    if (hit) item = normalizeItemLinks(hit.item);
    $("modal-item-title").textContent = "Edit task";
    $("m-delete").style.display = "";
  } else {
    $("modal-item-title").textContent = "New task";
    $("m-delete").style.display = "none";
  }
  $("m-time").value = item.time || "";
  $("m-source").value = item.source || "";
  $("m-text").value = item.text || "";
  $("m-tag").value = item.tag || "";
  $("m-tag-kind").value = item.tagKind || "";
  $("m-kind").value = item.kind || "";
  const primary = (item.links && item.links[0]) || {
    url: item.url || "",
    label: "",
  };
  $("m-url").value = primary.url || "";
  $("m-url-label").value =
    primary.label && primary.label !== "Open" ? primary.label : "";
  const extra = (item.links || [])
    .slice(1)
    .map((l) =>
      l.label && l.label !== "Open" ? `${l.label} | ${l.url}` : l.url
    )
    .join("\n");
  $("m-more-links").value = extra;
  openModal("modal-item");
  $("m-text")?.focus();
}

function parseMoreLinks(raw) {
  const out = [];
  for (const line of String(raw || "").split(/\n+/)) {
    const s = line.trim();
    if (!s) continue;
    if (s.includes("|")) {
      const [label, ...rest] = s.split("|");
      const url = rest.join("|").trim();
      if (url) out.push({ label: label.trim() || undefined, url });
    } else if (/^(https?:|mailto:)/i.test(s)) {
      out.push({ url: s });
    } else {
      const urls = extractUrls(s);
      for (const u of urls) out.push({ url: u });
    }
  }
  return out;
}

function saveItemModal() {
  if (!editCtx || editCtx.kind !== "item") return;
  const sectionId = $("m-section").value;
  let block = findBlock(state, sectionId);
  if (!block || block.type !== "list") return;
  const mainUrl = $("m-url").value.trim();
  const mainLabel = $("m-url-label").value.trim();
  const links = [];
  if (mainUrl) links.push({ label: mainLabel || undefined, url: mainUrl });
  for (const l of parseMoreLinks($("m-more-links").value)) links.push(l);
  const payload = normalizeItemLinks({
    id: editCtx.itemId || uid("item"),
    time: $("m-time").value.trim(),
    source: $("m-source").value.trim(),
    text: $("m-text").value.trim(),
    tag: $("m-tag").value.trim(),
    tagKind: $("m-tag-kind").value,
    kind: $("m-kind").value,
    url: mainUrl,
    links,
  });
  if (editCtx.itemId && editCtx.sectionId !== sectionId) {
    const old = findBlock(state, editCtx.sectionId);
    if (old && old.type === "list") {
      old.items = old.items.filter((i) => i.id !== editCtx.itemId);
    }
    block.items.unshift(payload);
  } else if (editCtx.itemId) {
    const idx = block.items.findIndex((i) => i.id === editCtx.itemId);
    if (idx >= 0) block.items[idx] = payload;
    else block.items.unshift(payload);
  } else {
    block.items.unshift(payload);
  }
  closeModals();
  paint();
  scheduleSave();
}

/* ── section (list block) ───────────────────────────────── */

function openSectionModal(id) {
  editCtx = { kind: "section", id: id || "new" };
  const isNew = editCtx.id === "new";
  $("modal-section-title").textContent = isNew ? "New section" : "Edit section";
  $("s-delete").style.display = isNew ? "none" : "";
  const sec = isNew
    ? {
        title: "",
        layout: "half",
        style: "normal",
        empty: "Empty",
        linkLabel: "",
        linkUrl: "",
      }
    : findBlock(state, id);
  if (!sec || (!isNew && sec.type !== "list")) return;
  $("s-title").value = sec.title || "";
  $("s-layout").value = sec.layout || "half";
  $("s-style").value = sec.style || "normal";
  $("s-empty").value = sec.empty || "";
  $("s-link-label").value = sec.linkLabel || "";
  $("s-link-url").value = sec.linkUrl || "";
  openModal("modal-section");
  $("s-title")?.focus();
}

function saveSectionModal() {
  if (!editCtx || editCtx.kind !== "section") return;
  const fields = {
    title: $("s-title").value.trim() || "Untitled",
    layout: $("s-layout").value,
    style: $("s-style").value,
    empty: $("s-empty").value.trim(),
    linkLabel: $("s-link-label").value.trim(),
    linkUrl: $("s-link-url").value.trim(),
  };
  if (editCtx.id === "new") {
    state.blocks.push({
      type: "list",
      id: uid("sec"),
      items: [],
      ...fields,
    });
  } else {
    const sec = findBlock(state, editCtx.id);
    if (!sec || sec.type !== "list") return;
    Object.assign(sec, fields);
  }
  closeModals();
  paint();
  scheduleSave();
}

/* ── pipeline / links ───────────────────────────────────── */

function openPipeModal(id) {
  editCtx = { kind: "pipe", id: id || "new" };
  const isNew = editCtx.id === "new";
  $("p-delete").style.display = isNew ? "none" : "";
  const pipe = pipelineBlock(state);
  const p = isNew
    ? { code: "", label: "", url: "" }
    : pipe.stages.find((x) => x.id === id);
  if (!p) return;
  $("p-code").value = p.code || "";
  $("p-label").value = p.label || "";
  $("p-url").value = p.url || "";
  openModal("modal-pipe");
}

function savePipeModal() {
  if (!editCtx || editCtx.kind !== "pipe") return;
  const pipe = pipelineBlock(state);
  const payload = {
    id: editCtx.id === "new" ? uid("pipe") : editCtx.id,
    code: $("p-code").value.trim(),
    label: $("p-label").value.trim(),
    url: $("p-url").value.trim(),
  };
  if (editCtx.id === "new") pipe.stages.push(payload);
  else {
    const i = pipe.stages.findIndex((x) => x.id === editCtx.id);
    if (i >= 0) pipe.stages[i] = payload;
  }
  closeModals();
  paint();
  scheduleSave();
}

function openLinkModal(id) {
  editCtx = { kind: "link", id: id || "new" };
  const isNew = editCtx.id === "new";
  $("l-delete").style.display = isNew ? "none" : "";
  const links = linksBlock(state);
  const l = isNew
    ? { label: "", url: "" }
    : links.items.find((x) => x.id === id);
  if (!l) return;
  $("l-label").value = l.label || "";
  $("l-url").value = l.url || "";
  openModal("modal-link");
}

function saveLinkModal() {
  if (!editCtx || editCtx.kind !== "link") return;
  const links = linksBlock(state);
  const payload = {
    id: editCtx.id === "new" ? uid("link") : editCtx.id,
    label: $("l-label").value.trim() || "link",
    url: $("l-url").value.trim() || "#",
  };
  if (editCtx.id === "new") links.items.push(payload);
  else {
    const i = links.items.findIndex((x) => x.id === editCtx.id);
    if (i >= 0) links.items[i] = payload;
  }
  closeModals();
  paint();
  scheduleSave();
}

/* ── sync ───────────────────────────────────────────────── */

async function syncNow(force) {
  if (syncing) return;
  syncing = true;
  setStatus("Saving…", "warn");
  try {
    await api.saveBoard(state, { force: !!force });
    cacheLocal();
    setStatus("Saved", "ok");
  } catch (e) {
    if (e.conflict) {
      const pull = confirm(
        "This board was updated somewhere else. Load the latest version?"
      );
      if (pull) {
        const body = await api.loadBoard();
        state = ensureCoreBlocks(normalizeBoard(body.data));
        paint();
        cacheLocal();
        setStatus("Loaded latest", "ok");
      } else {
        setStatus("Not saved — conflict", "warn");
      }
    } else if (e.code === 401 || /unauthorized/i.test(e.message || "")) {
      setStatus("Sign in to save", "warn");
      $("session-banner")?.classList.add("show");
    } else {
      setStatus("Save failed", "warn");
      console.error(e);
      alert("Could not save: " + e.message);
    }
  } finally {
    syncing = false;
  }
}

async function bootstrap() {
  setStatus("Connecting…", "warn");
  try {
    const sess = await api.sessionStatus();
    if (!sess.authenticated) {
      setStatus("Sign in to save", "warn");
      $("session-banner")?.classList.add("show");
      const cached = loadLocalCache();
      if (cached) {
        state = cached;
        paint();
      }
      return;
    }
    $("session-banner")?.classList.remove("show");
    const body = await api.loadBoard();
    state = ensureCoreBlocks(normalizeBoard(body.data));
    // Friendly default labels if still technical
    if (state.meta) {
      if (/D1|HttpOnly|local persistence/i.test(state.meta.subtitle || "")) {
        state.meta.subtitle = "Tasks · meetings · papers · EMERAULD";
      }
      if (/OPERATIONAL WORKBENCH|server-owned|Cloudflare/i.test(state.meta.footer || "")) {
        state.meta.footer = "Changes save automatically when you are signed in.";
      }
      if (!state.meta.title || /Pharos · Workbench/i.test(state.meta.title)) {
        state.meta.title = "Pharos";
      }
    }
    const pipe = pipelineBlock(state);
    if (pipe && /Paper Series OS|Pharos Paper/i.test(pipe.title || "")) {
      pipe.title = "Paper writing steps";
    }
    paint();
    cacheLocal();
    setStatus(body.exists ? "Saved in cloud" : "Ready", "ok");
    if (body.exists && body.data && body.data.version !== 3) {
      await syncNow(true);
    } else if (!body.exists) {
      await syncNow(true);
    }
  } catch (e) {
    console.warn(e);
    setStatus("Offline — local only", "warn");
    const cached = loadLocalCache();
    if (cached) {
      state = cached;
      paint();
    }
  }
}

/* ── actions ────────────────────────────────────────────── */

const actions = {
  "menu.toggle": (el) => {
    const panel = $("more-panel");
    if (!panel) return;
    const open = panel.classList.toggle("open");
    el.setAttribute("aria-expanded", open ? "true" : "false");
  },
  "toggle-advanced": () => {
    $("item-advanced")?.classList.toggle("show");
  },
  "item.add": (el) =>
    openItemModal(el.dataset.section || listBlocks(state)[0]?.id, null),
  "item.edit": (el) => openItemModal(el.dataset.section, el.dataset.id),
  "item.delete": (el) => {
    if (!confirm("Remove this task?")) return;
    const block = findBlock(state, el.dataset.section);
    if (!block || block.type !== "list") return;
    block.items = block.items.filter((i) => i.id !== el.dataset.id);
    paint();
    scheduleSave();
  },
  "item.move": (el) => {
    const block = findBlock(state, el.dataset.section);
    if (!block || block.type !== "list") return;
    const idx = block.items.findIndex((i) => i.id === el.dataset.id);
    if (moveInArray(block.items, idx, Number(el.dataset.dir))) {
      paint();
      scheduleSave();
    }
  },
  "section.add": () => openSectionModal("new"),
  "section.edit": (el) => openSectionModal(el.dataset.id),
  "section.move": (el) => {
    // Move only among list blocks, preserving links/pipeline order at front
    const lists = listBlocks(state);
    const idx = lists.findIndex((s) => s.id === el.dataset.id);
    if (idx < 0) return;
    const dir = Number(el.dataset.dir);
    const j = idx + dir;
    if (j < 0 || j >= lists.length) return;
    const a = lists[idx];
    const b = lists[j];
    const ia = state.blocks.indexOf(a);
    const ib = state.blocks.indexOf(b);
    state.blocks[ia] = b;
    state.blocks[ib] = a;
    paint();
    scheduleSave();
  },
  "pipe.add": () => openPipeModal("new"),
  "pipe.edit": (el) => openPipeModal(el.dataset.id),
  "pipe.delete": (el) => {
    if (!confirm("Delete pipeline stage?")) return;
    const pipe = pipelineBlock(state);
    pipe.stages = pipe.stages.filter((p) => p.id !== el.dataset.id);
    paint();
    scheduleSave();
  },
  "pipe.move": (el) => {
    const pipe = pipelineBlock(state);
    const idx = pipe.stages.findIndex((p) => p.id === el.dataset.id);
    if (moveInArray(pipe.stages, idx, Number(el.dataset.dir))) {
      paint();
      scheduleSave();
    }
  },
  "link.add": () => openLinkModal("new"),
  "link.edit": (el) => openLinkModal(el.dataset.id),
  "link.move": (el) => {
    const links = linksBlock(state);
    const idx = links.items.findIndex((l) => l.id === el.dataset.id);
    if (moveInArray(links.items, idx, Number(el.dataset.dir))) {
      paint();
      scheduleSave();
    }
  },
  sync: () => syncNow(false),
  export: () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download =
      "pharos-workbench-" + new Date().toISOString().slice(0, 10) + ".json";
    a.click();
    URL.revokeObjectURL(a.href);
  },
  import: () => $("import-file")?.click(),
  reset: async () => {
    if (!confirm("Clear this board and start with a simple fresh layout?")) return;
    try {
      const body = await api.resetBoard();
      state = ensureCoreBlocks(normalizeBoard(body.data));
      paint();
      cacheLocal();
      setStatus("Fresh board", "ok");
    } catch (e) {
      alert("Could not reset: " + e.message);
    }
  },
  "session.login": async () => {
    const key = $("session-key")?.value?.trim();
    if (!key) return alert("Paste your access key first.");
    try {
      await api.login(key);
      $("session-banner")?.classList.remove("show");
      await bootstrap();
    } catch (e) {
      alert("Sign-in failed. Check the key and try again.");
    }
  },
  "modal.close": () => closeModals(),
  "item.save": () => saveItemModal(),
  "item.modal-delete": () => {
    if (!editCtx?.itemId) return;
    if (!confirm("Remove this task?")) return;
    const block = findBlock(state, editCtx.sectionId);
    if (block && block.type === "list") {
      block.items = block.items.filter((i) => i.id !== editCtx.itemId);
    }
    closeModals();
    paint();
    scheduleSave();
  },
  "section.save": () => saveSectionModal(),
  "section.modal-delete": () => {
    if (!editCtx || editCtx.id === "new") return;
    if (!confirm("Delete this whole list and its tasks?")) return;
    state.blocks = state.blocks.filter((b) => b.id !== editCtx.id);
    closeModals();
    paint();
    scheduleSave();
  },
  "pipe.save": () => savePipeModal(),
  "pipe.modal-delete": () => {
    if (!editCtx || editCtx.id === "new") return;
    if (!confirm("Delete pipeline stage?")) return;
    const pipe = pipelineBlock(state);
    pipe.stages = pipe.stages.filter((p) => p.id !== editCtx.id);
    closeModals();
    paint();
    scheduleSave();
  },
  "link.save": () => saveLinkModal(),
  "link.modal-delete": () => {
    if (!editCtx || editCtx.id === "new") return;
    if (!confirm("Delete nav link?")) return;
    const links = linksBlock(state);
    links.items = links.items.filter((l) => l.id !== editCtx.id);
    closeModals();
    paint();
    scheduleSave();
  },
};

document.addEventListener("click", (e) => {
  // close more menu when clicking outside
  if (!e.target.closest(".more-menu")) {
    $("more-panel")?.classList.remove("open");
  }
  const t = e.target.closest("[data-action]");
  if (!t) {
    if (e.target.classList?.contains("modal-bg")) closeModals();
    return;
  }
  const action = t.dataset.action;
  if (action === "section.rename") return;
  const fn = actions[action];
  if (fn) {
    e.preventDefault();
    fn(t);
  }
});

document.addEventListener("input", (e) => {
  const t = e.target;
  if (t.dataset?.action === "section.rename" && t.dataset.id) {
    const sec = findBlock(state, t.dataset.id);
    if (sec && sec.type === "list") {
      sec.title = t.value;
      scheduleSave();
    }
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModals();
  if ((e.metaKey || e.ctrlKey) && e.key === "s") {
    e.preventDefault();
    syncNow(false);
  }
});

$("import-file")?.addEventListener("change", (e) => {
  const f = e.target.files && e.target.files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      state = ensureCoreBlocks(normalizeBoard(JSON.parse(reader.result)));
      paint();
      scheduleSave();
    } catch (err) {
      alert("Import failed: " + err.message);
    }
  };
  reader.readAsText(f);
  e.target.value = "";
});

paint();
bootstrap();
