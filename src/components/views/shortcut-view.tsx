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

function CopyField({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast("Copié");
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Copie impossible", { description: "Sélectionne le texte et copie-le à la main." });
    }
  }
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <code
        className={cn(
          "block rounded-lg bg-muted px-2.5 py-2 font-mono text-[13px] leading-relaxed break-all select-all",
          highlight && "text-brand",
        )}
      >
        {value}
      </code>
      <Button onClick={copy} variant={highlight ? "default" : "secondary"} className="h-10 rounded-lg">
        {copied ? <Check /> : <Copy />} {copied ? "Copié" : "Copier"}
      </Button>
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
  const origin = hydrated ? window.location.origin : "";

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

  // L'adresse contient la clé : elle n'est montrée qu'une fois et disparaît quand on quitte la page.
  useLayoutEffect(() => () => setToken(null), []);

  async function create() {
    if (info && !window.confirm("Créer une nouvelle adresse ? L’ancienne cessera de fonctionner : il faudra la remplacer dans le raccourci.")) {
      return;
    }
    setBusy(true);
    try {
      setToken(await createShareToken());
      await refresh();
    } catch (error) {
      const insecure = error instanceof Error && error.message === "insecure_context";
      toast.error("Impossible de créer l’adresse", {
        description: insecure
          ? "Ouvre ReelQueue avec son adresse en https."
          : `Vérifie ta connexion et que la base est installée (supabase/setup.sql).${
              error instanceof Error && error.message ? ` Détail : ${error.message}` : ""
            }`,
      });
    } finally {
      setBusy(false);
    }
  }

  async function revoke() {
    if (!window.confirm("Désactiver l’adresse ? Le raccourci ne pourra plus rien ajouter.")) return;
    setBusy(true);
    try {
      await revokeShareToken();
      setToken(null);
      await refresh();
      toast("Adresse désactivée");
    } catch {
      toast.error("Désactivation impossible");
    } finally {
      setBusy(false);
    }
  }

  const personalUrl = token && origin ? `${origin}/api/share/${token}?url=` : null;

  return (
    <>
      <PageHeader title="Raccourci iOS" back={{ href: "/", label: "À regarder" }} showSearch={false} />

      <div className="flex flex-col gap-3 pb-4">
        <div className="flex items-start gap-3 rounded-2xl bg-brand-soft p-4 text-[15px]">
          <Zap className="mt-0.5 size-5 shrink-0 text-brand" />
          <p>
            Ajoute un Reel en deux gestes depuis Instagram : <strong>Partager › Ajouter à ReelQueue</strong>,
            sans ouvrir l’app. Le raccourci ne contient que deux actions.
          </p>
        </div>

        <Step number={1} title="Ton adresse personnelle">
          {mode !== "supabase" ? (
            <p className="text-muted-foreground">
              Le raccourci enregistre les vidéos sur ton compte : il faut que ReelQueue soit relié à Supabase.
            </p>
          ) : (
            <>
              <p className="text-muted-foreground">
                Elle contient ta clé personnelle : elle permet d’ajouter des vidéos à ton compte, et rien
                d’autre. Garde-la pour toi.
              </p>

              {personalUrl ? (
                <div className="flex flex-col gap-2 rounded-xl border border-dashed border-brand/50 p-3">
                  <CopyField label="Ton adresse (affichée une seule fois)" value={personalUrl} highlight />
                  <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <TriangleExclamationPoint className="mt-px size-3.5 shrink-0" />
                    Colle-la maintenant dans le raccourci (étape 2) : elle ne sera plus affichée. Si tu la
                    perds, crée-en une nouvelle.
                  </p>
                </div>
              ) : loaded && info ? (
                <p className="flex items-start gap-2 text-sm">
                  <KeyRound className="mt-0.5 size-4 shrink-0 text-brand" />
                  <span>
                    Adresse active, créée {formatRelativeDate(info.createdAt)}
                    {info.lastUsedAt ? ` · utilisée ${formatRelativeDate(info.lastUsedAt)}` : " · jamais utilisée"}.
                    Pour l’afficher à nouveau, crée-en une nouvelle.
                  </span>
                </p>
              ) : null}

              <div className="flex flex-wrap gap-2">
                {!personalUrl ? (
                  <Button onClick={create} disabled={busy || !loaded} className="rounded-lg">
                    <KeyRound /> {info ? "Créer une nouvelle adresse" : "Créer mon adresse"}
                  </Button>
                ) : null}
                {info ? (
                  <Button
                    variant="ghost"
                    onClick={revoke}
                    disabled={busy}
                    className="rounded-lg text-destructive hover:text-destructive"
                  >
                    Désactiver
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
              Ouvre les détails du raccourci (son nom en haut, ou <Ui>ⓘ</Ui>) et active{" "}
              <Ui>Afficher dans la feuille de partage</Ui>.
            </li>
            <li>
              Cherche l’action <strong>contenu</strong> et ajoute <Ui>Obtenir le contenu de l’URL</Ui>. Touche{" "}
              <Ui>URL</Ui>, colle ton adresse personnelle (elle se termine par <code>?url=</code>), puis, sans
              rien ajouter, touche <Ui>Entrée du raccourci</Ui> dans la barre au-dessus du clavier pour la
              placer juste après. Aucune autre option à régler.
            </li>
            <li>
              Cherche <strong>notification</strong>, ajoute <Ui>Afficher la notification</Ui> et mets-y la
              variable <Ui>Contenu de l’URL</Ui>. Touche <Ui>OK</Ui> : c’est prêt.
            </li>
          </ol>
          <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
            Résultat : <strong className="text-foreground">Obtenir le contenu de</strong> [ton adresse]
            <strong className="text-foreground">[Entrée du raccourci]</strong>, puis{" "}
            <strong className="text-foreground">Afficher la notification</strong> [Contenu de l’URL].
          </p>
        </Step>

        <Step number={3} title="Depuis Instagram">
          <p className="flex items-start gap-2">
            <Share className="mt-1 size-4 shrink-0 text-brand" />
            <span>
              Sur un Reel, touche l’avion en papier, puis <Ui>Partager…</Ui> pour ouvrir le menu de partage de
              l’iPhone, et choisis <Ui>Ajouter à ReelQueue</Ui>. La première fois, autorise la connexion à{" "}
              {origin ? origin.replace(/^https?:\/\//, "") : "ReelQueue"}. Une notification confirme l’ajout ;
              un Reel déjà vu revient dans « À regarder ».
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
