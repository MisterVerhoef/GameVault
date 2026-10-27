import { notFound } from "next/navigation";
import SeriesScreen from "@/components/SeriesScreen";
import { allCollections, getCollection } from "@/data/series";

interface CollectionPageProps {
  params: Promise<{ id: string }>;
}

export function generateStaticParams() {
  return allCollections().map((series) => ({ id: series.id }));
}

export const dynamicParams = false;

export default async function CollectionPage({ params }: CollectionPageProps) {
  const { id } = await params;
  const series = getCollection(id);
  if (!series) notFound();
  return <SeriesScreen series={series} />;
}
