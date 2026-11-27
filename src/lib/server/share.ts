import "server-only";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { Video } from "@/types";
import { parseVideoUrl } from "@/lib/platforms";
import { fetchVideoMetadata } from "@/lib/metadata/server";
import { describeVideo } from "@/lib/videos";

/**
 * Ajout d'une vidéo depuis le Raccourci iOS, partagé par les deux adresses :
 *   POST /api/share            (clé dans l'en-tête Authorization, corps JSON)
 *   GET  /api/share/<clé>?url= (adresse personnelle, sans aucune option)
 */

// Résolues au build par next.config.ts, quel que soit le nom des variables d'environnement.
const SUPABASE_URL = process.env.REELQUEUE_SUPABASE_URL;
const SUPABASE_KEY = process.env.REELQUEUE_SUPABASE_KEY;

export interface ShareResult {
  httpStatus: number;
  ok: boolean;
  status: string;
  /** Phrase prête à afficher dans la notification du Raccourci. */
  message: string;
}

type RpcStatus = "added" | "duplicate" | "requeued" | "invalid_token";

export async function shareVideo(token: string | null | undefined, sharedText: string): Promise<ShareResult> {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return { httpStatus: 501, ok: false, status: "not_configured", message: "ReelQueue n’est pas relié à Supabase." };
  }
  if (!token) {
    return {
      httpStatus: 401,
      ok: false,
      status: "missing_token",
      message: "Clé manquante : recopie l’adresse personnelle depuis ReelQueue › Compte › Raccourci iOS.",
    };
  }

  const parsed = parseVideoUrl(sharedText);
  if (!parsed.ok) {
    return { httpStatus: 400, ok: false, status: "invalid_url", message: "Aucun lien trouvé dans ce partage." };
  }
  const link = parsed.value;

  // Titre, auteur et miniature tout de suite : la carte est complète à l'ouverture de l'app.
  const metadata = await fetchVideoMetadata(link).catch(() => null);

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await supabase.rpc("add_shared_video", {
    p_token_hash: createHash("sha256").update(token).digest("hex"),
    p_url: link.url,
    p_canonical_url: link.canonicalUrl,
    p_platform: link.platform,
    p_title: metadata?.title ?? null,
    p_creator: metadata?.creator ?? link.creator,
    p_thumbnail_url: metadata?.thumbnailUrl ?? link.thumbnailUrl,
  });

  if (error) {
    console.error("[share]", error.code, error.message);
    // Fonction absente : la base n'a pas été installée (supabase/setup.sql).
    if (error.code === "PGRST202" || error.code === "42883") {
      return {
        httpStatus: 503,
        ok: false,
        status: "database_not_ready",
        message: "Base pas encore à jour : applique les migrations Supabase de ReelQueue.",
      };
    }
    return {
      httpStatus: 500,
      ok: false,
      status: "server_error",
      message: "Enregistrement impossible pour le moment. Réessaie dans un instant.",
    };
  }

  const result = (data ?? {}) as { status?: RpcStatus; title?: string | null };
  // Même titre de repli que dans l'app (« Reel Instagram de @compte »).
  const title = describeVideo({
    id: "",
    user_id: "",
    url: link.url,
    canonical_url: link.canonicalUrl,
    platform: link.platform,
    title: result.title ?? metadata?.title ?? null,
    thumbnail_url: null,
    creator: metadata?.creator ?? link.creator,
    status: "pending",
    is_favorite: false,
    note: null,
    added_at: new Date().toISOString(),
    opened_at: null,
    viewed_at: null,
    collection_ids: [],
  } satisfies Video).title;

  switch (result.status) {
    case "added":
      return { httpStatus: 200, ok: true, status: "added", message: `Ajouté à ReelQueue : ${title}` };
    case "requeued":
      return { httpStatus: 200, ok: true, status: "requeued", message: `Remis dans « À regarder » : ${title}` };
    case "duplicate":
      return { httpStatus: 200, ok: true, status: "duplicate", message: `Déjà dans « À regarder » : ${title}` };
    case "invalid_token":
      return {
        httpStatus: 401,
        ok: false,
        status: "invalid_token",
        message: "Clé invalide ou remplacée : recrée-la dans ReelQueue › Compte › Raccourci iOS.",
      };
    default:
      return { httpStatus: 500, ok: false, status: "server_error", message: "Réponse inattendue du serveur." };
  }
}
