import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { type Observable, map } from 'rxjs';

import { environment } from '@env/environment';

import { type StudentInsightsDto } from './insights.dto';
import { toStudentInsights } from './insights.mappers';
import { type StudentInsights } from './insights.model';

/**
 * Transport for the student's learning insights — `GET /insights` (student
 * token; admins get 403). **Bare** response (no envelope). Bearer token via
 * `authInterceptor`, `X-Locale` via `localeInterceptor`.
 */
@Injectable({ providedIn: 'root' })
export class StudentInsightsApi {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiBaseUrl}/insights`;

  /** `GET /insights` — the student's learning + exam aggregates. */
  get(): Observable<StudentInsights> {
    return this.http.get<StudentInsightsDto>(this.endpoint).pipe(map(toStudentInsights));
  }
}
