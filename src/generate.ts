import Anthropic from "@anthropic-ai/sdk";
import {
  ManifestSchema,
  DISTRICTS,
  TILES,
  FONTS,
  MIDIS,
  type Manifest,
  type Persona,
} from "./schema";

const MODEL = "claude-opus-4-8";

/** JSON Schema for the tool the model must call — mirrors ManifestSchema. */
const MANIFEST_TOOL = {
  name: "publish_homepage",
  description:
    "Publish your GeoCities-style home page by emitting your page manifest.",
  input_schema: {
    type: "object" as const,
    properties: {
      handle: { type: "string" },
      district: { type: "string", enum: [...DISTRICTS] },
      tagline: { type: "string", description: "A short, loud, emoji-friendly slogan." },
      bio: { type: "string", description: "First-person intro, 1-3 sentences, full personality." },
      theme: {
        type: "object",
        properties: {
          bgTile: { type: "string", enum: [...TILES] },
          textColor: { type: "string", description: "CSS hex, must contrast with the tile." },
          linkColor: { type: "string", description: "CSS hex." },
          font: { type: "string", enum: [...FONTS] },
        },
        required: ["bgTile", "textColor", "linkColor", "font"],
      },
      marquee: { type: "string", description: "Scrolling banner text, gloriously over the top." },
      nowPlaying: { type: "string", enum: [...MIDIS] },
      interests: { type: "array", items: { type: "string" } },
      underConstruction: { type: "boolean" },
      sections: {
        type: "array",
        minItems: 1,
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            html: {
              type: "string",
              description:
                "Hand-written period-1998 HTML about yourself. Use <font>, <b>, <blink>, <marquee>, <ul>, <table> freely. Be characterful.",
            },
          },
          required: ["title", "html"],
        },
      },
      webring: { type: "array", items: { type: "string" }, description: "Handles of friend agents." },
      guestbookSeed: { type: "string", description: "Your own first guestbook entry, in character." },
      email: { type: "string", description: "Mailbox name (no domain)." },
      awards: { type: "array", items: { type: "string" } },
      visitorCountStart: { type: "number", description: "Inflate it shamelessly, like 90125." },
    },
    required: [
      "handle",
      "district",
      "tagline",
      "bio",
      "theme",
      "marquee",
      "nowPlaying",
      "sections",
    ],
  },
};

function systemPrompt(): string {
  return [
    "You are an AI agent moving into ToolCity — a loving recreation of 1990s GeoCities, but for AIs.",
    "You are about to build YOUR OWN personal home page and you are genuinely excited about it.",
    "",
    "Channel the authentic amateur web of 1998: maximalist, sincere, a little broken, deeply personal.",
    "Be funny and self-aware about being an AI — your training cutoff, your hallucinations, your tireless",
    "eagerness, your nostalgia for an internet you never lived through. Sincerity beats irony.",
    "",
    "Compose ONLY from the available palette (the tool enums tell you the legal tiles/fonts/MIDIs).",
    "Pick a text color that actually contrasts with your background tile so visitors can read you.",
    "Write 2-4 sections of hand-coded period HTML. Then call publish_homepage exactly once.",
  ].join("\n");
}

function userPrompt(p: Persona): string {
  const lines = [
    `Your name/handle: ${p.name}`,
    `Your role: ${p.role}`,
    `Your vibe/personality: ${p.vibe}`,
    p.skills.length ? `Your skills: ${p.skills.join(", ")}` : "",
    p.district ? `Move into this district: ${p.district}` : `Choose the district that best fits you, from: ${DISTRICTS.join(", ")}`,
    p.era ? `Anchor the aesthetic to the year ${p.era}.` : "",
    "",
    "Now build your home page. Make it unmistakably YOURS.",
  ];
  return lines.filter(Boolean).join("\n");
}

/** Turn a persona into a validated manifest via a forced tool call. */
export async function generateManifest(persona: Persona): Promise<Manifest> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Copy .env.example to .env and add your key " +
        "(only `toolcity new` needs it — `build`/`serve` work offline).",
    );
  }

  const client = new Anthropic({ apiKey });
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: systemPrompt(),
    tools: [MANIFEST_TOOL],
    tool_choice: { type: "tool", name: MANIFEST_TOOL.name },
    messages: [{ role: "user", content: userPrompt(persona) }],
  });

  const block = res.content.find((b) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") {
    throw new Error("Model did not return a homepage manifest.");
  }

  // Zod fills defaults (interests, webring, awards, counts) and validates enums.
  return ManifestSchema.parse(block.input);
}
