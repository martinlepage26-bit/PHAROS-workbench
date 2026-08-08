# Obsidian Graph View — technical notes

Source research (for EMERAULD / workbench graph work).

## Built-in Graph View

Obsidian’s built-in Graph View is rendered with **PixiJS**, using **WebGL** for performance. The graph layout, filtering, link parsing, and interaction logic are largely **custom**; Obsidian previously used **D3.js**, but moved away from it because it was not performant enough for larger graphs.

In practical terms:

| Piece | Choice |
| --- | --- |
| **Renderer** | PixiJS |
| **Graphics API** | WebGL, with possible browser fallback behavior |
| **Layout** | Custom force-directed graph implementation |
| **Data model** | Notes/pages are nodes; internal `[[wikilinks]]` are edges |
| **Code availability** | The built-in implementation is bundled and minified inside Obsidian, **not** maintained as an open-source Obsidian repository |

## Not the same: 3D Graph plugin

The separate official **3D Graph** community plugin is different: it uses **D3.js** for rendering.

## Workbench implementation

EMERAULD workbench graph (`/files/emerauld-graph`) now follows the same practical stack as Obsidian’s built-in view:

| Piece | Workbench |
| --- | --- |
| **Renderer** | PixiJS v7 (CDN), WebGL |
| **Layout** | Custom force-directed sim in `emerauld-graph-app.js` (repulsion + springs + center) |
| **Data model** | Pruned wikilink graph from EMERAULD `.graph_store` (`scripts/build-emerauld-graph.mjs`) |
| **Not used** | D3.js as primary renderer; vis-network (retired) |

Still not Obsidian’s closed-source bundle — same *kind* of architecture, our own layout and UI (navy / mauve constellation).
