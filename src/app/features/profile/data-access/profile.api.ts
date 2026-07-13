import { HttpBackend, HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { type Observable, map } from 'rxjs';

import { environment } from '@env/environment';

import {
  type AvatarUploadUrlResponseDto,
  type MessageResponseDto,
  type ProfileResponseDto,
} from './profile.dto';
import { toAvatarUploadTarget, toProfile, toUpdateProfileDto } from './profile.mappers';
import {
  type AvatarContentType,
  type AvatarUploadTarget,
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

  /**
   * A bare `HttpClient` wired straight to the {@link HttpBackend}, bypassing the
   * whole interceptor chain (auth → locale → retry → error). Used for the object
   * storage PUT so no `Authorization` / `X-Locale` header — nor the refresh
   * cookie — is ever sent to the storage host, and the presigned signature isn't
   * invalidated by extra headers.
   */
  private readonly rawHttp = new HttpClient(inject(HttpBackend));

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

  /**
   * `POST /me/avatar-upload-url` — request a short-lived presigned PUT target for
   * the given image type. **Bare** response (no `{ data }` envelope). Goes through
   * the normal API client (needs the bearer token + `X-Locale`).
   */
  requestAvatarUploadUrl(contentType: AvatarContentType): Observable<AvatarUploadTarget> {
    return this.http
      .post<AvatarUploadUrlResponseDto>(`${this.base}/avatar-upload-url`, { contentType })
      .pipe(map(toAvatarUploadTarget));
  }

  /**
   * PUT the raw file bytes to the presigned object-storage `uploadUrl`. This does
   * **not** hit the API — it uses {@link rawHttp} to bypass every interceptor and
   * sends only the exact `Content-Type` the URL was signed for. `responseType:
   * 'text'` avoids a JSON-parse error on the empty/XML storage response.
   */
  uploadAvatarBytes(
    target: AvatarUploadTarget,
    file: Blob,
    contentType: AvatarContentType,
  ): Observable<void> {
    return this.rawHttp
      .put(target.uploadUrl, file, {
        headers: { 'Content-Type': contentType },
        responseType: 'text',
      })
      .pipe(map(() => undefined));
  }

  /**
   * `PATCH /me { avatarUrl: key }` — point the profile at the freshly-uploaded
   * object. Sends only `avatarUrl` (all other fields untouched) and returns the
   * updated profile with the backend-resolved URL.
   */
  setAvatar(key: string): Observable<Profile> {
    return this.http.patch<ProfileResponseDto>(this.base, { avatarUrl: key }).pipe(map(toProfile));
  }
}
