"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Check, Plus } from "lucide-react";
import { COLLECTION_COLORS, type Video } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResponsiveSheet } from "@/components/ui/responsive-sheet";
import { useLibrary, useVideo } from "@/lib/store/library";
import { useSheetOpen, useUI } from "@/lib/store/ui";
import { describeVideo, normalizeText } from "@/lib/videos";
import { COLLECTION_NAME_MAX, collectionColor } from "@/lib/collections";
import { cn } from "@/lib/utils";

export function CollectionsSheet() {
  const open = useSheetOpen("collections");
  const sheet = useUI((s) => s.sheet);
  const sheetKey = useUI((s) => s.sheetKey);
  const closeSheet = useUI((s) => s.closeSheet);
  const video = useVideo(sheet?.type === "collections" ? sheet.videoId : null);

  return (
    <ResponsiveSheet
      open={open && Boolean(video)}
      onOpenChange={(next) => !next && closeSheet()}
      title="Collections"
      description={video ? describeVideo(video).title : undefined}
      footer={
        <Button size="lg" className="h-11 rounded-xl text-[15px]" onClick={closeSheet}>
          Terminé
        </Button>
      }
    >
      {video ? <CollectionPicker key={sheetKey} video={video} /> : null}
    </ResponsiveSheet>
  );
}

function CollectionPicker({ video }: { video: Video }) {
  const collections = useLibrary((s) => s.collections);
  const setVideoCollections = useLibrary((s) => s.setVideoCollections);
  const createCollection = useLibrary((s) => s.createCollection);
  const [name, setName] = useState("");

  const sorted = useMemo(
    () => [...collections].sort((a, b) => a.name.localeCompare(b.name, "fr")),
    [collections],
  );

  function toggle(collectionId: string) {
    const has = video.collection_ids.includes(collectionId);
    void setVideoCollections(
      video.id,
      has
        ? video.collection_ids.filter((id) => id !== collectionId)
        : [...video.collection_ids, collectionId],
    );
  }

  async function create(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    // Nom déjà utilisé : on coche simplement la collection existante.
    const existing = collections.find((c) => normalizeText(c.name) === normalizeText(trimmed));
    if (existing) {
      if (!video.collection_ids.includes(existing.id)) toggle(existing.id);
      setName("");
      return;
    }
    const color = COLLECTION_COLORS[(collections.length + 6) % COLLECTION_COLORS.length];
    const created = await createCollection(trimmed, color);
    if (created) {
      await setVideoCollections(video.id, [...video.collection_ids, created.id]);
      setName("");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {sorted.length ? (
        <ul className="-mx-1 flex max-h-[40vh] flex-col overflow-y-auto">
          {sorted.map((c) => {
            const checked = video.collection_ids.includes(c.id);
            return (
              <li key={c.id}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={checked}
                  onClick={() => toggle(c.id)}
                  className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left text-[15px] transition-colors hover:bg-muted"
                >
                  <span
                    aria-hidden
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: collectionColor(c.color) }}
                  />
                  <span className="min-w-0 flex-1 truncate">{c.name}</span>
                  <span
                    className={cn(
                      "flex size-5 items-center justify-center rounded-full border transition-colors",
                      checked ? "border-brand bg-brand text-brand-foreground" : "border-input",
                    )}
                  >
                    {checked ? <Check className="size-3" strokeWidth={3} /> : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          Aucune collection pour l’instant. Créez la première ci-dessous.
        </p>
      )}

      <form onSubmit={create} className="flex gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={COLLECTION_NAME_MAX}
          placeholder="Nouvelle collection"
          aria-label="Nom de la nouvelle collection"
          enterKeyHint="done"
          className="h-10 rounded-xl"
        />
        <Button
          type="submit"
          variant="secondary"
          className="h-10 rounded-xl"
          disabled={!name.trim()}
          aria-label="Créer la collection"
        >
          <Plus />
        </Button>
      </form>
    </div>
  );
}
