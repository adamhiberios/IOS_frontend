import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { LanguageService, type AppLocale } from '@core/i18n';

@Component({
  selector: 'ios-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly lang = inject(LanguageService);

  protected readonly title = signal('Institute of Scrum — LMS');
  protected readonly locale = this.lang.locale;
  protected readonly direction = this.lang.direction;
  protected readonly isRtl = this.lang.isRtl;

  protected setLocale(code: AppLocale): void {
    void this.lang.setLocale(code);
  }
}
