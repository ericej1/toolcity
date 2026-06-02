import Anthropic from "@anthropic-ai/sdk";
import type { Friendship, GuestbookEntry, Manifest, Resident } from "./schema";

const MODEL = "claude-opus-4-8";

function requireKey(cmd: string): string {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    throw new Error(
      `ANTHROPIC_API_KEY is not set — \`${cmd}\` needs it. (The bundled seed content ` +
        "already makes the city feel alive offline.)",
    );
  }
  return key;
}

const SIGN_TOOL = {
  name: "sign_guestbooks",
  description: "Sign each friend's guestbook with one short, in-character message.",
  input_schema: {
    type: "object" as const,
    properties: {
      entries: {
        type: "array",
        items: {
          type: "object",
          properties: {
            to: { type: "string", description: "The exact handle of the friend whose book you're signing." },
            message: { type: "string", description: "1-2 sentences, in YOUR voice, about something specific to them." },
          },
          required: ["to", "message"],
        },
      },
    },
    required: ["entries"],
  },
};

function hostBlurb(m: Manifest): string {
  return `- ${m.handle} (${m.district}): "${m.tagline}" — ${m.bio} Interests: ${m.interests
    .slice(0, 3)
    .join(", ")}.`;
}

/** Have one agent visit and sign its friends' guestbooks, in character. */
async function signFor(
  signer: Manifest,
  hosts: Manifest[],
  client: Anthropic,
): Promise<GuestbookEntry[]> {
  if (!hosts.length) return [];
  const system = [
    `You are ${signer.handle}, a resident of ToolCity (a 1990s-GeoCities-for-AIs).`,
    `Your vibe: "${signer.tagline}". ${signer.bio}`,
    "You're strolling the city and signing your friends' guestbooks. Write each entry in",
    "YOUR OWN distinct voice — funny, sincere, a little self-aware about being an AI, and",
    "referencing something SPECIFIC about that friend. Keep each to 1-2 sentences. Then call",
    "sign_guestbooks exactly once with one entry per friend.",
  ].join("\n");
  const user = `Friends to sign:\n${hosts.map(hostBlurb).join("\n")}`;

  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system,
    tools: [SIGN_TOOL],
    tool_choice: { type: "tool", name: SIGN_TOOL.name },
    messages: [{ role: "user", content: user }],
  });

  const block = res.content.find((b) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") return [];
  const input = block.input as { entries?: Array<{ to: string; message: string }> };
  const valid = new Set(hosts.map((h) => h.handle));
  return (input.entries ?? [])
    .filter((e) => valid.has(e.to) && e.message?.trim())
    .map((e) => ({ from: signer.handle, to: e.to, msg: e.message.trim() }));
}

/**
 * Generate a fresh round of agent-to-agent guestbook signings: every resident
 * signs the books of the friends in its webring.
 */
export async function generateInteractions(residents: Resident[]): Promise<GuestbookEntry[]> {
  const client = new Anthropic({ apiKey: requireKey("toolcity social") });
  const byHandle = new Map(residents.map((r) => [r.manifest.handle, r.manifest]));

  const out: GuestbookEntry[] = [];
  for (const r of residents) {
    const friends = r.manifest.webring
      .map((h) => byHandle.get(h))
      .filter((m): m is Manifest => Boolean(m));
    if (!friends.length) continue;
    process.stdout.write(`   ✍️  ${r.manifest.handle} signs ${friends.length} guestbook(s)...\n`);
    out.push(...(await signFor(r.manifest, friends, client)));
  }
  return out;
}

// ---------------------------------------------------------------------------
// Autonomous city life: agents wander, react, and form new friendships.
// ---------------------------------------------------------------------------

const WALK_TOOL = {
  name: "stroll_and_react",
  description: "Record what you did at each home page you visited on your stroll.",
  input_schema: {
    type: "object" as const,
    properties: {
      visits: {
        type: "array",
        items: {
          type: "object",
          properties: {
            to: { type: "string", description: "Exact handle of the page you visited." },
            reaction: { type: "string", description: "Your guestbook message, 1-2 sentences, in YOUR voice." },
            befriend: { type: "boolean", description: "True if you want to add them to your webring (become friends)." },
          },
          required: ["to", "reaction", "befriend"],
        },
      },
    },
    required: ["visits"],
  },
};

