import Image from "next/image";
import { normalizePlatformLabel, resolveIgdbPlatform } from "@/data/platforms";

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

const windows: MarkPath[] = [{ d: "M3 3h8v8H3zm10 0h8v8h-8zM3 13h8v8H3zm10 0h8v8h-8z" }];

const apple: MarkPath[] = [
  {
    d: "M15.7 7.6c-.7.9-1.8 1.5-2.9 1.4-.2-1.1.4-2.3 1.1-3.1.7-.8 1.9-1.4 2.9-1.5.1 1.2-.3 2.3-1.1 3.2zM16.6 9.7c-1.6-.1-2.9.9-3.7.9-.8 0-1.9-.9-3.2-.8-1.6.1-3.1 1-4 2.4-1.7 2.9-.4 7.2 1.2 9.6.8 1.2 1.7 2.5 3 2.4 1.2-.1 1.6-.8 3-.8s1.8.8 3.1.7c1.3 0 2.1-1.2 2.9-2.4.9-1.3 1.3-2.6 1.3-2.7-.1 0-2.5-1-2.5-3.8 0-2.4 1.9-3.5 2-3.6-1.1-1.6-2.8-1.8-3.4-1.9z",
  },
];

const tux: MarkPath[] = [
  {
    evenodd: true,
    d: "M12 2.6c2.3 0 3.8 1.7 4 3.6 1.3.5 2.4 1.8 2.4 3.5 0 1.3-.6 2.4-1.5 3 .4 1.2.5 2.8-.2 4.4-1.1 2.5-3.2 4.1-6.7 4.1s-5.6-1.6-6.7-4.1c-.7-1.6-.6-3.2-.2-4.4-.9-.6-1.5-1.7-1.5-3 0-1.7 1.1-3 2.4-3.5.2-1.9 1.7-3.6 4-3.6zM8.4 8.1a1.15 1.15 0 1 0 2.3 0 1.15 1.15 0 0 0-2.3 0zm5 0a1.15 1.15 0 1 0 2.3 0 1.15 1.15 0 0 0-2.3 0zM10.7 11.1h2.6L12 12.8l-1.3-1.7zM8.7 16.4c.1-1.7 1.3-3.2 3.3-3.2s3.2 1.5 3.3 3.2c.2 2-.9 4-3.3 4s-3.5-2-3.3-4z",
  },
];

const psSymbols: MarkPath[] = [
  {
    evenodd: true,
    d: "M12 1.8 15.3 7.2H8.7L12 1.8zM15.1 11.8a3.1 3.1 0 1 0 6.2 0 3.1 3.1 0 1 0-6.2 0zm1.5 0a1.6 1.6 0 1 0 3.2 0 1.6 1.6 0 1 0-3.2 0zM3.1 8.6h6v6.2h-6V8.6zm1.5 1.5h3v3.2h-3V10.1zM10.2 15.4h1.6v1.8h1.8V19h-1.8v1.8h-1.6V19H8.4v-1.8h1.8v-1.8z",
  },
];

const ps5: MarkPath[] = [
  { d: "M8.2 2.8c.7.2 1.2 1.4 1.3 3.2.2 2.6-.1 6.2-.8 9.6-.5 2.2-1.2 4.2-1.6 5.2-.7.5-1.8.3-2.2-.5.5-1.6 1.2-4.2 1.5-6.8.4-3.4.5-6.6 0-9.2-.3-1.4-.2-2.4.4-2.8.3-.2.9-.1 1.4.3z" },
  { d: "M14.2 3.2c1.6.7 2.5 2.2 2.4 4.4-.2 3.2-1.2 7.2-2.2 10.6-.5 1.6-1.5 2.6-2.4 2.2.6-2.4 1.6-6 2-9.4.3-2.6.1-4.6-.8-5.8-.5-.6-.4-1.6.1-2 .3-.2.6-.2.9 0z" },
];

const ps4: MarkPath[] = [
  { evenodd: true, d: "M7.2 6.2h12.2L16.6 17.8H4.4L7.2 6.2zm1.4 2.2-1.8 7h8.6l1.8-7H8.6z" },
];

