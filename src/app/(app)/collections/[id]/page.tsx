import { Suspense } from "react";
import type { Metadata } from "next";
import { CollectionDetailView } from "@/components/views/collection-detail-view";
import { VideoListSkeleton } from "@/components/videos/video-list";

export const metadata: Metadata = { title: "Collection" };

/*
 * L'identifiant n'est connu qu'à la requête (données utilisateur) : avec
 * cacheComponents, l'accès aux params doit se faire sous Suspense.
 */
export default function CollectionPage({ params }: PageProps<"/collections/[id]">) {
  return (
    <Suspense fallback={<VideoListSkeleton />}>
      {params.then(({ id }) => (
        <CollectionDetailView id={id} />
      ))}
    </Suspense>
  );
}
