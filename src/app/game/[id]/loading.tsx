import Navbar from "@/components/Navbar";

function Skeleton({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-card ring-1 ring-white/5 ${className}`} />;
}

export default function GameDetailLoading() {
  return (
    <div className="relative min-h-screen" aria-busy="true">
      <Navbar />

      <main
        aria-label="Loading game details"
        className="mx-auto max-w-[1920px] px-4 py-8 sm:px-6 lg:px-8"
      >
        <div className="mb-12 flex flex-col gap-6 lg:flex-row lg:gap-12">
          <Skeleton className="mx-auto h-64 w-44 flex-shrink-0 sm:h-80 sm:w-56 lg:mx-0 lg:h-96 lg:w-64" />

          <div className="flex flex-1 flex-col gap-4">
            <div className="space-y-3">
              <Skeleton className="h-10 w-4/5 max-w-lg" />
              <Skeleton className="h-5 w-2/5 max-w-xs" />
              <div className="flex gap-3 pt-2">
                <Skeleton className="h-20 w-36" />
                <Skeleton className="h-20 w-36" />
              </div>
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-8 w-28 rounded" />
              <Skeleton className="h-8 w-24 rounded" />
              <Skeleton className="h-8 w-32 rounded" />
            </div>
            <Skeleton className="h-24 w-full max-w-3xl" />
            <div className="flex gap-3">
              <Skeleton className="h-11 w-32 rounded-full" />
              <Skeleton className="h-11 w-28 rounded-full" />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <Skeleton className="h-7 w-40" />
          <div className="flex flex-wrap gap-6">
            <Skeleton className="h-14 w-28" />
            <Skeleton className="h-14 w-36" />
            <Skeleton className="h-14 w-44" />
          </div>
        </div>
      </main>

      <div role="status" className="sr-only">
        Loading game details
      </div>
    </div>
  );
}