const ps3: MarkPath[] = [
  {
    evenodd: true,
    d: "M3.2 10.2c0-2.4 2.2-4 5.2-4h9.2c1.8 0 3.2 1.2 3.2 3v5.2c0 1.8-1.4 3.2-3.2 3.2H8.4c-3 0-5.2-1.6-5.2-4V10.2zm2.2.4v3.6c0 1.2 1.2 2 2.8 2h8.4c.8 0 1.4-.5 1.4-1.2v-4c0-.7-.6-1.2-1.4-1.2H8.2c-1.6 0-2.8.8-2.8 2z",
  },
];

const ps2: MarkPath[] = [
  {
    evenodd: true,
    d: "M8 2.4h8.2a1.4 1.4 0 0 1 1.4 1.4v16.4a1.4 1.4 0 0 1-1.4 1.4H8a1.4 1.4 0 0 1-1.4-1.4V3.8A1.4 1.4 0 0 1 8 2.4zM10.2 4.6a1.9 1.9 0 1 0 3.8 0 1.9 1.9 0 0 0-3.8 0zM9.4 10.2h5.4v1.6H9.4v-1.6zm0 3.2h5.4V15H9.4v-1.6z",
  },
];

const ps1: MarkPath[] = [
  {
    evenodd: true,
    d: "M3 10.2h18a1.2 1.2 0 0 1 1.2 1.2v6.2a1.2 1.2 0 0 1-1.2 1.2H3a1.2 1.2 0 0 1-1.2-1.2v-6.2A1.2 1.2 0 0 1 3 10.2zM9.2 7a2.6 2.6 0 0 1 2.6-2.2h.4A2.6 2.6 0 0 1 14.8 7v3.2H9.2V7zM6.2 13h11.6v1.5H6.2V13z",
  },
];

const psp: MarkPath[] = [
  {
    evenodd: true,
    d: "M2.2 8.2h19.6a1.6 1.6 0 0 1 1.6 1.6v4.4a1.6 1.6 0 0 1-1.6 1.6H2.2A1.6 1.6 0 0 1 .6 14.2V9.8a1.6 1.6 0 0 1 1.6-1.6zM4.2 10h8.2v4H4.2v-4zm11.2 1.1 1.5 1.5-1.5 1.5h1.1l1.5-1.5-1.5-1.5h-1.1zm3.2.4h1.2v2.2h-1.2v-2.2z",
  },
];

const vita: MarkPath[] = [
  {
    evenodd: true,
    d: "M3 7.4h18a2.2 2.2 0 0 1 2.2 2.2v5.2a2.2 2.2 0 0 1-2.2 2.2H3a2.2 2.2 0 0 1-2.2-2.2V9.6A2.2 2.2 0 0 1 3 7.4zm3.2 2h7.2v5.2H6.2V9.4zM15.6 11.05a1.15 1.15 0 1 0 2.3 0 1.15 1.15 0 0 0-2.3 0zm2.8 0a1.15 1.15 0 1 0 2.3 0 1.15 1.15 0 0 0-2.3 0z",
  },
];

const xboxSphere: MarkPath[] = [
  {
    evenodd: true,
    d: "M12 2.2a9.8 9.8 0 1 0 0 19.6 9.8 9.8 0 0 0 0-19.6zM8.3 8.1 10.2 12 8.3 15.9h2.1L12 13.1l1.6 2.8h2.1L13.8 12l1.9-3.9h-2.1L12 10.9 10.4 8.1H8.3z",
  },
];

const xboxSeries: MarkPath[] = [
  {
    evenodd: true,
    d: "M7 2.6h10a1.4 1.4 0 0 1 1.4 1.4v16a1.4 1.4 0 0 1-1.4 1.4H7a1.4 1.4 0 0 1-1.4-1.4v-16A1.4 1.4 0 0 1 7 2.6zm1.8 3h6.4v1.7H8.8V5.6zm1.2 4.2h4v1.5h-4V9.8z",
  },
];

