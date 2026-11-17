import Navbar from "@/components/Navbar";

function Skeleton({ className }: { className: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-foreground/10 ring-1 ring-black/5 dark:ring-white/5 ${className}`}
    />
  );
}

export default function PublisherPageLoading() {
  return (
    <div className="relative min-h-screen" aria-busy="true">
      <Navbar />
      <div className="border-b border-black/5 bg-background/80 dark:border-white/5">
        <div className="mx-auto flex h-14 max-w-[1920px] items-center gap-4 px-4 sm:px-6 lg:px-8">
          <Skeleton className="h-11 w-11 flex-shrink-0 rounded-full md:h-9 md:w-9" />
          <Skeleton className="h-6 w-48 max-w-[45%]" />
        </div>
      </div>
      <Skeleton className="h-44 w-full sm:h-60" />
      <main aria-label="Loading publisher overview" className="mx-auto max-w-[1920px] px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-end gap-4">
          <Skeleton className="h-20 w-20 rounded-full sm:h-28 sm:w-28" />
          <div className="min-w-0 flex-1 space-y-2 pb-1">
            <Skeleton className="h-10 w-64 max-w-full" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
        <Skeleton className="mt-6 h-24 w-full max-w-3xl" />
        <Skeleton className="mt-10 h-8 w-44" />
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: 12 }, (_, index) => (
            <Skeleton key={index} className="aspect-[3/4] w-full" />
          ))}
        </div>
      </main>
      <div role="status" className="sr-only">
        Loading publisher overview
      </div>
    </div>
  );
}