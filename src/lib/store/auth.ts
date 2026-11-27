"use client";

import { create } from "zustand";
import type { AuthError, Session } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { LOCAL_USER } from "@/lib/data/seed";

export type AuthStatus = "loading" | "signed-in" | "signed-out";

export interface AuthUser {
  id: string;
  email: string | null;
}

export type AuthResult = { ok: true } | { ok: false; message: string };

interface AuthState {
  mode: "supabase" | "local";
  status: AuthStatus;
  user: AuthUser | null;
  /** Arrivée par un lien « mot de passe oublié » : on doit choisir un nouveau mot de passe. */
  recovery: boolean;
  init: () => void;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  /** Connexion (ou création de compte) avec Google ; le navigateur quitte la page en cas de succès. */
  signInWithGoogle: () => Promise<AuthResult>;
  signUp: (email: string, password: string) => Promise<AuthResult & { needsConfirmation?: boolean }>;
  sendPasswordReset: (email: string) => Promise<AuthResult>;
  updatePassword: (password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  clearRecovery: () => void;
}

export const MIN_PASSWORD_LENGTH = 8;

const MESSAGES: Record<string, string> = {
  invalid_credentials: "E-mail ou mot de passe incorrect.",
  email_not_confirmed:
    "Adresse pas encore confirmée : ouvrez le lien reçu par e-mail, puis reconnectez-vous.",
  user_already_exists: "Un compte existe déjà avec cette adresse. Connectez-vous.",
  email_exists: "Un compte existe déjà avec cette adresse. Connectez-vous.",
  weak_password: `Mot de passe trop faible : ${MIN_PASSWORD_LENGTH} caractères minimum.`,
  over_email_send_rate_limit: "Trop d’e-mails envoyés. Réessayez dans quelques minutes.",
  over_request_rate_limit: "Trop de tentatives. Patientez un instant.",
  email_address_invalid: "Adresse e-mail invalide.",
  validation_failed: "Adresse e-mail invalide.",
  signup_disabled: "Les inscriptions sont désactivées pour ce projet.",
  email_address_not_authorized:
    "Supabase refuse d’envoyer un e-mail à cette adresse (SMTP par défaut limité aux membres du projet).",
  same_password: "Choisissez un mot de passe différent de l’ancien.",
  session_not_found: "Session expirée. Reconnectez-vous.",
};

function messageFor(error: AuthError | Error): string {
  const offline = typeof navigator !== "undefined" && navigator.onLine === false;
  if (offline || /failed to fetch|load failed|networkerror/i.test(error.message)) {
    return "Pas de connexion internet.";
  }
  const code = "code" in error && typeof error.code === "string" ? error.code : undefined;
  return (code && MESSAGES[code]) || error.message || "Une erreur est survenue.";
}

function userFrom(session: Session | null): AuthUser | null {
  return session?.user ? { id: session.user.id, email: session.user.email ?? null } : null;
}

function redirectUrl(path: string) {
  return `${window.location.origin}${path}`;
}

let providerSettings: Promise<Record<string, boolean> | null> | null = null;

/**
 * Fournisseurs de connexion activés dans Supabase (endpoint public
 * /auth/v1/settings). null si l'information est indisponible.
 */
export async function isProviderEnabled(provider: string): Promise<boolean | null> {
  const url = process.env.REELQUEUE_SUPABASE_URL;
  const key = process.env.REELQUEUE_SUPABASE_KEY;
  if (!url || !key) return false;
  providerSettings ??= fetch(`${url}/auth/v1/settings`, {
    headers: { apikey: key },
    signal: AbortSignal.timeout(6000),
  })
    .then((res) => (res.ok ? res.json() : null))
    .then((data: { external?: Record<string, boolean> } | null) => data?.external ?? null)
    .catch(() => null);
  const external = await providerSettings;
  if (!external) {
    providerSettings = null; // nouvel essai la prochaine fois
    return null;
  }
  return Boolean(external[provider]);
}

let initialized = false;

export const useAuth = create<AuthState>()((set, get) => ({
  mode: isSupabaseConfigured ? "supabase" : "local",
  status: "loading",
  user: null,
  recovery: false,

  init() {
    if (initialized) return;
    initialized = true;
    const supabase = getSupabase();
    if (!supabase) {
      set({ status: "signed-in", user: { id: LOCAL_USER, email: null } });
      return;
    }
    // Ne pas appeler d'autres méthodes Supabase dans ce callback (verrou interne).
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") set({ recovery: true });
      const user = userFrom(session);
      set({ user, status: user ? "signed-in" : "signed-out" });
    });
    // La session est lue dans le stockage local : disponible même hors ligne.
    void supabase.auth.getSession().then(({ data }) => {
      const user = userFrom(data.session);
      set({ user, status: user ? "signed-in" : "signed-out" });
    });
  },

  async signIn(email, password) {
    const supabase = getSupabase();
    if (!supabase) return { ok: false, message: "Supabase n’est pas configuré." };
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    return error ? { ok: false, message: messageFor(error) } : { ok: true };
  },

  async signInWithGoogle() {
    const supabase = getSupabase();
    if (!supabase) return { ok: false, message: "Supabase n’est pas configuré." };
    // Fournisseur désactivé : Supabase afficherait une page d'erreur brute.
    const enabled = await isProviderEnabled("google");
    if (enabled === false) {
      return {
        ok: false,
        message:
          "La connexion Google n’est pas encore activée (Supabase › Authentication › Providers › Google).",
      };
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUrl("/login"),
        queryParams: { prompt: "select_account" },
      },
    });
    return error ? { ok: false, message: messageFor(error) } : { ok: true };
  },

  async signUp(email, password) {
    const supabase = getSupabase();
    if (!supabase) return { ok: false, message: "Supabase n’est pas configuré." };
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: redirectUrl("/login") },
    });
    if (error) return { ok: false, message: messageFor(error) };
    // Adresse déjà inscrite : Supabase renvoie un utilisateur sans identité (anti-énumération).
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      return { ok: false, message: MESSAGES.user_already_exists };
    }
    return { ok: true, needsConfirmation: !data.session };
  },

  async sendPasswordReset(email) {
    const supabase = getSupabase();
    if (!supabase) return { ok: false, message: "Supabase n’est pas configuré." };
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: redirectUrl("/login"),
    });
    return error ? { ok: false, message: messageFor(error) } : { ok: true };
  },

  async updatePassword(password) {
    const supabase = getSupabase();
    if (!supabase) return { ok: false, message: "Supabase n’est pas configuré." };
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { ok: false, message: messageFor(error) };
    set({ recovery: false });
    return { ok: true };
  },

  async signOut() {
    const supabase = getSupabase();
    if (supabase) {
      // Portée locale : la déconnexion fonctionne aussi sans réseau.
      await supabase.auth.signOut({ scope: "local" });
    }
    set({ user: null, status: get().mode === "local" ? "signed-in" : "signed-out" });
  },

  clearRecovery: () => set({ recovery: false }),
}));
