"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronUp,
  Link as LinkIcon,
  Maximize,
  Minimize,
  Play,
  RotateCcw,
  Star,
  StickyNote,
  Trash,
} from "lucide-react";
import type { Video } from "@/types";
import { GlassIconButton } from "@/components/common/glass-button";
import { useLibrary } from "@/lib/store/library";
import { useUI, type CinemaState } from "@/lib/store/ui";
import { describeVideo, formatRelativeDate } from "@/lib/videos";
import { copyLink, deleteVideo, markPending, markViewed, recordOpen, toggleFavorite } from "@/lib/video-actions";
import { trackOpen, OPENED_VIEWED_EVENT } from "@/lib/open-tracking";
import { useFullscreen } from "@/hooks/use-fullscreen";
import { cn } from "@/lib/utils";

/** Durée minimale de lecture dans l'app avant le passage automatique en « Vue ». */
const AUTO_VIEW_AFTER_MS = 10_000;

const IFRAME_ALLOW = "autoplay; encrypted-media; picture-in-picture; fullscreen; clipboard-write";

/** Couverture en haute définition (le relais Instagram sert une version plus grande). */
function coverUrl(video: Video): string | null {
  const thumb = video.thumbnail_url;
  if (!thumb) return null;
  return thumb.startsWith("/api/thumbnail/instagram/") ? `${thumb}?size=l` : thumb;
}

/**
 * Mode cinéma : visionnage plein écran, une vidéo par écran, défilement
 * vertical comme dans Reels. Instagram : grande couverture et bouton
 * « Regarder dans Instagram » ; au retour, la vidéo passe en « Vue » et la
 * suivante arrive. YouTube, TikTok, Vimeo : lecture sur place.
 */
