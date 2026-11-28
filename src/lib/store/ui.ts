"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type SheetData =
  | { type: "add"; initialUrl?: string }
  | { type: "note"; videoId: string }
  | { type: "collections"; videoId: string }
  | { type: "collection-form"; collectionId?: string }
  | { type: "account" };

export type QueueSort = "added_desc" | "added_asc";
export type ViewMode = "list" | "grid";

/**
 * Mode cinéma : visionnage plein écran, vidéo par vidéo. `ids` est figé à
 * l'ouverture (ordre de la liste d'origine) pour que les vidéos ne
 * disparaissent pas pendant qu'on les regarde.
 */
export interface CinemaState {
  ids: string[];
  startId: string;
  key: number;
}

interface UIState {
  /**
   * Dernière feuille demandée. Elle reste renseignée pendant l'animation de
   * fermeture ; `sheetOpen` pilote la visibilité, `sheetKey` réinitialise
   * les formulaires à chaque ouverture.
   */
  sheet: SheetData | null;
  sheetOpen: boolean;
  sheetKey: number;
  openSheet: (sheet: SheetData) => void;
  closeSheet: () => void;
  cinema: CinemaState | null;
  openCinema: (ids: string[], startId: string) => void;
  closeCinema: () => void;
  /** Préférences d'affichage, conservées sur l'appareil. */
  queueSort: QueueSort;
  toggleQueueSort: () => void;
  viewMode: ViewMode;
  toggleViewMode: () => void;
  demoNoticeDismissed: boolean;
  dismissDemoNotice: () => void;
}

export const useUI = create<UIState>()(
  persist(
    (set) => ({
      sheet: null,
      sheetOpen: false,
      sheetKey: 0,
      openSheet: (sheet) => set((s) => ({ sheet, sheetOpen: true, sheetKey: s.sheetKey + 1 })),
      closeSheet: () => set({ sheetOpen: false }),
      cinema: null,
      openCinema: (ids, startId) =>
        set((s) => ({
          cinema: { ids: ids.includes(startId) ? ids : [startId, ...ids], startId, key: (s.cinema?.key ?? 0) + 1 },
          sheetOpen: false,
        })),
      closeCinema: () => set({ cinema: null }),
      queueSort: "added_desc",
      toggleQueueSort: () =>
        set((s) => ({ queueSort: s.queueSort === "added_desc" ? "added_asc" : "added_desc" })),
      viewMode: "grid",
      toggleViewMode: () => set((s) => ({ viewMode: s.viewMode === "list" ? "grid" : "list" })),
      demoNoticeDismissed: false,
      dismissDemoNotice: () => set({ demoNoticeDismissed: true }),
    }),
    {
      name: "reelqueue:ui:v1",
      // v1 : la grille devient l'affichage par défaut (bascule unique des préférences existantes).
      version: 1,
      migrate: (persisted, version) => {
        const state = (persisted ?? {}) as Record<string, unknown>;
        return version < 1 ? { ...state, viewMode: "grid" } : state;
      },
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        queueSort: s.queueSort,
        viewMode: s.viewMode,
        demoNoticeDismissed: s.demoNoticeDismissed,
      }),
      // Réhydratation déclenchée après le montage, pour que le HTML prérendu corresponde.
      skipHydration: true,
    },
  ),
);

export function useSheetOpen(type: SheetData["type"]): boolean {
  return useUI((s) => s.sheetOpen && s.sheet?.type === type);
}
