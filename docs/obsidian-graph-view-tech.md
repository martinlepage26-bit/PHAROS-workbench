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

## Workbench implication

Current EMERAULD workbench graph (`/files/emerauld-graph`) uses **vis-network** (canvas/WebGL-capable) over a pruned wikilink graph — same data model (notes = nodes, `[[wikilinks]]` = edges), not Obsidian’s PixiJS runtime.

To approach Obsidian-class performance at full vault scale: PixiJS (or raw WebGL) + custom force layout + progressive/filtered node sets, not D3 as the primary renderer.
