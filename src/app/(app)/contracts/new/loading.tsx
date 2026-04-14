import { Skeleton } from "@/components/ui/skeleton";

export default function NewContractLoading() {
  return (
    <div className="space-y-6 p-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-12 w-full" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}
