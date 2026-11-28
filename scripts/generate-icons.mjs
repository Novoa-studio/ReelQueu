/**
 * Génère les icônes de l'application à partir d'un seul dessin vectoriel
 * (le pictogramme ReelQueue : des Reels en éventail avec un bouton lecture).
 *
 *   npm run icons
 *
 * Fichiers produits :
 *   src/app/icon.svg              favicon vectoriel (onglets récents)
 *   src/app/favicon.ico           favicon de secours (16, 32, 48 px)
 *   src/app/apple-icon.png        écran d'accueil iPhone (180 px, plein cadre)
 *   public/icons/icon-192.png     manifest, usage « any » (coins arrondis)
 *   public/icons/icon-512.png     manifest, usage « any »
 *   public/icons/icon-maskable-512.png  manifest, usage « maskable » (Android)
 *   public/splash/*.png           écrans de démarrage iOS, clair et sombre
 *                                 (un par taille d'écran de src/lib/splash-screens.json)
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// Couleurs de l'icône : l'indigo de la marque (--brand dans globals.css), en
// plus lumineux pour l'écran d'accueil.
const BRAND = "#4f5de4";
const BRAND_LIGHT = "#7686ff";
const BRAND_DARK = "#3424ad";
const PLAY_START = "#5a68ff";
const PLAY_END = "#8139ee";

/**
 * Dessin sur une grille de 1024 : des Reels en éventail (la file), la carte
 * de devant porte le bouton lecture. Fond indigo avec les halos rose et cyan de
 * l'application, cartes en verre, reflet sur le bord (style « liquid glass »).
 * Le composant LogoMark (src/components/app-shell/logo.tsx) reprend ce dessin.
 * @param {{ radius: number, scale: number, id?: string }} options
 *   radius : arrondi du fond (0 = plein cadre, l'OS applique son propre masque)
 *   scale  : taille du pictogramme (1 = environ 62 % de la largeur)
 *   id     : préfixe des identifiants (unique si le dessin est imbriqué)
 */
function iconBody({ radius, scale, id = "rq" }) {
  const ref = (name) => `${id}-${name}`;
  // Reflet du bord : seulement quand on dessine nous-mêmes les coins arrondis.
  const rim =
    radius > 0
      ? `<rect x="5" y="5" width="1014" height="1014" rx="${radius - 5}" fill="none" stroke="url(#${ref("rim")})" stroke-width="10"/>`
      : "";
  return `<defs>
    <linearGradient id="${ref("bg")}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${BRAND_LIGHT}"/>
      <stop offset="0.5" stop-color="${BRAND}"/>
      <stop offset="1" stop-color="${BRAND_DARK}"/>
    </linearGradient>
    <radialGradient id="${ref("cyan")}" cx="0" cy="0" r="0.55">
      <stop offset="0" stop-color="#7ae8ff" stop-opacity="0.4"/>
      <stop offset="1" stop-color="#7ae8ff" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="${ref("pink")}" cx="1" cy="1" r="0.75">
      <stop offset="0" stop-color="#ff6fb1" stop-opacity="0.65"/>
      <stop offset="1" stop-color="#ff6fb1" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="${ref("rim")}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity="0.6"/>
      <stop offset="0.4" stop-color="#fff" stop-opacity="0.06"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0.2"/>
    </linearGradient>
    <linearGradient id="${ref("glass")}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity="0.65"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0.2"/>
    </linearGradient>
    <linearGradient id="${ref("card")}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#e6e8ff"/>
    </linearGradient>
    <linearGradient id="${ref("play")}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${PLAY_START}"/>
      <stop offset="1" stop-color="${PLAY_END}"/>
    </linearGradient>
    <filter id="${ref("blur")}" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="30"/>
    </filter>
  </defs>
  <rect width="1024" height="1024" rx="${radius}" fill="url(#${ref("bg")})"/>
  <rect width="1024" height="1024" rx="${radius}" fill="url(#${ref("cyan")})"/>
  <rect width="1024" height="1024" rx="${radius}" fill="url(#${ref("pink")})"/>
  ${rim}
  <g transform="translate(512 512) scale(${0.9 * scale}) translate(-512 -520)">
    <rect x="316" y="196" width="392" height="572" rx="106" fill="#fff" fill-opacity="0.22" transform="rotate(-13 512 900)"/>
    <rect x="316" y="196" width="392" height="572" rx="106" fill="url(#${ref("glass")})" transform="rotate(10 512 900)"/>
    <rect x="314" y="268" width="396" height="600" rx="110" fill="#1a1260" fill-opacity="0.55" filter="url(#${ref("blur")})"/>
    <rect x="296" y="226" width="432" height="612" rx="114" fill="url(#${ref("card")})"/>
    <path d="M468 452 L468 612 L607 532 Z" fill="url(#${ref("play")})" stroke="url(#${ref("play")})" stroke-width="48" stroke-linejoin="round"/>
  </g>`;
}

