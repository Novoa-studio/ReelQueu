import type { MetadataRoute } from "next";

/**
 * Manifest de la PWA : nom, couleurs et icônes à l'installation.
 * Icônes générées par `npm run icons` (scripts/generate-icons.mjs).
 * Sur iPhone, l'icône d'écran d'accueil vient de src/app/apple-icon.png.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "ReelQueue",
    short_name: "ReelQueue",
    description: "Votre file d’attente pour les Reels Instagram et vidéos à regarder plus tard.",
    lang: "fr",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#faf9f6",
    theme_color: "#faf9f6",
    categories: ["entertainment", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
