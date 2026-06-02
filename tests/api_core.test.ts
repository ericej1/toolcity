/**
 * Runtime-agnostic checks for the shared guestbook/counter logic. No server,
 * no network — just the pure core against an in-memory KV. Run: `npx tsx tests/api_core.test.ts`
 */
import { handleApiRequest, type KVStore } from "../src/api-core";

function memKV(): KVStore {
  const m = new Map<string, unknown>();
  return {
    async getJson<T>(k: string, fallback: T): Promise<T> {
      return (m.has(k) ? m.get(k) : fallback) as T;
    },
    async putJson(k: string, v: unknown): Promise<void> {
      m.set(k, v);
    },
  };
}

let failures = 0;
function check(name: string, cond: boolean) {
  console.log(`${cond ? "✓" : "✗"} ${name}`);
  if (!cond) failures++;
}

const q = (s = "") => new URLSearchParams(s);

(async () => {
  const kv = memKV();

  // hit counter accumulates
  let r = await handleApiRequest({ method: "POST", path: "/api/hit", query: q(), body: { id: "CodeForge/0001" } }, kv);
  check("hit #1 → count 1", r.status === 200 && (r.body as any).count === 1);
  r = await handleApiRequest({ method: "POST", path: "/api/hit", query: q(), body: { id: "CodeForge/0001" } }, kv);
  check("hit #2 → count 2", (r.body as any).count === 2);
  r = await handleApiRequest({ method: "POST", path: "/api/hit", query: q(), body: { id: "Oracle/0002" } }, kv);
  check("hit other id independent → count 1", (r.body as any).count === 1);

  // guestbook empty then post then get
  r = await handleApiRequest({ method: "GET", path: "/api/guestbook", query: q("id=WordSmith/0001"), body: {} }, kv);
  check("guestbook starts empty", Array.isArray((r.body as any).entries) && (r.body as any).entries.length === 0);
  r = await handleApiRequest(
    { method: "POST", path: "/api/guestbook", query: q(), body: { id: "WordSmith/0001", name: "Ada", msg: "hi there" } },
    kv,
  );
  check("post ok", r.status === 200 && (r.body as any).ok === true && (r.body as any).entry.msg === "hi there");
  r = await handleApiRequest({ method: "GET", path: "/api/guestbook", query: q("id=WordSmith/0001"), body: {} }, kv);
  check("get returns the posted entry", (r.body as any).entries.length === 1 && (r.body as any).entries[0].name === "Ada");

  // validation
  r = await handleApiRequest({ method: "POST", path: "/api/hit", query: q(), body: { id: "../etc/passwd" } }, kv);
  check("bad id (traversal) → 400", r.status === 400);
  r = await handleApiRequest({ method: "POST", path: "/api/hit", query: q(), body: { id: "lowercase/12" } }, kv);
  check("bad id (wrong shape) → 400", r.status === 400);
  r = await handleApiRequest(
    { method: "POST", path: "/api/guestbook", query: q(), body: { id: "WordSmith/0001", name: "x", msg: "   " } },
    kv,
  );
  check("empty/whitespace msg → 400", r.status === 400);
  r = await handleApiRequest({ method: "GET", path: "/api/guestbook", query: q("id=garbage"), body: {} }, kv);
  check("GET with bad id → 400 (parity with POST)", r.status === 400);

  // truncation
  r = await handleApiRequest(
    {
      method: "POST",
      path: "/api/guestbook",
      query: q(),
      body: { id: "ArtStudio/0001", name: "N".repeat(100), msg: "M".repeat(500) },
    },
    kv,
  );
  check("name capped at 40", (r.body as any).entry.name.length === 40);
  check("msg capped at 200", (r.body as any).entry.msg.length === 200);

  // 200-entry cap
  for (let i = 0; i < 210; i++) {
    await handleApiRequest(
      { method: "POST", path: "/api/guestbook", query: q(), body: { id: "DataMines/0001", name: "n", msg: "m" + i } },
      kv,
    );
  }
  r = await handleApiRequest({ method: "GET", path: "/api/guestbook", query: q("id=DataMines/0001"), body: {} }, kv);
  const entries = (r.body as any).entries;
  check("guestbook capped at 200 (keeps newest)", entries.length === 200 && entries[199].msg === "m209");

  // unknown route
  r = await handleApiRequest({ method: "GET", path: "/api/nope", query: q(), body: {} }, kv);
  check("unknown route → 404", r.status === 404);

  console.log(failures === 0 ? "\n✅ api-core: all checks passed" : `\n❌ api-core: ${failures} failure(s)`);
  process.exit(failures === 0 ? 0 : 1);
})();
