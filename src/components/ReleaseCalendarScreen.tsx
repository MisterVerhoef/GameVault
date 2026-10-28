"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import { useLibrary } from "@/context/LibraryContext";
import { useBrowseCatalogue } from "@/data/load-browse-catalogue";
import { useReleaseDates } from "@/data/load-release-dates";
import {
  WEEKDAY_LABELS,
  buildReleaseCalendar,
  calendarHref,
  entryDateLabel,
  laterReleaseLabel,
  localIsoDay,
  parseCalendarQuery,
  parseIsoDay,
  shiftCursor,
  type CalendarEntry,
  type CalendarDayModel,
  type ReleaseCalendarModel,
  type ReleaseDateRecord,
  type UndatedGroup,
} from "@/data/release-calendar";

const emptyDates: ReleaseDateRecord[] = [];

function subscribeToday() {
  return () => {};
}

function readLocalToday() {
  return localIsoDay();
}

function readServerToday() {
  return "";
}

function chipClass(selected: boolean) {
  return `inline-flex min-h-11 items-center rounded-full px-3 py-1.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent md:min-h-0 ${
    selected ? "bg-accent text-white" : "bg-card text-muted hover:text-foreground"
  }`;
}

function controlClass() {
  return "inline-flex min-h-11 items-center rounded-full bg-card px-3 py-1.5 text-sm font-medium text-muted transition hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent md:min-h-0";
}

function WishlistBadge() {
  return (
    <span className="inline-flex shrink-0 items-center rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
      Wishlist
    </span>
  );
}

