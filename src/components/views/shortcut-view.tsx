"use client";

import { useCallback, useEffect, useLayoutEffect, useState, type ReactNode } from "react";
import { Check, Copy, KeyRound, Share, TriangleExclamationPoint, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/app-shell/page-header";
import { useAuth } from "@/lib/store/auth";
import { useHydrated } from "@/hooks/use-media-query";
import { formatRelativeDate } from "@/lib/videos";
import {
  createShareToken,
  getShareTokenInfo,
  revokeShareToken,
  type ShareTokenInfo,
} from "@/lib/share-token";
import { cn } from "@/lib/utils";

function CopyField({ label, value, secret = false }: { label: string; value: string; secret?: boolean }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Copie impossible", { description: "Sélectionnez le texte et copiez-le à la main." });
    }
  }
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <code
          className={cn(
            "min-w-0 flex-1 truncate rounded-lg bg-muted px-2.5 py-2 font-mono text-[13px] select-all",
            secret && "text-brand",
          )}
        >
          {value}
        </code>
        <Button variant="secondary" size="icon-lg" className="shrink-0 rounded-lg" onClick={copy} aria-label={`Copier : ${label}`}>
          {copied ? <Check className="text-brand" /> : <Copy />}
        </Button>
      </div>
    </div>
  );
}

function Step({ number, title, children }: { number: number; title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-card p-4 shadow-card ring-1 ring-border/70">
      <h2 className="mb-3 flex items-center gap-2.5 font-semibold">
        <span className="flex size-6 items-center justify-center rounded-full bg-brand text-xs font-semibold text-brand-foreground">
          {number}
        </span>
        {title}
      </h2>
      <div className="flex flex-col gap-3 text-[15px] leading-relaxed">{children}</div>
    </section>
  );
}

/** Libellés de l'app Raccourcis, mis en évidence. */
function Ui({ children }: { children: ReactNode }) {
  return <strong className="font-semibold text-foreground">« {children} »</strong>;
}

