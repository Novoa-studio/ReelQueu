import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  actions,
  back,
  children,
  showSearch = true,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 -mx-4 bg-background/85 px-4 pt-[env(safe-area-inset-top)] backdrop-blur-xl md:-mx-8 md:px-8",
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
          <h1 className="truncate text-[28px] leading-tight font-semibold tracking-[-0.02em]">
            {title}
          </h1>
          {subtitle ? <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-1 pb-0.5">
          {actions}
          {showSearch ? (
            <Button
              asChild
              variant="ghost"
              size="icon-lg"
              className="rounded-full text-muted-foreground md:hidden"
            >
              <Link href="/search" aria-label="Rechercher">
                <Search className="size-5" />
              </Link>
            </Button>
          ) : null}
        </div>
      </div>
      {children ? <div className="pb-3">{children}</div> : null}
    </header>
  );
}
