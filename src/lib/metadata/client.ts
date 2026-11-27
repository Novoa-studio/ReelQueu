"use client";

import { getSupabase } from "@/lib/supabase/client";
import type { VideoMetadata } from "./types";

/** Appelle /api/metadata avec le jeton de session. Renvoie null en cas d'échec. */
export async function requestMetadata(url: string): Promise<VideoMetadata | null> {
  const headers: Record<string, string> = {};
  const supabase = getSupabase();
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return null;
    headers.Authorization = `Bearer ${token}`;
  }
  try {
    const res = await fetch(`/api/metadata?url=${encodeURIComponent(url)}`, {
      headers,
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Partial<VideoMetadata>;
    return {
      title: data.title ?? null,
      creator: data.creator ?? null,
      thumbnailUrl: data.thumbnailUrl ?? null,
    };
  } catch {
    return null;
  }
}
