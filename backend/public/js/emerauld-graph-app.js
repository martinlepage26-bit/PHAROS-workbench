(async function () {
  const $ = (id) => document.getElementById(id);
  const err = $("err");
  const info = $("info");
  const neighborsEl = $("neighbors");
  const legendEl = $("legend");
  const statsEl = $("stats");
  const statusEl = $("status");

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  let data;
  try {
    data = window.__EMERAULD_GRAPH__;
    if (!data || !data.nodes) throw new Error("Graph data missing");
  } catch (e) {
    err.style.display = "block";
    err.textContent = e.message || String(e);
    return;
  }

  if (typeof vis === "undefined") {
    err.style.display = "block";
    err.textContent = "Graph library failed to load. Check network / CDN.";
    return;
  }

  const areaOn = {};
  Object.keys(data.areas || {}).forEach((a) => { areaOn[a] = true; });

  const nodeById = {};
  data.nodes.forEach((n) => { nodeById[n.id] = n; });

  // adjacency for neighbors panel
  const adj = {};
  data.edges.forEach((e) => {
    if (!adj[e.source]) adj[e.source] = [];
    if (!adj[e.target]) adj[e.target] = [];
    adj[e.source].push(e.target);
    adj[e.target].push(e.source);
  });

  // Small shining gold nodes — size by degree, same metal family
  function goldFor(n) {
    const d = Math.min(n.degree || 1, 800);
    const t = Math.log10(d + 1) / Math.log10(801); // 0..1
    // brighter core for higher degree
    const bg = t > 0.55 ? "#f5d76e" : t > 0.3 ? "#e8bc3a" : "#d4a017";
    const border = t > 0.55 ? "#fff3c4" : "#f0c14b";
    return { bg, border };
  }

  function nodeVis(n) {
    const g = goldFor(n);
    const size = Math.max(4.5, Math.min(14, 4.2 + Math.pow(Math.min(n.degree || 1, 400), 0.28) * 1.6));
    return {
      id: n.id,
      label: n.label,
      title: n.title + (n.path ? "\n" + n.path : ""),
      size: size,
      color: {
        background: g.bg,
        border: g.border,
        highlight: { background: "#fff8dc", border: "#ffffff" },
        hover: { background: "#ffe566", border: "#ffffff" },
      },
      font: {
        color: "rgba(26, 24, 20, 0.72)",
        size: 10,
        face: "Inter, system-ui, sans-serif",
        strokeWidth: 3,
        strokeColor: "rgba(255, 255, 255, 0.92)",
      },
      borderWidth: 1.8,
      borderWidthSelected: 2.5,
      shadow: {
        enabled: true,
        color: "rgba(240, 193, 75, 0.55)",
        size: 12,
        x: 0,
        y: 0,
      },
      area: n.area,
    };
  }

  const nodesDS = new vis.DataSet(data.nodes.map(nodeVis));
  const edgesDS = new vis.DataSet(
    data.edges.map((e, i) => ({
      id: "e" + i,
      from: e.source,
      to: e.target,
      width: Math.min(1.6, 0.25 + (e.weight || 1) * 0.06),
      color: {
        color: "rgba(184, 134, 11, 0.14)",
        highlight: "rgba(212, 160, 23, 0.55)",
        hover: "rgba(212, 160, 23, 0.35)",
        opacity: 0.85,
      },
      smooth: { type: "continuous", roundness: 0.22 },
    }))
  );

  const network = new vis.Network(
    $("graph"),
    { nodes: nodesDS, edges: edgesDS },
    {
      autoResize: true,
      height: "100%",
      width: "100%",
      physics: {
        solver: "forceAtlas2Based",
        forceAtlas2Based: {
          gravitationalConstant: -48,
          centralGravity: 0.006,
          springLength: 120,
          springConstant: 0.045,
          damping: 0.5,
          avoidOverlap: 0.55,
        },
        stabilization: { iterations: 220, updateInterval: 25, fit: true },
      },
      interaction: {
        hover: true,
        tooltipDelay: 100,
        hideEdgesOnDrag: true,
        multiselect: false,
        zoomView: true,
        dragView: true,
      },
      nodes: {
        shape: "dot",
        scaling: { min: 4, max: 16 },
        chosen: {
          node: function (values) {
            values.shadow = true;
            values.shadowColor = "rgba(255, 230, 120, 0.9)";
            values.shadowSize = 22;
            values.borderWidth = 2.8;
          },
          label: true,
        },
      },
      edges: {
        selectionWidth: 1.5,
        hoverWidth: 0.5,
      },
    }
  );

  function fillGraph() {
    const el = $("graph");
    if (!el) return;
    const w = el.clientWidth;
    const h = el.clientHeight;
    if (w > 0 && h > 0) {
      network.setSize(w + "px", h + "px");
      network.redraw();
    }
  }

  function fitAll() {
    fillGraph();
    network.fit({
      animation: false,
      padding: 28,
    });
  }

  statsEl.textContent =
    data.node_count + " notes · " + data.edge_count + " links (pruned vault graph)";

  // Size immediately, then again after layout
  fillGraph();
  requestAnimationFrame(() => {
    fillGraph();
    network.fit({ animation: false, padding: 36 });
  });

  network.once("stabilizationIterationsDone", () => {
    network.setOptions({ physics: { enabled: false } });
    fitAll();
    statusEl.textContent = "Scroll to zoom · drag to pan";
  });

  window.addEventListener("resize", () => {
    fillGraph();
    network.fit({ animation: false, padding: 28 });
  });

  function showInfo(id) {
    const n = nodeById[id];
    if (!n) {
      info.innerHTML = '<span class="empty">Unknown node</span>';
      neighborsEl.innerHTML = "";
      return;
    }
    info.innerHTML =
      '<div class="title">' + esc(n.title) + "</div>" +
      '<div class="meta">' + esc(n.area) + " · " + esc(n.type) +
      " · degree " + esc(n.degree) +
      (n.backlinks ? " · " + esc(n.backlinks) + " backlinks" : "") +
      "</div>" +
      (n.path ? '<div class="meta">' + esc(n.path) + "</div>" : "");

    const neigh = (adj[id] || []).slice();
    // unique preserve order
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
      html += '<p class="empty" style="color:var(--faint);font-style:italic">No neighbors in this pruned view.</p>';
    } else {
      for (const nid of uniq.slice(0, 40)) {
        const nn = nodeById[nid];
        const label = nn ? nn.label : nid;
        html +=
          '<button type="button" class="n-item" data-id="' +
          esc(nid) +
          '">' +
          esc(label) +
          "</button>";
      }
    }
    neighborsEl.innerHTML = html;
    neighborsEl.querySelectorAll(".n-item").forEach((btn) => {
      btn.addEventListener("click", () => {
        const nid = btn.getAttribute("data-id");
        network.selectNodes([nid]);
        network.focus(nid, { scale: 1.15, animation: { duration: 400, easingFunction: "easeInOutQuad" } });
        showInfo(nid);
      });
    });
  }

  network.on("click", (params) => {
    if (params.nodes && params.nodes[0]) showInfo(params.nodes[0]);
  });

  // Legend filters
  const areas = data.areas || {};
  Object.keys(areas).forEach((area) => {
    const count = data.nodes.filter((n) => n.area === area).length;
    if (!count) return;
    const el = document.createElement("label");
    el.className = "leg";
    el.innerHTML =
      '<span class="dot" style="background:' +
      esc(areas[area]) +
      '"></span>' +
      esc(area) +
      " · " +
      count;
    el.addEventListener("click", () => {
      areaOn[area] = !areaOn[area];
      el.classList.toggle("dim", !areaOn[area]);
      applyAreaFilter();
    });
    legendEl.appendChild(el);
  });

  function applyAreaFilter() {
    const updates = data.nodes.map((n) => ({
      id: n.id,
      hidden: !areaOn[n.area],
    }));
    nodesDS.update(updates);
  }

  // Search
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
        network.selectNodes([hit.id]);
        network.focus(hit.id, {
          scale: 1.2,
          animation: { duration: 450, easingFunction: "easeInOutQuad" },
        });
        showInfo(hit.id);
      }
    }, 180);
  });
})();

/* v2 */
/* graph-app 2026-08-08T03:25:04+00:00 */
