"use client";

import { useCallback, useLayoutEffect, useRef } from "react";
import type { KeyboardEvent, FocusEvent } from "react";
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
export function useRovingCards<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const activeId = useRef<string | null>(null);

  const restore = useCallback((preferred?: HTMLElement | null) => {
    const root = ref.current;
    if (!root) return;
    const cards = cardsIn(root);
    if (cards.length === 0) return;
    const remembered = cards.find((card) => card.dataset.cardId === activeId.current);
    const current = (preferred && cards.includes(preferred) ? preferred : null) ?? remembered ?? cards[0];
    activeId.current = current.dataset.cardId ?? null;
    for (const card of cards) card.tabIndex = card === current ? 0 : -1;
  }, []);

  useLayoutEffect(() => {
    restore();
  });

  const onKeyDown = useCallback((event: KeyboardEvent<T>) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const root = ref.current;
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
    for (const item of cards) item.tabIndex = item === card ? 0 : -1;
    card.focus();
    reveal(card);
  }, []);

  const onFocus = useCallback((event: FocusEvent<T>) => {
    const card = event.target instanceof HTMLElement ? event.target.closest<HTMLElement>(CARD) : null;
    if (!card || !ref.current?.contains(card)) return;
    restore(card);
  }, [restore]);

  return { ref, onKeyDown, onFocus };
}
