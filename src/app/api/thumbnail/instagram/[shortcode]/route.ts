import { FETCH_USER_AGENT } from "@/lib/metadata/server";

/**
 * GET /api/thumbnail/instagram/<shortcode>
 *
 * Relais de la miniature publique d'une publication Instagram. Le CDN
 * d'Instagram interdit l'affichage de ses images sur un autre site
 * (Cross-Origin-Resource-Policy: same-origin) et signe ses URL pour quelques
 * jours : on passe donc par cette adresse stable. Rien n'est stocké : l'image
 * est transmise telle quelle et seulement mise en cache HTTP.
 */

const SHORTCODE = /^[A-Za-z0-9_-]{5,40}$/;
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_HOSTS = /(^|\.)(cdninstagram\.com|fbcdn\.net)$/;

function notFound(maxAge: number) {
  return new Response(null, {
    status: 404,
    headers: { "Cache-Control": `public, max-age=${maxAge}` },
  });
}

export async function GET(request: Request, ctx: RouteContext<"/api/thumbnail/instagram/[shortcode]">) {
  const { shortcode } = await ctx.params;
  // m (~320 px) pour les listes, l (~640 px) pour les affiches et le mode cinéma.
  const size = new URL(request.url).searchParams.get("size") === "l" ? "l" : "m";
  if (!SHORTCODE.test(shortcode)) return new Response(null, { status: 400 });

  let upstream: Response;
  try {
    upstream = await fetch(`https://www.instagram.com/p/${shortcode}/media/?size=${size}`, {
      headers: { "User-Agent": FETCH_USER_AGENT, Accept: "image/*" },
      redirect: "follow",
      signal: AbortSignal.timeout(6000),
      cache: "no-store",
    });
  } catch {
    return notFound(60);
  }

  const contentType = upstream.headers.get("content-type") ?? "";
  const length = Number(upstream.headers.get("content-length") ?? "0");
  let host = "";
  try {
    host = new URL(upstream.url).hostname;
  } catch {
    /* ignore */
  }
  if (
    !upstream.ok ||
    !contentType.startsWith("image/") ||
    length > MAX_BYTES ||
    !ALLOWED_IMAGE_HOSTS.test(host)
  ) {
    // Publication supprimée, privée ou indisponible : le client affiche le visuel de repli.
    return notFound(upstream.status === 404 ? 86400 : 300);
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=604800",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
