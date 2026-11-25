"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLibrary } from "@/lib/store/library";
import { useUI } from "@/lib/store/ui";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, isActive } from "./nav-items";
import { Logo } from "./logo";

/*
 * usePathname suspend sur les routes à paramètre dynamique (cacheComponents) :
 * chaque navigation est enveloppée dans un Suspense dont le repli est la même
 * barre, sans onglet actif, pour que la coque reste prérendue.
 */

function usePendingCount() {
  return useLibrary((s) =>
    s.status === "ready" ? s.videos.filter((v) => v.status === "pending").length : null,
  );
}

/* ----------------------------------------------------------------------------
 * Mobile : barre d'onglets inférieure + bouton d'ajout flottant
 * ------------------------------------------------------------------------- */

function TabBarView({ pathname }: { pathname: string | null }) {
  const pendingCount = usePendingCount();
  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-background/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
    >
      <ul className="mx-auto grid h-14 max-w-md grid-cols-4">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(href, pathname);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-full flex-col items-center justify-center gap-0.5 text-[10.5px] font-medium transition-colors",
                  active ? "text-brand" : "text-muted-foreground",
                )}
              >
                <span className="relative">
                  <Icon className="size-[22px]" strokeWidth={active ? 2.1 : 1.75} />
                  {href === "/" && pendingCount ? (
                    <span className="absolute -top-1.5 left-3.5 min-w-4 rounded-full bg-brand px-1 text-center text-[10px] leading-4 font-semibold text-brand-foreground">
                      {pendingCount > 99 ? "99+" : pendingCount}
                    </span>
                  ) : null}
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function TabBarWithPath() {
  return <TabBarView pathname={usePathname()} />;
}

export function TabBar() {
  return (
    <Suspense fallback={<TabBarView pathname={null} />}>
      <TabBarWithPath />
    </Suspense>
  );
}

export function AddFab() {
  const openSheet = useUI((s) => s.openSheet);
  return (
    <button
      type="button"
      onClick={() => openSheet({ type: "add" })}
      aria-label="Ajouter une vidéo"
      className="fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] z-40 flex size-14 items-center justify-center rounded-full bg-brand text-brand-foreground shadow-float transition-transform active:scale-95 md:hidden"
    >
      <Plus className="size-6" strokeWidth={2.25} />
    </button>
  );
}

/* ----------------------------------------------------------------------------
 * Desktop : barre latérale
 * ------------------------------------------------------------------------- */

function SidebarView({ pathname }: { pathname: string | null }) {
  const openSheet = useUI((s) => s.openSheet);
  const pendingCount = usePendingCount();
  const searchActive = isActive("/search", pathname);

  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-6 border-r border-border/80 px-3 py-5 md:flex">
      <Link href="/" className="px-2">
        <Logo />
      </Link>

      <Button
        onClick={() => openSheet({ type: "add" })}
        className="h-9 justify-start gap-2 rounded-lg bg-brand px-3 text-brand-foreground hover:bg-brand/90"
      >
        <Plus /> Ajouter une vidéo
      </Button>

      <nav aria-label="Navigation principale" className="flex flex-col gap-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(href, pathname);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-card text-foreground shadow-card ring-1 ring-border/70"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className={cn("size-4", active && "text-brand")} />
              <span className="flex-1">{label}</span>
              {href === "/" && pendingCount ? (
                <span className="text-xs text-muted-foreground tabular-nums">{pendingCount}</span>
              ) : null}
            </Link>
          );
        })}
        <Link
          href="/search"
          aria-current={searchActive ? "page" : undefined}
          className={cn(
            "mt-3 flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium transition-colors",
            searchActive
              ? "bg-card text-foreground shadow-card ring-1 ring-border/70"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <Search className={cn("size-4", searchActive && "text-brand")} />
          Rechercher
        </Link>
      </nav>
    </aside>
  );
}

function SidebarWithPath() {
  return <SidebarView pathname={usePathname()} />;
}

export function Sidebar() {
  return (
    <Suspense fallback={<SidebarView pathname={null} />}>
      <SidebarWithPath />
    </Suspense>
  );
}
