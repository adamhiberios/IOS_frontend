# Executive Overview — Institute of Scrum Learning Management System (LMS)

**Audience:** Leadership, Project Sponsors, Non-Technical Stakeholders
**Project:** Institute of Scrum (IOS) Learning Management System
**Scope covered here:** Frontend engineering (the part of the system our learners, instructors, and admins see and use)
**Reference:** SOW v1.0 — Oct 27, 2025

---

## 1. At a Glance

We are building the web application that learners, instructors, and administrators will use to run the certification program end-to-end — from discovering a course, through enrolling, studying, sitting exams, earning certificates, and renewing them.

The frontend is built with proven, modern technology (**Angular** and **Tailwind CSS**) and is designed to be:

- **Fast** — pages load in **under 3 seconds**.
- **Secure** — meets international standards (OWASP Top-10, TLS 1.3, GDPR, PIPEDA).
- **Accessible** — usable by people with disabilities (WCAG 2.1 AA).
- **Bilingual** — fully supports **English and Arabic**, including right-to-left layout.
- **Reliable** — targeted for **99.9% uptime** (roughly 8 hours 45 minutes of downtime per year maximum).

Everything we do aligns with the Statement of Work signed between Institute of Scrum and the vendor.

---

## 2. What We Are Building

A single, modern web application with three primary user experiences:

| Who             | What they do                                                                              |
| --------------- | ----------------------------------------------------------------------------------------- |
| **Learners**    | Browse courses, enroll, study materials, take quizzes and mock exams, earn certifications, renew them, and receive updates from Institute of Scrum. |
| **Instructors** | Create and manage course content, grade assessments, and monitor learner progress.        |
| **Admins**      | Manage users, courses, certifications, notifications, and read analytics dashboards.      |

All three experiences are part of the same system, but people only see what their role lets them see.

---

## 3. Our Approach in Plain Terms

Think of the LMS as a building:

- **The foundation** is the technology stack and project structure — solid, consistent, and designed to hold up years of growth.
- **The walls and rooms** are the individual pages — course lists, exam pages, dashboards — each built from the same library of reusable "Lego blocks" so the whole building looks and feels consistent.
- **The doors and locks** are the security measures — login, permissions, and protective barriers around sensitive data.
- **The hallways and ramps** are accessibility — making sure every learner, including those using screen readers or keyboards only, can navigate freely.
- **The maintenance plan** is our engineering guidelines — how we keep the building clean, repairable, and ready for the next expansion.

The six technical documents in this folder describe each of these layers in detail. This overview is the "building plans" for leadership.

---

## 4. Security & Safety — The Core Commitments

Security is not an afterthought — it is a design principle running through every decision. Here is how learners, Institute of Scrum, and the business are protected.

### 4.1 Protecting accounts (how we handle login)

- Every user signs in over an **encrypted connection** (HTTPS / TLS 1.3). No password ever travels across the internet in plain text.
- Passwords are never stored or seen by the frontend — they are sent directly to the backend, which stores them in hashed form.
- After login, the system uses two short-lived "digital keys" (access and refresh tokens). The keys expire automatically; if a device is lost, access ends within minutes, not days.
- Sensitive keys are **never stored in the browser's local storage** — a technique that protects against a large class of web attacks.
- If a user is inactive for a period of time, the session automatically ends with a visible warning, preventing abandoned logged-in sessions on shared computers.

### 4.2 Protecting data (in transit and at rest)

- **Every request** between the browser and the servers is encrypted end-to-end.
- **Cross-origin protection** and strict browser security policies (Content Security Policy, HSTS, SameSite cookies) stop common browser-level attacks such as cross-site scripting and cross-site request forgery.
- The backend — not the browser — is the single source of truth for what a user is allowed to do. The frontend only uses roles to show or hide buttons; it never makes security decisions on its own.

### 4.3 Protecting privacy (GDPR & PIPEDA compliance)

The SOW requires compliance with both **PIPEDA** (Canadian privacy law) and **GDPR** (European privacy regulation). In practice, this means:

- **Minimal data collection** — we only ask for the data a screen actually needs.
- **No tracking before consent** — analytics and marketing cookies are loaded only after the user accepts a visible cookie banner.
- **Right to access and delete** — users can export their data and request account deletion from their profile page.
- **No PII in logs** — error reports and analytics never contain names, emails, or personal identifiers.
- **Professional translation only** — Arabic content is reviewed by a qualified human translator, not machine-translated, to prevent misleading privacy notices.

### 4.4 Protecting learners (exam integrity & fair play)

The LMS hosts high-stakes assessments (mock exams, certification exams). The frontend supports integrity features such as:

- A server-side exam clock that cannot be manipulated by the browser.
- Real-time proctoring signals (e.g., tab-switch detection) sent to the backend over a secure live channel.
- Server-authoritative scoring — the frontend only displays results; it never calculates them.
- Automatic submission when time expires, with no way for the learner to bypass it client-side.

### 4.5 Protecting the system (resilience & recovery)

