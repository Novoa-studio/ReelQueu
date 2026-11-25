"use client";

import { useState } from "react";
import { FlaskConical, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useLibrary } from "@/lib/store/library";
import { useUI } from "@/lib/store/ui";

/**
 * Signale honnêtement que les données sont fictives et locales (phase 1).
 * Disparaît avec le branchement de Supabase.
 */
export function DemoNotice() {
  const demo = useLibrary((s) => s.demo && s.status === "ready");
  const clearAll = useLibrary((s) => s.clearAll);
  const dismissed = useUI((s) => s.demoNoticeDismissed);
  const dismiss = useUI((s) => s.dismissDemoNotice);
  const [confirming, setConfirming] = useState(false);

  if (!demo || dismissed) return null;

  return (
    <div className="mb-3 flex items-start gap-3 rounded-2xl border border-dashed border-border bg-card/60 p-3 text-sm animate-in fade-in-0">
      <FlaskConical aria-hidden className="mt-0.5 size-4 shrink-0 text-brand" />
      <div className="min-w-0 flex-1">
        <p className="font-medium">Données de démonstration</p>
        <p className="text-muted-foreground">
          Ces vidéos sont fictives et enregistrées uniquement sur cet appareil.
        </p>
        <Button
          variant={confirming ? "destructive" : "outline"}
          size="sm"
          className="mt-2"
          onClick={async () => {
            if (!confirming) {
              setConfirming(true);
              return;
            }
            if (await clearAll()) toast("Données effacées : à vous de jouer !");
            setConfirming(false);
          }}
        >
          {confirming ? "Confirmer : tout effacer" : "Partir de zéro"}
        </Button>
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Masquer"
        className="-mt-1 -mr-1 text-muted-foreground"
        onClick={dismiss}
      >
        <X />
      </Button>
    </div>
  );
}
