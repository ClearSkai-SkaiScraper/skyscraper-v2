"use client";

import React from "react";

import { AssistantProvider } from "@/components/assistant/AssistantProvider";
import { AutoInitWrapper } from "@/components/AutoInitWrapper";
import BrandingProvider from "@/components/BrandingProvider";
import { LegalGate } from "@/components/legal/LegalGate";
import { RemoteViewProvider } from "@/components/remote-view/RemoteViewContext";
import { RouteGroupProvider } from "@/components/RouteGroupProvider";
import { TaskSlideOverProvider } from "@/components/tasks/TaskSlideOverContext";
import { TokenGateProvider } from "@/components/TokenGate";
import { usePresenceHeartbeat } from "@/hooks/usePresenceHeartbeat";
import { PHProvider } from "@/lib/analytics.tsx";
import { UserIdentityProvider } from "@/lib/identity/UserIdentityContext";
import { PermissionsProvider } from "@/lib/permissions/client";

export function AppProviders({
  children,
  orgId,
  pendingLegal = [],
}: {
  children: React.ReactNode;
  orgId: string;
  pendingLegal?: any[];
}) {
  // Fire presence heartbeat on every page load + every 2 minutes
  usePresenceHeartbeat();

  return (
    <RouteGroupProvider group="app">
      <PHProvider>
        <AutoInitWrapper>
          {/* 🔐 UserIdentityProvider: Exposes isClient/isPro globally */}
          <UserIdentityProvider>
            <PermissionsProvider>
              <RemoteViewProvider>
                <TokenGateProvider orgId={orgId}>
                  <BrandingProvider>
                    <AssistantProvider>
                      <TaskSlideOverProvider>
                        <LegalGate initialPending={pendingLegal}>{children}</LegalGate>
                      </TaskSlideOverProvider>
                    </AssistantProvider>
                  </BrandingProvider>
                </TokenGateProvider>
              </RemoteViewProvider>
            </PermissionsProvider>
          </UserIdentityProvider>
        </AutoInitWrapper>
      </PHProvider>
    </RouteGroupProvider>
  );
}