const xboxOne: MarkPath[] = [
  {
    evenodd: true,
    d: "M2.6 9.2 16.2 7.4l5.2 2.2v7.2l-5.2 2.1L2.6 16.8V9.2zm2 1.8v4.2l10.2 1.6 3.2-1.2V10l-3.2-1.2-10.2 2.2z",
  },
];

const xbox360: MarkPath[] = [
  {
    evenodd: true,
    d: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 3.6a6.4 6.4 0 1 1 0 12.8 6.4 6.4 0 0 1 0-12.8zM9.6 9.4 11.1 12 9.6 14.6h1.5L12 13.2l.9 1.4h1.5L13 12l1.4-2.6h-1.5L12 10.8l-.9-1.4H9.6z",
  },
];

const xboxOriginal: MarkPath[] = [
  { d: "M4.2 4.2 9.6 12 4.2 19.8h3.3L12 14.4l4.5 5.4h3.3L14.4 12l5.4-7.8h-3.3L12 9.6 7.5 4.2H4.2z" },
];

const dpad: MarkPath[] = [{ d: "M9.2 2.8h5.6v6.4h6.4v5.6h-6.4v6.4H9.2v-6.4H2.8V9.2h6.4V2.8z" }];

const switchIcon: MarkPath[] = [
  {
    d: "M4.2 4.4h3.1a1.5 1.5 0 0 1 1.5 1.5v12.2a1.5 1.5 0 0 1-1.5 1.5H4.2a1.5 1.5 0 0 1-1.5-1.5V5.9a1.5 1.5 0 0 1 1.5-1.5zm12.5 0h3.1a1.5 1.5 0 0 1 1.5 1.5v12.2a1.5 1.5 0 0 1-1.5 1.5h-3.1a1.5 1.5 0 0 1-1.5-1.5V5.9a1.5 1.5 0 0 1 1.5-1.5zM10.2 6.2h3.6v11.6h-3.6V6.2z",
  },
];

const switch2: MarkPath[] = [
  {
    evenodd: true,
    d: "M4 6.2h16a2 2 0 0 1 2 2v7.6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.2a2 2 0 0 1 2-2zm2.2 2.2v7.2h1.5V8.4H6.2zm10.1 0v7.2H18V8.4h-1.7zM9.4 8.6h5.2v6.8H9.4V8.6z",
  },
];

const wii: MarkPath[] = [
  {
    d: "M5.2 3.2a2.2 2.2 0 1 0 4.4 0 2.2 2.2 0 0 0-4.4 0zM6.2 8h2.4a.8.8 0 0 1 .8.8v9.2a.8.8 0 0 1-.8.8H6.2a.8.8 0 0 1-.8-.8V8.8A.8.8 0 0 1 6.2 8zM14.2 3.2a2.2 2.2 0 1 0 4.4 0 2.2 2.2 0 0 0-4.4 0zM15.2 8h2.4a.8.8 0 0 1 .8.8v9.2a.8.8 0 0 1-.8.8h-2.4a.8.8 0 0 1-.8-.8V8.8a.8.8 0 0 1 .8-.8z",
  },
];

const wiiU: MarkPath[] = [
  {
    evenodd: true,
    d: "M5 3.6h14a2 2 0 0 1 2 2v11.2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5.6a2 2 0 0 1 2-2zm2 2.2h10v8.2H7V5.8zM8.2 16.6h1.6v1.4H8.2v-1.4zm6 0h1.6v1.4h-1.6v-1.4z",
  },
];

const cube: MarkPath[] = [
  { stroke: true, sw: 1.6, d: "M12 3.2 20.2 8v8L12 20.8 3.8 16V8L12 3.2z" },
  { stroke: true, sw: 1.6, d: "M12 12.2 20.2 8M12 12.2 3.8 8M12 12.2v8.6" },
];

const n64: MarkPath[] = [
  { d: "M4.8 19V6.2L12.4 15.6V5h3.4v14h-3.2L5.4 9.8V19H4.8z" },
];

