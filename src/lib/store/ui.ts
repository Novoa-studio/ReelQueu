"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type SheetData =
  | { type: "add" }
  | { type: "note"; videoId: string }
  | { type: "collections"; videoId: string }
  | { type: "collection-form"; collectionId?: string }
  | { type: "account" };

export type QueueSort = "added_desc" | "added_asc";

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
  /** Préférences d'affichage, conservées sur l'appareil. */
  queueSort: QueueSort;
  toggleQueueSort: () => void;
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
      queueSort: "added_desc",
      toggleQueueSort: () =>
        set((s) => ({ queueSort: s.queueSort === "added_desc" ? "added_asc" : "added_desc" })),
      demoNoticeDismissed: false,
      dismissDemoNotice: () => set({ demoNoticeDismissed: true }),
    }),
    {
      name: "reelqueue:ui:v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ queueSort: s.queueSort, demoNoticeDismissed: s.demoNoticeDismissed }),
      // Réhydratation déclenchée après le montage, pour que le HTML prérendu corresponde.
      skipHydration: true,
    },
  ),
);

export function useSheetOpen(type: SheetData["type"]): boolean {
  return useUI((s) => s.sheetOpen && s.sheet?.type === type);
}
