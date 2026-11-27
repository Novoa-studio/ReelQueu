import type { Collection, Platform, Video, VideoKind } from "@/types";
import { getEmbed, getPlatform, safeParseVideoUrl, type EmbedInfo } from "@/lib/platforms";

const KIND_LABELS: Record<VideoKind, string> = {
  reel: "Reel",
  short: "Short",
  video: "Vidéo",
  post: "Publication",
  link: "Lien",
};

export interface VideoDisplay {
  title: string;
  /** Vrai si le titre est généré faute de métadonnées. */
  isFallbackTitle: boolean;
  platformLabel: string;
  platformColor: string;
  kind: VideoKind;
  hostname: string;
  /** Lecteur ou aperçu officiel disponible. */
  embed: EmbedInfo | null;
}

// Les vidéos sont immuables dans le store : un WeakMap suffit à mémoriser l'affichage.
const displayCache = new WeakMap<Video, VideoDisplay>();

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function describeVideo(video: Video): VideoDisplay {
  const cached = displayCache.get(video);
  if (cached) return cached;

  const platform = getPlatform(video.platform);
  const kind = safeParseVideoUrl(video.url)?.kind ?? "link";
  const hostname = hostnameOf(video.url);

  let title = video.title?.trim() || "";
  const isFallbackTitle = !title;
  if (isFallbackTitle) {
    if (video.platform === "other") {
      title = `Vidéo sur ${hostname}`;
    } else {
      const base = `${KIND_LABELS[kind]} ${platform.label}`;
      title = video.creator ? `${base} de ${video.creator}` : base;
    }
  }

  const display: VideoDisplay = {
    title,
    isFallbackTitle,
    platformLabel: platform.label,
    platformColor: platform.color,
    kind,
    hostname,
    embed: getEmbed(video.url),
  };
  displayCache.set(video, display);
  return display;
}

export function isSeen(video: Video): boolean {
  return video.status !== "pending";
}

/* ----------------------------------------------------------------------------
 * Dates
 * ------------------------------------------------------------------------- */

const rtf = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });
const shortDate = new Intl.DateTimeFormat("fr", { day: "numeric", month: "short" });
const longDate = new Intl.DateTimeFormat("fr", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function formatRelativeDate(iso: string, now: number = Date.now()): string {
  const date = new Date(iso);
  const time = date.getTime();
  if (Number.isNaN(time)) return "";
  const seconds = Math.round((time - now) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 60) return "à l’instant";
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(seconds / 3600), "hour");
  if (abs < 7 * 86400) return rtf.format(Math.round(seconds / 86400), "day");
  return date.getFullYear() === new Date(now).getFullYear()
    ? shortDate.format(date)
    : longDate.format(date);
}

export function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count > 1 ? plural : singular}`;
}

/* ----------------------------------------------------------------------------
 * Recherche, filtres, tri
 * ------------------------------------------------------------------------- */

export type StatusFilter = "all" | "pending" | "seen";

export const STATUS_FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Toutes" },
  { value: "pending", label: "À regarder" },
  { value: "seen", label: "Vues" },
];

export interface VideoQuery {
  text?: string;
  status?: StatusFilter;
  favoritesOnly?: boolean;
  platform?: Platform | null;
  collectionId?: string | null;
}

export type VideoSort = "added_desc" | "added_asc" | "viewed_desc";

export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function searchableText(video: Video): string {
  const display = describeVideo(video);
  return normalizeText(
    [display.title, video.creator, display.platformLabel, video.note]
      .filter(Boolean)
      .join(" "),
  );
}

export function filterVideos(videos: Video[], query: VideoQuery): Video[] {
  const terms = query.text ? normalizeText(query.text).split(/\s+/).filter(Boolean) : [];
  return videos.filter((video) => {
    if (query.status === "pending" && video.status !== "pending") return false;
    if (query.status === "seen" && video.status === "pending") return false;
    if (query.favoritesOnly && !video.is_favorite) return false;
    if (query.platform && video.platform !== query.platform) return false;
    if (query.collectionId && !video.collection_ids.includes(query.collectionId)) {
      return false;
    }
    if (terms.length) {
      const haystack = searchableText(video);
      return terms.every((term) => haystack.includes(term));
    }
    return true;
  });
}

export function sortVideos(videos: Video[], sort: VideoSort): Video[] {
  const sorted = [...videos];
  switch (sort) {
    case "added_asc":
      return sorted.sort((a, b) => a.added_at.localeCompare(b.added_at));
    case "viewed_desc":
      return sorted.sort((a, b) =>
        (b.viewed_at ?? b.added_at).localeCompare(a.viewed_at ?? a.added_at),
      );
    case "added_desc":
    default:
      return sorted.sort((a, b) => b.added_at.localeCompare(a.added_at));
  }
}

export function findDuplicate(videos: Video[], canonicalUrl: string): Video | undefined {
  return videos.find((v) => v.canonical_url === canonicalUrl);
}

export function collectionsOf(video: Video, collections: Collection[]): Collection[] {
  if (!video.collection_ids.length) return [];
  return collections.filter((c) => video.collection_ids.includes(c.id));
}
