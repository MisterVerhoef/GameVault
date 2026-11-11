import type { ImageLoaderProps } from "next/image";

/**
 * Custom Next.js image loader for IGDB artwork.
 *
 * Instead of proxying images through the Next/Vercel image optimizer (which
 * counts unique source images against the Vercel plan limits and returns 402
 * once those are exhausted), we let IGDB's own image CDN do the resizing.
 *
 * Every size below uses IGDB's "fit" behaviour, so the aspect ratio is always
 * preserved (sizes per https://api-docs.igdb.com/#images). Each artwork family
 * keeps its own ladder, so a screenshot slot can step through
 * screenshot_med/big/huge instead of jumping from a 528px cover to 1280px.
 */
type IgdbStep = { suffix: string; width: number };

const COVER_STEPS: IgdbStep[] = [
  { suffix: "cover_small", width: 90 },
  { suffix: "cover_big", width: 264 },
  { suffix: "cover_big_2x", width: 528 },
  { suffix: "720p", width: 1280 },
  { suffix: "1080p", width: 1920 },
  { suffix: "720p_2x", width: 2560 },
];

const SCREENSHOT_STEPS: IgdbStep[] = [
  { suffix: "screenshot_med", width: 569 },
  { suffix: "screenshot_big", width: 889 },
  { suffix: "screenshot_huge", width: 1280 },
  { suffix: "1080p", width: 1920 },
  { suffix: "720p_2x", width: 2560 },
];

const LOGO_STEPS: IgdbStep[] = [
  { suffix: "logo_med", width: 320 },
  { suffix: "720p", width: 1280 },
  { suffix: "1080p", width: 1920 },
  { suffix: "720p_2x", width: 2560 },
];

const IGDB_URL = /^(https:\/\/[\w.-]*igdb\.com\/.+\/upload\/)t_([^/?]+)(\/[^?]+)(\?.*)?$/;

function ladderFor(prefix: string): IgdbStep[] {
  if (prefix.startsWith("screenshot")) return SCREENSHOT_STEPS;
  if (prefix.startsWith("logo")) return LOGO_STEPS;
  return COVER_STEPS;
}

/**
 * Pick the step that needs the least resampling for the requested width. An
 * upscale counts 1.5x heavier than the same factor of downscale, so a 640px
 * slot takes the 528px step instead of jumping to 1280px, while a 176px slot
 * still takes the 264px step.
 */
function pickStep(steps: IgdbStep[], width: number): IgdbStep {
  let best = steps[0];
  let bestCost = Number.POSITIVE_INFINITY;
  for (const step of steps) {
    const ratio = step.width / width;
    const cost = ratio >= 1 ? ratio : 1.5 / ratio;
    if (cost < bestCost) {
      bestCost = cost;
      best = step;
    }
  }
  return best;
}

export default function igdbImageLoader({ src, width }: ImageLoaderProps): string {
  const match = IGDB_URL.exec(src);
  if (!match || !width) return src;
  // The quality parameter is ignored: IGDB does not support it.
  const step = pickStep(ladderFor(match[2]), width);
  return `${match[1]}t_${step.suffix}${match[3]}${match[4] ?? ""}`;
}
