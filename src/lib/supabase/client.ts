import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Résolues au build par next.config.ts, quel que soit le nom des variables d'environnement.
const SUPABASE_URL = process.env.REELQUEUE_SUPABASE_URL;
const SUPABASE_KEY = process.env.REELQUEUE_SUPABASE_KEY;

/** Sans configuration, l'app fonctionne en mode local (données sur l'appareil). */
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);

let client: SupabaseClient | null = null;

/**
 * Client navigateur unique. Les données sont lues côté client (cache local,
 * consultation hors ligne) : la sécurité repose sur la RLS de la base.
 */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured || typeof window === "undefined") return null;
  if (!client) {
    client = createClient(SUPABASE_URL!, SUPABASE_KEY!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        // Flux implicite : sur iPhone, une PWA installée n'a pas le même
        // stockage que Safari. Un lien reçu par e-mail s'ouvre dans Safari,
        // où le vérificateur PKCE n'existerait pas ; le flux implicite y
        // fonctionne.
        flowType: "implicit",
      },
    });
  }
  return client;
}
