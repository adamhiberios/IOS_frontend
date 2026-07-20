# IOS LMS — QA Pages & Endpoints Guide

A walkthrough of every page QA can open and test, **how to reach it**, and the API endpoint it calls.

## About the API base URL

All endpoints below are relative to the API base URL:

- **Current test build (development):** `https://api-dev.instituteofscrum.org/api/v1`
- **Production:** `https://api.instituteofscrum.org/api/v1`

So an endpoint written as `GET /me` actually means `GET https://api-dev.instituteofscrum.org/api/v1/me` on the test build.

## Legend

- **Live** = the page talks to the real backend; check the Network tab for the listed endpoint.
- **Static / Mock** = the page shows built-in content and does **not** call the backend yet — nothing will appear in the Network tab.

---

## 1. Public pages (no login needed)

Open these directly, or from the top navigation / footer on the home page.

| Page                                                                         | How to reach it                                        | Endpoint                                                                                           | Type                                        |
| ---------------------------------------------------------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| Home page                                                                    | The site's main URL `/`                                | `GET /landing`                                                                                     | Static (backend call is currently disabled) |
| Contact                                                                      | Footer → "Contact"                                     | —                                                                                                  | Static                                      |
| About – Mock Exam                                                            | Home → "Mock Exam" info link                           | —                                                                                                  | Static                                      |
| About – Scrum Master / Product Owner / Scrum Facilitator                     | Home → the matching "About" link                       | —                                                                                                  | Static                                      |
| All Certifications                                                           | Top nav → "Certifications"                             | —                                                                                                  | Static                                      |
| A single certification's details (ESM, ESM-P, ESM-A, EPO, EPO-P, EPO-A, ESF) | "All Certifications" page → click a certification card | —                                                                                                  | Static                                      |
| Terms of Use                                                                 | Footer → "Terms of Use"                                | —                                                                                                  | Static                                      |
| Privacy Policy                                                               | Footer → "Privacy Policy"                              | —                                                                                                  | Static                                      |
| Insights (articles list)                                                     | Top nav → "Insights"                                   | —                                                                                                  | Static                                      |
| A single Insight article                                                     | "Insights" list → click an article                     | —                                                                                                  | Static                                      |
| Course/certification catalog data                                            | Loaded behind course/certification cards               | `GET /catalog`, plus `GET /catalog/{item}` and `GET /catalog/{item}/outline` when a card is opened | Live                                        |
| Access Denied / Not Found                                                    | Shown automatically for blocked or unknown URLs        | —                                                                                                  | Static                                      |

---

## 2. Sign in / account pages

These only appear when you are **not** logged in. If you're already signed in you'll be redirected to the dashboard.

| Page                                           | How to reach it                    | Endpoint                                                                                   |
| ---------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------ |
| Login                                          | Top nav → "Sign in"                | `POST /auth/login`                                                                         |
| Register                                       | Login page → "Create account"      | `POST /auth/register` (and `POST /auth/resend-verification` for the "resend email" action) |
| Complete account (activate an invited account) | Link from the invitation email     | Account-activation flow (auth set-password)                                                |
| Forgot password                                | Login page → "Forgot password?"    | `POST /auth/forgot-password`                                                               |
| Set a new password                             | Link from the reset-password email | `POST /auth/reset-password`                                                                |

_Behind the scenes for every logged-in session: `POST /auth/refresh` (token refresh) and `POST /auth/logout` (sign out)._

---

## 3. Learner area (login required)

Sign in first, then reach these from the dashboard, the profile menu, or the notifications bell.

| Page                                           | How to reach it                                          | Endpoint                                                                              | Type                                               |
| ---------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Dashboard (overview)                           | Automatically after login, or top nav → "Dashboard"      | `GET /insights`                                                                       | Live                                               |
| My Certificates (list)                         | Dashboard → "My Certificates"                            | —                                                                                     | Static / Mock                                      |
| Certificate detail                             | "My Certificates" → click a certificate                  | —                                                                                     | Static / Mock                                      |
| Learning session                               | Inside a certificate → open a lesson / learning material | —                                                                                     | Static / Mock                                      |
| Mock test                                      | Inside a certificate → "Start Mock Test"                 | —                                                                                     | Static / Mock                                      |
| Mock test result                               | Shown automatically after finishing a mock test          | —                                                                                     | Static / Mock                                      |
| My Credentials                                 | Dashboard → "My Credentials"                             | `GET /me/certificates`                                                                | Live                                               |
| Profile                                        | Profile menu → "Profile"                                 | `GET /me`                                                                             | Live                                               |
| Edit profile                                   | Profile page → "Edit"                                    | `PATCH /me`, plus `POST /me/avatar-upload-url` when changing the photo                | Live                                               |
| Change password                                | Profile page → "Change password"                         | `PATCH /me/password`                                                                  | Live                                               |
| Settings                                       | Profile menu → "Settings"                                | `GET /payments/transactions`                                                          | Live                                               |
| Cancel subscription / Subscription cancelled   | Settings → "Cancel subscription"                         | Payment flow                                                                          | Live                                               |
| Notifications                                  | The bell icon in the header                              | `GET /notifications`, `POST /notifications/{id}/read`, `POST /notifications/read-all` | Live                                               |
| Courses (list)                                 | Top nav → "Courses"                                      | —                                                                                     | Static / Mock                                      |
| Course detail                                  | "Courses" list → click a course                          | —                                                                                     | Static / Mock                                      |
| Final exam flow: Verify → Ready → Run → Result | Started from a certificate's "Take Final Exam"           | —                                                                                     | Display only (real-time exam engine not wired yet) |

