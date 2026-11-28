"use client";

import { useSyncExternalStore } from "react";

type FullscreenDocument = Document & {
  webkitFullscreenEnabled?: boolean;
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};
type FullscreenElement = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };

function subscribe(onChange: () => void) {
  document.addEventListener("fullscreenchange", onChange);
  document.addEventListener("webkitfullscreenchange", onChange);
  return () => {
    document.removeEventListener("fullscreenchange", onChange);
    document.removeEventListener("webkitfullscreenchange", onChange);
  };
}

function isActive(): boolean {
  const doc = document as FullscreenDocument;
  return Boolean(doc.fullscreenElement ?? doc.webkitFullscreenElement);
}

/**
 * Plein écran système. Indisponible sur iPhone (Safari ne l'autorise que pour
 * une balise vidéo native) : l'interface occupe alors tout l'écran par
 * elle-même, et le bouton plein écran du lecteur de la plateforme reste
 * utilisable.
 */
export function useFullscreen() {
  const supported = useSyncExternalStore(
    () => () => {},
    () => {
      const doc = document as FullscreenDocument;
      return Boolean(doc.fullscreenEnabled ?? doc.webkitFullscreenEnabled);
    },
    () => false,
  );
  const active = useSyncExternalStore(subscribe, isActive, () => false);

  async function enter(element: HTMLElement | null) {
    const el = element as FullscreenElement | null;
    try {
      if (el?.requestFullscreen) await el.requestFullscreen();
      else await el?.webkitRequestFullscreen?.();
    } catch {
      /* refusé par le navigateur : l'interface reste plein écran dans la page */
    }
  }

  async function exit() {
    if (!isActive()) return;
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
