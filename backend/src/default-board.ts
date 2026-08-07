/** Server-owned default board (v3 blocks). EMERAULD on Git — no Notion/Slack. */

import type { BoardV3 } from "./schema";

function id(prefix: string, n: number): string {
  return `${prefix}_${n}`;
}

export function buildDefaultBoard(now = new Date()): BoardV3 {
  const asOf = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const windowNewest = now.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  });

  return {
    version: 3,
    meta: {
      title: "Pharos",
      subtitle: "Tasks · meetings · papers · EMERAULD",
      asOf,
      windowNewest,
      snap: "cloud",
      footer: "Changes save automatically when you are signed in.",
    },
    blocks: [
      {
        type: "links",
        id: "nav",
        items: [
          { id: id("l", 1), label: "Method hub", url: "files-hub.html" },
          { id: id("l", 2), label: "Register", url: "files/paper-register.html" },
          { id: id("l", 3), label: "Corpus", url: "files/corpus-full-list.html" },
          {
            id: id("l", 4),
            label: "Atlas",
            url: "files/method-formation-atlas.html",
          },
          {
            id: id("l", 5),
            label: "Timeline",
            url: "files/method-formation-timeline.html",
          },
          {
            id: id("l", 6),
            label: "EMERAULD",
            url: "https://github.com/martinlepage26-bit/EMERAULD",
          },
        ],
      },
      {
        type: "pipeline",
        id: "pipeline",
        title: "Paper writing steps",
        stages: [
          {
            id: id("p", 0),
            code: "00",
            label: "Project Control",
            url: "https://drive.google.com/drive/folders/1akv_LPk20UwaxJsIqoSx6G2DzKbWzfWR",
          },
          {
            id: id("p", 1),
            code: "01",
            label: "Raw Materials",
            url: "https://drive.google.com/drive/folders/19R0FXtZmswAWS_faMLPHuISDVkdfYoR8",
          },
          {
            id: id("p", 2),
            code: "02",
            label: "Source Field",
            url: "https://drive.google.com/drive/folders/1Ai6bV09M-6ZJoHnesyepb_xUisKrzVod",
          },
          {
            id: id("p", 3),
            code: "02.5",
            label: "Deconstruction",
            url: "https://drive.google.com/drive/folders/1rOd2FrAkMGm0tKHd5DEWYE0MYo_91w22",
          },
          {
            id: id("p", 4),
            code: "03",
            label: "Outline And Abstract",
            url: "https://drive.google.com/drive/folders/1MpYZBUTgK37NlNvrfUZ_HOsFk4lktPXY",
          },
          {
            id: id("p", 5),
            code: "04",
            label: "Research Bundle",
            url: "https://drive.google.com/drive/folders/1kfL0_H8n1sS279fY7JCy4t6julrBNh7m",
          },
          {
            id: id("p", 6),
            code: "05",
            label: "Section Drafts",
            url: "https://drive.google.com/drive/folders/1CQPgjDIpyU-YCbgXJgLDvB1AGq4TTipJ",
          },
          {
            id: id("p", 7),
            code: "06",
            label: "Validation",
            url: "https://drive.google.com/drive/folders/1l-MkMfCnxqv2-h1o-KRNWQXfkv-bfY7h",
          },
          {
            id: id("p", 8),
            code: "07",
            label: "Final Outputs",
            url: "https://drive.google.com/drive/folders/152dk1XHir4iTSfz17Ogh_2y2zIjmwUyE",
          },
        ],
      },
      {
        type: "list",
        id: "sec_actions",
        title: "Needs attention",
        layout: "full",
        style: "alert",
        empty: "Nothing urgent right now.",
        items: [
          {
            id: id("a", 1),
            time: "now",
            source: "",
            text: "Add your first task with “+ Add task”.",
            tag: "start here",
            tagKind: "c-ok",
            kind: "",
            url: "",
          },
        ],
      },
      {
        type: "list",
        id: "sec_granola",
        title: "Meetings",
        layout: "half",
        style: "normal",
        empty: "No meeting notes yet.",
        linkLabel: "Open Granola →",
        linkUrl: "https://app.granola.ai",
        items: [],
      },
      {
        type: "list",
        id: "sec_cal",
        title: "This week",
        layout: "half",
        style: "normal",
        empty: "No plans this week.",
        items: [],
      },
      {
        type: "list",
        id: "sec_mail",
        title: "Mail to handle",
        layout: "half",
        style: "normal",
        empty: "Inbox clear.",
        items: [],
      },
      {
        type: "list",
        id: "sec_emerauld",
        title: "EMERAULD vault",
        layout: "full",
        style: "normal",
        empty: "No vault links yet.",
        linkLabel: "Open on GitHub →",
        linkUrl: "https://github.com/martinlepage26-bit/EMERAULD",
        items: [
          {
            id: id("em", 1),
            time: "",
            source: "GitHub",
            text: "Open the EMERAULD vault",
            tag: "main",
            tagKind: "c-ok",
            kind: "LINK",
            url: "https://github.com/martinlepage26-bit/EMERAULD",
          },
          {
            id: id("em", 2),
            time: "",
            source: "Index",
            text: "Vault home page",
            tag: "",
            tagKind: "",
            kind: "MD",
            url: "https://github.com/martinlepage26-bit/EMERAULD/blob/main/index.md",
          },
          {
            id: id("em", 3),
            time: "",
            source: "Areas",
            text: "Projects and ongoing areas",
            tag: "",
            tagKind: "",
            kind: "LINK",
            url: "https://github.com/martinlepage26-bit/EMERAULD/tree/main/Areas",
          },
        ],
      },
    ],
  };
}
