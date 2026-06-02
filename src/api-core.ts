/**
 * Runtime-agnostic API logic for ToolCity's shared guestbooks + hit counters.
 * Used by BOTH the Node dev server (`toolcity serve`) and the Cloudflare Worker
 * (`worker/`). Contains no Node or Worker APIs — just data in, result out — so
 * the endpoint behaviour is defined in exactly one place.
 */

export const VALID_ID = /^[A-Za-z]+\/\d{4}$/; // District/NNNN, e.g. "CodeForge/0001"

const MAX_ENTRIES = 200; // cap guestbook entries kept per page

export interface GuestEntry {
  name: string;
  msg: string;
}

/** The minimal async key/value store each backend provides. */
export interface KVStore {
  getJson<T>(key: string, fallback: T): Promise<T>;
  putJson(key: string, value: unknown): Promise<void>;
}

export interface ApiRequest {
  method: string;
  path: string; // e.g. "/api/hit"
  query: URLSearchParams;
  body: unknown; // parsed JSON (or {})
}

export interface ApiResult {
  status: number;
  body: unknown;
}

function field(body: unknown, key: string): string {
  const v = (body as Record<string, unknown> | null | undefined)?.[key];
  return v == null ? "" : String(v);
}

/** Route + execute one API request against the given store. */
export async function handleApiRequest(req: ApiRequest, kv: KVStore): Promise<ApiResult> {
  const { method, path, query, body } = req;

  // POST /api/hit  {id} -> {count}   (global, accumulating visit counter)
  if (path === "/api/hit" && method === "POST") {
    const id = field(body, "id");
    if (!VALID_ID.test(id)) return { status: 400, body: { error: "bad id" } };
    const next = (await kv.getJson<number>(`hit:${id}`, 0)) + 1;
    await kv.putJson(`hit:${id}`, next);
    return { status: 200, body: { count: next } };
  }

  // GET /api/guestbook?id=ID -> {entries:[{name,msg}]}
  if (path === "/api/guestbook" && method === "GET") {
    const id = query.get("id") ?? "";
    if (!VALID_ID.test(id)) return { status: 400, body: { error: "bad id" } };
    const entries = await kv.getJson<GuestEntry[]>(`gb:${id}`, []);
    return { status: 200, body: { entries } };
  }

  // POST /api/guestbook  {id,name,msg} -> {ok,entry}
  if (path === "/api/guestbook" && method === "POST") {
    const id = field(body, "id");
    if (!VALID_ID.test(id)) return { status: 400, body: { error: "bad id" } };
    const name = (field(body, "name") || "anonymous coward").slice(0, 40);
    const msg = field(body, "msg").trim().slice(0, 200);
    if (!msg) return { status: 400, body: { error: "empty message" } };
    const entry: GuestEntry = { name, msg };
    const entries = (await kv.getJson<GuestEntry[]>(`gb:${id}`, [])).concat(entry).slice(-MAX_ENTRIES);
    await kv.putJson(`gb:${id}`, entries);
    return { status: 200, body: { ok: true, entry } };
  }

  return { status: 404, body: { error: "no such endpoint" } };
}
