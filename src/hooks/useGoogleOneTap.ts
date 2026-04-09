import { useEffect } from "react";

import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

interface UseGoogleOneTapOptions {
  clientId: string;
  disabled?: boolean;
}

export function useGoogleOneTap({ clientId, disabled }: UseGoogleOneTapOptions) {
  useEffect(() => {
    if (disabled || !clientId) return;

    // Inject Google Sign-In script once
    const scriptId = "google-gsi";
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    // Initialize when Google Sign-In library is available
    let cancelled = false;
    const checkInterval = setInterval(() => {
      // @ts-ignore - Google Sign-In global
      const google = window.google?.accounts?.id;
      if (!google || cancelled) return;

      clearInterval(checkInterval);

      // Initialize Google One Tap
      // @ts-ignore
      window.google.accounts.id.initialize({
        clientId: clientId,
        callback: async (response: any) => {
          try {
            const token = response?.credential;
            if (!token) return;

            // Sign in with Google ID token
            const { error } = await supabase.auth.signInWithIdToken({
              provider: "google",
              token,
            });

            if (error) {
              logger.error("Google One Tap sign-in error:", error);
              return;
            }

            // Redirect to callback to handle onboarding/dashboard routing
            window.location.href = "/auth/callback";
          } catch (error) {
            logger.error("Google One Tap error:", error);
          }
        },
        auto_select: true,
        cancel_on_tap_outside: false,
        context: "signin",
      });

      // Show the One Tap prompt
      // @ts-ignore
      window.google.accounts.id.prompt();
    }, 100);

    return () => {
      cancelled = true;
      clearInterval(checkInterval);
    };
  }, [clientId, disabled]);
}
