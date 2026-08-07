/** Same-origin board API (cookie session). */

export function createApi({ onStatus } = {}) {
  let revision = 0;

  function setStatus(text, ok) {
    if (typeof onStatus === "function") onStatus(text, ok);
  }

  async function apiFetch(path, options = {}, attempt = 0) {
    const headers = Object.assign(
      {
        "Content-Type": "application/json",
        "X-Workbench-Client": "pharos-workbench-web",
      },
      options.headers || {}
    );
    let res;
    try {
      res = await fetch(path, {
        ...options,
        headers,
        credentials: "include",
      });
    } catch (e) {
      if (attempt < 4) {
        await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
        return apiFetch(path, options, attempt + 1);
      }
      throw e;
    }
    if ((res.status === 404 || res.status >= 500) && attempt < 5) {
      const text = await res.clone().text();
      if (text.includes("error code: 1042") || res.status >= 500) {
        await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
        return apiFetch(path, options, attempt + 1);
      }
    }
    return res;
  }

  async function sessionStatus() {
    const res = await apiFetch("/api/session/status");
    if (!res.ok) return { authenticated: false };
    return res.json();
  }

  async function login(key) {
    const res = await apiFetch("/api/session/login", {
      method: "POST",
      body: JSON.stringify({ key }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error("login failed: " + res.status + " " + t.slice(0, 120));
    }
    return res.json();
  }

  async function loadBoard() {
    const res = await apiFetch("/api/board");
    if (res.status === 401) {
      const err = new Error("unauthorized");
      err.code = 401;
      throw err;
    }
    if (!res.ok) throw new Error("GET /api/board → " + res.status);
    const body = await res.json();
    revision = body.revision || 0;
    return body;
  }

  async function saveBoard(data, { force = false } = {}) {
    const payload = {
      data,
      expected_revision: force ? null : revision || null,
      client: "pharos-workbench-web",
    };
    const headers = {};
    if (!force && revision) headers["If-Match"] = 'W/"' + revision + '"';
    const res = await apiFetch("/api/board", {
      method: "PUT",
      body: JSON.stringify(payload),
      headers,
    });
    if (res.status === 409) {
      const conf = await res.json();
      const err = new Error("revision_conflict");
      err.conflict = conf;
      throw err;
    }
    if (res.status === 401) {
      const err = new Error("unauthorized");
      err.code = 401;
      throw err;
    }
    if (!res.ok) {
      const t = await res.text();
      throw new Error("PUT /api/board → " + res.status + " " + t.slice(0, 120));
    }
    const body = await res.json();
    revision = body.revision || revision;
    setStatus("backend: synced · r" + revision, true);
    return body;
  }

  async function resetBoard() {
    const res = await apiFetch("/api/board/reset", { method: "POST" });
    if (!res.ok) throw new Error("reset failed: " + res.status);
    const body = await res.json();
    revision = body.revision || 0;
    return body;
  }

  return {
    get revision() {
      return revision;
    },
    set revision(v) {
      revision = v || 0;
    },
    apiFetch,
    sessionStatus,
    login,
    loadBoard,
    saveBoard,
    resetBoard,
    setStatus,
  };
}
