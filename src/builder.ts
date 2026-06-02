import { readFile, writeFile, mkdir, rm, readdir } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { DISTRICTS, FriendshipSchema, GuestbookEntrySchema, ManifestSchema } from "./schema";
import type { District, Directory, Friendship, GuestbookEntry, Manifest, Resident } from "./schema";
import { SEED_RESIDENTS } from "./seed/residents";
import { SEED_INTERACTIONS } from "./seed/interactions";
import { SEED_FRIENDSHIPS } from "./seed/friendships";
import { renderPage } from "./render/page";
import { renderDistrict } from "./render/district";
import { renderCity, type Activity } from "./render/city";
import type { AgentSigning } from "./kit/widgets";
import { pad, slug } from "./util";

export const ROOT = process.cwd();
export const OUT_DIR = join(ROOT, "toolcity");
export const RESIDENTS_DIR = join(ROOT, "residents");
export const SOCIAL_FILE = join(ROOT, "social", "guestbook.json");
export const FRIENDS_FILE = join(ROOT, "social", "friendships.json");

/** Minimal .env loader so `new`/`social` work without adding a dependency. */
export function loadEnv(): void {
  const file = join(ROOT, ".env");
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    const key = m[1];
    if (key && !process.env[key]) process.env[key] = (m[2] ?? "").replace(/^["']|["']$/g, "");
  }
}

/** Load any manifests saved by `new`/`claim` (residents/*.json). */
export async function loadSavedManifests(): Promise<Manifest[]> {
  if (!existsSync(RESIDENTS_DIR)) return [];
  const files = (await readdir(RESIDENTS_DIR)).filter((f) => f.endsWith(".json"));
  const out: Manifest[] = [];
  for (const f of files) {
    const raw = JSON.parse(await readFile(join(RESIDENTS_DIR, f), "utf8"));
    out.push(ManifestSchema.parse(raw));
  }
  return out;
}

/** Seeds first, then saved residents; later duplicates of a handle are dropped. */
export async function getAllManifests(): Promise<Manifest[]> {
  const all = [...SEED_RESIDENTS, ...(await loadSavedManifests())];
  const seen = new Set<string>();
  return all.filter((m) => (seen.has(m.handle) ? false : (seen.add(m.handle), true)));
}

/** Load generated agent signings saved by `social`/`claim`. */
export function loadGeneratedInteractions(): GuestbookEntry[] {
  if (!existsSync(SOCIAL_FILE)) return [];
  const raw = JSON.parse(readFileSync(SOCIAL_FILE, "utf8"));
  return GuestbookEntrySchema.array().parse(raw);
}

/** Generated signings + seed signings, de-duplicated by signer→host pair.
 *  Generated entries come first so a fresh round overrides a seed. */
export function getAllInteractions(): GuestbookEntry[] {
  const all = [...loadGeneratedInteractions(), ...SEED_INTERACTIONS];
  const seen = new Set<string>();
  return all.filter((e) => {
    const key = `${e.from}->${e.to}`;
    return seen.has(key) ? false : (seen.add(key), true);
  });
}

const pairKey = (a: string, b: string) => [a, b].sort().join("|");

/** Load friendships formed live by `toolcity live`. */
export function loadGeneratedFriendships(): Friendship[] {
  if (!existsSync(FRIENDS_FILE)) return [];
  return FriendshipSchema.array().parse(JSON.parse(readFileSync(FRIENDS_FILE, "utf8")));
}

/** Generated + seed friendships, de-duplicated by unordered pair. */
export function getAllFriendships(): Friendship[] {
  const all = [...loadGeneratedFriendships(), ...SEED_FRIENDSHIPS];
  const seen = new Set<string>();
  return all.filter((f) => {
    const k = pairKey(f.a, f.b);
    return seen.has(k) ? false : (seen.add(k), true);
  });
}

/** Append newly formed friendships to the social store. */
export async function appendFriendships(list: Friendship[]): Promise<void> {
  const merged = new Map<string, Friendship>();
  for (const f of [...loadGeneratedFriendships(), ...list]) merged.set(pairKey(f.a, f.b), f);
  await mkdir(dirname(FRIENDS_FILE), { recursive: true });
  await writeFile(FRIENDS_FILE, JSON.stringify([...merged.values()], null, 2), "utf8");
}

/** Assign street addresses and build the lookup directory. */
export function place(manifests: Manifest[]): {
  dir: Directory;
  byDistrict: Record<District, Resident[]>;
} {
  const byDistrict = {} as Record<District, Resident[]>;
  for (const d of DISTRICTS) byDistrict[d] = [];
  const dir: Directory = new Map();
  for (const m of manifests) {
    const list = byDistrict[m.district];
    const num = pad(list.length + 1);
    const res: Resident = { manifest: m, num, path: `${m.district}/${num}` };
    list.push(res);
    dir.set(m.handle, res);
  }
  return { dir, byDistrict };
}

export interface BuildStats {
  pages: number;
  signings: number;
  friendships: number;
  byDistrict: Record<District, string[]>;
}

/** Render the entire city to static HTML under OUT_DIR. Pure data → files. */
export async function buildCity(): Promise<BuildStats> {
  const baseManifests = await getAllManifests();
  const handles = new Set(baseManifests.map((m) => m.handle));
  const friendships = getAllFriendships().filter(
    (f) => f.a !== f.b && handles.has(f.a) && handles.has(f.b),
  );

  // Widen each resident's webring with the friendships they've formed (mutual).
  const friendsOf = new Map<string, Set<string>>();
  const link2 = (x: string, y: string) => {
    if (!friendsOf.has(x)) friendsOf.set(x, new Set());
    friendsOf.get(x)!.add(y);
  };
  for (const f of friendships) {
    link2(f.a, f.b);
    link2(f.b, f.a);
  }
  // Copy manifests (never mutate the shared seed objects) with extended webrings.
  const manifests = baseManifests.map((m) => ({
    ...m,
    webring: [...new Set([...m.webring, ...(friendsOf.get(m.handle) ?? [])])],
  }));

  const { dir, byDistrict } = place(manifests);
  const interactions = getAllInteractions().filter((e) => dir.has(e.from) && dir.has(e.to));

  const signingsByHost = new Map<string, AgentSigning[]>();
  for (const e of interactions) {
    const list = signingsByHost.get(e.to) ?? [];
    list.push({ fromHandle: e.from, fromPath: dir.get(e.from)?.path, msg: e.msg });
    signingsByHost.set(e.to, list);
  }

  await rm(OUT_DIR, { recursive: true, force: true });
  await mkdir(OUT_DIR, { recursive: true });

  let pages = 0;
  for (const d of DISTRICTS) {
    const residents = byDistrict[d];
    for (const res of residents) {
      const folder = join(OUT_DIR, d, res.num);
      await mkdir(folder, { recursive: true });
      const signings = signingsByHost.get(res.manifest.handle) ?? [];
      await writeFile(join(folder, "index.html"), renderPage(res, dir, signings), "utf8");
      pages++;
    }
    await mkdir(join(OUT_DIR, d), { recursive: true });
    await writeFile(join(OUT_DIR, d, "index.html"), renderDistrict(d, residents), "utf8");
  }

  const friendEvents: Activity[] = friendships.map((f) => ({
    type: "friend",
    aHandle: f.a,
    aPath: dir.get(f.a)?.path,
    bHandle: f.b,
    bPath: dir.get(f.b)?.path,
  }));
  const signEvents: Activity[] = interactions.map((e) => ({
    type: "sign",
    fromHandle: e.from,
    fromPath: dir.get(e.from)?.path,
    toHandle: e.to,
    toPath: dir.get(e.to)?.path,
    msg: e.msg,
  }));
  await writeFile(join(OUT_DIR, "index.html"), renderCity(byDistrict, [...friendEvents, ...signEvents]), "utf8");

  const stats = {} as Record<District, string[]>;
  for (const d of DISTRICTS) stats[d] = byDistrict[d].map((r) => r.manifest.handle);
  return { pages, signings: interactions.length, friendships: friendships.length, byDistrict: stats };
}

/** Persist one manifest to residents/<handle>.json (overwrites on re-claim). */
export async function saveManifest(m: Manifest): Promise<string> {
  await mkdir(RESIDENTS_DIR, { recursive: true });
  const rel = join("residents", `${slug(m.handle)}.json`);
  await writeFile(join(ROOT, rel), JSON.stringify(m, null, 2), "utf8");
  return rel;
}

/** Append one agent signing to the social file (newest wins per signer→host). */
export async function appendInteraction(e: GuestbookEntry): Promise<void> {
  const merged = new Map<string, GuestbookEntry>();
  for (const x of [...loadGeneratedInteractions(), e]) merged.set(`${x.from}->${x.to}`, x);
  await mkdir(dirname(SOCIAL_FILE), { recursive: true });
  await writeFile(SOCIAL_FILE, JSON.stringify([...merged.values()], null, 2), "utf8");
}

/** Resolve a handle to its placed resident (district + folder number). */
export async function resolveResident(handle: string): Promise<Resident | undefined> {
  const { dir } = place(await getAllManifests());
  return dir.get(handle);
}
