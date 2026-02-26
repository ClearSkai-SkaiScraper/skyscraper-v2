/** Animated pulse bar primitive */
function Pulse({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-200 dark:bg-gray-700 ${className}`} />;
}

/** Detail / show page — header + tabs + content sections */
export function DetailSkeleton() {
  return (
    <div className="space-y-6 p-4">
      {/* Back link + breadcrumb */}
      <Pulse className="h-4 w-32" />

      {/* Title row */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Pulse className="h-8 w-64" />
          <Pulse className="h-4 w-48" />
        </div>
        <div className="flex gap-2">
          <Pulse className="h-9 w-24" />
          <Pulse className="h-9 w-24" />
        </div>
      </div>

      {/* Status badges */}
      <div className="flex gap-2">
        <Pulse className="h-6 w-20 rounded-full" />
        <Pulse className="h-6 w-24 rounded-full" />
        <Pulse className="h-6 w-16 rounded-full" />
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-gray-200 dark:border-gray-700">
        {Array.from({ length: 4 }).map((_, i) => (
          <Pulse key={i} className="h-4 w-16 pb-3" />
        ))}
      </div>

      {/* Content sections */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-xl border border-gray-200 p-6 dark:border-gray-700">
            <Pulse className="mb-4 h-5 w-32" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="mb-3 flex justify-between">
                <Pulse className="h-4 w-28" />
                <Pulse className="h-4 w-40" />
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 p-6 dark:border-gray-700">
            <Pulse className="mb-4 h-5 w-24" />
            <Pulse className="mb-2 h-4 w-full" />
            <Pulse className="mb-2 h-4 w-3/4" />
            <Pulse className="h-4 w-1/2" />
          </div>
        </div>
      </div>
    </div>
  );
}
