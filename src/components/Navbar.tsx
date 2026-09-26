"use client";

import { useState } from "react";

export default function Navbar() {
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

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
          {["Library", "Discover", "Collections", "Wishlist"].map((item) => (
            <a
              key={item}
              href="#"
              className="rounded text-sm font-medium text-muted transition hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {item}
            </a>
          ))}
        </nav>

        {/* Search + Profile + Hamburger */}
        <div className="flex items-center gap-2 sm:gap-3">
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
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full min-w-0 rounded-full border border-white/10 bg-card pl-9 pr-4 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          {/* Profile */}
          <button
            aria-label="Profile"
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-card ring-1 ring-white/10 transition hover:ring-accent/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <span className="text-sm font-medium" aria-hidden="true">U</span>
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
        </div>
      </div>

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
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-full border border-white/10 bg-card px-4 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
          />
        </div>
      )}

      {/* Mobile nav menu */}
      {menuOpen && (
        <nav id="mobile-nav" className="border-t border-white/5 px-4 py-3 md:hidden" aria-label="Mobile">
          <div className="flex flex-col gap-1">
            {["Library", "Discover", "Collections", "Wishlist"].map((item) => (
              <a
                key={item}
                href="#"
                onClick={() => setMenuOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted transition hover:bg-card hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                {item}
              </a>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
