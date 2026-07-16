import { type DashboardOverviewDto } from './dashboard.dto';
import { type DashboardOverview } from './dashboard.model';

/** Map the bare `GET /admin/dashboard/overview` DTO to {@link DashboardOverview} (1:1). */
export function toDashboardOverview(dto: DashboardOverviewDto): DashboardOverview {
  return {
    revenue: {
      total: dto.revenue.total,
      currency: dto.revenue.currency,
      last30Days: dto.revenue.last30Days,
      monthly: dto.revenue.monthly.map((p) => ({
        month: p.month,
        revenue: p.revenue,
        transactions: p.transactions,
      })),
    },
    transactions: {
      completed: dto.transactions.completed,
      pending: dto.transactions.pending,
      failed: dto.transactions.failed,
      refunded: dto.transactions.refunded,
    },
    enrollments: {
      total: dto.enrollments.total,
      last30Days: dto.enrollments.last30Days,
    },
    students: {
      total: dto.students.total,
      newLast30Days: dto.students.newLast30Days,
    },
    exams: {
      attempts: dto.exams.attempts,
      passed: dto.exams.passed,
      passRate: dto.exams.passRate,
      avgScore: dto.exams.avgScore,
    },
    certificates: {
      issued: dto.certificates.issued,
    },
    topPrograms: dto.topPrograms.map((p) => ({
      certId: p.certId,
      program: p.program,
      programCode: p.programCode,
      enrollments: p.enrollments,
      revenue: p.revenue,
    })),
  };
}
