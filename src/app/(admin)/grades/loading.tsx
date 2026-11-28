import { SkeletonCard, SkeletonHeader, SkeletonPage, SkeletonTable } from "@/components/ui/skeleton";

// Order, Grade, Status + actions.
export default function Loading() {
  return (
    <SkeletonPage>
      <SkeletonHeader />
      <SkeletonCard>
        <SkeletonTable cols={["w-8", "w-24", "w-16"]} rows={6} />
      </SkeletonCard>
    </SkeletonPage>
  );
}