function CalendarEntryLink({ entry }: { entry: CalendarEntry }) {
  const dateText = entry.missing ? "Not in the catalogue" : entryDateLabel(entry);
  const later = laterReleaseLabel(entry.later);
  const platforms = entry.platforms.slice(0, 4).join(" · ");
  const body = (
    <>
      {entry.cover ? (
        <Image
          src={entry.cover}
          alt=""
          width={36}
          height={52}
          unoptimized
          className="h-12 w-9 shrink-0 rounded object-cover"
        />
      ) : (
        <span className="h-12 w-9 shrink-0 rounded bg-white/5" aria-hidden="true" />
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-foreground">{entry.title}</span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
          {entry.date ? <time dateTime={entry.date}>{dateText}</time> : <span>{dateText}</span>}
          {platforms ? <span>{platforms}</span> : null}
          {entry.wishlist ? <WishlistBadge /> : null}
        </span>
        {later ? <span className="mt-0.5 block text-xs text-muted">{later}</span> : null}
      </span>
    </>
  );
  const className = "flex min-h-11 items-center gap-3 rounded-xl bg-card px-3 py-2 ring-1 ring-white/10 transition hover:ring-accent/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent";
  if (!entry.href) return <div className={className}>{body}</div>;
  return (
    <Link href={entry.href} className={className}>
      {body}
    </Link>
  );
}

function MonthGrid({ days }: { days: CalendarDayModel[] }) {
  return (
    <div className="mt-4">
      <div aria-hidden="true" className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium uppercase tracking-wide text-muted">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="py-1">{label}</div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {days.map((day) => {
          const dayNumber = Number(day.date.slice(-2));
          const preview = day.entries.slice(0, 3);
          const extra = day.entries.length - preview.length;
          const shell = `flex min-h-14 flex-col rounded-lg p-1 md:min-h-28 ${
            day.inMonth ? "bg-card" : "bg-card/30"
          } ${day.isToday ? "ring-2 ring-accent" : "ring-1 ring-white/5"}`;
          const inner = (
            <>
              <span className={`text-xs tabular-nums ${day.inMonth ? "text-foreground" : "text-muted"}`}>{dayNumber}</span>
              {day.entries.length > 0 ? (
                <span className="mt-1 text-[10px] font-medium text-accent md:hidden">{day.entries.length}</span>
              ) : null}
              {preview.length > 0 ? (
                <span className="mt-1 hidden md:block">
                  {preview.map((entry) => (
                    <span
                      key={entry.id}
                      className={`block truncate text-[11px] leading-4 ${entry.wishlist ? "text-accent" : "text-foreground/90"}`}
                    >
                      {entry.title}
                    </span>
                  ))}
                  {extra > 0 ? <span className="block text-[11px] text-muted">+{extra}</span> : null}
                </span>
              ) : null}
            </>
          );
          if (!day.inMonth || day.entries.length === 0) {
            return (
              <div key={day.date} className={shell} aria-hidden="true">
                {inner}
              </div>
            );
          }
          const countLabel = day.entries.length === 1 ? "release" : "releases";
          return (
            <a
              key={day.date}
              href={`#releases-${day.date}`}
              aria-label={`${entryDateLabel({ date: day.date })}, ${day.entries.length} ${countLabel}. Jump to the list.`}
              className={`${shell} focus:outline-none focus-visible:ring-2 focus-visible:ring-accent`}
            >
              <span aria-hidden="true">{inner}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}

function DayList({ day }: { day: CalendarDayModel }) {
  return (
    <section aria-labelledby={`releases-${day.date}`} className={day.isToday ? "rounded-2xl ring-2 ring-accent" : undefined}>
      <h3 id={`releases-${day.date}`} className="scroll-mt-28 text-sm font-semibold text-foreground">
        <time dateTime={day.date}>{entryDateLabel({ date: day.date })}</time>
        {day.isToday ? <span className="ml-2 text-xs font-medium uppercase tracking-wide text-accent">Today</span> : null}
      </h3>
      {day.entries.length === 0 ? (
        <p className="mt-2 text-sm text-muted">No releases</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-2">
          {day.entries.map((entry) => (
            <li key={entry.id}>
              <CalendarEntryLink entry={entry} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function UndatedGroups({ groups, todayYear }: { groups: UndatedGroup[]; todayYear: number | null }) {
  const [openYears, setOpenYears] = useState<ReadonlySet<number>>(
    () => new Set(todayYear == null ? [] : [todayYear]),
  );

  return (
    <div className="mt-4 flex flex-col gap-3">
      {groups.map((group) => {
        const open = openYears.has(group.year);
        const label = group.year === 0 ? "No year" : String(group.year);
        return (
          <section key={group.year} className="rounded-2xl border border-white/10 bg-card/40">
            <h3>
              <button
                type="button"
                aria-expanded={open}
                onClick={() => {
                  setOpenYears((current) => {
                    const next = new Set(current);
                    if (next.has(group.year)) next.delete(group.year);
                    else next.add(group.year);
                    return next;
                  });
                }}
                className="flex min-h-11 w-full items-center justify-between gap-3 px-4 py-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <span className="text-sm font-semibold text-foreground">{label}</span>
                <span className="text-xs text-muted">{group.entries.length} {group.entries.length === 1 ? "game" : "games"}</span>
              </button>
            </h3>
            {open ? (
              <ul className="flex flex-col gap-2 px-4 pb-4">
                {group.entries.map((entry) => (
                  <li key={entry.id}>
                    <CalendarEntryLink entry={entry} />
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

function periodCount(model: ReleaseCalendarModel) {
  return model.days.reduce((sum, day) => sum + day.entries.length, 0);
}

export default function ReleaseCalendarScreen() {
  const params = useSearchParams();
  const today = useSyncExternalStore(subscribeToday, readLocalToday, readServerToday);
  const query = parseCalendarQuery({
    view: params.get("view"),
    date: params.get("date"),
    scope: params.get("scope"),
  });
  const cursor = query.date ?? (today || null);
  const { catalogue, failed: catalogueFailed } = useBrowseCatalogue(false);
  const { records, failed: datesFailed } = useReleaseDates();
  const { entries, ready } = useLibrary();
  const wishlistIds = useMemo(() => {
    const ids = new Set<string>();
    if (!ready) return ids;
    for (const [id, entry] of Object.entries(entries)) {
      if (entry.status === "wishlist") ids.add(id);
    }
    return ids;
  }, [entries, ready]);

  const sources = useMemo(
    () => (catalogue?.games ?? []).map((game) => ({
      id: game.id,
      title: game.title,
      cover: game.cover,
      releaseYear: game.releaseYear,
      platforms: game.platforms,
    })),
    [catalogue],
  );

  const dateRecords = records ?? (datesFailed ? emptyDates : null);
  const model = useMemo(() => {
    if (!cursor || !catalogue || dateRecords == null) return null;
    return buildReleaseCalendar({
      games: sources,
      dates: dateRecords,
      wishlistIds,
      cursor,
      view: query.view,
      scope: query.scope,
      today,
    });
  }, [catalogue, cursor, dateRecords, query.scope, query.view, sources, today, wishlistIds]);

  const waiting = !model && !catalogueFailed;
  const previous = cursor ? shiftCursor(cursor, query.view, -1) : null;
  const next = cursor ? shiftCursor(cursor, query.view, 1) : null;
  const todayYear = today ? parseIsoDay(today)?.year ?? null : null;
  const count = model ? periodCount(model) : 0;
  const periodNoun = query.view === "week" ? "week" : "month";

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#calendar-content"
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
          <h1 className="truncate text-lg font-bold tracking-tight text-foreground sm:text-xl">
            Release calendar
          </h1>
        </div>
      </div>

      <main id="calendar-content" tabIndex={-1} className="mx-auto w-full max-w-[1920px] flex-1 scroll-mt-20 px-4 py-8 focus:outline-none sm:px-6 lg:px-8">
        <p className="max-w-2xl text-sm text-muted">
          Upcoming releases from the catalogue and your wishlist. Switch between a month and a week.
          A game is placed on a day only when the catalogue includes an IGDB release date.
        </p>

        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Calendar view">
            <Link
              href={calendarHref({ view: "month", date: cursor, scope: query.scope })}
              aria-current={query.view === "month" ? "page" : undefined}
              scroll={false}
              className={chipClass(query.view === "month")}
            >
              Month
            </Link>
            <Link
              href={calendarHref({ view: "week", date: cursor, scope: query.scope })}
              aria-current={query.view === "week" ? "page" : undefined}
              scroll={false}
              className={chipClass(query.view === "week")}
            >
              Week
            </Link>
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Which games to show">
            <Link
              href={calendarHref({ view: query.view, date: cursor, scope: "all" })}
              aria-current={query.scope === "all" ? "page" : undefined}
              scroll={false}
              className={chipClass(query.scope === "all")}
            >
              All
            </Link>
            <Link
              href={calendarHref({ view: query.view, date: cursor, scope: "wishlist" })}
              aria-current={query.scope === "wishlist" ? "page" : undefined}
              scroll={false}
              className={chipClass(query.scope === "wishlist")}
            >
              Wishlist
              {ready ? <span className="ml-1.5 tabular-nums">{wishlistIds.size}</span> : null}
            </Link>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {previous ? (
            <Link href={calendarHref({ view: query.view, date: previous, scope: query.scope })} scroll={false} className={controlClass()}>
              Previous {periodNoun}
            </Link>
          ) : null}
          <Link href={calendarHref({ view: query.view, date: today || null, scope: query.scope })} scroll={false} className={controlClass()}>
            Today
          </Link>
          {next ? (
            <Link href={calendarHref({ view: query.view, date: next, scope: query.scope })} scroll={false} className={controlClass()}>
              Next {periodNoun}
            </Link>
          ) : null}
          {model ? (
            <h2 className="min-w-0 flex-1 text-base font-semibold tracking-tight text-foreground sm:text-lg sm:text-right">
              {model.periodLabel}
            </h2>
          ) : null}
        </div>

        {catalogueFailed ? (
          <p className="mt-8 text-sm text-muted" role="status">The game catalogue could not be loaded.</p>
        ) : waiting || !model ? (
          <p className="mt-8 text-sm text-muted" role="status">Loading the release calendar…</p>
        ) : (
          <>
            {datesFailed ? (
              <p className="mt-4 max-w-2xl text-sm text-muted" role="status">
                Release days could not be loaded. Games are listed by release year only.
              </p>
            ) : null}
            <p className="mt-4 max-w-2xl text-sm text-muted">
              This catalogue has a full release date for {model.datedGameCount} of {model.catalogueCount} games,
              a release year only for {model.yearOnlyCount}, and no date for {model.missingDateCount}.
            </p>
            {model.datedGameCount === 0 && query.scope === "all" ? (
              <p className="mt-2 max-w-2xl text-sm text-muted">
                No title can be placed on a day yet. Games with a release year of this year or later are listed under Release year only.
              </p>
            ) : null}

            {query.view === "month" ? <MonthGrid days={model.days} /> : null}

            <section aria-labelledby="calendar-period-releases" className="mt-8">
              <h2 id="calendar-period-releases" className="text-lg font-bold tracking-tight text-foreground">
                {query.view === "week" ? "This week" : `Releases in ${model.periodLabel}`}
                <span className="ml-2 text-sm font-medium text-muted">{count}</span>
              </h2>
              {count === 0 ? (
                <p className="mt-3 text-sm text-muted" role="status">
                  {query.scope === "wishlist"
                    ? `No wishlist games with a known release day in this ${periodNoun}.`
                    : `No games with a known release day in this ${periodNoun}.`}
                </p>
              ) : query.view === "week" ? (
                <div className="mt-4 flex flex-col gap-6">
                  {model.days.map((day) => (
                    <DayList key={day.date} day={day} />
                  ))}
                </div>
              ) : (
                <div className="mt-4 flex flex-col gap-6">
                  {model.days.filter((day) => day.inMonth && day.entries.length > 0).map((day) => (
                    <DayList key={day.date} day={day} />
                  ))}
                </div>
              )}
            </section>

            <section aria-labelledby="calendar-wishlist" className="mt-10">
              <h2 id="calendar-wishlist" className="text-lg font-bold tracking-tight text-foreground">
                On your wishlist
              </h2>
              {!ready ? (
                <p className="mt-2 text-sm text-muted">Loading your wishlist…</p>
              ) : wishlistIds.size === 0 ? (
                <p className="mt-2 max-w-2xl text-sm text-muted">
                  Nothing on your wishlist in this browser. Open a game and choose Wishlist. It will be highlighted here.
                </p>
              ) : model.wishlistOutside.length === 0 ? (
                <p className="mt-2 text-sm text-muted">
                  Every wishlisted game with a known day is already in this {periodNoun}.
                </p>
              ) : (
                <>
                  <p className="mt-2 max-w-2xl text-sm text-muted">
                    Wishlist games outside this {periodNoun}, or with no day in the catalogue.
                  </p>
                  <ul className="mt-4 flex flex-col gap-2">
                    {model.wishlistOutside.map((entry) => (
                      <li key={entry.id} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <div className="min-w-0 flex-1">
                          <CalendarEntryLink entry={entry} />
                        </div>
                        {entry.date ? (
                          <Link
                            href={calendarHref({ view: "month", date: entry.date, scope: query.scope })}
                            scroll={false}
                            className={controlClass()}
                          >
                            Show month
                          </Link>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>

            {query.scope === "all" ? (
              <section aria-labelledby="calendar-year-only" className="mt-10">
                <h2 id="calendar-year-only" className="text-lg font-bold tracking-tight text-foreground">
                  Release year only
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-muted">
                  These games have a release year from IGDB and no day in their release dates, so they stay off the grid.
                  Only this year and later years are listed.
                </p>
                {!today ? (
                  <p className="mt-3 text-sm text-muted">Loading dates for this browser…</p>
                ) : model.undatedGroups.length === 0 ? (
                  <p className="mt-3 text-sm text-muted" role="status">No upcoming games are missing a release day.</p>
                ) : (
                  <UndatedGroups groups={model.undatedGroups} todayYear={todayYear} />
                )}
              </section>
            ) : null}
          </>
        )}
      </main>
    </div>
  );
}
