/**
 * Utilitaires purs (client et serveur) pour transformer le HTML public d'une
 * publication en texte affichable.
 */

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  hellip: "…",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  ndash: "–",
  mdash: "—",
};

export function decodeEntities(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] === "#") {
      const code =
        entity[1] === "x" || entity[1] === "X"
          ? parseInt(entity.slice(2), 16)
          : parseInt(entity.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff
        ? String.fromCodePoint(code)
        : match;
    }
    return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
  });
}

/** Valeur d'une balise <meta property|name="..."> (ordre des attributs indifférent). */
export function extractMeta(html: string, property: string): string | null {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]*?content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*?(?:property|name)=["']${escaped}["']`, "i"),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return decodeEntities(match[1]);
  }
  return null;
}

/** HTML d'une légende → texte brut avec ses retours à la ligne. */
export function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div)>/gi, "\n")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

const TRAILING_TAGS = /(?:\s*[#@][\p{L}\p{N}_.]+)+\s*$/u;
const ONLY_TAGS = /^(?:\s*[#@][\p{L}\p{N}_.]+)+\s*$/u;
/** Mot de liaison laissé orphelin par le retrait d'une mention finale (« … by @compte »). */
const DANGLING_CONNECTOR = /\s+(?:by|with|w\/|ft\.?|feat\.?|via|avec|par|de|and|et|&|x|:|-|–|—)\s*$/iu;

/**
 * Un Reel n'a pas de titre : on prend la première ligne utile de la légende,
 * sans les hashtags et mentions qui la terminent, raccourcie proprement.
 */
export function captionToTitle(caption: string | null | undefined, max = 120): string | null {
  if (!caption) return null;
  for (const rawLine of caption.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || ONLY_TAGS.test(line)) continue;
    let cleaned = line.replace(TRAILING_TAGS, "").replace(/\s+/g, " ").trim();
    while (DANGLING_CONNECTOR.test(cleaned)) cleaned = cleaned.replace(DANGLING_CONNECTOR, "").trim();
    // Il faut au moins deux caractères qui ne soient ni ponctuation ni symbole.
    if (cleaned.replace(/[\p{P}\p{S}\s]/gu, "").length < 2) continue;
    if (cleaned.length <= max) return cleaned;
    const cut = cleaned.slice(0, max - 1);
    const lastSpace = cut.lastIndexOf(" ");
    return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.–—-]+$/, "")}…`;
  }
  return null;
}
