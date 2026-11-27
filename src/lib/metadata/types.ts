/** Informations publiques d'une vidéo, renvoyées par /api/metadata. */
export interface VideoMetadata {
  title: string | null;
  creator: string | null;
  thumbnailUrl: string | null;
}

export const EMPTY_METADATA: VideoMetadata = { title: null, creator: null, thumbnailUrl: null };

/** Chemin du relais de miniature Instagram (voir app/api/thumbnail). */
export function instagramThumbnailPath(shortcode: string): string {
  return `/api/thumbnail/instagram/${shortcode}`;
}
