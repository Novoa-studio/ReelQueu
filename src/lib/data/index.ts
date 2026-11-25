import { getSupabase } from "@/lib/supabase/client";
import type { LibraryRepository } from "./repository";
import { LocalRepository } from "./local-repository";
import { SupabaseRepository } from "./supabase-repository";

/** Supabase si configuré, sinon stockage local avec données de démonstration. */
export function createRepository(userId: string): LibraryRepository {
  const supabase = getSupabase();
  return supabase ? new SupabaseRepository(supabase, userId) : new LocalRepository();
}

export type { LibraryRepository, LibrarySnapshot } from "./repository";
