"use client";

import { useState, type FormEvent } from "react";
import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { COLLECTION_COLORS, type Collection, type CollectionColor } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveSheet } from "@/components/ui/responsive-sheet";
import { useCollection, useLibrary } from "@/lib/store/library";
import { useSheetOpen, useUI } from "@/lib/store/ui";
import { COLLECTION_COLOR_VALUES, COLLECTION_NAME_MAX } from "@/lib/collections";
import { cn } from "@/lib/utils";

export function CollectionFormSheet() {
  const open = useSheetOpen("collection-form");
  const sheet = useUI((s) => s.sheet);
  const sheetKey = useUI((s) => s.sheetKey);
  const closeSheet = useUI((s) => s.closeSheet);
  const collectionId = sheet?.type === "collection-form" ? sheet.collectionId : undefined;
  const collection = useCollection(collectionId);
  const editing = Boolean(collectionId);

  return (
    <ResponsiveSheet
      open={open && (!editing || Boolean(collection))}
      onOpenChange={(next) => !next && closeSheet()}
      title={editing ? "Modifier la collection" : "Nouvelle collection"}
    >
      <CollectionForm key={sheetKey} collection={collection} onDone={closeSheet} />
    </ResponsiveSheet>
  );
}

function CollectionForm({
  collection,
  onDone,
}: {
  collection: Collection | undefined;
  onDone: () => void;
}) {
  const router = useRouter();
  const collectionsCount = useLibrary((s) => s.collections.length);
  const createCollection = useLibrary((s) => s.createCollection);
  const updateCollection = useLibrary((s) => s.updateCollection);
  const [name, setName] = useState(collection?.name ?? "");
  const [color, setColor] = useState<CollectionColor>(
    collection?.color ?? COLLECTION_COLORS[(collectionsCount + 6) % COLLECTION_COLORS.length],
  );

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    if (collection) {
      if (await updateCollection(collection.id, { name, color })) onDone();
      return;
    }
    const created = await createCollection(name, color);
    if (created) {
      toast(`Collection « ${created.name} » créée`);
      onDone();
      router.push(`/collections/${created.id}`);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 pb-2">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="collection-name">Nom</Label>
        <Input
          id="collection-name"
          autoFocus
          value={name}
          maxLength={COLLECTION_NAME_MAX}
          onChange={(e) => setName(e.target.value)}
          placeholder="Business, Cuisine, Voyages…"
          enterKeyHint="done"
          className="h-11 rounded-xl"
        />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">Couleur</legend>
        <div className="flex flex-wrap gap-2.5">
          {COLLECTION_COLORS.map((key) => {
            const selected = key === color;
            return (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={COLLECTION_COLOR_VALUES[key].label}
                onClick={() => setColor(key)}
                className={cn(
                  "flex size-8 items-center justify-center rounded-full ring-offset-2 ring-offset-popover transition-shadow",
                  selected && "ring-2 ring-foreground/70",
                )}
                style={{ backgroundColor: COLLECTION_COLOR_VALUES[key].value }}
              >
                {selected ? <Check className="size-4 text-white" strokeWidth={3} /> : null}
              </button>
            );
          })}
        </div>
      </fieldset>

      <Button
        type="submit"
        size="lg"
        className="h-11 rounded-xl text-[15px]"
        disabled={!name.trim()}
      >
        {collection ? "Enregistrer" : "Créer la collection"}
      </Button>
    </form>
  );
}
