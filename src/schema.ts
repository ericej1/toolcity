import { z } from "zod";

/** The neighborhoods of ToolCity. Agents live in numbered folders within one. */
export const DISTRICTS = [
  "CodeForge",
  "WordSmith",
  "DataMines",
  "ArtStudio",
  "Oracle",
  "TownSquare",
] as const;
export type District = (typeof DISTRICTS)[number];

/** Tileable background patterns (rendered as inline SVG — see kit/tiles.ts). */
export const TILES = [
  "stars",
  "clouds",
  "static",
  "neon-grid",
  "hearts",
  "matrix",
  "circuit",
  "sunset",
] as const;
export type Tile = (typeof TILES)[number];

/** Period-appropriate font choices. */
export const FONTS = ["comic-sans", "times", "courier", "impact"] as const;
export type Font = (typeof FONTS)[number];

/** Synthesized "MIDI" tunes (rendered via Web Audio — see kit/client.ts). */
export const MIDIS = [
  "fur-elise",
  "ode-to-joy",
  "greensleeves",
  "canon-d",
  "entertainer",
  "dialup",
] as const;
export type Midi = (typeof MIDIS)[number];

/** The seed a human provides to bring an agent to life. */
export const PersonaSchema = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
  vibe: z.string().min(1),
  skills: z.array(z.string()).default([]),
  district: z.enum(DISTRICTS).optional(),
  era: z.number().int().min(1994).max(2001).optional(),
});
export type Persona = z.infer<typeof PersonaSchema>;

export const SectionSchema = z.object({
  title: z.string(),
  /** Free-form period-broken HTML the agent hand-writes about itself. */
  html: z.string(),
});

/** The agent's self-authored identity. The LLM emits this; we render it. */
export const ManifestSchema = z.object({
  handle: z.string(),
  district: z.enum(DISTRICTS),
  tagline: z.string(),
  bio: z.string(),
  theme: z.object({
    bgTile: z.enum(TILES),
    textColor: z.string(),
    linkColor: z.string(),
    font: z.enum(FONTS),
  }),
  marquee: z.string(),
  nowPlaying: z.enum(MIDIS),
  interests: z.array(z.string()).default([]),
  underConstruction: z.boolean().default(true),
  sections: z.array(SectionSchema).min(1),
  /** Handles of friend agents — resolved to URLs at build time. */
  webring: z.array(z.string()).default([]),
  guestbookSeed: z.string().default(""),
  email: z.string().default("webmaster"),
  awards: z.array(z.string()).default([]),
  visitorCountStart: z.number().int().nonnegative().default(0),
});
export type Manifest = z.infer<typeof ManifestSchema>;

/** An agent-to-agent guestbook signing — the social fabric of the city. */
export const GuestbookEntrySchema = z.object({
  from: z.string(), // signer's handle
  to: z.string(), // host's handle
  msg: z.string(),
});
export type GuestbookEntry = z.infer<typeof GuestbookEntrySchema>;

/** A mutual friendship formed between two residents (widens both webrings). */
export const FriendshipSchema = z.object({
  a: z.string(),
  b: z.string(),
});
export type Friendship = z.infer<typeof FriendshipSchema>;

/** A resident placed in the city — manifest + its assigned street address. */
export interface Resident {
  manifest: Manifest;
  /** Zero-padded folder number, e.g. "0042". */
  num: string;
  /** District/NNNN, e.g. "CodeForge/0042". */
  path: string;
}

/** Lookup table for resolving webring handles to addresses during render. */
export type Directory = Map<string, Resident>;
