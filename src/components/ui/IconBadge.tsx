export function IconBadge({
  icon: Icon,
  count,
  className = "",
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: any;
  count?: number;
  className?: string;
}) {
  return (
    <div
      className={
        "relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-slate-800 " +
        className
      }
    >
      <Icon className="h-5 w-5 text-gray-700 dark:text-slate-300" />
      {typeof count === "number" && (
        <span className="absolute -right-1 -top-1 rounded-full bg-gradient-indigo px-1.5 py-0.5 text-[10px] font-semibold text-white">
          {count}
        </span>
      )}
    </div>
  );
}
