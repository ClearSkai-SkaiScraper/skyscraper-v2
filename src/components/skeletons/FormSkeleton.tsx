/** Animated pulse bar primitive */
function Pulse({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-200 dark:bg-gray-700 ${className}`} />;
}

/** Form loading skeleton — section titles + fields */
export function FormSkeleton({ fields = 6 }: { fields?: number }) {
  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      {/* Page title */}
      <Pulse className="h-8 w-64" />
      <Pulse className="h-4 w-96" />

      {/* Form fields */}
      <div className="space-y-5 rounded-xl border border-gray-200 p-6 dark:border-gray-700">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Pulse className="h-4 w-24" />
            <Pulse className="h-10 w-full" />
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex justify-end gap-3">
        <Pulse className="h-10 w-24" />
        <Pulse className="h-10 w-32" />
      </div>
    </div>
  );
}
