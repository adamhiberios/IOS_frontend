import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { DirectionService } from '@core/i18n';

@Component({
  selector: 'ios-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly directionService = inject(DirectionService);

  protected readonly title = signal('Institute of Scrum — LMS');
  protected readonly locale = this.directionService.locale;
  protected readonly direction = this.directionService.direction;
  protected readonly isRtl = this.directionService.isRtl;

  protected toggleDirection(): void {
    this.directionService.toggle();
  }
}
