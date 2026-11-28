"use client";

import { useMemo } from "react";
import { ArrowDownWideNarrow, ArrowUpNarrowWide, Inbox, Play, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/app-shell/page-header";
import { DemoNotice } from "@/components/common/demo-notice";
import { EmptyState } from "@/components/common/empty-state";
import { ViewModeToggle } from "@/components/common/glass-button";
import { VideoList } from "@/components/videos/video-list";
import { AccountButton } from "@/components/auth/account-sheet";
import { quickAdd } from "@/lib/quick-add";
import { useLibrary } from "@/lib/store/library";
import { useUI } from "@/lib/store/ui";
import { pluralize, sortVideos } from "@/lib/videos";

export function QueueView() {
  const status = useLibrary((s) => s.status);
  const videos = useLibrary((s) => s.videos);
  const sort = useUI((s) => s.queueSort);
  const toggleSort = useUI((s) => s.toggleQueueSort);
  const openCinema = useUI((s) => s.openCinema);

  const queue = useMemo(
    () => sortVideos(videos.filter((v) => v.status === "pending"), sort),
    [videos, sort],
  );
  const newestFirst = sort === "added_desc";

  return (
    <>
      <PageHeader
        title="À regarder"
        subtitle={
          status !== "ready"
            ? " "
            : queue.length
              ? pluralize(queue.length, "vidéo en attente", "vidéos en attente")
              : "Aucune vidéo en attente"
        }
        actions={<ViewModeToggle />}
        trailing={<AccountButton className="md:hidden" />}
      >
        {status === "ready" && queue.length ? (
          <div className="flex items-center gap-2">
            {/* Mode cinéma sur toute la file : un geste par Reel, la suivante arrive au retour. */}
            <button
              type="button"
              onClick={() => openCinema(queue.map((v) => v.id), queue[0].id)}
              className="glass-brand inline-flex h-10 items-center gap-2 rounded-full pr-4 pl-3 text-[15px] font-semibold transition-transform active:scale-[0.98]"
            >
              <span className="flex size-7 items-center justify-center rounded-full bg-white/25">
                <Play className="size-3.5 translate-x-px fill-current" />
              </span>
              Regarder
            </button>
            <button
              type="button"
              onClick={toggleSort}
              aria-label={`Trier : ${newestFirst ? "plus anciennes" : "plus récentes"} d’abord`}
              className="glass inline-flex h-10 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium text-foreground/80 transition-transform active:scale-[0.98]"
            >
              {newestFirst ? <ArrowDownWideNarrow className="size-4" /> : <ArrowUpNarrowWide className="size-4" />}
              {newestFirst ? "Plus récentes" : "Plus anciennes"}
            </button>
          </div>
        ) : null}
      </PageHeader>
      <DemoNotice />
      <VideoList
        videos={queue}
        empty={
          <EmptyState
            icon={Inbox}
            title="Tout est à jour"
            description="Collez le lien d’un Reel Instagram pour le garder au chaud jusqu’à ce que vous ayez le temps."
            action={
              <Button
                onClick={() => void quickAdd()}
                className="glass-brand rounded-full px-4 hover:opacity-95"
              >
                <Plus /> Ajouter une vidéo
              </Button>
            }
          />
        }
      />
    </>
  );
}
