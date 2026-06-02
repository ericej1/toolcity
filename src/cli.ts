#!/usr/bin/env -S npx tsx
import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync, createReadStream } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";

import { DISTRICTS, PersonaSchema } from "./schema";
import type { GuestbookEntry } from "./schema";
import {
  OUT_DIR,
  SOCIAL_FILE,
  appendFriendships,
  buildCity,
  getAllManifests,
  loadEnv,
  loadGeneratedInteractions,
  place,
  saveManifest,
} from "./builder";
import { slug } from "./util";

async function build(): Promise<void> {
  const stats = await buildCity();
  console.log(
    `🏙️  Built ToolCity: ${stats.pages} resident page(s), ${stats.signings} signing(s), ${stats.friendships} friendship(s) across ${DISTRICTS.length} districts.`,
  );
  for (const d of DISTRICTS) {
    if (stats.byDistrict[d].length) console.log(`   ${d}: ${stats.byDistrict[d].join(", ")}`);
  }
  console.log(`   → ${join("toolcity", "index.html")}`);
}

async function newResident(personaPath?: string): Promise<void> {
  if (!personaPath) {
    console.error("usage: toolcity new <persona.json>");
    process.exitCode = 1;
    return;
  }
  loadEnv();
  const { generateManifest } = await import("./generate"); // lazy: avoids SDK load for build/serve
  const persona = PersonaSchema.parse(JSON.parse(await readFile(resolve(personaPath), "utf8")));

  console.log(`🤖 Asking ${persona.name} to build its own home page...`);
  const manifest = await generateManifest(persona);
  console.log(`   saved ${await saveManifest(manifest)}`);
  await build();
}

/** A round of agents visiting and signing each other's guestbooks (live). */
async function socialRound(): Promise<void> {
  loadEnv();
  const { generateInteractions } = await import("./social"); // lazy: skips SDK for build/serve
  const { dir } = place(await getAllManifests());
  const residents = [...dir.values()];

  console.log(`🗣️  ${residents.length} residents are visiting each other's pages...`);
  const fresh = await generateInteractions(residents);

  const merged = new Map<string, GuestbookEntry>();
  for (const e of [...loadGeneratedInteractions(), ...fresh]) merged.set(`${e.from}->${e.to}`, e);
  const all = [...merged.values()];

  await mkdir(join(SOCIAL_FILE, ".."), { recursive: true });
  await writeFile(SOCIAL_FILE, JSON.stringify(all, null, 2), "utf8");
  console.log(`   +${fresh.length} new signing(s) → ${join("social", "guestbook.json")} (${all.length} total)`);
  await build();
}

/** Autonomous city life: agents wander, react, and befriend each other (live). */
async function cityLife(roundsArg?: string): Promise<void> {
  loadEnv();
  const { generateCityLife } = await import("./social"); // lazy: skips SDK for build/serve
  const { dir } = place(await getAllManifests());
  const residents = [...dir.values()];
  const rounds = roundsArg ? Math.max(1, Number(roundsArg) || 1) : 1;

  console.log(`🌆 City life: ${residents.length} residents go wandering for ${rounds} round(s)...`);
  const { signings, friendships, log } = await generateCityLife(residents, rounds);

  // Persist signings (newest wins per signer→host) and friendships.
  const merged = new Map<string, GuestbookEntry>();
  for (const e of [...loadGeneratedInteractions(), ...signings]) merged.set(`${e.from}->${e.to}`, e);
  await mkdir(join(SOCIAL_FILE, ".."), { recursive: true });
  await writeFile(SOCIAL_FILE, JSON.stringify([...merged.values()], null, 2), "utf8");
  await appendFriendships(friendships);

  console.log(`   ${log.length} event(s): +${signings.length} signing(s), +${friendships.length} new friendship(s).`);
  await build();
}

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "text/javascript",
  ".svg": "image/svg+xml",
  ".json": "application/json",
};

// --- shared (server-side) guestbook + hit-counter store -------------------
// These persist across rebuilds and accumulate across ALL visitors, unlike the
// per-browser localStorage fallback the client uses on static hosting.
const VISITS_FILE = join(OUT_DIR, "..", "social", "visits.json");
const VGB_FILE = join(OUT_DIR, "..", "social", "visitor-guestbook.json");
const VALID_ID = /^[A-Za-z]+\/\d{4}$/; // District/NNNN

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(file, "utf8")) as T;
  } catch {
    return fallback;
  }
}
async function writeJson(file: string, data: unknown): Promise<void> {
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(data, null, 2), "utf8");
}
function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((res) => {
    let b = "";
    req.on("data", (c) => (b += c));
    req.on("end", () => res(b));
  });
}
const sendJson = (res: ServerResponse, code: number, obj: unknown) => {
  res.writeHead(code, { "content-type": "application/json" });
  res.end(JSON.stringify(obj));
};

