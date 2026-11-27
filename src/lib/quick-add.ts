"use client";

import { toast } from "sonner";
import { parseVideoUrl } from "@/lib/platforms";
import { useLibrary } from "@/lib/store/library";
import { useUI } from "@/lib/store/ui";
import { describeVideo, findDuplicate } from "@/lib/videos";
import { enrichVideo } from "@/lib/enrichment";
import { markPending } from "@/lib/video-actions";

/**
 * Bouton « + » : ajout en un geste depuis le presse-papiers.
 *
 * - Lien de vidéo reconnu (Reel, publication, vidéo) : ajouté directement,
 *   avec « Annuler ».
 * - Autre lien : la feuille d'ajout s'ouvre pré-remplie, pour confirmer.
 * - Presse-papiers vide, refusé ou sans lien : la feuille s'ouvre normalement.
 *
 * Doit être appelée directement dans le gestionnaire de clic : la lecture du
 * presse-papiers exige un geste de l'utilisateur (sur iPhone, iOS affiche sa
 * bulle « Coller »).
 */
export async function quickAdd(): Promise<void> {
  const openSheet = useUI.getState().openSheet;

  let text = "";
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.readText) {
      text = await navigator.clipboard.readText();
    }
  } catch {
    // Accès refusé ou bulle « Coller » ignorée : saisie manuelle.
  }

  const parsed = text.trim() ? parseVideoUrl(text) : null;
  if (!parsed?.ok) {
    openSheet({ type: "add" });
    return;
  }

  const link = parsed.value;
  // Lien générique (article, site quelconque) : on demande confirmation.
  if (link.platform === "other" || link.kind === "link") {
    openSheet({ type: "add", initialUrl: link.url });
    return;
  }

  const library = useLibrary.getState();
  const duplicate = findDuplicate(library.videos, link.canonicalUrl);
  if (duplicate) {
    if (duplicate.status === "pending") {
      toast("Déjà dans « À regarder »", { description: describeVideo(duplicate).title });
    } else {
      await markPending(duplicate);
    }
    return;
  }

  const video = await library.addVideo(link);
  if (!video) return;
  toast("Ajoutée depuis le presse-papiers", {
    description: describeVideo(video).title,
    action: {
      label: "Annuler",
      onClick: () => void useLibrary.getState().deleteVideo(video.id),
    },
  });
  void enrichVideo(video);
}
