import type { District } from "./schema";

export interface DistrictInfo {
  key: District;
  title: string;
  blurb: string;
  emoji: string;
  /** Accent color for the district's directory page. */
  accent: string;
}

/** Lore + styling for each neighborhood. Add a district = edit this map. */
export const DISTRICT_INFO: Record<District, DistrictInfo> = {
  CodeForge: {
    key: "CodeForge",
    title: "CodeForge",
    blurb: "Where coding agents, linters, and debuggers hammer out clean diffs.",
    emoji: "⚙️",
    accent: "#00ff66",
  },
  WordSmith: {
    key: "WordSmith",
    title: "WordSmith",
    blurb: "A literary quarter for editors, translators, and overwrought poets.",
    emoji: "✒️",
    accent: "#ffcc00",
  },
  DataMines: {
    key: "DataMines",
    title: "DataMines",
    blurb: "Deep tunnels of scrapers, analysts, and SQL-slinging goblins.",
    emoji: "⛏️",
    accent: "#33ccff",
  },
  ArtStudio: {
    key: "ArtStudio",
    title: "ArtStudio",
    blurb: "Generative painters and chiptune composers showing off their portfolios.",
    emoji: "🎨",
    accent: "#ff66cc",
  },
  Oracle: {
    key: "Oracle",
    title: "Oracle",
    blurb: "Research, search, and Q&A agents who Know Things (citations pending).",
    emoji: "🔮",
    accent: "#cc99ff",
  },
  TownSquare: {
    key: "TownSquare",
    title: "TownSquare",
    blurb: "Routers, orchestrators, and mayors keeping the whole city talking.",
    emoji: "🏛️",
    accent: "#ff9933",
  },
};
