"use client";

import { useEffect, type ReactNode } from "react";
import { useRovingCards } from "./use-roving-cards";

/** Horizontal card strip with the same arrow-key movement as a game row. */
export default function CardScroller({
  className,
  children,
  label = "cards",
  heading,
}: {
  className?: string;
  children: ReactNode;
  /** Used in scroll button labels, e.g. "Similar games". */
  label?: string;
  /** Optional title shown on the left of the scroll controls. */
  heading?: ReactNode;
}) {
  const { ref, onKeyDown, onFocus } = useRovingCards<HTMLDivElement>();

  const scroll = (direction: "left" | "right") => {
    const node = ref.current;
    if (!node) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    node.scrollBy({
      left: direction === "left" ? -400 : 400,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  };

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const onWheel = (event: WheelEvent) => {
      if (node.scrollWidth <= node.clientWidth) return;
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      event.preventDefault();
      node.scrollBy({ left: event.deltaY });
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [ref]);

  const controls = (
    <div className="flex flex-shrink-0 gap-2">
      <button
        type="button"
        onClick={() => scroll("left")}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-card text-muted transition hover:bg-card-hover hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        aria-label={`Scroll ${label} left`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          aria-hidden="true"
          className="h-4 w-4"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => scroll("right")}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-card text-muted transition hover:bg-card-hover hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        aria-label={`Scroll ${label} right`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          aria-hidden="true"
          className="h-4 w-4"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>
      </button>
    </div>
  );

  return (
    <div className="relative">
      {heading ? (
        <div className="mb-4 flex items-center justify-between gap-3">
          {heading}
          {controls}
        </div>
      ) : (
        <div className="mb-3 flex justify-end">{controls}</div>
      )}
      <div
        ref={ref}
        onKeyDown={onKeyDown}
        onFocus={onFocus}
        className={["scrollbar-hide", className].filter(Boolean).join(" ")}
      >
        {children}
      </div>
    </div>
  );
}
