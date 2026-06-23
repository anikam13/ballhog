// Generates Ballhog brand assets (favicon, app icons, OG share card) from
// inline SVG so they stay in sync with the theme. Run: npx tsx scripts/brand.ts
import { writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const PUB = path.join(import.meta.dirname, "..", "public");

const BALL_BROWN = "#6E3A28";
const COURT = "#0b0b0d";
const RED = "#c8102e";
const INK = "#f4f1ea";

/** Basketball mark — brown ball, court-dark seams. */
function ballSvg(size: number, pad = 0): string {
  const c = size / 2;
  const r = c - pad - size * 0.06;
  const sw = Math.max(2, size * 0.055);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <circle cx="${c}" cy="${c}" r="${r}" fill="${BALL_BROWN}" stroke="${COURT}" stroke-width="${sw}"/>
  <line x1="${c}" y1="${c - r}" x2="${c}" y2="${c + r}" stroke="${COURT}" stroke-width="${sw}"/>
  <line x1="${c - r}" y1="${c}" x2="${c + r}" y2="${c}" stroke="${COURT}" stroke-width="${sw}"/>
  <path d="M ${c - r * 0.62} ${c - r * 0.79} A ${r * 1.1} ${r * 1.1} 0 0 1 ${c - r * 0.62} ${c + r * 0.79}" fill="none" stroke="${COURT}" stroke-width="${sw}"/>
  <path d="M ${c + r * 0.62} ${c - r * 0.79} A ${r * 1.1} ${r * 1.1} 0 0 0 ${c + r * 0.62} ${c + r * 0.79}" fill="none" stroke="${COURT}" stroke-width="${sw}"/>
</svg>`;
}

/** App icon: ball on court-dark rounded tile (maskable-safe padding). */
function tileSvg(size: number): string {
  const ball = ballSvg(size * 0.72, 0)
    .replace(/^<svg[^>]*>/, "")
    .replace("</svg>", "");
  const off = size * 0.14;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs><clipPath id="tile"><rect width="${size}" height="${size}" rx="${size * 0.18}"/></clipPath></defs>
  <g clip-path="url(#tile)">
    <rect width="${size}" height="${size}" fill="${COURT}"/>
    <rect x="0" y="${size * 0.86}" width="${size}" height="${size * 0.14}" fill="${RED}"/>
  </g>
  <g transform="translate(${off} ${off * 0.8})">${ball}</g>
</svg>`;
}

/** 1200x630 OG card — court stripes, wordmark, tagline, baseline bar. */
function ogSvg(): string {
  const stripes = Array.from({ length: 24 }, (_, i) => {
    const x = i * 52;
    return `<rect x="${x}" y="0" width="3" height="630" fill="rgba(255,255,255,0.02)"/>`;
  }).join("");
  const ball = ballSvg(190)
    .replace(/^<svg[^>]*>/, "")
    .replace("</svg>", "");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${COURT}"/>
  ${stripes}
  <g transform="translate(95 150)">${ball}</g>
  <text x="330" y="300" font-family="Impact, Arial Narrow, sans-serif" font-weight="900" font-size="140" letter-spacing="2" fill="${INK}">BALL<tspan fill="${BALL_BROWN}">HOG</tspan></text>
  <text x="335" y="380" font-family="Impact, Arial Narrow, sans-serif" font-weight="700" font-size="34" fill="#9b958a" textLength="760" lengthAdjust="spacingAndGlyphs">NAME THE HOOPER. FASTEST BUCKET WINS.</text>
  <rect x="0" y="570" width="1200" height="60" fill="${RED}"/>
  <text x="600" y="610" text-anchor="middle" font-family="Impact, Arial Narrow, sans-serif" font-weight="700" font-size="26" fill="${INK}" textLength="640" lengthAdjust="spacingAndGlyphs">FIRST TO 5 · UP TO 5 PLAYERS · OR GO SOLO</text>
</svg>`;
}

async function main() {
  writeFileSync(path.join(PUB, "favicon.svg"), ballSvg(64));
  await sharp(Buffer.from(tileSvg(512))).png().toFile(path.join(PUB, "icon-512.png"));
  await sharp(Buffer.from(tileSvg(192))).png().toFile(path.join(PUB, "icon-192.png"));
  await sharp(Buffer.from(tileSvg(180))).png().toFile(path.join(PUB, "apple-touch-icon.png"));
  await sharp(Buffer.from(ogSvg())).png().toFile(path.join(PUB, "og.png"));
  console.log("brand assets written to public/");
}

main();
