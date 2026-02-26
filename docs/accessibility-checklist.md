# ♿ Accessibility & ADA Compliance Checklist

> **Standard:** WCAG 2.1 Level AA
> **Last Audit:** Sprint 22 — February 2026
> **Review Cadence:** Monthly QA cycle

---

## 🔍 Keyboard Navigation

- [x] **Skip-to-content link** — `SkipToContent` component renders before all content
- [x] **Focus trap for modals** — `useFocusTrap` hook active on all Dialog/Sheet components
- [x] **Tab order** — All interactive elements reachable via Tab key
- [x] **Arrow key navigation** — `useKeyboardNavigation` hook for lists/menus
- [ ] **Focus visible indicators** — Verify `:focus-visible` ring on all interactive elements
- [ ] **No keyboard traps** — Verify Escape key closes all modals/drawers
- [x] **Ctrl+Enter / Cmd+Enter** — Submit shortcuts on forms (claims, trades, messages)

---

## 🏷️ ARIA Labels & Roles

- [x] **Live announcer** — `announce()` function for dynamic content updates
- [x] **aria-busy** — Loading states use `getLoadingAriaProps()`
- [x] **aria-label** — All icon-only buttons have aria-label
- [ ] **aria-describedby** — Form fields with validation errors
- [ ] **role="alert"** — Error messages announced to screen readers
- [ ] **role="navigation"** — Sidebar and header nav landmarks
- [ ] **role="main"** — Main content area landmark
- [x] **aria-live="polite"** — Toast notifications via sonner (built-in)

---

## 🎨 Color & Contrast

- [ ] **4.5:1 contrast ratio** — All text on gradient backgrounds
- [ ] **3:1 contrast ratio** — All large text (18px+) and UI components
- [ ] **Non-color indicators** — Status not conveyed by color alone (use icons + text)
- [ ] **Dark mode contrast** — Verify all components in dark mode
- [x] **Gradient text** — White text on blue/indigo gradients (claims header, etc.)

---

## 🖼️ Images & Media

- [x] **Alt text** — `OptimizedImage` component requires alt prop
- [ ] **Decorative images** — Use `alt=""` for non-informational images
- [ ] **SVG accessibility** — All SVGs have title or aria-label
- [ ] **Icon meaning** — Icons accompanied by text or aria-label

---

## ⚡ Motion & Animation

- [x] **Reduced motion support** — `useReducedMotion()` hook available
- [x] **MotionSection** — Uses Framer Motion with reduced motion detection
- [ ] **Animated transitions** — Verify `prefers-reduced-motion: reduce` disables animations
- [ ] **No auto-play** — No auto-playing media or animations
- [ ] **Carousel controls** — Pause/stop available on any auto-rotating content

---

## 📱 Responsive & Touch

- [ ] **Touch targets** — All interactive elements ≥ 44x44px
- [ ] **Zoom support** — Page functional at 200% zoom
- [ ] **Pinch zoom** — Not disabled via viewport meta
- [ ] **Orientation** — Works in both portrait and landscape
- [x] **Responsive layout** — Tailwind responsive classes throughout

---

## 📝 Forms & Input

- [x] **Form labels** — All form inputs have associated labels (shadcn/ui Form)
- [ ] **Error identification** — Errors described in text, not just color
- [x] **Required fields** — Zod validation on 80+ API routes
- [ ] **Autocomplete** — Correct `autocomplete` attributes on address/payment forms
- [x] **Input sanitization** — `inputSanitization.ts` — max-length, type validation
- [ ] **Input instructions** — Placeholder text + help text for complex fields

---

## 🔊 Screen Reader Testing

- [ ] **VoiceOver (macOS)** — Full workflow test: login → claim → report
- [ ] **NVDA (Windows)** — Same workflow verification
- [ ] **Page title** — Each page has descriptive `<title>` via Next.js metadata
- [ ] **Heading hierarchy** — `h1` → `h2` → `h3` in correct order (no skipped levels)
- [ ] **Link text** — All links have descriptive text (no "click here")

---

## 📋 Compliance Documentation

- [x] **Privacy policy** — Available at `/legal/privacy`
- [x] **Terms of service** — Available at `/legal/terms`
- [x] **Legal acceptance gate** — Users must accept before using app
- [ ] **Cookie disclosure** — Banner for analytics tracking consent
- [ ] **Data retention policy** — Documented and enforced
- [x] **PII masking** — `piiMask.ts` strips sensitive data from logs
- [x] **Error sanitization** — 127+ routes sanitized (no PII in error responses)

---

## 🧰 Testing Tools

| Tool                    | Purpose                       | Status         |
| ----------------------- | ----------------------------- | -------------- |
| axe DevTools            | Automated accessibility audit | ⬜ Run         |
| Lighthouse              | Accessibility score           | ⬜ Score ≥90   |
| VoiceOver               | macOS screen reader           | ⬜ Manual test |
| Keyboard-only           | Navigate without mouse        | ⬜ Manual test |
| WAVE                    | Web accessibility evaluation  | ⬜ Run         |
| Color contrast analyzer | Verify contrast ratios        | ⬜ Run         |

---

## 📊 Audit Results

| Audit | Date | Score | Issues Found | Issues Fixed |
| ----- | ---- | ----- | ------------ | ------------ |
| —     | —    | —     | —            | —            |

---

_Run accessibility audit after every sprint. Update this checklist with findings._
