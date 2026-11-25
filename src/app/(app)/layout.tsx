import { AddFab, Sidebar, TabBar } from "@/components/app-shell/navigation";
import { ShellRuntime } from "@/components/app-shell/shell-runtime";

/**
 * Coque de l'application : barre latérale (desktop), barre d'onglets et
 * bouton d'ajout (mobile). Le layout n'est jamais masqué par Activity, d'où
 * l'hébergement des feuilles et du chargement des données ici.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <main className="min-w-0 flex-1 pb-[calc(env(safe-area-inset-bottom)+6.5rem)] md:pb-16">
        <div className="mx-auto w-full max-w-2xl px-4 md:px-8">{children}</div>
      </main>
      <TabBar />
      <AddFab />
      <ShellRuntime />
    </div>
  );
}
