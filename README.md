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
    └── games.ts        # Sample game data
```

## Customization

- Replace covers in `src/data/games.ts` with real IGDB / Steam image URLs
- Add more rows or filter by platform
- Connect to a real backend / Steam API / GOG / etc.

## Tech

- Next.js 15+ (App Router)
- React 19
- Tailwind CSS v4
- TypeScript
