import { notFound } from "next/navigation";
import SeriesScreen from "@/components/SeriesScreen";
import { allFranchises, getFranchise } from "@/data/series";

interface FranchisePageProps {
  params: Promise<{ id: string }>;
}

export function generateStaticParams() {
  return allFranchises().map((series) => ({ id: series.id }));
}

export const dynamicParams = false;

export default async function FranchisePage({ params }: FranchisePageProps) {
  const { id } = await params;
  const series = getFranchise(id);
  if (!series) notFound();
  return <SeriesScreen series={series} />;
}
