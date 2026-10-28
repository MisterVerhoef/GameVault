import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTsModule } from "../scripts/load-ts-module.mjs";

const {
  addMonths,
  buildReleaseCalendar,
  calendarHref,
  entryDateLabel,
  isIsoDay,
  monthGrid,
  parseCalendarQuery,
  readReleaseDateIndex,
  shiftCursor,
  startOfWeek,
  toReleaseDateRecord,
  weekGrid,
} = loadTsModule("src/data/release-calendar.ts");

const games = [
  { id: "soon", title: "Soon Game", releaseYear: 2026, platforms: ["PC"], cover: "https://example.com/soon.jpg" },
  { id: "later", title: "Later Game", releaseYear: 2026, platforms: ["PS5"] },
  { id: "year", title: "Year Only", releaseYear: 2026, platforms: ["PC"] },
  { id: "old", title: "Old Game", releaseYear: 2020, platforms: ["PC"] },
  { id: "blank", title: "No Date" },
  { id: "labeled", title: "Quarter Game", releaseYear: 2027, platforms: ["Xbox"] },
];

const dates = [
  {
    id: "soon",
    date: "2026-10-28",
    releases: [
      { platform: "PC", date: "2026-10-28" },
      { platform: "PS5", date: "2026-11-04" },
    ],
  },
  { id: "later", date: "2026-11-02", releases: [{ platform: "PS5", date: "2026-11-02" }] },
  { id: "labeled", label: "Q1 2027" },
];

function calendar(overrides = {}) {
  return buildReleaseCalendar({
    games,
    dates,
    wishlistIds: new Set(["soon", "missing"]),
    cursor: "2026-10-28",
    view: "month",
    scope: "all",
    today: "2026-10-28",
    ...overrides,
  });
}

test("rejects impossible calendar days and keeps the earliest platform date", () => {
  assert.equal(isIsoDay("2026-02-31"), false);
  assert.equal(isIsoDay("2026-10-28"), true);
  assert.deepEqual(
    toReleaseDateRecord({
      id: "1",
      releases: [
        { platform: "PC", date: "2026-11-04" },
        { platform: "pc", date: "2026-11-01" },
        { platform: "Switch", label: "TBD" },
        { platform: "Xbox", date: "2026-02-31" },
      ],
    }),
    { id: "1", date: "2026-11-01", releases: [{ platform: "pc", date: "2026-11-01" }] },
  );
  assert.deepEqual(
    toReleaseDateRecord({ id: "2", releases: [{ platform: "Linux", label: "Q4 2026" }] }),
    { id: "2", label: "Q4 2026" },
  );
  assert.equal(toReleaseDateRecord({ id: "3", releases: [] }), null);
});

test("reads a release date index and drops invalid rows", () => {
  const records = readReleaseDateIndex({
    schemaVersion: 1,
    games: [
      { id: "ok", date: "2026-10-28", releases: [{ platform: "PC", date: "2026-10-28" }] },
      { id: "label-only", label: "TBD" },
      { id: "", date: "2026-10-28" },
      { date: "2026-10-28" },
    ],
  });
  assert.deepEqual(records.map((record) => record.id), ["ok", "label-only"]);
  assert.equal(readReleaseDateIndex({ schemaVersion: 2, games: [] }).length, 0);
});

test("month and week grids start on Monday", () => {
  assert.equal(startOfWeek("2026-10-28"), "2026-10-26");
  const month = monthGrid("2026-10-28");
  assert.equal(month[0].date, "2026-09-28");
  assert.equal(month.at(-1).date, "2026-11-01");
  assert.equal(month.length, 35);
  assert.equal(month.filter((day) => day.inMonth).length, 31);
  assert.equal(month.find((day) => day.date === "2026-09-28").inMonth, false);
  assert.equal(month.find((day) => day.date === "2026-10-01").inMonth, true);

  const february = monthGrid("2024-02-10");
  assert.equal(february[0].date, "2024-01-29");
  assert.equal(february.filter((day) => day.inMonth).length, 29);

  const week = weekGrid("2026-10-28");
  assert.deepEqual(week.map((day) => day.date), [
    "2026-10-26",
    "2026-10-27",
    "2026-10-28",
    "2026-10-29",
    "2026-10-30",
    "2026-10-31",
    "2026-11-01",
  ]);
});

