"use client";

import Link from "next/link";
import { useId, useMemo, useState, type ReactNode } from "react";
import Navbar from "@/components/Navbar";
import { PlatformName } from "@/components/platform-icons";
import {
  LIBRARY_STATUSES,
  LIBRARY_STATUS_LABELS,
  useLibrary,
} from "@/context/LibraryContext";
import { browseQuery } from "@/data/browse";
import { useBrowseCatalogue } from "@/data/load-browse-catalogue";
import { findBrowseGame, type BrowseCatalogue } from "@/data/library-view";
import { PLATFORM_COLORS, PLATFORM_FAMILIES } from "@/data/platforms";
import {
  buildVaultStats,
  completionPie,
  formatCompletion,
  formatShare,
  formatVaultUpdated,
  vaultCatalogueFacts,
  type MixSlice,
  type RecentVaultUpdate,
  type VaultStats,
} from "@/data/vault-stats";

const GENRE_PREVIEW = 8;
const noteClass = "mt-3 text-sm text-foreground/75";

function factsFor(catalogue: BrowseCatalogue, gameId: string) {
  return vaultCatalogueFacts(findBrowseGame(catalogue, gameId));
}

function platformFamily(label: string) {
  return PLATFORM_FAMILIES.find((family) => family.label === label);
}

function platformBarColor(label: string) {
  const platform = platformFamily(label)?.platform;
  return platform ? PLATFORM_COLORS[platform] : undefined;
}

function platformBrowseHref(label: string) {
  const family = platformFamily(label);
  if (!family?.platform) return null;
  return browseQuery({ family: family.label, platform: family.platform });
}

function unmatchedNote(missing: number, mix: string) {
  if (missing <= 0) return null;
  if (missing === 1) return `1 game is not in the catalogue, so it is left out of ${mix}.`;
  return `${missing} games are not in the catalogue, so they are left out of ${mix}.`;
}

function completionLine(stats: VaultStats) {
  if (stats.owned === 0) return "No owned games yet.";
  const owned = `${stats.completed} of ${stats.owned} owned`;
  if (stats.wishlist > 0) return `${owned} · wishlist excluded`;
  return owned;
}

function InfoTip({ label, text }: { label: string; text: string }) {
  const tipId = useId();
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        className="inline-flex h-11 w-11 items-center justify-center rounded-full text-foreground/75 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        aria-expanded={open}
        aria-controls={tipId}
        aria-label={label}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
          <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clipRule="evenodd" />
        </svg>
      </button>
      {open ? (
        <span
          id={tipId}
          role="tooltip"
          className="absolute left-0 top-full z-20 w-56 rounded-lg border border-white/10 bg-card px-3 py-2 text-left text-sm font-normal normal-case tracking-normal text-foreground shadow-lg"
        >
          {text}
        </span>
      ) : null}
    </span>
  );
}

function StatsFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#stats-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-accent focus:px-5 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to content
      </a>
      <Navbar />
      <div className="border-b border-white/5 bg-background/80">
        <div className="mx-auto flex h-14 max-w-[1920px] items-center gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-card text-muted transition hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent md:h-9 md:w-9"
            aria-label="Back to home"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </Link>
          <h1 className="min-w-0 truncate text-lg font-bold tracking-tight text-foreground sm:text-xl">
            Stats
          </h1>
        </div>
      </div>
      <main id="stats-content" tabIndex={-1} className="mx-auto w-full max-w-[1920px] flex-1 scroll-mt-20 px-4 py-8 focus:outline-none sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}

function CompletionMark({ rate }: { rate: number | null }) {
  const percent = rate == null ? 0 : Math.max(0, Math.min(100, Math.round(rate * 100)));
  const pie = completionPie(percent);
  return (
    <svg viewBox="0 0 36 36" className="h-24 w-24 shrink-0" aria-hidden="true">
      <circle cx="18" cy="18" r="16" className="fill-foreground/15" />
      {pie.kind === "full" ? <circle cx="18" cy="18" r="16" className="fill-accent" /> : null}
      {pie.kind === "slice" ? <path d={pie.d} className="fill-accent" /> : null}
    </svg>
  );
}

