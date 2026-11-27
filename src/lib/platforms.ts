import type { Platform, VideoKind } from "@/types";
import { instagramThumbnailPath } from "@/lib/metadata/types";

/**
 * Registre des plateformes : détection, normalisation et informations
 * publiques déductibles de l'URL seule (aucun appel réseau, aucun scraping).
 */

export interface ParsedVideoUrl {
  /** URL d'origine nettoyée des espaces, conservée telle quelle pour l'ouverture. */
  url: string;
  /** Clé de dédoublonnage. */
  canonicalUrl: string;
  platform: Platform;
  kind: VideoKind;
  externalId: string | null;
  creator: string | null;
  /** Miniature publique déterministe quand la plateforme en fournit une (YouTube). */
  thumbnailUrl: string | null;
}

type PlatformMatch = Omit<ParsedVideoUrl, "url" | "platform">;

export interface PlatformEmbed {
  /** Lecteur ou aperçu officiel de la plateforme. */
  url: (externalId: string) => string;
  /**
   * Lecture possible dans ReelQueue. Faux pour Instagram : son intégration
   * officielle affiche la couverture mais renvoie vers Instagram pour lire.
   */
  inline: boolean;
  /** Types de contenus intégrables (tous si absent). */
  kinds?: VideoKind[];
}

export interface PlatformDefinition {
  id: Platform;
  label: string;
  /** Couleur d'identification (pastille, miniature de remplacement). */
  color: string;
  hosts: string[];
  parse?: (url: URL) => PlatformMatch | null;
  /** Intégration officielle, déclarée seulement si la plateforme l'autorise sans authentification. */
  embed?: PlatformEmbed;
}

const INSTAGRAM_RESERVED = new Set(["share", "stories", "explore", "accounts"]);

const instagram: PlatformDefinition = {
  id: "instagram",
  label: "Instagram",
  color: "oklch(0.62 0.21 355)",
  hosts: ["instagram.com", "instagr.am"],
  parse(url) {
    const path = url.pathname;
    const share = path.match(/^\/share\/(reels?|p)\/([A-Za-z0-9_-]+)/);
    if (share) {
      // Lien de partage opaque : il redirige côté Instagram, on le garde tel quel.
      return {
        kind: share[1] === "p" ? "post" : "reel",
        externalId: null,
        canonicalUrl: `https://www.instagram.com/share/${share[1]}/${share[2]}/`,
        creator: null,
        thumbnailUrl: null,
      };
    }
    const m = path.match(/^\/(?:([A-Za-z0-9._]+)\/)?(reels?|p|tv)\/([A-Za-z0-9_-]+)/);
    if (!m) return null;
    const [, user, type, id] = m;
    return {
      kind: type === "p" ? "post" : "reel",
      externalId: id,
      // /p/{id} et /reel/{id} désignent le même média : une seule clé.
      canonicalUrl: `https://www.instagram.com/p/${id}/`,
      creator: user && !INSTAGRAM_RESERVED.has(user) ? `@${user}` : null,
      thumbnailUrl: instagramThumbnailPath(id),
    };
  },
  embed: { url: (id) => `https://www.instagram.com/p/${id}/embed/`, inline: false },
};

const tiktok: PlatformDefinition = {
  id: "tiktok",
  label: "TikTok",
  // Encre : s'inverse en mode sombre (voir --platform-ink dans globals.css).
  color: "var(--platform-ink)",
  hosts: ["tiktok.com"],
  parse(url) {
    const path = url.pathname;
    const video = path.match(/^\/@([^/]+)\/(video|photo)\/(\d+)/);
    if (video) {
      const [, user, type, id] = video;
      return {
        kind: type === "photo" ? "post" : "video",
        externalId: id,
        canonicalUrl: `https://www.tiktok.com/@${user}/${type}/${id}`,
        creator: `@${user}`,
        thumbnailUrl: null,
      };
    }
    // Liens courts (vm.tiktok.com/XXX, vt.tiktok.com/XXX, tiktok.com/t/XXX)
    const host = url.hostname.replace(/^www\./, "");
    const short =
      host === "vm.tiktok.com" || host === "vt.tiktok.com"
        ? path.match(/^\/([A-Za-z0-9]+)/)
        : path.match(/^\/t\/([A-Za-z0-9]+)/);
    if (short) {
      const prefix = host.startsWith("v") ? `https://${host}` : "https://www.tiktok.com/t";
      return {
        kind: "video",
        externalId: null,
        canonicalUrl: `${prefix}/${short[1]}/`,
        creator: null,
        thumbnailUrl: null,
      };
    }
    return null;
  },
  embed: {
    url: (id) => `https://www.tiktok.com/player/v1/${id}?autoplay=1&rel=0&description=1`,
    inline: true,
    kinds: ["video"],
  },
};

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

