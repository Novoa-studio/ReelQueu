import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/empty-state";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md items-center justify-center px-4">
      <EmptyState
        icon={Compass}
        title="Page introuvable"
        description="Ce lien ne mène nulle part dans ReelQueue."
        action={
          <Button asChild className="rounded-full">
            <Link href="/">Retour à la file</Link>
          </Button>
        }
      />
    </main>
  );
}
