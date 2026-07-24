/**
 * DTO → domain mappers for the learning experience. Each unwraps the backend's
 * `{ data, meta }` envelope and drops wire-only field names.
 */

import {
  type CheckQuizResponseDto,
  type CurriculumModuleDto,
  type CurriculumResponseDto,
  type LessonQuizResponseDto,
  type LessonResponseDto,
  type LessonSummaryDto,
  type MarkCompleteResponseDto,
  type ProgressResponseDto,
  type QuizQuestionDto,
  type QuizResultDto,
} from './courses.dto';
import {
  type CourseModule,
  type CourseProgress,
  type Curriculum,
  type Lesson,
  type LessonCompletion,
  type LessonQuiz,
  type LessonSummary,
  type QuizAnswerResult,
  type QuizCheckResult,
  type QuizQuestion,
} from './courses.model';

function toLessonSummary(dto: LessonSummaryDto): LessonSummary {
  return {
    id: dto.id,
    title: dto.title,
    position: dto.position,
    durationSeconds: dto.durationSeconds,
    hasVideo: dto.hasVideo,
    completed: dto.completed,
  };
}

function toCourseModule(dto: CurriculumModuleDto): CourseModule {
  return {
    id: dto.id,
    title: dto.title,
    position: dto.position,
    lessons: dto.lessons.map(toLessonSummary),
  };
}

export function toCurriculum(dto: CurriculumResponseDto): Curriculum {
  return {
    certificate: {
      id: dto.data.certificate.id,
      programCode: dto.data.certificate.programCode,
      title: dto.data.certificate.title,
    },
    modules: dto.data.modules.map(toCourseModule),
  };
}

export function toLesson(dto: LessonResponseDto): Lesson {
  return {
    id: dto.data.id,
    moduleId: dto.data.moduleId,
    title: dto.data.title,
    contentHtml: dto.data.contentHtml,
    videoUrl: dto.data.videoUrl,
    videoUrlExpiresInSeconds: dto.meta.videoUrlExpiresInSeconds,
    durationSeconds: dto.data.durationSeconds,
    position: dto.data.position,
    completed: dto.data.completed,
    completedAt: dto.data.completedAt,
  };
}

function toQuizQuestion(dto: QuizQuestionDto): QuizQuestion {
  return {
    id: dto.id,
    questionText: dto.questionText,
    options: dto.options,
    position: dto.position,
  };
}

export function toLessonQuiz(dto: LessonQuizResponseDto): LessonQuiz {
  return {
    id: dto.data.id,
    lessonId: dto.data.lessonId,
    title: dto.data.title,
    questions: dto.data.questions.map(toQuizQuestion),
  };
}

function toQuizAnswerResult(dto: QuizResultDto): QuizAnswerResult {
  return {
    questionId: dto.questionId,
    yourAnswer: dto.yourAnswer,
    correct: dto.correct,
    correctAnswer: dto.correctAnswer,
  };
}

export function toQuizCheckResult(dto: CheckQuizResponseDto): QuizCheckResult {
  return {
    quizId: dto.data.quizId,
    lessonId: dto.data.lessonId,
    correctCount: dto.data.correctCount,
    totalCount: dto.data.totalCount,
    score: dto.data.score,
    results: dto.data.results.map(toQuizAnswerResult),
  };
}

export function toLessonCompletion(dto: MarkCompleteResponseDto): LessonCompletion {
  return {
    lessonId: dto.data.lessonId,
    completedAt: dto.data.completedAt,
    alreadyCompleted: dto.data.alreadyCompleted,
  };
}

export function toCourseProgressList(dto: ProgressResponseDto): CourseProgress[] {
  return dto.data.map((p) => ({
    certId: p.certId,
    programCode: p.programCode,
    title: p.title,
    totalLessons: p.totalLessons,
    completedLessons: p.completedLessons,
    percentComplete: p.percentComplete,
  }));
}
