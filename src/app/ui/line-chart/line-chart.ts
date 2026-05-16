import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { LucideChevronDown } from '@lucide/angular';
import { NgApexchartsModule } from 'ng-apexcharts';
import type {
  ApexChart,
  ApexDataLabels,
  ApexFill,
  ApexGrid,
  ApexMarkers,
  ApexNoData,
  ApexStroke,
  ApexTooltip,
  ApexXAxis,
  ApexYAxis,
} from 'ng-apexcharts';

import { LanguageService } from '@core/i18n';
import type { ScoreFilterWeek, WeeklyScore } from '@shared';
import { IosIcon } from '../icon/icon';
import { provideIcons } from '../icon/icon-registry';

/**
 * `ios-line-chart` — ApexCharts line chart for weekly mock-test scores.
 *
 * Matches Figma node 17511-38140:
 * · X axis: Sat → Fri (7 days)
 * · Y axis: +20% → +80% (4 ticks)
 * · Line colour: #D63D13 (danger-500)
 * · Filter: "This Week" / "Last Week"
 *
 * Lives in @ui so it can be shared across features.
 */
@Component({
  selector: 'ios-line-chart',
  imports: [NgApexchartsModule, IosIcon],
  providers: [provideIcons(LucideChevronDown)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-3 h-full">
      <!-- Title + filter — outside the card -->
      <div class="flex items-center justify-between shrink-0">
        <h2 class="text-[18px] font-semibold leading-[1.4] text-ios-fg-13">
          {{ lang.t('dashboard.charts.mockTestScores') }}
        </h2>

        <button
          type="button"
          class="flex items-center gap-0.5 text-[14px] font-semibold text-ios-fg-10 hover:text-ios-fg-13 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50 rounded"
          (click)="cycleFilter()"
          [attr.aria-label]="lang.t('dashboard.charts.filterLabel', { label: filterLabel() })"
        >
          {{ filterLabel() }}
          <ios-icon name="chevron-down" class="w-[18px] h-[18px]" aria-hidden="true" />
        </button>
      </div>

      <!-- Card -->
      <div class="bg-ios-surface-muted rounded-2xl p-5 flex-1">
        <apx-chart
          [series]="series()"
          [chart]="chartBase"
          [xaxis]="xaxis()"
          [yaxis]="yAxis"
          [stroke]="stroke"
          [markers]="markers"
          [fill]="fill"
          [dataLabels]="dataLabels"
          [grid]="grid"
          [tooltip]="tooltip"
          [noData]="noData"
          [colors]="colors"
        />
      </div>
    </div>
  `,
})
export class LineChart {
  protected readonly lang = inject(LanguageService);
  readonly scores = input.required<readonly WeeklyScore[]>();
  readonly weekFilter = input<ScoreFilterWeek>('this_week');
  readonly filterChange = output<ScoreFilterWeek>();

  protected readonly filterLabel = computed(() =>
    this.weekFilter() === 'this_week'
      ? this.lang.t('dashboard.charts.thisWeek')
      : this.lang.t('dashboard.charts.lastWeek'),
  );

  protected readonly series = computed(() => [
    {
      name: this.lang.t('dashboard.charts.score'),
      data: this.scores().map((s) => s.score ?? 0),
    },
  ]);

  protected readonly xaxis = computed<ApexXAxis>(() => ({
    categories: this.scores().map((s) => s.day),
    axisBorder: { show: false },
    axisTicks: { show: false },
    labels: {
      style: {
        colors: '#9ca3af',
        fontSize: '10px',
        fontFamily: 'inherit',
        fontWeight: 500,
      },
    },
  }));

  /* ── Static ApexCharts config ───────────────────────────────────────── */

  protected readonly chartBase: ApexChart = {
    type: 'line',
    height: 170,
    toolbar: { show: false },
    fontFamily: 'inherit',
    background: 'transparent',
    animations: { enabled: true, speed: 400 },
    zoom: { enabled: false },
  };

  protected readonly colors = ['#D63D13'];

  protected readonly stroke: ApexStroke = {
    curve: 'straight',
    width: 2,
  };

  protected readonly markers: ApexMarkers = {
    size: 5,
    colors: ['#D63D13'],
    strokeColors: '#D63D13',
    strokeWidth: 0,
    fillOpacity: 1,
    hover: { size: 7 },
  };

  protected readonly fill: ApexFill = { type: 'solid' };

  protected readonly dataLabels: ApexDataLabels = { enabled: false };

  protected readonly yAxis: ApexYAxis = {
    min: 0,
    max: 80,
    tickAmount: 4,
    labels: {
      formatter: (v: number) => `+${v}%`,
      style: {
        colors: '#9ca3af',
        fontSize: '12px',
        fontFamily: 'inherit',
        fontWeight: 500,
      },
    },
  };

  protected readonly grid: ApexGrid = {
    borderColor: '#dcdcdc',
    strokeDashArray: 0,
    xaxis: { lines: { show: true } },
    yaxis: { lines: { show: true } },
    padding: { left: 4, right: 8 },
  };

  protected readonly tooltip: ApexTooltip = {
    theme: 'light',
    y: { formatter: (v: number) => `${v}%` },
  };

  protected readonly noData: ApexNoData = {
    text: this.lang.t('dashboard.charts.noData'),
    style: { color: '#9ca3af', fontSize: '12px', fontFamily: 'inherit' },
  };

  protected cycleFilter(): void {
    const next: ScoreFilterWeek = this.weekFilter() === 'this_week' ? 'last_week' : 'this_week';
    this.filterChange.emit(next);
  }
}
