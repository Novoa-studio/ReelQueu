"use client";

import type { ComponentProps } from "react";
import { Slot } from "radix-ui";
import { LayoutGrid, LayoutList } from "lucide-react";
import { useUI } from "@/lib/store/ui";
import { cn } from "@/lib/utils";

/** Bouton rond en verre (en-têtes, commandes flottantes). */
export function GlassIconButton({
  asChild = false,
  dark = false,
  className,
  ...props
}: ComponentProps<"button"> & { asChild?: boolean; dark?: boolean }) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      className={cn(
        "inline-flex size-10 shrink-0 items-center justify-center rounded-full transition-transform duration-150 outline-none active:scale-95 focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 [&_svg]:size-[18px]",
        dark ? "glass-dark" : "glass text-foreground/80 hover:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

/** Bascule liste / grille, mémorisée sur l'appareil. */
export function ViewModeToggle({ className }: { className?: string }) {
  const grid = useUI((s) => s.viewMode === "grid");
  const toggle = useUI((s) => s.toggleViewMode);
  const label = grid ? "Afficher en liste" : "Afficher en grille";
  return (
    <GlassIconButton onClick={toggle} aria-label={label} title={label} className={className}>
      {grid ? <LayoutList /> : <LayoutGrid />}
    </GlassIconButton>
  );
}
