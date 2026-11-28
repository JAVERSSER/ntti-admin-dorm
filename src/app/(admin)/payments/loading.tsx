import { Bone, SkeletonCard, SkeletonFilterBar, SkeletonHeader, SkeletonPage, SkeletonPager, SkeletonStats } from "@/components/ui/skeleton";

// Paid / Not paid boxes, then the card with filters and the screenshot grid.
export default function Loading() {
  return (
    <SkeletonPage>
      <SkeletonHeader />
      <SkeletonStats count={2} />
      <SkeletonCard>
        <SkeletonFilterBar selects={2} />
        <div className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="relative aspect-[3/4] w-full bg-slate-100">
                <div className="absolute left-2 top-2 h-5 w-16 rounded-full bg-slate-200" />
              </div>
              <div className="space-y-1.5 p-3">
                <Bone className="h-4 w-3/4" />
                <Bone className="h-3 w-1/2 bg-slate-100" />
                <Bone className="h-3 w-2/3 bg-slate-100" />
                <Bone className="mt-2 h-3 w-1/2 bg-blue-100" />
              </div>
            </div>
          ))}
        </div>
        <SkeletonPager />
      </SkeletonCard>
    </SkeletonPage>
  );
}
