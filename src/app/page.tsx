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

  return <HomeScreen initialView={initialView} />;
}
