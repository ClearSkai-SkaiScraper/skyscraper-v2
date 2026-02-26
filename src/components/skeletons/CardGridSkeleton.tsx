/** Animated pulse bar primitive */
function Pulse({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-200 dark:bg-gray-700 ${className}`} />;
}

/** Grid of cards — e.g. project cards, vendor cards */
export function CardGridSkeleton({ count = 6, cols = 3 }: { count?: number; cols?: number }) {
  return (
    <div className="space-y-4 p-4">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <Pulse className="h-8 w-48" />
        <Pulse className="h-9 w-32" />
      </div>

      {/* Card grid */}
      <div
        className={`grid gap-4`}
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        }}
      >
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-200 p-5 dark:border-gray-700">
            <Pulse className="mb-3 h-5 w-3/4" />
            <Pulse className="mb-2 h-4 w-1/2" />
            <Pulse className="mb-4 h-4 w-2/3" />
            <div className="flex gap-2">
              <Pulse className="h-6 w-16 rounded-full" />
              <Pulse className="h-6 w-16 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
