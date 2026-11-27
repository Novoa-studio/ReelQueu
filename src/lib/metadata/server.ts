import "server-only";
import type { ParsedVideoUrl } from "@/lib/platforms";
import { captionToTitle, decodeEntities, extractMeta, htmlToText } from "./text";
import { EMPTY_METADATA, instagramThumbnailPath, type VideoMetadata } from "./types";

/**
 * Récupération des informations publiques d'une vidéo, côté serveur.
 *
 * - Instagram : Meta a retiré titre, auteur et miniature de son API oEmbed le
 *   3 novembre 2025 et recommande de lire les métadonnées HTML de la
 *   publication. On lit donc ses balises Open Graph (publiques, sans
 *   connexion), avec la page d'intégration officielle en secours.
 * - YouTube, TikTok, Vimeo : endpoints oEmbed publics officiels.
 *
 * Seules des URL construites ici à partir d'un identifiant validé sont
 * appelées : jamais l'adresse fournie par le client (pas de SSRF).
 */

/** Agent identifié honnêtement, comme un service d'aperçu de liens. */
export const FETCH_USER_AGENT = "ReelQueue/1.0 (link preview; +https://reelqueue.vercel.app)";
const TIMEOUT_MS = 6000;

async function fetchText(url: string, accept = "text/html"): Promise<{ text: string; finalUrl: string } | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": FETCH_USER_AGENT,
        Accept: accept,
        // Textes Open Graph en anglais : un seul format à analyser.
        "Accept-Language": "en-US,en;q=0.8",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) return null;
    return { text: await res.text(), finalUrl: res.url };
  } catch {
    return null;
  }
}

async function fetchJson<T>(url: string): Promise<T | null> {
  const result = await fetchText(url, "application/json");
  if (!result) return null;
  try {
    return JSON.parse(result.text) as T;
  } catch {
    return null;
  }
}

/* ----------------------------------------------------------------------------
 * Instagram
 * ------------------------------------------------------------------------- */

const IG_RESERVED = new Set(["p", "reel", "reels", "tv", "explore", "accounts", "stories", "share"]);

function creatorFromInstagramUrl(url: string | null): string | null {
  if (!url) return null;
  const match = url.match(/instagram\.com\/([A-Za-z0-9._]{1,30})\/(?:reels?|p|tv)\//);
  return match && !IG_RESERVED.has(match[1]) ? `@${match[1]}` : null;
}

/** Balises Open Graph de la page publique de la publication. */
async function instagramFromPostPage(shortcode: string): Promise<VideoMetadata | null> {
  const page = await fetchText(`https://www.instagram.com/p/${shortcode}/`);
  // Redirection vers la connexion ou une page d'erreur : pas d'aperçu public.
  if (!page || !/instagram\.com\/(?:[^/]+\/)?(?:p|reels?|tv)\//.test(page.finalUrl)) return null;

  const ogTitle = extractMeta(page.text, "og:title");
  const ogDescription = extractMeta(page.text, "og:description");
  const ogUrl = extractMeta(page.text, "og:url");
  if (!ogTitle && !ogDescription) return null;

  // « NOM on Instagram: "légende" »
  const caption =
    ogTitle?.match(/ on Instagram: "([\s\S]*)"\s*$/)?.[1] ??
    ogDescription?.match(/: "([\s\S]*)"\.?\s*$/)?.[1] ??
    null;
  // « 27K likes, 167 comments - compte on December 14, 2025: … »
  const usernameFromDescription = ogDescription?.match(/ - ([A-Za-z0-9._]{1,30}) on /)?.[1];

  return {
    title: captionToTitle(caption),
    creator:
      creatorFromInstagramUrl(ogUrl) ?? (usernameFromDescription ? `@${usernameFromDescription}` : null),
    thumbnailUrl: instagramThumbnailPath(shortcode),
  };
}

/** Page d'intégration officielle (conçue pour être affichée par des sites tiers). */
async function instagramFromEmbedPage(shortcode: string): Promise<VideoMetadata | null> {
  const page = await fetchText(`https://www.instagram.com/p/${shortcode}/embed/captioned/`);
  if (!page) return null;
  const username = page.text.match(/class="UsernameText">([^<]+)</)?.[1]?.trim();
  const captionHtml = page.text.match(/class="Caption">([\s\S]*?)<div class="CaptionComments/)?.[1];
  if (!username && !captionHtml) return null;
  const caption = captionHtml
    ? htmlToText(captionHtml.replace(/<a class="CaptionUsername"[\s\S]*?<\/a>/, ""))
    : null;
  return {
    title: captionToTitle(caption),
    creator: username ? `@${decodeEntities(username)}` : null,
    thumbnailUrl: instagramThumbnailPath(shortcode),
  };
}

async function instagramMetadata(shortcode: string): Promise<VideoMetadata> {
  const fromPage = await instagramFromPostPage(shortcode);
  if (fromPage?.title && fromPage.creator) return fromPage;
  const fromEmbed = await instagramFromEmbedPage(shortcode);
  return {
    title: fromPage?.title ?? fromEmbed?.title ?? null,
    creator: fromPage?.creator ?? fromEmbed?.creator ?? null,
    thumbnailUrl: instagramThumbnailPath(shortcode),
  };
}

/* ----------------------------------------------------------------------------
 * oEmbed publics (YouTube, TikTok, Vimeo)
 * ------------------------------------------------------------------------- */

interface OEmbed {
  title?: string;
  author_name?: string;
  author_unique_id?: string;
  thumbnail_url?: string;
}

function clean(value: string | undefined, max: number): string | null {
  const text = value?.replace(/\s+/g, " ").trim();
  if (!text) return null;
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

async function oembedMetadata(endpoint: string, options: { keepThumbnail: boolean }): Promise<VideoMetadata> {
  const data = await fetchJson<OEmbed>(endpoint);
  if (!data) return EMPTY_METADATA;
  return {
    title: captionToTitle(data.title) ?? clean(data.title, 140),
    creator: data.author_unique_id ? `@${data.author_unique_id}` : clean(data.author_name, 120),
    thumbnailUrl: options.keepThumbnail && data.thumbnail_url?.startsWith("https://") ? data.thumbnail_url : null,
  };
}

/* ----------------------------------------------------------------------------
 * Point d'entrée
 * ------------------------------------------------------------------------- */

export async function fetchVideoMetadata(parsed: ParsedVideoUrl): Promise<VideoMetadata> {
  const id = parsed.externalId;
  switch (parsed.platform) {
    case "instagram":
      return id ? instagramMetadata(id) : EMPTY_METADATA;
    case "youtube":
      if (!id) return EMPTY_METADATA;
      return {
        ...(await oembedMetadata(
          `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`,
          { keepThumbnail: false },
        )),
        thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      };
    case "tiktok":
      // Miniatures TikTok signées et à durée limitée : on ne les conserve pas.
      return oembedMetadata(
        `https://www.tiktok.com/oembed?url=${encodeURIComponent(parsed.canonicalUrl)}`,
        { keepThumbnail: false },
      );
    case "vimeo":
      if (!id) return EMPTY_METADATA;
      return oembedMetadata(
        `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(`https://vimeo.com/${id}`)}`,
        { keepThumbnail: true },
      );
    default:
      return EMPTY_METADATA;
  }
}
