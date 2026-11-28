import { SkeletonCard, SkeletonFilterBar, SkeletonHeader, SkeletonPage, SkeletonTable } from "@/components/ui/skeleton";

// Search + status filter, then Code, Name, Status, Created + actions.
export default function Loading() {
  return (
    <SkeletonPage>
      <SkeletonHeader />
      <SkeletonCard>
        <SkeletonFilterBar selects={1} />
        <SkeletonTable cols={["w-14", "w-56", "w-16", "w-24"]} rows={6} />
      </SkeletonCard>
    </SkeletonPage>
  );
}
