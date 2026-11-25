import type { Collection, CollectionPatch, Video, VideoPatch } from "@/types";

export interface LibrarySnapshot {
  videos: Video[];
  collections: Collection[];
  /** Vrai tant que les données de démonstration n'ont pas été effacées (dépôt local). */
  demo?: boolean;
  /** Vrai si les données viennent du cache local faute de réseau. */
  stale?: boolean;
}

/**
 * Contrat de persistance. Le store applique les changements de façon
 * optimiste puis délègue ici ; en cas d'échec il restaure l'état précédent.
 *
 * - LocalRepository    : localStorage (mode sans Supabase, données de démo)
 * - SupabaseRepository : Postgres + RLS, cache local pour le hors-ligne
 *
 * Erreurs normalisées (Error.message) : "offline", "duplicate_video",
 * "duplicate_collection", "storage_full", "not_signed_in".
 */
export interface LibraryRepository {
  readonly kind: "local" | "supabase";
  load(): Promise<LibrarySnapshot>;
  /** Insère la vidéo et ses liens video_collections (sert aussi à « Annuler » une suppression). */
  insertVideo(video: Video): Promise<void>;
  updateVideo(id: string, patch: VideoPatch): Promise<void>;
  deleteVideo(id: string): Promise<void>;
  setVideoCollections(videoId: string, collectionIds: string[]): Promise<void>;
  insertCollection(collection: Collection): Promise<void>;
  updateCollection(id: string, patch: CollectionPatch): Promise<void>;
  /** Supprime la collection et ses liens ; les vidéos sont conservées. */
  deleteCollection(id: string): Promise<void>;
  /** Vide toutes les données de l'utilisateur. */
  clear(): Promise<void>;
  /** Met à jour le cache hors-ligne après des changements réussis (facultatif). */
  saveSnapshot?(snapshot: LibrarySnapshot): void;
}
