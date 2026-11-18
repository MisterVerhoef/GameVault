import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTsModule } from "../scripts/load-ts-module.mjs";

const {
  buildPlatformSwitchHref,
  buildCleanPublisherRedirect,
  readDealsUrlPublishers,
  XBOX_PUBLISHER_STASH_PARAM,
} = loadTsModule("src/data/deals-query.ts");

const xboxOptions = [
  { slug: "alpha-interactive", name: "Alpha Interactive", count: 2 },
  { slug: "delta-studios", name: "Delta Studios", count: 1 },
];
const psOptions = [
  { slug: "alpha-interactive", name: "Alpha Interactive", count: 1 },
  { slug: "bravo-publishing", name: "Bravo Publishing", count: 1 },
];

test("switching to PlayStation stashes Xbox-only publishers", () => {
  const href = buildPlatformSwitchHref(
    "xbox",
    "ps",
    { publisherSlugs: ["delta-studios", "alpha-interactive"], xboxPublisherStash: [], psPublisherStash: [] },
    xboxOptions,
    psOptions,
  );
  assert.match(href, /platform=ps/);
  assert.match(href, /publisher=alpha-interactive/);
  const publisher = new URL(href, "http://localhost").searchParams.get("publisher");
  assert.equal(publisher, "alpha-interactive");
  assert.match(href, new RegExp(`${XBOX_PUBLISHER_STASH_PARAM}=delta-studios`));
});

test("switching back to Xbox restores stashed publishers", () => {
  const href = buildPlatformSwitchHref(
    "ps",
    "xbox",
    { publisherSlugs: [], xboxPublisherStash: ["delta-studios"], psPublisherStash: [] },
    xboxOptions,
    psOptions,
  );
  assert.doesNotMatch(href, /platform=ps/);
  assert.match(href, /publisher=delta-studios/);
  assert.doesNotMatch(href, new RegExp(`${XBOX_PUBLISHER_STASH_PARAM}=`));
});

test("buildCleanPublisherRedirect moves invalid slugs into stash", () => {
  const redirect = buildCleanPublisherRedirect(
    "ps",
    { platform: "ps", publisher: "delta-studios,alpha-interactive" },
    xboxOptions,
    psOptions,
  );
  assert.match(redirect, /platform=ps/);
  assert.match(redirect, /publisher=alpha-interactive/);
  assert.match(redirect, new RegExp(`${XBOX_PUBLISHER_STASH_PARAM}=delta-studios`));
});

test("readDealsUrlPublishers parses stash params", () => {
  const read = readDealsUrlPublishers(
    { publisher: "alpha-interactive", [XBOX_PUBLISHER_STASH_PARAM]: "delta-studios" },
    "ps",
    psOptions,
  );
  assert.deepEqual(read.publisherSlugs, ["alpha-interactive"]);
  assert.deepEqual(read.xboxPublisherStash, ["delta-studios"]);
});