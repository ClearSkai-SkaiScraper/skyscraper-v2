"use client";

import { useUser } from "@clerk/nextjs";
import { Bell, Download, Smartphone, Wifi, WifiOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function MobileAppPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  const [offlineMode, setOfflineMode] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(true);

  if (!isLoaded || !isSignedIn) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="mb-2 text-3xl font-bold text-[color:var(--text)]">Mobile App Companion</h1>
        <p className="text-gray-600">
          Progressive Web App with offline mode and push notifications
        </p>
      </div>

      {/* PWA Install Banner */}
      <div className="rounded-lg bg-gradient-indigo p-8 text-white transition hover:opacity-95">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h2 className="mb-2 text-2xl font-bold">Install Mobile App</h2>
            <p className="mb-4 text-blue-100">
              Get the full mobile experience with offline access, push notifications, and native
              features
            </p>
            <div className="flex gap-3">
              <button className="flex items-center gap-2 rounded-lg bg-white px-6 py-3 font-medium text-blue-600 hover:bg-blue-50">
                <Download className="h-5 w-5" />
                Install on iOS
              </button>
              <button className="flex items-center gap-2 rounded-lg bg-white px-6 py-3 font-medium text-blue-600 hover:bg-blue-50">
                <Download className="h-5 w-5" />
                Install on Android
              </button>
            </div>
          </div>
          <Smartphone className="h-32 w-32 opacity-50" />
        </div>
      </div>

      {/* App Features */}
      <div className="grid grid-cols-3 gap-6">
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
            {offlineMode ? (
              <WifiOff className="h-6 w-6 text-blue-600" />
            ) : (
              <Wifi className="h-6 w-6 text-blue-600" />
            )}
          </div>
          <h3 className="mb-2 font-bold">Offline Mode</h3>
          <p className="mb-4 text-sm text-gray-600">Access your data without internet connection</p>
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={offlineMode}
              onChange={(e) => setOfflineMode(e.target.checked)}
              className="peer sr-only"
              aria-label="Enable offline mode"
            />
            <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-sky-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300"></div>
          </label>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
            <Bell className="h-6 w-6 text-green-600" />
          </div>
          <h3 className="mb-2 font-bold">Push Notifications</h3>
          <p className="mb-4 text-sm text-gray-600">Get instant alerts for important updates</p>
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={pushNotifications}
              onChange={(e) => setPushNotifications(e.target.checked)}
              className="peer sr-only"
              aria-label="Enable push notifications"
            />
            <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-sky-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300"></div>
          </label>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100">
            <Smartphone className="h-6 w-6 text-purple-600" />
          </div>
          <h3 className="mb-2 font-bold">Native Features</h3>
          <p className="mb-4 text-sm text-gray-600">Camera, GPS, and device integration</p>
          <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
            Enabled
          </span>
        </div>
      </div>

      {/* App Stats */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-xl font-bold">App Performance</h2>
        <div className="grid grid-cols-4 gap-6">
          <div>
            <div className="text-3xl font-bold text-blue-600">245</div>
            <div className="text-sm text-gray-600">Active Installations</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-green-600">4.8</div>
            <div className="text-sm text-gray-600">Average Rating</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-purple-600">89%</div>
            <div className="text-sm text-gray-600">User Retention</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-orange-600">2.3 MB</div>
            <div className="text-sm text-gray-600">App Size</div>
          </div>
        </div>
      </div>
    </div>
  );
}
