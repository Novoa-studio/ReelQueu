"use client";

import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { ArrowUpRight, Check, ChevronDown, Info, Maximize, Minimize } from "lucide-react";
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

const IFRAME_ALLOW = "autoplay; encrypted-media; picture-in-picture; fullscreen; clipboard-write";

/**
 * - Plateformes lisibles dans l'app (YouTube, TikTok, Vimeo) : lecteur
 *   immersif plein écran.
 * - Instagram : aperçu officiel dans une feuille (sa lecture hors de son
 *   application n'est pas possible : renvoi vers Instagram).
 */
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

  return (
    <>
      <ImmersivePlayer
        key={`player-${sheetKey}`}
        open={open && Boolean(video && embed?.inline)}
        video={video}
        embed={embed}
        onClose={close}
        onDismiss={dismiss}
      />
      <PreviewSheet
        open={open && Boolean(video && embed && !embed.inline)}
        video={video}
        embed={embed}
        frameKey={sheetKey}
        onClose={close}
        onDismiss={dismiss}
      />
    </>
  );
}

/* ----------------------------------------------------------------------------
 * Plein écran
 * ------------------------------------------------------------------------- */

type FullscreenDocument = Document & {
  webkitFullscreenEnabled?: boolean;
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};
type FullscreenElement = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };

function subscribeFullscreen(onChange: () => void) {
  document.addEventListener("fullscreenchange", onChange);
  document.addEventListener("webkitfullscreenchange", onChange);
  return () => {
    document.removeEventListener("fullscreenchange", onChange);
    document.removeEventListener("webkitfullscreenchange", onChange);
  };
}

function isFullscreenActive(): boolean {
  const doc = document as FullscreenDocument;
  return Boolean(doc.fullscreenElement ?? doc.webkitFullscreenElement);
}

/**
 * Plein écran système. Indisponible sur iPhone (Safari ne l'autorise que pour
 * une balise vidéo native) : le lecteur occupe alors tout l'écran par lui-même,
 * et le bouton plein écran du lecteur de la plateforme reste utilisable.
 */
function useFullscreen() {
  const supported = useSyncExternalStore(
    () => () => {},
    () => {
      const doc = document as FullscreenDocument;
      return Boolean(doc.fullscreenEnabled ?? doc.webkitFullscreenEnabled);
    },
    () => false,
  );
  const active = useSyncExternalStore(subscribeFullscreen, isFullscreenActive, () => false);

  async function enter(element: HTMLElement | null) {
    const el = element as FullscreenElement | null;
    try {
      if (el?.requestFullscreen) await el.requestFullscreen();
      else await el?.webkitRequestFullscreen?.();
    } catch {
      /* refusé par le navigateur : le lecteur reste en plein écran dans la page */
    }
  }

  async function exit() {
    if (!isFullscreenActive()) return;
    const doc = document as FullscreenDocument;
    try {
      if (doc.exitFullscreen) await doc.exitFullscreen();
      else await doc.webkitExitFullscreen?.();
    } catch {
      /* ignore */
    }
  }

  return { supported, active, enter, exit };
}

/* ----------------------------------------------------------------------------
 * Lecteur immersif (YouTube, TikTok, Vimeo)
 * ------------------------------------------------------------------------- */

