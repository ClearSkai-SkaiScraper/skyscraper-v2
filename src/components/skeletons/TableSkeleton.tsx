/** Animated pulse bar primitive */
function Pulse({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-200 dark:bg-gray-700 ${className}`} />;
}

/** Full-width table skeleton — rows × cols */
export function TableSkeleton({ rows = 8, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full space-y-4 p-4">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <Pulse className="h-8 w-48" />
        <Pulse className="h-9 w-32" />
      </div>

      {/* Search / filter bar */}
      <div className="flex gap-3">
        <Pulse className="h-10 w-64" />
        <Pulse className="h-10 w-32" />
        <Pulse className="h-10 w-32" />
      </div>

      {/* Table header */}
      <div className="flex gap-4 border-b border-gray-200 pb-3 dark:border-gray-700">
        {Array.from({ length: cols }).map((_, i) => (
          <Pulse key={i} className="h-4 flex-1" />
        ))}
      </div>

      {/* Table rows */}
      {Array.from({ length: rows }).map((_, row) => (
        <div
          key={row}
          className="flex items-center gap-4 border-b border-gray-100 py-3 dark:border-gray-800"
        >
          {Array.from({ length: cols }).map((_, col) => (
            <Pulse key={col} className={`h-4 flex-1 ${col === 0 ? "max-w-[200px]" : ""}`} />
          ))}
        </div>
      ))}
    </div>
  );
}
