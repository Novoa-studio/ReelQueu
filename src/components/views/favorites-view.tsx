"use client";

import { useMemo, useState } from "react";
import { Star } from "lucide-react";
import { PageHeader } from "@/components/app-shell/page-header";
import { ViewModeToggle } from "@/components/common/glass-button";
import { EmptyState } from "@/components/common/empty-state";
import { SegmentedControl } from "@/components/common/segmented-control";
import { VideoList } from "@/components/videos/video-list";
import { useLibrary } from "@/lib/store/library";
import {
  STATUS_FILTER_OPTIONS,
  filterVideos,
  pluralize,
  sortVideos,
  type StatusFilter,
} from "@/lib/videos";

export function FavoritesView() {
  const status = useLibrary((s) => s.status);
  const videos = useLibrary((s) => s.videos);
  const [filter, setFilter] = useState<StatusFilter>("all");

  const favorites = useMemo(() => videos.filter((v) => v.is_favorite), [videos]);
  const results = useMemo(
    () => sortVideos(filterVideos(favorites, { status: filter }), "added_desc"),
    [favorites, filter],
  );

  return (
    <>
      <PageHeader
        title="Favoris"
        actions={<ViewModeToggle />}
        subtitle={status === "ready" ? pluralize(favorites.length, "favori", "favoris") : " "}
      >
        <SegmentedControl
          label="Filtrer par statut"
          value={filter}
          onChange={setFilter}
          options={STATUS_FILTER_OPTIONS}
          className="w-full md:w-auto"
        />
      </PageHeader>
      <VideoList
        videos={results}
        showStatus
        empty={
          <EmptyState
            icon={Star}
            title={favorites.length ? "Aucun favori dans ce filtre" : "Aucun favori"}
            description="Touchez « ⋯ » sur une vidéo puis « Ajouter aux favoris ». Un favori reste visible ici, vu ou non."
          />
        }
      />
    </>
  );
}
