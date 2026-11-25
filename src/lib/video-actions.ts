"use client";

import { toast } from "sonner";
import type { Video } from "@/types";
import { useLibrary } from "@/lib/store/library";

/**
 * Actions métier déclenchées depuis l'interface. Chacune fournit un retour
 * visuel et, quand c'est pertinent, la possibilité d'annuler.
 */

const store = () => useLibrary.getState();

export async function markViewed(video: Video) {
  const ok = await store().updateVideo(video.id, {
    status: "viewed",
    viewed_at: new Date().toISOString(),
  });
  if (!ok) return;
  toast("Marquée comme vue", {
    description: "Elle est maintenant dans la Bibliothèque.",
    action: {
      label: "Annuler",
      onClick: () =>
        void store().updateVideo(video.id, { status: video.status, viewed_at: video.viewed_at }),
    },
  });
}

export async function markPending(video: Video) {
  const ok = await store().updateVideo(video.id, { status: "pending", viewed_at: null });
  if (!ok) return;
  toast("Remise dans « À regarder »", {
    action: {
      label: "Annuler",
      onClick: () =>
        void store().updateVideo(video.id, { status: video.status, viewed_at: video.viewed_at }),
    },
  });
}

export async function toggleFavorite(video: Video) {
  const next = !video.is_favorite;
  const ok = await store().updateVideo(video.id, { is_favorite: next });
  if (ok) toast(next ? "Ajoutée aux favoris" : "Retirée des favoris");
}

export async function deleteVideo(video: Video) {
  const removed = await store().deleteVideo(video.id);
  if (!removed) return;
  toast("Vidéo supprimée", {
    action: { label: "Annuler", onClick: () => void store().insertVideo(removed) },
  });
}

export async function saveNote(video: Video, note: string) {
  const value = note.trim() || null;
  if (value === video.note) return true;
  const ok = await store().updateVideo(video.id, { note: value });
  if (ok) toast(value ? "Note enregistrée" : "Note supprimée");
  return ok;
}

/**
 * Appelée au clic sur un lien d'ouverture (le navigateur suit le lien lui-même).
 * La détection du retour dans l'app et le passage en « Vue » arrivent en phase 4.
 */
export function recordOpen(video: Video) {
  void store().updateVideo(video.id, { opened_at: new Date().toISOString() });
}

export async function copyLink(video: Video) {
  try {
    await navigator.clipboard.writeText(video.url);
    toast("Lien copié");
  } catch {
    toast.error("Impossible de copier le lien", { description: video.url });
  }
}
