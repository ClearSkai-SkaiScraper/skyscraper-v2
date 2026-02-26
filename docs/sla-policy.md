# 📞 SLA Policy — SkaiScraper Support

> **Effective:** March 2026
> **Applies to:** All paying customers on Solo, Business, and Enterprise plans

---

## 🎯 Service Level Targets

| Severity          | Definition                          | First Response | Resolution Target |
| ----------------- | ----------------------------------- | -------------- | ----------------- |
| **P0 — Critical** | App is down or data loss occurring  | ≤ 1 hour       | ≤ 4 hours         |
| **P1 — High**     | Major feature broken, no workaround | ≤ 4 hours      | ≤ 24 hours        |
| **P2 — Medium**   | Feature impaired, workaround exists | ≤ 24 hours     | ≤ 3 business days |
| **P3 — Low**      | Minor issue, cosmetic, enhancement  | ≤ 48 hours     | Best effort       |

---

## 📋 Severity Definitions

### P0 — Critical

- Application is completely inaccessible
- Data loss or corruption detected
- Authentication system failure (no one can log in)
- Billing system processing incorrect charges
- Security vulnerability actively being exploited

### P1 — High

- Key workflow is broken (e.g., cannot create claims, cannot generate reports)
- File uploads failing for all users
- AI features returning errors consistently
- Performance degradation >10x normal response times

### P2 — Medium

- Feature works but produces incorrect results
- UI elements misaligned or hard to use
- Export/import partially failing
- Intermittent errors (< 5% of requests)

### P3 — Low

- Cosmetic issues (typos, alignment, colors)
- Feature requests
- Documentation improvements
- Performance optimization suggestions

---

## 📬 Support Channels

| Channel                       | Response Time    | Availability    |
| ----------------------------- | ---------------- | --------------- |
| In-app bug report             | Per SLA above    | 24/7 submission |
| Email: support@skaiscrape.com | Per SLA above    | 24/7 submission |
| Slack (Enterprise)            | ≤ 1 hour (P0/P1) | Business hours  |

---

## 📊 Escalation Path

1. **Automated triage** — Bug reports auto-categorized by severity
2. **Engineering on-call** — P0/P1 page immediately
3. **Engineering lead** — Escalation after 1 hour if P0 unresolved
4. **CEO notification** — P0 incidents exceeding 4 hours

---

## 🎯 Uptime Commitment

| Metric                     | Target                            |
| -------------------------- | --------------------------------- |
| Monthly uptime             | 99.9% (≤ 43.8 min downtime/month) |
| Planned maintenance window | Sundays 2-4am UTC                 |
| Maintenance notification   | 48 hours advance notice           |

---

## 📈 Reporting

- Monthly SLA compliance report shared with Enterprise customers
- Incident post-mortems published within 5 business days of P0 events
- Quarterly review of SLA targets and support metrics

---

_This SLA policy is a living document. Review and update quarterly._
