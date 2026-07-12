import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { type Observable, map } from 'rxjs';

import { environment } from '@env/environment';

import { type MessageResponseDto, type ProfileResponseDto } from './profile.dto';
import { toProfile, toUpdateProfileDto } from './profile.mappers';
import {
  type ChangePasswordPayload,
  type Profile,
  type UpdateProfilePayload,
} from './profile.model';

/**
 * Student self-service profile transport — `@Controller('me')` (student token
 * only; admins get 403). All three endpoints return **bare DTOs**, not the
 * `{ data }` envelope the admin list endpoints use (BE-I-01). The bearer token
 * is attached by `authInterceptor`; `X-Lang` by `localeInterceptor`.
 */
@Injectable({ providedIn: 'root' })
export class ProfileApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/me`;

  /** `GET /me` — the full profile for the authenticated student. */
  getMe(): Observable<Profile> {
    return this.http.get<ProfileResponseDto>(this.base).pipe(map(toProfile));
  }

  /**
   * `PATCH /me` — partial update; returns the updated profile. Only editable
   * fields are sent (name/email are locked server-side).
   */
  updateMe(payload: UpdateProfilePayload): Observable<Profile> {
    return this.http
      .patch<ProfileResponseDto>(this.base, toUpdateProfileDto(payload))
      .pipe(map(toProfile));
  }

  /**
   * `PATCH /me/password` — change password. On success the backend revokes ALL
   * refresh tokens (every device, including this one) and clears the refresh
   * cookie, so a 200 must be treated as a forced logout by the caller.
   */
  changePassword(payload: ChangePasswordPayload): Observable<void> {
    return this.http
      .patch<MessageResponseDto>(`${this.base}/password`, {
        currentPassword: payload.currentPassword,
        newPassword: payload.newPassword,
      })
      .pipe(map(() => undefined));
  }
}
