import type { Collection, CollectionPatch, Video, VideoPatch } from "@/types";

export interface LibrarySnapshot {
  videos: Video[];
  collections: Collection[];
  /** Vrai tant que les données de démonstration n'ont pas été effacées (dépôt local). */
  demo?: boolean;
}

/**
 * Contrat de persistance. Le store applique les changements de façon
 * optimiste puis délègue ici ; en cas d'échec il restaure l'état précédent.
 *
 * Phase 1 : LocalRepository (localStorage, données de démonstration).
 * Phase 2 : SupabaseRepository (même contrat, RLS côté serveur).
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
}
