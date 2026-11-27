import "server-only";
import { createClient } from "@supabase/supabase-js";

// Résolues au build par next.config.ts, quel que soit le nom des variables d'environnement.
const SUPABASE_URL = process.env.REELQUEUE_SUPABASE_URL;
const SUPABASE_KEY = process.env.REELQUEUE_SUPABASE_KEY;

/**
 * Réserve une route aux utilisateurs connectés (jeton Supabase dans
 * « Authorization: Bearer … »). Renvoie une réponse 401 à retourner telle
 * quelle, ou null si l'accès est autorisé. Sans Supabase (mode local), tout
 * passe.
 */
export async function requireUser(request: Request): Promise<Response | null> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return Response.json({ error: "unauthorized" }, { status: 401 });
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return Response.json({ error: "unauthorized" }, { status: 401 });
  return null;
}
