"use client";

import { useState } from "react";
import { Platform, PLATFORM_COLORS } from "@/data/games";
import ThemeToggle from "./ThemeToggle";

interface NavbarProps {
  onPlatformSelect?: (platform: Platform | null) => void;
  onPlatformVariantSelect?: (variant: string | null) => void;
  onSearch?: (query: string) => void;
}

interface PlatformFamily {
  key: string;
  label: string;
  platform: Platform | null;
  variants: readonly string[];
  variantChildren?: Record<string, readonly string[]>;
}

const platformFamilies: readonly PlatformFamily[] = [
  {
    key: "pc",
    label: "PC",
    platform: "PC" as Platform,
    variants: ["Windows", "Mac", "Linux"],
  },
  {
    key: "playstation",
    label: "PlayStation",
    platform: "PS5" as Platform,
    variants: ["PS5", "PS4", "PS3", "PS2"],
  },
  {
    key: "xbox",
    label: "Xbox",
    platform: "Xbox" as Platform,
    variants: ["Xbox Series", "Xbox One", "Xbox 360", "Original Xbox"],
  },
  {
    key: "nintendo",
    label: "Nintendo",
    platform: "Switch" as Platform,
    variants: ["Switch", "Switch 2", "Wii U", "Wii", "GameCube", "N64", "SNES", "NES", "3DS", "DS", "Game Boy"],
  },
  {
    key: "other",
    label: "Other",
    platform: null,
    variants: ["Sega", "Atari", "3DO", "Ouya", "Neo Geo", "Commodore", "Stadia"],
    variantChildren: {
      Sega: ["Master System", "Genesis", "Mega Drive", "Sega CD", "32X", "Saturn", "Dreamcast", "Game Gear", "SG-1000"],
      Atari: ["Atari 2600", "Atari 5200", "Atari 7800", "Atari 8-bit", "Atari ST", "Atari XEGS", "Atari Lynx", "Atari Jaguar", "Atari VCS"],
    },
  },
];

