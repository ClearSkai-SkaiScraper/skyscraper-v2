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
export { default as MessageInput } from "./MessageInput";
export { default as MessageView } from "./MessageView";
export { default as MessageThreadList } from "./MessageThreadList";
export { MessageThread } from "./MessageThread";
export { MessageComposer } from "./MessageComposer";
export { ConversationList } from "./ConversationList";

// ── Modals ──────────────────────────────────────────────────────────
export { default as NewMessageModal } from "./NewMessageModal";
export { default as NewClientMessageModal } from "./NewClientMessageModal";

// ── Composite wrapper ───────────────────────────────────────────────
export { default as MessageHub } from "./MessageHub";
