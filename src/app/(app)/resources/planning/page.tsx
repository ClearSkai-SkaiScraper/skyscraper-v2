"use client";

import { useUser } from "@clerk/nextjs";
import { AlertTriangle,Calendar, TrendingUp, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ResourcePlanningPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded || !isSignedIn) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="mb-2 text-3xl font-bold text-[color:var(--text)]">
          Resource Planning & Forecasting
        </h1>
        <p className="text-gray-600">Capacity planning and resource allocation optimization</p>
      </div>

      {/* Capacity Overview */}
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-gray-600">Current Capacity</span>
            <Users className="h-5 w-5 text-blue-600" />
          </div>
          <div className="text-3xl font-bold">78%</div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200">
            <div className="h-full bg-sky-600" style={{ width: "78%" }} />
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-gray-600">Available Crews</span>
            <Users className="h-5 w-5 text-green-600" />
          </div>
          <div className="text-3xl font-bold">12</div>
          <div className="mt-1 text-sm text-gray-600">of 15 crews</div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-gray-600">Forecasted Demand</span>
            <TrendingUp className="h-5 w-5 text-purple-600" />
          </div>
          <div className="text-3xl font-bold">+23%</div>
          <div className="mt-1 text-sm text-gray-600">next 30 days</div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-gray-600">Resource Gaps</span>
            <AlertTriangle className="h-5 w-5 text-orange-600" />
          </div>
          <div className="text-3xl font-bold">3</div>
          <div className="mt-1 text-sm text-gray-600">hiring needed</div>
        </div>
      </div>

      {/* Timeline View */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
          <Calendar className="h-6 w-6 text-blue-600" />
          30-Day Forecast
        </h2>
        <div className="space-y-4">
          {["Week 1", "Week 2", "Week 3", "Week 4"].map((week, idx) => {
            const capacity = [65, 78, 85, 92][idx];
            const color = capacity < 75 ? "green" : capacity < 90 ? "yellow" : "red";
            return (
              <div key={week} className="flex items-center gap-4">
                <div className="w-24 text-sm font-medium">{week}</div>
                <div className="flex-1">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm text-gray-600">Capacity</span>
                    <span className="text-sm font-medium">{capacity}%</span>
                  </div>
                  <div className="h-8 overflow-hidden rounded-lg bg-gray-100">
                    <div
                      className={`bg- h-full${color}-500 transition-all`}
                      style={{ width: `${capacity}%` }}
                    />
                  </div>
                </div>
                <div className="w-32 text-sm text-gray-600">
                  {capacity < 75 && "Under capacity"}
                  {capacity >= 75 && capacity < 90 && "Optimal"}
                  {capacity >= 90 && "Over capacity"}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Crew Allocation */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-xl font-bold">Crew Allocation</h2>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Crew</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                Current Load
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">This Week</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Next Week</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {[
              { crew: "Crew A", current: 85, thisWeek: 3, nextWeek: 4, status: "busy" },
              { crew: "Crew B", current: 60, thisWeek: 2, nextWeek: 2, status: "available" },
              { crew: "Crew C", current: 95, thisWeek: 4, nextWeek: 5, status: "overbooked" },
            ].map((row) => (
              <tr key={row.crew}>
                <td className="px-4 py-3 font-medium">{row.crew}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-32 overflow-hidden rounded-full bg-gray-200">
                      <div
                        className={`h-full ${
                          row.current < 75
                            ? "bg-green-500"
                            : row.current < 90
                              ? "bg-yellow-500"
                              : "bg-red-500"
                        }`}
                        style={{ width: `${row.current}%` }}
                      />
                    </div>
                    <span className="text-sm">{row.current}%</span>
                  </div>
                </td>
                <td className="px-4 py-3">{row.thisWeek} jobs</td>
                <td className="px-4 py-3">{row.nextWeek} jobs</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${
                      row.status === "available"
                        ? "bg-green-100 text-green-700"
                        : row.status === "busy"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                    }`}
                  >
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
