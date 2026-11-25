"use client";

import { create } from "zustand";
import { toast } from "sonner";
import type { Collection, CollectionColor, CollectionPatch, Video, VideoPatch } from "@/types";
import type { LibraryRepository } from "@/lib/data/repository";
import { LocalRepository } from "@/lib/data/local-repository";
import { LOCAL_USER } from "@/lib/data/seed";
import { createId } from "@/lib/ids";
import { normalizeText } from "@/lib/videos";
import { COLLECTION_NAME_MAX } from "@/lib/collections";

export type LoadStatus = "idle" | "loading" | "ready" | "error";

interface LibraryState {
  status: LoadStatus;
  videos: Video[];
  collections: Collection[];
  demo: boolean;
  load: () => Promise<void>;
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

const repository: LibraryRepository = new LocalRepository();

function errorDescription(error: unknown): string | undefined {
  const code = error instanceof Error ? error.message : "";
  switch (code) {
    case "storage_full":
      return "Le stockage de l’appareil est plein.";
    case "duplicate_video":
      return "Cette vidéo est déjà enregistrée.";
    default:
      return undefined;
  }
}

export const useLibrary = create<LibraryState>()((set, get) => {
  /**
   * Applique un changement de façon optimiste, le persiste, et restaure
   * l'état précédent si la persistance échoue.
   */
  async function commit(
    apply: (state: LibraryState) => Partial<LibraryState>,
    persist: () => Promise<void>,
    failureMessage: string,
  ): Promise<boolean> {
    const before = { videos: get().videos, collections: get().collections, demo: get().demo };
    set(apply(get()));
    try {
      await persist();
      return true;
    } catch (error) {
      set(before);
      toast.error(failureMessage, { description: errorDescription(error) });
      return false;
    }
  }

  function nameTaken(name: string, exceptId?: string) {
    const key = normalizeText(name);
    return get().collections.some((c) => c.id !== exceptId && normalizeText(c.name) === key);
  }

  return {
    status: "idle",
    videos: [],
    collections: [],
    demo: false,

    async load() {
      const { status } = get();
      if (status === "loading" || status === "ready") return;
      set({ status: "loading" });
      try {
        const snapshot = await repository.load();
        set({
          status: "ready",
          videos: snapshot.videos,
          collections: snapshot.collections,
          demo: snapshot.demo ?? false,
        });
      } catch {
        set({ status: "error" });
      }
    },

    insertVideo(video) {
      if (get().videos.some((v) => v.canonical_url === video.canonical_url)) {
        toast.error("Cette vidéo est déjà enregistrée.");
        return Promise.resolve(false);
      }
      return commit(
        (s) => ({ videos: [video, ...s.videos] }),
        () => repository.insertVideo(video),
        "Impossible d’ajouter la vidéo",
      );
    },

    updateVideo(id, patch) {
      return commit(
        (s) => ({ videos: s.videos.map((v) => (v.id === id ? { ...v, ...patch } : v)) }),
        () => repository.updateVideo(id, patch),
        "Modification non enregistrée",
      );
    },

    async deleteVideo(id) {
      const video = get().videos.find((v) => v.id === id);
      if (!video) return null;
      const ok = await commit(
        (s) => ({ videos: s.videos.filter((v) => v.id !== id) }),
        () => repository.deleteVideo(id),
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
        () => repository.setVideoCollections(videoId, ids),
        "Classement non enregistré",
      );
    },

    async createCollection(rawName, color) {
      const name = rawName.trim().slice(0, COLLECTION_NAME_MAX);
      if (!name) return null;
      if (nameTaken(name)) {
        toast.error("Une collection porte déjà ce nom.");
        return null;
      }
      const collection: Collection = {
        id: createId(),
        user_id: LOCAL_USER,
        name,
        color,
        created_at: new Date().toISOString(),
      };
      const ok = await commit(
        (s) => ({ collections: [...s.collections, collection] }),
        () => repository.insertCollection(collection),
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
        () => repository.updateCollection(id, next),
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
        () => repository.deleteCollection(id),
        "Suppression impossible",
      );
    },

    clearAll() {
      return commit(
        () => ({ videos: [], collections: [], demo: false }),
        () => repository.clear(),
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
