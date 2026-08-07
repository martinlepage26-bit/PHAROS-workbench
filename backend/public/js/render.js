/** Friendly board render. */

import {
  kindClass,
  linksBlock,
  listBlocks,
  pipelineBlock,
} from "./model.js";

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function tagClass(kind) {
  if (kind === "c-money") return "money";
  if (kind === "c-decision") return "decision";
  if (kind === "c-ok") return "ok";
  return "";
}

export function bindMeta(state) {
  const title = document.getElementById("page-title");
  const sub = document.getElementById("page-subtitle");
  if (title) title.textContent = state.meta?.title || "Pharos";
  if (sub) sub.textContent = state.meta?.subtitle || "Your work board";
  document.title = state.meta?.title || "Pharos Workbench";
  const foot = document.getElementById("footer-note");
  if (foot) {
    foot.textContent =
      state.meta?.footer ||
      "Changes save automatically when you are signed in.";
  }
}

function renderLinks(state) {
  const nav = document.getElementById("nav-links");
  if (!nav) return;
  const links = linksBlock(state).items || [];
  nav.innerHTML =
    links
      .map((l) => {
        const external = /^https?:/i.test(l.url || "");
        return `<a class="chip-link" href="${esc(l.url)}" ${
          external ? 'target="_blank" rel="noopener"' : ""
        }>${esc(l.label)}</a>`;
      })
      .join("") +
    `<button type="button" class="chip-link edit-links" data-action="link.add">+ Link</button>`;
}

function renderPipeline(block) {
  const stages = block.stages || [];
  if (!stages.length) {
    return `<div class="empty">No paper steps yet.</div>
      <div class="card-foot">
        <button class="btn sm" type="button" data-action="pipe.add">+ Add step</button>
      </div>`;
  }
  return (
    `<div class="pipeline">` +
    stages
      .map((p, i) => {
        const body = `
        <a class="pipe-step" href="${esc(p.url || "#")}" ${
          p.url ? 'target="_blank" rel="noopener"' : 'onclick="return false"'
        }>
          <strong>${esc(p.code || "·")}</strong>
          <span>${esc(p.label || "Step")}</span>
        </a>
        <div class="row-actions" style="margin-top:4px;justify-content:center">
          <button class="btn sm icon" type="button" data-action="pipe.edit" data-id="${esc(p.id)}" title="Edit">✎</button>
          <button class="btn sm icon" type="button" data-action="pipe.move" data-id="${esc(p.id)}" data-dir="-1" ${i === 0 ? "disabled" : ""} title="Move left">‹</button>
          <button class="btn sm icon" type="button" data-action="pipe.move" data-id="${esc(p.id)}" data-dir="1" ${i === stages.length - 1 ? "disabled" : ""} title="Move right">›</button>
          <button class="btn sm icon danger" type="button" data-action="pipe.delete" data-id="${esc(p.id)}" title="Remove">×</button>
        </div>`;
        return `<div style="flex:1 1 100px;min-width:92px">${body}</div>${
          i < stages.length - 1 ? '<div class="pipe-arrow">→</div>' : ""
        }`;
      })
      .join("") +
    `</div>
    <div class="card-foot">
      <button class="btn sm" type="button" data-action="pipe.add">+ Add step</button>
    </div>`
  );
}

function renderItem(section, item, index) {
  const n = (section.items || []).length;
  const kind = item.kind
    ? `<span class="tag">${esc(item.kind)}</span> `
    : "";
  const who = item.source
    ? `<span class="who">${esc(item.source)}</span>${item.text ? " — " : ""}`
    : "";
  const text = item.text ? esc(item.text) : "";
  const main = item.url
    ? `${kind}<a href="${esc(item.url)}" target="_blank" rel="noopener">${who}${text || esc(item.url)}</a>`
    : `${kind}${who}${text}`;
  const tag = item.tag
    ? `<div class="tag ${tagClass(item.tagKind)}">${esc(item.tag)}</div>`
    : "";

  return `
    <div class="row">
      <div class="when">${esc(item.time || "—")}</div>
      <div class="what">${main || "<span class='empty'>Empty task</span>"}${tag}</div>
      <div class="row-actions">
        <button class="btn sm icon" type="button" data-action="item.edit" data-section="${esc(section.id)}" data-id="${esc(item.id)}" title="Edit">✎</button>
        <button class="btn sm icon" type="button" data-action="item.move" data-section="${esc(section.id)}" data-id="${esc(item.id)}" data-dir="-1" ${index === 0 ? "disabled" : ""} title="Up">↑</button>
        <button class="btn sm icon" type="button" data-action="item.move" data-section="${esc(section.id)}" data-id="${esc(item.id)}" data-dir="1" ${index === n - 1 ? "disabled" : ""} title="Down">↓</button>
        <button class="btn sm icon danger" type="button" data-action="item.delete" data-section="${esc(section.id)}" data-id="${esc(item.id)}" title="Delete">×</button>
      </div>
    </div>`;
}

function renderListBlock(sec, listIndex, listCount) {
  const items = sec.items || [];
  return `
    <div class="card ${sec.layout === "full" ? "full" : ""} ${sec.style === "alert" ? "alert" : ""}">
      <div class="card-head">
        <input class="sec-title field" data-action="section.rename" data-id="${esc(sec.id)}" value="${esc(sec.title)}" aria-label="List name">
        <span class="count">${items.length}</span>
        <div class="row-actions">
          <button class="btn sm icon" type="button" data-action="section.edit" data-id="${esc(sec.id)}" title="List settings">⚙</button>
          <button class="btn sm icon" type="button" data-action="section.move" data-id="${esc(sec.id)}" data-dir="-1" ${listIndex === 0 ? "disabled" : ""} title="Move up">↑</button>
          <button class="btn sm icon" type="button" data-action="section.move" data-id="${esc(sec.id)}" data-dir="1" ${listIndex === listCount - 1 ? "disabled" : ""} title="Move down">↓</button>
        </div>
      </div>
      <div class="items">
        ${
          items.length
            ? items.map((it, i) => renderItem(sec, it, i)).join("")
            : `<div class="empty">${esc(sec.empty || "Nothing here yet.")}</div>`
        }
      </div>
      ${
        sec.linkUrl
          ? `<a class="glink" href="${esc(sec.linkUrl)}" target="_blank" rel="noopener">${esc(sec.linkLabel || "Open →")}</a>`
          : ""
      }
      <div class="card-foot">
        <button class="btn sm primary" type="button" data-action="item.add" data-section="${esc(sec.id)}">+ Add</button>
        <button class="btn sm ghost" type="button" data-action="section.edit" data-id="${esc(sec.id)}">Edit list</button>
      </div>
    </div>`;
}

export function renderBoard(state, _onMeta) {
  bindMeta(state);
  renderLinks(state);

  const board = document.getElementById("board");
  if (!board) return;

  const pipe = pipelineBlock(state);
  const lists = listBlocks(state);

  let html = `
    <div class="card full">
      <div class="card-head">
        <h2 class="sec-title">${esc(pipe.title || "Paper writing steps")}</h2>
        <span class="count">${(pipe.stages || []).length}</span>
      </div>
      ${renderPipeline(pipe)}
    </div>`;

  lists.forEach((sec, i) => {
    html += renderListBlock(sec, i, lists.length);
  });

  board.innerHTML = html;
}
