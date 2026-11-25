import type { Metadata } from "next";
import { QueueView } from "@/components/views/queue-view";

export const metadata: Metadata = { title: "À regarder" };

export default function QueuePage() {
  return <QueueView />;
}
