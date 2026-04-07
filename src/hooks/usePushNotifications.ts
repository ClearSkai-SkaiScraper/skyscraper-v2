/**
 * usePushNotifications Hook
 * Handles push notification subscription, permission requests, and service worker registration
 */

"use client";

import { useAuth } from "@clerk/nextjs";
import { logger } from "@/lib/logger";
import { useCallback, useEffect, useState } from "react";

// Get the VAPID public key from environment
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

// Convert base64 URL to Uint8Array (required for push subscription)
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export interface PushNotificationState {
  isSupported: boolean;
  permission: NotificationPermission | "loading";
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
}

export function usePushNotifications() {
  const { isSignedIn } = useAuth();
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    permission: "loading",
    isSubscribed: false,
    isLoading: true,
    error: null,
  });

  // Check if push notifications are supported
  const checkSupport = useCallback(() => {
    return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  }, []);

  // Register service worker
  const registerServiceWorker = useCallback(async () => {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
      });
      await navigator.serviceWorker.ready;
      return registration;
    } catch (error) {
      logger.error("Service worker registration failed:", error);
      return null;
    }
  }, []);

  // Check current subscription status
  const checkSubscription = useCallback(async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      return subscription !== null;
    } catch (error) {
      logger.error("Error checking subscription:", error);
      return false;
    }
  }, []);

  // Initialize push notification state
  useEffect(() => {
    async function init() {
      if (!checkSupport()) {
        setState((prev) => ({
          ...prev,
          isSupported: false,
          permission: "denied",
          isLoading: false,
        }));
        return;
      }

      const isSubscribed = await checkSubscription();

      setState({
        isSupported: true,
        permission: Notification.permission,
        isSubscribed,
        isLoading: false,
        error: null,
      });
    }

    void init();
  }, [checkSupport, checkSubscription]);

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!checkSupport()) {
      return "denied";
    }

    try {
      const permission = await Notification.requestPermission();
      setState((prev) => ({ ...prev, permission }));
      return permission;
    } catch (error) {
      logger.error("Error requesting permission:", error);
      return "denied";
    }
  }, [checkSupport]);

  // Subscribe to push notifications
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSignedIn) {
      setState((prev) => ({ ...prev, error: "Must be signed in to subscribe" }));
      return false;
    }

    if (!VAPID_PUBLIC_KEY) {
      setState((prev) => ({ ...prev, error: "Push notifications not configured" }));
      return false;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // Register service worker
      const registration = await registerServiceWorker();
      if (!registration) {
        throw new Error("Could not register service worker");
      }

      // Request permission if needed
      if (Notification.permission === "default") {
        const permission = await requestPermission();
        if (permission !== "granted") {
          throw new Error("Notification permission denied");
        }
      } else if (Notification.permission === "denied") {
        throw new Error("Notification permission denied");
      }

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as any,
      });

      // Send subscription to server
      const response = await fetch("/api/notifications/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          deviceInfo: {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save subscription to server");
      }

      setState((prev) => ({
        ...prev,
        isSubscribed: true,
        isLoading: false,
        error: null,
      }));

      return true;
    } catch (error: any) {
      logger.error("Error subscribing to push:", error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error.message || "Failed to subscribe",
      }));
      return false;
    }
  }, [isSignedIn, registerServiceWorker, requestPermission]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Unsubscribe from browser
        await subscription.unsubscribe();

        // Notify server
        await fetch("/api/notifications/push", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
      }

      setState((prev) => ({
        ...prev,
        isSubscribed: false,
        isLoading: false,
        error: null,
      }));

      return true;
    } catch (error: any) {
      logger.error("Error unsubscribing from push:", error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error.message || "Failed to unsubscribe",
      }));
      return false;
    }
  }, []);

  // Send a test notification
  const sendTestNotification = useCallback(async () => {
    if (Notification.permission !== "granted") {
      logger.warn("Notification permission not granted");
      return;
    }

    // Use service worker to show notification
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification("SkaiScrape Test", {
      body: "Push notifications are working! 🎉",
      icon: "/logo.svg",
      badge: "/logo.svg",
      tag: "test",
    });
  }, []);

  return {
    ...state,
    requestPermission,
    subscribe,
    unsubscribe,
    sendTestNotification,
  };
}
