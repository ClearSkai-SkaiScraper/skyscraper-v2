export default function KPIDashboardLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      {/* Header Skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="h-8 w-64 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
          <div className="mt-2 h-4 w-96 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        </div>
      </div>

      {/* Time Range Tabs Skeleton */}
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-9 w-24 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700"
          />
        ))}
      </div>

      {/* KPI Cards Grid Skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="mb-2 flex items-center justify-between">
              <div className="h-4 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
              <div className="h-8 w-8 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
            </div>
            <div className="mb-2 h-8 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-3 w-16 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
          </div>
        ))}
      </div>

      {/* Charts Section Skeleton */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-4 h-5 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-64 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-4 h-5 w-36 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-64 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
        </div>
      </div>

      {/* Risk Analysis Section Skeleton */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-4 h-5 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
          ))}
        </div>
      </div>
    </div>
  );
}
