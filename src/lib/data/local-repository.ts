import type { Collection, CollectionPatch, Video, VideoPatch } from "@/types";
import type { LibraryRepository, LibrarySnapshot } from "./repository";
import { createSeedSnapshot } from "./seed";

const STORAGE_KEY = "reelqueue:library:v1";

interface StoredDocument {
  version: 1;
  demo: boolean;
  videos: Video[];
  collections: Collection[];
}

function isStoredDocument(value: unknown): value is StoredDocument {
  if (!value || typeof value !== "object") return false;
  const doc = value as Partial<StoredDocument>;
  return doc.version === 1 && Array.isArray(doc.videos) && Array.isArray(doc.collections);
}

/**
 * Persistance locale (phase 1). Tout le document est réécrit à chaque
 * mutation : quelques centaines de vidéos représentent quelques centaines de Ko.
 */
export class LocalRepository implements LibraryRepository {
  readonly kind = "local" as const;
  private doc: StoredDocument | null = null;

  async load(): Promise<LibrarySnapshot> {
    const doc = this.read();
    return { videos: doc.videos, collections: doc.collections, demo: doc.demo };
  }

  async insertVideo(video: Video): Promise<void> {
    this.mutate((doc) => {
      if (doc.videos.some((v) => v.id === video.id || v.canonical_url === video.canonical_url)) {
        throw new Error("duplicate_video");
      }
      doc.videos = [video, ...doc.videos];
    });
  }

  async updateVideo(id: string, patch: VideoPatch): Promise<void> {
    this.mutate((doc) => {
      doc.videos = doc.videos.map((v) => (v.id === id ? { ...v, ...patch } : v));
    });
  }

  async deleteVideo(id: string): Promise<void> {
    this.mutate((doc) => {
      doc.videos = doc.videos.filter((v) => v.id !== id);
    });
  }

  async setVideoCollections(videoId: string, collectionIds: string[]): Promise<void> {
    this.mutate((doc) => {
      doc.videos = doc.videos.map((v) =>
        v.id === videoId ? { ...v, collection_ids: [...collectionIds] } : v,
      );
    });
  }

  async insertCollection(collection: Collection): Promise<void> {
    this.mutate((doc) => {
      doc.collections = [...doc.collections, collection];
    });
  }

  async updateCollection(id: string, patch: CollectionPatch): Promise<void> {
    this.mutate((doc) => {
      doc.collections = doc.collections.map((c) => (c.id === id ? { ...c, ...patch } : c));
    });
  }

  async deleteCollection(id: string): Promise<void> {
    this.mutate((doc) => {
      doc.collections = doc.collections.filter((c) => c.id !== id);
      doc.videos = doc.videos.map((v) =>
        v.collection_ids.includes(id)
          ? { ...v, collection_ids: v.collection_ids.filter((cid) => cid !== id) }
          : v,
      );
    });
  }

  async clear(): Promise<void> {
    this.mutate((doc) => {
      doc.videos = [];
      doc.collections = [];
      doc.demo = false;
    });
  }

  private read(): StoredDocument {
    if (this.doc) return this.doc;
    let raw: string | null = null;
    try {
      raw = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      // Stockage indisponible (navigation privée stricte) : on travaille en mémoire.
    }

    if (raw) {
      try {
        const parsed: unknown = JSON.parse(raw);
        if (isStoredDocument(parsed)) {
          this.doc = parsed;
          return parsed;
        }
      } catch {
        // Document illisible : on le met de côté plutôt que de l'écraser.
      }
      try {
        window.localStorage.setItem(`${STORAGE_KEY}:corrupt:${Date.now()}`, raw);
      } catch {
        /* ignore */
      }
    }

    const seed = createSeedSnapshot();
    this.doc = { version: 1, demo: true, videos: seed.videos, collections: seed.collections };
    this.write(this.doc);
    return this.doc;
  }

  private mutate(change: (doc: StoredDocument) => void) {
    const current = this.read();
    const next: StoredDocument = { ...current };
    change(next);
    this.write(next);
    this.doc = next;
  }

  private write(doc: StoredDocument) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(doc));
    } catch (error) {
      if (error instanceof DOMException && error.name === "QuotaExceededError") {
        throw new Error("storage_full");
      }
      // Stockage désactivé : l'état reste valable pour la session en cours.
    }
  }
}
