"use client";

import Image from "next/image";
import { normalizePlatformLabel, resolveIgdbPlatform } from "@/data/platforms";
import { BRAND_LOGOS, type BrandMark } from "./brand-logos";

type MarkPath = {
  d: string;
  /** Stroke-only mark. Filled marks are the default. */
  stroke?: boolean;
  sw?: number;
  evenodd?: boolean;
  opacity?: number;
};

type Logo = {
  src: string;
  aspect: number;
};

const logo3ds: Logo = {
  src: "/platforms/nintendo-3ds.png",
  aspect: 324 / 96,
};

const logoNeoGeo: Logo = {
  src: "/platforms/neo-geo.png",
  aspect: 139 / 160,
};

const LOGOS: Record<string, Logo> = {
  "3ds": logo3ds,
  "neo geo": logoNeoGeo,
};

const monitor: MarkPath[] = [
  {
    evenodd: true,
    d: "M4 4.2h16a1.6 1.6 0 0 1 1.6 1.6v8.2a1.6 1.6 0 0 1-1.6 1.6h-5.6V17h2.5a.8.8 0 0 1 0 1.6H7.1a.8.8 0 0 1 0-1.6H9.6v-1.4H4a1.6 1.6 0 0 1-1.6-1.6V5.8A1.6 1.6 0 0 1 4 4.2zm1.7 1.7v6.6h12.6V5.9H5.7z",
  },
];

const tux: MarkPath[] = [
  {
    evenodd: true,
    d: "M12 2.6c2.3 0 3.8 1.7 4 3.6 1.3.5 2.4 1.8 2.4 3.5 0 1.3-.6 2.4-1.5 3 .4 1.2.5 2.8-.2 4.4-1.1 2.5-3.2 4.1-6.7 4.1s-5.6-1.6-6.7-4.1c-.7-1.6-.6-3.2-.2-4.4-.9-.6-1.5-1.7-1.5-3 0-1.7 1.1-3 2.4-3.5.2-1.9 1.7-3.6 4-3.6zM8.4 8.1a1.15 1.15 0 1 0 2.3 0 1.15 1.15 0 0 0-2.3 0zm5 0a1.15 1.15 0 1 0 2.3 0 1.15 1.15 0 0 0-2.3 0zM10.7 11.1h2.6L12 12.8l-1.3-1.7zM8.7 16.4c.1-1.7 1.3-3.2 3.3-3.2s3.2 1.5 3.3 3.2c.2 2-.9 4-3.3 4s-3.5-2-3.3-4z",
  },
];

const thirtyTwoX: MarkPath[] = [
  { d: "M7.2 4.2h9.6l2.2 4.2H5l2.2-4.2zM5.4 9.2h13.2v8.2a1.4 1.4 0 0 1-1.4 1.4H6.8a1.4 1.4 0 0 1-1.4-1.4V9.2z" },
];

const sg1000: MarkPath[] = [
  { d: "M4 11.2h12.4v6.4A1.2 1.2 0 0 1 15.2 18.8H5.2A1.2 1.2 0 0 1 4 17.6v-6.4zM16.6 8.2h1.6v8.2h-1.6zM16.2 6.4h2.4v2.2h-2.4z" },
];

const atari2600: MarkPath[] = [
  { evenodd: true, d: "M3.2 16.8 6.4 8.2h11.2l3.2 8.6H3.2zM8.6 11.2h6.8v1.3H8.6z" },
];

const atari5200: MarkPath[] = [
  {
    evenodd: true,
    d: "M3 8.4h18v9.2H3V8.4zM6.2 10.6h1.3v1.3H6.2zm2.4 0h1.3v1.3H8.6zm2.4 0h1.3v1.3h-1.3zm2.4 0h1.3v1.3h-1.3zM6.2 13h1.3v1.3H6.2zm2.4 0h1.3v1.3H8.6zm2.4 0h1.3v1.3h-1.3zm2.4 0h1.3v1.3h-1.3z",
  },
];

