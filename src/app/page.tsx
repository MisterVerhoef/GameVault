import { Suspense } from "react";
import HomeScreen from "@/components/HomeScreen";
import { getBrowseCatalogue } from "@/data/browse-server";
import { buildLibraryView, readHomeQuery } from "@/data/library-view";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const initialView = buildLibraryView(getBrowseCatalogue(), readHomeQuery(params), []);

  return (
    <>
      <link rel="preload" href="/catalog/browse-index.json" as="fetch" crossOrigin="anonymous" />
      <link rel="preload" href="/catalog/search-index.json" as="fetch" crossOrigin="anonymous" />
      <Suspense fallback={<div className="min-h-screen" />}>
        <HomeScreen initialView={initialView} />
      </Suspense>
    </>
  );
}
