/**
 * EMERAULD knowledge graph — PixiJS (WebGL) + custom force layout.
 * Data model mirrors Obsidian: notes = nodes, [[wikilinks]] = edges.
 * (Obsidian Graph View also uses PixiJS; layout here is our own force sim.)
 */
(function () {
  const $ = (id) => document.getElementById(id);
  const err = $("err");
  const info = $("info");
  const neighborsEl = $("neighbors");
  const legendEl = $("legend");
  const statsEl = $("stats");
  const statusEl = $("status");
  const host = $("graph");

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  const data = window.__EMERAULD_GRAPH__;
  if (!data || !Array.isArray(data.nodes)) {
    err.style.display = "block";
    err.textContent = "Graph data missing";
    return;
  }
  if (typeof PIXI === "undefined") {
    err.style.display = "block";
    err.textContent = "PixiJS failed to load (CDN / network).";
    return;
  }

  // ── model ──────────────────────────────────────────────────
  const areaOn = {};
  Object.keys(data.areas || {}).forEach((a) => {
    areaOn[a] = true;
  });

  const nodeById = Object.create(null);
  data.nodes.forEach((n) => {
    nodeById[n.id] = n;
  });

  const adj = Object.create(null);
  data.edges.forEach((e) => {
    if (!adj[e.source]) adj[e.source] = [];
    if (!adj[e.target]) adj[e.target] = [];
    adj[e.source].push(e.target);
    adj[e.target].push(e.source);
  });

  function mauveFor(degree) {
    const d = Math.min(degree || 1, 800);
    const t = Math.log10(d + 1) / Math.log10(801);
    return {
      fill: t > 0.55 ? 0xe8d0f5 : t > 0.3 ? 0xd4b4e8 : 0xc4a4d4,
      glow: t > 0.55 ? 0xf6ecff : 0xe0c4f0,
      alpha: 0.92,
      r: Math.max(2.8, Math.min(9, 2.6 + Math.pow(Math.min(d, 400), 0.28) * 1.15)),
    };
  }

  // ── force state ────────────────────────────────────────────
  const nodes = data.nodes.map((n, i) => {
    const angle = (i / data.nodes.length) * Math.PI * 2;
    const ring = 80 + (i % 17) * 28;
    const m = mauveFor(n.degree);
    return {
      id: n.id,
      ref: n,
      x: Math.cos(angle) * ring,
      y: Math.sin(angle) * ring,
      vx: 0,
      vy: 0,
      r: m.r,
      fill: m.fill,
      glow: m.glow,
      visible: true,
      area: n.area,
    };
  });
  const nodeIndex = Object.create(null);
  nodes.forEach((n, i) => {
    nodeIndex[n.id] = i;
  });

  const links = [];
  data.edges.forEach((e) => {
    const s = nodeIndex[e.source];
    const t = nodeIndex[e.target];
    if (s == null || t == null || s === t) return;
    links.push({
      source: s,
      target: t,
      w: Math.min(e.weight || 1, 8),
    });
  });

  // ── Pixi ───────────────────────────────────────────────────
  const app = new PIXI.Application({
    backgroundAlpha: 0,
    antialias: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    autoDensity: true,
    powerPreference: "high-performance",
  });
  host.innerHTML = "";
  host.appendChild(app.view);
  app.view.style.display = "block";
  app.view.style.width = "100%";
  app.view.style.height = "100%";
  app.view.style.touchAction = "none";

  const world = new PIXI.Container();
  app.stage.addChild(world);

  const edgeG = new PIXI.Graphics();
  const glowG = new PIXI.Graphics();
  const nodeG = new PIXI.Graphics();
  const labelLayer = new PIXI.Container();
  world.addChild(edgeG);
  world.addChild(glowG);
  world.addChild(nodeG);
  world.addChild(labelLayer);

  // Labels only for high-degree / selected / hover (keep sleek)
  const labelById = Object.create(null);
  function ensureLabel(n) {
    if (labelById[n.id]) return labelById[n.id];
    const t = new PIXI.Text(n.ref.label || n.id, {
      fontFamily: "Inter, system-ui, sans-serif",
      fontSize: 11,
      fill: 0xf0eef8,
      align: "center",
      dropShadow: true,
      dropShadowColor: 0x0b1020,
      dropShadowBlur: 4,
      dropShadowDistance: 0,
    });
    t.anchor.set(0.5, -0.35);
    t.alpha = 0.88;
    t.visible = false;
    labelLayer.addChild(t);
    labelById[n.id] = t;
    return t;
  }

  function resize() {
    const w = host.clientWidth || 1;
    const h = host.clientHeight || 1;
    app.renderer.resize(w, h);
  }
  resize();

  // camera
  let scale = 1;
  let panX = 0;
  let panY = 0;
  function applyCamera() {
    world.position.set(app.screen.width / 2 + panX, app.screen.height / 2 + panY);
    world.scale.set(scale);
  }
  applyCamera();

  function fitView(padding = 48) {
    const vis = nodes.filter((n) => n.visible);
    if (!vis.length) return;
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const n of vis) {
      if (n.x < minX) minX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.x > maxX) maxX = n.x;
      if (n.y > maxY) maxY = n.y;
    }
    const bw = Math.max(40, maxX - minX);
    const bh = Math.max(40, maxY - minY);
    const w = app.screen.width - padding * 2;
    const h = app.screen.height - padding * 2;
    scale = Math.min(2.4, Math.max(0.12, Math.min(w / bw, h / bh) * 0.92));
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    panX = -cx * scale;
    panY = -cy * scale;
    applyCamera();
  }

  // ── force simulation (custom) ──────────────────────────────
  let cooling = 1;
  let ticking = true;
  let tickCount = 0;
  const MAX_TICKS = 420;

  function stepForce() {
    if (!ticking) return;
    tickCount++;
    const alpha = cooling;
    const n = nodes.length;
    const repulsion = 1800 * alpha;
    const springK = 0.045 * alpha;
    const springLen = 72;
    const centerK = 0.012 * alpha;
    const damp = 0.82;

    // pairwise repulsion (OK at ~300 nodes for settle phase)
    for (let i = 0; i < n; i++) {
      const a = nodes[i];
      if (!a.visible) continue;
      for (let j = i + 1; j < n; j++) {
        const b = nodes[j];
        if (!b.visible) continue;
        let dx = a.x - b.x;
        let dy = a.y - b.y;
        let dist2 = dx * dx + dy * dy;
        if (dist2 < 0.01) {
          dx = (Math.random() - 0.5) * 0.5;
          dy = (Math.random() - 0.5) * 0.5;
          dist2 = dx * dx + dy * dy;
        }
        const dist = Math.sqrt(dist2);
        const f = repulsion / dist2;
        const fx = (dx / dist) * f;
        const fy = (dy / dist) * f;
        a.vx += fx;
        a.vy += fy;
        b.vx -= fx;
        b.vy -= fy;
      }
    }

    // springs
    for (let k = 0; k < links.length; k++) {
      const L = links[k];
      const a = nodes[L.source];
      const b = nodes[L.target];
      if (!a.visible || !b.visible) continue;
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
      const target = springLen + L.w * 2;
      const f = ((dist - target) * springK * (0.5 + L.w * 0.08)) / dist;
      const fx = dx * f;
      const fy = dy * f;
      a.vx += fx;
      a.vy += fy;
      b.vx -= fx;
      b.vy -= fy;
    }

    // center gravity
    for (let i = 0; i < n; i++) {
      const a = nodes[i];
      if (!a.visible) continue;
      a.vx -= a.x * centerK;
      a.vy -= a.y * centerK;
      a.vx *= damp;
      a.vy *= damp;
      a.x += a.vx;
      a.y += a.vy;
    }

    cooling *= 0.992;
    if (tickCount >= MAX_TICKS || cooling < 0.02) {
      ticking = false;
      cooling = 0;
      fitView();
      statusEl.textContent = "PixiJS · WebGL · scroll to zoom · drag to pan";
    }
  }

  // ── draw ───────────────────────────────────────────────────
  let selectedId = null;
  let hoverId = null;

  function draw() {
    edgeG.clear();
    glowG.clear();
    nodeG.clear();

    // edges
    for (let k = 0; k < links.length; k++) {
      const L = links[k];
      const a = nodes[L.source];
      const b = nodes[L.target];
      if (!a.visible || !b.visible) continue;
      const hi =
        selectedId &&
        (a.id === selectedId || b.id === selectedId);
      edgeG.lineStyle(
        hi ? 1.2 : 0.55 + L.w * 0.04,
        hi ? 0xe0c4f0 : 0xb496d2,
        hi ? 0.55 : 0.14
      );
      edgeG.moveTo(a.x, a.y);
      edgeG.lineTo(b.x, b.y);
    }

    // nodes
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (!n.visible) {
        const lab = labelById[n.id];
        if (lab) lab.visible = false;
        continue;
      }
      const isSel = n.id === selectedId;
      const isHov = n.id === hoverId;
      const r = n.r * (isSel || isHov ? 1.35 : 1);

      // soft glow
      glowG.beginFill(n.glow, isSel || isHov ? 0.35 : 0.16);
      glowG.drawCircle(n.x, n.y, r * 2.4);
      glowG.endFill();

      nodeG.beginFill(n.fill, 0.95);
      nodeG.drawCircle(n.x, n.y, r);
      nodeG.endFill();
      nodeG.lineStyle(isSel ? 1.6 : 1, n.glow, isSel || isHov ? 0.95 : 0.55);
      nodeG.drawCircle(n.x, n.y, r);

      const showLabel =
        isSel ||
        isHov ||
        (n.ref.degree || 0) >= 120 ||
        n.area === "Hub";
      if (showLabel) {
        const lab = ensureLabel(n);
        lab.position.set(n.x, n.y + r);
        lab.visible = true;
        lab.scale.set(1 / Math.max(scale, 0.35));
      } else if (labelById[n.id]) {
        labelById[n.id].visible = false;
      }
    }
  }

  // ── interaction ────────────────────────────────────────────
  function screenToWorld(sx, sy) {
    const x = (sx - app.screen.width / 2 - panX) / scale;
    const y = (sy - app.screen.height / 2 - panY) / scale;
    return { x, y };
  }

  function hitTest(sx, sy) {
    const w = screenToWorld(sx, sy);
    let best = null;
    let bestD = Infinity;
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (!n.visible) continue;
      const dx = n.x - w.x;
      const dy = n.y - w.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      const thr = Math.max(n.r, 6) / Math.min(scale, 1.5) + 2;
      if (d < thr && d < bestD) {
        bestD = d;
        best = n;
      }
    }
    return best;
  }

  function showInfo(id) {
    selectedId = id;
    const n = nodeById[id];
    if (!n) {
      info.innerHTML = '<span class="empty">Unknown node</span>';
      neighborsEl.innerHTML = "";
      return;
    }
    info.innerHTML =
      '<div class="title">' +
      esc(n.title) +
      "</div>" +
      '<div class="meta">' +
      esc(n.area) +
      " · " +
      esc(n.type) +
      " · degree " +
      esc(n.degree) +
      (n.backlinks ? " · " + esc(n.backlinks) + " backlinks" : "") +
      "</div>" +
      (n.path ? '<div class="meta">' + esc(n.path) + "</div>" : "");

    const neigh = adj[id] || [];
    const seen = new Set();
    const uniq = [];
    for (const x of neigh) {
      if (seen.has(x)) continue;
      seen.add(x);
      uniq.push(x);
    }
    uniq.sort((a, b) => (nodeById[b]?.degree || 0) - (nodeById[a]?.degree || 0));

    let html = "<h2>Connected (" + uniq.length + ")</h2>";
    if (!uniq.length) {
      html +=
        '<p class="empty" style="color:var(--faint);font-style:italic">No neighbors in this pruned view.</p>';
    } else {
      for (const nid of uniq.slice(0, 40)) {
        const nn = nodeById[nid];
        html +=
          '<button type="button" class="n-item" data-id="' +
          esc(nid) +
          '">' +
          esc(nn ? nn.label : nid) +
          "</button>";
      }
    }
    neighborsEl.innerHTML = html;
    neighborsEl.querySelectorAll(".n-item").forEach((btn) => {
      btn.addEventListener("click", () => {
        const nid = btn.getAttribute("data-id");
        focusNode(nid);
      });
    });
  }

  function focusNode(id) {
    const n = nodes.find((x) => x.id === id);
    if (!n || !n.visible) return;
    showInfo(id);
    panX = -n.x * scale;
    panY = -n.y * scale;
    applyCamera();
    draw();
  }

  // pointer: pan empty / drag node while settling
  let dragging = null; // 'pan' | node
  let lastX = 0;
  let lastY = 0;
  let dragNode = null;

  app.view.addEventListener("pointerdown", (ev) => {
    const rect = app.view.getBoundingClientRect();
    const sx = ev.clientX - rect.left;
    const sy = ev.clientY - rect.top;
    const hit = hitTest(sx, sy);
    lastX = ev.clientX;
    lastY = ev.clientY;
    if (hit) {
      dragging = "node";
      dragNode = hit;
      hit.vx = 0;
      hit.vy = 0;
      showInfo(hit.id);
    } else {
      dragging = "pan";
      dragNode = null;
    }
    app.view.setPointerCapture?.(ev.pointerId);
  });

  app.view.addEventListener("pointermove", (ev) => {
    const rect = app.view.getBoundingClientRect();
    const sx = ev.clientX - rect.left;
    const sy = ev.clientY - rect.top;

    if (!dragging) {
      const hit = hitTest(sx, sy);
      const nid = hit ? hit.id : null;
      if (nid !== hoverId) {
        hoverId = nid;
        app.view.style.cursor = hit ? "pointer" : "grab";
        draw();
      }
      return;
    }

    const dx = ev.clientX - lastX;
    const dy = ev.clientY - lastY;
    lastX = ev.clientX;
    lastY = ev.clientY;

    if (dragging === "pan") {
      panX += dx;
      panY += dy;
      applyCamera();
    } else if (dragging === "node" && dragNode) {
      const w = screenToWorld(sx, sy);
      dragNode.x = w.x;
      dragNode.y = w.y;
      dragNode.vx = 0;
      dragNode.vy = 0;
      // warm sim slightly when user moves a node
      if (!ticking) {
        ticking = true;
        cooling = Math.max(cooling, 0.15);
        tickCount = Math.min(tickCount, MAX_TICKS - 40);
        statusEl.textContent = "Settling…";
      }
      draw();
    }
  });

  function endDrag(ev) {
    dragging = null;
    dragNode = null;
    try {
      app.view.releasePointerCapture?.(ev.pointerId);
    } catch (_) {}
  }
  app.view.addEventListener("pointerup", endDrag);
  app.view.addEventListener("pointercancel", endDrag);

  app.view.addEventListener(
    "wheel",
    (ev) => {
      ev.preventDefault();
      const rect = app.view.getBoundingClientRect();
      const sx = ev.clientX - rect.left;
      const sy = ev.clientY - rect.top;
      const before = screenToWorld(sx, sy);
      const factor = ev.deltaY > 0 ? 0.9 : 1.1;
      scale = Math.min(4, Math.max(0.08, scale * factor));
      const after = screenToWorld(sx, sy);
      panX += (after.x - before.x) * scale;
      panY += (after.y - before.y) * scale;
      applyCamera();
      draw();
    },
    { passive: false }
  );

  // ── legend / search ────────────────────────────────────────
  statsEl.textContent =
    data.node_count +
    " notes · " +
    data.edge_count +
    " links · PixiJS / WebGL";

  const areas = data.areas || {};
  Object.keys(areas).forEach((area) => {
    const count = data.nodes.filter((n) => n.area === area).length;
    if (!count) return;
    const el = document.createElement("label");
    el.className = "leg";
    el.innerHTML =
      '<span class="dot"></span>' + esc(area) + " · " + count;
    el.addEventListener("click", () => {
      areaOn[area] = !areaOn[area];
      el.classList.toggle("dim", !areaOn[area]);
      applyAreaFilter();
    });
    legendEl.appendChild(el);
  });

  function applyAreaFilter() {
    for (const n of nodes) {
      n.visible = areaOn[n.area] !== false;
    }
    if (!ticking) {
      ticking = true;
      cooling = 0.25;
      tickCount = 0;
    }
    draw();
  }

  const search = $("search");
  let searchTimer = null;
  search.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      const q = search.value.trim().toLowerCase();
      if (!q) return;
      const hit = data.nodes.find(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.label.toLowerCase().includes(q) ||
          (n.path && n.path.toLowerCase().includes(q))
      );
      if (hit && areaOn[hit.area] !== false) {
        scale = Math.max(scale, 1.1);
        focusNode(hit.id);
      }
    }, 160);
  });

  // ── main loop ──────────────────────────────────────────────
  statusEl.textContent = "Settling force layout…";
  app.ticker.add(() => {
    if (ticking) {
      // multiple substeps early for faster settle
      const steps = tickCount < 80 ? 2 : 1;
      for (let s = 0; s < steps; s++) stepForce();
    }
    draw();
  });

  window.addEventListener("resize", () => {
    resize();
    applyCamera();
    draw();
  });

  // initial camera
  requestAnimationFrame(() => {
    resize();
    fitView(80);
    draw();
  });
})();
/* pixi-rebuild 1786163814 */
