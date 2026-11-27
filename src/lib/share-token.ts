"use client";

import { getSupabase } from "@/lib/supabase/client";

/**
 * Clé d'ajout du Raccourci iOS. Générée dans le navigateur, montrée une seule
 * fois ; seule son empreinte SHA-256 est envoyée à la base.
 */

export interface ShareTokenInfo {
  createdAt: string;
  lastUsedAt: string | null;
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function getShareTokenInfo(): Promise<ShareTokenInfo | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("share_tokens")
    .select("created_at, last_used_at")
    .maybeSingle();
  if (error || !data) return null;
  return { createdAt: data.created_at as string, lastUsedAt: (data.last_used_at as string) ?? null };
}

/** Crée (ou remplace) la clé et la renvoie en clair, pour affichage unique. */
export async function createShareToken(): Promise<string> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("not_configured");
  if (!crypto?.subtle) throw new Error("insecure_context");
  const token = `rq_${base64Url(crypto.getRandomValues(new Uint8Array(32)))}`;
  const { error } = await supabase.rpc("rotate_share_token", { p_token_hash: await sha256Hex(token) });
  if (error) throw new Error(error.message);
  return token;
}

export async function revokeShareToken(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;
  const { error } = await supabase.from("share_tokens").delete().eq("user_id", data.user.id);
  if (error) throw new Error(error.message);
}