- **99.9% uptime target** per SOW §8. Achieved through CDN distribution (so assets are served near the user), graceful handling of network failures, and automatic retry of transient errors.
- **Graceful degradation** — if a live channel (e.g., notifications) is temporarily unavailable, the system falls back to regular polling so the user experience is not blocked.
- **Error transparency** — when something does fail, the user sees a clear message (not a blank page) and a retry option; the technical details are sent to the monitoring system for our team to investigate.

### 4.6 Protecting the code supply chain

- Every third-party library we use is reviewed before adoption. Unknown, unmaintained, or license-incompatible libraries are rejected.
- Automated security scanners run on every change; high-severity vulnerabilities block merging until fixed.
- No code is deployed without passing review by another engineer — and sensitive areas (login, payments, permissions) require architect-level review.

---

## 5. Accessibility & Inclusion

The SOW requires **WCAG 2.1 Level AA** — an international standard for web accessibility. This is not just a compliance box: it means real learners with visual, motor, cognitive, or hearing disabilities can use the LMS effectively.

In concrete terms:

- Every interactive element can be used with a keyboard alone.
- Screen readers announce the content correctly in English and Arabic.
- Color contrast meets the required ratios so text is readable by people with low vision.
- Text resizes up to 200% without breaking the layout.
- Video content supports captions; the player exposes transcripts where available.
- Color is never the only way information is conveyed (critical for color-blind users).

Every change to the user interface is reviewed for accessibility before it ships. Automated tools catch many issues; manual keyboard and screen-reader checks catch the rest.

---

## 6. Bilingual Experience (English + Arabic)

Arabic support was decided on day one — not retrofitted. This is important: retrofitting right-to-left (RTL) layout into a ready-made product is one of the most common and expensive rework items in software. Our approach avoids this entirely.

- Both languages are first-class. Learners can switch languages at any time.
- Right-to-left layout is handled by the UI framework, not page by page.
- Directional icons (arrows, chevrons) mirror correctly in Arabic.
- Arabic translations will be produced by professional human translators before each release.
- The Arabic user interface is tested alongside English in every review cycle.

---

## 7. Reliability & Performance Commitments

These are the measurable commitments our frontend work is held against:

| Commitment                                          | Target          | Source                 |
| --------------------------------------------------- | --------------- | ---------------------- |
| Page load time (median, mobile on 4G)               | ≤ 3 seconds    | SOW §8                 |
| System uptime                                       | ≥ 99.9%        | SOW §8                 |
| Concurrent users supported                          | ≥ 1,000        | SOW §6.2.16            |
| Accessibility level                                 | WCAG 2.1 AA    | SOW §8                 |
| Browser coverage                                    | Latest 2 versions of Chrome, Edge, Safari, Firefox, plus mobile Safari and Chrome | Agreed |
| Critical/high-severity defect turnaround (warranty) | ≤ 48 hours     | SOW §13                |
| Warranty period                                     | 180 days post-launch | SOW §13           |

---

## 8. Quality Control — How We Catch Mistakes Early

Quality is built in, not bolted on. Every change to the code goes through:

1. **Automated formatting and linting** — every line of code is automatically checked for style and common mistakes before it can be committed.
2. **Peer review** — another engineer reviews every change for correctness, readability, accessibility, and performance.
3. **Architect review** for sensitive areas — login, permissions, infrastructure, and shared components are reviewed at a higher level.
4. **Visual verification** — changes to the user interface require screenshots in both English and Arabic so reviewers can confirm the design works in both languages.
5. **Performance budgets** — if a change makes the app meaningfully slower or larger, the automated system blocks it.
6. **Bi-weekly steering reviews** with Institute of Scrum, per SOW §9.

**A note on automated testing:** The current decision is to defer writing an automated test suite until later in the project to move faster in early development. The code is structured so that tests can be added later without rework. This is tracked as an open risk in this overview (§11) and in the technical documents, and the vendor retains the SOW §6.2.14 QA responsibility regardless.

---

## 9. Timeline & Milestones (from SOW §10)

The project runs in three phases. Frontend engineering contributes to all three.

| Phase                               | What happens                                                          ||
| ----------------------------------- | --------------------------------------------------------------------- | ----------------- |
| **Phase 1 — Planning & Design**     | Requirements, architecture, UI/UX, security plan, project plan. The documents in this `/docs` folder are part of this phase. ||
| **Phase 2 — Development & Testing** | Build the system (including all frontend screens), test it, conduct UAT. ||
| **Phase 3 — Deployment & Support**  | Go-live, training, documentation handover, warranty support (180 days), IP transfer. ||

---

## 10. What Institute of Scrum Will See Along the Way

Between planning and go-live, Institute of Scrum stakeholders will:

- Receive the technical design documents (these are already available) for review.
- Approve the UI/UX prototypes before development begins on each screen.
- See new functionality at **bi-weekly sprint reviews** (SOW §9).
- Participate in **User Acceptance Testing (UAT)** — the formal sign-off that the system does what Institute of Scrum asked for.
- Receive admin and user manuals, plus training sessions, before go-live (SOW §6.3.3 and §6.3.4).