export function ShortcutView() {
  const mode = useAuth((s) => s.mode);
  const signedIn = useAuth((s) => s.status === "signed-in");
  const hydrated = useHydrated();
  const endpoint = hydrated ? `${window.location.origin}/api/share` : "…/api/share";

  const [info, setInfo] = useState<ShareTokenInfo | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const next = await getShareTokenInfo();
    setInfo(next);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (mode !== "supabase" || !signedIn) return;
    let cancelled = false;
    void getShareTokenInfo().then((next) => {
      if (cancelled) return;
      setInfo(next);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [mode, signedIn]);

  // La clé n'est montrée qu'une fois : elle disparaît quand on quitte la page.
  useLayoutEffect(() => () => setToken(null), []);

  async function create() {
    if (info && !window.confirm("Remplacer la clé ? Le raccourci actuel cessera de fonctionner jusqu’à sa mise à jour.")) {
      return;
    }
    setBusy(true);
    try {
      setToken(await createShareToken());
      await refresh();
    } catch (error) {
      const insecure = error instanceof Error && error.message === "insecure_context";
      toast.error("Impossible de créer la clé", {
        description: insecure
          ? "Ouvrez ReelQueue en HTTPS (adresse de production)."
          : "Vérifiez votre connexion et que la base est à jour (migration share_tokens).",
      });
    } finally {
      setBusy(false);
    }
  }

  async function revoke() {
    if (!window.confirm("Révoquer la clé ? Le raccourci ne pourra plus rien ajouter.")) return;
    setBusy(true);
    try {
      await revokeShareToken();
      setToken(null);
      await refresh();
      toast("Clé révoquée");
    } catch {
      toast.error("Révocation impossible");
    } finally {
      setBusy(false);
    }
  }

  const headerValue = `Bearer ${token ?? "<ta clé>"}`;

  return (
    <>
      <PageHeader title="Raccourci iOS" back={{ href: "/", label: "À regarder" }} showSearch={false} />

      <div className="flex flex-col gap-3 pb-4">
        <div className="flex items-start gap-3 rounded-2xl bg-brand-soft p-4 text-[15px]">
          <Zap className="mt-0.5 size-5 shrink-0 text-brand" />
          <p>
            Ajoute un Reel en deux gestes depuis Instagram : <strong>Partager › Ajouter à ReelQueue</strong>,
            sans ouvrir l’app. Configuration unique, environ deux minutes.
          </p>
        </div>

        <Step number={1} title="Ta clé personnelle">
          {mode !== "supabase" ? (
            <p className="text-muted-foreground">
              Le raccourci enregistre les vidéos sur ton compte : il faut que ReelQueue soit relié à Supabase.
            </p>
          ) : (
            <>
              <p className="text-muted-foreground">
                Elle permet au raccourci d’ajouter des vidéos à ton compte, et à rien d’autre. Garde-la pour toi.
              </p>
              {loaded && info ? (
                <p className="flex items-center gap-2 text-sm">
                  <KeyRound className="size-4 text-brand" />
                  Clé active, créée {formatRelativeDate(info.createdAt)}
                  {info.lastUsedAt ? ` · utilisée ${formatRelativeDate(info.lastUsedAt)}` : " · jamais utilisée"}
                </p>
              ) : null}
              {token ? (
                <div className="flex flex-col gap-2 rounded-xl border border-dashed border-brand/50 p-3">
                  <CopyField label="Ta clé (affichée une seule fois)" value={token} secret />
                  <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <TriangleExclamationPoint className="mt-px size-3.5 shrink-0" />
                    Copie-la maintenant dans le raccourci (étape 2) : elle ne sera plus affichée.
                  </p>
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button onClick={create} disabled={busy || !loaded} className="rounded-lg">
                  <KeyRound /> {info ? "Remplacer la clé" : "Créer ma clé"}
                </Button>
                {info ? (
                  <Button variant="ghost" onClick={revoke} disabled={busy} className="rounded-lg text-destructive hover:text-destructive">
                    Révoquer
                  </Button>
                ) : null}
              </div>
            </>
          )}
        </Step>

        <Step number={2} title="Crée le raccourci sur ton iPhone">
          <ol className="flex list-decimal flex-col gap-3 pl-5 marker:text-muted-foreground">
            <li>
              Ouvre l’app <Ui>Raccourcis</Ui>, touche <Ui>+</Ui> et nomme le raccourci <Ui>Ajouter à ReelQueue</Ui>.
            </li>
            <li>
              Touche <Ui>ⓘ</Ui> (détails) et active <Ui>Afficher dans la feuille de partage</Ui>. En haut du
              raccourci, limite ce qu’il reçoit à <Ui>URL</Ui> et <Ui>Texte</Ui>.
            </li>
            <li className="flex flex-col gap-2">
              <span>
                Ajoute l’action <Ui>Obtenir le contenu de l’URL</Ui> et colle cette adresse :
              </span>
              <CopyField label="URL" value={endpoint} />
              <span>
                Touche <Ui>Afficher plus</Ui> : méthode <Ui>POST</Ui>. Dans <Ui>En-têtes</Ui>, ajoute la clé{" "}
                <Ui>Authorization</Ui> avec cette valeur :
              </span>
              <CopyField label="Valeur de l’en-tête Authorization" value={headerValue} secret={Boolean(token)} />
              <span>
                Dans <Ui>Corps de la requête</Ui>, choisis <Ui>JSON</Ui>, ajoute un champ <Ui>Texte</Ui> nommé{" "}
                <Ui>url</Ui> et donne-lui la variable <Ui>Entrée du raccourci</Ui>.
              </span>
            </li>
            <li>
              Ajoute <Ui>Obtenir la valeur du dictionnaire</Ui> pour la clé <Ui>message</Ui>.
            </li>
            <li>
              Ajoute <Ui>Afficher la notification</Ui> avec <Ui>Valeur du dictionnaire</Ui>. C’est prêt.
            </li>
          </ol>
        </Step>

        <Step number={3} title="Depuis Instagram">
          <p className="flex items-start gap-2">
            <Share className="mt-1 size-4 shrink-0 text-brand" />
            <span>
              Sur un Reel, touche l’avion en papier, puis <Ui>Partager…</Ui> pour ouvrir le menu de partage de
              l’iPhone, et choisis <Ui>Ajouter à ReelQueue</Ui>. Une notification confirme l’ajout ; un Reel
              déjà vu revient dans « À regarder ».
            </span>
          </p>
        </Step>

        <p className="px-1 text-sm text-muted-foreground">
          Sans raccourci : dans Instagram, <strong>Copier le lien</strong>, puis touche <strong>+</strong> dans
          ReelQueue : le lien copié est ajouté directement.
        </p>
      </div>
    </>
  );
}
