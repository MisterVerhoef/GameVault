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

From the repository root:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy to Vercel

The app is a single Next.js project at the repository root. Vercel detects Next.js from `package.json`, so the default install, build, and output settings are enough. A `vercel.json` file is not part of this project.

The catalogue in `public/catalog/` is checked in. Builds and page requests use that file. IGDB is contacted only by `npm run catalogue:sync:igdb` and the GitHub Actions workflow. Serving a page does not write to the filesystem. Personal library data stays in the browser (`localStorage`). My vault filters it by status. Export / Import in the library menu moves statuses, progress, ratings, and notes.

1. Push this repository to GitHub (or GitLab / Bitbucket).
2. In Vercel, choose **Add New… → Project** and import the repository.
3. Set **Root Directory** to the repository root — the directory that contains `package.json`.
4. Framework preset: **Next.js**. Keep the default commands:
   - Install command: `npm install`
   - Build command: `npm run build` (`next build` only). Catalogue sync stays in GitHub Actions.
   - Output directory: leave blank. Next.js sets this.
5. Leave the Vercel environment variable list empty. **Deploy**.
6. Node.js 20.9 or newer is required (`next` 16). A new Vercel project uses the current default (Node.js 24), which satisfies that.

### Environment variables

Copy `.env.example` to `.env.local` only if you sync the catalogue on your machine. None of these are read by the Next.js server or the browser.

| Variable | Required for the site | Where it belongs |
| --- | --- | --- |
| `IGDB_CLIENT_ID` | No | Local sync, or a GitHub Actions secret for `.github/workflows/catalogue.yml` |
| `IGDB_CLIENT_SECRET` | No | Same as `IGDB_CLIENT_ID`. Never commit it and never set `NEXT_PUBLIC_` on it. |
| `IGDB_SOURCE_VERSION` | No | Optional provenance label for a sync |
| `IGDB_LIMIT`, `IGDB_PAGES`, `IGDB_MIN_GAMES` | No | Optional sync bounds. Defaults are 500, 10, and 5. |
| `IGDB_SEARCH_TERMS` | No | Optional comma-separated franchise searches. Default: `halo,the witcher` |
| `IGDB_QUERY` | No | Optional replacement for the built-in IGDB popular-games query |

Weekly and manual catalogue updates stay on GitHub Actions (`workflow_dispatch` and the Monday schedule). That job commits `public/catalog/games-index.json`, `public/catalog/search-index.json`, and `public/catalog/store-offers.json`. After it pushes to the production branch, Vercel rebuilds from the updated files. Add `IGDB_CLIENT_ID` and `IGDB_CLIENT_SECRET` under the repository's Actions secrets, not in Vercel. Store enrichment does not need secrets.

`public/catalog/games-index.json` is about 34 MB, `browse-index.json` about 1.7 MB, `search-index.json` about 3.6 MB, and `store-offers.json` about 0.8 MB. All four are under Vercel's source upload limits. Home and search use the browse index and the search index. My vault uses the browse index, and fetches `store-offers.json` only when the wishlist is on screen. Game and studio pages read the full games index on the server. The home page does not import store offers.

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

- The checked-in catalogue at `public/catalog/games-index.json` is the published artefact (usually synced from IGDB). Weekly GitHub Actions sync is the only automated writer of that file.
- Demo/bootstrap titles live in `fallbackGames` inside `src/data/games.ts`. Regenerate a local demo index without touching the published catalogue:

```bash
npm run catalogue:generate
```

By default this writes `test/fixtures/demo-games-index.json`. Pass `--output public/catalog/games-index.json` only when you intentionally replace the published index with demo data.

- Import a provider export without adding a backend. The input can be a JSON array or an object with a `games` array:

```bash
npm run catalogue:import -- --input ./path/to/provider-export.json --provider igdb
```

The first provider adapter targets IGDB exports and maps `id`, `name`, genres, themes, supported platforms, cover/artwork URLs, community and critic ratings, age ratings, game modes, player perspectives, a short keyword list, multiplayer modes, per-platform release dates, time to beat, companies and their logos, screenshots, videos, websites, and game relationships. Add `--source-version` when importing a versioned export and `--report ./reports/igdb-quality.json` to choose the quality report path. The importer rejects missing IDs, titles, supported platforms, and duplicate IDs, records provider provenance plus a SHA-256 input checksum, writes a quality report, then overwrites `public/catalog/games-index.json`. Provider API calls and credentials remain outside the application.

