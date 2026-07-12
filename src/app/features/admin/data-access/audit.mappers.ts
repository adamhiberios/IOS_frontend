import { type AuditLogItemDto } from './audit.dto';
import { type AuditLogEntry } from './audit.model';

/** Map a wire `AuditLogItemDto` to an `AuditLogEntry` (near 1:1 — a raw log). */
export function toAuditLogEntry(dto: AuditLogItemDto): AuditLogEntry {
  return {
    id: dto.id,
    actorId: dto.actorId,
    action: dto.action,
    tableName: dto.tableName,
    recordId: dto.recordId,
    oldData: dto.oldData,
    newData: dto.newData,
    ipAddress: dto.ipAddress,
    createdAt: dto.createdAt,
  };
}
