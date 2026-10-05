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

To sync directly from IGDB during a trusted build or CI job, configure `IGDB_CLIENT_ID` and `IGDB_CLIENT_SECRET` as environment variables and run:

```bash
npm run catalogue:sync:igdb
```

The sync requests a Twitch application token, fetches several bounded popular IGDB pages, performs targeted franchise searches, merges all results by provider ID, runs the existing IGDB adapter and quality validation, and rebuilds the static search index. It validates a temporary catalogue before publishing and refuses to replace the checked-in data with fewer than five games by default. `IGDB_LIMIT` defaults to 500 and `IGDB_PAGES` defaults to 5; each can be reduced or increased within its safety bounds. `IGDB_SEARCH_TERMS` is a comma-separated list of targeted searches and defaults to `halo,the witcher`, ensuring common franchise queries are not limited by global popularity ranking. `IGDB_MIN_GAMES` and `IGDB_QUERY` can override the safety threshold and popular-page query. Never expose these credentials to the browser or commit them to the repository. The catalogue workflow supports manual and weekly syncs through the `IGDB_CLIENT_ID` and `IGDB_CLIENT_SECRET` GitHub Actions secrets.

For catalogue operations, run `npm run catalogue:search-index` to generate the static search index or `npm run catalogue:diff -- before.json after.json` to review added, removed, and changed game IDs.

The personal library is stored locally in the browser. Use the home page Export and Import controls to back up or move statuses and progress as a versioned JSON file.

- Cover art is loaded from normalized catalogue media URLs, using the Steam CDN for titles with Steam releases; search works across titles, genres, studios, themes, and collections.
- Add more rows or filter by platform
- Connect to a real backend / Steam API / GOG / etc.

## Tech

- Next.js 15+ (App Router)
- React 19
- Tailwind CSS v4
- TypeScript
