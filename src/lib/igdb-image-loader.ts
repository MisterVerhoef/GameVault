import type { ImageLoaderProps } from "next/image";

/**
 * Custom Next.js image loader for IGDB artwork.
 *
 * Instead of proxying images through the Next/Vercel image optimizer (which
 * counts unique source images against the Vercel plan limits and returns 402
 * once those are exhausted), we let IGDB's own image CDN do the resizing.
 *
 * Every size in the ladder below uses IGDB's "fit" behaviour, so the aspect
 * ratio is always preserved. Sizes per https://api-docs.igdb.com/#images:
 * cover_small 90, cover_big 264, cover_big_2x 528, 720p 1280, 1080p 1920,
 * 720p_2x 2560, original.
 */
const IGDB_SIZES: Array<{ suffix: string; width: number }> = [
  { suffix: "t_cover_small", width: 90 },
  { suffix: "t_cover_big", width: 264 },
  { suffix: "t_cover_big_2x", width: 528 },
  { suffix: "t_720p", width: 1280 },
  { suffix: "t_1080p", width: 1920 },
  { suffix: "t_720p_2x", width: 2560 },
];

const IGDB_URL = /^(https:\/\/[\w.-]*igdb\.com\/.+\/upload\/)t_[^/]+(\/[^?]+)(\?.*)?$/;

export default function igdbImageLoader({ src, width }: ImageLoaderProps): string {
  const match = IGDB_URL.exec(src);
  if (!match) return src;
  // Pick the smallest IGDB size whose box fits the requested width. The
  // quality parameter is ignored: IGDB does not support it.
  const size = IGDB_SIZES.find((step) => step.width >= width) ?? { suffix: "t_original" };
  return `${match[1]}${size.suffix}${match[2]}${match[3] ?? ""}`;
}