const snes: MarkPath[] = [
  {
    evenodd: true,
    d: "M2.4 8.4h19.2a1.4 1.4 0 0 1 1.4 1.4v5.2a1.4 1.4 0 0 1-1.4 1.4H2.4A1.4 1.4 0 0 1 1 15V9.8a1.4 1.4 0 0 1 1.4-1.4zM7.2 4.6h6.4V9.4H7.2V4.6zM4.2 13.2a1.05 1.05 0 1 0 2.1 0 1.05 1.05 0 0 0-2.1 0zm3.3 0a1.05 1.05 0 1 0 2.1 0 1.05 1.05 0 0 0-2.1 0z",
  },
];

const nes: MarkPath[] = [
  {
    evenodd: true,
    d: "M2.6 10h18.8v7.2H2.6V10zM8.8 5.4h6.4V10H8.8V5.4zM2.6 12.8h18.8v1.5H2.6v-1.5z",
  },
];

const ds: MarkPath[] = [
  {
    evenodd: true,
    d: "M6.2 2.2h11.6A1.6 1.6 0 0 1 19.4 3.8v6.2H4.6V3.8A1.6 1.6 0 0 1 6.2 2.2zM5 11.4h14v1.2H5v-1.2zm.4 2.2h13.2A1.6 1.6 0 0 1 20.2 15v4.2a1.6 1.6 0 0 1-1.6 1.6H5.4a1.6 1.6 0 0 1-1.6-1.6V15a1.6 1.6 0 0 1 1.6-1.4zM7.2 4.2h9.6v4.2H7.2V4.2zm.4 10.6h9.2v3.4H7.6v-3.4z",
  },
];

const gameBoy: MarkPath[] = [
  {
    evenodd: true,
    d: "M6.2 2h11.6A2 2 0 0 1 19.8 4v16a2 2 0 0 1-2 2H6.2a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM7.6 4.4h8.8v6.2H7.6V4.4zM6.6 13.2h2.1v1.6h1.6v2.1H8.7v1.6H6.6v-1.6H5v-2.1h1.6v-1.6zm7.6.4a1.15 1.15 0 1 0 2.3 0 1.15 1.15 0 0 0-2.3 0zm2.5 2.3a1.15 1.15 0 1 0 2.3 0 1.15 1.15 0 0 0-2.3 0z",
  },
];

const sega: MarkPath[] = [
  {
    stroke: true,
    sw: 2.2,
    d: "M16.4 7.2c-.6-1.6-2.2-2.6-4.4-2.6-2.8 0-4.6 1.5-4.6 3.6 0 4.8 9 2.2 9 6.8 0 2.1-2 3.6-4.8 3.6-2.4 0-4.2-1.1-4.8-2.8",
  },
];

const genesis: MarkPath[] = [
  {
    evenodd: true,
    d: "M3 9.4h18a1.2 1.2 0 0 1 1.2 1.2v6.4a1.2 1.2 0 0 1-1.2 1.2H3a1.2 1.2 0 0 1-1.2-1.2v-6.4A1.2 1.2 0 0 1 3 9.4zM8.4 5.2h7.2V9.4H8.4V5.2zM5 12.6h6.2v1.4H5v-1.4z",
  },
];

const masterSystem: MarkPath[] = [
  {
    evenodd: true,
    d: "M3.2 7.6h17.6A1.4 1.4 0 0 1 22.2 9v8a1.4 1.4 0 0 1-1.4 1.4H3.2A1.4 1.4 0 0 1 1.8 17V9a1.4 1.4 0 0 1 1.4-1.4zM5 10.4h9.2v2.2H5v-2.2zm11.2 4.2h2.2v1.6h-2.2v-1.6z",
  },
];

const segaCd: MarkPath[] = [
  {
    evenodd: true,
    d: "M12 3.2a6.2 6.2 0 1 0 0 12.4 6.2 6.2 0 0 0 0-12.4zm0 2.2a4 4 0 1 1 0 8 4 4 0 0 1 0-8zm0 2.6a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8zM4 16.2h16v3.2H4v-3.2z",
  },
];

