"use client";

import { useState } from "react";
import { studioInitials } from "@/data/studio-profile";
import { resolveStudioLogo, type CatalogueCompanyLogo } from "@/data/studio-logo";

/** Same outer tile for an IGDB image, a local SVG, and initials. */
const PORTRAIT =
  "flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-xl ring-4 ring-background sm:h-28 sm:w-28";

/**
 * Brand mark for a studio.
 * Synced IGDB logos win. A local SVG is next. Initials fill whatever is left,
 * and a failed image steps down that list so nothing renders broken.
 * `inline` is the 24px game-page chip. `badge` is the studio portrait.
 */
export function StudioLogo({
  name,
  logo,
  variant = "inline",
}: {
  name: string;
  logo?: CatalogueCompanyLogo | null;
  variant?: "inline" | "badge";
}) {
  return (
    <StudioLogoView
      key={`${variant}:${name}:${logo?.url ?? ""}`}
      name={name}
      logo={logo}
      variant={variant}
    />
  );
}

function StudioLogoView({
  name,
  logo,
  variant,
}: {
  name: string;
  logo?: CatalogueCompanyLogo | null;
  variant: "inline" | "badge";
}) {
  const [stage, setStage] = useState(0);
  const resolved = stage >= 2
    ? null
    : resolveStudioLogo({ name, logo: stage === 0 ? logo : undefined });

  function handleError() {
    setStage((current) => {
      if (current >= 2) return current;
      if (current === 0 && resolved?.source === "catalogue") return 1;
      return 2;
    });
  }

  const initials = (
    <span className={variant === "badge" ? "text-xl font-bold tracking-wide text-zinc-900 sm:text-3xl" : "px-0.5 text-[10px] font-bold leading-none tracking-wide text-zinc-900"}>
      {studioInitials(name)}
    </span>
  );

  if (variant === "badge") {
    return (
      <div className={resolved ? `${PORTRAIT} p-3 sm:p-4` : PORTRAIT} aria-hidden="true">
        {resolved ? (
          // Catalogue files use the IGDB host; local SVG stays an img.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={resolved.src} alt="" className="h-full w-full object-contain" onError={handleError} />
        ) : initials}
      </div>
    );
  }

  if (!resolved) {
    return (
      <span className="inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded bg-white ring-1 ring-black/15" aria-hidden="true">
        {initials}
      </span>
    );
  }

  return (
    <span
      className="inline-flex h-6 shrink-0 items-center justify-center overflow-hidden rounded bg-white p-0.5 ring-1 ring-black/15"
      style={{ aspectRatio: String(Math.max(resolved.aspect, 1)), minWidth: "1.5rem" }}
      aria-hidden="true"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={resolved.src} alt="" className="h-full w-full object-contain" onError={handleError} />
    </span>
  );
}
