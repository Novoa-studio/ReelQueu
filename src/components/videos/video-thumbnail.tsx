"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import type { Video } from "@/types";
import { describeVideo } from "@/lib/videos";
import { cn } from "@/lib/utils";

/**
 * Miniature distante si disponible, sinon visuel de repli teinté par la
 * plateforme. Les CDN des réseaux sociaux expirent leurs URL : l'erreur de
 * chargement bascule silencieusement sur le repli.
 */
export function VideoThumbnail({ video, className }: { video: Video; className?: string }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const { platformColor } = describeVideo(video);
  const src = video.thumbnail_url;
  const showImage = Boolean(src) && failedSrc !== src;

  return (
    <div
      className={cn("relative overflow-hidden rounded-[10px] bg-muted", className)}
      style={
        showImage
          ? undefined
          : {
              backgroundImage: `linear-gradient(150deg, color-mix(in oklch, ${platformColor} 18%, var(--card)) 0%, color-mix(in oklch, ${platformColor} 55%, var(--card)) 100%)`,
            }
      }
    >
      {showImage && src ? (
        // Miniatures hébergées par des domaines tiers et variables : next/image n'apporte rien ici.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailedSrc(src)}
          onLoad={(e) => {
            // YouTube répond par une image grise 120×90 (statut 404) pour une
            // vidéo supprimée ou inexistante : on la traite comme une erreur.
            const img = e.currentTarget;
            if (src.includes("ytimg.com") && img.naturalWidth === 120 && img.naturalHeight === 90) {
              setFailedSrc(src);
            }
          }}
          className="size-full object-cover"
        />
      ) : (
        <div className="flex size-full items-center justify-center">
          <span className="flex size-8 items-center justify-center rounded-full bg-white/80 text-black/70 shadow-sm backdrop-blur-sm dark:bg-black/40 dark:text-white/90">
            <Play className="size-3.5 translate-x-px fill-current" />
          </span>
        </div>
      )}
    </div>
  );
}
