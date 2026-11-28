import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft, Search } from "lucide-react";
import { GlassIconButton } from "@/components/common/glass-button";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
  /** Contenu collant sous le titre (recherche, filtres). */
  children?: ReactNode;
  /** Affiche le raccourci de recherche globale (mobile). */
  showSearch?: boolean;
  /** Élément placé tout à droite, après la recherche (ex. compte). */
  trailing?: ReactNode;
  className?: string;
}

/**
 * En-tête collant : le contenu défile dessous, flouté, avec un bord inférieur
 * fondu plutôt qu'une ligne (esprit liquid glass).
 */
export function PageHeader({
  title,
  subtitle,
  actions,
  back,
  children,
  showSearch = true,
  trailing,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 -mx-4 px-4 pt-[env(safe-area-inset-top)] md:-mx-8 md:px-8",
        // Voile flou dont l'opacité décroît vers le bas.
        "before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:bg-background/70 before:backdrop-blur-xl before:[mask-image:linear-gradient(to_bottom,black_75%,transparent)]",
        className,
      )}
    >
      {back ? (
        <Link
          href={back.href}
          className="-ml-1.5 inline-flex items-center gap-0.5 pt-3 text-[15px] font-medium text-brand"
        >
          <ChevronLeft className="size-5" />
          {back.label}
        </Link>
      ) : null}
      <div className={cn("flex items-end gap-3 pb-3", back ? "pt-1" : "pt-5 md:pt-8")}>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[30px] leading-tight font-bold tracking-[-0.025em]">{title}</h1>
          {subtitle ? <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-2 pb-0.5">
          {actions}
          {showSearch ? (
            <GlassIconButton asChild className="md:hidden">
              <Link href="/search" aria-label="Rechercher">
                <Search />
              </Link>
            </GlassIconButton>
          ) : null}
          {trailing}
        </div>
      </div>
      {children ? <div className="pb-3">{children}</div> : null}
    </header>
  );
}
