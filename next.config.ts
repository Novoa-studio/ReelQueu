import type { NextConfig } from "next";

/**
 * Configuration Supabase résolue au build, quel que soit le nom des variables :
 * `.env.local`, variables saisies à la main sur Vercel, ou variables créées par
 * l'intégration Vercel × Supabase (avec ou sans préfixe personnalisé, par
 * exemple `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_URL`, `STORAGE_SUPABASE_URL`).
 * Seules l'URL et la clé publique sont concernées : elles sont faites pour être
 * exposées au navigateur (la sécurité repose sur la RLS).
 */
function firstEnv(exactNames: string[], suffixes: string[]): string {
  for (const name of exactNames) {
    const value = process.env[name];
    if (value) return value;
  }
  const keys = Object.keys(process.env).sort();
  for (const suffix of suffixes) {
    const key = keys.find((k) => k.endsWith(suffix) && process.env[k]);
    if (key) return process.env[key] as string;
  }
  return "";
}

const supabaseUrl = firstEnv(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL"], ["SUPABASE_URL"]);
const supabaseKey = firstEnv(
  [
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_ANON_KEY",
  ],
  ["SUPABASE_PUBLISHABLE_KEY", "SUPABASE_ANON_KEY"],
);

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  env: {
    REELQUEUE_SUPABASE_URL: supabaseUrl,
    REELQUEUE_SUPABASE_KEY: supabaseKey,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
