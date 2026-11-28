"use client";

import { useRef, useState, type PointerEvent, type ReactNode } from "react";
import { Check, RotateCcw, Trash } from "lucide-react";
import type { Video } from "@/types";
import { deleteVideo, markPending, markViewed } from "@/lib/video-actions";
import { cn } from "@/lib/utils";

/** Distance minimale (px) avant de décider entre glissement horizontal et défilement. */
const DECIDE_AFTER = 10;
/** Seuil de déclenchement : 35 % de la largeur, plafonné à 120 px. */
const MAX_THRESHOLD = 120;
/** Un geste rapide déclenche aussi l'action, même un peu court. */
const FLICK_VELOCITY = 0.65; // px / ms
const FLICK_MIN_DISTANCE = 60;

type Gesture = {
  pointerId: number;
  startX: number;
  startY: number;
  lastX: number;
  lastT: number;
  velocity: number;
  mode: "pending" | "horizontal" | "vertical";
};

/**
 * Glissement d'une carte en vue liste, façon Mail sur iPhone :
 * - vers la droite : « Vue » (ou « À regarder » si la vidéo est déjà vue) ;
 * - vers la gauche : « Supprimer » (avec « Annuler »).
 * Au toucher uniquement (sur ordinateur, le menu « ⋯ » suffit). Le défilement
 * vertical reste natif grâce à touch-action: pan-y.
 */
export function SwipeableRow({ video, children }: { video: Video; children: ReactNode }) {
  const [dx, setDx] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [width, setWidth] = useState(360);
  const gesture = useRef<Gesture | null>(null);
  const suppressClick = useRef(false);
  const rowRef = useRef<HTMLDivElement>(null);

  const pending = video.status === "pending";
  const threshold = Math.min(MAX_THRESHOLD, width * 0.35);
  const armed = Math.abs(dx) >= threshold;

  function settle(target: number) {
    setAnimating(true);
    setDx(target);
    // Filet de sécurité : sans déplacement réel (déjà à la cible), aucune
    // fin de transition n'arrive ; on libère l'état quand même.
    window.setTimeout(() => setAnimating(false), 260);
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    // Un nouveau geste peut interrompre une animation en cours.
    if (event.pointerType === "mouse") return;
    gesture.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastT: event.timeStamp,
      velocity: 0,
      mode: "pending",
    };
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const g = gesture.current;
    if (!g || g.pointerId !== event.pointerId || g.mode === "vertical") return;
    const moveX = event.clientX - g.startX;
    const moveY = event.clientY - g.startY;

    if (g.mode === "pending") {
      if (Math.abs(moveX) < DECIDE_AFTER && Math.abs(moveY) < DECIDE_AFTER) return;
      if (Math.abs(moveY) >= Math.abs(moveX)) {
        g.mode = "vertical"; // défilement : on laisse faire le navigateur
        return;
      }
      g.mode = "horizontal";
      event.currentTarget.setPointerCapture(event.pointerId);
      setWidth(rowRef.current?.offsetWidth ?? 360);
      setAnimating(false);
    }

    const dt = Math.max(1, event.timeStamp - g.lastT);
    g.velocity = (event.clientX - g.lastX) / dt;
    g.lastX = event.clientX;
    g.lastT = event.timeStamp;
    setDx(moveX);
  }

  function finish(event: PointerEvent<HTMLDivElement>, cancelled = false) {
    const g = gesture.current;
    gesture.current = null;
    if (!g || g.pointerId !== event.pointerId || g.mode !== "horizontal") return;
    // Pas d'« Ouvrir » à la fin d'un glissement ; le blocage expire si aucun clic ne suit.
    suppressClick.current = true;
    window.setTimeout(() => {
      suppressClick.current = false;
    }, 400);

    const distance = event.clientX - g.startX;
    const flick = Math.abs(g.velocity) >= FLICK_VELOCITY && Math.abs(distance) >= FLICK_MIN_DISTANCE;
    const commit = !cancelled && (Math.abs(distance) >= threshold || flick);
    if (!commit) {
      settle(0);
      return;
    }

    const direction = distance > 0 ? 1 : -1;
    settle(direction * (width + 24)); // la carte sort de l'écran…
    window.setTimeout(() => {
      // … puis l'action s'applique (la carte disparaît de la liste, ou revient si elle y reste).
      if (direction > 0) void (pending ? markViewed(video) : markPending(video));
      else void deleteVideo(video);
      window.setTimeout(() => settle(0), 60);
    }, 200);
  }

  const revealRight = dx > 0; // action de gauche (Vue / À regarder)
  const revealLeft = dx < 0; // action de droite (Supprimer)

  return (
    <div ref={rowRef} className="group/swipe relative" data-swiping={dx !== 0 ? "true" : undefined}>
      {dx !== 0 ? (
        <div
          aria-hidden
          className={cn(
            "absolute inset-0 flex items-center rounded-2xl px-6 text-white transition-colors",
            revealRight && (pending ? "justify-start bg-brand" : "justify-start bg-[oklch(0.6_0.12_200)]"),
            revealLeft && "justify-end bg-destructive",
            !armed && "opacity-80",
          )}
        >
          <span
            className={cn(
              "flex flex-col items-center gap-1 text-xs font-semibold transition-transform duration-150",
              armed ? "scale-110" : "scale-90",
            )}
          >
            {revealRight ? (
              pending ? (
                <>
                  <Check className="size-6" strokeWidth={2.5} /> Vue
                </>
              ) : (
                <>
                  <RotateCcw className="size-6" strokeWidth={2.5} /> À regarder
                </>
              )
            ) : (
              <>
                <Trash className="size-6" strokeWidth={2.5} /> Supprimer
              </>
            )}
          </span>
        </div>
      ) : null}

      <div
        style={{
          transform: dx ? `translate3d(${dx}px, 0, 0)` : undefined,
          transition: animating ? "transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1)" : "none",
          touchAction: "pan-y",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(e) => finish(e)}
        onPointerCancel={(e) => finish(e, true)}
        onTransitionEnd={() => setAnimating(false)}
        onClickCapture={(e) => {
          if (suppressClick.current) {
            suppressClick.current = false;
            e.preventDefault();
            e.stopPropagation();
          }
        }}
        className={cn("relative", dx !== 0 && "select-none")}
      >
        {children}
      </div>
    </div>
  );
}