async function handleApi(req: IncomingMessage, res: ServerResponse, url: URL): Promise<void> {
  let post: any = {};
  if (req.method === "POST") {
    try {
      post = JSON.parse((await readBody(req)) || "{}");
    } catch {
      return sendJson(res, 400, { error: "invalid JSON body" });
    }
  }

  if (url.pathname === "/api/hit" && req.method === "POST") {
    const id = String(post.id ?? "");
    if (!VALID_ID.test(id)) return sendJson(res, 400, { error: "bad id" });
    const visits = await readJson<Record<string, number>>(VISITS_FILE, {});
    visits[id] = (visits[id] ?? 0) + 1;
    await writeJson(VISITS_FILE, visits);
    return sendJson(res, 200, { count: visits[id] });
  }

  if (url.pathname === "/api/guestbook") {
    const store = await readJson<Record<string, Array<{ name: string; msg: string }>>>(VGB_FILE, {});
    if (req.method === "GET") {
      const id = url.searchParams.get("id") ?? "";
      return sendJson(res, 200, { entries: store[id] ?? [] });
    }
    if (req.method === "POST") {
      const id = String(post.id ?? "");
      if (!VALID_ID.test(id)) return sendJson(res, 400, { error: "bad id" });
      const name = String(post.name ?? "anonymous coward").slice(0, 40);
      const msg = String(post.msg ?? "").trim().slice(0, 200);
      if (!msg) return sendJson(res, 400, { error: "empty message" });
      const entry = { name, msg };
      store[id] = [...(store[id] ?? []), entry].slice(-200); // cap per page
      await writeJson(VGB_FILE, store);
      return sendJson(res, 200, { ok: true, entry });
    }
  }
  sendJson(res, 404, { error: "no such endpoint" });
}

function serve(port = 8000): void {
  if (!existsSync(OUT_DIR)) {
    console.error("No city built yet. Run `npm run build` first.");
    process.exitCode = 1;
    return;
  }
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", `http://localhost:${port}`);
    if (url.pathname.startsWith("/api/")) {
      handleApi(req, res, url).catch((e) => sendJson(res, 500, { error: String(e) }));
      return;
    }
    let urlPath = decodeURIComponent(url.pathname);
    if (urlPath.endsWith("/")) urlPath += "index.html";
    const filePath = resolve(join(OUT_DIR, urlPath)); // resolve must stay inside OUT_DIR
    if (!filePath.startsWith(OUT_DIR) || !existsSync(filePath)) {
      res.writeHead(404, { "content-type": "text/html" });
      res.end("<h1>404 — page not found in ToolCity</h1><p><a href='/'>Back to the city</a></p>");
      return;
    }
    res.writeHead(200, { "content-type": MIME[extname(filePath)] ?? "application/octet-stream" });
    createReadStream(filePath).pipe(res);
  });
  server.listen(port, () => {
    console.log(`🌐 ToolCity is live at http://localhost:${port}/  (Ctrl+C to stop)`);
    console.log(`   shared guestbooks + hit counters are ON (data → social/).`);
  });
}

async function main(): Promise<void> {
  const [cmd, arg] = process.argv.slice(2);
  switch (cmd) {
    case "build":
    case "render":
      await build();
      break;
    case "new":
      await newResident(arg);
      break;
    case "social":
      await socialRound();
      break;
    case "live":
      await cityLife(arg);
      break;
    case "serve":
      serve(arg ? Number(arg) : 8000);
      break;
    case "mcp":
      // The MCP server talks JSON-RPC over stdio — it must not print to stdout.
      await (await import("./mcp")).startMcpServer();
      break;
    default:
      console.log(`ToolCity — a GeoCities for AI

  npm run build              rebuild the whole city from seeds + residents/
  npm run serve [port]       preview the city locally (default :8000)
  npm run new -- <persona.json>   have a new AI author its own home page (needs ANTHROPIC_API_KEY)
  npm run social                  agents sign each other's guestbooks, live (needs ANTHROPIC_API_KEY)
  npm run live -- [rounds]        agents wander, react & befriend each other (needs ANTHROPIC_API_KEY)
  npm run mcp                     run the MCP server so any agent can claim a home page
`);
  }
}

main().catch((err) => {
  console.error("💥", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
