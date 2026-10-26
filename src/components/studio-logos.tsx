type StudioLogo = {
  src: string;
  aspect: number;
};

const ea: StudioLogo = { src: "/studios/ea.svg", aspect: 1 };
const sega: StudioLogo = { src: "/studios/sega.svg", aspect: 118.1 / 56 };
const ubisoft: StudioLogo = { src: "/studios/ubisoft.svg", aspect: 1 };
const rockstar: StudioLogo = { src: "/studios/rockstar.svg", aspect: 1 };
const telltale: StudioLogo = { src: "/studios/telltale.svg", aspect: 72 / 64 };
const sony: StudioLogo = { src: "/studios/sony.svg", aspect: 1 };
const atari: StudioLogo = { src: "/studios/atari.svg", aspect: 1 };
const thq: StudioLogo = { src: "/studios/thq.svg", aspect: 100.5 / 56 };
const blizzard: StudioLogo = { src: "/studios/blizzard.svg", aspect: 176.9 / 48 };
const insomniac: StudioLogo = { src: "/studios/insomniac.svg", aspect: 193.2 / 58 };
const microsoft: StudioLogo = { src: "/studios/microsoft.svg", aspect: 171.7 / 52 };
const nintendo: StudioLogo = { src: "/platforms/nintendo.svg", aspect: 149.57 / 52 };
const capcom: StudioLogo = { src: "/studios/capcom.svg", aspect: 3.64 };
const square: StudioLogo = { src: "/studios/square-enix.svg", aspect: 3.86 };
const konami: StudioLogo = { src: "/studios/konami.svg", aspect: 3.65 };
const activision: StudioLogo = { src: "/studios/activision.svg", aspect: 3.82 };
const atlus: StudioLogo = { src: "/studios/atlus.svg", aspect: 3.46 };
const bandai: StudioLogo = { src: "/studios/bandai-namco.svg", aspect: 4.33 };
const namco: StudioLogo = { src: "/studios/namco.svg", aspect: 3.73 };
const bethesda: StudioLogo = { src: "/studios/bethesda.svg", aspect: 3.74 };
const takeTwo: StudioLogo = { src: "/studios/take-two.svg", aspect: 4.02 };
const twoK: StudioLogo = { src: "/studios/2k.svg", aspect: 1.58 };
const cdProjekt: StudioLogo = { src: "/studios/cd-projekt.svg", aspect: 3.5 };
const lucas: StudioLogo = { src: "/studios/lucasarts.svg", aspect: 4.05 };
const fromSoftware: StudioLogo = { src: "/studios/fromsoftware.svg", aspect: 4.2 };
const bioware: StudioLogo = { src: "/studios/bioware.svg", aspect: 3.76 };
const idSoftware: StudioLogo = { src: "/studios/id.svg", aspect: 1.07 };
const sierra: StudioLogo = { src: "/studios/sierra.svg", aspect: 3.39 };
const snk: StudioLogo = { src: "/studios/snk.svg", aspect: 2.38 };
const naughtyDog: StudioLogo = { src: "/studios/naughty-dog.svg", aspect: 4.11 };
const bungie: StudioLogo = { src: "/studios/bungie.svg", aspect: 3.45 };
const paradox: StudioLogo = { src: "/studios/paradox.svg", aspect: 3.97 };
const valve: StudioLogo = { src: "/studios/valve.svg", aspect: 3.33 };
const eidos: StudioLogo = { src: "/studios/eidos.svg", aspect: 3.24 };
const gameFreak: StudioLogo = { src: "/studios/game-freak.svg", aspect: 3.93 };
const threeFortyThree: StudioLogo = { src: "/studios/343.svg", aspect: 2.24 };
const wb: StudioLogo = { src: "/studios/wb.svg", aspect: 1 };
const koei: StudioLogo = { src: "/studios/koei-tecmo.svg", aspect: 3.92 };
const falcom: StudioLogo = { src: "/studios/falcom.svg", aspect: 3.51 };
const arcSystem: StudioLogo = { src: "/studios/arc-system.svg", aspect: 3.9 };
const devolver: StudioLogo = { src: "/studios/devolver.svg", aspect: 3.96 };
const codemasters: StudioLogo = { src: "/studios/codemasters.svg", aspect: 4 };
const spike: StudioLogo = { src: "/studios/spike.svg", aspect: 3.16 };
const hudson: StudioLogo = { src: "/studios/hudson.svg", aspect: 3.85 };

/** Parent-brand marks. Subsidiaries share the parent logo; unrelated names stay text-only. */
const RULES: readonly { test: RegExp; logo: StudioLogo }[] = [
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

export function studioMark(name: string): StudioLogo | null {
  for (const rule of RULES) {
    if (rule.test.test(name)) return rule.logo;
  }
  return null;
}

/** Small brand mark. Names without a logo render nothing. */
export function StudioLogo({ name, className = "h-4" }: { name: string; className?: string }) {
  const mark = studioMark(name);
  if (!mark) return null;
  return (
    <span
      className={`relative inline-block shrink-0 overflow-hidden rounded-[3px] bg-white ring-1 ring-black/15 ${className}`}
      style={{ width: "auto", aspectRatio: String(mark.aspect) }}
      aria-hidden="true"
    >
      {/* SVG files stay vector and are cached; next/image does not optimize SVG. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={mark.src} alt="" className="absolute inset-[8%] size-[84%] object-contain" />
    </span>
  );
}
