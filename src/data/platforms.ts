export type Platform = "PC" | "PS5" | "Xbox" | "Switch" | "Other";

export const PLATFORM_COLORS: Record<Platform, string> = {
  PC: "#8B5CF6",
  PS5: "#0070FF",
  Xbox: "#107C10",
  Switch: "#E60012",
  Other: "#A1A1AA",
};

export interface PlatformFamily {
  key: string;
  label: string;
  platform: Platform | null;
  variants: readonly string[];
  variantChildren?: Record<string, readonly string[]>;
}

export const PLATFORM_FAMILIES: readonly PlatformFamily[] = [
  {
    key: "pc",
    label: "PC",
    platform: "PC",
    variants: ["Windows", "Mac", "Linux"],
  },
  {
    key: "playstation",
    label: "PlayStation",
    platform: "PS5",
    variants: ["PS5", "PS4", "PS3", "PS2", "PS1", "PSP", "Vita"],
  },
  {
    key: "xbox",
    label: "Xbox",
    platform: "Xbox",
    variants: ["Xbox Series", "Xbox One", "Xbox 360", "Original Xbox"],
  },
  {
    key: "nintendo",
    label: "Nintendo",
    platform: "Switch",
    variants: ["Switch", "Switch 2", "Wii U", "Wii", "GameCube", "N64", "SNES", "NES", "3DS", "DS", "Game Boy"],
  },
  {
    key: "other",
    label: "Other",
    platform: "Other",
    variants: ["Sega", "Atari", "3DO", "Ouya", "Neo Geo", "Commodore", "Stadia"],
    variantChildren: {
      Sega: ["Master System", "Genesis", "Mega Drive", "Sega CD", "32X", "Saturn", "Dreamcast", "Game Gear", "SG-1000"],
      Atari: ["Atari 2600", "Atari 5200", "Atari 7800", "Atari 8-bit", "Atari ST", "Atari XEGS", "Atari Lynx", "Atari Jaguar", "Atari VCS"],
    },
  },
];

export interface IgdbPlatformMapping {
  names: readonly string[];
  family: Platform;
  variant: string;
}

export const IGDB_PLATFORM_ALIASES: readonly IgdbPlatformMapping[] = [
  { names: ["PC", "PC (Microsoft Windows)", "Windows"], family: "PC", variant: "Windows" },
  { names: ["Mac", "Mac OS"], family: "PC", variant: "Mac" },
  { names: ["Linux"], family: "PC", variant: "Linux" },
  { names: ["PlayStation 5", "PS5"], family: "PS5", variant: "PS5" },
  { names: ["PlayStation 4", "PS4"], family: "PS5", variant: "PS4" },
  { names: ["PlayStation 3", "PS3"], family: "PS5", variant: "PS3" },
  { names: ["PlayStation 2", "PS2"], family: "PS5", variant: "PS2" },
  { names: ["PlayStation", "PlayStation 1", "PS1"], family: "PS5", variant: "PS1" },
  { names: ["PlayStation Portable", "PSP"], family: "PS5", variant: "PSP" },
  { names: ["PlayStation Vita", "PS Vita", "Vita"], family: "PS5", variant: "Vita" },
  { names: ["Xbox Series X|S", "Xbox Series X/S", "Xbox Series"], family: "Xbox", variant: "Xbox Series" },
  { names: ["Xbox One"], family: "Xbox", variant: "Xbox One" },
  { names: ["Xbox 360"], family: "Xbox", variant: "Xbox 360" },
  { names: ["Xbox", "Original Xbox"], family: "Xbox", variant: "Original Xbox" },
  { names: ["Nintendo Switch", "Switch"], family: "Switch", variant: "Switch" },
  { names: ["Nintendo Switch 2", "Switch 2"], family: "Switch", variant: "Switch 2" },
  { names: ["Wii U"], family: "Switch", variant: "Wii U" },
  { names: ["Wii"], family: "Switch", variant: "Wii" },
  { names: ["Nintendo GameCube", "GameCube", "NGC"], family: "Switch", variant: "GameCube" },
  { names: ["Nintendo 64", "N64"], family: "Switch", variant: "N64" },
  { names: ["Super Nintendo Entertainment System", "SNES", "Super Nintendo"], family: "Switch", variant: "SNES" },
  { names: ["Nintendo Entertainment System", "NES", "Family Computer", "Famicom"], family: "Switch", variant: "NES" },
  { names: ["Nintendo 3DS", "New Nintendo 3DS", "3DS"], family: "Switch", variant: "3DS" },
  { names: ["Nintendo DS", "Nintendo DSi", "DS"], family: "Switch", variant: "DS" },
  { names: ["Game Boy", "Game Boy Color", "Game Boy Advance", "Nintendo Game Boy"], family: "Switch", variant: "Game Boy" },
  { names: ["Sega Master System", "Master System"], family: "Other", variant: "Master System" },
  { names: ["Sega Mega Drive/Genesis", "Sega Genesis", "Genesis", "Mega Drive"], family: "Other", variant: "Genesis" },
  { names: ["Sega CD", "Mega-CD"], family: "Other", variant: "Sega CD" },
  { names: ["Sega 32X", "32X"], family: "Other", variant: "32X" },
  { names: ["Sega Saturn", "Saturn"], family: "Other", variant: "Saturn" },
  { names: ["Dreamcast", "Sega Dreamcast"], family: "Other", variant: "Dreamcast" },
  { names: ["Sega Game Gear", "Game Gear"], family: "Other", variant: "Game Gear" },
  { names: ["SG-1000"], family: "Other", variant: "SG-1000" },
  { names: ["Atari 2600"], family: "Other", variant: "Atari 2600" },
  { names: ["Atari 5200"], family: "Other", variant: "Atari 5200" },
  { names: ["Atari 7800"], family: "Other", variant: "Atari 7800" },
  { names: ["Atari 8-bit", "Atari 800"], family: "Other", variant: "Atari 8-bit" },
  { names: ["Atari ST"], family: "Other", variant: "Atari ST" },
  { names: ["Atari XEGS"], family: "Other", variant: "Atari XEGS" },
  { names: ["Atari Lynx"], family: "Other", variant: "Atari Lynx" },
  { names: ["Atari Jaguar"], family: "Other", variant: "Atari Jaguar" },
  { names: ["Atari VCS"], family: "Other", variant: "Atari VCS" },
  { names: ["3DO Interactive Multiplayer", "3DO"], family: "Other", variant: "3DO" },
  { names: ["Ouya"], family: "Other", variant: "Ouya" },
  { names: ["Neo Geo AES", "Neo Geo CD", "Neo Geo", "Neo Geo Pocket", "Neo Geo Pocket Color"], family: "Other", variant: "Neo Geo" },
  { names: ["Commodore C64/128", "Commodore VIC-20", "Commodore 16", "Commodore Plus/4", "Amiga", "Commodore"], family: "Other", variant: "Commodore" },
  { names: ["Google Stadia", "Stadia"], family: "Other", variant: "Stadia" },
];

