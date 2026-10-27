"use client";

import type { ReactNode } from "react";
import { useRovingCards } from "./use-roving-cards";

/** Horizontal card strip with the same arrow-key movement as a game row. */
export default function CardScroller({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const { ref, onKeyDown, onFocus } = useRovingCards<HTMLDivElement>();
  return (
    <div ref={ref} onKeyDown={onKeyDown} onFocus={onFocus} className={className}>
      {children}
    </div>
  );
}
