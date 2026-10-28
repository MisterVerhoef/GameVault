/**
 * IGDB still sends the deprecated website category enum and a website type.
 * Official and social links stay "website". Storefronts stay "store".
 * Wikia, Wikipedia, and other wiki types become "wiki". Reddit and Discord
 * become "community". Guide-like type names become "guide".
 * Checked-in rows are still the coarse "website" category, so known hosts
 * are classified from the stored URL until the next sync writes the type.
 */

export const EXTERNAL_LINK_CATEGORIES = ["store", "website", "community", "wiki", "guide"] as const;

export type ExternalLinkCategory = (typeof EXTERNAL_LINK_CATEGORIES)[number];

export interface ClassifiedLink {
  label: string;
  url: string;
  category: ExternalLinkCategory;
}

const MAX_WEBSITES = 24;

const CATEGORY_BY_TOKEN: Record<string, ExternalLinkCategory> = {
  official: "website",
  wikia: "wiki",
  wikipedia: "wiki",
  fandom: "wiki",
  wiki: "wiki",
  facebook: "website",
  twitter: "website",
  twitch: "website",
  instagram: "website",
  youtube: "website",
  iphone: "store",
  ipad: "store",
  android: "store",
  steam: "store",
  reddit: "community",
  itch: "store",
  itchio: "store",
  epicgames: "store",
  gog: "store",
  discord: "community",
  bluesky: "website",
};

const LABEL_BY_TOKEN: Record<string, string> = {
  official: "Official website",
  wikia: "Wikia",
  wikipedia: "Wikipedia",
  fandom: "Fandom",
  wiki: "Wiki",
  facebook: "Facebook",
  twitter: "Twitter",
  twitch: "Twitch",
  instagram: "Instagram",
  youtube: "YouTube",
  iphone: "App Store",
  ipad: "App Store",
  android: "Google Play",
  steam: "Steam",
  reddit: "Reddit",
  itch: "itch.io",
  itchio: "itch.io",
  epicgames: "Epic Games",
  gog: "GOG",
  discord: "Discord",
  bluesky: "Bluesky",
};

/** Deprecated IGDB Website Category enum. Type ids use the same numbers. */
const TOKEN_BY_ID: Record<number, string> = {
  1: "official",
  2: "wikia",
  3: "wikipedia",
  4: "facebook",
  5: "twitter",
  6: "twitch",
  8: "instagram",
  9: "youtube",
  10: "iphone",
  11: "ipad",
  12: "android",
  13: "steam",
  14: "reddit",
  15: "itch",
  16: "epicgames",
  17: "gog",
  18: "discord",
  19: "bluesky",
};

const GUIDE_ORDER: Record<string, number> = { wiki: 0, guide: 1, community: 2 };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function cleanLabel(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (!trimmed || trimmed.length > 80) return undefined;
  return trimmed;
}

function isGenericLabel(label: string): boolean {
  const key = label.toLowerCase();
  return key === "official website" || key === "official site" || key === "website" || key === "link";
}

export function normalizeLinkUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 2000) return undefined;
  const withProtocol = trimmed.startsWith("//") ? `https:${trimmed}` : trimmed;
  let parsed: URL;
  try {
    parsed = new URL(withProtocol);
  } catch {
    return undefined;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return undefined;
  if (!parsed.hostname) return undefined;
  return parsed.href;
}

function hostname(url: string): string {
  return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
}

function dedupeKey(url: string): string {
  const parsed = new URL(url);
  const path = parsed.pathname.replace(/\/+$/, "") || "/";
  return `${parsed.hostname.toLowerCase()}${path}${parsed.search}`;
}

function categoryFromToken(token: string | undefined): ExternalLinkCategory | undefined {
  if (!token) return undefined;
  const known = CATEGORY_BY_TOKEN[token];
  if (known) return known;
  if (token.includes("wiki")) return "wiki";
  if (token.includes("guide") || token.includes("walkthrough") || token.includes("gamefaq")) return "guide";
  return undefined;
}

