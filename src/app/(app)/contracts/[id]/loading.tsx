import { Skeleton } from "@/components/ui/skeleton";

export default function ContractDetailLoading() {
  return (
    <div className="space-y-6 p-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
      <Skeleton className="h-96" />
    </div>
  );
}
