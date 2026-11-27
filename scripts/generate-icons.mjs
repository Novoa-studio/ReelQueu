/**
 * Génère les icônes de l'application à partir d'un seul dessin vectoriel
 * (le pictogramme ReelQueue : une file de cartes avec un bouton lecture).
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
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// Couleurs de la marque (équivalents sRGB des tokens OKLCH de globals.css).
const BRAND = "#4662b9"; // oklch(0.52 0.14 268)
const BRAND_LIGHT = "#627ace"; // oklch(0.60 0.13 270)
const BRAND_DARK = "#344da2"; // oklch(0.45 0.14 268)

/**
 * Dessin sur une grille de 1024. Pictogramme : 576 × 624 px centré.
 * @param {{ radius: number, scale: number }} options
 *   radius : arrondi du fond (0 = plein cadre, l'OS applique son propre masque)
 *   scale  : taille du pictogramme (1 = 56 % de la largeur)
 */
function iconSvg({ radius, scale }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${BRAND_LIGHT}"/>
      <stop offset="1" stop-color="${BRAND_DARK}"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" rx="${radius}" fill="url(#bg)"/>
  <g transform="translate(512 512) scale(${scale}) translate(-512 -520)">
    <rect x="288" y="208" width="448" height="96" rx="48" fill="#fff" fill-opacity="0.5"/>
    <rect x="224" y="352" width="576" height="480" rx="128" fill="#fff"/>
    <path d="M462 500 L462 684 L628 592 Z" fill="${BRAND}" stroke="${BRAND}" stroke-width="44" stroke-linejoin="round"/>
  </g>
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
