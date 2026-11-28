"use client";

import {
  Check,
  Clapperboard,
  Ellipsis,
  FolderPlus,
  Link as LinkIcon,
  RotateCcw,
  Star,
  StarOff,
  StickyNote,
  Trash,
} from "lucide-react";
import type { Video } from "@/types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUI } from "@/lib/store/ui";
import {
  copyLink,
  deleteVideo,
  markPending,
  markViewed,
  toggleFavorite,
} from "@/lib/video-actions";

const itemClass = "gap-2.5 px-2.5 py-2 text-[15px] md:py-1.5 md:text-sm";

export function VideoActionsMenu({
  video,
  overlay = false,
}: {
  video: Video;
  /** Bouton en verre sombre, posé sur une affiche (vue en grille). */
  overlay?: boolean;
}) {
  const openSheet = useUI((s) => s.openSheet);
  const openCinema = useUI((s) => s.openCinema);
  const pending = video.status === "pending";

  return (
    // modal={false} : évite le conflit de verrouillage avec la feuille ouverte ensuite.
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        {overlay ? (
          <button
            type="button"
            aria-label="Actions"
            className="glass-dark flex size-8 items-center justify-center rounded-full transition-transform active:scale-95"
          >
            <Ellipsis className="size-4" />
          </button>
        ) : (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Actions"
            className="text-muted-foreground hover:text-foreground"
          >
            <Ellipsis />
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuItem className={itemClass} onSelect={() => openCinema([video.id], video.id)}>
          <Clapperboard /> Mode cinéma
        </DropdownMenuItem>
        {pending ? (
          <DropdownMenuItem className={itemClass} onSelect={() => void markViewed(video)}>
            <Check /> Marquer comme vue
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem className={itemClass} onSelect={() => void markPending(video)}>
            <RotateCcw /> Remettre à regarder
          </DropdownMenuItem>
        )}
        <DropdownMenuItem className={itemClass} onSelect={() => void toggleFavorite(video)}>
          {video.is_favorite ? (
            <>
              <StarOff /> Retirer des favoris
            </>
          ) : (
            <>
              <Star /> Ajouter aux favoris
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem
          className={itemClass}
          onSelect={() => openSheet({ type: "collections", videoId: video.id })}
        >
          <FolderPlus /> Classer dans une collection
        </DropdownMenuItem>
        <DropdownMenuItem
          className={itemClass}
          onSelect={() => openSheet({ type: "note", videoId: video.id })}
        >
          <StickyNote /> {video.note ? "Modifier la note" : "Ajouter une note"}
        </DropdownMenuItem>
        <DropdownMenuItem className={itemClass} onSelect={() => void copyLink(video)}>
          <LinkIcon /> Copier le lien
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          className={itemClass}
          onSelect={() => void deleteVideo(video)}
        >
          <Trash /> Supprimer
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
