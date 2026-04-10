import { formatDistanceToNow } from "date-fns";

import { logger } from "@/lib/logger";
import { getCurrentUserPermissions } from "@/lib/permissions";
import prisma from "@/lib/prisma";

// Prisma singleton imported from @/lib/db/prisma

export async function TasksToday() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { orgId, userId } = await getCurrentUserPermissions();

  if (!orgId) {
    return null;
  }

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  // Get tasks due today or overdue
  const tasks = await prisma.tasks.findMany({
    where: {
      orgId,
      status: { in: ["TODO", "IN_PROGRESS"] },
      OR: [
        { dueAt: { lte: tomorrow } },
        { dueAt: null, createdAt: { gte: today } }, // Recently created tasks without due date
      ],
    },
    orderBy: [{ priority: "desc" }, { dueAt: "asc" }, { createdAt: "asc" }],
    take: 10,
    include: {
      projects: {
        select: {
          title: true,
          properties: {
            select: {
              street: true,
              city: true,
            },
          },
        },
      },
      users: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return "text-red-600 bg-red-50 border-red-200";
      case "HIGH":
        return "text-orange-600 bg-orange-50 border-orange-200";
      case "MEDIUM":
        return "text-blue-600 bg-blue-50 border-blue-200";
      case "LOW":
        return "text-gray-600 bg-gray-50 border-gray-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "TODO":
        return "text-gray-600 bg-gray-100";
      case "IN_PROGRESS":
        return "text-blue-600 bg-blue-100";
      case "DONE":
        return "text-green-600 bg-green-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const isOverdue = (dueAt: Date | null) => {
    if (!dueAt) return false;
    return new Date(dueAt) < new Date();
  };

  return (
    <div className="rounded-lg bg-white shadow">
      <div className="border-b p-6">
        <h3 className="text-lg font-semibold">My Tasks Today</h3>
        <p className="text-sm text-gray-500">Tasks due today and overdue items</p>
      </div>

      <div className="p-6">
        {tasks.length === 0 ? (
          <div className="py-8 text-center">
            <div className="mb-2 text-4xl text-gray-400">✅</div>
            <p className="text-gray-500">No tasks due today</p>
            <p className="text-sm text-gray-400">You&apos;re all caught up!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((tasks) => (
              <div
                key={tasks.id}
                className={`rounded-lg border p-4 transition-shadow hover:shadow-sm ${
                  isOverdue(tasks.dueAt) ? "border-red-200 bg-red-50" : "border-gray-200"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="mb-2 flex items-center space-x-2">
                      <h4 className="font-medium text-gray-900">{tasks.title}</h4>
                      <span
                        className={`rounded-full px-2 py-1 text-xs ${getPriorityColor(
                          tasks.priority || "LOW"
                        )}`}
                      >
                        {tasks.priority || "LOW"}
                      </span>
                      <span
                        className={`rounded-full px-2 py-1 text-xs ${getStatusColor(tasks.status)}`}
                      >
                        {tasks.status.replace("_", " ")}
                      </span>
                    </div>

                    {tasks.description && (
                      <p className="mb-2 text-sm text-gray-600">{tasks.description}</p>
                    )}

                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      {tasks.projects && (
                        <span className="flex items-center space-x-1">
                          <span>📂</span>
                          <span>{tasks.projects.title}</span>
                        </span>
                      )}

                      {tasks.users && (
                        <span className="flex items-center space-x-1">
                          <span>👤</span>
                          <span>{tasks.users.name || tasks.users.email}</span>
                        </span>
                      )}

                      {tasks.dueAt && (
                        <span
                          className={`flex items-center space-x-1 ${
                            isOverdue(tasks.dueAt) ? "font-medium text-red-600" : ""
                          }`}
                        >
                          <span>⏰</span>
                          <span>
                            {isOverdue(tasks.dueAt) ? "Overdue" : "Due"}{" "}
                            {formatDistanceToNow(new Date(tasks.dueAt), {
                              addSuffix: true,
                            })}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="ml-4 flex items-center space-x-2">
                    <button
                      className="rounded bg-green-100 px-3 py-1 text-xs text-green-700 transition-colors hover:bg-green-200"
                      onClick={() => {
                        // TODO: Implement complete tasks
                        logger.debug("Complete tasks:", tasks.id);
                      }}
                    >
                      Complete
                    </button>
                    <a
                      href={`/tasks/${tasks.id}`}
                      className="rounded bg-gray-100 px-3 py-1 text-xs text-gray-700 transition-colors hover:bg-gray-200"
                    >
                      View
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tasks.length > 0 && (
          <div className="mt-6 text-center">
            <a href="/tasks" className="text-sm font-medium text-blue-600 hover:text-blue-800">
              View all tasks →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