export function CinemaViewer() {
  const cinema = useUI((s) => s.cinema);
  const closeCinema = useUI((s) => s.closeCinema);

  return (
    <DialogPrimitive.Root open={Boolean(cinema)} onOpenChange={(open) => !open && closeCinema()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black data-open:animate-in data-open:fade-in-0" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed inset-0 z-50 bg-black text-white outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-[0.97] data-open:duration-300"
        >
          <DialogPrimitive.Title className="sr-only">Mode cinéma</DialogPrimitive.Title>
          {cinema ? <CinemaStage key={cinema.key} cinema={cinema} onClose={closeCinema} /> : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/** Défile jusqu'à la vidéo `index` (bornée à la liste). */
function scrollToIndex(el: HTMLElement | null, index: number, count: number) {
  if (!el || count === 0) return;
  const target = Math.max(0, Math.min(index, count - 1));
  el.scrollTo({ top: target * el.clientHeight, behavior: "smooth" });
}

function CinemaStage({ cinema, onClose }: { cinema: CinemaState; onClose: () => void }) {
  const videos = useLibrary((s) => s.videos);
  const byId = useMemo(() => new Map(videos.map((v) => [v.id, v])), [videos]);
  // Ordre figé à l'ouverture ; une vidéo supprimée disparaît simplement.
  const ids = useMemo(() => cinema.ids.filter((id) => byId.has(id)), [cinema.ids, byId]);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(() => Math.max(0, ids.indexOf(cinema.startId)));
  const activeIndex = Math.min(active, Math.max(0, ids.length - 1));
  const activeId = ids[activeIndex];
  const fullscreen = useFullscreen();

  const activeRef = useRef(activeIndex);
  const idsRef = useRef(ids);
  useEffect(() => {
    activeRef.current = activeIndex;
    idsRef.current = ids;
  });

  // Position de départ : la vidéo touchée.
  const startIndexRef = useRef(activeIndex);
  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = startIndexRef.current * el.clientHeight;
  }, []);

  function goTo(index: number) {
    scrollToIndex(scrollerRef.current, index, ids.length);
  }

  // Vidéo à l'écran = position de défilement (accroche magnétique d'un écran).
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setActive(Math.round(el.scrollTop / Math.max(1, el.clientHeight))));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("scroll", onScroll);
    };
  }, []);

  // Clavier (ordinateur) : flèches et j / k.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && /input|textarea/i.test(event.target.tagName)) return;
      if (["ArrowDown", "PageDown", "j"].includes(event.key)) {
        event.preventDefault();
        scrollToIndex(scrollerRef.current, activeRef.current + 1, idsRef.current.length);
      } else if (["ArrowUp", "PageUp", "k"].includes(event.key)) {
        event.preventDefault();
        scrollToIndex(scrollerRef.current, activeRef.current - 1, idsRef.current.length);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Retour d'Instagram : la vidéo vient de passer en « Vue », on enchaîne.
  useEffect(() => {
    const onViewed = (event: Event) => {
      const viewedIds = (event as CustomEvent<{ ids: string[] }>).detail?.ids ?? [];
      const current = idsRef.current[activeRef.current];
      if (current && viewedIds.includes(current)) {
        setTimeout(() => scrollToIndex(scrollerRef.current, activeRef.current + 1, idsRef.current.length), 650);
      }
    };
    window.addEventListener(OPENED_VIEWED_EVENT, onViewed);
    return () => window.removeEventListener(OPENED_VIEWED_EVENT, onViewed);
  }, []);

  // Lecture sur place : « Vue » si la vidéo est restée à l'écran au moins 10 s.
  const activeInline = activeId ? Boolean(describeVideo(byId.get(activeId)!).embed?.inline) : false;
  useEffect(() => {
    if (!activeId || !activeInline) return;
    const started = Date.now();
    const current = useLibrary.getState().videos.find((v) => v.id === activeId);
    if (current) recordOpen(current);
    return () => {
      const latest = useLibrary.getState().videos.find((v) => v.id === activeId);
      if (latest?.status === "pending" && Date.now() - started >= AUTO_VIEW_AFTER_MS) void markViewed(latest);
    };
  }, [activeId, activeInline]);

  function close() {
    void fullscreen.exit();
    onClose();
  }

  return (
    <div ref={stageRef} className="relative h-full w-full">
      <div
        ref={scrollerRef}
        className="h-full w-full snap-y snap-mandatory overflow-y-auto overscroll-contain scrollbar-none"
      >
        {ids.length ? (
          ids.map((id, index) => (
            <CinemaSlide
              key={id}
              video={byId.get(id)!}
              active={index === activeIndex}
              near={Math.abs(index - activeIndex) <= 1}
            />
          ))
        ) : (
          <div className="flex h-full items-center justify-center text-white/70">Plus rien à regarder ici.</div>
        )}
      </div>

      {/* Barre du haut */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center gap-2 px-3 pt-[calc(env(safe-area-inset-top)+0.625rem)]">
        <GlassIconButton dark onClick={close} aria-label="Fermer le mode cinéma" className="pointer-events-auto">
          <ChevronDown />
        </GlassIconButton>
        <span className="glass-dark rounded-full px-3 py-1.5 text-xs font-medium tabular-nums">
          {ids.length ? `${activeIndex + 1} / ${ids.length}` : "0 / 0"}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <GlassIconButton
            dark
            onClick={() => goTo(activeIndex - 1)}
            disabled={activeIndex === 0}
            aria-label="Vidéo précédente"
            className="pointer-events-auto hidden md:inline-flex"
          >
            <ChevronUp />
          </GlassIconButton>
          <GlassIconButton
            dark
            onClick={() => goTo(activeIndex + 1)}
            disabled={activeIndex >= ids.length - 1}
            aria-label="Vidéo suivante"
            className="pointer-events-auto hidden md:inline-flex"
          >
            <ChevronDown />
          </GlassIconButton>
          {fullscreen.supported ? (
            <GlassIconButton
              dark
              onClick={() => (fullscreen.active ? void fullscreen.exit() : void fullscreen.enter(stageRef.current))}
              aria-label={fullscreen.active ? "Quitter le plein écran" : "Plein écran"}
              className="pointer-events-auto hidden md:inline-flex"
            >
              {fullscreen.active ? <Minimize /> : <Maximize />}
            </GlassIconButton>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function CinemaCover({ src, className }: { src: string | null; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return null;
  return (
    // Images de plateformes tierces relayées : next/image n'apporte rien ici.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}

function CinemaSlide({ video, active, near }: { video: Video; active: boolean; near: boolean }) {
  const display = describeVideo(video);
  const embed = display.embed;
  const cover = coverUrl(video);
  const portrait = embed
    ? embed.portrait
    : display.kind === "reel" || display.kind === "short" || ["instagram", "tiktok"].includes(video.platform);
  const pending = video.status === "pending";

  return (
    <section
      aria-label={display.title}
      className="relative h-full w-full snap-start snap-always overflow-hidden"
    >
      {/* Ambiance : la couverture, très floutée, remplit l'écran. */}
      {near ? (
        cover ? (
          <CinemaCover
            src={cover}
            className="absolute inset-0 size-full scale-125 object-cover opacity-60 blur-3xl saturate-150"
          />
        ) : (
          <div
            className="absolute inset-0 opacity-70"
            style={{ backgroundImage: `radial-gradient(70% 50% at 50% 40%, ${display.platformColor}, transparent 75%)` }}
          />
        )
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/15 to-black/90" />

      {/* Média */}
      <div className="absolute inset-0 flex items-center justify-center px-4 pt-[calc(env(safe-area-inset-top)+4rem)] pb-[calc(env(safe-area-inset-bottom)+10.5rem)] short:py-3">
        <div
          className={cn(
            "relative overflow-hidden rounded-[28px] bg-white/5 shadow-[0_30px_90px_-20px_rgba(0,0,0,0.85)] ring-1 ring-white/10",
            portrait ? "aspect-[9/16] h-full max-h-[820px] max-w-full" : "aspect-video max-h-full w-full max-w-3xl",
          )}
        >
          {embed?.inline && active ? (
            <iframe
              src={embed.src}
              title={`Lecteur ${display.platformLabel}`}
              className="absolute inset-0 size-full border-0"
              allow={IFRAME_ALLOW}
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          ) : near ? (
            <CinemaCover src={cover} className="absolute inset-0 size-full object-cover" />
          ) : null}

          {!embed?.inline ? (
            // Instagram : la lecture se fait dans l'app d'origine ; au retour, « Vue » et vidéo suivante.
            <a
              href={video.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackOpen(video)}
              className="group absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/10"
            >
              <span className="glass-dark flex size-20 items-center justify-center rounded-full transition-transform group-active:scale-95">
                <Play className="size-8 translate-x-0.5 fill-current" />
              </span>
              <span className="glass-dark inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold">
                Regarder dans {display.platformLabel}
                <ArrowUpRight className="size-4" />
              </span>
            </a>
          ) : !active ? (
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="glass-dark flex size-16 items-center justify-center rounded-full">
                <Play className="size-7 translate-x-0.5 fill-current" />
              </span>
            </span>
          ) : null}
        </div>
      </div>

      {/* Infos et actions */}
      <div className="absolute inset-x-0 bottom-0 flex items-end gap-3 px-4 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] short:hidden">
        <div className="min-w-0 flex-1">
          <span className="glass-dark inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium">
            <span className="size-2 rounded-full" style={{ backgroundColor: display.platformColor }} />
            {display.platformLabel}
            {!pending ? (
              <>
                <span aria-hidden>·</span>
                <Check className="size-3" /> Vue
              </>
            ) : null}
          </span>
          <h2 className="mt-2 line-clamp-3 text-xl leading-snug font-semibold tracking-[-0.01em] drop-shadow-md">
            {display.title}
          </h2>
          <p className="mt-1 truncate text-sm text-white/70">
            {[video.creator, `ajoutée ${formatRelativeDate(video.added_at)}`].filter(Boolean).join(" · ")}
          </p>
          {video.note ? (
            <p className="mt-2 flex max-w-full items-start gap-1.5 text-sm text-white/80">
              <StickyNote className="mt-0.5 size-3.5 shrink-0" />
              <span className="line-clamp-2">{video.note}</span>
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col gap-2.5">
          <GlassIconButton
            dark
            onClick={() => void toggleFavorite(video)}
            aria-label={video.is_favorite ? "Retirer des favoris" : "Ajouter aux favoris"}
            aria-pressed={video.is_favorite}
            className="size-12"
          >
            <Star className={cn(video.is_favorite && "fill-[var(--favorite)] text-[var(--favorite)]")} />
          </GlassIconButton>
          <GlassIconButton
            dark
            onClick={() => void (pending ? markViewed(video) : markPending(video))}
            aria-label={pending ? "Marquer comme vue" : "Remettre à regarder"}
            className="size-12"
          >
            {pending ? <Check /> : <RotateCcw />}
          </GlassIconButton>
          <GlassIconButton dark onClick={() => void copyLink(video)} aria-label="Copier le lien" className="size-12">
            <LinkIcon />
          </GlassIconButton>
          <GlassIconButton dark onClick={() => void deleteVideo(video)} aria-label="Supprimer" className="size-12">
            <Trash />
          </GlassIconButton>
        </div>
      </div>
    </section>
  );
}
