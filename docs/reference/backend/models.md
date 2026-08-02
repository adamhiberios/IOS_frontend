# Backend Models (Entities & Enums)

> UUID PK + `createdAt`/`updatedAt` (`UuidEntity`) unless marked **serial**
> (`IntEntity`, internal-only). Content tables are gated by `RolesGuard`; the
> student-owned tables marked **RLS** enforce row-level security keyed on
> `app.current_user_id`.

## Identity

- **`User`** (`users`) — email(unique), passwordHash, firstName, lastName,
  phone, avatarUrl, country/city/street/address/postalCode,
  occupation/position/company, locale(def `en`), emailVerified(+At), active.
  Getter `fullName`. **No date-of-birth column** (BE-I-25).
- **`AdminUser`** (`admin_users`) — email(unique), passwordHash, firstName,
  lastName, `role: AdminRole`, locale, active, createdById (self-FK).
- **`AuthToken`** (`auth_tokens`, serial) — userId, `purpose:
  AuthTokenPurpose(email_verification|password_reset)`, tokenHash, expiresAt, usedAt.
- **`RefreshToken`** (`refresh_tokens`, serial) — userId?/adminId?,
  `ownerType: TokenOwnerType(user|admin)`, tokenHash, expiresAt, revokedAt.
- **`RateLimitBlock`** (`rate_limit_blocks`, serial) — ipAddress(inet),
  endpoint, blockedUntil.

## Catalog / learning

- **`Certificate`** (`certificates`) — title, programCode(indexed),
  description, translations, price, currency(def USD), active, thumbnailUrl,
  badgeImageUrl, track, `level: CertLevel(foundation|practitioner|authority)`,
  durationHours, syllabusUrl (all writable via Create/Update DTOs).
- **`LearningModule`** (`learning_modules`) — certId, title, description,
  translations, position, active.
- **`Lesson`** (`lessons`) — moduleId, title, videoUrl, contentText,
  translations, position, durationSeconds, active.
- **`LessonQuiz`** (`lesson_quizzes`) — lessonId, title, active.
  **`QuizQuestion`** (`quiz_questions`) — quizId, questionText,
  correctAnswer, options(jsonb), position.

## Exam engine

- **`Exam`** (`exams`) — certId, title, examOrder(**1–6**), `status:
  ExamStatus(draft|published)`, passingScore(1–100, def 80), durationMinutes,
  createdById, translations.
- **`ExamQuestion`** (`exam_questions`) — examId, questionText, `questionType:
  QuestionType(mcq|true_false)`, position, marks. **`ExamQuestionOption`**
  (`exam_question_options`) — questionId, optionText, `isCorrect` (never sent
  to students).
- **`ExamAccessCode`** (`exam_access_codes`) — userId, examId, certId,
  tokenHash, expiresAt, usedAt.
- **`ExamAttempt`** (`exam_attempts`, RLS) — userId, examId, certId,
  score(0–100), passed, answers(jsonb snapshot), durationSeconds, startedAt,
  submittedAt, `status: AttemptStatus(submitted|auto_submitted)`, lateFlag.
- **`TestSession`** (`test_sessions`) — live Redis-mirrored session: userId,
  examId, certId?, sessionToken, startedAt, durationSeconds, expiresAt,
  `status: TestSessionStatus(active|submitted|expired|auto_submitted)`,
  submittedAt, snapshot(jsonb).

## Mock exam (separate bank)

- **`MockQuestion`** (`mock_questions`) — certId, questionText, questionType,
  position, active. **`MockQuestionOption`** — questionId, optionText,
  isCorrect (revealed only via the reveal endpoint).
- **`MockExamAttempt`** (`mock_exam_attempts`, RLS) — userId, certId,
  `status: MockAttemptStatus(in_progress|submitted)`, score?, correctCount?,
  totalCount?, `readyForFinal?` (advisory: score≥80, never a gate),
  extensionsUsed, questionIds(jsonb), answers(jsonb), startedAt, expiresAt,
  submittedAt, durationSeconds.
- **`MockExamAnswer`** (`mock_exam_answers`, RLS) — attemptId, userId,
  questionId, selectedOptionId?, isCorrect.

## Commerce & certification

- **`StudentPurchase`** (`student_purchases`, RLS) — unique(userId,certId);
  paymentIntentId, `paymentType: PaymentType(enrollment|retake)`,
  preExamConfirmed, examCompleted.
- **`Transaction`** (`transactions`, RLS) — userId, certId,
  stripeSessionId(unique), amount, currency, `status:
  TransactionStatus(pending|completed|failed|refunded)`, promoCodeId?.
- **`PromoCode`** (`promo_codes`) — code(unique), `discountType:
  DiscountType(percentage|full_waiver)`, discountValue, applicableCertIds?,
  maxUses?, usageCount, expiresAt?, createdById.
- **`StudentProgress`** (`student_progress`, RLS) — unique(userId,lessonId),
  completedAt.
- **`IssuedCertificate`** (`issued_certificates`) — public `certId`(unique
  string `IOS-<PROGRAM>-<YEAR>-<seq>`), userId, certificateId,
  examAttemptId(unique → exactly-once issuance), s3Url, qrUrl, isActive,
  issuedAt.

## Infra / misc

- **`AdminAuditLog`** (`admin_audit_logs`, serial, RLS) — actorId, action,
  tableName, recordId, oldData/newData(jsonb, sensitive keys redacted), ipAddress.
- **`ProcessedWebhook`** (`processed_webhooks`, serial) —
  eventId(unique) — Stripe idempotency.
- **`NotificationTemplate`** / **`NotificationQueue`** (serial) — `status:
  NotificationStatus(pending|sent|failed)`.
- **`BlogArticle`** (`blog_articles`) — title, slug(unique), contentHtml,
  `status: BlogStatus(draft|published|archived)`, authorId, translations.
