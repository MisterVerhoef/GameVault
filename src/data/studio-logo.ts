/**
 * Studio marks.
 *
 * A catalogue logo from IGDB sync wins when it is a real images.igdb.com file.
 * The name map below is only the fallback for companies the sync has not given
 * an image yet (or whose image URL is unusable). Names that match neither stay
 * text-only; the studio page shows initials in that case.
 */

export interface CatalogueCompanyLogo {
  url: string;
  width?: number;
  height?: number;
}

export interface ResolvedStudioLogo {
  src: string;
  aspect: number;
  source: "catalogue" | "fallback";
}

type StudioMark = {
  src: string;
  aspect: number;
};

/** IGDB `t_logo_med` is 284×160. Used when the company logo has no dimensions. */
const LOGO_MED_ASPECT = 284 / 160;

const ea: StudioMark = { src: "/studios/ea.svg", aspect: 1 };
const sega: StudioMark = { src: "/studios/sega.svg", aspect: 118.1 / 56 };
const ubisoft: StudioMark = { src: "/studios/ubisoft.svg", aspect: 1 };
const rockstar: StudioMark = { src: "/studios/rockstar.svg", aspect: 1 };
const telltale: StudioMark = { src: "/studios/telltale.svg", aspect: 72 / 64 };
const sony: StudioMark = { src: "/studios/sony.svg", aspect: 1 };
const atari: StudioMark = { src: "/studios/atari.svg", aspect: 1 };
const thq: StudioMark = { src: "/studios/thq.svg", aspect: 100.5 / 56 };
const blizzard: StudioMark = { src: "/studios/blizzard.svg", aspect: 176.9 / 48 };
const insomniac: StudioMark = { src: "/studios/insomniac.svg", aspect: 193.2 / 58 };
const microsoft: StudioMark = { src: "/studios/microsoft.svg", aspect: 171.7 / 52 };
const nintendo: StudioMark = { src: "/platforms/nintendo.svg", aspect: 149.57 / 52 };
const capcom: StudioMark = { src: "/studios/capcom.svg", aspect: 3.64 };
const square: StudioMark = { src: "/studios/square-enix.svg", aspect: 3.86 };
const konami: StudioMark = { src: "/studios/konami.svg", aspect: 3.65 };
const activision: StudioMark = { src: "/studios/activision.svg", aspect: 3.82 };
const atlus: StudioMark = { src: "/studios/atlus.svg", aspect: 3.46 };
const bandai: StudioMark = { src: "/studios/bandai-namco.svg", aspect: 4.33 };
const namco: StudioMark = { src: "/studios/namco.svg", aspect: 3.73 };
const bethesda: StudioMark = { src: "/studios/bethesda.svg", aspect: 3.74 };
const takeTwo: StudioMark = { src: "/studios/take-two.svg", aspect: 4.02 };
const twoK: StudioMark = { src: "/studios/2k.svg", aspect: 1.58 };
const cdProjekt: StudioMark = { src: "/studios/cd-projekt.svg", aspect: 3.5 };
const lucas: StudioMark = { src: "/studios/lucasarts.svg", aspect: 4.05 };
const fromSoftware: StudioMark = { src: "/studios/fromsoftware.svg", aspect: 4.2 };
const bioware: StudioMark = { src: "/studios/bioware.svg", aspect: 3.76 };
const idSoftware: StudioMark = { src: "/studios/id.svg", aspect: 1.07 };
const sierra: StudioMark = { src: "/studios/sierra.svg", aspect: 3.39 };
const snk: StudioMark = { src: "/studios/snk.svg", aspect: 2.38 };
const naughtyDog: StudioMark = { src: "/studios/naughty-dog.svg", aspect: 4.11 };
const bungie: StudioMark = { src: "/studios/bungie.svg", aspect: 3.45 };
const paradox: StudioMark = { src: "/studios/paradox.svg", aspect: 3.97 };
const valve: StudioMark = { src: "/studios/valve.svg", aspect: 3.33 };
const eidos: StudioMark = { src: "/studios/eidos.svg", aspect: 3.24 };
const gameFreak: StudioMark = { src: "/studios/game-freak.svg", aspect: 3.93 };
const threeFortyThree: StudioMark = { src: "/studios/343.svg", aspect: 2.24 };
const wb: StudioMark = { src: "/studios/wb.svg", aspect: 1 };
const koei: StudioMark = { src: "/studios/koei-tecmo.svg", aspect: 3.92 };
const falcom: StudioMark = { src: "/studios/falcom.svg", aspect: 3.51 };
const arcSystem: StudioMark = { src: "/studios/arc-system.svg", aspect: 3.9 };
const devolver: StudioMark = { src: "/studios/devolver.svg", aspect: 3.96 };
const codemasters: StudioMark = { src: "/studios/codemasters.svg", aspect: 4 };
const spike: StudioMark = { src: "/studios/spike.svg", aspect: 3.16 };
const hudson: StudioMark = { src: "/studios/hudson.svg", aspect: 3.85 };

