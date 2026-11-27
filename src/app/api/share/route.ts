import { shareVideo } from "@/lib/server/share";

/**
 * POST /api/share — ajout depuis le Raccourci iOS (variante avec options).
 *
 *   Authorization: Bearer <clé d'ajout>
 *   Corps : JSON { "url": "…" } (ou { "text": "…" }), formulaire, ou texte brut.
 *
 * Réponse JSON : { ok, status, message }. Variante sans options :
 * GET /api/share/<clé>?url=… (voir [token]/route.ts).
 */

async function readSharedText(request: Request): Promise<string> {
  const type = request.headers.get("content-type") ?? "";
  try {
    if (type.includes("application/json")) {
      const body = (await request.json()) as Record<string, unknown>;
      const value = body.url ?? body.text ?? body.link ?? "";
      return typeof value === "string" ? value : String(value ?? "");
    }
    if (type.includes("form")) {
      const form = await request.formData();
      return String(form.get("url") ?? form.get("text") ?? "");
    }
    return (await request.text()).slice(0, 4000);
  } catch {
    return "";
  }
}

export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
  const { httpStatus, ...body } = await shareVideo(token, await readSharedText(request));
  return Response.json(body, { status: httpStatus, headers: { "Cache-Control": "no-store" } });
}
