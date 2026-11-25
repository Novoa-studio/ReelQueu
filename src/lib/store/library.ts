"use client";

import { create } from "zustand";
import { toast } from "sonner";
import type { Collection, CollectionColor, CollectionPatch, Video, VideoPatch } from "@/types";
import { createRepository, type LibraryRepository } from "@/lib/data";
import type { ParsedVideoUrl } from "@/lib/platforms";
import { createId } from "@/lib/ids";
import { normalizeText } from "@/lib/videos";
import { COLLECTION_NAME_MAX } from "@/lib/collections";

export type LoadStatus = "idle" | "loading" | "ready" | "error";

interface LibraryState {
  status: LoadStatus;
  userId: string | null;
  videos: Video[];
  collections: Collection[];
  /** Données de démonstration locales (mode sans Supabase). */
  demo: boolean;
  /** Données issues du cache faute de réseau. */
  stale: boolean;
  lastLoadedAt: number;
  /** Démarre (ou redémarre) la bibliothèque pour un utilisateur. */
  start: (userId: string) => Promise<void>;
  /** Nouvel essai après une erreur de chargement. */
  reload: () => Promise<void>;
  /** Rechargement silencieux (retour dans l'app, retour du réseau). */
  refresh: () => Promise<void>;
  reset: () => void;
  addVideo: (parsed: ParsedVideoUrl) => Promise<Video | null>;
  insertVideo: (video: Video) => Promise<boolean>;
  updateVideo: (id: string, patch: VideoPatch) => Promise<boolean>;
  /** Renvoie la vidéo supprimée (pour « Annuler »), ou null en cas d'échec. */
  deleteVideo: (id: string) => Promise<Video | null>;
  setVideoCollections: (videoId: string, collectionIds: string[]) => Promise<boolean>;
  createCollection: (name: string, color: CollectionColor) => Promise<Collection | null>;
  updateCollection: (id: string, patch: CollectionPatch) => Promise<boolean>;
  deleteCollection: (id: string) => Promise<boolean>;
  clearAll: () => Promise<boolean>;
}

const EMPTY = {
  status: "idle" as LoadStatus,
  userId: null,
  videos: [] as Video[],
  collections: [] as Collection[],
  demo: false,
  stale: false,
  lastLoadedAt: 0,
};

function errorDescription(error: unknown): string | undefined {
  const code = error instanceof Error ? error.message : "";
  switch (code) {
    case "offline":
      return "Pas de connexion internet. Réessayez une fois en ligne.";
    case "storage_full":
      return "Le stockage de l’appareil est plein.";
    case "duplicate_video":
      return "Cette vidéo est déjà enregistrée.";
    case "duplicate_collection":
      return "Une collection porte déjà ce nom.";
    case "not_signed_in":
      return "Session expirée. Reconnectez-vous.";
    default:
      return undefined;
  }
}

// État hors React : le dépôt actif et les compteurs de concurrence.
let repository: LibraryRepository | null = null;
let pendingMutations = 0;
/** Incrémenté à chaque mutation : un rechargement lancé avant est ignoré à son retour. */
let mutationVersion = 0;
let cacheTimer: ReturnType<typeof setTimeout> | null = null;

