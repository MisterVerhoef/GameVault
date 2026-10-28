import type { MultiplayerInfo } from "./games";

export function formatCount(count?: number) {
  if (count == null || !Number.isFinite(count) || count <= 0) return "";
  return Math.round(count).toLocaleString("en-GB");
}

export function formatCountLabel(count: number | undefined, plural: string) {
  const formatted = formatCount(count);
  if (!formatted || count == null) return "";
  const noun = Math.round(count) === 1 ? plural.replace(/s$/, "") : plural;
  return `${formatted} ${noun}`;
}

/** IGDB stores time-to-beat in seconds. Short sessions stay in minutes. */
export function formatPlayTime(seconds?: number) {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return "";
  if (seconds < 3600) {
    const minutes = Math.max(1, Math.round(seconds / 60));
    return `${minutes}m`;
  }
  const rounded = Math.round((seconds / 3600) * 10) / 10;
  if (Number.isInteger(rounded)) return `${rounded}h`;
  return `${rounded.toFixed(1)}h`;
}

export function formatReleaseDay(iso?: string) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    Number.isNaN(date.getTime())
    || date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) {
    return "";
  }
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function coopPhrase(label: string, enabled: boolean | undefined, max?: number) {
  if (!enabled) return "";
  return max && max > 1 ? `${label}, up to ${max}` : label;
}

export function multiplayerPhrases(info?: MultiplayerInfo) {
  if (!info) return [];
  const phrases = [
    coopPhrase("Campaign co-op", info.campaignCoop),
    coopPhrase("Online co-op", info.onlineCoop, info.onlineCoopMax),
    coopPhrase("Local co-op", info.offlineCoop, info.offlineCoopMax),
    info.lanCoop ? "LAN co-op" : "",
    info.dropIn ? "Drop-in" : "",
    info.splitscreen ? "Split screen" : "",
    info.splitscreenOnline ? "Online split screen" : "",
    info.offlineMax && info.offlineMax > 1 && info.offlineMax !== info.offlineCoopMax
      ? `Up to ${info.offlineMax} players offline`
      : "",
    info.onlineMax && info.onlineMax > 1 && info.onlineMax !== info.onlineCoopMax
      ? `Up to ${info.onlineMax} players online`
      : "",
  ];
  return phrases.filter((phrase) => phrase.length > 0);
}
