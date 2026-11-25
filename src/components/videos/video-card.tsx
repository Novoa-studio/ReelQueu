"use client";

import { memo } from "react";
import { ArrowUpRight, CircleCheck, Star, StickyNote } from "lucide-react";
import type { Collection, Video } from "@/types";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { collectionsOf, describeVideo, formatRelativeDate, isSeen } from "@/lib/videos";
import { collectionColor } from "@/lib/collections";
import { recordOpen } from "@/lib/video-actions";
import { PlatformDot } from "./platform-badge";
import { VideoThumbnail } from "./video-thumbnail";
import { VideoActionsMenu } from "./video-actions-menu";

export type CardDateMode = "added" | "viewed";

interface VideoCardProps {
  video: Video;
  collections: Collection[];
  dateMode?: CardDateMode;
  /** Affiche la pastille « Vue » (listes mêlant les statuts). */
  showStatus?: boolean;
}

export const VideoCard = memo(function VideoCard({
  video,
  collections,
  dateMode = "added",
  showStatus = false,
}: VideoCardProps) {
  const display = describeVideo(video);
  const videoCollections = collectionsOf(video, collections);
  const seen = isSeen(video);
  const dateIso = dateMode === "viewed" ? (video.viewed_at ?? video.added_at) : video.added_at;
  const dateLabel =
    dateMode === "viewed" && video.viewed_at
      ? `Vue ${formatRelativeDate(dateIso)}`
      : `Ajoutée ${formatRelativeDate(dateIso)}`;

  // Lien natif (et non window.open) : sur iOS, c'est ce qui déclenche le
  // plus fiablement l'ouverture dans l'application d'origine.
  const linkProps = {
    href: video.url,
    target: "_blank",
    rel: "noopener noreferrer",
    onClick: () => recordOpen(video),
  } as const;

  return (
    <article className="flex gap-3 rounded-2xl bg-card p-2.5 shadow-card ring-1 ring-border/70">
      <a {...linkProps} tabIndex={-1} aria-hidden className="shrink-0">
        <VideoThumbnail video={video} className="h-[104px] w-[78px]" />
      </a>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <PlatformDot platform={video.platform} />
          <span className="shrink-0 font-medium text-foreground/70">{display.platformLabel}</span>
          {video.creator ? (
            <>
              <span aria-hidden>·</span>
              <span className="truncate">{video.creator}</span>
            </>
          ) : null}
          <div className="-my-1 -mr-1 ml-auto shrink-0">
            <VideoActionsMenu video={video} />
          </div>
        </div>

        <h3
          className={cn(
            "line-clamp-2 text-[15px] leading-snug font-medium tracking-[-0.005em]",
            display.isFallbackTitle && "text-foreground/75",
          )}
        >
          {display.title}
        </h3>

        {video.note ? (
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <StickyNote aria-hidden className="size-3 shrink-0" />
            <span className="truncate">{video.note}</span>
          </p>
        ) : null}

        <div className="mt-auto flex items-end gap-2 pt-1.5">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            {videoCollections.length ? (
              <div className="flex min-w-0 items-center gap-1">
                {videoCollections.slice(0, 2).map((c) => (
                  <span
                    key={c.id}
                    className="inline-flex max-w-[7.5rem] min-w-0 items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground"
                  >
                    <span
                      aria-hidden
                      className="size-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: collectionColor(c.color) }}
                    />
                    <span className="truncate">{c.name}</span>
                  </span>
                ))}
                {videoCollections.length > 2 ? (
                  <span className="text-[11px] text-muted-foreground">
                    +{videoCollections.length - 2}
                  </span>
                ) : null}
              </div>
            ) : null}
            <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
              {showStatus && seen ? (
                <CircleCheck aria-label="Vue" className="size-3 shrink-0 text-brand" />
              ) : null}
              <time dateTime={dateIso}>{dateLabel}</time>
            </p>
          </div>

          {video.is_favorite ? (
            <Star aria-label="Favori" className="mb-1.5 size-3.5 shrink-0 fill-favorite text-favorite" />
          ) : null}
          <a
            {...linkProps}
            className={cn(
              buttonVariants({ variant: "secondary", size: "sm" }),
              "h-8 shrink-0 rounded-full px-3 text-[13px]",
            )}
          >
            {seen ? "Revoir" : "Ouvrir"}
            <ArrowUpRight data-icon="inline-end" />
          </a>
        </div>
      </div>
    </article>
  );
});
