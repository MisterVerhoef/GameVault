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

/** Parent-brand marks. Subsidiaries share the parent logo; unrelated names stay text-only. */
const RULES: readonly { test: RegExp; logo: StudioLogo }[] = [
  { test: /^(?:ea|electronic arts)\b/i, logo: ea },
  { test: /^sega\b/i, logo: sega },
  { test: /^ubisoft\b/i, logo: ubisoft },
  { test: /^rockstar\b/i, logo: rockstar },
  { test: /^telltale\b/i, logo: telltale },
  { test: /^sony (?:computer|interactive) entertainment\b/i, logo: sony },
  { test: /^sony xdev\b/i, logo: sony },
  { test: /^atari\b/i, logo: atari },
  { test: /^thq\b/i, logo: thq },
  { test: /^blizzard\b/i, logo: blizzard },
  { test: /^insomniac\b/i, logo: insomniac },
  { test: /^(?:microsoft(?: game studios(?: japan)?| studios)?|xbox game studios)$/i, logo: microsoft },
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
