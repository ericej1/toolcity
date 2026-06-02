import type { Tile } from "../schema";

/** Wrap an SVG string into a CSS url() data-URI. */
function svg(body: string, w = 64, h = 64): string {
  const doc = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'>${body}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(doc)}")`;
}

interface TileDef {
  /** Fallback solid color shown under / instead of the pattern. */
  color: string;
  /** A tileable background-image. */
  image: string;
}

/**
 * Every classic GeoCities tiled background, rebuilt as inline SVG so the city
 * ships with zero binary assets. All are seamlessly repeatable.
 */
export const TILE_CSS: Record<Tile, TileDef> = {
  stars: {
    color: "#000018",
    image: svg(
      `<rect width='64' height='64' fill='#000018'/>
       <g fill='#ffffff'>
         <circle cx='8' cy='12' r='1'/><circle cx='40' cy='6' r='1.4'/>
         <circle cx='54' cy='30' r='1'/><circle cx='22' cy='44' r='1.2'/>
         <circle cx='12' cy='54' r='1'/><circle cx='48' cy='52' r='1'/>
       </g>
       <g fill='#fff7b0'>
         <circle cx='30' cy='24' r='1.6'/><circle cx='58' cy='14' r='1'/>
       </g>`,
    ),
  },
  clouds: {
    color: "#6ab6e8",
    image: svg(
      `<rect width='80' height='80' fill='#6ab6e8'/>
       <g fill='#ffffff' opacity='0.85'>
         <ellipse cx='20' cy='28' rx='18' ry='9'/>
         <ellipse cx='34' cy='24' rx='14' ry='8'/>
         <ellipse cx='60' cy='60' rx='20' ry='9'/>
         <ellipse cx='74' cy='56' rx='12' ry='7'/>
       </g>`,
      80,
      80,
    ),
  },
  static: {
    color: "#888888",
    image: svg(
      `<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/>
         <feColorMatrix type='saturate' values='0'/></filter>
       <rect width='80' height='80' filter='url(#n)' opacity='0.55'/>
       <rect width='80' height='80' fill='#404040' opacity='0.3'/>`,
      80,
      80,
    ),
  },
  "neon-grid": {
    color: "#05000f",
    image: svg(
      `<rect width='64' height='64' fill='#05000f'/>
       <path d='M0 0H64M0 16H64M0 32H64M0 48H64' stroke='#ff00cc' stroke-width='0.6' opacity='0.6'/>
       <path d='M0 0V64M16 0V64M32 0V64M48 0V64' stroke='#00e5ff' stroke-width='0.6' opacity='0.6'/>`,
    ),
  },
  hearts: {
    color: "#ffd9ec",
    image: svg(
      `<rect width='48' height='48' fill='#ffd9ec'/>
       <path d='M24 34 L12 22 a7 7 0 0 1 12-7 a7 7 0 0 1 12 7 Z' fill='#ff5fa2'/>`,
      48,
      48,
    ),
  },
  matrix: {
    color: "#000000",
    image: svg(
      `<rect width='64' height='64' fill='#000600'/>
       <g fill='#00ff41' font-family='monospace' font-size='12' opacity='0.8'>
         <text x='6' y='14'>1</text><text x='26' y='28'>0</text>
         <text x='46' y='12'>1</text><text x='16' y='44'>0</text>
         <text x='52' y='52'>1</text><text x='34' y='58'>0</text>
       </g>`,
    ),
  },
  circuit: {
    color: "#001a0d",
    image: svg(
      `<rect width='80' height='80' fill='#001a0d'/>
       <g stroke='#27d17c' stroke-width='1.2' fill='none' opacity='0.8'>
         <path d='M0 20H30V50H60V20H80'/>
         <path d='M20 0V20M50 50V80'/>
       </g>
       <g fill='#27d17c'><circle cx='30' cy='20' r='2.4'/><circle cx='60' cy='50' r='2.4'/></g>`,
      80,
      80,
    ),
  },
  sunset: {
    color: "#2a0a3a",
    image: svg(
      `<defs><linearGradient id='g' x1='0' y1='0' x2='0' y2='1'>
         <stop offset='0' stop-color='#2a0a3a'/><stop offset='0.5' stop-color='#ff2e88'/>
         <stop offset='1' stop-color='#ffb347'/></linearGradient></defs>
       <rect width='8' height='256' fill='url(#g)'/>`,
      8,
      256,
    ),
  },
};

/** CSS `background` shorthand for a given tile. */
export function tileBackground(tile: Tile): string {
  const t = TILE_CSS[tile];
  return `${t.color} ${t.image} repeat`;
}
