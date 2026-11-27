"use client";

import { useEffect, useState, useSyncExternalStore, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, MailCheck, TriangleExclamationPoint } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SegmentedControl } from "@/components/common/segmented-control";
import { LogoMark } from "@/components/app-shell/logo";
import { MIN_PASSWORD_LENGTH, useAuth } from "@/lib/store/auth";

type Mode = "signin" | "signup" | "reset" | "check-email" | "reset-sent";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function subscribeHash(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

/** Fragment d'URL réactif (vide pendant le prérendu). */
function useLocationHash(): string {
  return useSyncExternalStore(
    subscribeHash,
    () => window.location.hash,
    () => "",
  );
}

/** Erreur renvoyée par Supabase dans l'URL d'un lien e-mail (expiré, déjà utilisé…). */
function readLinkError(hash: string): string | null {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const code = params.get("error_code");
  if (!code && !params.get("error")) return null;
  if (code === "otp_expired") return "Ce lien a expiré ou a déjà servi. Demandez-en un nouveau.";
  return params.get("error_description")?.replace(/\+/g, " ") ?? "Ce lien n’est pas valide.";
}

export function LoginView() {
  const router = useRouter();
  const status = useAuth((s) => s.status);
  const recovery = useAuth((s) => s.recovery);
  const linkError = readLinkError(useLocationHash());

  useEffect(() => {
    if (status === "signed-in" && !recovery) router.replace("/");
  }, [status, recovery, router]);

  const showForm = recovery || status === "signed-out";

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 pt-[env(safe-area-inset-top)] pb-[calc(env(safe-area-inset-bottom)+2rem)]">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <LogoMark className="size-14 drop-shadow-sm" />
          <h1 className="mt-4 text-[28px] leading-tight font-semibold tracking-[-0.02em]">ReelQueue</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Vos Reels à regarder plus tard, sur tous vos appareils.
          </p>
        </div>

        {linkError && !recovery ? (
          <p className="mb-4 flex items-start gap-2 rounded-xl bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
            <TriangleExclamationPoint className="mt-0.5 size-4 shrink-0" />
            {linkError}
          </p>
        ) : null}

        {showForm ? (
          recovery ? (
            <NewPasswordForm onDone={() => router.replace("/")} />
          ) : (
            <AuthForms />
          )
        ) : (
          <div aria-busy className="mx-auto h-1 w-24 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-brand/60" />
          </div>
        )}
      </div>
    </main>
  );
}

function Card({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl bg-card p-5 shadow-card ring-1 ring-border/70 animate-in fade-in-0 duration-300">
      {children}
    </div>
  );
}

function ErrorText({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="text-sm text-destructive">
      {children}
    </p>
  );
}