const atari8bit: MarkPath[] = [
  {
    evenodd: true,
    d: "M2.4 7.2h19.2v9.2H2.4V7.2zm1.8 1.6h2v1.6h-2V8.8zm3.2 0h2v1.6h-2V8.8zm3.2 0h2v1.6h-2V8.8zm3.2 0h2v1.6h-2V8.8zm3.2 0h2v1.6h-2V8.8zM4.4 11.6h8.4v1.6H4.4v-1.6zm9.6 0h5.6v1.6h-5.6v-1.6z",
  },
];

const atariSt: MarkPath[] = [
  {
    evenodd: true,
    d: "M4.2 4h15.6v11.2H4.2V4zm1.6 1.6v8h12.4v-8H5.8zM9.4 16.2h5.2v1.4H9.4v-1.4zM7.6 18.2h8.8v1.4H7.6v-1.4z",
  },
];

const atariXegs: MarkPath[] = [{ d: "M3.4 12.4 5.6 8h12.8l2.2 4.4H3.4zM3 13.4h18v3.2H3v-3.2z" }];

const lynx: MarkPath[] = [
  {
    evenodd: true,
    d: "M2 8.6h20a1.4 1.4 0 0 1 1.4 1.4v4.2A1.4 1.4 0 0 1 22 15.6H2A1.4 1.4 0 0 1 .6 14.2v-4.2A1.4 1.4 0 0 1 2 8.6zm3.2 1.6h8.4v3.6H5.2v-3.6z",
  },
];

const atariVcs: MarkPath[] = [
  { evenodd: true, d: "M4 6.4h16v12.2H4V6.4zM4 6.4h3.4v12.2H4V6.4z" },
];

const ouya: MarkPath[] = [
  { stroke: true, sw: 1.5, d: "M12 2.8 20.4 7.6v8.8L12 21.2 3.6 16.4V7.6L12 2.8z" },
  { stroke: true, sw: 1.5, d: "M12 11.6 19 7.8M12 11.6 5 7.8M12 11.6v8.4" },
  { d: "M9.3 13.2h1.5v1.5H9.3zm3.9 0h1.5v1.5h-1.5z" },
];

const stadia: MarkPath[] = [
  { d: "M6.4 5.2c-.9 0-1.4 1-.8 1.7l5.6 8.4c.5.8 1.7.8 2.2 0l5.6-8.4c.6-.7.1-1.7-.8-1.7H6.4z" },
];

const arcade: MarkPath[] = [
  { d: "M9.4 3.2a2.6 2.6 0 1 0 5.2 0 2.6 2.6 0 0 0-5.2 0zM11.2 6.2h1.6l.6 8.4h-2.8l.6-8.4zM6.2 16.2h11.6l1.4 3.6H4.8l1.4-3.6z" },
];

const web: MarkPath[] = [
  { stroke: true, sw: 1.6, d: "M12 3.8a8.2 8.2 0 1 0 0 16.4 8.2 8.2 0 0 0 0-16.4z" },
  { stroke: true, sw: 1.6, d: "M12 3.8c-2 0-3.6 3.7-3.6 8.2s1.6 8.2 3.6 8.2 3.6-3.7 3.6-8.2-1.6-8.2-3.6-8.2z" },
  { stroke: true, sw: 1.6, d: "M3.8 12h16.4M5.2 7.6h13.6M5.2 16.4h13.6" },
];

const GLYPHS: Record<string, MarkPath[]> = {
  pc: monitor,
  linux: tux,
  "32x": thirtyTwoX,
  "sg-1000": sg1000,
  "atari 2600": atari2600,
  "atari 5200": atari5200,
  "atari 8-bit": atari8bit,
  "atari st": atariSt,
  "atari xegs": atariXegs,
  "atari lynx": lynx,
  "atari vcs": atariVcs,
  ouya,
  stadia,
  arcade,
  "web browser": web,
};

