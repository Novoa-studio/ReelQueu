"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ChevronRight, Layers, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/app-shell/page-header";
import { GlassIconButton } from "@/components/common/glass-button";
import { EmptyState } from "@/components/common/empty-state";
import { useLibrary } from "@/lib/store/library";
import { useUI } from "@/lib/store/ui";
import { collectionColor } from "@/lib/collections";
import { pluralize } from "@/lib/videos";

export function CollectionsView() {
  const status = useLibrary((s) => s.status);
  const collections = useLibrary((s) => s.collections);
  const videos = useLibrary((s) => s.videos);
  const openSheet = useUI((s) => s.openSheet);

  const rows = useMemo(() => {
    const counts = new Map<string, { total: number; pending: number }>();
    for (const video of videos) {
      for (const id of video.collection_ids) {
        const entry = counts.get(id) ?? { total: 0, pending: 0 };
        entry.total += 1;
        if (video.status === "pending") entry.pending += 1;
        counts.set(id, entry);
      }
    }
    return [...collections]
      .sort((a, b) => a.name.localeCompare(b.name, "fr"))
      .map((c) => ({ collection: c, ...(counts.get(c.id) ?? { total: 0, pending: 0 }) }));
  }, [collections, videos]);

  const create = () => openSheet({ type: "collection-form" });

  return (
    <>
      <PageHeader
        title="Collections"
        subtitle={
          status === "ready" ? pluralize(collections.length, "collection", "collections") : " "
        }
        actions={
          <GlassIconButton onClick={create} aria-label="Nouvelle collection">
            <Plus />
          </GlassIconButton>
        }
      />

      {status !== "ready" ? (
        <div aria-hidden className="overflow-hidden rounded-2xl bg-card shadow-card ring-1 ring-border/70">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex items-center gap-3 border-b border-border/60 px-4 py-3.5 last:border-0">
              <Skeleton className="size-3 rounded-full" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>
      ) : rows.length ? (
        <ul className="overflow-hidden rounded-2xl bg-card shadow-card ring-1 ring-border/70">
          {rows.map(({ collection, total, pending }) => (
            <li key={collection.id} className="border-b border-border/60 last:border-0">
              <Link
                href={`/collections/${collection.id}`}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/60 active:bg-muted"
              >
                <span
                  aria-hidden
                  className="size-3 shrink-0 rounded-full"
                  style={{ backgroundColor: collectionColor(collection.color) }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium">{collection.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {pluralize(total, "vidéo", "vidéos")}
                    {pending ? ` · ${pending} à regarder` : ""}
                  </span>
                </span>
                <ChevronRight aria-hidden className="size-4 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={Layers}
          title="Aucune collection"
          description="Regroupez vos vidéos par thème : Business, Cuisine, Voyages… Une vidéo peut appartenir à plusieurs collections."
          action={
            <Button
              onClick={create}
              className="rounded-full bg-brand px-4 text-brand-foreground hover:bg-brand/90"
            >
              <Plus /> Créer une collection
            </Button>
          }
        />
      )}
    </>
  );
}
