import { type HttpEvent, type HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, of, switchMap } from 'rxjs';

import { environment } from '@env/environment';

import { MockApiService } from './mock-api.service';

export const mockApiInterceptor: HttpInterceptorFn = (req, next) => {
  if (environment.production) {
    return next(req);
  }

  if (!req.url.startsWith(environment.apiBaseUrl)) {
    return next(req);
  }

  const mock = inject(MockApiService);
  const relativePath = req.url.slice(environment.apiBaseUrl.length);

  return from(mock.handle(req.method, relativePath, req.body)).pipe(
    switchMap((mockRes) => {
      if (mockRes === null) {
        return next(req);
      }
      return of(
        new HttpResponse({
          status: mockRes.status,
          statusText: mockRes.statusText,
          body: mockRes.body,
        }) as HttpEvent<unknown>,
      );
    }),
  );
};