To sync directly from IGDB during a trusted build or CI job, configure `IGDB_CLIENT_ID` and `IGDB_CLIENT_SECRET` as environment variables and run:

```bash
npm run catalogue:sync:igdb
```

The sync requests a Twitch application token, fetches several bounded popular IGDB pages, performs targeted franchise searches, merges all results by provider ID, runs the existing IGDB adapter and quality validation, and rebuilds the static search index. Each developer and publisher keeps an optional `logo` when IGDB has a company image (`image_id`, dimensions, and alpha/animated flags). The stored file is an `images.igdb.com` URL at `t_logo_med`, the same host covers already use. Pages read that URL from the catalogue and do not call IGDB. A logo on the company wins over the built-in SVG marks in `src/data/studio-logo.ts`; companies with no usable image keep that mark, or initials on the studio page. The checked-in catalogue does not yet include these logo fields, so run a catalogue sync before expecting IGDB studio images in the UI. A custom `IGDB_QUERY` must still request `involved_companies.company.logo.*` or those logos are skipped. It validates a temporary catalogue before publishing and refuses to replace the checked-in data with fewer than five games by default. `IGDB_LIMIT` defaults to 500 and `IGDB_PAGES` defaults to 10; each can be reduced or increased within its safety bounds (`IGDB_PAGES` cannot exceed 10). `IGDB_SEARCH_TERMS` is a comma-separated list of targeted searches and defaults to `halo,the witcher`, ensuring common franchise queries are not limited by global popularity ranking. `IGDB_MIN_GAMES` and `IGDB_QUERY` can override the safety threshold and popular-page query. Never expose these credentials to the browser or commit them to the repository. The catalogue workflow supports manual and weekly syncs through the `IGDB_CLIENT_ID` and `IGDB_CLIENT_SECRET` GitHub Actions secrets.

After a successful IGDB publish, the sync also refreshes optional store offers (`npm run catalogue:enrich:stores`). That step matches Xbox, PlayStation, and Nintendo products for games already on those platforms, using IGDB external ids and store URLs when the catalogue has them and a conservative title match otherwise. It records a Netherlands EUR price and store link, and copies a cover, description, screenshots, or trailer only when IGDB left that field empty. Results live in `public/catalog/store-offers.json`, separate from the games index, so the home-page bundle does not grow with prices. A store endpoint that fails or changes is skipped; the IGDB catalogue still publishes and previously cached offers for that store are kept. `STORE_ENRICHMENT=0` skips the step. `STORE_MAX_SEARCHES` caps title searches per run (default 800) so unmatched games are retried on later syncs. No PSN, Xbox, or Nintendo account token is used.

Account achievements are not part of this sync. Adding them later would require a signed-in player: Xbox Live or PlayStation Network user OAuth for that account's trophies, and a separate Nintendo account flow. There is no public achievement API that works from the catalogue job alone.

For catalogue operations, run `npm run catalogue:search-index` to generate the static search index and the browse index, or `npm run catalogue:diff -- before.json after.json` to review added, removed, and changed game IDs. The browse index keeps the fields list and home pages need (cover, platforms, genres, rating). The search index answers catalogue search without loading descriptions, screenshots, or similar games into the browser.

The personal library is stored locally in the browser. Open My vault to browse it by status. Wishlist rows show a Netherlands EUR price and a store link when `store-offers.json` has a match for that catalogue id, and a Deal mark when the cached price is below the list price. Games with no match stay listed without a price. Use Export and Import in the library menu to back up or move statuses, progress, personal ratings, and notes as a versioned JSON file.

- Cover art is loaded from normalized catalogue media URLs, using the Steam CDN for titles with Steam releases; search works across titles, genres, studios, themes, and collections.
- Add more rows or filter by platform
- Connect to a real backend / Steam API / GOG / etc.

## Tech

- Next.js 16 (App Router)
- React 19
- Tailwind CSS v4
- TypeScript
