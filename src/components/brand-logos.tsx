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
const apple: BrandMark = { src: "/platforms/apple.svg", aspect: 17.4 / 19 };
const quest: BrandMark = { src: "/platforms/quest.svg", aspect: 1 };

export const BRAND_LOGOS: Record<string, BrandMark> = {
  playstation,
  ps1: playstation,
  ps2,
  ps3,
  ps4,
  ps5,
  psp: { src: "/platforms/psp.svg", aspect: 2.52 },
  vita: { src: "/platforms/vita.svg", aspect: 3.14 },
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
  "switch 2": { src: "/platforms/switch-2.svg", aspect: 92 / 64 },
  ds: { src: "/platforms/ds.svg", aspect: 1.73 },
  "game boy": { src: "/platforms/game-boy.svg", aspect: 1.64 },
  sega: { src: "/studios/sega.svg", aspect: 118.1 / 56 },
  "master system": { src: "/platforms/master-system.svg", aspect: 2.35 },
  genesis: { src: "/platforms/genesis.svg", aspect: 3.56 },
  "mega drive": { src: "/platforms/mega-drive.svg", aspect: 1.5 },
  "sega cd": { src: "/platforms/sega-cd.svg", aspect: 1 },
  saturn: { src: "/platforms/saturn.svg", aspect: 3.57 },
  dreamcast: { src: "/platforms/dreamcast.svg", aspect: 1 },
  "game gear": { src: "/platforms/game-gear.svg", aspect: 1.68 },
  atari: { src: "/platforms/atari.svg", aspect: 1.14 },
  "atari 7800": { src: "/platforms/atari-7800.svg", aspect: 3.34 },
  "atari jaguar": { src: "/platforms/jaguar.svg", aspect: 3.28 },
  "3do": { src: "/platforms/3do.svg", aspect: 1 },
  commodore: { src: "/platforms/commodore.svg", aspect: 1 },
  windows: { src: "/platforms/windows.svg", aspect: 1 },
  mac: apple,
  ios: apple,
  android: { src: "/platforms/android.svg", aspect: 1 },
  dos: { src: "/platforms/dos.svg", aspect: 2.75 },
  "zx spectrum": { src: "/platforms/zx-spectrum.svg", aspect: 1.1 },
  msx: { src: "/platforms/msx.svg", aspect: 2.99 },
  "amstrad cpc": { src: "/platforms/amstrad.svg", aspect: 3.79 },
  "pc-9800 series": { src: "/platforms/pc-98.svg", aspect: 3.62 },
  "turbografx-16/pc engine": { src: "/platforms/tg16.svg", aspect: 3.49 },
  steamvr: { src: "/platforms/steam.svg", aspect: 1 },
  quest,
  wonderswan: { src: "/platforms/wonderswan.svg", aspect: 2.01 },
};