**Payment endpoints** (triggered by buy / retake actions, not standalone pages): `POST /payments/checkout`, `POST /payments/retake`, `GET /payments/transactions`.

---

## 4. Admin panel

The admin login is public; everything else requires an admin account. Reach the inner pages from the admin sidebar.

| Page                  | How to reach it                        | Endpoint                                                                                                                                                               |
| --------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Admin login           | Go to the `/admin` URL                 | `POST /auth/admin/login`                                                                                                                                               |
| Admin home (stats)    | Automatically after admin login        | `GET /admin/dashboard/overview`                                                                                                                                        |
| Catalog (list)        | Sidebar → "Catalog"                    | `GET /admin/catalog`                                                                                                                                                   |
| Create catalog item   | Catalog page → "New"                   | `POST /admin/catalog`                                                                                                                                                  |
| Edit catalog item     | Catalog list → "Edit" on a row         | `GET` / `PATCH` / `DELETE /admin/catalog/{item}`, plus `PATCH /admin/catalog/{item}/translations`                                                                      |
| Curriculum            | Sidebar → "Curriculum"                 | `GET /admin/certs/{cert}/curriculum`; Modules: `POST` / `PATCH` / `DELETE /admin/modules`; Lessons: `POST` / `PATCH` / `DELETE /admin/lessons`                         |
| Users (list)          | Sidebar → "Users"                      | `GET /admin/users`                                                                                                                                                     |
| User detail           | Users list → click a user              | `GET /admin/users/{user}`, `.../attempts`, `.../access-codes`, and `POST .../access-codes/{code}/revoke`                                                               |
| Mock questions        | Sidebar → "Mock"                       | `GET /admin/mock/certs/{cert}/questions`; `POST` / `PATCH` / `DELETE /admin/mock/questions`                                                                            |
| Assign exam           | Sidebar → "Exam"                       | `GET /admin/exam` (published exams) + `POST /admin/exam/assign`                                                                                                        |
| Exam authoring (list) | Sidebar → "Exams"                      | `GET /admin/certs/{cert}/exams`, `POST .../exams`                                                                                                                      |
| Exam questions        | Exams list → click an exam             | `GET` / `PATCH` / `DELETE /admin/exams/{exam}`, `POST .../publish` and `.../unpublish`, `POST` / `PATCH` / `DELETE .../questions/{question}`, `PATCH .../translations` |
| Lesson quizzes        | Curriculum → open a lesson → "Quizzes" | `GET` / `POST /admin/lessons/{lesson}/quizzes`; `PATCH` / `DELETE /admin/quizzes/{quiz}`; `POST` / `PATCH` / `DELETE .../questions/{question}`                         |
| Issued certificates   | Sidebar → "Issued Certs"               | `GET /admin/certs/issued`, `PATCH /admin/certs/issued/{cert}/revoke`                                                                                                   |
| Staff                 | Sidebar → "Staff"                      | `GET` / `POST /admin/staff`, `PATCH /admin/staff/{member}`, `POST /admin/staff/{member}/deactivate`                                                                    |
| Promo codes           | Sidebar → "Promo Codes"                | `GET` / `POST /admin/promo-codes`, `PATCH` / `DELETE /admin/promo-codes/{code}`                                                                                        |
| Audit logs            | Sidebar → "Audit Logs"                 | `GET /admin/audit-logs`                                                                                                                                                |

---

## Quick notes for QA

- **Fully wired to the backend:** authentication, the entire admin panel, My Credentials, Profile, Notifications, Dashboard overview, payments, and the course catalog.
- **Static / mock (no backend calls yet):** the Courses pages, the learner Certificates pages, the public Insights page, and most of the marketing/content pages on the home site.
- **Final exam (`Verify → Ready → Run → Result`)** is display-only for now — the real-time exam engine (WebSocket + offline storage) is planned for a later phase, so don't expect live server activity there.