/** Catalogue strings that are not a filter label but should share that console's mark. */
const ALIASES: Record<string, string> = {
  "super famicom": "snes",
  "super nes cd-rom system": "snes",
  satellaview: "snes",
  "family computer disk system": "nes",
  "64dd": "n64",
  "neo geo mvs": "neo geo",
  "neo geo aes": "neo geo",
  "neo geo cd": "neo geo",
  "neo geo pocket": "neo geo",
  "neo geo pocket color": "neo geo",
  "atari st/ste": "atari st",
  "sega master system/mark iii": "master system",
  "commodore c64/128/max": "commodore",
  amiga: "commodore",
  "amiga cd32": "commodore",
  "sega mega drive/genesis": "genesis",
  "sega genesis": "genesis",
  "playstation vr": "playstation",
  "playstation vr2": "playstation",
  "windows phone": "windows",
  "windows mobile": "windows",
  "meta quest 2": "quest",
  "meta quest 3": "quest",
  "oculus quest": "quest",
  "oculus rift": "quest",
  "oculus vr": "quest",
  "gear vr": "quest",
  "amstrad pcw": "amstrad cpc",
  msx2: "msx",
  "turbografx-16/pc engine cd": "turbografx-16/pc engine",
  "wonderswan color": "wonderswan",
};

function candidateKeys(label: string): string[] {
  const norm = normalizePlatformLabel(label);
  const keys = [norm];
  const alias = ALIASES[norm];
  if (alias) keys.push(alias);
  const mapped = resolveIgdbPlatform(label);
  if (!mapped.unmapped) keys.push(normalizePlatformLabel(mapped.variant));
  return keys;
}

function resolveMark(label: string): { brand: BrandMark } | { logo: Logo } | { glyph: MarkPath[] } | null {
  for (const key of candidateKeys(label)) {
    const brand = BRAND_LOGOS[key];
    if (brand) return { brand };
    const logo = LOGOS[key];
    if (logo) return { logo };
    const glyph = GLYPHS[key];
    if (glyph) return { glyph };
  }
  return null;
}

export function platformIconKind(name: string): "logo" | "glyph" | null {
  const mark = resolveMark(name);
  if (!mark) return null;
  return "glyph" in mark ? "glyph" : "logo";
}

function Mark({ nodes, className }: { nodes: MarkPath[]; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`shrink-0 ${className ?? ""}`} aria-hidden="true" focusable="false">
      {nodes.map((node, index) => (
        <path
          key={index}
          d={node.d}
          fill={node.stroke ? "none" : "currentColor"}
          stroke={node.stroke ? "currentColor" : "none"}
          strokeWidth={node.stroke ? (node.sw ?? 1.7) : undefined}
          strokeLinecap="round"
          strokeLinejoin="round"
          fillRule={node.evenodd ? "evenodd" : undefined}
          opacity={node.opacity}
        />
      ))}
    </svg>
  );
}

export function PlatformIcon({ name, className = "h-4 w-4" }: { name: string; className?: string }) {
  const mark = resolveMark(name);
  if (!mark) return null;
  if ("brand" in mark) {
    const { brand } = mark;
    return (
      <span
        className={`relative inline-block shrink-0 overflow-hidden rounded-[3px] bg-black ${className}`}
        style={{ width: "auto", aspectRatio: String(brand.aspect) }}
        aria-hidden="true"
      >
        {/* SVG files stay vector and are cached; next/image does not optimize SVG. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={brand.src} alt="" className="absolute inset-[7%] size-[86%] object-contain" />
      </span>
    );
  }
  if ("logo" in mark) {
    const { logo } = mark;
    return (
      <span
        className={`relative inline-block shrink-0 rounded-[2px] bg-black/80 ${className}`}
        style={{ width: "auto", aspectRatio: String(logo.aspect) }}
        aria-hidden="true"
      >
        <Image src={logo.src} alt="" fill sizes="80px" className="object-contain" />
      </span>
    );
  }
  return <Mark nodes={mark.glyph} className={className} />;
}

/** System name with its console mark. Names without a mark stay text-only. */
export function PlatformName({
  name,
  className = "gap-1.5",
  iconClassName = "h-4 w-4",
}: {
  name: string;
  className?: string;
  iconClassName?: string;
}) {
  return (
    <span className={`inline-flex min-w-0 items-center ${className}`}>
      <PlatformIcon name={name} className={iconClassName} />
      <span>{name}</span>
    </span>
  );
}
