import type { Metadata } from "next";
import { Suspense } from "react";
import XboxDealsScreen, { XboxDealsSkeleton } from "@/components/XboxDealsScreen";
import { getXboxDeals } from "@/data/xbox-deals-fetch";

export const metadata: Metadata = {
  title: "Xbox deals · GameVault",
  description: "Xbox games on sale in the Microsoft Store (Netherlands), with catalogue links when available.",
};

export const dynamic = "force-dynamic";

async function DealsContent() {
  const payload = await getXboxDeals();
  return <XboxDealsScreen initial={payload} />;
}

export default function DealsPage() {
  return (
    <Suspense fallback={<XboxDealsSkeleton />}>
      <DealsContent />
    </Suspense>
  );
}