import { Suspense } from "react";
import HomeScreen from "@/components/HomeScreen";

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <HomeScreen />
    </Suspense>
  );
}
