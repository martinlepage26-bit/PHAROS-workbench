/** Workbench app: action dispatcher, modals, sync. */

import { createApi } from "./api.js";
import {
  emptyBoard,
  findItem,
  findSection,
  moveInArray,
  normalizeBoard,
  uid,
} from "./model.js";
import { renderBoard } from "./render.js";

const CACHE_KEY = "pharos-workbench-v2-cache";

const $ = (id) => document.getElementById(id);

function setBackendStatus(text, ok) {
  const el = $("backend-status");
  if (!el) return;
  el.textContent = text;
  el.classList.toggle("ok", !!ok);
}

function setSaveStatus(text) {
  const el = $("save-status");
  if (!el) return;
  el.textContent = text;
  el.classList.add("ok");
  clearTimeout(setSaveStatus._t);
  setSaveStatus._t = setTimeout(() => el.classList.remove("ok"), 1600);
}

const api = createApi({ onStatus: setBackendStatus });

let state = emptyBoard();
let saveTimer = null;
let remoteTimer = null;
let syncing = false;
let editCtx = null; // { kind, ... }

function cacheLocal() {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(state));
  } catch (_) {
    /* quota */
  }
}

function loadLocalCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return normalizeBoard(JSON.parse(raw));
  } catch {
    return null;
  }
}

function scheduleSave() {
  setSaveStatus("saving…");
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    cacheLocal();
    setSaveStatus("local · " + new Date().toLocaleTimeString());
    clearTimeout(remoteTimer);
    remoteTimer = setTimeout(() => syncNow(false), 500);
  }, 200);
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
  sel.innerHTML = (state.sections || [])
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
  renderBoard(state, scheduleSave);
}

/* ── item modal ─────────────────────────────────────────── */

function openItemModal(sectionId, itemId) {
  editCtx = { kind: "item", sectionId, itemId: itemId || null };
  fillSelectSections(sectionId || state.sections[0]?.id);
  let item = {
    time: "",
    source: "",
    text: "",
    tag: "",
    tagKind: "",
    kind: "",
    url: "",
  };
  if (itemId) {
    const hit = findItem(state, sectionId, itemId);
    if (hit) item = hit.item;
    $("modal-item-title").textContent = "Edit item";
    $("m-delete").style.display = "";
  } else {
    $("modal-item-title").textContent = "Add item";
    $("m-delete").style.display = "none";
  }
  $("m-time").value = item.time || "";
  $("m-source").value = item.source || "";
  $("m-text").value = item.text || "";
  $("m-tag").value = item.tag || "";
  $("m-tag-kind").value = item.tagKind || "";
  $("m-kind").value = item.kind || "";
  $("m-url").value = item.url || "";
  openModal("modal-item");
  $("m-text")?.focus();
}

function saveItemModal() {
  if (!editCtx || editCtx.kind !== "item") return;
  const sectionId = $("m-section").value;
  const sec = findSection(state, sectionId);
  if (!sec) return;
  const payload = {
    id: editCtx.itemId || uid("item"),
    time: $("m-time").value.trim(),
    source: $("m-source").value.trim(),
    text: $("m-text").value.trim(),
    tag: $("m-tag").value.trim(),
    tagKind: $("m-tag-kind").value,
    kind: $("m-kind").value,
    url: $("m-url").value.trim(),
  };
  if (editCtx.itemId && editCtx.sectionId !== sectionId) {
    const old = findSection(state, editCtx.sectionId);
    if (old) old.items = (old.items || []).filter((i) => i.id !== editCtx.itemId);
    sec.items = sec.items || [];
    sec.items.unshift(payload);
  } else if (editCtx.itemId) {
    const idx = (sec.items || []).findIndex((i) => i.id === editCtx.itemId);
    if (idx >= 0) sec.items[idx] = payload;
    else {
      sec.items = sec.items || [];
      sec.items.unshift(payload);
    }
  } else {
    sec.items = sec.items || [];
    sec.items.unshift(payload);
  }
  closeModals();
  paint();
  scheduleSave();
}

/* ── section modal ──────────────────────────────────────── */

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
    : findSection(state, id);
  if (!sec) return;
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
  const payload = {
    title: $("s-title").value.trim() || "Untitled",
    layout: $("s-layout").value,
    style: $("s-style").value,
    empty: $("s-empty").value.trim(),
    linkLabel: $("s-link-label").value.trim(),
    linkUrl: $("s-link-url").value.trim(),
  };
  if (editCtx.id === "new") {
    state.sections.push({ id: uid("sec"), items: [], ...payload });
  } else {
    const sec = findSection(state, editCtx.id);
    if (!sec) return;
    Object.assign(sec, payload);
  }
  closeModals();
  paint();
  scheduleSave();
}

