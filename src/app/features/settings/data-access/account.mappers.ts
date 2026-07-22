import { type DeleteAccountResultDto } from './account.dto';
import { type DeleteAccountResult } from './account.model';

/** Map the bare `POST /me/delete` result DTO to the frontend model (1:1). */
export function toDeleteAccountResult(dto: DeleteAccountResultDto): DeleteAccountResult {
  return {
    deleted: dto.deleted,
    retained: [...dto.retained],
    note: dto.note,
  };
}
