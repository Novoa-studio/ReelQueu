import { Sidebar, TabBar } from "@/components/app-shell/navigation";
import { ShellRuntime } from "@/components/app-shell/shell-runtime";

/**
 * Coque de l'application : barre latérale (desktop), barre d'onglets flottante
 * en verre (mobile). Le layout n'est jamais masqué par Activity, d'où
 * l'hébergement des feuilles, du mode cinéma et du chargement des données ici.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh">
      {/* Fond ambiant : halos très doux que le verre des commandes reflète. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          backgroundImage:
            "radial-gradient(55% 38% at 8% 0%, var(--ambient-a), transparent 70%), radial-gradient(45% 32% at 100% 12%, var(--ambient-b), transparent 70%), radial-gradient(60% 40% at 50% 105%, var(--ambient-c), transparent 70%)",
        }}
      />
      <Sidebar />
      <main className="min-w-0 flex-1 pb-[calc(env(safe-area-inset-bottom)+6.5rem)] md:pb-16">
        <div className="mx-auto w-full max-w-2xl px-4 md:px-8 lg:max-w-4xl">{children}</div>
      </main>
      <TabBar />
      <ShellRuntime />
    </div>
  );
}