test("shifts months to the first day and weeks to the neighbouring Monday", () => {
  assert.equal(shiftCursor("2026-10-28", "month", 1), "2026-11-01");
  assert.equal(shiftCursor("2026-10-28", "month", -1), "2026-09-01");
  assert.equal(addMonths("2026-01-15", -1), "2025-12-01");
  assert.equal(shiftCursor("2026-10-28", "week", 1), "2026-11-02");
  assert.equal(shiftCursor("2026-10-28", "week", -1), "2026-10-19");
  assert.equal(shiftCursor("nope", "month", 1), null);
});

test("plots dated games, keeps year-only titles off the grid, and keeps wishlist state", () => {
  const model = calendar();
  assert.ok(model);
  assert.equal(model.periodLabel, "October 2026");
  const october = model.days.find((day) => day.date === "2026-10-28");
  assert.equal(october.isToday, true);
  assert.equal(october.entries.length, 1);
  assert.equal(october.entries[0].title, "Soon Game");
  assert.equal(october.entries[0].wishlist, true);
  assert.equal(october.entries[0].href, "/game/soon");
  assert.deepEqual(october.entries[0].later, [{ platform: "PS5", date: "2026-11-04" }]);
  assert.equal(model.days.find((day) => day.date === "2026-09-28").entries.length, 0);
  assert.equal(model.days.some((day) => day.entries.some((entry) => entry.id === "year")), false);
  assert.equal(model.datedGameCount, 2);
  assert.equal(model.yearOnlyCount, 3);
  assert.equal(model.missingDateCount, 1);

  const outside = model.wishlistOutside.map((entry) => entry.id);
  assert.deepEqual(outside, ["missing"]);
  assert.equal(model.wishlistOutside[0].missing, true);
  assert.equal(model.wishlistOutside[0].href, undefined);

  const years = model.undatedGroups.map((group) => group.year);
  assert.deepEqual(years, [2026, 2027]);
  assert.deepEqual(model.undatedGroups[0].entries.map((entry) => entry.id), ["year"]);
  const wishlistedYear = calendar({ wishlistIds: new Set(["year"]) });
  assert.equal(wishlistedYear.undatedGroups.some((group) => group.entries.some((entry) => entry.id === "year")), false);
  assert.equal(wishlistedYear.wishlistOutside[0].id, "year");
  assert.equal(wishlistedYear.wishlistOutside[0].date, undefined);
  assert.equal(model.undatedGroups[1].entries[0].id, "labeled");
  assert.equal(entryDateLabel(model.undatedGroups[1].entries[0]), "Q1 2027");
  assert.equal(entryDateLabel({ year: 2026 }), "2026");
  assert.equal(entryDateLabel({}), "No date in the catalogue");
});

test("wishlist scope hides catalogue games that are not wishlisted", () => {
  const model = calendar({ scope: "wishlist", view: "week" });
  assert.equal(model.periodLabel, "26 Oct 2026 – 1 Nov 2026");
  const titles = model.days.flatMap((day) => day.entries.map((entry) => entry.title));
  assert.deepEqual(titles, ["Soon Game"]);
  assert.equal(model.undatedGroups.length, 0);
  assert.deepEqual(model.wishlistOutside.map((entry) => entry.id), ["missing"]);
});

test("a wishlisted game on another month stays out of the grid and can link back", () => {
  const model = calendar({ wishlistIds: new Set(["later"]) });
  assert.equal(model.days.some((day) => day.entries.some((entry) => entry.id === "later")), false);
  assert.equal(model.wishlistOutside[0].id, "later");
  assert.equal(model.wishlistOutside[0].date, "2026-11-02");
  const november = calendar({ cursor: "2026-11-02", wishlistIds: new Set(["later"]) });
  assert.equal(november.days.find((day) => day.date === "2026-11-02").entries[0].title, "Later Game");
  assert.equal(november.wishlistOutside.length, 0);
});

test("calendar links omit default month and catalogue scope", () => {
  assert.equal(calendarHref({}), "/calendar");
  assert.equal(calendarHref({ view: "week", date: "2026-10-26", scope: "wishlist" }), "/calendar?view=week&date=2026-10-26&scope=wishlist");
  assert.deepEqual(parseCalendarQuery({ view: "week", date: "2026-02-31", scope: "wishlist" }), {
    view: "week",
    scope: "wishlist",
    date: null,
  });
  assert.equal(parseCalendarQuery({ view: "nope", date: "2026-10-28" }).view, "month");
});

test("year-only groups wait until today is known and skip past years", () => {
  const waiting = calendar({ today: "" });
  assert.equal(waiting.undatedGroups.length, 0);
  assert.equal(waiting.days.find((day) => day.date === "2026-10-28").isToday, false);
  const future = calendar({ today: "2027-01-01" });
  assert.deepEqual(future.undatedGroups.map((group) => group.year), [2027]);
});
