import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import {
  COLLECTION_COLORS,
  PLATFORMS,
  type Collection,
  type CollectionColor,
  type CollectionPatch,
  type Platform,
  type Video,
  type VideoPatch,
  type VideoStatus,
} from "@/types";
import type { LibraryRepository, LibrarySnapshot } from "./repository";
import { readSnapshot, writeSnapshot, clearSnapshot } from "./snapshot-cache";

/** PostgREST plafonne les réponses : on pagine pour ne jamais tronquer la bibliothèque. */
const PAGE_SIZE = 1000;

interface VideoRow {
  id: string;
  user_id: string;
  url: string;
  canonical_url: string;
  platform: string;
  title: string | null;
  thumbnail_url: string | null;
  creator: string | null;
  status: string;
  is_favorite: boolean;
  note: string | null;
  added_at: string;
  opened_at: string | null;
  viewed_at: string | null;
  video_collections?: { collection_id: string }[] | null;
}

interface CollectionRow {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
}

/** Postgres renvoie « 2026-11-25T10:00:00.123+00:00 » : on revient à l'ISO JS pour trier par chaîne. */
function iso(value: string): string;
function iso(value: string | null): string | null;
function iso(value: string | null): string | null {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isNaN(time) ? value : new Date(time).toISOString();
}

function toVideo(row: VideoRow): Video {
  return {
    id: row.id,
    user_id: row.user_id,
    url: row.url,
    canonical_url: row.canonical_url,
    platform: (PLATFORMS as readonly string[]).includes(row.platform)
      ? (row.platform as Platform)
      : "other",
    title: row.title,
    thumbnail_url: row.thumbnail_url,
    creator: row.creator,
    status: (["pending", "viewed", "archived"].includes(row.status)
      ? row.status
      : "pending") as VideoStatus,
    is_favorite: row.is_favorite,
    note: row.note,
    added_at: iso(row.added_at),
    opened_at: iso(row.opened_at),
    viewed_at: iso(row.viewed_at),
    collection_ids: (row.video_collections ?? []).map((vc) => vc.collection_id),
  };
}

function toCollection(row: CollectionRow): Collection {
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    color: (COLLECTION_COLORS as readonly string[]).includes(row.color)
      ? (row.color as CollectionColor)
      : "gray",
    created_at: iso(row.created_at),
  };
}

function videoRow(video: Video) {
  // collection_ids vit dans video_collections, pas dans la table videos.
  const { collection_ids: _ignored, ...row } = video;
  void _ignored;
  return row;
}

function isNetworkError(error: { message?: string } | null | undefined): boolean {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  const message = error?.message ?? "";
  return /failed to fetch|networkerror|load failed|network request failed|fetch failed/i.test(message);
}

/** Convertit une erreur Supabase en code métier compris par le store. */
function fail(error: PostgrestError | Error, duplicateCode?: string): never {
  if (isNetworkError(error)) throw new Error("offline");
  const code = "code" in error ? error.code : undefined;
  if (code === "23505" && duplicateCode) throw new Error(duplicateCode);
  if (code === "PGRST301" || code === "42501") throw new Error("not_signed_in");
  throw new Error(error.message || "unknown_error");
}

export class SupabaseRepository implements LibraryRepository {
  readonly kind = "supabase" as const;

  constructor(
    private readonly supabase: SupabaseClient,
    private readonly userId: string,
  ) {}

  async load(): Promise<LibrarySnapshot> {
    // Hors ligne avéré : le cache tout de suite, sans attendre les nouvelles
    // tentatives automatiques de Supabase (environ 7 s au total).
    if (typeof navigator !== "undefined" && navigator.onLine === false) return this.fromCache();
    try {
      const [videos, collections] = await Promise.all([this.fetchVideos(), this.fetchCollections()]);
      const snapshot = { videos, collections };
      writeSnapshot(this.userId, snapshot);
      return snapshot;
    } catch (error) {
      if (error instanceof Error && error.message === "offline") return this.fromCache();
      throw error;
    }
  }

  private fromCache(): LibrarySnapshot {
    const cached = readSnapshot(this.userId);
    if (!cached) throw new Error("offline");
    return { videos: cached.videos, collections: cached.collections, stale: true };
  }

  private async fetchVideos(): Promise<Video[]> {
    const rows: VideoRow[] = [];
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error } = await this.supabase
        .from("videos")
        .select("*, video_collections(collection_id)")
        .order("added_at", { ascending: false })
        .order("id", { ascending: true })
        .range(from, from + PAGE_SIZE - 1);
      if (error) fail(error);
      rows.push(...((data ?? []) as VideoRow[]));
      if (!data || data.length < PAGE_SIZE) break;
    }
    return rows.map(toVideo);
  }

  private async fetchCollections(): Promise<Collection[]> {
    const { data, error } = await this.supabase
      .from("collections")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) fail(error);
    return ((data ?? []) as CollectionRow[]).map(toCollection);
  }

  async insertVideo(video: Video): Promise<void> {
    const { error } = await this.supabase.from("videos").insert(videoRow(video));
    if (error) fail(error, "duplicate_video");
    if (video.collection_ids.length) {
      await this.setVideoCollections(video.id, video.collection_ids);
    }
  }

  async updateVideo(id: string, patch: VideoPatch): Promise<void> {
    const { error } = await this.supabase.from("videos").update(patch).eq("id", id);
    if (error) fail(error);
  }

  async deleteVideo(id: string): Promise<void> {
    const { error } = await this.supabase.from("videos").delete().eq("id", id);
    if (error) fail(error);
  }

  async setVideoCollections(videoId: string, collectionIds: string[]): Promise<void> {
    const { error } = await this.supabase.rpc("set_video_collections", {
      p_video_id: videoId,
      p_collection_ids: collectionIds,
    });
    if (error) fail(error);
  }

  async insertCollection(collection: Collection): Promise<void> {
    const { error } = await this.supabase.from("collections").insert(collection);
    if (error) fail(error, "duplicate_collection");
  }

  async updateCollection(id: string, patch: CollectionPatch): Promise<void> {
    const { error } = await this.supabase.from("collections").update(patch).eq("id", id);
    if (error) fail(error, "duplicate_collection");
  }

  async deleteCollection(id: string): Promise<void> {
    const { error } = await this.supabase.from("collections").delete().eq("id", id);
    if (error) fail(error);
  }

  async clear(): Promise<void> {
    // La RLS limite la suppression aux lignes de l'utilisateur ; le filtre est exigé par PostgREST.
    const videos = await this.supabase.from("videos").delete().eq("user_id", this.userId);
    if (videos.error) fail(videos.error);
    const collections = await this.supabase.from("collections").delete().eq("user_id", this.userId);
    if (collections.error) fail(collections.error);
    clearSnapshot(this.userId);
  }

  saveSnapshot(snapshot: LibrarySnapshot): void {
    writeSnapshot(this.userId, snapshot);
  }
}
