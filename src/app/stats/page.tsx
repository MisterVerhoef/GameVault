import type { Metadata } from "next";
import StatsScreen from "@/components/StatsScreen";

export const metadata: Metadata = {
  title: "Stats · GameVault",
  description: "Completion rate, genre mix, platform mix, and recent updates from your vault in this browser.",
};

export default function StatsPage() {
  return (
    <>
      <link rel="preload" href="/catalog/browse-index.json" as="fetch" crossOrigin="anonymous" />
      <StatsScreen />
    </>
  );
}
