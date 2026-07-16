import { type StudentInsightsDto } from './insights.dto';
import { type StudentInsights } from './insights.model';

/** Map the bare `GET /insights` DTO to the frontend {@link StudentInsights} (1:1). */
export function toStudentInsights(dto: StudentInsightsDto): StudentInsights {
  return {
    enrolledPrograms: dto.enrolledPrograms,
    completedLessons: dto.completedLessons,
    inProgressPrograms: dto.inProgressPrograms,
    realExam: {
      attempts: dto.realExam.attempts,
      passed: dto.realExam.passed,
      passRate: dto.realExam.passRate,
      avgScore: dto.realExam.avgScore,
      bestScore: dto.realExam.bestScore,
    },
    mockExam: {
      attempts: dto.mockExam.attempts,
      avgScore: dto.mockExam.avgScore,
    },
    certificatesEarned: dto.certificatesEarned,
  };
}
