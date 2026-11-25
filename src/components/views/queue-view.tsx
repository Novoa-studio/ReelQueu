"use client";

import { useMemo } from "react";
import { ArrowDownWideNarrow, ArrowUpNarrowWide, Inbox, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/app-shell/page-header";
import { DemoNotice } from "@/components/common/demo-notice";
import { EmptyState } from "@/components/common/empty-state";
import { VideoList } from "@/components/videos/video-list";
import { AccountButton } from "@/components/auth/account-sheet";
import { useLibrary } from "@/lib/store/library";
import { useUI } from "@/lib/store/ui";
import { pluralize, sortVideos } from "@/lib/videos";

export function QueueView() {
  const status = useLibrary((s) => s.status);
  const videos = useLibrary((s) => s.videos);
  const sort = useUI((s) => s.queueSort);
  const toggleSort = useUI((s) => s.toggleQueueSort);
  const openSheet = useUI((s) => s.openSheet);

  const queue = useMemo(
    () => sortVideos(videos.filter((v) => v.status === "pending"), sort),
    [videos, sort],
  );
  const newestFirst = sort === "added_desc";
  const sortLabel = newestFirst ? "plus récentes d’abord" : "plus anciennes d’abord";

  return (
    <>
      <PageHeader
        title="À regarder"
        subtitle={
          status !== "ready"
            ? " "
            : queue.length
              ? `${pluralize(queue.length, "vidéo", "vidéos")} · ${sortLabel}`
              : "Aucune vidéo en attente"
        }
        actions={
          <Button
            variant="ghost"
            size="icon-lg"
            className="rounded-full text-muted-foreground"
            onClick={toggleSort}
            aria-label={`Trier : ${newestFirst ? "plus anciennes" : "plus récentes"} d’abord`}
            title={`Tri : ${sortLabel}`}
          >
            {newestFirst ? (
              <ArrowDownWideNarrow className="size-5" />
            ) : (
              <ArrowUpNarrowWide className="size-5" />
            )}
          </Button>
        }
        trailing={<AccountButton className="md:hidden" />}
      />
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
                onClick={() => openSheet({ type: "add" })}
                className="rounded-full bg-brand px-4 text-brand-foreground hover:bg-brand/90"
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