const normalizedNameIndex = new Map<string, IgdbPlatformMapping>();
for (const mapping of IGDB_PLATFORM_ALIASES) {
  for (const name of mapping.names) {
    normalizedNameIndex.set(normalizePlatformLabel(name), mapping);
  }
}

const parentVariantChildren = new Map<string, readonly string[]>();
for (const family of PLATFORM_FAMILIES) {
  for (const [parent, children] of Object.entries(family.variantChildren ?? {})) {
    parentVariantChildren.set(parent, children);
  }
}

export function normalizePlatformLabel(value: string) {
  return value.trim().toLowerCase();
}

export function resolveIgdbPlatform(name: string): {
  family: Platform;
  variant: string;
  name: string;
  unmapped: boolean;
} {
  const mapping = normalizedNameIndex.get(normalizePlatformLabel(name));
  if (mapping) {
    return { family: mapping.family, variant: mapping.variant, name, unmapped: false };
  }
  return { family: "Other", variant: name, name, unmapped: true };
}

function labelsForVariant(variant: string): Set<string> {
  const labels = new Set<string>([normalizePlatformLabel(variant)]);
  const mapping = normalizedNameIndex.get(normalizePlatformLabel(variant));
  if (mapping) {
    for (const name of mapping.names) labels.add(normalizePlatformLabel(name));
    labels.add(normalizePlatformLabel(mapping.variant));
  }
  for (const alias of IGDB_PLATFORM_ALIASES) {
    if (normalizePlatformLabel(alias.variant) === normalizePlatformLabel(variant)) {
      for (const name of alias.names) labels.add(normalizePlatformLabel(name));
    }
  }
  return labels;
}

export function variantMatchLabels(variant: string): string[] {
  const children = parentVariantChildren.get(variant);
  const labels = labelsForVariant(variant);
  if (children) {
    for (const child of children) {
      for (const label of labelsForVariant(child)) labels.add(label);
    }
  }
  return Array.from(labels);
}

export function gameMatchesPlatformVariant(
  game: { platformVariants?: string[] },
  variant: string,
) {
  const expected = new Set(variantMatchLabels(variant));
  return (game.platformVariants ?? []).some((value) => expected.has(normalizePlatformLabel(value)));
}

/** Navbar label for a stored IGDB platform, collapsing aliases such as Mega Drive and Genesis. */
export function canonicalPlatformVariant(name: string): string {
  const resolved = resolveIgdbPlatform(name);
  return resolved.unmapped ? name.trim() : resolved.variant;
}

export function familyForVariantLabel(variant: string): PlatformFamily | undefined {
  return PLATFORM_FAMILIES.find((family) => {
    if (family.variants.includes(variant)) return true;
    return Object.entries(family.variantChildren ?? {}).some(
      ([parent, children]) => parent === variant || children.includes(variant),
    );
  });
}

export function isPcPlatformBrowse(platform: Platform | null, variant: string | null): boolean {
  if (platform === "PC") return true;
  if (!variant) return false;
  return familyForVariantLabel(variant)?.platform === "PC";
}

export interface ExclusiveSelection {
  platform: Platform | null;
  variant: string | null;
}

/**
 * A game is exclusive when every release sits on the selected platform.
 * A specific chip such as PS2 requires that one variant. A parent chip such as
 * Sega allows any mix of its own machines. A family chip such as Xbox allows
 * any mix of that family's variants. PC is never an exclusives browse.
 */
export function gameIsPlatformExclusive(
  game: { platforms?: Platform[]; platformVariants?: string[] },
  selection: ExclusiveSelection,
): boolean {
  if (isPcPlatformBrowse(selection.platform, selection.variant)) return false;
  const variants = [
    ...new Set((game.platformVariants ?? []).map(canonicalPlatformVariant).filter(Boolean)),
  ];

  if (selection.variant) {
    const children = parentVariantChildren.get(selection.variant);
    if (children?.length) {
      const allowed = new Set(children.map(canonicalPlatformVariant));
      allowed.add(canonicalPlatformVariant(selection.variant));
      return variants.length > 0 && variants.every((variant) => allowed.has(variant));
    }
    return variants.length === 1 && variants[0] === canonicalPlatformVariant(selection.variant);
  }

  if (!selection.platform) return false;
  if (variants.length === 0) {
    const families = game.platforms ?? [];
    return families.length === 1 && families[0] === selection.platform;
  }
  return variants.every((variant) => resolveIgdbPlatform(variant).family === selection.platform);
}
