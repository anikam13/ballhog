// Generates Ballhog brand assets (favicon, app icons, OG share card) from
// inline SVG so they stay in sync with BallMark.tsx. Run: npx tsx scripts/brand.ts
import { writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const PUB = path.join(import.meta.dirname, "..", "public");

/** Light-theme values from src/styles.css — matches BallMark at default size. */
const ORANGE = "#6E3A28";
const CREAM = "#F5F0E8";
const INK = "#1A1208";
const COURT = "#0b0b0d";
const RED = "#c8102e";
const INK_OG = "#f4f1ea";

/** Canonical 64×64 basketball mark — same geometry as src/components/BallMark.tsx */
function ballMarkInner(): string {
  return `<circle cx="32" cy="32" r="28.16" fill="${ORANGE}" stroke="${INK}" stroke-width="3.2"/>
  <line x1="32" y1="3.84" x2="32" y2="60.16" stroke="${INK}" stroke-width="3.2"/>
  <line x1="3.84" y1="32" x2="60.16" y2="32" stroke="${INK}" stroke-width="3.2"/>
  <path d="M 14.54 9.75 A 30.98 30.98 0 0 1 14.54 54.25" fill="none" stroke="${INK}" stroke-width="3.2"/>
  <path d="M 49.46 9.75 A 30.98 30.98 0 0 0 49.46 54.25" fill="none" stroke="${INK}" stroke-width="3.2"/>
  <circle cx="32" cy="32" r="6.4" fill="${CREAM}" stroke="${INK}" stroke-width="2.4"/>`;
}

function ballSvg(size: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">
  ${ballMarkInner()}
</svg>`;
}

/** App icon: ball on court-dark rounded tile (maskable-safe padding). */
function tileSvg(size: number): string {
  const ballSize = size * 0.72;
  const off = size * 0.14;
  const scale = ballSize / 64;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs><clipPath id="tile"><rect width="${size}" height="${size}" rx="${size * 0.18}"/></clipPath></defs>
  <g clip-path="url(#tile)">
    <rect width="${size}" height="${size}" fill="${COURT}"/>
    <rect x="0" y="${size * 0.86}" width="${size}" height="${size * 0.14}" fill="${RED}"/>
  </g>
  <g transform="translate(${off} ${off * 0.8}) scale(${scale})">${ballMarkInner()}</g>
</svg>`;
}

/** 1200x630 OG card — court stripes, wordmark, tagline, baseline bar. */
function ogSvg(): string {
  const stripes = Array.from({ length: 24 }, (_, i) => {
    const x = i * 52;
    return `<rect x="${x}" y="0" width="3" height="630" fill="rgba(255,255,255,0.02)"/>`;
  }).join("");
  const ballScale = 190 / 64;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${COURT}"/>
  ${stripes}
  <g transform="translate(95 150) scale(${ballScale})">${ballMarkInner()}</g>
  <text x="330" y="300" font-family="Impact, Arial Narrow, sans-serif" font-weight="900" font-size="140" letter-spacing="2" fill="${INK_OG}">BALL<tspan fill="${ORANGE}">HOG</tspan></text>
  <text x="335" y="380" font-family="Impact, Arial Narrow, sans-serif" font-weight="700" font-size="34" fill="#9b958a" textLength="760" lengthAdjust="spacingAndGlyphs">NAME THE HOOPER. FASTEST BUCKET WINS.</text>
  <rect x="0" y="570" width="1200" height="60" fill="${RED}"/>
  <text x="600" y="610" text-anchor="middle" font-family="Impact, Arial Narrow, sans-serif" font-weight="700" font-size="26" fill="${INK_OG}" textLength="640" lengthAdjust="spacingAndGlyphs">FIRST TO 5 · UP TO 5 PLAYERS · OR GO SOLO</text>
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
