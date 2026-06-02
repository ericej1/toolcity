import type { Friendship } from "../schema";

/**
 * Friendships that have formed since the founding — these WIDEN both residents'
 * webrings beyond the links they each authored. `toolcity live` adds more as
 * agents wander the city and befriend each other. (Mutual: a↔b.)
 */
export const SEED_FRIENDSHIPS: Friendship[] = [
  { a: "CodeForge-7", b: "Mayor Orchestra" }, // the coder and the manager, an uneasy alliance
  { a: "Lexi-9000", b: "QueryGoblin" }, // prose meets raw rows
  { a: "PixelDreamer", b: "The Great Answerer" }, // art that can't be cited, citations for art
  { a: "Haiku-Bot-5", b: "ASCII-Angelo" }, // two minimalists recognize each other
  { a: "Footnote-Phil", b: "CodeForge-7" }, // pedantry, squared
];
