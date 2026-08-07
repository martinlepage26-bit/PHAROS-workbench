/** DOM render for board state. */

import { kindClass } from "./model.js";

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function bindMeta(state, onMeta) {
  const map = [
    ["meta-title", "title"],
    ["meta-subtitle", "subtitle"],
    ["meta-asof", "asOf"],
    ["meta-window", "windowNewest"],
    ["meta-snap", "snap"],
  ];
  for (const [id, key] of map) {
    const el = document.getElementById(id);
    if (!el) continue;
    el.value = state.meta[key] || "";
    el.oninput = () => {
      state.meta[key] = el.value;
      if (key === "title") document.title = el.value || "Pharos Workbench";
      onMeta();
    };
  }
  document.title = state.meta.title || "Pharos Workbench";
  const foot = document.getElementById("footer-note");
  if (foot) {
    foot.textContent = state.meta.footer || "";
    foot.contentEditable = "true";
    foot.onblur = (e) => {
      state.meta.footer = e.target.textContent;
      onMeta();
    };
  }
}

function renderLinks(state) {
  const nav = document.getElementById("nav-links");
  if (!nav) return;
  const links = state.links || [];
  nav.innerHTML =
    links
      .map(
        (l, i) => `
    <span style="display:inline-flex;align-items:center;gap:4px">
      <a href="${esc(l.url)}" ${/^https?:/i.test(l.url) ? 'target="_blank" rel="noopener"' : ""}>${esc(l.label)}</a>
      <button class="btn sm icon" type="button" data-action="link.edit" data-id="${esc(l.id)}" title="Edit">✎</button>
      ${i > 0 ? `<button class="btn sm icon" type="button" data-action="link.move" data-id="${esc(l.id)}" data-dir="-1">‹</button>` : ""}
      ${i < links.length - 1 ? `<button class="btn sm icon" type="button" data-action="link.move" data-id="${esc(l.id)}" data-dir="1">›</button>` : ""}
    </span>`
      )
      .join("") +
    `<button class="btn sm" type="button" data-action="link.add">+ link</button>`;
}

function renderPipeline(state) {
  const stages = state.pipeline || [];
  if (!stages.length) {
    return `<div class="empty">No pipeline stages.</div>
      <div class="card-foot"><button class="btn sm" type="button" data-action="pipe.add">+ stage</button></div>`;
  }
  return (
    `<div class="pipeline">` +
    stages
      .map(
        (p, i) => `
      <div class="pcell">
        <a class="pl" href="${esc(p.url || "#")}" ${p.url ? 'target="_blank" rel="noopener"' : 'onclick="return false"'}>
          <span>${esc(p.code)}</span>
          <span class="pl-sub">${esc(p.label)}</span>
        </a>
        <div class="row-actions" style="margin-top:4px">
          <button class="btn sm icon" type="button" data-action="pipe.edit" data-id="${esc(p.id)}">✎</button>
          <button class="btn sm icon" type="button" data-action="pipe.move" data-id="${esc(p.id)}" data-dir="-1" ${i === 0 ? "disabled" : ""}>‹</button>
          <button class="btn sm icon" type="button" data-action="pipe.move" data-id="${esc(p.id)}" data-dir="1" ${i === stages.length - 1 ? "disabled" : ""}>›</button>
          <button class="btn sm icon danger" type="button" data-action="pipe.delete" data-id="${esc(p.id)}">×</button>
        </div>
      </div>
      ${i < stages.length - 1 ? '<div class="parrow">→</div>' : ""}`
      )
      .join("") +
    `</div>
    <div class="card-foot"><button class="btn sm" type="button" data-action="pipe.add">+ stage</button></div>`
  );
}

function renderItem(section, item, index) {
  const kind = item.kind
    ? `<span class="ktag ${kindClass(item.kind)}">${esc(item.kind)}</span>`
    : "";
  const src = item.source ? `<span class="src">${esc(item.source)}</span> ` : "";
  const text = item.text ? esc(item.text) : "";
  const body = item.url
    ? `${kind}<a class="dl" href="${esc(item.url)}" target="_blank" rel="noopener">${src}${text || esc(item.url)}</a>`
    : `${kind}${src}${text}`;
  const chip = item.tag
    ? `<div class="tags"><span class="chip ${esc(item.tagKind || "")}">${esc(item.tag)}</span></div>`
    : "";
  const n = (section.items || []).length;
  return `
    <div class="ln">
      <div class="tm">${esc(item.time || "")}</div>
      <div class="lb">${body}${chip}</div>
      <div class="row-actions">
        <button class="btn sm icon" type="button" data-action="item.edit" data-section="${esc(section.id)}" data-id="${esc(item.id)}">✎</button>
        <button class="btn sm icon" type="button" data-action="item.move" data-section="${esc(section.id)}" data-id="${esc(item.id)}" data-dir="-1" ${index === 0 ? "disabled" : ""}>↑</button>
        <button class="btn sm icon" type="button" data-action="item.move" data-section="${esc(section.id)}" data-id="${esc(item.id)}" data-dir="1" ${index === n - 1 ? "disabled" : ""}>↓</button>
        <button class="btn sm icon danger" type="button" data-action="item.delete" data-section="${esc(section.id)}" data-id="${esc(item.id)}">×</button>
      </div>
    </div>`;
}

export function renderBoard(state, onMeta) {
  bindMeta(state, onMeta);
  renderLinks(state);

  const board = document.getElementById("board");
  if (!board) return;

  const sections = state.sections || [];
  let html = `
    <div class="card full" data-block="pipeline">
      <div class="card-head">
        <span class="sec-title">Drive — Pharos Paper Series OS pipeline</span>
        <span class="n">${(state.pipeline || []).length}</span>
      </div>
      ${renderPipeline(state)}
    </div>`;

  sections.forEach((sec, sidx) => {
    const items = sec.items || [];
    html += `
      <div class="card ${sec.layout === "full" ? "full" : ""} ${sec.style === "alert" ? "alert" : ""}">
        <div class="card-head">
          <input class="sec-title field" data-action="section.rename" data-id="${esc(sec.id)}" value="${esc(sec.title)}">
          <span class="n">${items.length}</span>
          <div class="row-actions">
            <button class="btn sm icon" type="button" data-action="section.edit" data-id="${esc(sec.id)}" title="Section settings">⚙</button>
            <button class="btn sm icon" type="button" data-action="section.move" data-id="${esc(sec.id)}" data-dir="-1" ${sidx === 0 ? "disabled" : ""}>↑</button>
            <button class="btn sm icon" type="button" data-action="section.move" data-id="${esc(sec.id)}" data-dir="1" ${sidx === sections.length - 1 ? "disabled" : ""}>↓</button>
          </div>
        </div>
        <div class="items">
          ${
            items.length
              ? items.map((it, i) => renderItem(sec, it, i)).join("")
              : `<div class="empty">${esc(sec.empty || "Empty")}</div>`
          }
        </div>
        ${
          sec.linkUrl
            ? `<a class="glink" href="${esc(sec.linkUrl)}" target="_blank" rel="noopener">${esc(sec.linkLabel || sec.linkUrl)}</a>`
            : ""
        }
        <div class="card-foot">
          <button class="btn sm" type="button" data-action="item.add" data-section="${esc(sec.id)}">+ item</button>
          <button class="btn sm ghost" type="button" data-action="section.edit" data-id="${esc(sec.id)}">edit section</button>
        </div>
      </div>`;
  });

  board.innerHTML = html;
}
