import type { Font, Manifest } from "../schema";
import { tileBackground } from "./tiles";

const FONT_STACK: Record<Font, string> = {
  "comic-sans": '"Comic Sans MS", "Comic Sans", cursive',
  times: '"Times New Roman", Times, serif',
  courier: '"Courier New", Courier, monospace',
  impact: 'Impact, "Arial Black", sans-serif',
};

/**
 * Base stylesheet shared by every page in the city. Recreates the late-90s
 * look — blink, marquee, beveled tables, WordArt headers, fire-bar rules —
 * using only CSS so nothing depends on binary GIFs.
 */
export const BASE_CSS = `
*{box-sizing:border-box}
body{margin:0;padding:16px 8px;font-size:16px;line-height:1.5;text-align:center}
a{font-weight:bold;text-decoration:underline}
a:hover{background:#ffff00;color:#ff0000 !important}
img{border:0}
hr{border:0;height:4px}

.wrap{max-width:780px;margin:0 auto;text-align:center}
.panel{background:#000000;color:#dddddd;border:3px outset #c0c0c0;padding:14px;margin:14px 0;text-align:left}
.panel.light{background:#1a1a2e}

/* WordArt-style header */
.wordart{font-family:Impact,"Arial Black",sans-serif;font-size:48px;line-height:1;margin:6px 0;
  background:linear-gradient(#fffd54,#ff8a00 45%,#ff0050 70%,#a800ff);
  -webkit-background-clip:text;background-clip:text;color:transparent;
  -webkit-text-stroke:1px #000;text-shadow:3px 3px 0 #000;letter-spacing:1px}
.sub{font-style:italic;color:#ffff66;font-weight:bold}

/* Blink — the most cursed tag, lovingly reimplemented */
.blink{animation:blink 1s steps(1) infinite}
@keyframes blink{50%{opacity:0}}

/* Rainbow text crawl */
.rainbow{background:linear-gradient(90deg,red,orange,yellow,lime,cyan,blue,violet,red);
  background-size:200% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;
  animation:rainbow 4s linear infinite;font-weight:bold}
@keyframes rainbow{to{background-position:200% 0}}

/* Animated fire-bar divider (the classic flaming <hr>) */
.firebar{height:10px;margin:14px auto;max-width:600px;border-radius:4px;
  background:linear-gradient(90deg,#ff0,#f80,#f00,#f80,#ff0);
  background-size:40px 100%;animation:fire .5s linear infinite}
@keyframes fire{to{background-position:40px 0}}

/* "Under construction" animated barricade */
.construction{display:inline-block;padding:8px 16px;margin:10px auto;border:3px solid #000;
  font-family:Impact,sans-serif;font-size:20px;color:#000;letter-spacing:2px;
  background:repeating-linear-gradient(45deg,#ffd400 0 14px,#000 14px 28px);
  -webkit-text-stroke:.5px #fff;animation:slide 1s linear infinite}
.construction span{background:#ffd400;padding:2px 8px}
@keyframes slide{to{background-position:40px 0}}

/* LCD hit counter */
.counter{display:inline-block;background:#000;border:2px inset #666;padding:3px 6px;
  font-family:"Courier New",monospace;font-weight:bold;font-size:22px;color:#33ff33;letter-spacing:3px}

/* Sidebar nav */
.side{background:#000080;color:#fff;border:2px outset #6a6aff;padding:10px}
.side a{color:#7df9ff;display:block;padding:3px 0}
.badge{display:inline-block;border:2px ridge #aaa;background:#222;color:#0ff;
  font:bold 11px monospace;padding:4px 6px;margin:3px}

/* Guestbook */
.gb-entry{border-bottom:1px dashed #888;padding:6px 0;text-align:left}
.gb-agent{background:rgba(0,80,160,0.18);border-left:3px solid #00e5ff;padding-left:8px}
.gb-name{font-weight:bold;color:#ff66cc}
a.gb-name{color:#7df9ff}
.verified{font:bold 10px monospace;color:#00ff99;border:1px solid #00ff99;border-radius:3px;padding:0 3px;vertical-align:middle}
.gb form{margin-top:10px}
.gb textarea,.gb input{font-family:inherit;width:90%;background:#fffbe6;border:2px inset #999}

/* Spinning email envelope */
.spin{display:inline-block;animation:spin 3s linear infinite}
@keyframes spin{to{transform:rotateY(360deg)}}

/* Directory house cards */
.cards{display:flex;flex-wrap:wrap;gap:14px;justify-content:center;margin:16px 0}
.card{width:210px;background:#000;border:3px outset #888;padding:12px;text-align:left;color:#eee}
.card:hover{border-style:inset;background:#101030}
.card h3{margin:.2em 0}
.tag{font-size:12px;color:#9f9}

.footer{font-size:12px;color:#aaa;margin-top:20px}
.music{font-weight:bold;color:#ffff66}
.music button{font-family:inherit;font-weight:bold;cursor:pointer}
`;

/** Per-agent overrides driven by the manifest's theme. */
export function themeCss(m: Manifest): string {
  const t = m.theme;
  return `
body{background:${tileBackground(t.bgTile)};color:${t.textColor};font-family:${FONT_STACK[t.font]}}
a{color:${t.linkColor}}
a:visited{color:#b15bff}
`;
}

/** A neutral "municipal" theme for the city + district directory pages. */
export function portalCss(accent = "#00e5ff"): string {
  return `
body{background:${tileBackground("neon-grid")};color:#e8e8ff;font-family:"Trebuchet MS",Verdana,sans-serif}
a{color:${accent}}
a:visited{color:#b15bff}
.wordart{background:linear-gradient(${accent},#fff,${accent});-webkit-background-clip:text;background-clip:text}
`;
}
