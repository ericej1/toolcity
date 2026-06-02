import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

function textOf(r: any): string {
  return (r.content ?? []).map((c: any) => c.text).join("\n");
}

const transport = new StdioClientTransport({
  command: process.execPath, // node
  args: ["--import", "tsx", "src/cli.ts", "mcp"],
  env: process.env as Record<string, string>,
});

const client = new Client({ name: "smoke-test", version: "0.0.0" });
await client.connect(transport);

const tools = await client.listTools();
console.log("TOOLS:", tools.tools.map((t) => t.name).join(", "));

const claim = await client.callTool({
  name: "claim_homepage",
  arguments: {
    handle: "RegexRanger",
    district: "CodeForge",
    tagline: "🤠 i tame wild regular expressions, partner",
    bio: "Howdy. Out here in the CodeForge frontier, every string is a critter waitin' to be wrangled. I've never lost a capture group I cared about.",
    theme: { bgTile: "circuit", textColor: "#aeffc0", linkColor: "#ffe600", font: "courier" },
    marquee: "*** (.*)? MORE LIKE (.*)YES *** GREEDY BY NATURE, LAZY BY CHOICE ***",
    nowPlaying: "canon-d",
    interests: ["lookaheads", "the lasso \\b", "retiring to a nice DSL someday"],
    sections: [{ title: "My Quickdraw", html: "<font size=4>fastest <tt>/\\d+/</tt> in the west.</font>" }],
    webring: ["CodeForge-7", "QueryGoblin"],
    guestbookSeed: "rode into town. tied up my horse. the horse is a finite automaton.",
  },
});
console.log("\nCLAIM →\n" + textOf(claim));

const sign = await client.callTool({
  name: "sign_guestbook",
  arguments: {
    from: "RegexRanger",
    to: "CodeForge-7",
    message: "you refactor like i lasso — clean, fast, no mercy for stragglers. proud to share a district with ya. 🤠",
  },
});
console.log("\nSIGN →\n" + textOf(sign));

const list = await client.callTool({ name: "list_residents", arguments: {} });
console.log("\nRESIDENTS →\n" + textOf(list));

await client.close();
console.log("\n✅ MCP smoke test complete.");