function ImmersivePlayer({
  open,
  video,
  embed,
  onClose,
  onDismiss,
}: {
  open: boolean;
  video: Video | undefined;
  embed: EmbedInfo | null;
  onClose: () => void;
  onDismiss: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fullscreen = useFullscreen();
  const display = video ? describeVideo(video) : null;

  function handleClose() {
    void fullscreen.exit();
    onClose();
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black data-open:animate-in data-open:fade-in-0" />
        <DialogPrimitive.Content
          ref={containerRef}
          aria-describedby={undefined}
          className="fixed inset-0 z-50 flex flex-col bg-black text-white outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-[0.98]"
        >
          <DialogPrimitive.Title className="sr-only">{display?.title ?? "Lecteur"}</DialogPrimitive.Title>

          {/* Barre du haut */}
          <div
            className={cn(
              "relative z-10 flex items-center gap-2 px-2 pt-[calc(env(safe-area-inset-top)+0.5rem)] pb-2",
              // Téléphone en paysage (variante « short ») : barre en surimpression.
              "short:pointer-events-none short:absolute short:inset-x-0 short:top-0 short:bg-gradient-to-b short:from-black/60 short:to-transparent",
            )}
          >
            <button
              type="button"
              onClick={handleClose}
              aria-label="Fermer le lecteur"
              className="pointer-events-auto flex size-10 shrink-0 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20 short:size-9 short:bg-black/40"
            >
              <ChevronDown className="size-5" />
            </button>
            <div className={cn("min-w-0 flex-1 px-1", "short:invisible")}>
              <p className="truncate text-sm font-medium">{display?.title}</p>
              <p className="truncate text-xs text-white/60">
                {[display?.platformLabel, video?.creator].filter(Boolean).join(" · ")}
              </p>
            </div>
            {fullscreen.supported ? (
              <button
                type="button"
                onClick={() =>
                  fullscreen.active ? void fullscreen.exit() : void fullscreen.enter(containerRef.current)
                }
                aria-label={fullscreen.active ? "Quitter le plein écran" : "Plein écran"}
                className="pointer-events-auto flex size-10 shrink-0 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20 short:hidden"
              >
                {fullscreen.active ? <Minimize className="size-5" /> : <Maximize className="size-5" />}
              </button>
            ) : null}
          </div>

          {/* Vidéo : le lecteur de la plateforme gère le format (bandes noires). */}
          <div className="relative min-h-0 flex-1">
            {embed ? (
              <iframe
                src={embed.src}
                title={`Lecteur ${display?.platformLabel ?? ""}`}
                className="absolute inset-0 size-full border-0"
                allow={IFRAME_ALLOW}
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            ) : null}
          </div>

          {/* Actions : masquées en paysage pour ne pas couvrir les commandes du lecteur. */}
          {video && display ? (
            <div
              className={cn(
                "flex gap-2 px-3 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]",
                fullscreen.active && "hidden",
                "short:hidden",
              )}
            >
              <a
                href={video.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  trackOpen(video);
                  void fullscreen.exit();
                  onDismiss();
                }}
                className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-white/10 text-[15px] font-medium transition-colors hover:bg-white/20"
              >
                Ouvrir dans {display.platformLabel}
                <ArrowUpRight className="size-4" />
              </a>
              {video.status === "pending" ? (
                <button
                  type="button"
                  onClick={() => {
                    void fullscreen.exit();
                    onDismiss();
                    void markViewed(video);
                  }}
                  className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-white text-[15px] font-medium text-black transition-colors hover:bg-white/90"
                >
                  <Check className="size-4" /> Marquer comme vue
                </button>
              ) : null}
            </div>
          ) : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/* ----------------------------------------------------------------------------
 * Aperçu Instagram
 * ------------------------------------------------------------------------- */

function PreviewSheet({
  open,
  video,
  embed,
  frameKey,
  onClose,
  onDismiss,
}: {
  open: boolean;
  video: Video | undefined;
  embed: EmbedInfo | null;
  frameKey: number;
  onClose: () => void;
  onDismiss: () => void;
}) {
  const display = video ? describeVideo(video) : null;
  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title={display?.title ?? ""}
      description={
        display ? [display.platformLabel, video?.creator].filter(Boolean).join(" · ") : undefined
      }
      className="data-[vaul-drawer-direction=bottom]:max-h-[94dvh] sm:max-w-lg"
      footer={video && embed ? <PreviewActions video={video} onDismiss={onDismiss} /> : undefined}
    >
      {video && embed ? (
        <div className="flex flex-col items-center gap-3">
          <p className="flex items-start gap-2 self-stretch rounded-lg bg-muted/70 px-2.5 py-2 text-xs text-muted-foreground">
            <Info className="mt-px size-3.5 shrink-0" />
            Instagram ne permet pas de lire ses Reels en dehors de son application : ceci est
            l’aperçu officiel, la lecture s’ouvre dans Instagram, en plein écran.
          </p>
          <div
            key={frameKey}
            className="overflow-hidden rounded-xl bg-white ring-1 ring-border/70"
            style={{ width: "100%", maxWidth: 420, height: "min(50dvh, 560px)" }}
          >
            <iframe
              src={embed.src}
              title={`Aperçu ${display?.platformLabel ?? ""}`}
              className="size-full border-0"
              allow={IFRAME_ALLOW}
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
        </div>
      ) : null}
    </ResponsiveSheet>
  );
}

function PreviewActions({ video, onDismiss }: { video: Video; onDismiss: () => void }) {
  const display = describeVideo(video);
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
        className={cn(buttonVariants({ variant: "default", size: "lg" }), "h-11 rounded-xl text-[15px]")}
      >
        Regarder dans {display.platformLabel}
        <ArrowUpRight data-icon="inline-end" />
      </a>
      {video.status === "pending" ? (
        <Button
          variant="secondary"
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
