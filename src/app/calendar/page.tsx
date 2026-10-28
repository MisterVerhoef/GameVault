import { Suspense } from "react";
import type { Metadata } from "next";
import ReleaseCalendarScreen from "@/components/ReleaseCalendarScreen";

export const metadata: Metadata = {
  title: "Release calendar · GameVault",
  description: "Upcoming releases from your wishlist and the catalogue, in a month or week view.",
};

export default function CalendarPage() {
  return (
    <>
      <link rel="preload" href="/catalog/browse-index.json" as="fetch" crossOrigin="anonymous" />
      <link rel="preload" href="/catalog/release-dates.json" as="fetch" crossOrigin="anonymous" />
      <Suspense fallback={<div className="min-h-screen bg-background" />}>
        <ReleaseCalendarScreen />
      </Suspense>
    </>
  );
}
