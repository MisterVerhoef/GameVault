"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ContentRef } from "@/data/games";
import CardScroller from "@/components/CardScroller";

const SKELETON_DELAY_MS = 300;

export type SimilarGameItem = ContentRef & { inCatalogue: boolean; hrefId: string };

function SimilarGameCard({ item }: { item: SimilarGameItem }) {
  const title = item.title;
  const coverUrl = item.cover?.url;
  const href = `/game/${item.hrefId}`;
  const className =
    "group relative flex h-64 min-h-11 min-w-40 cursor-pointer touch-manipulation scroll-mt-24 flex-col justify-end overflow-hidden rounded-lg bg-card px-4 py-4 transition hover:ring-1 hover:ring-accent/60 focus:outline-none focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-accent sm:min-w-44";

  return (
    <Link
      href={href}
      className={className}
      aria-label={item.inCatalogue ? `Open ${title}` : `Open ${title}. Not in catalogue.`}
      data-roving-card=""
      data-card-id={item.hrefId}
    >
      {coverUrl ? (
        <Image
          src={coverUrl}
          alt=""
          fill
          className="object-cover transition duration-300 group-hover:scale-105"
          sizes="176px"
          unoptimized
          loading="lazy"
        />
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/55 to-black/10" />
      <div className="relative">
        <span className="text-xs font-medium uppercase tracking-wider text-white/70">
          {item.inCatalogue ? "Similar" : "Not in catalogue"}
        </span>
        <span className="mt-1 line-clamp-2 text-sm font-medium text-white">{title}</span>
      </div>
    </Link>
  );
}

function SimilarGameCardSkeleton() {
  return (
    <div
      className="relative flex h-64 min-h-11 min-w-40 animate-pulse flex-col justify-end overflow-hidden rounded-lg bg-card px-4 py-4 sm:min-w-44"
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/20 to-black/5" />
      <div className="relative space-y-2">
        <span className="block h-3 w-24 rounded bg-white/15" />
        <span className="block h-4 w-32 rounded bg-white/20" />
      </div>
    </div>
  );
}

export default function SimilarGamesSection({ items: initialItems }: { items: readonly SimilarGameItem[] }) {
  const [items, setItems] = useState<SimilarGameItem[]>(() => [...initialItems]);
  const [loading, setLoading] = useState(() =>
    initialItems.some((item) => !item.inCatalogue),
  );
  const [showSkeletons, setShowSkeletons] = useState(false);
  const initialRef = useRef(initialItems);
  const skeletonTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopLoading = useCallback(() => {
    if (skeletonTimerRef.current) clearTimeout(skeletonTimerRef.current);
    skeletonTimerRef.current = null;
    setShowSkeletons(false);
    setLoading(false);
  }, []);

  useEffect(() => {
    const offCatalogue = initialRef.current.filter((item) => !item.inCatalogue);
    if (offCatalogue.length === 0) {
      stopLoading();
      return;
    }

    const controller = new AbortController();
    skeletonTimerRef.current = setTimeout(() => setShowSkeletons(true), SKELETON_DELAY_MS);

    const refs = offCatalogue.map(({ id, title, cover }) => ({
      id,
      title,
      ...(cover ? { cover } : {}),
    }));

    fetch("/api/igdb/similar-games", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refs }),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) return null;
        const payload = (await response.json()) as { refs?: ContentRef[] };
        return payload.refs ?? null;
      })
      .then((enriched) => {
        if (!enriched) return;
        const byId = new Map(enriched.map((ref) => [ref.id, ref]));
        setItems((current) =>
          current.map((item) => {
            if (item.inCatalogue) return item;
            const live = byId.get(item.id);
            if (!live) return item;
            return {
              ...item,
              title: live.title || item.title,
              ...(live.cover ?? item.cover ? { cover: live.cover ?? item.cover } : {}),
            };
          }),
        );
      })
      .catch(() => {
        // Keep SSR refs when IGDB is unavailable.
      })
      .finally(() => {
        stopLoading();
      });

    return () => {
      controller.abort();
      if (skeletonTimerRef.current) clearTimeout(skeletonTimerRef.current);
      skeletonTimerRef.current = null;
    };
  }, [stopLoading]);

  if (items.length === 0) return null;

  return (
    <section className="mb-12" aria-labelledby="similar-games">
      <p className="sr-only">Arrow keys move between games in the catalogue.</p>
      <CardScroller
        label="Similar games"
        heading={
          <h2 id="similar-games" className="text-lg font-bold tracking-tight text-foreground">
            Similar games
          </h2>
        }
        className="flex gap-4 overflow-x-auto pb-3"
      >
        {items.map((item) =>
          loading && showSkeletons && !item.inCatalogue && !item.cover?.url ? (
            <SimilarGameCardSkeleton key={item.id} />
          ) : (
            <SimilarGameCard key={item.id} item={item} />
          ),
        )}
      </CardScroller>
    </section>
  );
}