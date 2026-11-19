/** Round cloud icon for any matched cloud streaming service (not Xbox-specific). */
export default function CloudStreamingBadge({ services }: { services: readonly string[] }) {
  if (services.length === 0) return null;
  const summary = services.join(", ");
  return (
    <span
      className="absolute right-1.5 top-1.5 z-20 inline-flex items-center justify-center rounded-full bg-black/75 p-1.5 text-white shadow-sm ring-1 ring-white/25"
      title={`Cloud streaming: ${summary}`}
      aria-label={`Cloud streaming available via ${summary}`}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M7.5 18.5h10a4 4 0 0 0 .5-8 6 6 0 0 0-11.5-1.2A4.4 4.4 0 0 0 7.5 18.5Z" />
      </svg>
      <span className="sr-only">Stream</span>
    </span>
  );
}