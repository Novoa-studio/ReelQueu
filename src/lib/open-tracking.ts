"use client";

import { toast } from "sonner";
import type { Video } from "@/types";
import { useLibrary } from "@/lib/store/library";
import { describeVideo } from "@/lib/videos";
import { recordOpen } from "@/lib/video-actions";

/**
 * Passage automatique en « Vue » après ouverture d'un lien.
 *
 * 1. Au clic sur « Ouvrir » : on note la vidéo et l'heure (opened_at).
 * 2. L'utilisateur quitte ReelQueue (visibilitychange → hidden, ou blur).
 * 3. À son retour (visible, ou focus) : si l'absence a duré au moins
 *    MIN_AWAY_MS, la vidéo passe en « Vue », avec « Annuler ».
 *
 * Le retour ne prouve pas que la vidéo a été regardée jusqu'au bout : « Vue »
 * signifie « consultée ». Une absence trop courte est considérée comme une
 * ouverture accidentelle et la vidéo reste dans « À regarder ».
 *
 * Les ouvertures en attente sont gardées sur l'appareil : si iOS ferme
 * l'application pendant que l'utilisateur est sur Instagram, elles sont
 * appliquées au lancement suivant.
 */

/** Délai de sécurité : absence minimale pour valider une ouverture. */
export const MIN_AWAY_MS = 3000;
/** Au-delà, une ouverture en attente non résolue est abandonnée. */
const MAX_PENDING_AGE_MS = 12 * 3600 * 1000;
const STORAGE_KEY = "reelqueue:pending-opens:v1";

interface PendingOpen {
  videoId: string;
  openedAt: number;
  /** Heure à laquelle l'utilisateur a quitté l'app après l'ouverture. */
  leftAt?: number;
}

/** Début de ce chargement de page : sépare les ouvertures des sessions précédentes. */
const sessionStartedAt = Date.now();

function readPending(): PendingOpen[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]") as unknown;
    return Array.isArray(parsed)
      ? parsed.filter(
          (p): p is PendingOpen =>
            Boolean(p) && typeof p.videoId === "string" && typeof p.openedAt === "number",
        )
      : [];
  } catch {
    return [];
  }
}

function writePending(items: PendingOpen[]) {
  try {
    if (items.length) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* stockage indisponible : le suivi reste en mémoire pour cette session */
  }
}

// Copie mémoire, utile si le stockage local est indisponible.
let pendingInMemory: PendingOpen[] = [];
/** Heure à laquelle l'utilisateur a quitté l'app avec des ouvertures en attente. */
let leftAt: number | null = null;

function getPending(): PendingOpen[] {
  const stored = readPending();
  return stored.length ? stored : pendingInMemory;
}

function setPending(items: PendingOpen[]) {
  pendingInMemory = items;
  writePending(items);
}

/** À appeler au clic sur un lien d'ouverture (le navigateur suit le lien lui-même). */
export function trackOpen(video: Video) {
  recordOpen(video);
  if (video.status !== "pending") return;
  const others = getPending().filter((p) => p.videoId !== video.id);
  setPending([...others, { videoId: video.id, openedAt: Date.now() }]);
}

/** Passe en « Vue » les vidéos ouvertes, avec un seul toast « Annuler ». */
async function markOpenedAsViewed(ids: string[]) {
  const library = useLibrary.getState();
  const targets = ids
    .map((id) => library.videos.find((v) => v.id === id))
    .filter((v): v is Video => Boolean(v && v.status === "pending"));
  if (!targets.length) return;

  const viewedAt = new Date().toISOString();
  const results = await Promise.all(
    targets.map((v) => library.updateVideo(v.id, { status: "viewed", viewed_at: viewedAt })),
  );
  const done = targets.filter((_, i) => results[i]);
  if (!done.length) return;

  const undo = () => {
    for (const v of done) {
      void useLibrary.getState().updateVideo(v.id, { status: v.status, viewed_at: v.viewed_at });
    }
  };
  toast(done.length === 1 ? "Marquée comme vue" : `${done.length} vidéos marquées comme vues`, {
    description:
      done.length === 1
        ? `« ${describeVideo(done[0]).title} » est passée dans la Bibliothèque.`
        : "Elles sont passées dans la Bibliothèque.",
    action: { label: "Annuler", onClick: undo },
    duration: 6000,
  });
}

function onLeave() {
  if (leftAt !== null) return;
  const pending = getPending();
  if (!pending.length) return;
  leftAt = Date.now();
  // Mémorisé avec l'ouverture : si le système ferme l'app, on saura qu'elle a été quittée.
  setPending(pending.map((p) => (p.leftAt ? p : { ...p, leftAt: leftAt ?? Date.now() })));
}

function onReturn() {
  if (leftAt === null) return;
  const away = Date.now() - leftAt;
  leftAt = null;
  const pending = getPending();
  setPending([]);
  // Retour quasi immédiat : ouverture accidentelle, la vidéo reste à regarder.
  if (away < MIN_AWAY_MS || !pending.length) return;
  void markOpenedAsViewed(pending.map((p) => p.videoId));
}

/**
 * Ouvertures laissées en attente par une session précédente (application
 * fermée par le système pendant le visionnage). À appeler une fois la
 * bibliothèque chargée.
 */
export function resolveStaleOpens() {
  if (leftAt !== null) return;
  const now = Date.now();
  const pending = getPending();
  const previous = pending.filter((p) => p.openedAt < sessionStartedAt);
  if (!previous.length) return;
  // Seules les ouvertures suivies d'un vrai départ de l'app (assez long) comptent ;
  // les autres (lien ouvert sans quitter ReelQueue) sont abandonnées.
  const viewed = previous.filter(
    (p) =>
      p.leftAt !== undefined &&
      now - p.leftAt >= MIN_AWAY_MS &&
      now - p.openedAt <= MAX_PENDING_AGE_MS,
  );
  setPending(pending.filter((p) => p.openedAt >= sessionStartedAt));
  if (viewed.length) void markOpenedAsViewed(viewed.map((p) => p.videoId));
}

/** Branche les écouteurs de visibilité et de focus. Renvoie la fonction de nettoyage. */
export function initOpenTracking(): () => void {
  const onVisibility = () => {
    if (document.visibilityState === "hidden") onLeave();
    else onReturn();
  };
  const onPageHide = () => onLeave();
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("blur", onLeave);
  window.addEventListener("focus", onReturn);
  window.addEventListener("pagehide", onPageHide);
  return () => {
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("blur", onLeave);
    window.removeEventListener("focus", onReturn);
    window.removeEventListener("pagehide", onPageHide);
  };
}
