import { SkeletonCard, SkeletonHeader, SkeletonPage, SkeletonTable } from "@/components/ui/skeleton";

// Room, People, Status, Created + actions.
export default function Loading() {
  return (
    <SkeletonPage>
      <SkeletonHeader />
      <SkeletonCard>
        <SkeletonTable cols={["w-14", "w-20", "w-16", "w-24"]} />
      </SkeletonCard>
    </SkeletonPage>
  );
}
