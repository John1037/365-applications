// Generates public/bg.svg: a glowing node network with a few floating "app panels".
// Deterministic (seeded), so re-running gives the same image. Tweak the constants and run:
//   node scripts/generate-bg.mjs
import { writeFileSync } from "node:fs";

const W = 1600, H = 1000;
const ACCENT = "#3ddc97";   // keep in sync with --accent in styles.css
const SOFT = "#c9c4ff";     // secondary glow (pale lilac)
const SEED = 365;

let s = SEED;
const rand = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
const r = (a, b) => a + rand() * (b - a);
const f = (n) => Math.round(n * 10) / 10;

// Points biased to the right-hand side, where there is no body text.
const pts = [];
while (pts.length < 64) {
  const x = W * Math.pow(rand(), 0.55), y = r(0, H);
  if (pts.every((p) => Math.hypot(p.x - x, p.y - y) > 70)) pts.push({ x, y, z: rand() });
}

// Connect each point to its nearest neighbours.
const edges = new Set();
pts.forEach((p, i) => {
  pts.map((q, j) => ({ j, d: Math.hypot(p.x - q.x, p.y - q.y) }))
    .filter((o) => o.j !== i && o.d < 260)
    .sort((a, b) => a.d - b.d).slice(0, 3)
    .forEach((o) => edges.add([Math.min(i, o.j), Math.max(i, o.j)].join("-")));
});

const lines = [...edges].map((e) => {
  const [a, b] = e.split("-").map((n) => pts[n]);
  const o = f(0.12 + 0.25 * Math.min(a.z, b.z));
  const dash = rand() < 0.35 ? ` stroke-dasharray="1 7"` : "";
  return `<line x1="${f(a.x)}" y1="${f(a.y)}" x2="${f(b.x)}" y2="${f(b.y)}" stroke-opacity="${o}"${dash}/>`;
}).join("");

const hubs = [], dots = [];
pts.forEach((p) => {
  if (p.z > 0.86) {
    const rad = f(r(16, 34));
    hubs.push(`<g transform="translate(${f(p.x)} ${f(p.y)})"><circle r="${f(rad * 2.4)}" fill="url(#halo)"/><circle r="${rad}" fill="url(#orb)"/><circle r="${rad}" fill="none" stroke="${ACCENT}" stroke-opacity=".5" stroke-dasharray="1.5 3"/></g>`);
  } else {
    dots.push(`<circle cx="${f(p.x)}" cy="${f(p.y)}" r="${f(1.2 + p.z * 2.4)}" fill-opacity="${f(0.35 + p.z * 0.6)}"/>`);
  }
});

// Floating panels, echoing app windows / message cards.
const panel = (x, y, w, h, col, op) => {
  const bars = [0.72, 0.46].map((len, k) =>
    `<rect x="${f(w * 0.1)}" y="${f(h * (0.3 + k * 0.28))}" width="${f(w * len)}" height="${f(h * 0.11)}" rx="${f(h * 0.055)}" fill="${col}"/>`).join("");
  return `<g transform="translate(${x} ${y})" opacity="${op}" filter="url(#glow)"><rect width="${w}" height="${h}" rx="${f(h * 0.22)}" fill="${col}" fill-opacity=".06" stroke="${col}" stroke-width="2"/>${bars}</g>`;
};
const panels = [
  panel(1400, 70, 230, 100, ACCENT, 0.4),
  panel(1460, 560, 200, 88, SOFT, 0.28),
  panel(1150, 860, 220, 96, ACCENT, 0.25),
].join("");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">
<defs>
<radialGradient id="bloomA" cx="82%" cy="22%" r="55%"><stop offset="0" stop-color="${ACCENT}" stop-opacity=".16"/><stop offset="1" stop-color="${ACCENT}" stop-opacity="0"/></radialGradient>
<radialGradient id="bloomB" cx="70%" cy="85%" r="50%"><stop offset="0" stop-color="${SOFT}" stop-opacity=".1"/><stop offset="1" stop-color="${SOFT}" stop-opacity="0"/></radialGradient>
<radialGradient id="halo"><stop offset="0" stop-color="${ACCENT}" stop-opacity=".22"/><stop offset="1" stop-color="${ACCENT}" stop-opacity="0"/></radialGradient>
<radialGradient id="orb" cx="35%" cy="30%"><stop offset="0" stop-color="#ffffff" stop-opacity=".35"/><stop offset=".45" stop-color="${ACCENT}" stop-opacity=".18"/><stop offset="1" stop-color="${SOFT}" stop-opacity=".05"/></radialGradient>
<linearGradient id="fadeL" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".25"/><stop offset=".55" stop-color="#fff" stop-opacity=".8"/><stop offset="1" stop-color="#fff"/></linearGradient>
<mask id="m"><rect width="${W}" height="${H}" fill="url(#fadeL)"/></mask>
<filter id="glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
</defs>
<rect width="${W}" height="${H}" fill="url(#bloomA)"/><rect width="${W}" height="${H}" fill="url(#bloomB)"/>
<g mask="url(#m)">
<g stroke="${ACCENT}" stroke-width="1">${lines}</g>
<g fill="${ACCENT}">${dots.join("")}</g>
${hubs.join("")}
${panels}
</g>
</svg>
`;

writeFileSync(new URL("../public/bg.svg", import.meta.url), svg);
console.log(`bg.svg: ${pts.length} nodes, ${edges.size} links, ${(svg.length / 1024).toFixed(1)} KiB`);