function PasswordInput({
  id,
  value,
  onChange,
  autoComplete,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: "current-password" | "new-password";
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        minLength={autoComplete === "new-password" ? MIN_PASSWORD_LENGTH : undefined}
        className="h-11 rounded-xl pr-11"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        className="absolute top-1/2 right-1.5 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground"
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

function AuthForms() {
  const signIn = useAuth((s) => s.signIn);
  const signUp = useAuth((s) => s.signUp);
  const sendPasswordReset = useAuth((s) => s.sendPasswordReset);
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!EMAIL_PATTERN.test(email.trim())) {
      setError("Saisissez une adresse e-mail valide.");
      return;
    }
    if (mode !== "reset" && !password) {
      setError("Saisissez votre mot de passe.");
      return;
    }
    if (mode === "signup" && password.length < MIN_PASSWORD_LENGTH) {
      setError(`Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`);
      return;
    }
    setBusy(true);
    if (mode === "signin") {
      const result = await signIn(email, password);
      if (!result.ok) setError(result.message);
      // Succès : la redirection suit le changement de session.
    } else if (mode === "signup") {
      const result = await signUp(email, password);
      if (!result.ok) setError(result.message);
      else if (result.needsConfirmation) switchMode("check-email");
    } else if (mode === "reset") {
      const result = await sendPasswordReset(email);
      if (!result.ok) setError(result.message);
      else switchMode("reset-sent");
    }
    setBusy(false);
  }

  if (mode === "check-email" || mode === "reset-sent") {
    return (
      <Card>
        <div className="flex flex-col items-center text-center">
          <div className="mb-3 flex size-11 items-center justify-center rounded-2xl bg-brand-soft text-brand">
            <MailCheck className="size-5" />
          </div>
          <h2 className="font-semibold">Vérifiez vos e-mails</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "check-email" ? (
              <>
                Un lien de confirmation vient d’être envoyé à <strong className="text-foreground">{email}</strong>.
                Ouvrez-le (il peut s’ouvrir dans Safari), puis revenez ici pour vous connecter.
              </>
            ) : (
              <>
                Si un compte existe pour <strong className="text-foreground">{email}</strong>, un lien
                pour choisir un nouveau mot de passe vient d’être envoyé.
              </>
            )}
          </p>
          <Button
            size="lg"
            className="mt-5 h-11 w-full rounded-xl text-[15px]"
            onClick={() => switchMode("signin")}
          >
            Se connecter
          </Button>
        </div>
      </Card>
    );
  }

  const isReset = mode === "reset";

  return (
    <Card>
      {!isReset ? (
        <SegmentedControl
          label="Connexion ou inscription"
          value={mode}
          onChange={(value) => switchMode(value)}
          options={[
            { value: "signin", label: "Connexion" },
            { value: "signup", label: "Créer un compte" },
          ]}
          className="mb-5 flex w-full"
        />
      ) : (
        <div className="mb-4">
          <h2 className="font-semibold">Mot de passe oublié</h2>
          <p className="text-sm text-muted-foreground">
            Recevez un lien pour choisir un nouveau mot de passe.
          </p>
        </div>
      )}

      {!isReset ? (
        <>
          <GoogleButton onError={setError} />
          <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            ou avec ton e-mail
            <span className="h-px flex-1 bg-border" />
          </div>
        </>
      ) : null}

      {/* noValidate : messages d'erreur cohérents, en français, plutôt que les bulles du navigateur. */}
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 rounded-xl"
          />
        </div>

        {!isReset ? (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Mot de passe</Label>
              {mode === "signin" ? (
                <button
                  type="button"
                  onClick={() => switchMode("reset")}
                  className="text-xs font-medium text-brand hover:underline"
                >
                  Mot de passe oublié ?
                </button>
              ) : (
                <span className="text-xs text-muted-foreground">
                  {MIN_PASSWORD_LENGTH} caractères minimum
                </span>
              )}
            </div>
            <PasswordInput
              id="password"
              value={password}
              onChange={setPassword}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
            />
          </div>
        ) : null}

        {error ? <ErrorText>{error}</ErrorText> : null}

        <Button
          type="submit"
          size="lg"
          disabled={busy}
          className="h-11 rounded-xl text-[15px]"
        >
          {mode === "signin" ? "Se connecter" : mode === "signup" ? "Créer mon compte" : "Envoyer le lien"}
        </Button>

        {isReset ? (
          <button
            type="button"
            onClick={() => switchMode("signin")}
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Retour à la connexion
          </button>
        ) : null}
      </form>
    </Card>
  );
}

function GoogleLogo() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className="size-[18px]">
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}

/** Connexion ou création de compte en un geste ; le premier passage crée le compte. */
function GoogleButton({ onError }: { onError: (message: string) => void }) {
  const signInWithGoogle = useAuth((s) => s.signInWithGoogle);
  const [busy, setBusy] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      disabled={busy}
      className="h-11 w-full gap-2.5 rounded-xl bg-card text-[15px]"
      onClick={async () => {
        setBusy(true);
        const result = await signInWithGoogle();
        // Succès : le navigateur part vers Google, on laisse le bouton désactivé.
        if (!result.ok) {
          onError(result.message);
          setBusy(false);
        }
      }}
    >
      <GoogleLogo />
      Continuer avec Google
    </Button>
  );
}

function NewPasswordForm({ onDone }: { onDone: () => void }) {
  const updatePassword = useAuth((s) => s.updatePassword);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`);
      return;
    }
    setBusy(true);
    const result = await updatePassword(password);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    toast("Mot de passe mis à jour");
    onDone();
  }

  return (
    <Card>
      <div className="mb-4">
        <h2 className="font-semibold">Nouveau mot de passe</h2>
        <p className="text-sm text-muted-foreground">Choisissez le mot de passe de votre compte.</p>
      </div>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="new-password">Mot de passe</Label>
          <PasswordInput id="new-password" value={password} onChange={setPassword} autoComplete="new-password" />
        </div>
        {error ? <ErrorText>{error}</ErrorText> : null}
        <Button type="submit" size="lg" disabled={busy} className="h-11 rounded-xl text-[15px]">
          Enregistrer
        </Button>
      </form>
    </Card>
  );
}