const youtube: PlatformDefinition = {
  id: "youtube",
  label: "YouTube",
  color: "oklch(0.6 0.22 27)",
  hosts: ["youtube.com", "youtu.be", "youtube-nocookie.com"],
  parse(url) {
    const host = url.hostname.replace(/^(www|m|music)\./, "");
    let id: string | null = null;
    let kind: VideoKind = "video";
    if (host === "youtu.be") {
      id = url.pathname.split("/")[1] ?? null;
    } else if (url.pathname === "/watch") {
      id = url.searchParams.get("v");
    } else {
      const m = url.pathname.match(/^\/(shorts|live|embed|v)\/([^/?#]+)/);
      if (m) {
        id = m[2];
        if (m[1] === "shorts") kind = "short";
      }
    }
    if (!id || !YOUTUBE_ID.test(id)) return null;
    return {
      kind,
      externalId: id,
      canonicalUrl: `https://www.youtube.com/watch?v=${id}`,
      creator: null,
      thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    };
  },
  embed: {
    url: (id) => `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&playsinline=1&rel=0`,
    inline: true,
  },
};

const facebook: PlatformDefinition = {
  id: "facebook",
  label: "Facebook",
  color: "oklch(0.55 0.18 258)",
  hosts: ["facebook.com", "fb.watch", "fb.com"],
  parse(url) {
    const host = url.hostname.replace(/^(www|m|web)\./, "");
    if (host === "fb.watch") {
      const code = url.pathname.split("/")[1];
      if (!code) return null;
      return {
        kind: "video",
        externalId: null,
        canonicalUrl: `https://fb.watch/${code}/`,
        creator: null,
        thumbnailUrl: null,
      };
    }
    const reel = url.pathname.match(/^\/reel\/(\d+)/);
    if (reel) {
      return {
        kind: "reel",
        externalId: reel[1],
        canonicalUrl: `https://www.facebook.com/reel/${reel[1]}`,
        creator: null,
        thumbnailUrl: null,
      };
    }
    const watchId = url.pathname.startsWith("/watch") ? url.searchParams.get("v") : null;
    const videoPath = url.pathname.match(/^\/[^/]+\/videos\/(?:[^/]+\/)?(\d+)/);
    const id = watchId ?? videoPath?.[1] ?? null;
    if (!id || !/^\d+$/.test(id)) return null;
    return {
      kind: "video",
      externalId: id,
      canonicalUrl: `https://www.facebook.com/watch/?v=${id}`,
      creator: null,
      thumbnailUrl: null,
    };
  },
};

const x: PlatformDefinition = {
  id: "x",
  label: "X",
  color: "var(--platform-ink)",
  hosts: ["x.com", "twitter.com"],
  parse(url) {
    const m = url.pathname.match(/^\/([A-Za-z0-9_]{1,15})\/status\/(\d+)/);
    if (!m) return null;
    return {
      kind: "post",
      externalId: m[2],
      canonicalUrl: `https://x.com/${m[1]}/status/${m[2]}`,
      creator: `@${m[1]}`,
      thumbnailUrl: null,
    };
  },
};

const vimeo: PlatformDefinition = {
  id: "vimeo",
  label: "Vimeo",
  color: "oklch(0.65 0.13 220)",
  hosts: ["vimeo.com"],
  parse(url) {
    const m = url.pathname.match(/^\/(?:video\/)?(\d+)/);
    if (!m) return null;
    return {
      kind: "video",
      externalId: m[1],
      canonicalUrl: `https://vimeo.com/${m[1]}`,
      creator: null,
      thumbnailUrl: null,
    };
  },
  embed: {
    url: (id) => `https://player.vimeo.com/video/${id}?autoplay=1&playsinline=1&title=0&byline=0`,
    inline: true,
  },
};

const other: PlatformDefinition = {
  id: "other",
  label: "Web",
  color: "oklch(0.6 0.02 265)",
  hosts: [],
};

export const PLATFORM_DEFINITIONS: Record<Platform, PlatformDefinition> = {
  instagram,
  tiktok,
  youtube,
  facebook,
  x,
  vimeo,
  other,
};

export function getPlatform(id: Platform): PlatformDefinition {
  return PLATFORM_DEFINITIONS[id] ?? other;
}

function matchesHost(hostname: string, hosts: string[]): boolean {
  return hosts.some((h) => hostname === h || hostname.endsWith(`.${h}`));
}

export function detectPlatform(url: URL): PlatformDefinition {
  const hostname = url.hostname.toLowerCase();
  for (const def of Object.values(PLATFORM_DEFINITIONS)) {
    if (def.hosts.length && matchesHost(hostname, def.hosts)) return def;
  }
  return other;
}

const TRACKING_PARAMS = /^(utm_.+|fbclid|gclid|dclid|msclkid|igsh|igshid|mc_cid|mc_eid|_hsenc|_hsmi|ref_src|ref_url|si|feature|is_from_webapp|sender_device|share_app_id|share_link_id)$/i;

/** Normalisation générique : hôte en minuscules sans www, sans fragment ni paramètres de suivi. */
export function genericCanonicalUrl(url: URL): string {
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const path = url.pathname.replace(/\/+$/, "") || "";
  const params = [...url.searchParams.entries()]
    .filter(([key]) => !TRACKING_PARAMS.test(key))
    .sort(([a], [b]) => a.localeCompare(b));
  const query = params.length ? `?${new URLSearchParams(params).toString()}` : "";
  const port = url.port ? `:${url.port}` : "";
  return `${url.protocol}//${host}${port}${path}${query}`;
}

const URL_IN_TEXT = /https?:\/\/[^\s<>"'«»]+/i;
const BARE_URL_IN_TEXT = /(?:^|\s)((?:[a-z0-9-]+\.)+[a-z]{2,}\/[^\s<>"'«»]*)/i;

/**
 * Extrait la première URL d'un texte. Les menus de partage envoient souvent
 * « Regarde ça ! https://… » : on ne garde que le lien.
 */
export function extractUrl(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const match = trimmed.match(URL_IN_TEXT)?.[0] ?? trimmed.match(BARE_URL_IN_TEXT)?.[1];
  if (!match) return null;
  const cleaned = match.replace(/[).,;:!?\]}]+$/, "");
  return /^https?:\/\//i.test(cleaned) ? cleaned : `https://${cleaned}`;
}

export type ParseError = "empty" | "invalid";

export type ParseResult =
  | { ok: true; value: ParsedVideoUrl }
  | { ok: false; error: ParseError };

export function parseVideoUrl(input: string): ParseResult {
  if (!input.trim()) return { ok: false, error: "empty" };
  const raw = extractUrl(input);
  if (!raw) return { ok: false, error: "invalid" };

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, error: "invalid" };
  }
  if (!["http:", "https:"].includes(url.protocol) || !url.hostname.includes(".")) {
    return { ok: false, error: "invalid" };
  }

  const def = detectPlatform(url);
  const match = def.parse?.(url) ?? null;
  return {
    ok: true,
    value: {
      url: raw,
      platform: def.id,
      ...(match ?? {
        kind: "link" as const,
        externalId: null,
        canonicalUrl: genericCanonicalUrl(url),
        creator: null,
        thumbnailUrl: null,
      }),
    },
  };
}

/** Variante tolérante, pour l'affichage d'URL déjà enregistrées. */
export function safeParseVideoUrl(url: string): ParsedVideoUrl | null {
  const result = parseVideoUrl(url);
  return result.ok ? result.value : null;
}

export interface EmbedInfo {
  src: string;
  /** Lecture dans l'app (sinon simple aperçu qui renvoie vers la plateforme). */
  inline: boolean;
  /** Format vertical (Reel, Short, TikTok). */
  portrait: boolean;
}

export function getEmbed(url: string): EmbedInfo | null {
  const parsed = safeParseVideoUrl(url);
  if (!parsed?.externalId) return null;
  const embed = getPlatform(parsed.platform).embed;
  if (!embed || (embed.kinds && !embed.kinds.includes(parsed.kind))) return null;
  return {
    src: embed.url(parsed.externalId),
    inline: embed.inline,
    portrait: parsed.kind === "reel" || parsed.kind === "short" || parsed.platform === "tiktok",
  };
}
