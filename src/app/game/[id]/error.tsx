"use client";

import Link from "next/link";
import { useEffect } from "react";
import Navbar from "@/components/Navbar";

export default function GameDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#game-error-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-accent focus:px-5 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to content
      </a>

      <Navbar />

      <main
        id="game-error-content"
        tabIndex={-1}
        className="flex flex-1 items-center justify-center px-4 py-16 text-center focus:outline-none sm:px-6 lg:px-8"
      >
        <div className="w-full max-w-xl">
          <div
            className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-card text-2xl font-bold text-accent ring-1 ring-black/10 dark:ring-white/10"
            aria-hidden="true"
          >
            !
          </div>
          <p className="mt-8 text-sm font-semibold uppercase tracking-[0.2em] text-accent">
            Game details unavailable
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
            Something went wrong
          </h1>
          <p className="mx-auto mt-4 max-w-md text-base leading-7 text-muted">
            We couldn&apos;t load this game right now. Try again, or return to your vault.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={reset}
              className="rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Try again
            </button>
            <Link
              href="/vault"
              className="rounded-lg bg-card px-5 py-3 text-sm font-semibold text-foreground ring-1 ring-black/10 transition hover:bg-card-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:ring-white/10"
            >
              Open my vault
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
