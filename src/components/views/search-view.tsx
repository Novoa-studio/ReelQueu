"use client";

import { useMemo, useState, type ReactNode } from "react";
import { SearchX, Star } from "lucide-react";
import { PLATFORMS, type Platform } from "@/types";
import { PageHeader } from "@/components/app-shell/page-header";
import { ViewModeToggle } from "@/components/common/glass-button";
import { EmptyState } from "@/components/common/empty-state";
import { SearchField } from "@/components/common/search-field";
import { SegmentedControl } from "@/components/common/segmented-control";
import { VideoList } from "@/components/videos/video-list";
import { PlatformDot } from "@/components/videos/platform-badge";
import { useLibrary } from "@/lib/store/library";
import { getPlatform } from "@/lib/platforms";
import { collectionColor } from "@/lib/collections";
import {
  STATUS_FILTER_OPTIONS,
  filterVideos,
  pluralize,
  sortVideos,
  type StatusFilter,
} from "@/lib/videos";
import { cn } from "@/lib/utils";

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition-colors",
        active
          ? "border-transparent bg-foreground text-background"
          : "border-border bg-card text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

export function SearchView() {
  const status = useLibrary((s) => s.status);
  const videos = useLibrary((s) => s.videos);
  const collections = useLibrary((s) => s.collections);

  const [text, setText] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [collectionId, setCollectionId] = useState<string | null>(null);

  const platforms = useMemo(() => {
    const present = new Set(videos.map((v) => v.platform));
    return PLATFORMS.filter((p) => present.has(p));
  }, [videos]);

  const sortedCollections = useMemo(
    () => [...collections].sort((a, b) => a.name.localeCompare(b.name, "fr")),
    [collections],
  );

  const results = useMemo(
    () =>
      sortVideos(
        filterVideos(videos, { text, status: statusFilter, favoritesOnly, platform, collectionId }),
        "added_desc",
      ),
    [videos, text, statusFilter, favoritesOnly, platform, collectionId],
  );

  const hasFilters =
    Boolean(text.trim()) || statusFilter !== "all" || favoritesOnly || Boolean(platform) || Boolean(collectionId);

  function reset() {
    setText("");
    setStatusFilter("all");
    setFavoritesOnly(false);
    setPlatform(null);
    setCollectionId(null);
  }

  return (
    <>
      <PageHeader
        title="Rechercher"
        actions={<ViewModeToggle />}
        showSearch={false}
        subtitle={
          status === "ready"
            ? hasFilters
              ? pluralize(results.length, "résultat", "résultats")
              : `Parmi ${pluralize(videos.length, "vidéo", "vidéos")}`
            : " "
        }
      >
        <div className="flex flex-col gap-2.5">
          <SearchField
            value={text}
            onChange={setText}
            placeholder="Titre, auteur, plateforme, note…"
            autoFocus
          />
          <div className="-mx-4 flex items-center gap-1.5 overflow-x-auto px-4 scrollbar-none md:mx-0 md:flex-wrap md:px-0">
            <SegmentedControl
              label="Statut"
              value={statusFilter}
              onChange={setStatusFilter}
              options={STATUS_FILTER_OPTIONS}
              className="shrink-0"
            />
            <FilterChip active={favoritesOnly} onClick={() => setFavoritesOnly((v) => !v)}>
              <Star className={cn("size-3.5", favoritesOnly && "fill-current")} /> Favoris
            </FilterChip>
            {platforms.map((p) => (
              <FilterChip
                key={p}
                active={platform === p}
                onClick={() => setPlatform((current) => (current === p ? null : p))}
              >
                <PlatformDot platform={p} />
                {getPlatform(p).label}
              </FilterChip>
            ))}
          </div>
          {sortedCollections.length ? (
            <div className="-mx-4 flex items-center gap-1.5 overflow-x-auto px-4 scrollbar-none md:mx-0 md:flex-wrap md:px-0">
              {sortedCollections.map((c) => (
                <FilterChip
                  key={c.id}
                  active={collectionId === c.id}
                  onClick={() => setCollectionId((current) => (current === c.id ? null : c.id))}
                >
                  <span
                    aria-hidden
                    className="size-2 rounded-full"
                    style={{ backgroundColor: collectionColor(c.color) }}
                  />
                  {c.name}
                </FilterChip>
              ))}
            </div>
          ) : null}
        </div>
      </PageHeader>

      <VideoList
        videos={results}
        showStatus
        empty={
          <EmptyState
            icon={SearchX}
            title="Aucun résultat"
            description="Essayez un autre mot-clé ou retirez un filtre."
            action={
              hasFilters ? (
                <button
                  type="button"
                  onClick={reset}
                  className="text-sm font-medium text-brand hover:underline"
                >
                  Réinitialiser la recherche
                </button>
              ) : undefined
            }
          />
        }
      />
    </>
  );
}
