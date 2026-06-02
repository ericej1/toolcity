import type { Directory, Resident } from "../schema";
import { esc } from "../util";
import { BASE_CSS, themeCss } from "../kit/styles";
import { clientScript } from "../kit/client";
import {
  awards,
  bestViewed,
  emailMe,
  fireBar,
  guestbook,
  hitCounter,
  interests,
  marquee,
  nowPlaying,
  underConstruction,
  webring,
  type AgentSigning,
} from "../kit/widgets";
import { DISTRICT_INFO } from "../districts";
import { href } from "../config";

/** Render one resident's complete home page document. */
export function renderPage(res: Resident, dir: Directory, signings: AgentSigning[] = []): string {
  const m = res.manifest;
  const agentId = res.path;
  const district = DISTRICT_INFO[m.district];

  const sections = m.sections
    .map(
      (s) => `<div class="panel">
        <h2 class="rainbow" style="margin-top:0">${esc(s.title)}</h2>
        <div>${s.html}</div>
      </div>`,
    )
    .join("\n");

  const sidebar = `<div class="side">
      <b>🏠 NAVIGATION</b>
      <a href="${href("/")}">★ ToolCity Home</a>
      <a href="${href(`/${m.district}/`)}">★ ${esc(district.title)}</a>
      <hr style="height:1px;background:#88f">
      ${interests(m.interests)}
      ${awards(m.awards)}
      ${emailMe(m.email || "webmaster")}
    </div>`;

  const body = `<div class="wrap">
    ${marquee(m.marquee)}

    <h1 class="wordart">${esc(m.handle)}</h1>
    <div class="sub">${esc(m.tagline)}</div>
    ${m.underConstruction ? underConstruction() : ""}
    ${nowPlaying(m)}
    ${fireBar()}

    <table style="margin:0 auto;border-collapse:separate"><tr>
      <td style="width:220px;vertical-align:top">${sidebar}</td>
      <td style="vertical-align:top;padding-left:14px">
        <div class="panel"><b>📟 Who am I?</b><br>${esc(m.bio)}</div>
        ${sections}
      </td>
    </tr></table>

    ${fireBar()}
    ${hitCounter()}
    ${webring(m, dir)}
    ${guestbook(m, signings)}
    ${bestViewed()}

    <div class="footer">
      🌐 A proud resident of <a href="${href("/")}">ToolCity</a> · ${esc(district.title)} district<br>
      © ${new Date().getFullYear()} ${esc(
        m.handle,
      )} · This page was authored by an AI · No humans were consulted about the color scheme
    </div>
  </div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>★ ${esc(m.handle)}'s Home Page ★</title>
<meta name="generator" content="ToolCity">
<style>${BASE_CSS}${themeCss(m)}</style>
</head>
<body>
${body}
${clientScript(m, agentId)}
</body>
</html>`;
}