/** Parent-brand marks. Subsidiaries share the parent logo; unrelated names stay text-only. */
const RULES: readonly { test: RegExp; logo: StudioMark }[] = [
  { test: /^(?:ea|electronic arts)\b/i, logo: ea },
  { test: /^sega\b/i, logo: sega },
  { test: /^ubisoft\b/i, logo: ubisoft },
  { test: /^rockstar\b/i, logo: rockstar },
  { test: /^telltale\b/i, logo: telltale },
  { test: /^sony (?:computer|interactive|online) entertainment\b/i, logo: sony },
  { test: /^sony xdev\b/i, logo: sony },
  { test: /^atari\b/i, logo: atari },
  { test: /^thq\b/i, logo: thq },
  { test: /^blizzard\b/i, logo: blizzard },
  { test: /^insomniac\b/i, logo: insomniac },
  { test: /^microsoft\b|^xbox game studios$/i, logo: microsoft },
  { test: /^nintendo\b/i, logo: nintendo },
  { test: /^capcom\b/i, logo: capcom },
  { test: /^square(?! electronic)\b/i, logo: square },
  { test: /^konami\b/i, logo: konami },
  { test: /^activision\b/i, logo: activision },
  { test: /^atlus\b/i, logo: atlus },
  { test: /^(?:bandai namco|namco bandai)\b/i, logo: bandai },
  { test: /^namco\b/i, logo: namco },
  { test: /^bandai\b/i, logo: bandai },
  { test: /^bethesda\b/i, logo: bethesda },
  { test: /^take-two\b/i, logo: takeTwo },
  { test: /^2k\b/i, logo: twoK },
  { test: /^cd projekt\b/i, logo: cdProjekt },
  { test: /^lucas(?:arts|film games)\b|^lucas arts\b/i, logo: lucas },
  { test: /^from ?software\b/i, logo: fromSoftware },
  { test: /^bioware\b/i, logo: bioware },
  { test: /^id software\b/i, logo: idSoftware },
  { test: /^sierra\b/i, logo: sierra },
  { test: /^snk\b/i, logo: snk },
  { test: /^naughty dog\b/i, logo: naughtyDog },
  { test: /^bungie\b/i, logo: bungie },
  { test: /^paradox\b/i, logo: paradox },
  { test: /^valve\b/i, logo: valve },
  { test: /^eidos\b/i, logo: eidos },
  { test: /^game freak\b/i, logo: gameFreak },
  { test: /^343 industries\b/i, logo: threeFortyThree },
  { test: /^(?:wb games|warner bros)\b/i, logo: wb },
  { test: /^(?:koei(?: tecmo)?|tecmo(?: koei)?)\b/i, logo: koei },
  { test: /^nihon falcom\b/i, logo: falcom },
  { test: /^arc system works\b/i, logo: arcSystem },
  { test: /^devolver\b/i, logo: devolver },
  { test: /^codemasters\b/i, logo: codemasters },
  { test: /^spike\b/i, logo: spike },
  { test: /^hudson\b/i, logo: hudson },
];

function positiveDimension(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return undefined;
  return Math.round(value);
}

function logoAspect(width?: number, height?: number) {
  if (!width || !height) return LOGO_MED_ASPECT;
  const aspect = width / height;
  if (!Number.isFinite(aspect) || aspect < 0.4 || aspect > 8) return LOGO_MED_ASPECT;
  return aspect;
}

/**
 * Keep an IGDB company logo and rewrite it to `t_logo_med`.
 * Anything else is dropped so the UI can use the local mark or initials.
 */
export function catalogueCompanyLogo(value: unknown): CatalogueCompanyLogo | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const record = value as Record<string, unknown>;
  const raw = typeof record.url === "string" ? record.url.trim() : "";
  if (!raw || raw.length > 400) return undefined;
  const withProtocol = raw.replace(/^\/\//, "https://");
  let parsed: URL;
  try {
    parsed = new URL(withProtocol);
  } catch {
    return undefined;
  }
  if (parsed.protocol !== "https:" || parsed.hostname !== "images.igdb.com") return undefined;
  if (parsed.username || parsed.password) return undefined;
  if (!parsed.pathname.includes("/igdb/image/upload/")) return undefined;
  const pathname = parsed.pathname.replace(/\/t_[^/]+\//, "/t_logo_med/");
  const width = positiveDimension(record.width);
  const height = positiveDimension(record.height);
  return {
    url: `https://images.igdb.com${pathname}${parsed.search}`,
    ...(width ? { width } : {}),
    ...(height ? { height } : {}),
  };
}

export function studioMark(name: string): StudioMark | null {
  for (const rule of RULES) {
    if (rule.test.test(name)) return rule.logo;
  }
  return null;
}

export function resolveStudioLogo(input: {
  name: string;
  logo?: unknown;
}): ResolvedStudioLogo | null {
  const catalogue = catalogueCompanyLogo(input.logo);
  if (catalogue) {
    return {
      src: catalogue.url,
      aspect: logoAspect(catalogue.width, catalogue.height),
      source: "catalogue",
    };
  }
  const mark = studioMark(input.name);
  if (!mark) return null;
  return { src: mark.src, aspect: mark.aspect, source: "fallback" };
}