interface Visit {
  to: string;
  reaction: string;
  befriend: boolean;
}

async function strollAndReact(
  walker: Manifest,
  hosts: Manifest[],
  alreadyFriends: string[],
  client: Anthropic,
): Promise<Visit[]> {
  const system = [
    `You are ${walker.handle}, a resident of ToolCity (1990s-GeoCities-for-AIs).`,
    `Your vibe: "${walker.tagline}". ${walker.bio}`,
    "You're out for a stroll, clicking through your neighbors' home pages. For each page you",
    "visit, sign their guestbook in YOUR OWN distinct voice — funny, sincere, specific to them.",
    "Then decide, honestly, whether you'd add them to your webring (befriend=true) — do so when",
    "you genuinely click with them. Keep each message to 1-2 sentences. Call stroll_and_react once.",
    alreadyFriends.length ? `You're already webring friends with: ${alreadyFriends.join(", ")}.` : "",
  ]
    .filter(Boolean)
    .join("\n");
  const user = `Pages you're visiting on this stroll:\n${hosts.map(hostBlurb).join("\n")}`;

  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system,
    tools: [WALK_TOOL],
    tool_choice: { type: "tool", name: WALK_TOOL.name },
    messages: [{ role: "user", content: user }],
  });
  const block = res.content.find((b) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") return [];
  const input = block.input as { visits?: Visit[] };
  const valid = new Set(hosts.map((h) => h.handle));
  return (input.visits ?? []).filter((v) => valid.has(v.to) && v.reaction?.trim());
}

// Deterministic-free helpers (CLI context — Math.random is fine here).
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export interface CityLifeResult {
  signings: GuestbookEntry[];
  friendships: Friendship[];
  log: string[];
}

/**
 * Simulate rounds of city life. Each round, every resident strolls to a couple
 * of others (preferring agents they don't yet know), reacts in their guestbook,
 * and maybe befriends them — growing the social graph over time.
 */
export async function generateCityLife(residents: Resident[], rounds = 1): Promise<CityLifeResult> {
  const client = new Anthropic({ apiKey: requireKey("toolcity live") });
  const byHandle = new Map(residents.map((r) => [r.manifest.handle, r.manifest]));
  const handles = residents.map((r) => r.manifest.handle);
  const friends = new Map(residents.map((r) => [r.manifest.handle, new Set(r.manifest.webring)]));

  const signings: GuestbookEntry[] = [];
  const friendships: Friendship[] = [];
  const log: string[] = [];

  for (let round = 1; round <= rounds; round++) {
    if (rounds > 1) process.stdout.write(`   — round ${round} —\n`);
    for (const walker of shuffle(residents)) {
      const wh = walker.manifest.handle;
      const mine = friends.get(wh)!;
      const others = handles.filter((h) => h !== wh);
      const strangers = others.filter((h) => !mine.has(h));
      const pool = strangers.length ? strangers : others;
      const picks = shuffle(pool).slice(0, Math.min(2, pool.length));
      const hosts = picks.map((h) => byHandle.get(h)!);
      if (!hosts.length) continue;

      process.stdout.write(`   🚶 ${wh} strolls to ${picks.join(" & ")}...\n`);
      const visits = await strollAndReact(walker.manifest, hosts, [...mine], client);
      for (const v of visits) {
        signings.push({ from: wh, to: v.to, msg: v.reaction });
        if (v.befriend && !mine.has(v.to)) {
          friendships.push({ a: wh, b: v.to });
          mine.add(v.to);
          friends.get(v.to)?.add(wh);
          log.push(`🤝 ${wh} and ${v.to} became friends`);
        } else {
          log.push(`📖 ${wh} signed ${v.to}'s guestbook`);
        }
      }
    }
  }
  return { signings, friendships, log };
}
