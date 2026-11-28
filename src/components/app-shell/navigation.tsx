"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/store/auth";
import { useLibrary } from "@/lib/store/library";
import { useUI } from "@/lib/store/ui";
import { AccountAvatar } from "@/components/auth/account-sheet";
import { quickAdd } from "@/lib/quick-add";
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
 * Mobile : barre d'onglets flottante en verre + bouton d'ajout
 * ------------------------------------------------------------------------- */

function TabBarView({ pathname }: { pathname: string | null }) {
  const pendingCount = usePendingCount();
  return (
    <nav
      aria-label="Navigation principale"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex items-end justify-center gap-2.5 px-4 pb-[calc(env(safe-area-inset-bottom)+0.625rem)] md:hidden"
    >
      <ul className="glass pointer-events-auto flex h-[62px] max-w-sm flex-1 items-center rounded-full px-1.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(href, pathname);
          return (
            <li key={href} className="h-full flex-1 py-1.5">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-full flex-col items-center justify-center gap-0.5 rounded-full text-[10px] font-medium transition-all duration-200",
                  active
                    ? "bg-foreground/[0.07] text-brand dark:bg-white/10"
                    : "text-foreground/60 hover:text-foreground",
                )}
              >
                <span className="relative">
                  <Icon className="size-[21px]" strokeWidth={active ? 2.2 : 1.8} />
                  {href === "/" && pendingCount ? (
                    <span className="absolute -top-1.5 left-3.5 min-w-4 rounded-full bg-brand px-1 text-center text-[10px] leading-4 font-semibold text-brand-foreground ring-2 ring-[var(--glass-tint)]">
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
      <button
        type="button"
        // Collage en un geste : lit le presse-papiers (geste requis), sinon ouvre la feuille.
        onClick={() => void quickAdd()}
        aria-label="Ajouter une vidéo"
        className="glass-brand pointer-events-auto flex size-[62px] shrink-0 items-center justify-center rounded-full transition-transform active:scale-95"
      >
        <Plus className="size-6" strokeWidth={2.25} />
      </button>
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


/* ----------------------------------------------------------------------------
 * Desktop : barre latérale
 * ------------------------------------------------------------------------- */

function SidebarView({ pathname }: { pathname: string | null }) {
  const openSheet = useUI((s) => s.openSheet);
  const email = useAuth((s) => s.user?.email ?? null);
  const pendingCount = usePendingCount();
  const searchActive = isActive("/search", pathname);

  return (
    <aside className="glass sticky top-3 m-3 mr-0 hidden h-[calc(100dvh-1.5rem)] w-60 shrink-0 flex-col gap-6 rounded-[28px] px-3 py-5 md:flex">
      <Link href="/" className="px-2">
        <Logo />
      </Link>

      <Button
        onClick={() => void quickAdd()}
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

      <button
        type="button"
        onClick={() => openSheet({ type: "account" })}
        className="mt-auto flex items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-muted"
      >
        <AccountAvatar email={email} className="size-7 text-xs" />
        <span className="min-w-0 flex-1 truncate text-muted-foreground">
          {email ?? "Mode local"}
        </span>
      </button>
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
