import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CONTENT_REVISION,
  findListItem,
  legacyToBlocks,
  listBlocksOf,
  migrateBoardContent,
  moveInArray,
  toBoardV3,
} from "./schema.ts";

describe("toBoardV3", () => {
  it("upgrades legacy links/pipeline/sections and drops Notion/Slack", () => {
    const board = toBoardV3({
      version: 1,
      meta: { title: "T" },
      links: [
        { id: "l1", label: "Register", url: "/r" },
        { id: "ln", label: "Notion", url: "/n" },
      ],
      pipeline: [{ id: "p1", code: "00", label: "Control", url: "https://x" }],
      sections: [
        {
          id: "sec_actions",
          title: "Needs action",
          layout: "full",
          style: "alert",
          empty: "",
          items: [
            {
              id: "a1",
              time: "1",
              source: "S",
              text: "hi",
              tag: "",
              tagKind: "",
              kind: "",
              url: "",
            },
          ],
        },
        {
          id: "sec_notion",
          title: "Notion",
          layout: "half",
          style: "normal",
          empty: "",
          items: [],
        },
        {
          id: "sec_slack",
          title: "Slack",
          layout: "half",
          style: "normal",
          empty: "",
          items: [],
        },
      ],
    });

    assert.equal(board.version, 3);
    assert.equal(board.meta.title, "T");
    assert.ok(board.blocks.some((b) => b.type === "links"));
    assert.ok(board.blocks.some((b) => b.type === "pipeline"));
    const lists = listBlocksOf(board);
    assert.equal(lists.length, 1);
    assert.equal(lists[0]!.title, "Needs action");
    assert.ok(!lists.some((l) => /notion|slack/i.test(l.title)));

    const links = board.blocks.find((b) => b.type === "links");
    assert.ok(links && links.type === "links");
    assert.equal(links.items.length, 1);
    assert.equal(links.items[0]!.label, "Register");
  });

  it("passes through v3 blocks and re-sanitizes", () => {
    const board = toBoardV3({
      version: 3,
      meta: { title: "V3" },
      blocks: [
        { type: "links", id: "nav", items: [] },
        {
          type: "list",
          id: "sec_slack",
          title: "Slack",
          layout: "half",
          style: "normal",
          empty: "",
          items: [],
        },
        {
          type: "list",
          id: "sec_emerauld",
          title: "EMERAULD · Git vault",
          layout: "full",
          style: "normal",
          empty: "",
          items: [],
        },
      ],
    });
    const lists = listBlocksOf(board);
    assert.equal(lists.length, 1);
    assert.equal(lists[0]!.id, "sec_emerauld");
    // content migration renames EMERAULD · Git vault → EMERAULD
    assert.equal(lists[0]!.title, "EMERAULD");
    assert.equal(board.meta.content_revision, CONTENT_REVISION);
  });

  it("migrates EMERAULD GitHub links to local graph", () => {
    const board = toBoardV3({
      version: 3,
      meta: { title: "Pharos · Workbench", content_revision: 0 },
      blocks: [
        {
          type: "links",
          id: "nav",
          items: [
            {
              id: "l1",
              label: "EMERAULD",
              url: "https://github.com/martinlepage26-bit/EMERAULD",
            },
          ],
        },
        {
          type: "pipeline",
          id: "pipeline",
          title: "Drive — Pharos Paper Series OS pipeline",
          stages: [],
        },
        {
          type: "list",
          id: "sec_emerauld",
          title: "EMERAULD vault",
          layout: "full",
          style: "normal",
          empty: "",
          linkLabel: "GitHub",
          linkUrl: "https://github.com/martinlepage26-bit/EMERAULD",
          items: [
            {
              id: "em_1",
              time: "",
              source: "",
              text: "Vault",
              tag: "",
              tagKind: "",
              kind: "LINK",
              url: "https://github.com/martinlepage26-bit/EMERAULD",
            },
          ],
        },
      ],
    });
    assert.equal(board.meta.title, "Pharos");
    assert.equal(board.meta.content_revision, CONTENT_REVISION);
    const pipe = board.blocks.find((b) => b.type === "pipeline");
    assert.ok(pipe && pipe.type === "pipeline");
    assert.equal(pipe.title, "Paper path");
    const links = board.blocks.find((b) => b.type === "links");
    assert.ok(links && links.type === "links");
    assert.equal(links.items[0]!.url, "files/emerauld-graph");
    const em = listBlocksOf(board).find((l) => l.id === "sec_emerauld");
    assert.ok(em);
    assert.equal(em!.title, "EMERAULD");
    assert.equal(em!.linkUrl, "files/emerauld-graph");
    assert.equal(em!.items[0]!.url, "files/emerauld-graph");
  });

  it("migrateBoardContent is idempotent at current revision", () => {
    const once = toBoardV3({
      meta: { content_revision: 0 },
      blocks: [
        { type: "links", id: "nav", items: [] },
        { type: "pipeline", id: "pipeline", title: "Paper path", stages: [] },
      ],
    });
    const twice = migrateBoardContent(once);
    assert.equal(twice.meta.content_revision, CONTENT_REVISION);
    assert.equal(twice.meta.title, once.meta.title);
  });

  it("findListItem and moveInArray work", () => {
    const board = toBoardV3({
      sections: [
        {
          id: "s1",
          title: "A",
          items: [
            {
              id: "i1",
              time: "",
              source: "",
              text: "one",
              tag: "",
              tagKind: "",
              kind: "",
              url: "",
            },
            {
              id: "i2",
              time: "",
              source: "",
              text: "two",
              tag: "",
              tagKind: "",
              kind: "",
              url: "",
            },
          ],
        },
      ],
    });
    const hit = findListItem(board, "s1", "i2");
    assert.ok(hit);
    assert.equal(hit!.index, 1);
    assert.equal(hit!.item.text, "two");
    assert.equal(moveInArray(hit!.block.items, 1, -1), true);
    assert.equal(hit!.block.items[0]!.id, "i2");
  });

  it("legacyToBlocks is empty-safe", () => {
    assert.deepEqual(
      legacyToBlocks({}).map((b) => b.type),
      ["links", "pipeline"]
    );
  });
});
