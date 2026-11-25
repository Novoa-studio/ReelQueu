import type { LibrarySnapshot } from "./repository";

/**
 * Copie locale de la bibliothèque, par utilisateur, pour afficher les vidéos
 * sans réseau. Purement un cache : la source de vérité reste Supabase.
 */

const key = (userId: string) => `reelqueue:cache:v1:${userId}`;

interface CachedSnapshot {
  savedAt: string;
  videos: LibrarySnapshot["videos"];
  collections: LibrarySnapshot["collections"];
}

export function readSnapshot(userId: string): (LibrarySnapshot & { savedAt: string }) | null {
  try {
    const raw = window.localStorage.getItem(key(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CachedSnapshot>;
    if (!Array.isArray(parsed.videos) || !Array.isArray(parsed.collections)) return null;
    return {
      videos: parsed.videos,
      collections: parsed.collections,
      savedAt: parsed.savedAt ?? "",
    };
  } catch {
    return null;
  }
}

export function writeSnapshot(userId: string, snapshot: LibrarySnapshot) {
  try {
    const doc: CachedSnapshot = {
      savedAt: new Date().toISOString(),
      videos: snapshot.videos,
      collections: snapshot.collections,
    };
    window.localStorage.setItem(key(userId), JSON.stringify(doc));
  } catch {
    // Cache facultatif : un stockage plein ou désactivé n'empêche rien.
  }
}

export function clearSnapshot(userId: string) {
  try {
    window.localStorage.removeItem(key(userId));
  } catch {
    /* ignore */
  }
}
