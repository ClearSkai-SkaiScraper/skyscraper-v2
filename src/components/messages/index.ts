/**
 * Messages component barrel export (Sprint 6 — Messages Consolidation)
 *
 * Canonical shared components for all messaging surfaces:
 *   - /messages         (team + carrier)
 *   - /trades/messages  (trades + connected clients)
 *   - /portal/messages  (homeowner portal)
 *   - /claims/[id]/messages (per-claim thread)
 */

// ── Core UI primitives ──────────────────────────────────────────────
export { ConversationList } from "./ConversationList";
export { MessageComposer } from "./MessageComposer";
export { default as MessageInput } from "./MessageInput";
export { MessageThread } from "./MessageThread";
export { default as MessageThreadList } from "./MessageThreadList";
export { default as MessageView } from "./MessageView";

// ── Modals ──────────────────────────────────────────────────────────
export { default as NewClientMessageModal } from "./NewClientMessageModal";
export { default as NewMessageModal } from "./NewMessageModal";

// ── Composite wrapper ───────────────────────────────────────────────
export { default as MessageHub } from "./MessageHub";
