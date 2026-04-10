"use client";

import { SignIn } from "@clerk/nextjs";
import { useEffect, useState } from "react";

export default function ClerkTestPage() {
  const [clerkStatus, setClerkStatus] = useState("Checking...");
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    const checkClerk = () => {
      if (typeof window !== "undefined") {
        // @ts-ignore
        if (window.Clerk) {
          setClerkStatus("✅ Clerk loaded successfully");
        } else {
          setClerkStatus("❌ Clerk not loaded");
          setErrors((prev) => [...prev, "window.Clerk is undefined"]);
        }
      }
    };

    // Check immediately
    checkClerk();

    // Check again after 2 seconds
    const timer = setTimeout(checkClerk, 2000);

    // Listen for Clerk load event
    window.addEventListener("clerk:loaded", () => {
      setClerkStatus("✅ Clerk loaded (via event)");
    });

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-6 text-3xl font-bold">Clerk Debug Page</h1>

        <div className="mb-6 rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold">Status</h2>
          <p className="text-lg">{clerkStatus}</p>

          {errors.length > 0 && (
            <div className="mt-4">
              <h3 className="font-semibold text-red-600">Errors:</h3>
              <ul className="list-disc pl-5">
                {errors.map((err, i) => (
                  <li key={i} className="text-red-600">
                    {err}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-4">
            <h3 className="font-semibold">Environment:</h3>
            // eslint-disable-next-line react/jsx-no-comment-textnodes
            <p className="font-mono text-sm">
              // eslint-disable-next-line no-restricted-syntax
              Publishable Key: {process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.substring(0, 20)}...
            </p>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold">SignIn Component Test</h2>
          <SignIn
            routing="path"
            path="/clerk-test"
            appearance={{
              elements: {
                rootBox: "mx-auto w-full max-w-md",
                card: "shadow-xl border",
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
