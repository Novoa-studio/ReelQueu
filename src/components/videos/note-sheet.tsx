"use client";

import { useState, type FormEvent } from "react";
import type { Video } from "@/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ResponsiveSheet } from "@/components/ui/responsive-sheet";
import { useVideo } from "@/lib/store/library";
import { useSheetOpen, useUI } from "@/lib/store/ui";
import { describeVideo } from "@/lib/videos";
import { saveNote } from "@/lib/video-actions";

const NOTE_MAX = 2000;

export function NoteSheet() {
  const open = useSheetOpen("note");
  const sheet = useUI((s) => s.sheet);
  const sheetKey = useUI((s) => s.sheetKey);
  const closeSheet = useUI((s) => s.closeSheet);
  const video = useVideo(sheet?.type === "note" ? sheet.videoId : null);

  return (
    <ResponsiveSheet
      open={open && Boolean(video)}
      onOpenChange={(next) => !next && closeSheet()}
      title={video?.note ? "Modifier la note" : "Ajouter une note"}
      description={video ? describeVideo(video).title : undefined}
    >
      {video ? <NoteForm key={sheetKey} video={video} onDone={closeSheet} /> : null}
    </ResponsiveSheet>
  );
}

function NoteForm({ video, onDone }: { video: Video; onDone: () => void }) {
  const [value, setValue] = useState(video.note ?? "");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (await saveNote(video, value)) onDone();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 pb-2">
      <Textarea
        autoFocus
        value={value}
        maxLength={NOTE_MAX}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Pourquoi cette vidéo ? Une idée à retenir…"
        aria-label="Note personnelle"
        className="min-h-28 rounded-xl"
      />
      <div className="flex gap-2">
        {video.note ? (
          <Button
            type="button"
            variant="ghost"
            size="lg"
            className="h-11 rounded-xl text-destructive hover:text-destructive"
            onClick={async () => {
              if (await saveNote(video, "")) onDone();
            }}
          >
            Supprimer
          </Button>
        ) : null}
        <Button type="submit" size="lg" className="h-11 flex-1 rounded-xl text-[15px]">
          Enregistrer
        </Button>
      </div>
    </form>
  );
}
