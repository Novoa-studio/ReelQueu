import { parseVideoUrl } from "@/lib/platforms";
import { fetchVideoMetadata } from "@/lib/metadata/server";
import { requireUser } from "@/lib/server/auth";

/**
 * GET /api/metadata?url=<lien>
 * → { title, creator, thumbnailUrl } (valeurs nulles si indisponibles).
 */
export async function GET(request: Request) {
  const denied = await requireUser(request);
  if (denied) return denied;

  const raw = new URL(request.url).searchParams.get("url") ?? "";
  const parsed = parseVideoUrl(raw);
  if (!parsed.ok) return Response.json({ error: "invalid_url" }, { status: 400 });

  const metadata = await fetchVideoMetadata(parsed.value);
  return Response.json(metadata, {
    headers: { "Cache-Control": "private, max-age=3600" },
  });
}
