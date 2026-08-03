import seeds from "../seeds.json";

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

async function ensureDatabase(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS guides (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      saved_at TEXT,
      updated INTEGER NOT NULL
    )
  `).run();

  const row = await db.prepare("SELECT COUNT(*) AS count FROM guides").first();
  if (Number(row?.count ?? 0) > 0 || seeds.length === 0) return;

  const now = Date.now();
  await db.batch(
    seeds.map((guide, index) =>
      db.prepare(
        "INSERT OR IGNORE INTO guides (id, data, saved_at, updated) VALUES (?, ?, ?, ?)",
      ).bind(guide.id, JSON.stringify(guide), guide.savedAt ?? "", now - index),
    ),
  );
}

async function readGuideBody(request, forcedId) {
  let guide;
  try {
    guide = await request.json();
  } catch {
    return { error: json({ error: "invalid body" }, 400) };
  }

  if (!guide || typeof guide !== "object" || Array.isArray(guide)) {
    return { error: json({ error: "invalid body" }, 400) };
  }

  const id = forcedId || guide.id;
  if (!id || typeof id !== "string") {
    return { error: json({ error: "missing id" }, 400) };
  }

  guide.id = id;
  return { guide, id };
}

async function handleGuides(request, env, pathname) {
  await ensureDatabase(env.DB);

  const prefix = "/api/guides/";
  const id = pathname.startsWith(prefix)
    ? decodeURIComponent(pathname.slice(prefix.length))
    : null;

  if (request.method === "GET" && !id) {
    const result = await env.DB.prepare(
      "SELECT data FROM guides ORDER BY updated DESC",
    ).all();
    return json(result.results.map((row) => JSON.parse(row.data)));
  }

  if (request.method === "GET" && id) {
    const row = await env.DB.prepare("SELECT data FROM guides WHERE id = ?")
      .bind(id)
      .first();
    return row ? json(JSON.parse(row.data)) : json({ error: "not found" }, 404);
  }

  if ((request.method === "POST" && !id) || (request.method === "PUT" && id)) {
    const parsed = await readGuideBody(request, id);
    if (parsed.error) return parsed.error;

    const updated = Date.now();
    await env.DB.prepare(`
      INSERT INTO guides (id, data, saved_at, updated)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        data = excluded.data,
        saved_at = excluded.saved_at,
        updated = excluded.updated
    `).bind(
      parsed.id,
      JSON.stringify(parsed.guide),
      parsed.guide.savedAt ?? "",
      updated,
    ).run();

    return json(parsed.guide);
  }

  if (request.method === "DELETE" && id) {
    await env.DB.prepare("DELETE FROM guides WHERE id = ?").bind(id).run();
    return json({ ok: true });
  }

  return json({ error: "method not allowed" }, 405);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    try {
      if (url.pathname === "/api/health") {
        await ensureDatabase(env.DB);
        return json({ ok: true, ts: Math.floor(Date.now() / 1000) });
      }

      if (url.pathname === "/api/guides" || url.pathname.startsWith("/api/guides/")) {
        return await handleGuides(request, env, url.pathname);
      }

      if (url.pathname.startsWith("/api/")) {
        return json({ error: "not found" }, 404);
      }

      return env.ASSETS.fetch(request);
    } catch (error) {
      console.error(error);
      return json({ error: "internal server error" }, 500);
    }
  },
};
