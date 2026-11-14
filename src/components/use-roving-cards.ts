"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import type { FocusEvent } from "react";
import { nextRovingIndex } from "./roving-cards.mjs";

const CARD = "[data-roving-card]";

function cardsIn(root: HTMLElement) {
  return [...root.querySelectorAll<HTMLElement>(CARD)];
}

/** Cards in the first visual row. A horizontal scroller reports every card. */
function columnsOf(cards: HTMLElement[]) {
  if (cards.length === 0) return 1;
  const top = cards[0].getBoundingClientRect().top;
  let count = 0;
  for (const card of cards) {
    if (Math.abs(card.getBoundingClientRect().top - top) > 12) break;
    count += 1;
  }
  return Math.max(1, count);
}

function reveal(card: HTMLElement) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  card.scrollIntoView({
    block: "nearest",
    inline: "nearest",
    behavior: reduce ? "auto" : "smooth",
  });
}

/**
 * One tab stop per group. Arrow keys move between `[data-roving-card]`
 * descendants and keep the focused card as the only tab stop.
 */
export function useRovingCards<T extends HTMLElement>(cardCount?: number) {
  const rootRef = useRef<T | null>(null);
  const activeId = useRef<string | null>(null);

  const restore = useCallback((preferred?: HTMLElement | null) => {
    const root = rootRef.current;
    if (!root) return;
    const cards = cardsIn(root);
    if (cards.length === 0) return;
    const focused =
      document.activeElement instanceof HTMLElement
        ? cards.find(
            (card) => card === document.activeElement || card.contains(document.activeElement),
          )
        : undefined;
    const remembered = cards.find((card) => card.dataset.cardId === activeId.current);
    let current =
      (preferred && cards.includes(preferred) ? preferred : null) ??
      focused ??
      remembered ??
      cards[0];
    if (focused && focused !== current) {
      activeId.current = focused.dataset.cardId ?? activeId.current;
      current = focused;
    } else {
      activeId.current = current.dataset.cardId ?? null;
    }
    for (const card of cards) {
      const isFocused =
        document.activeElement instanceof HTMLElement &&
        (card === document.activeElement || card.contains(document.activeElement));
      card.tabIndex = card === current || isFocused ? 0 : -1;
    }
    root.toggleAttribute("data-roving-active", cards.length > 0);
  }, []);

  const onKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const root = rootRef.current;
    if (!root) return;
    const cards = cardsIn(root);
    if (cards.length === 0) return;
    const active = cards.find((card) => card === document.activeElement || card.contains(document.activeElement));
    if (!active) return;
    const current = cards.indexOf(active);
    const next = nextRovingIndex(current, cards.length, columnsOf(cards), event.key);
    if (next == null) return;
    if (next === current) {
      event.preventDefault();
      return;
    }
    event.preventDefault();
    const card = cards[next];
    activeId.current = card.dataset.cardId ?? null;
    card.tabIndex = 0;
    card.focus();
    for (const item of cards) {
      if (item !== card) item.tabIndex = -1;
    }
    reveal(card);
  }, []);

  const bindRoot = useCallback(
    (node: T | null) => {
      rootRef.current = node;
      if (node) {
        restore();
      }
    },
    [restore],
  );

  useLayoutEffect(() => {
    restore();
  }, [restore, cardCount]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    restore();
    root.addEventListener("keydown", onKeyDown, true);
    return () => root.removeEventListener("keydown", onKeyDown, true);
  }, [onKeyDown, restore, cardCount]);

  const onFocus = useCallback((event: FocusEvent<T>) => {
    const card = event.target instanceof HTMLElement ? event.target.closest<HTMLElement>(CARD) : null;
    if (!card || !rootRef.current?.contains(card)) return;
    restore(card);
  }, [restore]);

  return { ref: bindRoot, rootRef, onFocus };
}