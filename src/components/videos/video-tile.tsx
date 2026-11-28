"use client";

import { memo } from "react";
import { Check, Star, StickyNote } from "lucide-react";
import type { Video } from "@/types";
import { describeVideo, formatRelativeDate, isSeen } from "@/lib/videos";
import { useEnrichment } from "@/lib/enrichment";
import { cn } from "@/lib/utils";
import { VideoThumbnail } from "./video-thumbnail";
import { VideoActionsMenu } from "./video-actions-menu";

interface VideoTileProps {
  video: Video;
  /** Ouvre le mode cinéma sur cette vidéo. */
  onOpen: (id: string) => void;
  showStatus?: boolean;
}

/** Vue en grille : affiche verticale 9:16, infos en surimpression. */
export const VideoTile = memo(function VideoTile({ video, onOpen, showStatus = false }: VideoTileProps) {
  const display = describeVideo(video);
  const enriching = useEnrichment((s) => Boolean(s.pending[video.id]));
  const seen = isSeen(video);

  return (
    <article className="group relative aspect-[9/16] overflow-hidden rounded-[22px] bg-muted shadow-card ring-1 ring-black/5 dark:ring-white/10">
      <button
        type="button"
        onClick={() => onOpen(video.id)}
        aria-label={`Regarder « ${display.title} »`}
        className="absolute inset-0 outline-none focus-visible:ring-3 focus-visible:ring-ring/60"
      >
        <VideoThumbnail
          video={video}
          className="size-full rounded-none transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <span className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
      </button>

      {/* Haut : plateforme et actions */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-2">
        <span className="glass-dark inline-flex max-w-[70%] items-center gap-1.5 truncate rounded-full px-2 py-1 text-[11px] font-medium">
          <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: display.platformColor }} />
          {display.platformLabel}
        </span>
        <div className="pointer-events-auto">
          <VideoActionsMenu video={video} overlay />
        </div>
      </div>

      {/* Bas : titre, compte, pastilles */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 p-2.5 text-white">
        <div className="mb-1 flex items-center gap-1">
          {video.is_favorite ? (
            <Star aria-label="Favori" className="size-3.5 fill-[var(--favorite)] text-[var(--favorite)]" />
          ) : null}
          {showStatus && seen ? <Check aria-label="Vue" className="size-3.5" /> : null}
          {video.note ? <StickyNote aria-label="Note" className="size-3.5 text-white/80" /> : null}
        </div>
        <h3
          className={cn(
            "line-clamp-2 text-[13px] leading-snug font-semibold drop-shadow",
            display.isFallbackTitle && "text-white/85",
            display.isFallbackTitle && enriching && "animate-pulse",
          )}
        >
          {display.title}
        </h3>
        <p className="mt-0.5 truncate text-[11px] text-white/70">
          {video.creator ?? formatRelativeDate(video.added_at)}
        </p>
      </div>
    </article>
  );
});
