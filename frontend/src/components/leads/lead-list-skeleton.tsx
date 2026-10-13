import { Skeleton } from "@/components/ui/skeleton";

const SKELETON_CARD_COUNT = 5;

export function LeadListSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading leads">
      {Array.from({ length: SKELETON_CARD_COUNT }, (_, index) => (
        <div key={index} className="rounded-xl border bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-5 w-48 max-w-[60%]" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="mt-3 h-4 w-3/4" />
          <Skeleton className="mt-3 h-5 w-44 rounded-full" />
        </div>
      ))}
    </div>
  );
}
