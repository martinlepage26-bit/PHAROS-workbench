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
      subtitle: "What needs you",
      asOf,
      windowNewest,
      snap: "cloud",
      footer: "Saves when you’re signed in.",
    },
    blocks: [
      {
        type: "links",
        id: "nav",
        items: [
          { id: id("l", 1), label: "Papers", url: "files-hub.html" },
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
        title: "Writing path",
        stages: [
          {
            id: id("p", 0),
            code: "00",
            label: "Control",
            url: "https://drive.google.com/drive/folders/1akv_LPk20UwaxJsIqoSx6G2DzKbWzfWR",
          },
          {
            id: id("p", 1),
            code: "01",
            label: "Materials",
            url: "https://drive.google.com/drive/folders/19R0FXtZmswAWS_faMLPHuISDVkdfYoR8",
          },
          {
            id: id("p", 2),
            code: "02",
            label: "Sources",
            url: "https://drive.google.com/drive/folders/1Ai6bV09M-6ZJoHnesyepb_xUisKrzVod",
          },
          {
            id: id("p", 3),
            code: "02.5",
            label: "Cut",
            url: "https://drive.google.com/drive/folders/1rOd2FrAkMGm0tKHd5DEWYE0MYo_91w22",
          },
          {
            id: id("p", 4),
            code: "03",
            label: "Outline",
            url: "https://drive.google.com/drive/folders/1MpYZBUTgK37NlNvrfUZ_HOsFk4lktPXY",
          },
          {
            id: id("p", 5),
            code: "04",
            label: "Research",
            url: "https://drive.google.com/drive/folders/1kfL0_H8n1sS279fY7JCy4t6julrBNh7m",
          },
          {
            id: id("p", 6),
            code: "05",
            label: "Drafts",
            url: "https://drive.google.com/drive/folders/1CQPgjDIpyU-YCbgXJgLDvB1AGq4TTipJ",
          },
          {
            id: id("p", 7),
            code: "06",
            label: "Check",
            url: "https://drive.google.com/drive/folders/1l-MkMfCnxqv2-h1o-KRNWQXfkv-bfY7h",
          },
          {
            id: id("p", 8),
            code: "07",
            label: "Final",
            url: "https://drive.google.com/drive/folders/152dk1XHir4iTSfz17Ogh_2y2zIjmwUyE",
          },
        ],
      },
      {
        type: "list",
        id: "sec_actions",
        title: "Needs you",
        layout: "full",
        style: "alert",
        empty: "Clear.",
        items: [
          {
            id: id("a", 1),
            time: "",
            source: "",
            text: "Press Add — put the work and the link to do it.",
            tag: "",
            tagKind: "",
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
        empty: "None yet.",
        linkLabel: "Granola",
        linkUrl: "https://app.granola.ai",
        items: [],
      },
      {
        type: "list",
        id: "sec_cal",
        title: "This week",
        layout: "half",
        style: "normal",
        empty: "Clear.",
        items: [],
      },
      {
        type: "list",
        id: "sec_mail",
        title: "Mail",
        layout: "half",
        style: "normal",
        empty: "Clear.",
        items: [],
      },
      {
        type: "list",
        id: "sec_emerauld",
        title: "EMERAULD",
        layout: "full",
        style: "normal",
        empty: "None yet.",
        linkLabel: "GitHub",
        linkUrl: "https://github.com/martinlepage26-bit/EMERAULD",
        items: [
          {
            id: id("em", 1),
            time: "",
            source: "",
            text: "Vault",
            tag: "",
            tagKind: "",
            kind: "LINK",
            url: "https://github.com/martinlepage26-bit/EMERAULD",
            links: [
              {
                label: "Go",
                url: "https://github.com/martinlepage26-bit/EMERAULD",
              },
            ],
          },
          {
            id: id("em", 2),
            time: "",
            source: "",
            text: "Index",
            tag: "",
            tagKind: "",
            kind: "MD",
            url: "https://github.com/martinlepage26-bit/EMERAULD/blob/main/index.md",
            links: [
              {
                label: "Go",
                url: "https://github.com/martinlepage26-bit/EMERAULD/blob/main/index.md",
              },
            ],
          },
          {
            id: id("em", 3),
            time: "",
            source: "",
            text: "Areas",
            tag: "",
            tagKind: "",
            kind: "LINK",
            url: "https://github.com/martinlepage26-bit/EMERAULD/tree/main/Areas",
            links: [
              {
                label: "Go",
                url: "https://github.com/martinlepage26-bit/EMERAULD/tree/main/Areas",
              },
            ],
          },
        ],
      },
    ],
  };
}
