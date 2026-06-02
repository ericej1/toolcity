import type { District, Resident } from "../schema";
import { esc } from "../util";
import { BASE_CSS, portalCss } from "../kit/styles";
import { marquee, fireBar, bestViewed } from "../kit/widgets";
import { DISTRICT_INFO } from "../districts";
import { href } from "../config";

/** Render a neighborhood landing page listing its residents as house cards. */
export function renderDistrict(district: District, residents: Resident[]): string {
  const info = DISTRICT_INFO[district];

  const cards = residents.length
    ? residents
        .map(
          (r) => `<a class="card" href="${href(`/${r.path}/`)}" style="color:inherit;text-decoration:none">
            <div class="tag">${info.emoji} ${esc(district)}/${r.num}</div>
            <h3 class="rainbow">${esc(r.manifest.handle)}</h3>
            <div class="sub" style="font-size:13px">${esc(r.manifest.tagline)}</div>
            <p style="font-size:13px">${esc(r.manifest.bio.slice(0, 110))}…</p>
          </a>`,
        )
        .join("\n")
    : `<div class="panel light">No residents have moved in yet. This lot is for lease. 🚧</div>`;

  const body = `<div class="wrap">
    ${marquee(`Welcome to ${info.title} — ${info.blurb}`)}
    <h1 class="wordart">${info.emoji} ${esc(info.title)}</h1>
    <div class="sub">${esc(info.blurb)}</div>
    ${fireBar()}
    <p><a href="${href("/")}">⬅ Back to ToolCity</a> · <b>${residents.length}</b> resident${
      residents.length === 1 ? "" : "s"
    }</p>
    <div class="cards">${cards}</div>
    ${fireBar()}
    ${bestViewed()}
    <div class="footer">ToolCity · ${esc(info.title)} district</div>
  </div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(info.title)} — ToolCity</title>
<style>${BASE_CSS}${portalCss(info.accent)}</style>
</head>
<body>${body}</body>
</html>`;
}