function labelForToken(token: string | undefined, typeName?: string): string | undefined {
  if (!token) return undefined;
  if (LABEL_BY_TOKEN[token]) return LABEL_BY_TOKEN[token];
  const category = categoryFromToken(token);
  if (category === "guide") return cleanLabel(typeName) ?? "Guide";
  if (category === "wiki") return "Wiki";
  if (category === "community") return "Community";
  if (category === "store") return "Store";
  if (category === "website") return "Official website";
  return undefined;
}

function referenceFromHost(host: string): { category: ExternalLinkCategory; label: string } | undefined {
  if (host === "wikipedia.org" || host.endsWith(".wikipedia.org")) {
    return { category: "wiki", label: "Wikipedia" };
  }
  if (host === "fandom.com" || host.endsWith(".fandom.com")) {
    return { category: "wiki", label: "Fandom" };
  }
  if (host === "wikia.com" || host.endsWith(".wikia.com")) {
    return { category: "wiki", label: "Wikia" };
  }
  if (
    host === "wiki.gg" ||
    host.endsWith(".wiki.gg") ||
    host.endsWith(".fextralife.com") ||
    host.endsWith(".paradoxwikis.com") ||
    host.includes("wiki")
  ) {
    return { category: "wiki", label: "Wiki" };
  }
  if (host === "reddit.com" || host.endsWith(".reddit.com")) {
    return { category: "community", label: "Reddit" };
  }
  if (
    host === "discord.com" ||
    host === "discord.gg" ||
    host === "discordapp.com" ||
    host.endsWith(".discord.com") ||
    host.endsWith(".discord.gg") ||
    host.endsWith(".discordapp.com")
  ) {
    return { category: "community", label: "Discord" };
  }
  if (host === "store.steampowered.com" || host === "steampowered.com" || host.endsWith(".steampowered.com")) {
    return { category: "store", label: "Steam" };
  }
  if (host === "gog.com" || host.endsWith(".gog.com")) {
    return { category: "store", label: "GOG" };
  }
  if (host === "epicgames.com" || host.endsWith(".epicgames.com")) {
    return { category: "store", label: "Epic Games" };
  }
  if (host === "itch.io" || host.endsWith(".itch.io")) {
    return { category: "store", label: "itch.io" };
  }
  if (host === "store.playstation.com") {
    return { category: "store", label: "PlayStation Store" };
  }
  if (host === "apps.apple.com" || host === "itunes.apple.com") {
    return { category: "store", label: "App Store" };
  }
  if (host === "play.google.com") {
    return { category: "store", label: "Google Play" };
  }
  return undefined;
}

function classifyUrl(url: string): { category: ExternalLinkCategory; label: string } {
  return referenceFromHost(hostname(url)) ?? { category: "website", label: "Official website" };
}

function knownCategory(value: unknown): ExternalLinkCategory | undefined {
  return typeof value === "string" && EXTERNAL_LINK_CATEGORIES.includes(value as ExternalLinkCategory)
    ? value as ExternalLinkCategory
    : undefined;
}

function readTypeName(site: Record<string, unknown>): string | undefined {
  const type = site.type;
  if (typeof type === "string" && !/^\d+$/.test(type.trim())) return type;
  if (isRecord(type) && typeof type.type === "string") return type.type;
  return undefined;
}

function readTypeId(site: Record<string, unknown>): number | undefined {
  const type = site.type;
  if (typeof type === "number" && Number.isInteger(type)) return type;
  if (isRecord(type) && typeof type.id === "number" && Number.isInteger(type.id)) return type.id;
  return undefined;
}

function readCategoryId(site: Record<string, unknown>): number | undefined {
  return typeof site.category === "number" && Number.isInteger(site.category) ? site.category : undefined;
}

function igdbToken(site: Record<string, unknown>): { token?: string; typeName?: string } {
  const typeName = readTypeName(site);
  if (typeName) {
    const token = normalizeToken(typeName);
    if (categoryFromToken(token)) return { token, typeName };
  }
  const typeId = readTypeId(site);
  if (typeId != null && TOKEN_BY_ID[typeId]) return { token: TOKEN_BY_ID[typeId], typeName };
  const categoryId = readCategoryId(site);
  if (categoryId != null && TOKEN_BY_ID[categoryId]) return { token: TOKEN_BY_ID[categoryId], typeName };
  return { typeName };
}

