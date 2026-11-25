"use client";

import type { ReactNode } from "react";
import { TriangleExclamationPoint } from "lucide-react";
import type { Video } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/empty-state";
import { useLibrary } from "@/lib/store/library";
import { VideoCard, type CardDateMode } from "./video-card";

interface VideoListProps {
  videos: Video[];
  empty: ReactNode;
  dateMode?: CardDateMode;
  showStatus?: boolean;
}

export function VideoList({ videos, empty, dateMode, showStatus }: VideoListProps) {
  const status = useLibrary((s) => s.status);
  const collections = useLibrary((s) => s.collections);

  if (status === "idle" || status === "loading") return <VideoListSkeleton />;
  if (status === "error") {
    return (
      <EmptyState
        icon={TriangleExclamationPoint}
        title="Impossible de charger vos vidéos"
        description="Rechargez l’application. Vos données ne sont pas perdues."
      />
    );
  }
  if (!videos.length) return <>{empty}</>;

  return (
    <ul className="flex flex-col gap-2.5">
      {videos.map((video) => (
        // content-visibility : le navigateur ne peint que les cartes visibles,
        // ce qui garde le défilement fluide avec plusieurs centaines d'éléments.
        <li key={video.id} className="[contain-intrinsic-size:auto_126px] [content-visibility:auto]">
          <VideoCard
            video={video}
            collections={collections}
            dateMode={dateMode}
            showStatus={showStatus}
          />
        </li>
      ))}
    </ul>
  );
}

export function VideoListSkeleton({ count = 4 }: { count?: number }) {
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
