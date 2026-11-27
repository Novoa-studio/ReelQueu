"use client";

import { create } from "zustand";
import type { Video } from "@/types";
import { safeParseVideoUrl } from "@/lib/platforms";
import { requestMetadata } from "@/lib/metadata/client";
import { useLibrary } from "@/lib/store/library";

/**
 * Complète titre, auteur et miniature des vidéos à partir de leurs
 * informations publiques (voir /api/metadata).
 */

const ATTEMPTS_KEY = "reelqueue:metadata-attempts:v1";
/** Délai avant de retenter une vidéo dont les informations étaient indisponibles. */
const RETRY_AFTER_MS = 3 * 24 * 3600 * 1000;
/** Vidéos complétées en arrière-plan par session : on reste discret. */
const BACKFILL_LIMIT = 12;

/** Vidéos en cours de récupération (pour l'affichage). */
export const useEnrichment = create<{ pending: Record<string, true> }>(() => ({ pending: {} }));

function setPending(id: string, value: boolean) {
  useEnrichment.setState((s) => {
    const pending = { ...s.pending };
    if (value) pending[id] = true;
    else delete pending[id];
    return { pending };
  });
}

function readAttempts(): Record<string, number> {
  try {
    return JSON.parse(window.localStorage.getItem(ATTEMPTS_KEY) ?? "{}") as Record<string, number>;
  } catch {
    return {};
  }
}

function recordAttempt(id: string) {
  try {
    const attempts = readAttempts();
    attempts[id] = Date.now();
    // On ne garde que les 500 tentatives les plus récentes.
    const entries = Object.entries(attempts).sort((a, b) => b[1] - a[1]).slice(0, 500);
    window.localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    /* stockage indisponible : sans conséquence */
  }
}

export function supportsMetadata(video: Video): boolean {
  const parsed = safeParseVideoUrl(video.url);
  if (!parsed) return false;
  if (parsed.platform === "tiktok") return true;
  return ["instagram", "youtube", "vimeo"].includes(parsed.platform) && Boolean(parsed.externalId);
}

function needsMetadata(video: Video): boolean {
  return supportsMetadata(video) && (!video.title || !video.creator || !video.thumbnail_url);
}

export async function enrichVideo(video: Video): Promise<void> {
  if (!needsMetadata(video)) return;
  setPending(video.id, true);
  recordAttempt(video.id);
  try {
    const metadata = await requestMetadata(video.url);
    if (metadata) await useLibrary.getState().applyMetadata(video.id, metadata);
  } finally {
    setPending(video.id, false);
  }
}

let backfillRunning = false;

/** Rattrapage discret des vidéos enregistrées sans informations (les plus récentes d'abord). */
export async function backfillMetadata(): Promise<void> {
  if (backfillRunning) return;
  const { videos, demo } = useLibrary.getState();
  // Données de démonstration : identifiants fictifs, rien à récupérer.
  if (demo) return;
  const attempts = readAttempts();
  const now = Date.now();
  const queue = [...videos]
    .filter((v) => needsMetadata(v) && now - (attempts[v.id] ?? 0) > RETRY_AFTER_MS)
    .sort((a, b) => b.added_at.localeCompare(a.added_at))
    .slice(0, BACKFILL_LIMIT);
  if (!queue.length) return;
  backfillRunning = true;
  try {
    for (const video of queue) {
      const current = useLibrary.getState().videos.find((v) => v.id === video.id);
      if (current) await enrichVideo(current);
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  } finally {
    backfillRunning = false;
  }
}
