"use client";

import { useCallback, type ReactNode } from "react";
import { TriangleExclamationPoint } from "lucide-react";
import type { Video } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/empty-state";
import { useLibrary } from "@/lib/store/library";
import { useUI } from "@/lib/store/ui";
import { VideoCard, type CardDateMode } from "./video-card";
import { VideoTile } from "./video-tile";

interface VideoListProps {
  videos: Video[];
  empty: ReactNode;
  dateMode?: CardDateMode;
  showStatus?: boolean;
}

/** Liste ou grille selon la préférence ; ouvrir une vidéo lance le mode cinéma sur cette liste. */
export function VideoList({ videos, empty, dateMode, showStatus }: VideoListProps) {
  const status = useLibrary((s) => s.status);
  const collections = useLibrary((s) => s.collections);
  const grid = useUI((s) => s.viewMode === "grid");
  const openCinema = useUI((s) => s.openCinema);
  const onOpen = useCallback(
    (id: string) => openCinema(videos.map((v) => v.id), id),
    [openCinema, videos],
  );

  if (status === "idle" || status === "loading") return <VideoListSkeleton grid={grid} />;
  if (status === "error") {
    return (
      <EmptyState
        icon={TriangleExclamationPoint}
        title="Impossible de charger vos vidéos"
        description="Vérifiez votre connexion. Vos données ne sont pas perdues."
        action={
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => void useLibrary.getState().reload()}
          >
            Réessayer
          </Button>
        }
      />
    );
  }
  if (!videos.length) return <>{empty}</>;

  if (grid) {
    return (
      <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
        {videos.map((video) => (
          <li key={video.id}>
            <VideoTile video={video} onOpen={onOpen} showStatus={showStatus} />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className="flex flex-col gap-2.5">
      {videos.map((video) => (
        <li key={video.id}>
          <VideoCard
            video={video}
            collections={collections}
            dateMode={dateMode}
            showStatus={showStatus}
            onOpen={onOpen}
          />
        </li>
      ))}
    </ul>
  );
}

export function VideoListSkeleton({ count = 4, grid = false }: { count?: number; grid?: boolean }) {
  if (grid) {
    return (
      <ul aria-hidden className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: count }, (_, i) => (
          <li key={i}>
            <Skeleton className="aspect-[9/16] w-full rounded-[22px]" />
          </li>
        ))}
      </ul>
    );
  }
  return (
    <ul aria-hidden className="flex flex-col gap-2.5">
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="flex gap-3 rounded-2xl bg-card p-2.5 shadow-card ring-1 ring-border/70">
          <Skeleton className="h-[104px] w-[78px] rounded-[10px]" />
          <div className="flex flex-1 flex-col gap-2 py-1">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="mt-auto h-3 w-20" />
          </div>
        </li>
      ))}
    </ul>
  );
}