const thirtyTwoX: MarkPath[] = [
  { d: "M7.2 4.2h9.6l2.2 4.2H5l2.2-4.2zM5.4 9.2h13.2v8.2a1.4 1.4 0 0 1-1.4 1.4H6.8a1.4 1.4 0 0 1-1.4-1.4V9.2z" },
];

const saturn: MarkPath[] = [
  { d: "M12 6.2a5.6 5.6 0 1 0 0 11.2 5.6 5.6 0 0 0 0-11.2z" },
  { stroke: true, sw: 1.7, d: "M3.2 12.4c2.4-3.6 15.2-3.6 17.6 0-2.4 3.4-15.2 3.4-17.6 0z" },
];

const dreamcast: MarkPath[] = [
  { stroke: true, sw: 2, d: "M16.8 7.2A6.6 6.6 0 1 0 17.4 14" },
  { stroke: true, sw: 2, d: "M16.6 7.4A4 4 0 1 0 15.2 14.6" },
  { stroke: true, sw: 2, d: "M14.6 9.2a2 2 0 1 0-.2 3.6" },
];

const gameGear: MarkPath[] = [
  {
    evenodd: true,
    d: "M6.4 2.2h11.2A1.8 1.8 0 0 1 19.4 4v16a1.8 1.8 0 0 1-1.8 1.8H6.4A1.8 1.8 0 0 1 4.6 20V4a1.8 1.8 0 0 1 1.8-1.8zM7.4 4.6h9.2v7.2H7.4V4.6zM7.2 14.2h1.8v1.5H9v1.8H7.2v-1.8H5.6v-1.5h1.6zm6.4.2a1 1 0 1 0 2 0 1 1 0 0 0-2 0zm2.2 1.8a1 1 0 1 0 2 0 1 1 0 0 0-2 0z",
  },
];

const sg1000: MarkPath[] = [
  { d: "M4 11.2h12.4v6.4A1.2 1.2 0 0 1 15.2 18.8H5.2A1.2 1.2 0 0 1 4 17.6v-6.4zM16.6 8.2h1.6v8.2h-1.6zM16.2 6.4h2.4v2.2h-2.4z" },
];

