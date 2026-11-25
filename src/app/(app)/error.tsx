"use client";

import { useEffect } from "react";
import { TriangleExclamationPoint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/empty-state";

/** Une erreur d'affichage n'emporte que l'écran courant, pas la navigation. */
export default function AppError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="pt-[env(safe-area-inset-top)]">
      <EmptyState
        icon={TriangleExclamationPoint}
        title="Cet écran a rencontré un problème"
        description="Vos vidéos ne sont pas perdues. Réessayez ou changez d’onglet."
        action={
          <Button variant="outline" className="rounded-full" onClick={() => retry()}>
            Réessayer
          </Button>
        }
      />
    </div>
  );
}
