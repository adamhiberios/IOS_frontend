import { type ExamListItemDto } from './exam-authoring.dto';
import { type AdminExam, isExamStatus } from './exam-authoring.model';

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
