#!/usr/bin/env node
/**
 * Build pruned EMERAULD wikilink graph assets for the workbench.
 *
 * Reads:  EMERAULD/.graph_store/{nodes,edges}.json  (or --from-json)
 * Writes: backend/public/files/emerauld-graph-data.js
 *         backend/public/files/emerauld-graph-data.json  (optional debug twin)
 *
 * Usage:
 *   node scripts/build-emerauld-graph.mjs
 *   node scripts/build-emerauld-graph.mjs --vault /path/to/EMERAULD
 *   node scripts/build-emerauld-graph.mjs --from-json path/to/graph.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "..");
const OUT_DIR = path.join(REPO, "backend/public/js");
const OUT_JSON_DIR = path.join(REPO, "backend/public/files");
const DEFAULT_VAULT = process.env.EMERAULD_VAULT || "/home/martin/work/EMERAULD";

const AREA_COLORS = {
  Hub: "#6d28d9",
  PHAROS: "#8b5cf6",
  Writing: "#0f7a52",
  Lavoie: "#b45309",
  Personal: "#9f1239",
  Wiki: "#4f46e5",
  Resources: "#0369a1",
  Governance: "#7c3aed",
  Skills: "#c026d3",
  Projects: "#0e7490",
  Other: "#78716c",
};

const MAX_NODES = 320;
const MAX_EDGES = 1800;

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return fallback;
}

function pathOf(n) {
  return String(n.path || "").replace(/\\/g, "/");
}

function areaOf(n) {
  const p = pathOf(n).toLowerCase();
  const title = String(n.title || n.id || "").toLowerCase();
  const t = String(n.type || "").toLowerCase();
  if (p.includes("areas/pharos")) return "PHAROS";
  if (p.includes("areas/writing") || p.includes("publications")) return "Writing";
  if (p.includes("areas/lavoie")) return "Lavoie";
  if (p.includes("areas/personal")) return "Personal";
  if (
    t === "hub" ||
    t === "map" ||
    t === "index" ||
    title.includes("moc") ||
    ["home", "welcome", "memory"].includes(title)
  ) {
    return "Hub";
  }
  if (p.startsWith("wiki/") || p.includes("/wiki/")) return "Wiki";
  if (p.startsWith("resources/")) return "Resources";
  if (p.startsWith("governance") || p.includes("hephaistos")) return "Governance";
  if (t === "skill" || p.includes("skill")) return "Skills";
  if (p.startsWith("projects/") || t === "project") return "Projects";
  return "Other";
}

function buildFromStore(nodesRaw, edgesRaw) {
  const deg = new Map();
  for (const e of edgesRaw) {
    const w = e.count || 1;
    deg.set(e.source, (deg.get(e.source) || 0) + w);
    deg.set(e.target, (deg.get(e.target) || 0) + w);
  }

  const byId = new Map();
  for (const n of nodesRaw) {
    const nid = n.id || n.title;
    if (!nid) continue;
    byId.set(nid, n);
  }

  const scored = [];
  for (const n of nodesRaw) {
    const nid = n.id || n.title;
    if (!nid) continue;
    const p = pathOf(n);
    const d = (deg.get(nid) || 0) + (n.backlinks || 0) + (n.outlinks || 0);
    const t = String(n.type || "").toLowerCase();
    let keep =
      d >= 8 ||
      p.startsWith("Areas/") ||
      t === "hub" ||
      t === "map" ||
      t === "area" ||
      t === "index" ||
      String(n.title || "").includes("MOC") ||
      ["Home", "Welcome", "memory", "index"].includes(nid);
    if (keep) scored.push({ d, nid, n });
  }
  scored.sort((a, b) => b.d - a.d);

  const areas = scored.filter((x) => pathOf(x.n).startsWith("Areas/"));
  const rest = scored.filter((x) => !pathOf(x.n).startsWith("Areas/"));
  const chosen = [];
  const idSet = new Set();
  for (const item of [...areas, ...rest]) {
    if (idSet.has(item.nid)) continue;
    idSet.add(item.nid);
    chosen.push(item);
    if (chosen.length >= MAX_NODES) break;
  }

  // one-hop expansion for hub neighbors
  const extra = new Map();
  for (const e of edgesRaw) {
    if (idSet.has(e.source) && !idSet.has(e.target)) {
      extra.set(e.target, (extra.get(e.target) || 0) + (e.count || 1));
    }
    if (idSet.has(e.target) && !idSet.has(e.source)) {
      extra.set(e.source, (extra.get(e.source) || 0) + (e.count || 1));
    }
  }
  const extraSorted = [...extra.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40);
  for (const [nid] of extraSorted) {
    const n = byId.get(nid);
    if (!n || idSet.has(nid)) continue;
    idSet.add(nid);
    chosen.push({ d: deg.get(nid) || 0, nid, n });
  }

  let edges = [];
  for (const e of edgesRaw) {
    if (idSet.has(e.source) && idSet.has(e.target) && e.source !== e.target) {
      edges.push({
        source: e.source,
        target: e.target,
        weight: Math.min(e.count || 1, 12),
      });
    }
  }
  const seenE = new Set();
  edges = edges
    .filter((e) => {
      const k = [e.source, e.target].sort().join("\0");
      if (seenE.has(k)) return false;
      seenE.add(k);
      return true;
    })
    .sort((a, b) => b.weight - a.weight)
    .slice(0, MAX_EDGES);

  const nodes = chosen.map(({ d, nid, n }) => {
    const area = areaOf(n);
    const title = n.title || nid;
    return {
      id: nid,
      label: title.length > 36 ? title.slice(0, 34) + "…" : title,
      title,
      path: pathOf(n),
      type: n.type || "note",
      area,
      color: AREA_COLORS[area] || AREA_COLORS.Other,
      size: Math.round(Math.min(28, 7 + Math.pow(Math.min(d, 400), 0.4) * 2.5) * 10) / 10,
      degree: d,
      backlinks: n.backlinks || 0,
    };
  });

  return {
    generated_from: "EMERAULD/.graph_store (wikilink graph)",
    built_at: new Date().toISOString(),
    pruned: true,
    node_count: nodes.length,
    edge_count: edges.length,
    areas: AREA_COLORS,
    nodes,
    edges,
  };
}

function main() {
  const fromJson = arg("--from-json", null);
  let payload;

  if (fromJson) {
    payload = JSON.parse(fs.readFileSync(fromJson, "utf8"));
    if (!payload.nodes || !payload.edges) {
      throw new Error("--from-json must contain { nodes, edges }");
    }
    if (!payload.node_count) payload.node_count = payload.nodes.length;
    if (!payload.edge_count) payload.edge_count = payload.edges.length;
    if (!payload.areas) payload.areas = AREA_COLORS;
  } else {
    const vault = arg("--vault", DEFAULT_VAULT);
    const store = path.join(vault, ".graph_store");
    const nodesPath = path.join(store, "nodes.json");
    const edgesPath = path.join(store, "edges.json");
    if (!fs.existsSync(nodesPath) || !fs.existsSync(edgesPath)) {
      // fall back to existing pruned json in public if present
      const fallback = path.join(OUT_DIR, "emerauld-graph-data.json");
      if (fs.existsSync(fallback)) {
        console.warn("graph_store missing; re-emitting from", fallback);
        payload = JSON.parse(fs.readFileSync(fallback, "utf8"));
      } else {
        throw new Error(
          `Missing ${nodesPath}. Pass --vault or --from-json, or set EMERAULD_VAULT.`
        );
      }
    } else {
      const nodesRaw = JSON.parse(fs.readFileSync(nodesPath, "utf8"));
      const edgesRaw = JSON.parse(fs.readFileSync(edgesPath, "utf8"));
      payload = buildFromStore(nodesRaw, edgesRaw);
      payload.generated_from = store;
    }
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(OUT_JSON_DIR, { recursive: true });
  const jsonPath = path.join(OUT_JSON_DIR, "emerauld-graph-data.json");
  const jsPath = path.join(OUT_DIR, "emerauld-graph-data.js");
  const body = JSON.stringify(payload);
  fs.writeFileSync(jsonPath, body, "utf8");
  // Classic script under /js — Workers Assets on this host 404 many /files/* non-HTML assets.
  fs.writeFileSync(
    jsPath,
    "/* generated by scripts/build-emerauld-graph.mjs — do not edit */\n" +
      "window.__EMERAULD_GRAPH__ = " +
      body +
      ";\n",
    "utf8"
  );
  console.log(
    `Wrote ${nodesLabel(payload)} → ${path.relative(REPO, jsPath)} (~${fs.statSync(jsPath).size} bytes)`
  );
}

function nodesLabel(p) {
  return `${p.node_count || p.nodes?.length || 0} nodes, ${p.edge_count || p.edges?.length || 0} edges`;
}

main();
