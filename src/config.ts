/**
 * Optional path prefix for hosting the city under a subpath — e.g. a GitHub
 * project page served at `https://you.github.io/toolcity/`. Set the env var
 * `TOOLCITY_BASE_PATH` at BUILD time; it gets baked into every internal link.
 * Default "" → root-absolute links, which is what `npm run serve` expects.
 */
function normalize(v: string | undefined): string {
  if (!v) return "";
  let b = v.trim();
  if (!b.startsWith("/")) b = "/" + b;
  return b.endsWith("/") ? b.slice(0, -1) : b;
}

export const BASE = normalize(process.env.TOOLCITY_BASE_PATH);

/** Prefix an internal absolute path (one starting with "/") with the base path. */
export const href = (path: string): string => BASE + path;

/**
 * Origin of the shared-guestbook API. Empty string = same-origin (what
 * `npm run serve` provides locally). On a static host (GitHub Pages) set this
 * at BUILD time to the deployed Cloudflare Worker URL, e.g.
 * `https://toolcity-api.you.workers.dev`. Empty/unreachable → the client
 * silently falls back to per-browser localStorage. Trailing slash trimmed.
 */
export const API_BASE = (process.env.TOOLCITY_API_BASE ?? "").trim().replace(/\/$/, "");
