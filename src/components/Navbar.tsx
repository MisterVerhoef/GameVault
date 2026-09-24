"use client";

import { useState } from "react";

export default function Navbar() {
  const [search, setSearch] = useState("");

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1920px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent font-bold text-white">
            GV
          </div>
          <span className="hidden text-xl font-bold tracking-tight sm:block">
            GameVault
          </span>
        </div>

        {/* Nav links */}
        <nav className="hidden items-center gap-6 md:flex">
          {["Library", "Discover", "Collections", "Wishlist"].map((item) => (
            <a
              key={item}
              href="#"
              className="text-sm font-medium text-muted transition hover:text-foreground"
            >
              {item}
            </a>
          ))}
        </nav>

        {/* Search + Profile */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
              />
            </svg>
            <input
              type="search"
              placeholder="Search games..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-40 rounded-full border border-white/10 bg-card pl-9 pr-4 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent sm:w-56"
            />
          </div>

          {/* Profile */}
          <button className="flex h-9 w-9 items-center justify-center rounded-full bg-card ring-1 ring-white/10 transition hover:ring-accent/50">
            <span className="text-sm font-medium">U</span>
          </button>
        </div>
      </div>
    </header>
  );
}