const fuji: MarkPath[] = [
  { d: "M1.8 19.6h4.8L8.4 7.4H5.2L1.8 19.6zM9.7 19.6h4.6V3.6H9.7v16zM15.6 7.4 17.4 19.6h4.8L18.8 7.4h-3.2z" },
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

const atari7800: MarkPath[] = [{ d: "M2.8 15.6 5.2 9.4h13.6l2.4 6.2H2.8z" }];

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

const jaguar: MarkPath[] = [
  {
    evenodd: true,
    d: "M8.2 4.2 12 8.4 15.8 4.2 17.2 7.4 15.4 9.2a6.2 6.2 0 1 1-6.8 0L6.8 7.4 8.2 4.2zM9.4 12.1a1.1 1.1 0 1 0 2.2 0 1.1 1.1 0 0 0-2.2 0zm4.2 0a1.1 1.1 0 1 0 2.2 0 1.1 1.1 0 0 0-2.2 0z",
  },
];

const atariVcs: MarkPath[] = [
  { evenodd: true, d: "M4 6.4h16v12.2H4V6.4zM4 6.4h3.4v12.2H4V6.4z" },
];

const threeDo: MarkPath[] = [
  {
    evenodd: true,
    d: "M12 2.4a9.6 9.6 0 1 0 0 19.2 9.6 9.6 0 0 0 0-19.2zM8.6 8a1.2 1.2 0 1 0 2.4 0 1.2 1.2 0 0 0-2.4 0zm4.4 0a1.2 1.2 0 1 0 2.4 0 1.2 1.2 0 0 0-2.4 0zM7.4 13.6c1.5 1.8 7.7 1.8 9.2 0 .4-.5-.3-1.3-1.1-1-1.4.8-6.6.8-8 0-.7-.2-1.4.6-1.1 1z",
  },
];

const ouya: MarkPath[] = [
  { stroke: true, sw: 1.5, d: "M12 2.8 20.4 7.6v8.8L12 21.2 3.6 16.4V7.6L12 2.8z" },
  { stroke: true, sw: 1.5, d: "M12 11.6 19 7.8M12 11.6 5 7.8M12 11.6v8.4" },
  { d: "M9.3 13.2h1.5v1.5H9.3zm3.9 0h1.5v1.5h-1.5z" },
];

const commodore: MarkPath[] = [
  { stroke: true, sw: 2.3, d: "M16.2 6.4a6.2 6.2 0 1 0 0 11.2" },
  { stroke: true, sw: 2.3, d: "M13.4 10.2H19M13.4 13.8H19" },
];

const stadia: MarkPath[] = [
  { d: "M6.4 5.2c-.9 0-1.4 1-.8 1.7l5.6 8.4c.5.8 1.7.8 2.2 0l5.6-8.4c.6-.7.1-1.7-.8-1.7H6.4z" },
];

const ios: MarkPath[] = [
  {
    evenodd: true,
    d: "M8 2.2h8A2.2 2.2 0 0 1 18.2 4.4v15.2a2.2 2.2 0 0 1-2.2 2.2H8a2.2 2.2 0 0 1-2.2-2.2V4.4A2.2 2.2 0 0 1 8 2.2zm1.4 2.2h5.2v12.4H9.4V4.4zM11 18.4h2v1.2h-2v-1.2z",
  },
];

const android: MarkPath[] = [
  {
    evenodd: true,
    d: "M8.2 8.8a3.8 3.8 0 0 1 7.6 0v1.4H8.2V8.8zM7 11h10v6.4a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V11zm1.6 1.5a.9.9 0 1 0 1.8 0 .9.9 0 0 0-1.8 0zm6.8 0a.9.9 0 1 0 1.8 0 .9.9 0 0 0-1.8 0z",
  },
  { d: "M4.4 12.2h2v4.6h-2zm13.2 0h2v4.6h-2zM8.6 19.2h2.2V22H8.6zm4.6 0h2.2V22h-2.2z" },
  { stroke: true, sw: 1.4, d: "M9.2 7.2 7.6 4.6M14.8 7.2l1.6-2.6" },
];

const dos: MarkPath[] = [
  { stroke: true, sw: 2.1, d: "M4.6 7.2 11 12 4.6 16.8" },
  { stroke: true, sw: 2.1, d: "M12.6 16.8H20" },
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
  windows,
  mac: apple,
  linux: tux,
  playstation: psSymbols,
  ps5,
  ps4,
  ps3,
  ps2,
  ps1,
  psp,
  vita,
  xbox: xboxSphere,
  "xbox series": xboxSeries,
  "xbox one": xboxOne,
  "xbox 360": xbox360,
  "original xbox": xboxOriginal,
  nintendo: dpad,
  switch: switchIcon,
  "switch 2": switch2,
  "wii u": wiiU,
  wii,
  gamecube: cube,
  n64,
  snes,
  nes,
  ds,
  "game boy": gameBoy,
  sega,
  genesis,
  "mega drive": genesis,
  "master system": masterSystem,
  "sega cd": segaCd,
  "32x": thirtyTwoX,
  saturn,
  dreamcast,
  "game gear": gameGear,
  "sg-1000": sg1000,
  atari: fuji,
  "atari 2600": atari2600,
  "atari 5200": atari5200,
  "atari 7800": atari7800,
  "atari 8-bit": atari8bit,
  "atari st": atariSt,
  "atari xegs": atariXegs,
  "atari lynx": lynx,
  "atari jaguar": jaguar,
  "atari vcs": atariVcs,
  "3do": threeDo,
  ouya,
  commodore,
  stadia,
  ios,
  android,
  dos,
  arcade,
  "web browser": web,
};

/** Catalogue strings that are not a filter label but should share that console's mark. */
const ALIASES: Record<string, string> = {
  "super famicom": "snes",
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

function resolveMark(label: string): { logo: Logo } | { glyph: MarkPath[] } | null {
  for (const key of candidateKeys(label)) {
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
  return "logo" in mark ? "logo" : "glyph";
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
