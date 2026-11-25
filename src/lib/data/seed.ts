import type { Collection, CollectionColor, Video, VideoStatus } from "@/types";
import { parseVideoUrl } from "@/lib/platforms";
import { createId } from "@/lib/ids";
import type { LibrarySnapshot } from "./repository";

/**
 * Données de démonstration (phase 1), centrées sur Instagram. Les liens sont
 * fictifs : ils respectent le format d'Instagram mais ne pointent vers aucun
 * contenu réel. Certains n'ont pas de titre, comme ce sera souvent le cas
 * quand Instagram ne fournit pas de métadonnées.
 */

const LOCAL_USER = "local";
const HOUR = 3600 * 1000;

interface SeedVideo {
  url: string;
  title: string | null;
  creator?: string;
  status?: VideoStatus;
  favorite?: boolean;
  note?: string;
  addedHoursAgo: number;
  viewedHoursAgo?: number;
  collections?: string[];
}

const SEED_COLLECTIONS: { key: string; name: string; color: CollectionColor }[] = [
  { key: "business", name: "Business", color: "blue" },
  { key: "cuisine", name: "Cuisine", color: "orange" },
  { key: "sport", name: "Sport", color: "green" },
  { key: "inspiration", name: "Inspiration", color: "violet" },
];

const SEED_VIDEOS: SeedVideo[] = [
  {
    url: "https://www.instagram.com/reel/DEMO0000001/?igsh=ZGVtbw==",
    title: "3 habitudes pour mieux gérer son temps",
    creator: "@productivite.fr",
    favorite: true,
    addedHoursAgo: 2,
    collections: ["business"],
  },
  {
    url: "https://www.instagram.com/cuisine.facile/reel/DEMO0000002/",
    title: "Pâtes crémeuses au citron en 10 minutes",
    note: "À tester samedi",
    addedHoursAgo: 5,
    collections: ["cuisine"],
  },
  {
    url: "https://www.instagram.com/reel/DEMO0000003/",
    title: "Le geste technique qui change tout au tennis",
    creator: "@tennis.lab",
    addedHoursAgo: 26,
    collections: ["sport"],
  },
  {
    url: "https://www.instagram.com/voyages.lents/reel/DEMO0000004/",
    title: null,
    addedHoursAgo: 50,
  },
  {
    url: "https://www.instagram.com/reel/DEMO0000005/?igsh=bWFya2V0",
    title: "Construire une marque personnelle, étape par étape",
    creator: "@studio.marketing",
    addedHoursAgo: 75,
    collections: ["business"],
  },
  {
    url: "https://www.instagram.com/coach.mobilite/reel/DEMO0000006/",
    title: null,
    addedHoursAgo: 98,
    collections: ["sport"],
  },
  {
    url: "https://www.instagram.com/reel/DEMO0000007/",
    title: "Le design d’intérieur japonais expliqué en 60 secondes",
    creator: "@maison.wabi",
    favorite: true,
    addedHoursAgo: 146,
    collections: ["inspiration"],
  },
  {
    url: "https://www.instagram.com/p/DEMO0000008/",
    title: "10 trains de nuit à faire en Europe",
    creator: "@trains.de.nuit",
    addedHoursAgo: 220,
  },
  {
    url: "https://www.instagram.com/reel/DEMO0000009/",
    title: "Pain maison sans pétrissage",
    creator: "@boulange.maison",
    status: "viewed",
    favorite: true,
    note: "Hydratation 75 %, 12 h de pousse au frais.",
    addedHoursAgo: 72,
    viewedHoursAgo: 20,
    collections: ["cuisine"],
  },
  {
    url: "https://www.instagram.com/ecrire.pour.vendre/reel/DEMO0000010/",
    title: "Les bases du copywriting en 8 minutes",
    status: "viewed",
    addedHoursAgo: 120,
    viewedHoursAgo: 48,
    collections: ["business"],
  },
  {
    url: "https://www.instagram.com/run.club.paris/reel/DEMO0000011/",
    title: "Routine d’échauffement avant un 10 km",
    status: "viewed",
    addedHoursAgo: 190,
    viewedHoursAgo: 96,
    collections: ["sport"],
  },
  {
    url: "https://www.instagram.com/reel/DEMO0000012/",
    title: "Lumière du Nord, un court-métrage en 90 secondes",
    creator: "@studio.aurore",
    status: "viewed",
    favorite: true,
    addedHoursAgo: 360,
    viewedHoursAgo: 240,
    collections: ["inspiration"],
  },
  {
    url: "https://www.instagram.com/designnotes/reel/DEMO0000013/",
    title: null,
    status: "viewed",
    addedHoursAgo: 336,
    viewedHoursAgo: 288,
  },
];

export function createSeedSnapshot(now: number = Date.now()): LibrarySnapshot {
  const iso = (hoursAgo: number) => new Date(now - hoursAgo * HOUR).toISOString();

  const collectionIds = new Map<string, string>();
  const collections: Collection[] = SEED_COLLECTIONS.map((c, index) => {
    const id = createId();
    collectionIds.set(c.key, id);
    return {
      id,
      user_id: LOCAL_USER,
      name: c.name,
      color: c.color,
      created_at: iso(400 - index),
    };
  });

  const videos: Video[] = SEED_VIDEOS.flatMap((seed) => {
    const parsed = parseVideoUrl(seed.url);
    if (!parsed.ok) return [];
    const status = seed.status ?? "pending";
    return [
      {
        id: createId(),
        user_id: LOCAL_USER,
        url: parsed.value.url,
        canonical_url: parsed.value.canonicalUrl,
        platform: parsed.value.platform,
        title: seed.title,
        // Identifiants fictifs : pas de miniature distante, on affiche le visuel de repli.
        thumbnail_url: null,
        creator: seed.creator ?? parsed.value.creator,
        status,
        is_favorite: seed.favorite ?? false,
        note: seed.note ?? null,
        added_at: iso(seed.addedHoursAgo),
        opened_at: seed.viewedHoursAgo != null ? iso(seed.viewedHoursAgo + 0.1) : null,
        viewed_at:
          status !== "pending" && seed.viewedHoursAgo != null ? iso(seed.viewedHoursAgo) : null,
        collection_ids: (seed.collections ?? [])
          .map((key) => collectionIds.get(key))
          .filter((id): id is string => Boolean(id)),
      },
    ];
  });

  return { videos, collections, demo: true };
}

export { LOCAL_USER };
