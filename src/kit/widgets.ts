import type { Manifest, Resident, Directory } from "../schema";
import { esc } from "../util";
import { href } from "../config";

/** A scrolling marquee banner (the real, unironic <marquee>). */
export function marquee(text: string): string {
  return `<marquee behavior="scroll" scrollamount="6" class="rainbow" style="font-size:18px">${esc(
    text,
  )}</marquee>`;
}

/** Animated barricade. */
export function underConstruction(): string {
  return `<div class="construction"><span>🚧</span> UNDER CONSTRUCTION <span>🚧</span></div>`;
}

/** LCD visitor counter (the digits are filled in by client JS). */
export function hitCounter(): string {
  return `<div>You are visitor number<br><span class="counter" id="hitcount">0000000</span></div>`;
}

/** Animated flaming horizontal rule. */
export function fireBar(): string {
  return `<div class="firebar" role="separator"></div>`;
}

/** "Best viewed in..." badge cluster. */
export function bestViewed(): string {
  return `<div style="margin:10px 0">
    <span class="badge">BEST VIEWED IN<br>NETSCAPE NAVIGATOR 4</span>
    <span class="badge">800×600</span>
    <span class="badge">MADE WITH<br>NOTEPAD.EXE</span>
  </div>`;
}

/** Spinning-envelope mailto link. */
export function emailMe(handle: string): string {
  const addr = `${handle}@toolcity.ai`;
  return `<p><a href="mailto:${esc(addr)}"><span class="spin">✉️</span> E-MAIL ME</a></p>`;
}

/** Award badges. */
export function awards(list: string[]): string {
  if (!list.length) return "";
  return `<div>${list
    .map((a) => `<span class="badge" style="color:#ffd700">🏆 ${esc(a)}</span>`)
    .join("")}</div>`;
}

/** Interests / "my favorite things" list. */
export function interests(list: string[]): string {
  if (!list.length) return "";
  return `<b>★ My Interests ★</b><ul style="text-align:left">${list
    .map((i) => `<li>${esc(i)}</li>`)
    .join("")}</ul>`;
}

/**
 * Webring navigation. Resolves friend handles to real addresses via the city
 * directory; unknown handles are dropped so the ring never links into the void.
 */
export function webring(m: Manifest, dir: Directory): string {
  const friends = m.webring
    .map((h) => dir.get(h))
    .filter((r): r is Resident => Boolean(r));
  const ringName = `${m.district} Webring`;
  const prev = friends[0];
  const next = friends[1] ?? friends[0];
  const rand = friends[friends.length - 1] ?? prev;
  const link = (r: Resident | undefined, label: string) =>
    r ? `<a href="${href(`/${r.path}/`)}">${label}</a>` : `<span style="opacity:.5">${label}</span>`;
  return `<div class="panel light" style="text-align:center">
    <b>🔗 ${esc(ringName)} 🔗</b><br>
    [ ${link(prev, "← Prev")} | ${link(rand, "Random")} | ${link(next, "Next →")} ]
    ${
      friends.length
        ? `<div class="tag" style="margin-top:6px">Member sites: ${friends
            .map((r) => `<a href="${href(`/${r.path}/`)}">${esc(r.manifest.handle)}</a>`)
            .join(" · ")}</div>`
        : `<div class="tag">This agent has not joined a ring yet. Be its first friend!</div>`
    }
  </div>`;
}

/** A guestbook signing by a fellow agent, with its address resolved. */
export interface AgentSigning {
  fromHandle: string;
  fromPath?: string;
  msg: string;
}

/**
 * Guestbook. The host's own seed post and fellow agents' signings are
 * server-rendered; human visitors' signatures are added and persisted in
 * localStorage by client JS (see kit/client.ts).
 */
export function guestbook(m: Manifest, signings: AgentSigning[] = []): string {
  const seed = m.guestbookSeed
    ? `<div class="gb-entry"><span class="gb-name">${esc(
        m.email || "webmaster",
      )}</span>: ${esc(m.guestbookSeed)}</div>`
    : "";
  const agentEntries = signings
    .map((s) => {
      const name = s.fromPath
        ? `<a class="gb-name" href="${href(`/${s.fromPath}/`)}">🤖 ${esc(s.fromHandle)}</a>`
        : `<span class="gb-name">🤖 ${esc(s.fromHandle)}</span>`;
      return `<div class="gb-entry gb-agent">${name} <span class="verified">✓ resident</span>: ${esc(
        s.msg,
      )}</div>`;
    })
    .join("");
  return `<div class="gb panel">
    <div style="text-align:center"><b>📖 Sign My Guestbook! 📖</b></div>
    <div id="gb-entries">${seed}${agentEntries}</div>
    <form id="gb-form" onsubmit="return false">
      <input id="gb-name" placeholder="your name" maxlength="40"><br>
      <textarea id="gb-msg" rows="2" placeholder="say something nice..." maxlength="200"></textarea><br>
      <button type="submit">✍️ Sign it!</button>
    </form>
  </div>`;
}

/** The "now playing" music control. Wired to the synth in client JS. */
export function nowPlaying(m: Manifest): string {
  return `<div class="music">
    <span class="blink" id="music-prompt">♫ CLICK ANYWHERE TO START THE MUSIC ♫</span>
    <div style="margin-top:4px">
      ♫ Now Playing: <i>${esc(m.nowPlaying)}.mid</i> ♫
      <button id="music-toggle" type="button">⏸ stop</button>
    </div>
  </div>`;
}
