"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { XboxDealPublisherOption } from "@/data/xbox-deals-types";

interface XboxDealsPublisherFilterProps {
  options: XboxDealPublisherOption[];
  selectedSlugs: string[];
  onChange: (slugs: string[]) => void;
}

export default function XboxDealsPublisherFilter({
  options,
  selectedSlugs,
  onChange,
}: XboxDealsPublisherFilterProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const chipRemoveRefs = useRef(new Map<string, HTMLButtonElement>());
  const listId = useId();
  const selectedSet = useMemo(() => new Set(selectedSlugs), [selectedSlugs]);

  const filteredOptions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options;
    return options.filter(
      (option) =>
        option.name.toLowerCase().includes(needle) || option.slug.includes(needle),
    );
  }, [options, query]);

  const selectedOptions = useMemo(
    () => options.filter((option) => selectedSet.has(option.slug)),
    [options, selectedSet],
  );

  const toggleSlug = (slug: string) => {
    if (selectedSet.has(slug)) {
      onChange(selectedSlugs.filter((entry) => entry !== slug));
    } else {
      onChange([...selectedSlugs, slug]);
    }
  };

  const clearSelection = () => onChange([]);

  const closePanel = () => {
    setOpen(false);
    setQuery("");
    triggerRef.current?.focus();
  };

  const focusChipRemoveAfterRemoval = useCallback((removedIndex: number, remainingSlugs: string[]) => {
    requestAnimationFrame(() => {
      const remainingOptions = options.filter((option) => remainingSlugs.includes(option.slug));
      if (remainingOptions.length === 0) {
        triggerRef.current?.focus();
        return;
      }
      const focusIndex = removedIndex < remainingOptions.length ? removedIndex : removedIndex - 1;
      const targetSlug = remainingOptions[focusIndex]?.slug;
      if (targetSlug) chipRemoveRefs.current.get(targetSlug)?.focus();
    });
  }, [options]);

  const removeSlugAtIndex = useCallback((slug: string, index: number) => {
    setOpen(false);
    setQuery("");
    const remaining = selectedSlugs.filter((entry) => entry !== slug);
    onChange(remaining);
    focusChipRemoveAfterRemoval(index, remaining);
  }, [focusChipRemoveAfterRemoval, onChange, selectedSlugs]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
      setQuery("");
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const triggerLabel =
    selectedSlugs.length === 0
      ? "All publishers"
      : `${selectedSlugs.length} publisher${selectedSlugs.length === 1 ? "" : "s"} selected`;

  return (
    <div className="flex min-w-0 flex-col gap-2 sm:max-w-md">
      <div className="relative flex flex-col gap-1">
        <span id={`${listId}-label`} className="text-xs font-medium uppercase tracking-wide text-muted">
          Publisher
        </span>
        <button
          ref={triggerRef}
          type="button"
          id="xbox-deals-publisher"
          aria-labelledby={`${listId}-label`}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? `${listId}-panel` : undefined}
          onClick={() => setOpen((value) => !value)}
          onKeyDown={(event) => {
            if (event.key === "Escape" && open) {
              event.preventDefault();
              closePanel();
            }
          }}
          className="flex min-h-11 w-full items-center justify-between gap-2 rounded-lg border border-white/10 bg-card px-3 py-2 text-left text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <span className="truncate">{triggerLabel}</span>
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4 shrink-0 text-muted-strong" aria-hidden="true">
            <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {open ? (
          <div
            ref={panelRef}
            id={`${listId}-panel`}
            role="listbox"
            aria-labelledby={`${listId}-label`}
            aria-multiselectable="true"
            className="absolute left-0 top-full z-50 mt-1 w-full max-w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-white/10 bg-card p-2 shadow-xl shadow-black/30"
            style={{ maxHeight: "min(13rem, calc(100dvh - 12rem))" }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                closePanel();
              }
            }}
          >
            <label className="sr-only" htmlFor={`${listId}-search`}>
              Search publishers
            </label>
            <input
              id={`${listId}-search`}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search publishers…"
              autoComplete="off"
              className="mb-2 h-10 w-full rounded-lg border border-white/10 bg-background px-3 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <ul className="max-h-40 space-y-0.5 overflow-y-auto overscroll-contain sm:max-h-52">
              {filteredOptions.length === 0 ? (
                <li className="px-2 py-2 text-xs text-muted-strong">No publishers match your search.</li>
              ) : (
                filteredOptions.map((option) => {
                  const checked = selectedSet.has(option.slug);
                  return (
                    <li key={option.slug} role="presentation">
                      <label
                        role="option"
                        aria-selected={checked}
                        className="flex min-h-10 cursor-pointer items-center gap-3 rounded-lg px-2 text-sm text-foreground hover:bg-white/5"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSlug(option.slug)}
                          className="h-4 w-4 accent-accent"
                        />
                        <span className="min-w-0 flex-1 truncate">{option.name}</span>
                        <span className="shrink-0 text-xs text-muted-strong">({option.count})</span>
                      </label>
                    </li>
                  );
                })
              )}
            </ul>
            {selectedSlugs.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  clearSelection();
                }}
                className="mt-2 w-full min-h-9 rounded-lg border border-white/10 px-3 text-xs font-medium text-muted-strong transition hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                Clear selection
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {selectedOptions.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {selectedOptions.map((option, index) => (
            <span
              key={option.slug}
              className="inline-flex max-w-full items-center gap-1 rounded-full border border-white/10 bg-card py-1 pl-2.5 pr-1 text-xs text-foreground"
            >
              <span className="truncate">{option.name}</span>
              <button
                ref={(node) => {
                  if (node) chipRemoveRefs.current.set(option.slug, node);
                  else chipRemoveRefs.current.delete(option.slug);
                }}
                type="button"
                aria-label={`Remove ${option.name}`}
                onClick={(event) => {
                  event.stopPropagation();
                  removeSlugAtIndex(option.slug, index);
                }}
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-strong transition hover:bg-white/10 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <span aria-hidden="true" className="text-sm font-semibold leading-none">×</span>
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={() => {
              onChange([]);
              requestAnimationFrame(() => triggerRef.current?.focus());
            }}
            className="text-xs font-medium text-muted-strong underline-offset-2 transition hover:text-foreground hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Clear
          </button>
        </div>
      ) : null}
    </div>
  );
}