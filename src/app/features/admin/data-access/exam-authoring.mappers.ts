import {
  type ExamDetailDto,
  type ExamListItemDto,
  type ExamQuestionDto,
  type ExamQuestionOptionDto,
} from './exam-authoring.dto';
import {
  type AdminExam,
  type ExamDetail,
  type ExamQuestion,
  type ExamQuestionOption,
  isExamQuestionType,
  isExamStatus,
} from './exam-authoring.model';

/** Map a wire `ExamListItemDto` to an `AdminExam` (status normalised to the union). */
export function toAdminExam(dto: ExamListItemDto): AdminExam {
  return {
    id: dto.id,
    certId: dto.certId,
    title: dto.title,
    examOrder: dto.examOrder,
    status: isExamStatus(dto.status) ? dto.status : 'draft',
    passingScore: dto.passingScore,
    durationMinutes: dto.durationMinutes,
    questionCount: dto.questionCount,
  };
}

function toOption(dto: ExamQuestionOptionDto): ExamQuestionOption {
  return { id: dto.id, optionText: dto.optionText, isCorrect: dto.isCorrect };
}

function toQuestion(dto: ExamQuestionDto): ExamQuestion {
  return {
    id: dto.id,
    questionText: dto.questionText,
    questionType: isExamQuestionType(dto.questionType) ? dto.questionType : 'mcq',
    position: dto.position,
    marks: dto.marks,
    options: dto.options.map(toOption),
  };
}

/** Map a wire `ExamDetailDto` to an `ExamDetail` (meta + questions). */
export function toExamDetail(dto: ExamDetailDto): ExamDetail {
  return {
    id: dto.id,
    certId: dto.certId,
    title: dto.title,
    examOrder: dto.examOrder,
    status: isExamStatus(dto.status) ? dto.status : 'draft',
    passingScore: dto.passingScore,
    durationMinutes: dto.durationMinutes,
    questions: dto.questions.map(toQuestion),
  };
}
