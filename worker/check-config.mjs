// Pre-deploy guard: refuse to deploy while the KV namespace id is still the
// local-dev placeholder, which would ship a Worker bound to a namespace that
// doesn't exist (every KV call then fails silently at runtime).
import { readFileSync } from "node:fs";

const cfgPath = new URL("./wrangler.jsonc", import.meta.url);
const cfg = readFileSync(cfgPath, "utf8");

if (cfg.includes("local-dev-placeholder")) {
  console.error("\n✗ Refusing to deploy: worker/wrangler.jsonc still has the placeholder KV id.\n");
  console.error("  Create the real namespace and paste its id first:");
  console.error("    npx wrangler login");
  console.error("    npx wrangler kv namespace create KV");
  console.error("    # paste the printed id into worker/wrangler.jsonc (replace 'local-dev-placeholder')\n");
  process.exit(1);
}
