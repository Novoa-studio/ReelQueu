import type { CollectionColor } from "@/types";

/** Teintes douces, lisibles sur fond clair comme sombre. */
export const COLLECTION_COLOR_VALUES: Record<CollectionColor, { label: string; value: string }> = {
  gray: { label: "Gris", value: "oklch(0.62 0.015 265)" },
  red: { label: "Rouge", value: "oklch(0.64 0.16 25)" },
  orange: { label: "Orange", value: "oklch(0.7 0.14 55)" },
  amber: { label: "Ambre", value: "oklch(0.77 0.13 85)" },
  green: { label: "Vert", value: "oklch(0.66 0.12 150)" },
  teal: { label: "Turquoise", value: "oklch(0.66 0.09 195)" },
  blue: { label: "Bleu", value: "oklch(0.62 0.13 245)" },
  violet: { label: "Violet", value: "oklch(0.6 0.14 290)" },
  pink: { label: "Rose", value: "oklch(0.68 0.14 350)" },
};

export function collectionColor(color: CollectionColor): string {
  return (COLLECTION_COLOR_VALUES[color] ?? COLLECTION_COLOR_VALUES.gray).value;
}

export const COLLECTION_NAME_MAX = 40;
