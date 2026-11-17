import type { Metadata } from "next";
import XboxDealsScreen from "@/components/XboxDealsScreen";
import { getXboxDeals } from "@/data/xbox-deals-fetch";
import { listXboxDealPublishers, parsePublisherQueryParam } from "@/data/xbox-deals-normalize";

export const metadata: Metadata = {
  title: "Xbox deals · GameVault",
  description: "Xbox games on sale in the Microsoft Store (Netherlands), with catalogue links when available.",
};

export const dynamic = "force-dynamic";

export default async function DealsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const payload = await getXboxDeals();
  const publisherOptions = listXboxDealPublishers(payload.deals);
  const initialPublisherSlugs = parsePublisherQueryParam(params.publisher, publisherOptions);
  return (
    <XboxDealsScreen
      initial={payload}
      initialPublisherSlugs={initialPublisherSlugs}
    />
  );
}