Any scope change (new feature, different design, deadline change) goes through a written **Change Request** process per SOW §16 — no verbal changes are binding.

---

## 11. Risks — What We Are Watching, and How We Are Handling Them

| Risk                                                    | How we mitigate                                                                                    | Current status  |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | --------------- |
| **Automated testing deferred.** Fewer tests up front could slow bug detection later. | Code is written in a test-ready structure. We plan to re-introduce a test suite before go-live to meet SOW §6.2.14. We flag this to Institute of Scrum for awareness. | **Open — tracked** |
| **Arabic translation quality.** Poor translations harm trust and compliance.        | Only professional human translators will localize user-facing content before release.                                  | Mitigated by process |
| **Content volume unknown.** Large course content may affect performance and migration schedule.    | Content migration plan is part of Phase 1 (SOW §6.1.13). Performance budgets cap new asset weight. | Monitored        |
| **Public course pages and SEO.** We chose not to use Server-Side Rendering (SSR). This could limit search-engine visibility for course discovery. | Meta tags and structured data are set per page. If SEO becomes critical, SSR can be added later as a Change Request.                                | Acceptable tradeoff, reviewable |
| **Third-party outages** (payment, email, analytics).    | Graceful fallbacks; retries with backoff; clear user messaging. Critical flows do not depend on third-parties being available. | Designed in     |
| **Security threat landscape evolves.**                  | Automated dependency scans, regular patch updates, security audit (SOW §6.2.15), and a planned 180-day warranty to address issues found post-launch. | Continuous      |

---

## 12. Decisions Already Made (Summary)

The technical team and Institute of Scrum have aligned on the following foundation. These are captured in detail in the accompanying technical documents.

| Topic                 | Decision                                                                         |
| --------------------- | -------------------------------------------------------------------------------- |
| Web framework         | Angular (latest stable version)                                                  |
| Styling               | Tailwind CSS with a custom in-house component library                            |
| State management      | Lightweight Angular Signals + services (no heavyweight framework)                |
| Application structure | Single web application, organized by feature                                     |
| Languages             | English and Arabic, with full right-to-left support                              |
| Authentication        | Industry-standard JWT tokens with short expiry and secure refresh                |
| Live updates          | Secure WebSocket channels for notifications and exam events                      |
| Accessibility         | WCAG 2.1 Level AA                                                                |
| Browsers              | Latest two versions of Chrome, Edge, Safari, Firefox, plus mobile Safari/Chrome  |
| Performance           | Under 3 seconds page load, 99.9% uptime                                          |
| Environments          | Four environments: Development, Test, UAT, and Production                        |

---

## 13. What We Need from Leadership

To keep the project on schedule, we need the following from Institute of Scrum / leadership:

1. **Approval of this document** (or feedback) so engineering can proceed with confidence.
2. **Timely sign-off** on UI/UX prototypes as they are delivered — within the five business days defined in SOW §7.
3. **Access to subject-matter experts** for content, branding, and domain questions (SOW §5.1).
4. **A nominated Institute of Scrum contact** for bi-weekly steering meetings and change requests.
5. **Confirmation** of target launch date and of any regulatory reviews required before go-live (e.g., internal privacy review for PIPEDA/GDPR statements).

---

## 14. Short Glossary

| Term                   | Plain-language meaning                                                                    |
| ---------------------- | ----------------------------------------------------------------------------------------- |
| **Frontend**           | The part of the system users interact with in their browser — screens, buttons, forms.    |
| **Backend**            | The part of the system that runs on servers — databases, business logic, authentication. |
| **LMS**                | Learning Management System — the software that delivers courses and certifications.      |
| **Angular**            | A widely used, enterprise-grade web framework maintained by Google.                       |
| **Tailwind CSS**       | A styling toolkit that makes it fast to build consistent, modern interfaces.             |
| **JWT**                | A secure "digital key" used to prove a user is logged in after initial authentication.   |
| **RBAC**               | Role-Based Access Control — determining what users can do based on their role.            |
| **WCAG 2.1 AA**        | The international standard for accessible websites (level AA is the mid-tier).           |
| **GDPR / PIPEDA**      | European / Canadian privacy laws that protect personal data.                             |
| **OWASP Top-10**       | The industry's canonical list of the most critical web security risks.                   |
| **TLS 1.3**            | The modern standard for encrypting communication between browsers and servers.           |
| **WebSocket**          | A live communication channel between browser and server, used for notifications/exams.  |
| **CDN**                | Content Delivery Network — serves files from locations close to the user for speed.      |
| **UAT**                | User Acceptance Testing — Institute of Scrum's formal sign-off that the system meets requirements.     |
| **Uptime 99.9%**       | The system is available at least 99.9% of the time (about 8h 45m of downtime per year).  |

---

*For technical depth on any point in this document, see the companion technical documents in this same folder (01 through 06). This overview is intentionally high-level and non-technical; the companion documents are the authoritative source for implementation detail.*
