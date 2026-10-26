"use client";

import { useId } from "react";
import { PERSONAL_RATING_MAX } from "@/context/library-entry";

const STARS = Array.from({ length: PERSONAL_RATING_MAX }, (_, index) => index + 1);

export default function StarRating({
  value,
  onChange,
  readOnly = false,
  label = "Your rating",
}: {
  value?: number;
  onChange?: (rating: number | null) => void;
  readOnly?: boolean;
  label?: string;
}) {
  const labelId = useId();

  if (readOnly) {
    if (!value) return null;
    return (
      <span className="text-[11px] font-semibold leading-none tracking-tight" aria-label={`${label} ${value} out of ${PERSONAL_RATING_MAX}`}>
        <span aria-hidden="true">
          {STARS.map((star) => (
            <span key={star} className={star <= value ? "text-yellow-400" : "text-white/40"}>
              ★
            </span>
          ))}
        </span>
      </span>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span id={labelId} className="text-xs font-medium text-muted">{label}</span>
      <div role="group" aria-labelledby={labelId} className="flex items-center">
        {STARS.map((star) => {
          const filled = value != null && star <= value;
          const selected = value === star;
          return (
            <button
              key={star}
              type="button"
              aria-pressed={selected}
              aria-label={selected ? `Clear ${star} out of ${PERSONAL_RATING_MAX} rating` : `Rate ${star} out of ${PERSONAL_RATING_MAX}`}
              onClick={() => onChange?.(selected ? null : star)}
              className={`rounded px-0.5 text-lg leading-none transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                filled ? "text-yellow-400" : "text-muted/45 hover:text-yellow-400"
              }`}
            >
              <span aria-hidden="true">★</span>
            </button>
          );
        })}
      </div>
      <span className="text-xs text-muted">{value ? `${value}/${PERSONAL_RATING_MAX}` : "Unrated"}</span>
    </div>
  );
}
