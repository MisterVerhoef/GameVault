"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";
import { collapsedLineCount } from "@/components/description-clamp";

/** Desktop is the side-by-side layout (`lg`). The description sits under the cover below that. */
const DESKTOP_QUERY = "(min-width: 1024px)";

function lineHeightOf(style: CSSStyleDeclaration) {
  const parsed = parseFloat(style.lineHeight);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  const fontSize = parseFloat(style.fontSize);
  return (Number.isFinite(fontSize) ? fontSize : 14) * 1.625;
}

export default function GameDescription({ text }: { text: string }) {
  const textId = useId();
  const measureRef = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [totalLines, setTotalLines] = useState<number | null>(null);
  const [shownLines, setShownLines] = useState<number | null>(null);

  useLayoutEffect(() => {
    const node = measureRef.current;
    if (!node) return;
    const desktop = window.matchMedia(DESKTOP_QUERY);

    const measure = () => {
      const lineHeight = lineHeightOf(getComputedStyle(node));
      const lines = Math.max(1, Math.round(node.scrollHeight / lineHeight));
      const shown = collapsedLineCount(lines, desktop.matches);
      setTotalLines(lines);
      setShownLines(shown);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    desktop.addEventListener("change", measure);
    return () => {
      observer.disconnect();
      desktop.removeEventListener("change", measure);
    };
  }, [text]);

  const canToggle = totalLines != null && shownLines != null && shownLines < totalLines;
  const collapsed = canToggle && !expanded;

  return (
    <div className="mt-4 lg:pr-40">
      <h3 className="text-sm font-medium uppercase tracking-wider text-muted">
        Description
      </h3>
      <div className="relative mt-2">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-0 overflow-hidden">
          <p ref={measureRef} className="text-sm leading-relaxed">
            {text}
          </p>
        </div>
        <p
          id={textId}
          className="text-sm leading-relaxed text-foreground/80"
          style={collapsed ? {
            display: "-webkit-box",
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: shownLines,
            overflow: "hidden",
          } : undefined}
        >
          {text}
        </p>
      </div>
      {canToggle ? (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={textId}
          onClick={() => setExpanded((current) => !current)}
          className="mt-1 inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-accent transition hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {expanded ? "Show less" : "More info"}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
            className={`h-4 w-4 transition ${expanded ? "rotate-180" : ""}`}
          >
            <path fillRule="evenodd" d="M5.22 7.22a.75.75 0 0 1 1.06 0L10 10.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 8.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
          </svg>
        </button>
      ) : null}
    </div>
  );
}
