import { SkeletonCard, SkeletonFilterBar, SkeletonHeader, SkeletonPage, SkeletonStats, SkeletonTable } from "@/components/ui/skeleton";

// Residents / Paid / Not paid boxes, then filters and the residents table.
export default function Loading() {
  return (
    <SkeletonPage>
      <SkeletonHeader buttons={3} />
      <SkeletonStats count={3} className="lg:grid-cols-3" />
      <SkeletonCard>
        <SkeletonFilterBar selects={3} />
        <SkeletonTable cols={["w-12", "w-36", "w-32", "w-16", "w-20"]} />
      </SkeletonCard>
    </SkeletonPage>
  );
}
