import { cloudServicesForGame, type CloudStreamingIndex } from "./cloud-streaming";
import { playAnywhereForGame, type PlayAnywhereIndex, xboxExternalIds } from "./play-anywhere";
import { gameMatchesPlatformVariant } from "./platforms";

export const XBOX_SERIES_VARIANT = "Xbox Series";

export type XboxFeatureAvailability = "supported" | "unsupported" | "unknown";

export interface XboxSeriesFeatureStatus {
  playAnywhere: XboxFeatureAvailability;
  cloudGaming: XboxFeatureAvailability;
}

export function gameHasXboxSeries(variants: readonly string[] | undefined): boolean {
  return gameMatchesPlatformVariant({ platformVariants: [...(variants ?? [])] }, XBOX_SERIES_VARIANT);
}

export function xboxCloudGamingAvailability(
  cloudIndex: CloudStreamingIndex,
  gameId: string,
  game?: { externalIds?: readonly { store: string; id: string }[] },
): XboxFeatureAvailability {
  const services = cloudServicesForGame(cloudIndex, gameId);
  if (services.some((service) => service.id === "xbox-cloud")) return "supported";
  if (game && xboxExternalIds(game).length > 0) return "unsupported";
  return "unknown";
}

export function xboxPlayAnywhereAvailability(
  playAnywhereIndex: PlayAnywhereIndex,
  gameId: string,
): XboxFeatureAvailability {
  const entry = playAnywhereForGame(playAnywhereIndex, gameId);
  if (!entry) return "unknown";
  return entry.playAnywhere ? "supported" : "unsupported";
}

export function xboxSeriesFeatureStatus(
  game: {
    id: string;
    platformVariants?: readonly string[];
    externalIds?: readonly { store: string; id: string }[];
  },
  playAnywhereIndex: PlayAnywhereIndex,
  cloudIndex: CloudStreamingIndex,
): XboxSeriesFeatureStatus | null {
  if (!gameHasXboxSeries(game.platformVariants)) return null;
  return {
    playAnywhere: xboxPlayAnywhereAvailability(playAnywhereIndex, game.id),
    cloudGaming: xboxCloudGamingAvailability(cloudIndex, game.id, game),
  };
}

export function hasKnownXboxSeriesFeature(status: XboxSeriesFeatureStatus | null): boolean {
  if (!status) return false;
  return status.playAnywhere !== "unknown" || status.cloudGaming !== "unknown";
}