function CompletionCard({ stats }: { stats: VaultStats }) {
  return (
    <section aria-labelledby="stats-completion" className="rounded-2xl border border-white/10 bg-card p-5 sm:p-6">
      <div className="flex items-center gap-5">
        <CompletionMark rate={stats.completionRate} />
        <div className="min-w-0">
          <h2 id="stats-completion" className="text-4xl font-bold tabular-nums tracking-tight text-foreground">
            {formatCompletion(stats.completionRate)}
          </h2>
          <p className="mt-1 flex items-center text-sm text-foreground/75">
            <span>{completionLine(stats)}</span>
            <InfoTip
              label="How completion is counted"
              text="Completed games divided by games you own. Wishlist is excluded, and the progress slider does not change it."
            />
          </p>
        </div>
      </div>
      <ul className="mt-5 flex flex-wrap gap-2" aria-label="Library status counts">
        {LIBRARY_STATUSES.map((status) => {
          const count = stats.statusCounts[status];
          const quiet = count === 0;
          return (
            <li key={status}>
              <Link
                href={`/vault?status=${status}`}
                className={`inline-flex min-h-11 items-center rounded-full px-3 py-1.5 text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent md:min-h-0 ${
                  quiet
                    ? "text-foreground/70 hover:text-foreground"
                    : "bg-foreground/10 font-medium text-foreground hover:bg-foreground/15"
                }`}
              >
                {LIBRARY_STATUS_LABELS[status]}
                <span className="ml-1.5 tabular-nums">{count}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function MixRow({
  slice,
  matched,
  href,
  color,
  icon,
}: {
  slice: MixSlice;
  matched: number;
  href: string | null;
  color?: string;
  icon?: boolean;
}) {
  const width = slice.count > 0 ? Math.max(slice.share * 100, 2) : 0;
  const share = formatShare(slice.share, slice.count);
  const summary = `${slice.label}, ${slice.count} of ${matched} games, ${share}`;
  const inner = (
    <>
      <span className="flex items-baseline justify-between gap-3 text-sm">
        <span className="min-w-0 flex-1 font-medium text-foreground">
          {icon ? <PlatformName name={slice.label} iconClassName="h-4 w-4" className="gap-1.5" /> : slice.label}
        </span>
        <span className="shrink-0 tabular-nums text-foreground/75">
          {slice.count}
          <span aria-hidden="true"> · </span>
          {share}
        </span>
      </span>
      <span aria-hidden="true" className="mt-1.5 block h-2 overflow-hidden rounded-full bg-foreground/15">
        <span
          className={color ? "block h-full rounded-full" : "block h-full rounded-full bg-accent"}
          style={{ width: `${width}%`, backgroundColor: color }}
        />
      </span>
    </>
  );

  if (!href) return <div className="py-1">{inner}</div>;
  return (
    <Link
      href={href}
      aria-label={summary}
      className="block min-h-11 rounded-lg py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      {inner}
    </Link>
  );
}

function MixCard({
  id,
  title,
  tip,
  children,
}: {
  id: string;
  title: string;
  tip: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="rounded-2xl border border-white/10 bg-card p-5 sm:p-6">
      <h2 id={id} className="flex items-center text-lg font-bold tracking-tight text-foreground">
        {title}
        <InfoTip label={`How ${title.toLowerCase()} are counted`} text={tip} />
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function GenreMix({ stats, catalogueFailed }: { stats: VaultStats; catalogueFailed: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const hidden = Math.max(0, stats.genres.length - GENRE_PREVIEW);
  const slices = expanded || hidden === 0 ? stats.genres : stats.genres.slice(0, GENRE_PREVIEW);
  const note = unmatchedNote(stats.missingFromCatalogue, "the genre mix");

  return (
    <MixCard id="stats-genres" title="Genres" tip="Each game counts once per genre.">
      {catalogueFailed ? (
        <p className="text-sm text-foreground/75">The game catalogue could not be loaded, so genres are unavailable.</p>
      ) : stats.genres.length === 0 ? (
        <p className="text-sm text-foreground/75">None of these games list a genre.</p>
      ) : (
        <ul className="space-y-2" aria-label="Genre mix">
          {slices.map((slice) => (
            <li key={slice.key}>
              <MixRow
                slice={slice}
                matched={stats.genreMatched}
                href={browseQuery({ genre: slice.label })}
              />
            </li>
          ))}
        </ul>
      )}
      {hidden > 0 ? (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((open) => !open)}
          className="mt-4 inline-flex min-h-11 items-center rounded-full bg-foreground/10 px-3 text-sm font-medium text-foreground transition hover:bg-foreground/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent md:min-h-0"
        >
          {expanded ? "Show fewer genres" : `Show all ${stats.genres.length} genres`}
        </button>
      ) : null}
      {!catalogueFailed && note ? <p className={noteClass}>{note}</p> : null}
    </MixCard>
  );
}

function PlatformMix({ stats, catalogueFailed }: { stats: VaultStats; catalogueFailed: boolean }) {
  const note = unmatchedNote(stats.missingFromCatalogue, "the platform mix");
  return (
    <MixCard id="stats-platforms" title="Platforms" tip="A game on more than one platform counts in each.">
      {catalogueFailed ? (
        <p className="text-sm text-foreground/75">The game catalogue could not be loaded, so platforms are unavailable.</p>
      ) : stats.platforms.length === 0 ? (
        <p className="text-sm text-foreground/75">None of these games list a platform.</p>
      ) : (
        <ul className="space-y-2" aria-label="Platform mix">
          {stats.platforms.map((slice) => (
            <li key={slice.key}>
              <MixRow
                slice={slice}
                matched={stats.platformMatched}
                href={platformBrowseHref(slice.label)}
                color={platformBarColor(slice.label)}
                icon
              />
            </li>
          ))}
        </ul>
      )}
      {!catalogueFailed && note ? <p className={noteClass}>{note}</p> : null}
    </MixCard>
  );
}

function RecentRow({ item, catalogueFailed }: { item: RecentVaultUpdate; catalogueFailed: boolean }) {
  const when = formatVaultUpdated(item.updatedAt);
  const dated = !Number.isNaN(Date.parse(item.updatedAt));
  const status = LIBRARY_STATUS_LABELS[item.status];
  const body = (
    <span className="min-w-0">
      <span className="block truncate font-medium text-foreground">{item.title}</span>
      <span className="mt-0.5 block text-sm text-foreground/75">
        {status}
        {" · "}
        {dated ? <time dateTime={item.updatedAt}>{when}</time> : when}
      </span>
      {!item.inCatalogue && !catalogueFailed ? (
        <span className="mt-0.5 block text-sm text-foreground/75">Not in the catalogue</span>
      ) : null}
    </span>
  );

  if (!item.href) {
    return <div className="flex min-h-11 items-center py-3">{body}</div>;
  }

  return (
    <Link
      href={item.href}
      className="flex min-h-11 items-center rounded-lg py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      {body}
    </Link>
  );
}

function RecentUpdates({ stats, catalogueFailed }: { stats: VaultStats; catalogueFailed: boolean }) {
  const hidden = stats.recentTotal - stats.recent.length;
  return (
    <section aria-labelledby="stats-recent" className="rounded-2xl border border-white/10 bg-card p-5 sm:p-6">
      <h2 id="stats-recent" className="text-lg font-bold tracking-tight text-foreground">
        Recently updated
      </h2>
      {catalogueFailed ? (
        <p className={noteClass}>The catalogue could not be loaded, so these rows use the saved id.</p>
      ) : null}
      {stats.recent.length === 0 ? (
        <p className={noteClass}>No updates yet.</p>
      ) : (
        <ol className="mt-2 list-none divide-y divide-foreground/10">
          {stats.recent.map((item) => (
            <li key={item.gameId}>
              <RecentRow item={item} catalogueFailed={catalogueFailed} />
            </li>
          ))}
        </ol>
      )}
      {hidden > 0 ? (
        <p className={noteClass}>
          Showing {stats.recent.length} of {stats.recentTotal}.{" "}
          <Link
            href="/vault"
            className="rounded font-medium text-foreground underline decoration-foreground/30 underline-offset-2 hover:decoration-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            See all
          </Link>
        </p>
      ) : null}
    </section>
  );
}

function EmptyVault() {
  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-card px-5 py-8">
      <p className="text-sm text-foreground">Nothing in your vault yet.</p>
      <p className="mt-1 text-sm text-foreground/75">Open a game and choose a library status. Stats will show up here.</p>
      <Link
        href="/"
        className="mt-4 inline-flex min-h-11 items-center rounded-full bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        Browse games
      </Link>
    </div>
  );
}

export default function StatsScreen() {
  const { entries, ready } = useLibrary();
  const { catalogue, failed } = useBrowseCatalogue(false);
  const entryCount = Object.keys(entries).length;
  const stats = useMemo(() => {
    if (!ready) return null;
    if (entryCount > 0 && !catalogue && !failed) return null;
    return buildVaultStats(entries, (gameId) => (catalogue ? factsFor(catalogue, gameId) : null));
  }, [ready, entryCount, catalogue, failed, entries]);

  let body: ReactNode;
  if (!ready || (entryCount > 0 && !stats)) {
    body = <p className="mt-6 text-sm text-foreground/75">Loading your stats…</p>;
  } else if (!stats || stats.total === 0) {
    body = <EmptyVault />;
  } else {
    body = (
      <div className="mt-6 space-y-4">
        <CompletionCard stats={stats} />
        <div className="grid gap-4 lg:grid-cols-2">
          <GenreMix stats={stats} catalogueFailed={failed} />
          <PlatformMix stats={stats} catalogueFailed={failed} />
        </div>
        <RecentUpdates stats={stats} catalogueFailed={failed} />
      </div>
    );
  }

  return (
    <StatsFrame>
      <p className="text-sm text-foreground/75">From your vault in this browser.</p>
      {body}
    </StatsFrame>
  );
}