export const useLibrary = create<LibraryState>()((set, get) => {
  function scheduleCacheSave() {
    if (!repository?.saveSnapshot) return;
    if (cacheTimer) clearTimeout(cacheTimer);
    cacheTimer = setTimeout(() => {
      const { videos, collections } = get();
      repository?.saveSnapshot?.({ videos, collections });
    }, 400);
  }

  /**
   * Applique un changement de façon optimiste, le persiste, et restaure
   * l'état précédent si la persistance échoue.
   */
  async function commit(
    apply: (state: LibraryState) => Partial<LibraryState>,
    persist: (repo: LibraryRepository) => Promise<void>,
    failureMessage: string,
  ): Promise<boolean> {
    const repo = repository;
    if (!repo) return false;
    const before = { videos: get().videos, collections: get().collections, demo: get().demo };
    mutationVersion += 1;
    pendingMutations += 1;
    set(apply(get()));
    try {
      await persist(repo);
      scheduleCacheSave();
      return true;
    } catch (error) {
      if (repo === repository) set(before);
      toast.error(failureMessage, { description: errorDescription(error) });
      return false;
    } finally {
      pendingMutations -= 1;
    }
  }

  async function fetchInto(silent: boolean) {
    const repo = repository;
    if (!repo) return;
    const version = mutationVersion;
    if (!silent) set({ status: "loading" });
    try {
      const snapshot = await repo.load();
      // Résultat obsolète : utilisateur changé ou mutation survenue entre-temps.
      if (repo !== repository || (silent && version !== mutationVersion)) return;
      set({
        status: "ready",
        videos: snapshot.videos,
        collections: snapshot.collections,
        demo: snapshot.demo ?? false,
        stale: snapshot.stale ?? false,
        lastLoadedAt: Date.now(),
      });
    } catch {
      if (repo !== repository) return;
      if (!silent) set({ status: "error" });
    }
  }

  function nameTaken(name: string, exceptId?: string) {
    const key = normalizeText(name);
    return get().collections.some((c) => c.id !== exceptId && normalizeText(c.name) === key);
  }

  return {
    ...EMPTY,

    async start(userId) {
      if (get().userId === userId && repository) return;
      repository = createRepository(userId);
      set({ ...EMPTY, userId });
      await fetchInto(false);
    },

    reload: () => fetchInto(false),

    async refresh() {
      if (get().status !== "ready" || pendingMutations > 0) return;
      await fetchInto(true);
    },

    reset() {
      repository = null;
      set({ ...EMPTY });
    },

    async addVideo(parsed) {
      const { userId } = get();
      if (!userId) return null;
      const video: Video = {
        id: createId(),
        user_id: userId,
        url: parsed.url,
        canonical_url: parsed.canonicalUrl,
        platform: parsed.platform,
        title: null,
        thumbnail_url: parsed.thumbnailUrl,
        creator: parsed.creator,
        status: "pending",
        is_favorite: false,
        note: null,
        added_at: new Date().toISOString(),
        opened_at: null,
        viewed_at: null,
        collection_ids: [],
      };
      return (await get().insertVideo(video)) ? video : null;
    },

    insertVideo(video) {
      if (get().videos.some((v) => v.canonical_url === video.canonical_url)) {
        toast.error("Cette vidéo est déjà enregistrée.");
        return Promise.resolve(false);
      }
      return commit(
        (s) => ({ videos: [video, ...s.videos] }),
        (repo) => repo.insertVideo(video),
        "Impossible d’ajouter la vidéo",
      );
    },

    updateVideo(id, patch) {
      return commit(
        (s) => ({ videos: s.videos.map((v) => (v.id === id ? { ...v, ...patch } : v)) }),
        (repo) => repo.updateVideo(id, patch),
        "Modification non enregistrée",
      );
    },

    async deleteVideo(id) {
      const video = get().videos.find((v) => v.id === id);
      if (!video) return null;
      const ok = await commit(
        (s) => ({ videos: s.videos.filter((v) => v.id !== id) }),
        (repo) => repo.deleteVideo(id),
        "Suppression impossible",
      );
      return ok ? video : null;
    },

    setVideoCollections(videoId, collectionIds) {
      const ids = [...new Set(collectionIds)];
      return commit(
        (s) => ({
          videos: s.videos.map((v) => (v.id === videoId ? { ...v, collection_ids: ids } : v)),
        }),
        (repo) => repo.setVideoCollections(videoId, ids),
        "Classement non enregistré",
      );
    },

    async createCollection(rawName, color) {
      const { userId } = get();
      const name = rawName.trim().slice(0, COLLECTION_NAME_MAX);
      if (!name || !userId) return null;
      if (nameTaken(name)) {
        toast.error("Une collection porte déjà ce nom.");
        return null;
      }
      const collection: Collection = {
        id: createId(),
        user_id: userId,
        name,
        color,
        created_at: new Date().toISOString(),
      };
      const ok = await commit(
        (s) => ({ collections: [...s.collections, collection] }),
        (repo) => repo.insertCollection(collection),
        "Impossible de créer la collection",
      );
      return ok ? collection : null;
    },

    updateCollection(id, patch) {
      const next: CollectionPatch = { ...patch };
      if (next.name !== undefined) {
        next.name = next.name.trim().slice(0, COLLECTION_NAME_MAX);
        if (!next.name) return Promise.resolve(false);
        if (nameTaken(next.name, id)) {
          toast.error("Une collection porte déjà ce nom.");
          return Promise.resolve(false);
        }
      }
      return commit(
        (s) => ({
          collections: s.collections.map((c) => (c.id === id ? { ...c, ...next } : c)),
        }),
        (repo) => repo.updateCollection(id, next),
        "Modification non enregistrée",
      );
    },

    deleteCollection(id) {
      return commit(
        (s) => ({
          collections: s.collections.filter((c) => c.id !== id),
          videos: s.videos.map((v) =>
            v.collection_ids.includes(id)
              ? { ...v, collection_ids: v.collection_ids.filter((cid) => cid !== id) }
              : v,
          ),
        }),
        (repo) => repo.deleteCollection(id),
        "Suppression impossible",
      );
    },

    clearAll() {
      return commit(
        () => ({ videos: [], collections: [], demo: false }),
        (repo) => repo.clear(),
        "Impossible d’effacer les données",
      );
    },
  };
});

export function useVideo(id: string | null | undefined): Video | undefined {
  return useLibrary((s) => (id ? s.videos.find((v) => v.id === id) : undefined));
}

export function useCollection(id: string | null | undefined): Collection | undefined {
  return useLibrary((s) => (id ? s.collections.find((c) => c.id === id) : undefined));
}
