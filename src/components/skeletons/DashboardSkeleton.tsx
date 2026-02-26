/** Animated pulse bar primitive */
function Pulse({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-200 dark:bg-gray-700 ${className}`} />;
}

/** Dashboard loading — stats row + chart + recent activity */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-4">
      {/* Greeting */}
      <Pulse className="h-8 w-72" />

      {/* KPI cards row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-200 p-5 dark:border-gray-700">
            <Pulse className="mb-2 h-4 w-20" />
            <Pulse className="mb-1 h-8 w-16" />
            <Pulse className="h-3 w-24" />
          </div>
        ))}
      </div>

      {/* Chart placeholder */}
      <div className="rounded-xl border border-gray-200 p-6 dark:border-gray-700">
        <Pulse className="mb-4 h-5 w-40" />
        <Pulse className="h-48 w-full" />
      </div>

      {/* Recent activity list */}
      <div className="rounded-xl border border-gray-200 p-6 dark:border-gray-700">
        <Pulse className="mb-4 h-5 w-36" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 border-b border-gray-100 py-3 dark:border-gray-800"
          >
            <Pulse className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-1">
              <Pulse className="h-4 w-48" />
              <Pulse className="h-3 w-32" />
            </div>
            <Pulse className="h-3 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
