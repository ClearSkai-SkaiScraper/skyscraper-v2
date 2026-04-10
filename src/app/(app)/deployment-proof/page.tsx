import { Metadata } from "next";

export const metadata: Metadata = {
  title: "🔴 DEPLOYMENT PROOF",
  description: "Verify latest deployment is live",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

// eslint-disable-next-line no-restricted-imports
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function DeploymentProofPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  const buildTime = new Date().toISOString();
  const randomNumber = Math.random().toString(36).substring(7);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-red-600 via-orange-500 to-yellow-400 p-8">
      <div className="w-full max-w-3xl rounded-3xl border-8 border-black bg-white p-12 shadow-2xl">
        <div className="space-y-6 text-center">
          <div className="animate-pulse bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-7xl font-black text-transparent">
            🔴 DEPLOYMENT CONFIRMED
          </div>

          <div className="border-4 border-black bg-yellow-200 p-4 text-3xl font-bold text-gray-900">
            BUILD IS LIVE ✅
          </div>

          <div className="space-y-4 rounded-xl border-2 border-gray-300 bg-gray-100 p-6 text-left font-mono text-sm">
            <div className="flex justify-between">
              <span className="font-semibold">Server Time:</span>
              <span className="font-bold text-blue-600">{buildTime}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">Random Token:</span>
              <span className="font-bold text-green-600">{randomNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">Render Type:</span>
              <span className="font-bold text-purple-600">DYNAMIC SERVER-SIDE</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">Cache:</span>
              <span className="font-bold text-red-600">DISABLED (force-dynamic)</span>
            </div>
          </div>

          <div className="border-l-4 border-red-600 pl-4 text-xl leading-relaxed text-gray-700">
            If you can see this page with a CURRENT timestamp, the latest code is deployed. Each
            refresh will show a NEW timestamp because caching is disabled.
          </div>

          <div className="border-t-2 border-gray-300 pt-6">
            <a
              href="/dashboard"
              className="inline-block rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-4 text-xl font-bold text-white shadow-lg transition-transform hover:scale-105"
            >
              Go to Dashboard →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
