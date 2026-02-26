import { TableSkeleton } from "@/components/skeletons";

export default function EmployeesLoading() {
  return <TableSkeleton rows={8} cols={5} />;
}
