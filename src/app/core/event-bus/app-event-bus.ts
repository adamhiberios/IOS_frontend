import { Injectable } from '@angular/core';
import { Subject, type Observable, filter, map, share } from 'rxjs';

/**
 * Cross-feature communication bus.
 *
 * CLAUDE.md §5 forbids cross-feature imports. When two features need to
 * collaborate (e.g. `auth` emits "user-logged-in" → `dashboard` reloads
 * a widget), they go through this bus instead of importing each other.
 *
 * Producers: `bus.emit({ type: 'user.logged-in', userId })`
 * Consumers: `bus.on<UserLoggedInEvent>('user.logged-in').subscribe(...)`
 *
 * Events are intentionally typed via a discriminated union below; adding
 * a new event type requires updating the union, which keeps the surface
 * traceable.
 */

/* -------------------------------------------------------------------------- */
/* Event catalogue                                                            */
/* -------------------------------------------------------------------------- */

export interface UserLoggedInEvent {
  readonly type: 'user.logged-in';
  readonly userId: string;
}

export interface UserLoggedOutEvent {
  readonly type: 'user.logged-out';
  readonly reason: 'manual' | 'session-expired' | 'forced';
}

export interface LocaleChangedEvent {
  readonly type: 'locale.changed';
  readonly locale: 'en' | 'ar';
}

export type AppEvent = UserLoggedInEvent | UserLoggedOutEvent | LocaleChangedEvent;

/* -------------------------------------------------------------------------- */
/* Service                                                                    */
/* -------------------------------------------------------------------------- */

@Injectable({ providedIn: 'root' })
export class AppEventBus {
  private readonly subject = new Subject<AppEvent>();
  private readonly stream$ = this.subject.asObservable().pipe(share());

  emit(event: AppEvent): void {
    this.subject.next(event);
  }

  /**
   * Subscribe to a specific event type. Type narrowing is preserved.
   */
  on<T extends AppEvent['type']>(type: T): Observable<Extract<AppEvent, { type: T }>> {
    return this.stream$.pipe(
      filter((event): event is Extract<AppEvent, { type: T }> => event.type === type),
      map((event) => event),
    );
  }

  /** Stream of every event — use sparingly, prefer `on(type)` for clarity. */
  all(): Observable<AppEvent> {
    return this.stream$;
  }
}
