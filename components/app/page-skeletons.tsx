import { Skeleton } from "@/components/ui/skeleton";

export function PageSkeleton() {
  return (
    <div className="flex flex-col gap-8" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-40 w-full rounded-3xl" />
      <div className="grid grid-cols-1 gap-gutter lg:grid-cols-2">
        <Skeleton className="h-52 w-full rounded-3xl" />
        <Skeleton className="h-52 w-full rounded-3xl" />
      </div>
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

export function DashboardPageSkeleton() {
  return (
    <div className="flex flex-col gap-8" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-48 w-full rounded-3xl" />
      <div className="grid grid-cols-1 gap-gutter lg:grid-cols-12">
        <Skeleton className="h-56 w-full rounded-3xl lg:col-span-5" />
        <Skeleton className="h-56 w-full rounded-3xl lg:col-span-7" />
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-6 w-40" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

export function DashboardPodiumSkeleton() {
  return <Skeleton className="h-48 w-full rounded-3xl" aria-hidden />;
}

export function DashboardMainGridSkeleton() {
  return (
    <div
      className="grid grid-cols-1 gap-gutter lg:grid-cols-12"
      aria-hidden
    >
      <Skeleton className="h-56 w-full rounded-3xl lg:col-span-5" />
      <Skeleton className="h-56 w-full rounded-3xl lg:col-span-7" />
    </div>
  );
}

export function DashboardActivitySkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      <Skeleton className="h-6 w-40" />
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full rounded-2xl" />
      ))}
    </div>
  );
}

export function LedgerPageSkeleton() {
  return (
    <div className="flex flex-col gap-8" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-56 w-full rounded-3xl md:col-span-2" />
      <Skeleton className="h-10 w-32 rounded-full" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

export function ChoresListSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-32 w-full rounded-3xl" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
