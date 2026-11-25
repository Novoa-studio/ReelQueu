"use client";

import { useMemo, useState } from "react";
import { Library, SearchX } from "lucide-react";
import { PageHeader } from "@/components/app-shell/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { SearchField } from "@/components/common/search-field";
import { VideoList } from "@/components/videos/video-list";
import { useLibrary } from "@/lib/store/library";
import { filterVideos, pluralize, sortVideos } from "@/lib/videos";

export function LibraryView() {
  const status = useLibrary((s) => s.status);
  const videos = useLibrary((s) => s.videos);
  const [query, setQuery] = useState("");

  const seen = useMemo(() => videos.filter((v) => v.status !== "pending"), [videos]);
  const results = useMemo(
    () => sortVideos(filterVideos(seen, { text: query }), "viewed_desc"),
    [seen, query],
  );

  return (
    <>
      <PageHeader
        title="Bibliothèque"
        subtitle={
          status === "ready"
            ? `${pluralize(seen.length, "vidéo consultée", "vidéos consultées")}`
            : " "
        }
      >
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder="Titre, auteur, plateforme, note…"
        />
      </PageHeader>
      <VideoList
        videos={results}
        dateMode="viewed"
        empty={
          query ? (
            <EmptyState
              icon={SearchX}
              title="Aucun résultat"
              description={`Rien ne correspond à « ${query} » dans la Bibliothèque.`}
            />
          ) : (
            <EmptyState
              icon={Library}
              title="Rien ici pour l’instant"
              description="Les vidéos que vous ouvrez ou marquez comme vues arrivent ici."
            />
          )
        }
      />
    </>
  );
}
