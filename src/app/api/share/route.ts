import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { Video } from "@/types";
import { parseVideoUrl } from "@/lib/platforms";
import { fetchVideoMetadata } from "@/lib/metadata/server";
import { describeVideo } from "@/lib/videos";

/**
 * POST /api/share — ajout depuis le Raccourci iOS (menu Partager d'Instagram).
 *
 *   Authorization: Bearer <clé d'ajout>
 *   Corps : JSON { "url": "…" } (ou { "text": "…" }), formulaire, ou texte brut.
 *
 * Réponse : { ok, status, message } — `message` est prêt à être affiché dans
 * la notification du Raccourci.
 */

// Résolues au build par next.config.ts, quel que soit le nom des variables d'environnement.
const SUPABASE_URL = process.env.REELQUEUE_SUPABASE_URL;
const SUPABASE_KEY = process.env.REELQUEUE_SUPABASE_KEY;

type ShareStatus = "added" | "duplicate" | "requeued" | "invalid_token";

function reply(status: number, body: { ok: boolean; status: string; message: string }) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

async function readSharedText(request: Request): Promise<string> {
  const type = request.headers.get("content-type") ?? "";
  try {
    if (type.includes("application/json")) {
      const body = (await request.json()) as Record<string, unknown>;
      const value = body.url ?? body.text ?? body.link ?? "";
      return typeof value === "string" ? value : String(value ?? "");
    }
    if (type.includes("form")) {
      const form = await request.formData();
      return String(form.get("url") ?? form.get("text") ?? "");
    }
    return (await request.text()).slice(0, 4000);
  } catch {
    return "";
  }
}

export async function POST(request: Request) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return reply(501, { ok: false, status: "not_configured", message: "ReelQueue n’est pas relié à Supabase." });
  }

  const token = request.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token) {
    return reply(401, {
      ok: false,
      status: "missing_token",
      message: "Clé manquante : vérifie l’en-tête Authorization du Raccourci.",
    });
  }

  const parsed = parseVideoUrl(await readSharedText(request));
  if (!parsed.ok) {
    return reply(400, { ok: false, status: "invalid_url", message: "Aucun lien trouvé dans ce partage." });
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
    console.error("[api/share]", error.code, error.message);
    // Fonction absente : la migration share_tokens n'a pas été appliquée.
    if (error.code === "PGRST202" || error.code === "42883") {
      return reply(503, {
        ok: false,
        status: "database_not_ready",
        message: "Base pas encore à jour : applique les migrations Supabase de ReelQueue.",
      });
    }
    return reply(500, {
      ok: false,
      status: "server_error",
      message: "Enregistrement impossible pour le moment. Réessaie dans un instant.",
    });
  }

  const result = (data ?? {}) as { status?: ShareStatus; title?: string | null };
  // Même titre de repli que dans l'app (« Reel Instagram de @compte »).
  const display = describeVideo({
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
  } satisfies Video);

  switch (result.status) {
    case "added":
      return reply(200, { ok: true, status: "added", message: `Ajouté à ReelQueue : ${display.title}` });
    case "requeued":
      return reply(200, { ok: true, status: "requeued", message: `Remis dans « À regarder » : ${display.title}` });
    case "duplicate":
      return reply(200, { ok: true, status: "duplicate", message: `Déjà dans « À regarder » : ${display.title}` });
    case "invalid_token":
      return reply(401, {
        ok: false,
        status: "invalid_token",
        message: "Clé invalide ou remplacée : recrée-la dans ReelQueue › Compte › Raccourci iOS.",
      });
    default:
      return reply(500, { ok: false, status: "server_error", message: "Réponse inattendue du serveur." });
  }
}
