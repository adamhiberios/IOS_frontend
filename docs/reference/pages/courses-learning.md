# Courses / Learning

> **Superseded by the learning-hub dedup rewire** (see
> [`../../status/current-status.md`](../../status/current-status.md)):
> `/courses` and `features/courses/pages/*` were **deleted**; the real
> `/learning/*` wiring now serves `/dashboard/certificates` instead. This
> file preserves the endpoint/architecture detail, which is unchanged — only
> the routing/page location moved. `courses/data-access/*` is what's still in
> use, just consumed from a different page tree.

## Backend contract (`@Controller('learning')`)

All endpoints return `{ data, meta }` and are purchase-gated (403 when not
enrolled):

- `GET /learning/certs/:certId/curriculum` — module/lesson tree +
  per-lesson `completed`.
- `GET /learning/lessons/:id` — localised `contentHtml` + short-lived signed
  `videoUrl` + `meta.videoUrlExpiresInSeconds`.
- `GET /learning/lessons/:id/quiz` — correct answers stripped; free-text OR
  MCQ via `options`.
- `POST /learning/lessons/:id/quiz/check` — instant per-question feedback
  incl. `correctAnswer`; **nothing persisted**, unlimited attempts.
- `POST /learning/lessons/:id/complete` — idempotent, `alreadyCompleted`.
- `GET /learning/progress` — per-cert `totalLessons`/`completedLessons`/
  `percentComplete`.

## Data-access (`features/courses/data-access`, kept)

`CoursesStore` (root singleton): curriculum / current-lesson /
quiz+checkResult / progress slices, each with loading+error signals. Actions:
`loadCurriculum`, `loadLesson`, `loadQuiz`, `checkQuiz`, `markComplete`
(reflects completion into the lesson + curriculum immutably), `loadProgress`.
Clears on `user.logged-out`.

## UI behaviour (now served from the certificates/dashboard hub, not `/courses`)

- Lesson content renders via Angular's built-in `[innerHTML]` sanitizer
  (`.ios-lesson-prose` styling) — **never** `bypassSecurityTrust*`.
- Mark-complete is idempotent; failures surface via the global error toast,
  deliberately not via the page-gating `lessonError` signal.
- Self-check quiz: MCQ (radios) or free-text; `Check answers` →
  `POST …/quiz/check` → per-question correct/incorrect + revealed correct
  answer + score, with `Try again`. A missing quiz (404) simply hides the
  section — quizzes are optional.
- Route params read via `route.snapshot.paramMap` (project convention).

## Historical connectivity defect (pre-dedup, now resolved by deletion)

`/courses` had **no inbound link from any navigation surface**
(`dashboard-navbar.ts`/`user-menu-dropdown.ts` never listed it) — the entire
real-backend learning feature was reachable only by typing the URL. This is
exactly the problem the learning-hub dedup fixed by rewiring the *designed,
already-linked* `/dashboard/certificates` hub onto the real data instead of
adding a nav entry for the orphan `/courses` pages.
