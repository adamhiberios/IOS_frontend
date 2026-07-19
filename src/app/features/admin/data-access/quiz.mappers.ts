import {
  type CreateQuestionBody,
  type QuizDto,
  type QuizQuestionDto,
  type UpdateQuestionBody,
} from './quiz.dto';
import { type QuestionDraft, type Quiz, type QuizQuestion } from './quiz.model';

export function toQuizQuestion(dto: QuizQuestionDto): QuizQuestion {
  return {
    id: dto.id,
    quizId: dto.quizId,
    questionText: dto.questionText,
    correctAnswer: dto.correctAnswer,
    options: dto.options,
    position: dto.position,
  };
}

export function toQuiz(dto: QuizDto): Quiz {
  return {
    id: dto.id,
    lessonId: dto.lessonId,
    title: dto.title,
    active: dto.active,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
    questions: dto.questions.map(toQuizQuestion),
  };
}

/** Build a question create body — options omitted for free-text, trimmed for MCQ. */
export function toCreateQuestionBody(draft: QuestionDraft): CreateQuestionBody {
  const options = draft.options.map((o) => o.trim()).filter((o) => o !== '');
  return {
    questionText: draft.questionText.trim(),
    correctAnswer: draft.correctAnswer.trim(),
    ...(options.length ? { options } : {}),
    ...(draft.position !== undefined ? { position: draft.position } : {}),
  };
}

/**
 * Build a question update body. `options` is always sent (empty array converts
 * to free-text; a non-empty set replaces the previous one).
 */
export function toUpdateQuestionBody(draft: QuestionDraft): UpdateQuestionBody {
  const options = draft.options.map((o) => o.trim()).filter((o) => o !== '');
  return {
    questionText: draft.questionText.trim(),
    correctAnswer: draft.correctAnswer.trim(),
    options,
    ...(draft.position !== undefined ? { position: draft.position } : {}),
  };
}
