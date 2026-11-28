"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CloudOff } from "lucide-react";
import { useAuth } from "@/lib/store/auth";
import { useLibrary } from "@/lib/store/library";
import { useUI } from "@/lib/store/ui";
import { useOnline } from "@/hooks/use-online";
import { AddVideoSheet } from "@/components/videos/add-video-sheet";
import { NoteSheet } from "@/components/videos/note-sheet";
import { CollectionsSheet } from "@/components/videos/collections-sheet";
import { CollectionFormSheet } from "@/components/collections/collection-form-sheet";
import { AccountSheet } from "@/components/auth/account-sheet";
import { CinemaViewer } from "@/components/videos/cinema-viewer";
import { backfillMetadata } from "@/lib/enrichment";
import { initOpenTracking, resolveStaleOpens } from "@/lib/open-tracking";

/** Délai minimal entre deux rechargements au retour dans l'application. */
const REFRESH_AFTER_MS = 30_000;

/**
 * Monté une seule fois dans le layout (jamais masqué par Activity) :
 * garde d'accès, chargement des données, synchronisation au retour dans
 * l'app, et hébergement de toutes les feuilles (une instance chacune).
 */
export function ShellRuntime() {
  const router = useRouter();
  const authStatus = useAuth((s) => s.status);
  const userId = useAuth((s) => s.user?.id ?? null);
  const closeSheet = useUI((s) => s.closeSheet);

  useEffect(() => {
    void useUI.persist.rehydrate();
  }, []);

  useEffect(() => {
    if (authStatus === "signed-out") {
      useLibrary.getState().reset();
      router.replace("/login");
    } else if (authStatus === "signed-in" && userId) {
      void useLibrary.getState().start(userId);
    }
  }, [authStatus, userId, router]);

  // Passage automatique en « Vue » au retour dans l'app après ouverture d'un lien.
  useEffect(() => initOpenTracking(), []);

  const libraryStatus = useLibrary((s) => s.status);
  useEffect(() => {
    if (libraryStatus !== "ready") return;
    // Ouvertures restées en attente (app fermée par le système pendant le visionnage).
    resolveStaleOpens();
    // Vidéos enregistrées sans titre ni miniature : rattrapage discret.
    void backfillMetadata();
  }, [libraryStatus]);

  // Autre appareil, autre onglet : on resynchronise au retour et quand le réseau revient.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - useLibrary.getState().lastLoadedAt < REFRESH_AFTER_MS) return;
      void useLibrary.getState().refresh();
    };
    const onOnline = () => void useLibrary.getState().refresh();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  // Retour arrière du navigateur (Android, desktop) : on ferme la feuille ouverte.
  useEffect(() => {
    window.addEventListener("popstate", closeSheet);
    return () => window.removeEventListener("popstate", closeSheet);
  }, [closeSheet]);

  return (
    <>
      <ConnectionNotice />
      <AddVideoSheet />
      <NoteSheet />
      <CollectionsSheet />
      <CollectionFormSheet />
      <AccountSheet />
      <CinemaViewer />
    </>
  );
}

function ConnectionNotice() {
  const online = useOnline();
  const stale = useLibrary((s) => s.stale);
  if (online && !stale) return null;
  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+0.5rem)] z-50 flex justify-center md:left-60"
    >
      <span className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-3 py-1.5 text-xs font-medium text-background shadow-float animate-in fade-in-0 slide-in-from-top-2">
        <CloudOff className="size-3.5" />
        Hors ligne · vos vidéos enregistrées restent consultables
      </span>
    </div>
  );
}
