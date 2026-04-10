import { getApp } from "firebase/app";
import { connectFunctionsEmulator,getFunctions, httpsCallable } from "firebase/functions";

let cached: ReturnType<typeof getFunctions> | null = null;

export function functionsClient() {
  if (cached) return cached;
  const app = getApp();
  const fn = getFunctions(app, "us-central1");
  // eslint-disable-next-line no-restricted-syntax
  if (process.env.NEXT_PUBLIC_USE_FUNCTIONS_EMULATOR === "true") {
    connectFunctionsEmulator(fn, "localhost", 5001);
  }
  cached = fn;
  return fn;
}

// Returns true if any callable succeeds (e.g., getWeatherHistory)
export async function functionsHealthy(): Promise<boolean> {
  try {
    const fn = functionsClient();
    const ping = httpsCallable(fn, "getWeatherHistory");
    await ping({ ping: true });
    return true;
  } catch {
    return false;
  }
}
