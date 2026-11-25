/**
 * Modèle de domaine. Les noms de champs reprennent volontairement ceux des
 * tables Supabase (snake_case) pour éviter toute couche de conversion.
 */

export const PLATFORMS = [
  "instagram",
  "tiktok",
  "youtube",
  "facebook",
  "x",
  "vimeo",
  "other",
] as const;
export type Platform = (typeof PLATFORMS)[number];

/** Nature du contenu, déduite de l'URL (non stockée). */
export type VideoKind = "reel" | "short" | "video" | "post" | "link";

/**
 * - pending : dans la file « À regarder »
 * - viewed  : consultée (ouverte puis retour dans l'app, ou marquée à la main)
 * - archived: réservé (classement explicite), affiché dans la Bibliothèque
 */
export type VideoStatus = "pending" | "viewed" | "archived";

export interface Video {
  id: string;
  user_id: string;
  /** URL d'origine, telle que partagée : c'est elle qu'on ouvre. */
  url: string;
  /** URL normalisée servant de clé anti-doublon (unique par utilisateur). */
  canonical_url: string;
  platform: Platform;
  title: string | null;
  thumbnail_url: string | null;
  creator: string | null;
  status: VideoStatus;
  is_favorite: boolean;
  note: string | null;
  added_at: string;
  opened_at: string | null;
  viewed_at: string | null;
  /** Jointure video_collections, dénormalisée côté client. */
  collection_ids: string[];
}

export type VideoPatch = Partial<
  Pick<
    Video,
    | "title"
    | "thumbnail_url"
    | "creator"
    | "status"
    | "is_favorite"
    | "note"
    | "opened_at"
    | "viewed_at"
  >
>;

export const COLLECTION_COLORS = [
  "gray",
  "red",
  "orange",
  "amber",
  "green",
  "teal",
  "blue",
  "violet",
  "pink",
] as const;
export type CollectionColor = (typeof COLLECTION_COLORS)[number];

export interface Collection {
  id: string;
  user_id: string;
  name: string;
  color: CollectionColor;
  created_at: string;
}

export type CollectionPatch = Partial<Pick<Collection, "name" | "color">>;
