import type { Metadata } from "next";
import XboxDealsScreen from "@/components/XboxDealsScreen";
import { getXboxDeals } from "@/data/xbox-deals-fetch";

export const metadata: Metadata = {
  title: "Xbox deals · GameVault",
  description: "Xbox games on sale in the Microsoft Store (Netherlands), with catalogue links when available.",
};

export const dynamic = "force-dynamic";

export default async function DealsPage() {
  const payload = await getXboxDeals();
  return <XboxDealsScreen initial={payload} />;
}