function iconSvg(options) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  ${iconBody(options)}
</svg>
`;
}

const VARIANTS = {
  // Coins arrondis et fond transparent : rendu soigné là où l'OS ne masque pas.
  rounded: iconSvg({ radius: 228, scale: 1 }),
  // Plein cadre : iOS et Android appliquent leur propre forme.
  fullBleed: iconSvg({ radius: 0, scale: 1 }),
  // Android « maskable » : pictogramme dans le cercle de sécurité (80 % du côté).
  maskable: iconSvg({ radius: 0, scale: 0.8 }),
  // Favicon : pictogramme un peu plus grand pour rester lisible en 16 px.
  favicon: iconSvg({ radius: 224, scale: 1.12 }),
};

/** @param {{ opaque?: boolean }} [options] opaque : sans canal alpha (exigé par iOS). */
async function png(svg, size, { opaque = false } = {}) {
  let image = sharp(Buffer.from(svg), { density: 384 }).resize(size, size);
  if (opaque) image = image.flatten({ background: BRAND_DARK }).removeAlpha();
  return image.png({ compressionLevel: 9 }).toBuffer();
}

/** Conteneur ICO avec des images PNG (format accepté par tous les navigateurs actuels). */
function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  const entries = [];
  let offset = 6 + 16 * images.length;
  for (const { size, data } of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    offset += data.length;
  }
  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}

async function write(relativePath, data) {
  const target = join(root, relativePath);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, data);
  console.log(`✓ ${relativePath}`);
}

await write("src/app/icon.svg", VARIANTS.favicon);
await write(
  "src/app/favicon.ico",
  ico(
    await Promise.all(
      [16, 32, 48].map(async (size) => ({ size, data: await png(VARIANTS.favicon, size) })),
    ),
  ),
);
// iOS refuse la transparence sur l'écran d'accueil : fond plein.
await write("src/app/apple-icon.png", await png(VARIANTS.fullBleed, 180, { opaque: true }));
await write("public/icons/icon-192.png", await png(VARIANTS.rounded, 192));
await write("public/icons/icon-512.png", await png(VARIANTS.rounded, 512));
await write(
  "public/icons/icon-maskable-512.png",
  await png(VARIANTS.maskable, 512, { opaque: true }),
);

// --- Écrans de démarrage iOS ------------------------------------------------
// iOS n'affiche un écran de démarrage que si une image correspond exactement à
// l'écran (taille, densité, orientation) : une image par modèle d'iPhone, en
// clair et en sombre. Même fond et mêmes halos que l'application (globals.css).

const SPLASH_THEMES = {
  light: {
    background: "#faf9f6",
    // [couleur, opacité] : --ambient-a/b/c
    halos: [
      ["#84a1f0", 0.16],
      ["#efa3c7", 0.12],
      ["#8cdee2", 0.1],
    ],
    shadow: [BRAND_DARK, 0.3],
  },
  dark: {
    background: "#0d0e11",
    halos: [
      ["#415cb2", 0.22],
      ["#94436d", 0.14],
      ["#298084", 0.1],
    ],
    shadow: [BRAND, 0.45], // halo lumineux plutôt qu'une ombre
  },
};

/** Taille de l'icône sur l'écran de démarrage, en points (comme une app native). */
const SPLASH_ICON_PT = 112;

/**
 * @param {{ width: number, height: number, ratio: number }} screen  points CSS × densité
 * @param {keyof typeof SPLASH_THEMES} theme
 */
function splashSvg({ width, height, ratio }, theme) {
  const { background, halos, shadow } = SPLASH_THEMES[theme];
  const W = width * ratio;
  const H = height * ratio;
  // Halos : radial-gradient(55% 38% at 8% 0%), (45% 32% at 100% 12%), (60% 40% at 50% 105%)
  const ellipses = [
    [0.08, 0, 0.55, 0.38],
    [1, 0.12, 0.45, 0.32],
    [0.5, 1.05, 0.6, 0.4],
  ];
  const size = SPLASH_ICON_PT * ratio;
  const x = (W - size) / 2;
  const y = H * 0.47 - size / 2;
  const radius = 228; // sur la grille de 1024, comme l'icône « rounded »
  const blur = 18 * ratio;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    ${halos
      .map(
        ([color, opacity], i) => `<radialGradient id="halo${i}">
      <stop offset="0" stop-color="${color}" stop-opacity="${opacity}"/>
      <stop offset="0.7" stop-color="${color}" stop-opacity="0"/>
    </radialGradient>`,
      )
      .join("\n    ")}
    <filter id="soft" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="${blur}"/>
    </filter>
  </defs>
  <rect width="${W}" height="${H}" fill="${background}"/>
  ${ellipses
    .map(
      ([cx, cy, rx, ry], i) =>
        `<ellipse cx="${cx * W}" cy="${cy * H}" rx="${rx * W}" ry="${ry * H}" fill="url(#halo${i})"/>`,
    )
    .join("\n  ")}
  <rect x="${x + size * 0.08}" y="${y + size * 0.14}" width="${size * 0.84}" height="${size * 0.84}"
    rx="${(radius / 1024) * size}" fill="${shadow[0]}" fill-opacity="${shadow[1]}" filter="url(#soft)"/>
  <g transform="translate(${x} ${y}) scale(${size / 1024})">
    ${iconBody({ radius, scale: 1, id: "icon" })}
  </g>
</svg>
`;
}

const screens = JSON.parse(
  await readFile(join(root, "src/lib/splash-screens.json"), "utf8"),
);
for (const screen of screens) {
  for (const theme of /** @type {const} */ (["light", "dark"])) {
    const data = await sharp(Buffer.from(splashSvg(screen, theme)))
      .flatten({ background: SPLASH_THEMES[theme].background })
      .removeAlpha()
      .png({ compressionLevel: 9 })
      .toBuffer();
    await write(
      `public/splash/${screen.width}x${screen.height}@${screen.ratio}x-${theme}.png`,
      data,
    );
  }
}
