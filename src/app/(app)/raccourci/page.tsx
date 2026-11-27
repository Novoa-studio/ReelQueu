import type { Metadata } from "next";
import { ShortcutView } from "@/components/views/shortcut-view";

export const metadata: Metadata = { title: "Raccourci iOS" };

export default function ShortcutPage() {
  return <ShortcutView />;
}