/* ── pipeline / link modals ─────────────────────────────── */

function openPipeModal(id) {
  editCtx = { kind: "pipe", id: id || "new" };
  const isNew = editCtx.id === "new";
  $("p-delete").style.display = isNew ? "none" : "";
  const p = isNew
    ? { code: "", label: "", url: "" }
    : (state.pipeline || []).find((x) => x.id === id);
  if (!p) return;
  $("p-code").value = p.code || "";
  $("p-label").value = p.label || "";
  $("p-url").value = p.url || "";
  openModal("modal-pipe");
}

function savePipeModal() {
  if (!editCtx || editCtx.kind !== "pipe") return;
  const payload = {
    id: editCtx.id === "new" ? uid("pipe") : editCtx.id,
    code: $("p-code").value.trim(),
    label: $("p-label").value.trim(),
    url: $("p-url").value.trim(),
  };
  state.pipeline = state.pipeline || [];
  if (editCtx.id === "new") state.pipeline.push(payload);
  else {
    const i = state.pipeline.findIndex((x) => x.id === editCtx.id);
    if (i >= 0) state.pipeline[i] = payload;
  }
  closeModals();
  paint();
  scheduleSave();
}

function openLinkModal(id) {
  editCtx = { kind: "link", id: id || "new" };
  const isNew = editCtx.id === "new";
  $("l-delete").style.display = isNew ? "none" : "";
  const l = isNew
    ? { label: "", url: "" }
    : (state.links || []).find((x) => x.id === id);
  if (!l) return;
  $("l-label").value = l.label || "";
  $("l-url").value = l.url || "";
  openModal("modal-link");
}

function saveLinkModal() {
  if (!editCtx || editCtx.kind !== "link") return;
  const payload = {
    id: editCtx.id === "new" ? uid("link") : editCtx.id,
    label: $("l-label").value.trim() || "link",
    url: $("l-url").value.trim() || "#",
  };
  state.links = state.links || [];
  if (editCtx.id === "new") state.links.push(payload);
  else {
    const i = state.links.findIndex((x) => x.id === editCtx.id);
    if (i >= 0) state.links[i] = payload;
  }
  closeModals();
  paint();
  scheduleSave();
}

/* ── sync ───────────────────────────────────────────────── */

async function syncNow(force) {
  if (syncing) return;
  syncing = true;
  setBackendStatus("backend: syncing…", false);
  try {
    await api.saveBoard(state, { force: !!force });
    cacheLocal();
    setSaveStatus("cloud · r" + api.revision);
  } catch (e) {
    if (e.conflict) {
      const pull = confirm(
        "Board changed on server (r" +
          e.conflict.current_revision +
          "). Pull server version?"
      );
      if (pull) {
        const body = await api.loadBoard();
        state = normalizeBoard(body.data);
        paint();
        cacheLocal();
        setBackendStatus("backend: pulled · r" + api.revision, true);
      } else {
        setBackendStatus(
          "backend: conflict · r" + e.conflict.current_revision,
          false
        );
      }
    } else if (e.code === 401 || /unauthorized/i.test(e.message || "")) {
      setBackendStatus("backend: session required", false);
      $("session-banner")?.classList.add("show");
    } else {
      setBackendStatus("backend: error", false);
      console.error(e);
      alert("Sync failed: " + e.message);
    }
  } finally {
    syncing = false;
  }
}

