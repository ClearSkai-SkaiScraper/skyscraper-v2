/** Animated pulse bar primitive */
function Pulse({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-200 dark:bg-gray-700 ${className}`} />;
}

/** Chat / messaging loading skeleton */
export function ChatSkeleton({ messages = 6 }: { messages?: number }) {
  return (
    <div className="flex h-[70vh] flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-gray-200 p-4 dark:border-gray-700">
        <Pulse className="h-10 w-10 rounded-full" />
        <div className="space-y-1">
          <Pulse className="h-4 w-32" />
          <Pulse className="h-3 w-20" />
        </div>
      </div>

      {/* Message list */}
      <div className="flex-1 space-y-4 overflow-hidden p-4">
        {Array.from({ length: messages }).map((_, i) => {
          const isRight = i % 3 === 0;
          return (
            <div key={i} className={`flex ${isRight ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[70%] space-y-1 rounded-xl p-3 ${
                  isRight ? "bg-blue-50 dark:bg-blue-900/20" : "bg-gray-100 dark:bg-gray-800"
                }`}
              >
                <Pulse className={`h-4 ${i % 2 === 0 ? "w-48" : "w-64"}`} />
                {i % 2 === 1 && <Pulse className="h-4 w-32" />}
                <Pulse className="h-3 w-16" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Input area */}
      <div className="flex items-center gap-2 border-t border-gray-200 p-4 dark:border-gray-700">
        <Pulse className="h-10 flex-1 rounded-lg" />
        <Pulse className="h-10 w-10 rounded-lg" />
      </div>
    </div>
  );
}
