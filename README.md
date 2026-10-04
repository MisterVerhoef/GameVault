# GameVault

**Jellyfin / Emby Plex media manager like game library** built with Next.js + React + Tailwind CSS.

## Features

- Dark cinematic landscape layout
- Horizontal scrolling rows (Action, RPG, Indie, Multiplayer)
- Featured "Continue Gaming" hero section with progress
- Game cards with platform badges, hover play overlay, and achievements progress bars
- platform specific filtering (PC, PS5, Xbox, Switch)
- platform specific theme colors (Xbox green, PS5 blue, Switch red)
- Sticky glassmorphism navbar with search
- Fully responsive
- Every platform has it own color scheme when selected
- Main platforms are pc, xbox, Playstation, Nintendo. Smaller or older platforms like sega, Atari, CDO, CDI are placed in a dropdown menu.

## Each game has a number of sections
- Description
- DLC  
- Trailers
- Screenshots
- Review blurps
- Achievements list
- Collections of it has sequels/ prequals or spinoffs
- Walkthrough links
- Similar games

## Quick Start

```bash
cd gamevault
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/
│   ├── layout.tsx      # Root layout + fonts
│   ├── page.tsx        # Main library page
│   └── globals.css     # Tailwind + custom styles
├── components/
│   ├── Navbar.tsx      # Top navigation
│   ├── Hero.tsx        # Featured game banner
│   ├── GameRow.tsx     # Horizontal scroll row
│   └── GameCard.tsx    # Individual game poster
└── data/
    ├── catalogue.ts    # Catalogue validation and fallback normalisation
    └── games.ts        # Canonical development source and catalogue access
public/
└── catalog/
    └── games-index.json # Generated static catalogue consumed by the UI
```

## Customization

- Replace or extend the canonical data in `src/data/games.ts`, then regenerate the checked-in index:

```bash
npm run catalogue:generate
```

- Import a provider export without adding a backend. The input can be a JSON array or an object with a `games` array:

```bash
npm run catalogue:import -- --input ./path/to/provider-export.json --provider igdb
```

The first provider adapter targets IGDB exports and maps `id`, `name`, genres, themes, supported platforms, cover/artwork URLs, ratings, release dates, companies, screenshots, videos, websites, and game relationships. Add `--source-version` when importing a versioned export and `--report ./reports/igdb-quality.json` to choose the quality report path. The importer rejects missing IDs, titles, supported platforms, and duplicate IDs, records provider provenance plus a SHA-256 input checksum, writes a quality report, then overwrites `public/catalog/games-index.json`. Provider API calls and credentials remain outside the application.

For catalogue operations, run `npm run catalogue:search-index` to generate the static search index or `npm run catalogue:diff -- before.json after.json` to review added, removed, and changed game IDs.

The personal library is stored locally in the browser. Use the home page Export and Import controls to back up or move statuses and progress as a versioned JSON file.

- Replace covers with real IGDB / Steam image URLs
- Add more rows or filter by platform
- Connect to a real backend / Steam API / GOG / etc.

## Tech

- Next.js 15+ (App Router)
- React 19
- Tailwind CSS v4
- TypeScript
