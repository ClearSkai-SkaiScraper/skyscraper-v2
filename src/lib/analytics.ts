import { track } from "./track";

/**
 * Analytics utility for tracking business events
 */
export const analytics = {
  // Track successful paid actions
  paidActionSuccess: async (action: string, amount?: number) => {
    await track("paid_action_success", {
      props: { action, amount },
    });
  },

  // Track trial start events
  trialStart: async (planKey: string, trialDays: number = 3) => {
    await track("trial_start", {
      props: {
        plan: planKey,
        trial_days: trialDays,
        mode: "soft_launch",
      },
    });

    // Also send to GA4 if available
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", "trial_start", {
        trial_days: trialDays,
        plan: planKey,
        mode: "soft_launch",
      });
    }
  },

  // Track trial end events
  trialEnd: async (planKey: string, converted: boolean) => {
    await track("trial_end", {
      props: {
        plan: planKey,
        converted,
      },
    });

    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", "trial_end", {
        plan: planKey,
        converted,
      });
    }
  },

  // Track checkout initiated
  checkoutInitiated: async (planKey: string, amount: number) => {
    await track("checkout_initiated", {
      props: {
        plan: planKey,
        amount,
      },
    });

    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", "begin_checkout", {
        currency: "USD",
        value: amount,
        items: [
          {
            item_id: planKey,
            item_name: `SkaiScraper ${planKey} Plan`,
            category: "subscription",
            quantity: 1,
            price: amount,
          },
        ],
      });
    }
  },

  // Track subscription completed
  subscriptionCompleted: async (planKey: string, amount: number, sessionId: string) => {
    await track("subscription_completed", {
      props: {
        plan: planKey,
        amount,
        session_id: sessionId,
      },
    });

    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", "purchase", {
        transaction_id: sessionId,
        value: amount,
        currency: "USD",
        items: [
          {
            item_id: planKey,
            item_name: `SkaiScraper ${planKey} Plan`,
            category: "subscription",
            quantity: 1,
            price: amount,
          },
        ],
      });
    }
  },

  // Phase 3: AI Tools Tracking
  aiMockupRun: async (cost: number) => {
    await track("ai_mockup_run", { props: { cost } });
  },

  dolPullRun: async (address: string, cost: number) => {
    await track("dol_pull_run", { props: { address, cost } });
  },

  weatherReportRun: async (address: string, cost: number, detail: "basic" | "detailed") => {
    await track("weather_report_run", { props: { address, cost, detail } });
  },

  exportBuilt: async (jobId: string, exportType: "ZIP" | "PDF") => {
    await track("export_built", { props: { jobId, exportType } });
  },

  // Phase 3: Token Events
  tokenPurchased: async (packId: string, tokens: number, amount: number) => {
    await track("token_purchased", { props: { packId, tokens, amount } });
  },

  tokenConsumed: async (tool: string, cost: number, remainingBalance: number) => {
    await track("token_consumed", { props: { tool, cost, remainingBalance } });
  },

  tokenExhausted: async (attemptedTool: string) => {
    await track("token_exhausted", { props: { attemptedTool } });
  },

  // Phase 3: Wizard Events
  wizardStarted: async (wizardType: string) => {
    await track("wizard_started", { props: { wizardType } });
  },

  wizardStepCompleted: async (wizardType: string, step: number) => {
    await track("wizard_step_completed", { props: { wizardType, step } });
  },

  wizardSubmitted: async (wizardType: string, totalSteps: number) => {
    await track("wizard_submitted", { props: { wizardType, totalSteps } });
  },

  // Phase 3: Banner Events
  bannerClicked: async (cta: "trial" | "demo") => {
    await track("banner_clicked", { props: { cta } });
  },

  bannerDismissed: async () => {
    await track("banner_dismissed", {});
  },

  // Phase 3: Assistant Events
  assistantOpened: async (mode: string, trigger?: string) => {
    await track("assistant_opened", { props: { mode, trigger } });
  },

  assistantModeChanged: async (oldMode: string, newMode: string) => {
    await track("assistant_mode_changed", { props: { oldMode, newMode } });
  },

  assistantSuggestionClicked: async (suggestion: string) => {
    await track("assistant_suggestion_clicked", { props: { suggestion } });
  },

  // Phase 3: Checkout Error Handling
  checkoutFailed: async (error: string, planKey?: string) => {
    await track("checkout_failed", { props: { error, planKey } });
  },

  // Phase 3 Sprint 3: Proposal Events
  proposalBuildStarted: async (packetType: "retail" | "claims", leadId: string, jobId: string) => {
    await track("proposal_build_started", {
      props: { packetType, leadId, jobId },
    });
  },

  proposalBuildSucceeded: async (
    draftId: string,
    packetType: "retail" | "claims",
    tokensConsumed: number
  ) => {
    await track("proposal_build_succeeded", {
      props: { draftId, packetType, tokensConsumed },
    });
  },

  proposalRendered: async (
    proposalId: string,
    packetType: "retail" | "claims",
    fileSize: number,
    pages: number
  ) => {
    await track("proposal_rendered", {
      props: { proposalId, packetType, fileSize, pages },
    });
  },

  proposalPublished: async (proposalId: string, packetType: "retail" | "claims") => {
    await track("proposal_published", { props: { proposalId, packetType } });
  },
};

// Add gtag types to window
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    gtag?: (command: string, targetId: string, config?: Record<string, any>) => void;
  }
}
