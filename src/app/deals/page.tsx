import type { Metadata } from "next";
import DealsScreen from "@/components/DealsScreen";
import { parseDealsPlatform } from "@/data/deals-platform";
import { reconcilePublisherQuery } from "@/data/deals-publishers";
import { getPlayStationDeals } from "@/data/playstation-deals-fetch";
import { listPlayStationDealPublishers } from "@/data/playstation-deals-normalize";
import { getXboxDeals } from "@/data/xbox-deals-fetch";
import { listXboxDealPublishers } from "@/data/xbox-deals-normalize";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const params = await searchParams;
  const platform = parseDealsPlatform(params.platform);
  if (platform === "ps") {
    return {
      title: "PlayStation deals · GameVault",
      description: "PlayStation Store NL deals with catalogue links when available.",
    };
  }
  return {
    title: "Xbox deals · GameVault",
    description: "Xbox games on sale in the Microsoft Store (Netherlands), with catalogue links when available.",
  };
}

export default async function DealsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const platform = parseDealsPlatform(params.platform);
  const e2ePsFixture = process.env.GAMEVAULT_E2E_PLAYSTATION_DEALS === "1"
    && typeof params.e2e_ps_fixture === "string"
    ? params.e2e_ps_fixture
    : undefined;
  const [xbox, playstation] = await Promise.all([
    getXboxDeals(),
    getPlayStationDeals(e2ePsFixture),
  ]);
  const publisherOptions = platform === "ps"
    ? listPlayStationDealPublishers(playstation.deals)
    : listXboxDealPublishers(xbox.deals);
  const { slugs: initialPublisherSlugs, droppedCount: initialDroppedPublisherCount } = reconcilePublisherQuery(
    params.publisher,
    publisherOptions,
  );

  return (
    <DealsScreen
      key={platform}
      platform={platform}
      xbox={xbox}
      playstation={playstation}
      initialPublisherSlugs={initialPublisherSlugs}
      initialDroppedPublisherCount={initialDroppedPublisherCount}
    />
  );
}