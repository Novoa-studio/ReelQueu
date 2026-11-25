"use client";

import { useEffect } from "react";
import { useLibrary } from "@/lib/store/library";
import { useUI } from "@/lib/store/ui";
import { AddVideoSheet } from "@/components/videos/add-video-sheet";
import { NoteSheet } from "@/components/videos/note-sheet";
import { CollectionsSheet } from "@/components/videos/collections-sheet";
import { CollectionFormSheet } from "@/components/collections/collection-form-sheet";

/**
 * Monté une seule fois dans le layout (qui n'est jamais masqué par Activity) :
 * charge les données, restaure les préférences et héberge toutes les feuilles.
 * Une seule instance par feuille plutôt qu'une par carte : la liste reste
 * légère même avec des centaines de vidéos.
 */
export function ShellRuntime() {
  const load = useLibrary((s) => s.load);
  const closeSheet = useUI((s) => s.closeSheet);

  useEffect(() => {
    void useUI.persist.rehydrate();
    void load();
  }, [load]);

  // Retour arrière du navigateur (Android, desktop) : on ferme la feuille ouverte.
  useEffect(() => {
    window.addEventListener("popstate", closeSheet);
    return () => window.removeEventListener("popstate", closeSheet);
  }, [closeSheet]);

  return (
    <>
      <AddVideoSheet />
      <NoteSheet />
      <CollectionsSheet />
      <CollectionFormSheet />
    </>
  );
}
