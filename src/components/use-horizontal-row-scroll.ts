"use client";

import { useCallback, useLayoutEffect, useState, type RefObject } from "react";
import {
  canScrollRowLeft,
  canScrollRowRight,
  maxScrollCardIndex,
  nextSnapIndex,
  snapScrollLeft,
} from "./horizontal-row-scroll.mjs";

interface RowMetrics {
  stride: number;
  cardWidth: number;
  padLeft: number;
  padRight: number;
  maxIndex: number;
}

function readMetrics(node: HTMLDivElement, count: number): RowMetrics | null {
  const cards = node.querySelectorAll<HTMLElement>("[data-roving-card]");
  const first = cards[0];
  if (!first) return null;
  const style = getComputedStyle(node);
  const padLeft =
    Number.parseFloat(style.scrollPaddingLeft) || Number.parseFloat(style.paddingLeft) || 0;
  const padRight =
    Number.parseFloat(style.scrollPaddingRight) || Number.parseFloat(style.paddingRight) || 0;
  const cardWidth = first.offsetWidth;
  const second = cards[1];
  const gap = second
    ? Math.max(
        0,
        second.getBoundingClientRect().left - first.getBoundingClientRect().left - cardWidth,
      )
    : Math.max(0, Number.parseFloat(style.columnGap || style.gap) || 16);
  const stride = cardWidth + gap;
  const maxIndex = maxScrollCardIndex(
    count,
    stride,
    cardWidth,
    padLeft,
    padRight,
    node.clientWidth,
    node.scrollWidth,
  );
  return { stride, cardWidth, padLeft, padRight, maxIndex };
}

export function useHorizontalRowScroll(ref: RefObject<HTMLDivElement | null>, itemCount: number) {
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const refresh = useCallback(() => {
    const node = ref.current;
    if (!node || itemCount === 0) {
      setCanLeft(false);
      setCanRight(false);
      return;
    }
    const metrics = readMetrics(node, itemCount);
    if (!metrics) {
      setCanLeft(false);
      setCanRight(itemCount > 1);
      return;
    }
    setCanLeft(canScrollRowLeft(node.scrollLeft, metrics.stride));
    setCanRight(canScrollRowRight(node.scrollLeft, metrics.stride, metrics.maxIndex));
  }, [itemCount, ref]);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    refresh();
    node.addEventListener("scroll", refresh, { passive: true });
    const resize = new ResizeObserver(() => refresh());
    resize.observe(node);
    const large = window.matchMedia("(min-width: 1024px)");
    const small = window.matchMedia("(min-width: 640px)");
    large.addEventListener("change", refresh);
    small.addEventListener("change", refresh);
    return () => {
      node.removeEventListener("scroll", refresh);
      resize.disconnect();
      large.removeEventListener("change", refresh);
      small.removeEventListener("change", refresh);
    };
  }, [itemCount, ref, refresh]);

  const scroll = useCallback(
    (direction: "left" | "right") => {
      const node = ref.current;
      if (!node) return;
      const metrics = readMetrics(node, itemCount);
      if (!metrics) return;
      const nextIndex = nextSnapIndex(node.scrollLeft, metrics.stride, metrics.maxIndex, direction);
      const target = snapScrollLeft(nextIndex, metrics.stride);
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      node.scrollTo({ left: target, behavior: reduceMotion ? "auto" : "smooth" });
      if (reduceMotion) {
        refresh();
        return;
      }
      const onScrollEnd = () => {
        refresh();
        node.removeEventListener("scrollend", onScrollEnd);
      };
      node.addEventListener("scrollend", onScrollEnd);
      requestAnimationFrame(() => requestAnimationFrame(refresh));
    },
    [itemCount, ref, refresh],
  );

  return { scroll, canScrollLeft: canLeft, canScrollRight: canRight, refresh };
}
