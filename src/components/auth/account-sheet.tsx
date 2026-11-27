"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, CloudCheck, HardDrive, LogOut, Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResponsiveSheet } from "@/components/ui/responsive-sheet";
import { useAuth } from "@/lib/store/auth";
import { useLibrary } from "@/lib/store/library";
import { useSheetOpen, useUI } from "@/lib/store/ui";
import { clearSnapshot } from "@/lib/data/snapshot-cache";
import { pluralize } from "@/lib/videos";
import { cn } from "@/lib/utils";

export function AccountSheet() {
  const open = useSheetOpen("account");
  const closeSheet = useUI((s) => s.closeSheet);
  const mode = useAuth((s) => s.mode);
  const email = useAuth((s) => s.user?.email ?? null);
  const videoCount = useLibrary((s) => s.videos.length);
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    const userId = useLibrary.getState().userId;
    await useAuth.getState().signOut();
    if (userId) clearSnapshot(userId);
    // Rechargement complet : aucune donnée ne survit dans les pages gardées en mémoire.
    window.location.replace("/login");
  }

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={(next) => !next && closeSheet()}
      title="Compte"
      footer={
        mode === "supabase" ? (
          <Button
            variant="outline"
            size="lg"
            className="h-11 rounded-xl text-[15px] text-destructive hover:text-destructive"
            onClick={signOut}
            disabled={busy}
          >
            <LogOut /> Se déconnecter
          </Button>
        ) : undefined
      }
    >
      <div className="flex items-center gap-3 rounded-2xl bg-muted/70 p-3">
        <AccountAvatar email={email} className="size-11 text-base" />
        <div className="min-w-0">
          <p className="truncate font-medium">{email ?? "Mode local"}</p>
          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            {mode === "supabase" ? (
              <>
                <CloudCheck className="size-3.5" /> Synchronisé · {pluralize(videoCount, "vidéo", "vidéos")}
              </>
            ) : (
              <>
                <HardDrive className="size-3.5" /> Données enregistrées sur cet appareil
              </>
            )}
          </p>
        </div>
      </div>
      <Link
        href="/raccourci"
        onClick={closeSheet}
        className="mt-2 flex items-center gap-3 rounded-2xl px-3 py-3 transition-colors hover:bg-muted"
      >
        <span className="flex size-9 items-center justify-center rounded-xl bg-brand-soft text-brand">
          <Share className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-medium">Raccourci iOS</span>
          <span className="block text-sm text-muted-foreground">
            Ajouter un Reel depuis le menu Partager d’Instagram
          </span>
        </span>
        <ChevronRight className="size-4 text-muted-foreground" />
      </Link>
    </ResponsiveSheet>
  );
}

export function AccountAvatar({ email, className }: { email: string | null; className?: string }) {
  const initial = email?.trim()[0]?.toUpperCase() ?? "R";
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand",
        className,
      )}
    >
      {initial}
    </span>
  );
}

export function AccountButton({ className }: { className?: string }) {
  const openSheet = useUI((s) => s.openSheet);
  const email = useAuth((s) => s.user?.email ?? null);
  return (
    <button
      type="button"
      onClick={() => openSheet({ type: "account" })}
      aria-label="Compte"
      className={cn("flex size-10 items-center justify-center rounded-full", className)}
    >
      <AccountAvatar email={email} />
    </button>
  );
}
