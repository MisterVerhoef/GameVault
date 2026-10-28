"use client";

import { useState } from "react";
import { studioInitials } from "@/data/studio-profile";
import { resolveStudioLogo, type CatalogueCompanyLogo } from "@/data/studio-logo";

/**
 * Brand mark for a studio.
 * Synced IGDB logos win. A local SVG is the next choice. A failed image steps
 * down that list so a bad URL never leaves a broken icon. `badge` is the
 * studio-page portrait and uses initials when nothing else is left.
 */
export function StudioLogo({
  name,
  logo,
  className = "h-4",
  variant = "inline",
}: {
  name: string;
  logo?: CatalogueCompanyLogo | null;
  className?: string;
  variant?: "inline" | "badge";
}) {
  return (
    <StudioLogoView
      key={`${variant}:${name}:${logo?.url ?? ""}`}
      name={name}
      logo={logo}
      className={className}
      variant={variant}
    />
  );
}

function StudioLogoView({
  name,
  logo,
  className,
  variant,
}: {
  name: string;
  logo?: CatalogueCompanyLogo | null;
  className: string;
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

  if (!resolved) {
    if (variant !== "badge") return null;
    return (
      <div
        className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full bg-card text-xl font-bold tracking-wide text-foreground shadow-xl ring-4 ring-background sm:h-28 sm:w-28 sm:text-3xl"
        aria-hidden="true"
      >
        {studioInitials(name)}
      </div>
    );
  }

  if (variant === "badge") {
    return (
      <div
        className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-2xl bg-white p-2.5 shadow-xl ring-4 ring-background sm:h-28 sm:w-28 sm:p-3.5"
        aria-hidden="true"
      >
        {/* Local SVG stays an img; catalogue files are the same IGDB host as covers. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={resolved.src} alt="" className="h-full w-full object-contain" onError={handleError} />
      </div>
    );
  }

  return (
    <span
      className={`relative inline-block shrink-0 overflow-hidden rounded-[3px] bg-white ring-1 ring-black/15 ${className}`}
      style={{ width: "auto", aspectRatio: String(resolved.aspect) }}
      aria-hidden="true"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={resolved.src}
        alt=""
        className="absolute inset-[8%] size-[84%] object-contain"
        onError={handleError}
      />
    </span>
  );
}
