/**
 * 🔐 IDENTITY MODULE
 *
 * Unified exports for user identity system.
 *
 * Server-side:
 *   import { getUserIdentity, loadProContext, loadClientContext } from "@/lib/identity";
 *
 * Client-side:
 *   import { useUserIdentity, useIsPro, useIsClient, useAuthWithIdentity } from "@/lib/identity";
 */

// Server-side identity functions
export {
  determineUserType,
  getCurrentUserIdentity,
  getUserIdentity,
  isCurrentUserClient,
  isCurrentUserPro,
  loadClientContext,
  loadProContext,
  registerUser,
  updateLastSeen,
} from "./userIdentity";

// Types
export type { ClientContext, ProContext, UserIdentity, UserType } from "./userIdentity";

// Client-side React context
export {
  useIsClient,
  useIsPro,
  type UserIdentityClient,
  type UserIdentityContextValue,
  UserIdentityProvider,
  useUserIdentity,
  useUserType,
} from "./UserIdentityContext";

// Combined auth + identity hook
export {
  type AuthWithIdentity,
  useAuthReady,
  useAuthWithIdentity,
  useRequireClient,
  useRequirePro,
} from "./useAuthWithIdentity";

// Routing helpers
export { requireClientAccess, requireProAccess, routeToDashboard } from "./routing";

// Client-side route guards
export { AuthenticatedGuard, ClientOnlyGuard, IdentitySwitch, ProOnlyGuard } from "./RouteGuards";

// Middleware helpers
export {
  DASHBOARD_ROUTES,
  getDashboardUrl,
  isClientRoute,
  isProRoute,
  isSharedRoute,
} from "./middleware";