async function bootstrap() {
  setBackendStatus("backend: connecting…", false);
  try {
    const sess = await api.sessionStatus();
    if (!sess.authenticated) {
      setBackendStatus("backend: session required", false);
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
    state = normalizeBoard(body.data);
    paint();
    cacheLocal();
    setBackendStatus(
      body.exists
        ? "backend: online · r" + api.revision
        : "backend: default · r0 (save to create)",
      true
    );
    if (!body.exists) {
      // Persist server default into D1 on first authenticated visit
      await syncNow(true);
    }
  } catch (e) {
    console.warn(e);
    setBackendStatus("backend: offline · local cache", false);
    const cached = loadLocalCache();
    if (cached) {
      state = cached;
      paint();
    }
  }
}

/* ── action map ─────────────────────────────────────────── */

const actions = {
  "item.add": (el) => openItemModal(el.dataset.section || state.sections[0]?.id, null),
  "item.edit": (el) => openItemModal(el.dataset.section, el.dataset.id),
  "item.delete": (el) => {
    if (!confirm("Delete item?")) return;
    const sec = findSection(state, el.dataset.section);
    if (!sec) return;
    sec.items = (sec.items || []).filter((i) => i.id !== el.dataset.id);
    paint();
    scheduleSave();
  },
  "item.move": (el) => {
    const sec = findSection(state, el.dataset.section);
    if (!sec) return;
    const idx = (sec.items || []).findIndex((i) => i.id === el.dataset.id);
    if (moveInArray(sec.items, idx, Number(el.dataset.dir))) {
      paint();
      scheduleSave();
    }
  },
  "section.add": () => openSectionModal("new"),
  "section.edit": (el) => openSectionModal(el.dataset.id),
  "section.move": (el) => {
    const idx = state.sections.findIndex((s) => s.id === el.dataset.id);
    if (moveInArray(state.sections, idx, Number(el.dataset.dir))) {
      paint();
      scheduleSave();
    }
  },
  "pipe.add": () => openPipeModal("new"),
  "pipe.edit": (el) => openPipeModal(el.dataset.id),
  "pipe.delete": (el) => {
    if (!confirm("Delete pipeline stage?")) return;
    state.pipeline = (state.pipeline || []).filter((p) => p.id !== el.dataset.id);
    paint();
    scheduleSave();
  },
  "pipe.move": (el) => {
    const idx = (state.pipeline || []).findIndex((p) => p.id === el.dataset.id);
    if (moveInArray(state.pipeline, idx, Number(el.dataset.dir))) {
      paint();
      scheduleSave();
    }
  },
  "link.add": () => openLinkModal("new"),
  "link.edit": (el) => openLinkModal(el.dataset.id),
  "link.move": (el) => {
    const idx = (state.links || []).findIndex((l) => l.id === el.dataset.id);
    if (moveInArray(state.links, idx, Number(el.dataset.dir))) {
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
    if (!confirm("Reset board to server default?")) return;
    try {
      const body = await api.resetBoard();
      state = normalizeBoard(body.data);
      paint();
      cacheLocal();
      setBackendStatus("backend: reset · r" + api.revision, true);
    } catch (e) {
      alert("Reset failed: " + e.message);
    }
  },
  "session.login": async () => {
    const key = $("session-key")?.value?.trim();
    if (!key) return alert("Paste API key");
    try {
      await api.login(key);
      $("session-banner")?.classList.remove("show");
      await bootstrap();
    } catch (e) {
      alert(e.message);
    }
  },
  "modal.close": () => closeModals(),
  "item.save": () => saveItemModal(),
  "item.modal-delete": () => {
    if (!editCtx?.itemId) return;
    if (!confirm("Delete this item?")) return;
    const sec = findSection(state, editCtx.sectionId);
    if (sec) sec.items = (sec.items || []).filter((i) => i.id !== editCtx.itemId);
    closeModals();
    paint();
    scheduleSave();
  },
  "section.save": () => saveSectionModal(),
  "section.modal-delete": () => {
    if (!editCtx || editCtx.id === "new") return;
    if (!confirm("Delete this entire section?")) return;
    state.sections = state.sections.filter((s) => s.id !== editCtx.id);
    closeModals();
    paint();
    scheduleSave();
  },
  "pipe.save": () => savePipeModal(),
  "pipe.modal-delete": () => {
    if (!editCtx || editCtx.id === "new") return;
    if (!confirm("Delete pipeline stage?")) return;
    state.pipeline = (state.pipeline || []).filter((p) => p.id !== editCtx.id);
    closeModals();
    paint();
    scheduleSave();
  },
  "link.save": () => saveLinkModal(),
  "link.modal-delete": () => {
    if (!editCtx || editCtx.id === "new") return;
    if (!confirm("Delete nav link?")) return;
    state.links = (state.links || []).filter((l) => l.id !== editCtx.id);
    closeModals();
    paint();
    scheduleSave();
  },
};

document.addEventListener("click", (e) => {
  const t = e.target.closest("[data-action]");
  if (!t) {
    if (e.target.classList?.contains("modal-bg")) closeModals();
    return;
  }
  const action = t.dataset.action;
  if (action === "section.rename") return; // handled on input
  const fn = actions[action];
  if (fn) {
    e.preventDefault();
    fn(t);
  }
});

document.addEventListener("input", (e) => {
  const t = e.target;
  if (t.dataset?.action === "section.rename" && t.dataset.id) {
    const sec = findSection(state, t.dataset.id);
    if (sec) {
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
      state = normalizeBoard(JSON.parse(reader.result));
      paint();
      scheduleSave();
    } catch (err) {
      alert("Import failed: " + err.message);
    }
  };
  reader.readAsText(f);
  e.target.value = "";
});

// init
paint();
bootstrap();
