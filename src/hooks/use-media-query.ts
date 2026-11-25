"use client";

import { useCallback, useSyncExternalStore } from "react";

/** Média-requête réactive. Côté serveur (prérendu) elle vaut toujours `false`. */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export function useIsDesktop(): boolean {
  return useMediaQuery("(min-width: 768px)");
}

const noopSubscribe = () => () => {};

/** Vrai uniquement après l'hydratation, sans setState dans un effet. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}
