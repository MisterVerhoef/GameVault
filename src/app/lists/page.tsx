import { Suspense } from "react";
import type { Metadata } from "next";
import ListsScreen from "@/components/ListsScreen";

export const metadata: Metadata = {
  title: "Lists · GameVault",
  description: "Your personal game lists, stored in this browser.",
};

export default function ListsPage() {
  return (
    <>
      <link
        rel="preload"
        href="/catalog/browse-index.json"
        as="fetch"
        crossOrigin="anonymous"
      />
      <Suspense fallback={<div className="min-h-screen bg-background" />}>
        <ListsScreen />
      </Suspense>
    </>
  );
}
