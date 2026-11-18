export type DealsPlatform = "xbox" | "ps";

export function parseDealsPlatform(raw: string | string[] | undefined): DealsPlatform {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value === "string" && value.trim().toLowerCase() === "ps") return "ps";
  return "xbox";
}

export function dealsPlatformLabel(platform: DealsPlatform): string {
  return platform === "ps" ? "PlayStation" : "Xbox";
}