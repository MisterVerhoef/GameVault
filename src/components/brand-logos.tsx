export type BrandMark = {
  src: string;
  aspect: number;
};

/** Color console marks. Same file is shared by a family button and its closest console. */
const playstation: BrandMark = { src: "/platforms/playstation.svg", aspect: 1 };
const ps2: BrandMark = { src: "/platforms/ps2.svg", aspect: 101.63 / 64 };
const ps3: BrandMark = { src: "/platforms/ps3.svg", aspect: 123.33 / 60 };
const ps4: BrandMark = { src: "/platforms/ps4.svg", aspect: 99.83 / 64 };
const ps5: BrandMark = { src: "/platforms/ps5.svg", aspect: 102.41 / 66 };
const xboxOrb: BrandMark = { src: "/platforms/xbox.svg", aspect: 1 };
const xboxOne: BrandMark = { src: "/platforms/xbox-one.svg", aspect: 1 };
const xboxSeries: BrandMark = { src: "/platforms/xbox-series.svg", aspect: 1 };
const originalXbox: BrandMark = { src: "/platforms/xbox-original.svg", aspect: 106 / 78 };
const nintendo: BrandMark = { src: "/platforms/nintendo.svg", aspect: 149.57 / 52 };
const snes: BrandMark = { src: "/platforms/snes.svg", aspect: 122 / 48 };
const n64: BrandMark = { src: "/platforms/n64.svg", aspect: 1 };
const gamecube: BrandMark = { src: "/platforms/gamecube.svg", aspect: 1 };
const wii: BrandMark = { src: "/platforms/wii.svg", aspect: 89.35 / 62 };
const wiiU: BrandMark = { src: "/platforms/wii-u.svg", aspect: 141.35 / 56 };
const sw: BrandMark = { src: "/platforms/switch.svg", aspect: 92 / 64 };

export const BRAND_LOGOS: Record<string, BrandMark> = {
  playstation,
  ps1: playstation,
  ps2,
  ps3,
  ps4,
  ps5,
  xbox: xboxOrb,
  "xbox series": xboxSeries,
  "xbox one": xboxOne,
  "xbox 360": xboxOrb,
  "original xbox": originalXbox,
  nintendo,
  nes: nintendo,
  snes,
  n64,
  gamecube,
  wii,
  "wii u": wiiU,
  switch: sw,
};
