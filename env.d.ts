// env.d.ts
declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_APP_URL: string;
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: string;
    STRIPE_SECRET_KEY: string;
    STRIPE_WEBHOOK_SECRET: string;
    STRIPE_PRICE_ID: string; // Seat-based: the single $80/seat price (price_1T0oOREmf7hVRjVVCdV7CRzU)
    DATABASE_URL: string;
    DIRECT_DATABASE_URL?: string; // Direct DB URL for migrations (bypasses PgBouncer)
    REDIS_URL: string; // Phase 6: Upstash Redis for BullMQ
    CLERK_SECRET_KEY: string;
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: string;

    // Twilio SMS
    TWILIO_ACCOUNT_SID?: string;
    TWILIO_AUTH_TOKEN?: string;
    TWILIO_PHONE_NUMBER?: string;
    TWILIO_MESSAGING_SERVICE_SID?: string;
  }
}

export {};
