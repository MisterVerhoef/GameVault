import { Suspense } from "react";
import type { Metadata } from "next";
import VaultScreen from "@/components/VaultScreen";

export const metadata: Metadata = {
  title: "My vault · GameVault",
  description: "Personal game library stored in this browser, filtered by status.",
};

export default function VaultPage() {
  return (
    <>
      <link rel="preload" href="/catalog/browse-index.json" as="fetch" crossOrigin="anonymous" />
      <Suspense fallback={<div className="min-h-screen bg-background" />}>
        <VaultScreen />
      </Suspense>
    </>
  );
}
