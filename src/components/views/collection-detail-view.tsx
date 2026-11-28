"use client";

import { useLayoutEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ellipsis, FolderX, Layers, Pencil, Trash } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ResponsiveSheet } from "@/components/ui/responsive-sheet";
import { PageHeader } from "@/components/app-shell/page-header";
import { GlassIconButton, ViewModeToggle } from "@/components/common/glass-button";
import { EmptyState } from "@/components/common/empty-state";
import { SegmentedControl } from "@/components/common/segmented-control";
import { VideoList } from "@/components/videos/video-list";
import { useCollection, useLibrary } from "@/lib/store/library";
import { useUI } from "@/lib/store/ui";
import { collectionColor } from "@/lib/collections";
import {
  STATUS_FILTER_OPTIONS,
  filterVideos,
  pluralize,
  sortVideos,
  type StatusFilter,
} from "@/lib/videos";

const BACK = { href: "/collections", label: "Collections" };

export function CollectionDetailView({ id }: { id: string }) {
  const router = useRouter();
  const status = useLibrary((s) => s.status);
  const videos = useLibrary((s) => s.videos);
  const deleteCollection = useLibrary((s) => s.deleteCollection);
  const openSheet = useUI((s) => s.openSheet);
  const collection = useCollection(id);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [confirmOpen, setConfirmOpen] = useState(false);

  // La page reste montée (masquée) après navigation : on ne veut pas retrouver
  // la confirmation ouverte en revenant.
  useLayoutEffect(() => () => setConfirmOpen(false), []);

  const inCollection = useMemo(() => videos.filter((v) => v.collection_ids.includes(id)), [videos, id]);
  const results = useMemo(
    () => sortVideos(filterVideos(inCollection, { status: filter }), "added_desc"),
    [inCollection, filter],
  );

  if (status === "ready" && !collection) {
    return (
      <>
        <PageHeader title="Collection introuvable" back={BACK} />
        <EmptyState
          icon={FolderX}
          title="Cette collection n’existe plus"
          description="Elle a peut-être été supprimée."
          action={
            <Button asChild variant="outline" className="rounded-full">
              <Link href="/collections">Voir les collections</Link>
            </Button>
          }
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        back={BACK}
        title={
          collection ? (
            <span className="flex items-center gap-2.5">
              <span
                aria-hidden
                className="size-3.5 shrink-0 rounded-full"
                style={{ backgroundColor: collectionColor(collection.color) }}
              />
              <span className="truncate">{collection.name}</span>
            </span>
          ) : (
            " "
          )
        }
        subtitle={collection ? pluralize(inCollection.length, "vidéo", "vidéos") : " "}
        actions={
          collection ? (
            <>
            <ViewModeToggle />
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <GlassIconButton aria-label="Options de la collection">
                  <Ellipsis />
                </GlassIconButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem
                  className="gap-2.5 py-2 text-[15px] md:py-1.5 md:text-sm"
                  onSelect={() => openSheet({ type: "collection-form", collectionId: id })}
                >
                  <Pencil /> Renommer, couleur
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  className="gap-2.5 py-2 text-[15px] md:py-1.5 md:text-sm"
                  onSelect={() => setConfirmOpen(true)}
                >
                  <Trash /> Supprimer la collection
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            </>
          ) : null
        }
      >
        <SegmentedControl
          label="Filtrer par statut"
          value={filter}
          onChange={setFilter}
          options={STATUS_FILTER_OPTIONS}
          className="w-full md:w-auto"
        />
      </PageHeader>

      <VideoList
        videos={results}
        showStatus
        empty={
          <EmptyState
            icon={Layers}
            title={inCollection.length ? "Aucune vidéo dans ce filtre" : "Collection vide"}
            description="Depuis n’importe quelle vidéo, touchez « ⋯ » puis « Classer dans une collection »."
          />
        }
      />

      <ResponsiveSheet
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Supprimer « ${collection?.name ?? ""} » ?`}
        description="Les vidéos ne sont pas supprimées : elles sont seulement retirées de cette collection."
      >
        <div className="flex flex-col gap-2 pb-2 sm:flex-row-reverse">
          <Button
            variant="destructive"
            size="lg"
            className="h-11 rounded-xl text-[15px] sm:flex-1"
            onClick={async () => {
              const name = collection?.name;
              if (await deleteCollection(id)) {
                setConfirmOpen(false);
                toast(`Collection « ${name} » supprimée`);
                router.replace("/collections");
              }
            }}
          >
            Supprimer
          </Button>
          <Button
            variant="secondary"
            size="lg"
            className="h-11 rounded-xl text-[15px] sm:flex-1"
            onClick={() => setConfirmOpen(false)}
          >
            Annuler
          </Button>
        </div>
      </ResponsiveSheet>
    </>
  );
}
