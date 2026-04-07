import { useEffect, useState } from "react";

import { useGoogleOneTap } from "@/hooks/useGoogleOneTap";
import { supabase } from "@/integrations/supabase/client";

/**
 * GoogleOneTap - Invisible component that shows Google One Tap sign-in prompt
 *
 * Requires NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID environment variable to be set.
 * Only shows when user is not authenticated.
 */
export default function GoogleOneTap() {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID as string;
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if user is already authenticated
    void supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Only show One Tap when not authenticated and client ID is configured
  const disabled = isAuthenticated || !clientId;

  useGoogleOneTap({ clientId, disabled });

  return null; // This component renders nothing
}
