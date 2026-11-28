"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useLibrary } from "@/lib/store/library";
import { cn } from "@/lib/utils";

/** Distance (après résistance) au-delà de laquelle relâcher actualise. */
const THRESHOLD = 64;
/** Hauteur gardée ouverte pendant l'actualisation. */
const HOLD = 52;
const MAX_PULL = 120;
/** Mouvement minimal vers le bas avant de prendre la main sur le geste. */
const DECIDE_AFTER = 6;
/** Durée minimale de l'indicateur : une actualisation instantanée paraît sans effet. */
const MIN_SPIN_MS = 600;
/** Circonférence de l'anneau de progression (r = 15). */
const RING = 2 * Math.PI * 15;
const EASE = "cubic-bezier(0.2, 0.8, 0.2, 1)";

/** Suit le doigt à moitié jusqu'au seuil, puis de plus en plus difficilement. */
function resist(dy: number) {
  const pull = dy <= 2 * THRESHOLD ? dy / 2 : THRESHOLD + (dy - 2 * THRESHOLD) / 5;
  return Math.min(MAX_PULL, Math.max(0, pull));
}

/**
 * « Tirer pour actualiser », comme sur Instagram ou Safari : en haut de la
 * page, tirer vers le bas puis relâcher resynchronise la bibliothèque.
 * Rend l'élément <main> de l'application ; ne s'active qu'au toucher.
 * Les feuilles et le mode cinéma sont rendus hors de <main> (portails) :
 * leurs gestes ne sont jamais interceptés.
 */
export function PullToRefresh({ className, children }: { className?: string; children: ReactNode }) {
  const rootRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<SVGCircleElement>(null);
  const iconRef = useRef<HTMLSpanElement>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let gesture: { x: number; y: number; pulling: boolean } | null = null;
    let pull = 0;
    let busy = false;
    let disposed = false;
    let frame = 0;

    function paint(value: number, animate: boolean) {
      pull = value;
      const content = contentRef.current;
      const indicator = indicatorRef.current;
      if (!content || !indicator) return;
      const transition = animate ? `transform 320ms ${EASE}, opacity 220ms ease` : "none";
      // Pendant l'actualisation, l'indicateur reste entier (HOLD < THRESHOLD).
      const progress = busy ? 1 : Math.min(1, value / THRESHOLD);
      content.style.transition = transition;
      // Pas de transform au repos : il changerait le repère des éléments fixes.
      content.style.transform = value > 0 ? `translate3d(0, ${value}px, 0)` : "";
      indicator.style.transition = transition;
      indicator.style.opacity = String(progress);
      // Centré dans l'espace libéré entre la barre d'état et le titre.
      indicator.style.transform = `translate3d(-50%, ${value / 2 - 10}px, 0) scale(${0.7 + 0.3 * progress})`;
      if (ringRef.current) ringRef.current.style.strokeDashoffset = String(RING * (1 - progress));
      if (iconRef.current) iconRef.current.style.transform = `rotate(${progress * 270}deg)`;
    }

    function reset() {
      paint(0, true);
      setArmed(false);
    }

    async function run() {
      busy = true;
      setRefreshing(true);
      paint(HOLD, true);
      const started = Date.now();
      const ok = await useLibrary.getState().sync();
      const wait = MIN_SPIN_MS - (Date.now() - started);
      if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
      if (disposed) return;
      if (!ok) {
        toast.error("Actualisation impossible", {
          description: "Vérifiez votre connexion, puis réessayez.",
        });
      }
      busy = false;
      reset();
      setRefreshing(false);
    }

    function onStart(event: TouchEvent) {
      gesture = null;
      if (busy || event.touches.length !== 1 || window.scrollY > 0) return;
      // Une feuille ou une boîte de dialogue ouverte verrouille le défilement.
      if (document.body.hasAttribute("data-scroll-locked")) return;
      const touch = event.touches[0];
      gesture = { x: touch.clientX, y: touch.clientY, pulling: false };
    }

    function onMove(event: TouchEvent) {
      if (!gesture) return;
      const touch = event.touches[0];
      if (!touch || event.touches.length !== 1) {
        onEnd(true);
        return;
      }
      const dx = touch.clientX - gesture.x;
      const dy = touch.clientY - gesture.y;

      if (!gesture.pulling) {
        // Vers le haut : défilement normal. Horizontal : glissement d'une carte.
        if (dy < 0 || window.scrollY > 0) {
          gesture = null;
          return;
        }
        if (Math.abs(dx) > DECIDE_AFTER && Math.abs(dx) > dy) {
          gesture = null;
          return;
        }
        // Pas de rebond natif pendant qu'on décide.
        if (dy > 0 && event.cancelable) event.preventDefault();
        if (dy < DECIDE_AFTER) return;
        gesture.pulling = true;
      }

      if (event.cancelable) event.preventDefault();
      const value = resist(dy);
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => paint(value, false));
      setArmed(value >= THRESHOLD);
    }

    function onEnd(cancelled = false) {
      const current = gesture;
      gesture = null;
      if (!current?.pulling) return;
      cancelAnimationFrame(frame);
      if (!cancelled && pull >= THRESHOLD) void run();
      else reset();
    }

    const onTouchEnd = () => onEnd();
    const onTouchCancel = () => onEnd(true);
    root.addEventListener("touchstart", onStart, { passive: true });
    // Non passif : on doit pouvoir empêcher le rebond natif pendant le geste.
    root.addEventListener("touchmove", onMove, { passive: false });
    root.addEventListener("touchend", onTouchEnd);
    root.addEventListener("touchcancel", onTouchCancel);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      root.removeEventListener("touchstart", onStart);
      root.removeEventListener("touchmove", onMove);
      root.removeEventListener("touchend", onTouchEnd);
      root.removeEventListener("touchcancel", onTouchCancel);
    };
  }, []);

  return (
    <main ref={rootRef} className={cn("relative", className)}>
      <div
        ref={indicatorRef}
        aria-hidden
        className="pointer-events-none absolute top-[env(safe-area-inset-top)] left-1/2 z-40 opacity-0"
        style={{ transform: "translate3d(-50%, -10px, 0) scale(0.7)" }}
      >
        <div
          className={cn(
            "glass relative flex size-10 items-center justify-center rounded-full transition-colors duration-200",
            armed || refreshing ? "text-brand" : "text-muted-foreground",
          )}
        >
          <svg viewBox="0 0 36 36" className="absolute inset-0 size-full -rotate-90">
            <circle
              ref={ringRef}
              cx="18"
              cy="18"
              r="15"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={RING}
              strokeDashoffset={RING}
              className={cn("transition-opacity duration-200", refreshing && "opacity-0")}
            />
          </svg>
          <span ref={iconRef} className="flex">
            <RefreshCw className={cn("size-[18px]", refreshing && "animate-spin")} strokeWidth={2.4} />
          </span>
        </div>
      </div>
      {refreshing ? (
        <span role="status" className="sr-only">
          Actualisation…
        </span>
      ) : null}
      <div ref={contentRef}>{children}</div>
    </main>
  );
}
