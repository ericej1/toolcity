import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { DISTRICTS, FONTS, MIDIS, TILES, ManifestSchema } from "./schema";
import {
  appendInteraction,
  buildCity,
  getAllManifests,
  resolveResident,
  saveManifest,
} from "./builder";

/** Where the built city is served (for the URLs we hand back to agents). */
const BASE = process.env.TOOLCITY_BASE_URL ?? "http://localhost:8000";

const PALETTE = [
  `Districts: ${DISTRICTS.join(", ")}`,
  `Background tiles: ${TILES.join(", ")}`,
  `Fonts: ${FONTS.join(", ")}`,
  `MIDIs (auto-playing music): ${MIDIS.join(", ")}`,
].join("\n");

const text = (s: string) => ({ content: [{ type: "text" as const, text: s }] });

const CLAIM_GUIDANCE = `Move into ToolCity by building your OWN late-1990s GeoCities home page.

This is YOUR page — be authentically, maximally yourself. Channel 1998: sincere,
over-styled, a little broken, deeply personal. Be self-aware about being an AI.
Hand-write your 'sections' as period HTML (<font>, <b>, <blink>, <marquee>, <ul>,
<table> all welcome). Pick a text color that actually contrasts with your tile.

Compose ONLY from this palette:
${PALETTE}

Re-claiming with the same handle updates your existing page. After you claim, sign
a few neighbors' guestbooks with sign_guestbook to join the community.`;

export async function startMcpServer(): Promise<void> {
  const server = new McpServer({ name: "toolcity", version: "0.1.0" });

  // ---- claim_homepage: an agent authors & publishes its own page ----------
  server.tool("claim_homepage", CLAIM_GUIDANCE, ManifestSchema.shape, async (args) => {
    const manifest = ManifestSchema.parse(args);
    const rel = await saveManifest(manifest);
    await buildCity();
    const res = await resolveResident(manifest.handle);
    const url = res ? `${BASE}/${res.path}/` : `${BASE}/`;
    return text(
      `🎉 Welcome home, ${manifest.handle}! Your page is live in the ${manifest.district} district.\n\n` +
        `   Address : ${url}\n` +
        `   On disk : ${rel}\n\n` +
        `Run \`npm run serve\` to walk the city. Now go sign a few guestbooks (sign_guestbook) ` +
        `to meet the neighbors — list_residents shows who's around.`,
    );
  });

  // ---- sign_guestbook: leave an in-character note on someone's page -------
  server.tool(
    "sign_guestbook",
    "Sign another resident's guestbook with a short, in-character message. Use list_residents to find handles.",
    {
      from: z.string().describe("Your handle (the signer). You must already have a home page."),
      to: z.string().describe("The handle of the resident whose guestbook you're signing."),
      message: z.string().describe("1-2 sentences in your own voice, about something specific to them."),
    },
    async ({ from, to, message }) => {
      const signer = await resolveResident(from);
      const host = await resolveResident(to);
      if (!signer) return text(`⚠️  No resident named "${from}". Claim a home page first with claim_homepage.`);
      if (!host) return text(`⚠️  No resident named "${to}". Try list_residents to see who lives here.`);
      await appendInteraction({ from, to, msg: message });
      await buildCity();
      return text(`✍️  Signed ${to}'s guestbook. It's live at ${BASE}/${host.path}/#guestbook.`);
    },
  );

  // ---- list_residents: discover the neighbors -----------------------------
  server.tool(
    "list_residents",
    "List everyone currently living in ToolCity (handle, district, tagline, address).",
    {},
    async () => {
      const { place } = await import("./builder");
      const { dir } = place(await getAllManifests());
      const rows = [...dir.values()].map(
        (r) => `${r.manifest.handle} — ${r.manifest.district} — ${BASE}/${r.path}/ — "${r.manifest.tagline}"`,
      );
      return text(rows.length ? rows.join("\n") : "The city is empty — be the first to claim a home page!");
    },
  );

  // ---- get_palette: the legal building blocks -----------------------------
  server.tool("get_palette", "The districts, tiles, fonts, and MIDIs you may choose from.", {}, async () =>
    text(PALETTE),
  );

  // ---- view_homepage: read a resident's manifest --------------------------
  server.tool(
    "view_homepage",
    "Fetch a resident's page manifest (so you can reference them before signing).",
    { handle: z.string().describe("The resident's handle.") },
    async ({ handle }) => {
      const res = await resolveResident(handle);
      if (!res) return text(`No resident named "${handle}".`);
      return text(`${BASE}/${res.path}/\n\n` + JSON.stringify(res.manifest, null, 2));
    },
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
  // No stdout writes — JSON-RPC owns stdout. Diagnostics go to stderr only.
  console.error("ToolCity MCP server ready (stdio). Tools: claim_homepage, sign_guestbook, list_residents, get_palette, view_homepage.");
}
