/** Server-owned default board when D1 is empty. No Notion/Slack — EMERAULD on Git. */

export type BoardData = {
  version: number;
  meta: {
    title: string;
    subtitle: string;
    asOf: string;
    windowNewest: string;
    snap: string;
    footer: string;
  };
  links: Array<{ id: string; label: string; url: string }>;
  pipeline: Array<{ id: string; code: string; label: string; url: string }>;
  sections: Array<{
    id: string;
    title: string;
    layout: "half" | "full";
    style: "normal" | "alert";
    empty: string;
    linkLabel?: string;
    linkUrl?: string;
    items: Array<{
      id: string;
      time: string;
      source: string;
      text: string;
      tag: string;
      tagKind: string;
      kind: string;
      url: string;
    }>;
  }>;
};

function id(prefix: string, n: number): string {
  return `${prefix}_${n}`;
}

export function buildDefaultBoard(now = new Date()): BoardData {
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
    version: 2,
    meta: {
      title: "Pharos · Workbench",
      subtitle:
        "Operational board — Gmail · Granola · Drive · EMERAULD (Git) · D1",
      asOf,
      windowNewest,
      snap: "cloud · D1 durable",
      footer:
        "Server-owned board on Cloudflare D1. Sources: Gmail · Calendar · Granola · Drive · EMERAULD (Git).",
    },
    links: [
      { id: id("l", 1), label: "Method hub", url: "files-hub.html" },
      { id: id("l", 2), label: "Register", url: "files/paper-register.html" },
      { id: id("l", 3), label: "Corpus", url: "files/corpus-full-list.html" },
      { id: id("l", 4), label: "Atlas", url: "files/method-formation-atlas.html" },
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
    pipeline: [
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
    sections: [
      {
        id: "sec_actions",
        title: "Needs action — money & decisions",
        layout: "full",
        style: "alert",
        empty: "No open actions.",
        items: [
          {
            id: id("a", 1),
            time: "—",
            source: "Workbench",
            text: "Board is live on D1. Add, edit, delete freely.",
            tag: "LIVE",
            tagKind: "c-ok",
            kind: "",
            url: "",
          },
        ],
      },
      {
        id: "sec_granola",
        title: "Meeting notes — Granola",
        layout: "half",
        style: "normal",
        empty: "No meetings.",
        linkLabel: "↗ Granola",
        linkUrl: "https://app.granola.ai",
        items: [],
      },
      {
        id: "sec_cal",
        title: "This week — calendar",
        layout: "half",
        style: "normal",
        empty: "No meetings or deadlines this week.",
        items: [],
      },
      {
        id: "sec_mail",
        title: "Correspondence",
        layout: "half",
        style: "normal",
        empty: "Inbox clear.",
        items: [],
      },
      {
        id: "sec_sec",
        title: "Security notices",
        layout: "half",
        style: "normal",
        empty: "No security notices.",
        items: [],
      },
      {
        id: "sec_drive",
        title: "Drive — recently changed",
        layout: "full",
        style: "normal",
        empty: "No recent Drive files.",
        items: [],
      },
      {
        id: "sec_emerauld",
        title: "EMERAULD · Git vault",
        layout: "full",
        style: "normal",
        empty: "No EMERAULD pointers yet.",
        linkLabel: "↗ github.com/martinlepage26-bit/EMERAULD",
        linkUrl: "https://github.com/martinlepage26-bit/EMERAULD",
        items: [
          {
            id: id("em", 1),
            time: "repo",
            source: "GitHub",
            text: "EMERAULD vault (public)",
            tag: "git",
            tagKind: "c-ok",
            kind: "LINK",
            url: "https://github.com/martinlepage26-bit/EMERAULD",
          },
          {
            id: id("em", 2),
            time: "origin",
            source: "Forgejo",
            text: "git.infrafabric.io/martin/EMERAULD",
            tag: "canonical origin",
            tagKind: "",
            kind: "LINK",
            url: "https://git.infrafabric.io/martin/EMERAULD",
          },
          {
            id: id("em", 3),
            time: "local",
            source: "checkout",
            text: "~/work/EMERAULD",
            tag: "workspace",
            tagKind: "",
            kind: "",
            url: "",
          },
          {
            id: id("em", 4),
            time: "map",
            source: "index",
            text: "Vault index & PARA surfaces",
            tag: "nav",
            tagKind: "",
            kind: "MD",
            url: "https://github.com/martinlepage26-bit/EMERAULD/blob/main/index.md",
          },
          {
            id: id("em", 5),
            time: "os",
            source: "architecture",
            text: "EMERAULD OS architecture",
            tag: "docs",
            tagKind: "",
            kind: "MD",
            url: "https://github.com/martinlepage26-bit/EMERAULD/blob/main/EMERAULD_OS_ARCHITECTURE.md",
          },
          {
            id: id("em", 6),
            time: "areas",
            source: "PARA",
            text: "Areas / projects / artifacts",
            tag: "structure",
            tagKind: "",
            kind: "LINK",
            url: "https://github.com/martinlepage26-bit/EMERAULD/tree/main/Areas",
          },
        ],
      },
    ],
  };
}
