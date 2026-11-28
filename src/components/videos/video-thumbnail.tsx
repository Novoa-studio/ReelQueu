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
// Miniatures en échec pendant la session : inutile de les redemander à chaque écran.
const failedThumbnails = new Set<string>();

/** Au-delà de ce rapport largeur / hauteur, l'image n'est pas « verticale ». */
const PORTRAIT_MAX_RATIO = 0.7;

export function VideoThumbnail({
  video,
  className,
  showPlayBadge = false,
  fit = "cover",
}: {
  video: Video;
  className?: string;
  /** Petit bouton lecture sur une vraie miniature. */
  showPlayBadge?: boolean;
  /**
   * cover : l'image remplit le cadre (rognée si besoin).
   * smart : une image plus large que le cadre (YouTube, publication carrée)
   *         s'affiche en entier, sur une copie floutée d'elle-même.
   */
  fit?: "cover" | "smart";
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const [wideSrc, setWideSrc] = useState<string | null>(null);
  const { platformColor } = describeVideo(video);
  const src = video.thumbnail_url;
  const showImage = Boolean(src) && failedSrc !== src && !failedThumbnails.has(src ?? "");
  const contain = fit === "smart" && wideSrc === src;

  function markFailed(url: string) {
    failedThumbnails.add(url);
    setFailedSrc(url);
  }

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
      {showImage && src && contain ? (
        // Fond : la même image, floutée, pour habiller les bandes autour d'une image large.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          aria-hidden
          referrerPolicy="no-referrer"
          className="absolute inset-0 size-full scale-125 object-cover opacity-70 blur-2xl"
        />
      ) : null}
      {showImage && src ? (
        // Miniatures hébergées par des domaines tiers et variables : next/image n'apporte rien ici.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => markFailed(src)}
          onLoad={(e) => {
            const img = e.currentTarget;
            // YouTube répond par une image grise 120×90 (statut 404) pour une
            // vidéo supprimée ou inexistante : on la traite comme une erreur.
            if (src.includes("ytimg.com") && img.naturalWidth === 120 && img.naturalHeight === 90) {
              markFailed(src);
              return;
            }
            if (fit === "smart" && img.naturalHeight > 0 && img.naturalWidth / img.naturalHeight > PORTRAIT_MAX_RATIO) {
              setWideSrc(src);
            }
          }}
          className={cn("relative size-full", contain ? "object-contain" : "object-cover")}
        />
      ) : null}
      {showImage && src && showPlayBadge ? (
        <span
          aria-hidden
          className="absolute right-1.5 bottom-1.5 flex size-6 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm"
        >
          <Play className="size-3 translate-x-px fill-current" />
        </span>
      ) : null}
      {showImage && src ? null : (
        <div className="flex size-full items-center justify-center">
          <span className="flex size-8 items-center justify-center rounded-full bg-white/80 text-black/70 shadow-sm backdrop-blur-sm dark:bg-black/40 dark:text-white/90">
            <Play className="size-3.5 translate-x-px fill-current" />
          </span>
        </div>
      )}
    </div>
  );
}
