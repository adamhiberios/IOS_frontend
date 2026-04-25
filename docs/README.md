# Institute of Scrum — LMS Frontend Documentation

This directory contains the **frontend engineering foundation** for the Institute of Scrum (IOS) Learning Management System. All decisions here have been reviewed and signed off before development begins, and these documents are the single source of truth for how the Angular application is structured, built, and maintained.

> **Project**: Design, Development, Deployment, and Support of the Institute of Scrum Learning Management System
> **Scope**: Frontend Engineering (Angular + Tailwind CSS)
> **Reference**: SOW v1.0 — Oct 27, 2025

---

## Documents

| #   | Document                                                                 | Audience          | Purpose                                                                 |
| --- | ------------------------------------------------------------------------ | ----------------- | ----------------------------------------------------------------------- |
| 00  | [Executive Overview](./00-executive-overview.md)                         | **Non-technical** | Plain-language summary for leadership — what we're building, security & safety posture, timeline, and risks. |
| 01  | [Project Structure & Architecture](./01-project-structure-architecture.md) | Engineering       | Workspace layout, module boundaries, routing, and environment configuration. |
| 02  | [Component Design & Reusability](./02-component-design-reusability.md)   | Engineering       | Custom component library on Tailwind, taxonomy, patterns, RTL handling. |
| 03  | [State Management Approach](./03-state-management.md)                    | Engineering       | Signals + Services strategy and patterns for every category of state.   |
| 04  | [API Integration & Data Flow](./04-api-integration-data-flow.md)         | Engineering       | HttpClient, interceptors, DTO mapping, WebSockets, error handling.      |
| 05  | [Engineering Guidelines](./05-engineering-guidelines.md)                 | Engineering       | Coding standards, naming, Git workflow, code review, and PR checklist.  |
| 06  | [Performance, Security & Accessibility](./06-performance-security-accessibility.md) | Engineering       | Budgets, WCAG 2.1 AA, OWASP Top-10 posture, RTL/i18n, Core Web Vitals.  |
| 08  | [Authentication & Authorization](./08-authentication-authorization.md)   | Engineering       | JWT model, refresh-race handling, RBAC matrix, idle timeout, threat model. |
| 09  | [Exam Engine Architecture](./09-exam-engine.md)                          | Engineering       | Lifecycle, IndexedDB schema, 30-second heartbeat, sync queue, optional encryption, 60-second disconnection scenario. |

> Document 07 is reserved for the Figma design review (in progress). Numbering is preserved so authentication and the exam engine keep their own dedicated slots.

---

## Decisions Summary

| Area                    | Decision                                                                                       |
| ----------------------- | ---------------------------------------------------------------------------------------------- |
| Framework               | **Angular 19** (latest stable), Standalone components, Signals, **CSR only** (no SSR)          |
| Styling                 | **Tailwind CSS** only, with a **custom in-house component library** (no Material / PrimeNG)    |
| State management        | **Signals + injectable services** (no NgRx)                                                    |
| Project structure       | **Single Angular app**, **feature-based** folders                                              |
| Internationalization    | **English + Arabic** with **full RTL** support from day one                                    |
| Authentication          | **JWT** (access in-memory + refresh in httpOnly cookie) with **RBAC** enforced via guards/directives — see [08](./08-authentication-authorization.md) |
| API integration         | **Hybrid**: REST for CRUD, **WebSockets** for real-time (notifications, exam proctoring)       |
| Exam continuity         | **Offline-first** answers in IndexedDB, **30-second** WS heartbeat, idempotent sync queue, optional AES-GCM encryption — see [09](./09-exam-engine.md) |
| Testing                 | **Deferred** (noted as contractual follow-up risk — SOW §6.2.14)                               |
| Accessibility           | **WCAG 2.1 AA**                                                                                |
| Browser support         | Latest **2 versions** of Chrome, Edge, Safari, Firefox, plus **mobile** Chrome/Safari          |
| Performance target      | **Initial load (FCP/LCP) ≤ 3 s** via lazy loading + code splitting, **99.9 %** uptime (SOW §8) |
| Environments            | **DEV / TEST / UAT / PROD** with CDN and feature flags                                         |

---

## How to Use This Documentation

1. **Before writing any code**, read documents 01–06 in order. They build on each other.
2. For auth-touching work, read [08 — Authentication & Authorization](./08-authentication-authorization.md) before opening a PR.
3. For exam-engine work, read [09 — Exam Engine Architecture](./09-exam-engine.md) — it is the single source of truth.
4. Every PR must comply with the rules in [Engineering Guidelines](./05-engineering-guidelines.md) and the checklist in [Performance, Security & Accessibility](./06-performance-security-accessibility.md).
5. Proposed deviations from these documents must be submitted as a Change Request (per SOW §16) and, if approved, reflected here via PR.

---

## Known Risks & Follow-ups

- **Testing deferred.** SOW §6.2.14 requires QA deliverables. The project is scaffolded to be fully testable; a test strategy document should be added as soon as the team re-engages QA. Tracked as a follow-up task.
- **SSR not selected.** Public course pages will rely on CSR + meta tag hydration via Angular `Meta`/`Title` services. If SEO for course discovery becomes a priority, revisit Angular SSR (`@angular/ssr`) as a Change Request.
- **Arabic/RTL from day one.** All components are built RTL-first (logical properties, `rtl:` Tailwind variants). Any third-party component must be audited for RTL support before adoption.
