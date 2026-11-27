"use client";

import { useEffect, useMemo, useRef } from "react";
import { ArrowUpRight, Check, Info } from "lucide-react";
import type { Video } from "@/types";
import { Button, buttonVariants } from "@/components/ui/button";
import { ResponsiveSheet } from "@/components/ui/responsive-sheet";
import { useLibrary, useVideo } from "@/lib/store/library";
import { useSheetOpen, useUI } from "@/lib/store/ui";
import { getEmbed, type EmbedInfo } from "@/lib/platforms";
import { describeVideo } from "@/lib/videos";
import { markViewed, recordOpen } from "@/lib/video-actions";
import { trackOpen } from "@/lib/open-tracking";
import { cn } from "@/lib/utils";

/** Durée minimale de visionnage dans le lecteur avant le passage automatique en « Vue ». */
const AUTO_VIEW_AFTER_MS = 10_000;

export function PlayerSheet() {
  const open = useSheetOpen("player");
  const sheet = useUI((s) => s.sheet);
  const sheetKey = useUI((s) => s.sheetKey);
  const closeSheet = useUI((s) => s.closeSheet);
  const videoId = sheet?.type === "player" ? sheet.videoId : null;
  const video = useVideo(videoId);
  const url = video?.url;
  const embed = useMemo(() => (url ? getEmbed(url) : null), [url]);
  const openedAt = useRef<number | null>(null);

  // Ouverture d'un vrai lecteur : on note l'heure (opened_at et minuterie « Vue »).
  useEffect(() => {
    if (!open || !videoId || !embed?.inline) return;
    openedAt.current = Date.now();
    const current = useLibrary.getState().videos.find((v) => v.id === videoId);
    if (current) recordOpen(current);
  }, [open, videoId, embed?.inline]);

  /** Fermeture sans effet sur le statut. */
  function dismiss() {
    openedAt.current = null;
    closeSheet();
  }

  /** Fermeture par l'utilisateur : « Vue » si le lecteur est resté ouvert assez longtemps. */
  function close() {
    const started = openedAt.current;
    dismiss();
    const current = videoId ? useLibrary.getState().videos.find((v) => v.id === videoId) : undefined;
    if (current?.status === "pending" && started && Date.now() - started >= AUTO_VIEW_AFTER_MS) {
      void markViewed(current);
    }
  }

  const display = video ? describeVideo(video) : null;

  return (
    <ResponsiveSheet
      open={open && Boolean(video && embed)}
      onOpenChange={(next) => !next && close()}
      title={display?.title ?? ""}
      description={
        display ? [display.platformLabel, video?.creator].filter(Boolean).join(" · ") : undefined
      }
      className="data-[vaul-drawer-direction=bottom]:max-h-[94dvh] sm:max-w-lg"
      footer={video && embed ? <PlayerActions video={video} embed={embed} onDismiss={dismiss} /> : undefined}
    >
      {video && embed ? (
        <div className="flex flex-col items-center gap-3">
          {!embed.inline ? (
            <p className="flex items-start gap-2 self-stretch rounded-lg bg-muted/70 px-2.5 py-2 text-xs text-muted-foreground">
              <Info className="mt-px size-3.5 shrink-0" />
              Instagram ne permet pas de lire ses Reels en dehors de son application : ceci est
              l’aperçu officiel, la lecture s’ouvre dans Instagram.
            </p>
          ) : null}
          <PlayerFrame key={sheetKey} embed={embed} title={`Lecteur ${display?.platformLabel ?? ""}`} />
        </div>
      ) : null}
    </ResponsiveSheet>
  );
}

function PlayerFrame({ embed, title }: { embed: EmbedInfo; title: string }) {
  // Lecteur vertical : hauteur limitée à l'écran, largeur déduite du 9:16.
  const style = embed.inline
    ? embed.portrait
      ? { height: "min(60dvh, 640px)", width: "calc(min(60dvh, 640px) * 9 / 16)", maxWidth: "100%" }
      : { width: "100%", aspectRatio: "16 / 9" }
    : { width: "100%", maxWidth: 420, height: "min(50dvh, 560px)" };

  return (
    <div
      className={cn("overflow-hidden rounded-xl", embed.inline ? "bg-black" : "bg-white ring-1 ring-border/70")}
      style={style}
    >
      <iframe
        src={embed.src}
        title={title}
        className="size-full border-0"
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen; clipboard-write"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}

function PlayerActions({ video, embed, onDismiss }: { video: Video; embed: EmbedInfo; onDismiss: () => void }) {
  const display = describeVideo(video);
  const pending = video.status === "pending";

  return (
    <div className="flex flex-col gap-2">
      <a
        href={video.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => {
          trackOpen(video);
          onDismiss();
        }}
        className={cn(
          buttonVariants({ variant: embed.inline ? "secondary" : "default", size: "lg" }),
          "h-11 rounded-xl text-[15px]",
        )}
      >
        {embed.inline ? `Ouvrir dans ${display.platformLabel}` : `Regarder dans ${display.platformLabel}`}
        <ArrowUpRight data-icon="inline-end" />
      </a>
      {pending ? (
        <Button
          variant={embed.inline ? "default" : "secondary"}
          size="lg"
          className="h-11 rounded-xl text-[15px]"
          onClick={() => {
            onDismiss();
            void markViewed(video);
          }}
        >
          <Check /> Marquer comme vue
        </Button>
      ) : null}
    </div>
  );
}
