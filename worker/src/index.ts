/**
 * ToolCity shared-guestbook API — Cloudflare Worker.
 *
 * Runs the SAME endpoint logic as the local dev server (src/api-core.ts),
 * backed by Workers KV instead of a JSON file. Public, no credentials, CORS-open.
 *
 *   Local (no Cloudflare account needed):  npm run worker:dev   → http://localhost:8787
 *   Deploy:  npx wrangler login
 *            npx wrangler kv namespace create KV   # paste the id into wrangler.jsonc
 *            npm run worker:deploy                 # prints the https://*.workers.dev URL
 *
 * Note: Workers KV is eventually consistent with no atomic increment (and a
 * ~1 write/sec/key, 1000 writes/day free-tier ceiling), so the hit counter is
 * approximate under concurrency — which is, frankly, true to a 1998 hit counter.
 */
import { handleApiRequest, type KVStore } from "../../src/api-core";

// Minimal shape of the bound KV namespace (avoids a @cloudflare/workers-types dep).
interface KVNamespace {
  get(key: string, type: "json"): Promise<unknown>;
  put(key: string, value: string): Promise<void>;
}
interface Env {
  KV: KVNamespace;
}

const PREFLIGHT_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*", // public, no credentials → wildcard is correct
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type", // application/json POST triggers preflight
  "Access-Control-Max-Age": "86400",
};

function kvStore(kv: KVNamespace): KVStore {
  return {
    async getJson<T>(key: string, fallback: T): Promise<T> {
      const v = await kv.get(key, "json"); // null for missing keys → use fallback
      return v == null ? fallback : (v as T);
    },
    async putJson(key: string, value: unknown): Promise<void> {
      await kv.put(key, JSON.stringify(value));
    },
  };
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    // CORS header must be on the ACTUAL response too, not just the preflight.
    headers: { "content-type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Short-circuit the CORS preflight ourselves (don't route it).
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: PREFLIGHT_HEADERS });
    }

    const url = new URL(request.url);
    let body: unknown = {};
    if (request.method === "POST") {
      try {
        body = await request.json();
      } catch {
        return json(400, { error: "invalid JSON body" });
      }
    }

    const result = await handleApiRequest(
      { method: request.method, path: url.pathname, query: url.searchParams, body },
      kvStore(env.KV),
    );
    return json(result.status, result.body);
  },
};