export default function Navbar({ onPlatformSelect, onPlatformVariantSelect, onSearch }: NavbarProps) {
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [libraryMenuOpen, setLibraryMenuOpen] = useState(false);
  const [selectedFamilyKey, setSelectedFamilyKey] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const selectedFamily = platformFamilies.find((family) => family.key === selectedFamilyKey);
  const selectedVariantParent =
    selectedFamily && selectedVariant
      ? Object.entries(selectedFamily.variantChildren ?? {}).find(([, children]) => children.includes(selectedVariant))?.[0] ?? null
      : null;
  const selectedVariantRoot =
    selectedVariantParent ?? (selectedVariant && selectedFamily?.variantChildren?.[selectedVariant] ? selectedVariant : null);

  const handlePlatformSelect = (platform: Platform | null, familyKey: string) => {
    setSelectedFamilyKey(selectedFamilyKey === familyKey ? null : familyKey);
    setSelectedVariant(null);
    onPlatformVariantSelect?.(null);
    onPlatformSelect?.(selectedFamilyKey === familyKey ? null : platform);
    setMenuOpen(false);
  };

  const handleVariantSelect = (variant: string) => {
    const nextVariant = selectedVariant === variant ? null : variant;
    setSelectedVariant(nextVariant);
    onPlatformVariantSelect?.(nextVariant);
  };

  const handleSearch = (query: string) => {
    setSearch(query);
    onSearch?.(query);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1920px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent font-bold text-white" aria-hidden="true">
            GV
          </div>
          <span className="hidden text-xl font-bold tracking-tight sm:block">
            GameVault
          </span>
        </div>

        {/* Nav links (desktop) */}
        <nav className="hidden items-center gap-6 md:flex" aria-label="Main">
          {["Discover"].map((item) => (
            <a
              key={item}
              href="#"
              className="rounded text-sm font-medium text-muted transition hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {item}
            </a>
          ))}
        </nav>

        {/* Platform filter buttons (desktop) */}
        <div className="hidden items-center gap-2 md:flex">
          {platformFamilies.map((family) => (
            <button
              key={family.key}
              onClick={() => handlePlatformSelect(family.platform, family.key)}
              aria-label={`Filter by ${family.label}`}
              aria-pressed={selectedFamilyKey === family.key}
              className={`flex h-8 items-center justify-center rounded-full px-3 text-sm font-medium transition ${selectedFamilyKey === family.key ? "text-white" : "bg-card text-muted hover:text-foreground"}`}
              style={selectedFamilyKey === family.key && family.platform ? { backgroundColor: PLATFORM_COLORS[family.platform] } : {}}
            >
              {family.label}
            </button>
          ))}
        </div>

        {/* Theme toggle + Search + Profile + Hamburger */}
        <div className="relative flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          {/* Search icon (mobile toggle) */}
          <button
            onClick={() => setSearchOpen((v) => !v)}
            aria-label="Toggle search"
            aria-expanded={searchOpen}
            aria-controls="mobile-search"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-card text-muted transition hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:hidden"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden="true"
              className="h-4 w-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
              />
            </svg>
          </button>

          {/* Search input (desktop) */}
          <div className={`relative ${searchOpen ? "block" : "hidden"} sm:block`}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden="true"
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
              />
            </svg>
            <label htmlFor="navbar-search" className="sr-only">
              Search games
            </label>
            <input
              id="navbar-search"
              type="search"
              placeholder="Search games..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="h-9 w-full min-w-0 rounded-full border border-white/10 bg-card pl-9 pr-4 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          {/* Library menu */}
          <button
            onClick={() => setLibraryMenuOpen((v) => !v)}
            aria-label="Open library menu"
            aria-expanded={libraryMenuOpen}
            aria-controls="library-menu"
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-card ring-1 ring-white/10 transition hover:ring-accent/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden="true"
              className="h-4 w-4"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 5.25A2.25 2.25 0 0 1 6.75 3h3.5a2.25 2.25 0 0 1 2.25 2.25v3.5A2.25 2.25 0 0 1 10.25 11h-3.5A2.25 2.25 0 0 1 4.5 8.75v-3.5ZM11.5 15.25A2.25 2.25 0 0 1 13.75 13h3.5a2.25 2.25 0 0 1 2.25 2.25v3.5A2.25 2.25 0 0 1 17.25 21h-3.5a2.25 2.25 0 0 1-2.25-2.25v-3.5ZM4.5 15.25A2.25 2.25 0 0 1 6.75 13h1.5a2.25 2.25 0 0 1 2.25 2.25v3.5A2.25 2.25 0 0 1 8.25 21h-1.5A2.25 2.25 0 0 1 4.5 18.75v-3.5ZM14.5 5.25A2.25 2.25 0 0 1 16.75 3h1.5a2.25 2.25 0 0 1 2.25 2.25v3.5A2.25 2.25 0 0 1 18.25 11h-1.5a2.25 2.25 0 0 1-2.25-2.25v-3.5Z" />
            </svg>
          </button>

          {/* Hamburger (mobile) */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-card text-muted transition hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent md:hidden"
          >
            {menuOpen ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                aria-hidden="true"
                className="h-4 w-4"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                aria-hidden="true"
                className="h-4 w-4"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            )}
          </button>

          {libraryMenuOpen && (
            <div
              id="library-menu"
              className="absolute right-0 top-12 z-50 w-44 rounded-xl border border-white/10 bg-card p-1.5 shadow-xl shadow-black/20"
            >
              {["Library", "Collections", "Wishlist"].map((item) => (
                <a
                  key={item}
                  href="#"
                  onClick={() => setLibraryMenuOpen(false)}
                  className="block rounded-lg px-3 py-2 text-sm font-medium text-muted transition hover:bg-white/5 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  {item}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedFamily && (
        <div className="hidden border-t border-white/5 md:block">
          <div className="mx-auto flex max-w-[1920px] items-center gap-2 overflow-x-auto px-4 py-2 sm:px-6 lg:px-8">
            <span className="flex-shrink-0 text-xs font-medium uppercase tracking-wider text-muted">
              {selectedFamily.label} platforms
            </span>
            <span className="h-4 w-px flex-shrink-0 bg-white/10" aria-hidden="true" />
            <div className="flex min-w-0 flex-col gap-1" aria-label={`${selectedFamily.label} platform breakdown`}>
              <div className="flex items-center gap-1">
                {selectedFamily.variants.map((variant) => (
                  <button
                    key={variant}
                    type="button"
                    onClick={() => handleVariantSelect(variant)}
                    aria-pressed={selectedVariant === variant || selectedVariantRoot === variant}
                    className={`flex-shrink-0 rounded-full px-2.5 py-1 text-xs transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                      selectedVariant === variant
                        ? "bg-white/10 text-foreground"
                        : "text-muted hover:bg-white/5 hover:text-foreground"
                    }`}
                  >
                    {variant}
                  </button>
                ))}
              </div>
              {selectedVariantRoot && selectedFamily.variantChildren?.[selectedVariantRoot] && (
                <div className="flex items-center gap-1 pl-2">
                  {selectedFamily.variantChildren[selectedVariantRoot].map((variant) => (
                    <button
                      key={variant}
                      type="button"
                      onClick={() => handleVariantSelect(variant)}
                      aria-pressed={selectedVariant === variant}
                      className={`flex-shrink-0 rounded-full px-2.5 py-1 text-xs transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                        selectedVariant === variant
                          ? "bg-white/10 text-foreground"
                          : "text-muted hover:bg-white/5 hover:text-foreground"
                      }`}
                    >
                      {variant}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mobile search bar (expanded state) */}
      {searchOpen && (
        <div id="mobile-search" className="border-t border-white/5 px-4 py-2 sm:hidden">
          <label htmlFor="navbar-search-mobile" className="sr-only">
            Search games
          </label>
          <input
            id="navbar-search-mobile"
            type="search"
            placeholder="Search games..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="h-9 w-full rounded-full border border-white/10 bg-card px-4 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
          />
        </div>
      )}

      {/* Mobile nav menu */}
      {menuOpen && (
        <nav id="mobile-nav" className="border-t border-white/5 px-4 py-3 md:hidden" aria-label="Mobile">
          <div className="flex flex-col gap-1">
            {["Discover"].map((item) => (
              <a
                key={item}
                href="#"
                onClick={() => setMenuOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted transition hover:bg-card hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                {item}
              </a>
            ))}
            {/* Platform filters in mobile menu */}
            <div className="mt-2 border-t border-white/5 pt-2">
              <p className="px-3 py-1 text-xs font-medium text-muted">Filter by Platform</p>
              {platformFamilies.map((family) => (
                <div key={family.key}>
                  <button
                    onClick={() => handlePlatformSelect(family.platform, family.key)}
                    className={`rounded-lg px-3 py-2 text-sm font-medium transition ${selectedFamilyKey === family.key ? "text-white" : "text-muted hover:text-foreground"}`}
                    style={selectedFamilyKey === family.key && family.platform ? { color: PLATFORM_COLORS[family.platform] } : {}}
                    aria-pressed={selectedFamilyKey === family.key}
                  >
                    {family.label}
                  </button>
                  {selectedFamilyKey === family.key && (
                    <div className="ml-3 flex flex-wrap gap-1 border-l border-white/10 pl-3">
                      {family.variants.map((variant) => (
                        <button
                          key={variant}
                          type="button"
                          onClick={() => handleVariantSelect(variant)}
                          aria-pressed={selectedVariant === variant}
                          className={`rounded px-2 py-1 text-xs transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                            selectedVariant === variant
                              ? "bg-white/10 text-foreground"
                              : "text-muted hover:bg-white/5 hover:text-foreground"
                          }`}
                        >
                          {variant}
                        </button>
                      ))}
                      {selectedVariantRoot && family.variantChildren?.[selectedVariantRoot] && (
                        <div className="basis-full border-t border-white/5 pt-1">
                          <div className="flex flex-wrap gap-1 pl-2">
                            {family.variantChildren[selectedVariantRoot].map((variant) => (
                              <button
                                key={variant}
                                type="button"
                                onClick={() => handleVariantSelect(variant)}
                                aria-pressed={selectedVariant === variant}
                                className={`rounded px-2 py-1 text-xs transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                                  selectedVariant === variant
                                    ? "bg-white/10 text-foreground"
                                    : "text-muted hover:bg-white/5 hover:text-foreground"
                                }`}
                              >
                                {variant}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
