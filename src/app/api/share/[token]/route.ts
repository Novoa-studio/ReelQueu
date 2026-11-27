import { shareVideo } from "@/lib/server/share";

/**
 * GET /api/share/<clé>?url=<lien partagé>
 *
 * Adresse personnelle du Raccourci iOS : une seule action « Obtenir le contenu
 * de l'URL », sans méthode, en-tête ni corps à configurer. Le lien partagé est
 * collé tel quel après « ?url= » ; il peut contenir ses propres « ? » et « & »
 * (paramètres Instagram) : on prend donc tout ce qui suit « url= ».
 *
 * Réponse en texte brut, toujours en 200, pour que le Raccourci affiche la
 * phrase dans sa notification au lieu de s'arrêter sur une erreur HTTP.
 */

function sharedTextFrom(requestUrl: string): string {
  const query = requestUrl.slice(requestUrl.indexOf("?") + 1);
  const match = requestUrl.includes("?") ? query.match(/(?:^|&)(?:url|text)=([\s\S]*)$/) : null;
  const raw = match?.[1] ?? "";
  try {
    return decodeURIComponent(raw.replace(/\+/g, " "));
  } catch {
    return raw;
  }
}

export async function GET(request: Request, ctx: RouteContext<"/api/share/[token]">) {
  const { token } = await ctx.params;
  const result = await shareVideo(decodeURIComponent(token), sharedTextFrom(request.url));
  return new Response(result.message, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-ReelQueue-Status": result.status,
    },
  });
}
