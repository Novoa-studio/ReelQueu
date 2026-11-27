"use client";

import { useMemo, useState, type FormEvent } from "react";
import { ClipboardPaste, CircleCheck, Info, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import type { Video } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResponsiveSheet } from "@/components/ui/responsive-sheet";
import { useLibrary } from "@/lib/store/library";
import { useSheetOpen, useUI } from "@/lib/store/ui";
import { extractUrl, parseVideoUrl } from "@/lib/platforms";
import { describeVideo, findDuplicate, formatRelativeDate } from "@/lib/videos";
import { markPending } from "@/lib/video-actions";
import { enrichVideo } from "@/lib/enrichment";
import { PlatformBadge } from "./platform-badge";

const KIND_HINTS: Record<string, string> = {
  reel: "Reel détecté",
  short: "Short détecté",
  video: "Vidéo détectée",
  post: "Publication détectée",
  link: "Lien enregistrable",
};

export function AddVideoSheet() {
  const open = useSheetOpen("add");
  const sheetKey = useUI((s) => s.sheetKey);
  const closeSheet = useUI((s) => s.closeSheet);

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={(next) => !next && closeSheet()}
      title="Ajouter une vidéo"
      description="Collez le lien d’un Reel ou d’une publication Instagram. Les liens d’autres sites fonctionnent aussi."
    >
      <AddVideoForm key={sheetKey} onDone={closeSheet} />
    </ResponsiveSheet>
  );
}

function AddVideoForm({ onDone }: { onDone: () => void }) {
  const [value, setValue] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const videos = useLibrary((s) => s.videos);
  const addVideo = useLibrary((s) => s.addVideo);

  const parsed = useMemo(() => (value.trim() ? parseVideoUrl(value) : null), [value]);
  const duplicate = parsed?.ok ? findDuplicate(videos, parsed.value.canonicalUrl) : undefined;
  const showError = parsed && !parsed.ok && (submitted || value.length > 12);
  const canPaste = typeof navigator !== "undefined" && Boolean(navigator.clipboard?.readText);

  async function paste() {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        toast("Le presse-papiers est vide");
        return;
      }
      setValue(extractUrl(text) ?? text.trim());
    } catch {
      toast.error("Accès au presse-papiers refusé", {
        description: "Collez le lien directement dans le champ.",
      });
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (!parsed?.ok || duplicate || busy) return;

    setBusy(true);
    const video = await addVideo(parsed.value);
    setBusy(false);
    if (video) {
      toast("Ajoutée à « À regarder »", { description: describeVideo(video).title });
      onDone();
      // Titre, auteur et miniature arrivent juste après, sans bloquer l'ajout.
      void enrichVideo(video);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 pb-2" noValidate>
      <div className="flex gap-2">
        <Input
          type="url"
          inputMode="url"
          enterKeyHint="done"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          autoFocus
          placeholder="https://www.instagram.com/reel/…"
          aria-label="Lien de la vidéo"
          aria-invalid={showError ? true : undefined}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-11 rounded-xl"
        />
        {canPaste ? (
          <Button
            type="button"
            variant="secondary"
            onClick={paste}
            className="h-11 rounded-xl px-3"
            aria-label="Coller depuis le presse-papiers"
          >
            <ClipboardPaste />
            <span className="max-sm:sr-only">Coller</span>
          </Button>
        ) : null}
      </div>

      <div className="min-h-10 text-sm" aria-live="polite">
        {showError ? (
          <p className="flex items-start gap-2 text-destructive">
            <Info className="mt-0.5 size-4 shrink-0" />
            Ce texte ne contient pas de lien valide.
          </p>
        ) : duplicate ? (
          <DuplicateNotice video={duplicate} onDone={onDone} />
        ) : parsed?.ok ? (
          <p className="flex items-center gap-2 text-muted-foreground">
            <PlatformBadge platform={parsed.value.platform} className="text-foreground" />
            <span aria-hidden>·</span>
            <span>{KIND_HINTS[parsed.value.kind]}</span>
            {parsed.value.creator ? (
              <>
                <span aria-hidden>·</span>
                <span className="truncate">{parsed.value.creator}</span>
              </>
            ) : null}
          </p>
        ) : (
          <p className="text-muted-foreground">
            Dans Instagram : bouton « Partager » (avion en papier), puis « Copier le lien ».
          </p>
        )}
      </div>

      <Button
        type="submit"
        size="lg"
        className="h-11 rounded-xl text-[15px]"
        disabled={!parsed?.ok || Boolean(duplicate) || busy}
      >
        Ajouter à « À regarder »
      </Button>
    </form>
  );
}

function DuplicateNotice({ video, onDone }: { video: Video; onDone: () => void }) {
  const pending = video.status === "pending";
  return (
    <div className="flex items-start gap-2 rounded-xl bg-brand-soft px-3 py-2.5 text-foreground">
      <CircleCheck className="mt-0.5 size-4 shrink-0 text-brand" />
      <div className="min-w-0 flex-1">
        <p className="font-medium">Déjà enregistrée</p>
        <p className="text-muted-foreground">
          {pending ? "Dans « À regarder »" : "Dans la Bibliothèque"} · ajoutée{" "}
          {formatRelativeDate(video.added_at)}
        </p>
      </div>
      {!pending ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="shrink-0"
          onClick={() => {
            void markPending(video);
            onDone();
          }}
        >
          <RotateCcw /> Remettre
        </Button>
      ) : null}
    </div>
  );
}