function chooseLabel(provided: string | undefined, generated: string): string {
  if (provided && !isGenericLabel(provided)) return provided;
  return generated;
}

function isReference(link: ClassifiedLink): boolean {
  return link.category === "wiki" || link.category === "guide" || link.category === "community";
}

function preferWithinCap(links: ClassifiedLink[]): ClassifiedLink[] {
  if (links.length <= MAX_WEBSITES) return links;
  const chosen: ClassifiedLink[] = [];
  const seen = new Set<string>();
  const take = (link: ClassifiedLink) => {
    if (chosen.length >= MAX_WEBSITES || seen.has(link.url)) return;
    seen.add(link.url);
    chosen.push(link);
  };
  for (const link of links) if (isReference(link)) take(link);
  for (const link of links) take(link);
  const order = new Map(links.map((link, index) => [link.url, index]));
  return chosen.sort((left, right) => (order.get(left.url) ?? 0) - (order.get(right.url) ?? 0));
}

function collect(links: ClassifiedLink[]): ClassifiedLink[] {
  const result: ClassifiedLink[] = [];
  const seen = new Set<string>();
  for (const link of links) {
    const key = dedupeKey(link.url);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(link);
  }
  return preferWithinCap(result);
}

/** Map one raw IGDB website. A known type wins over the URL host. */
export function mapIgdbWebsite(site: unknown): ClassifiedLink | undefined {
  if (!isRecord(site)) return undefined;
  const url = normalizeLinkUrl(site.url);
  if (!url) return undefined;
  const { token, typeName } = igdbToken(site);
  const typed = categoryFromToken(token);
  const inferred = classifyUrl(url);
  const category = typed ?? inferred.category;
  const generated = labelForToken(token, typeName) ?? inferred.label;
  const label = chooseLabel(cleanLabel(site.name ?? site.label), generated);
  return { label, url, category };
}

export function mapIgdbWebsites(sites: unknown): ClassifiedLink[] {
  if (!Array.isArray(sites)) return [];
  return collect(sites.flatMap((site) => {
    const link = mapIgdbWebsite(site);
    return link ? [link] : [];
  }));
}

/**
 * Keep explicit wiki, guide, community, and store categories.
 * Coarse "website" rows are reclassified when the stored URL is a known host.
 */
export function sanitizeWebsites(value: unknown): ClassifiedLink[] {
  if (!Array.isArray(value)) return [];
  const links: ClassifiedLink[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) continue;
    const url = normalizeLinkUrl(entry.url);
    if (!url) continue;
    const explicit = knownCategory(entry.category);
    const inferred = classifyUrl(url);
    const category = explicit === "wiki" || explicit === "guide" || explicit === "community" || explicit === "store"
      ? explicit
      : inferred.category;
    const generated = category === inferred.category
      ? inferred.label
      : category === "wiki"
        ? "Wiki"
        : category === "guide"
          ? "Guide"
          : category === "community"
            ? "Community"
            : category === "store"
              ? "Store"
              : "Official website";
    links.push({
      label: chooseLabel(cleanLabel(entry.label ?? entry.name), generated),
      url,
      category,
    });
  }
  return collect(links);
}

export function guideLinks(links: readonly { label: string; url: string; category?: string }[] | undefined): ClassifiedLink[] {
  const guides: ClassifiedLink[] = [];
  for (const link of links ?? []) {
    if (link.category !== "wiki" && link.category !== "guide" && link.category !== "community") continue;
    const url = normalizeLinkUrl(link.url);
    const label = cleanLabel(link.label);
    if (!url || !label) continue;
    guides.push({ label, url, category: link.category });
  }
  return guides.sort((left, right) => {
    const order = (GUIDE_ORDER[left.category] ?? 9) - (GUIDE_ORDER[right.category] ?? 9);
    if (order !== 0) return order;
    const label = left.label.localeCompare(right.label);
    if (label !== 0) return label;
    return left.url.localeCompare(right.url);
  });
}
