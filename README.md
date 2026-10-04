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

The importer maps common provider fields (`id`, `name` or `title`, `genres`, `platforms`, cover URLs, ratings, and release years) into the canonical model, rejects missing IDs, titles, platforms, and duplicate IDs, then overwrites `public/catalog/games-index.json`. Provider API calls and credentials remain outside the application.

- Replace covers with real IGDB / Steam image URLs
- Add more rows or filter by platform
- Connect to a real backend / Steam API / GOG / etc.

## Tech

- Next.js 15+ (App Router)
- React 19
- Tailwind CSS v4
- TypeScript
