import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { LucideChevronDown } from '@lucide/angular';
import { NgApexchartsModule } from 'ng-apexcharts';

import { LanguageService } from '@core/i18n';
import type {
  ApexChart,
  ApexDataLabels,
  ApexFill,
  ApexGrid,
  ApexNoData,
  ApexPlotOptions,
  ApexStroke,
  ApexTooltip,
  ApexXAxis,
  ApexYAxis,
} from 'ng-apexcharts';

import { IosIcon } from '../icon/icon';
import { provideIcons } from '../icon/icon-registry';

import type { MonthlyScore, ScoreFilterYear } from '@shared';

export interface ChartOptions {
  chart: ApexChart;
  yaxis: ApexYAxis;
  fill: ApexFill;
  dataLabels: ApexDataLabels;
  plotOptions: ApexPlotOptions;
  grid: ApexGrid;
  stroke: ApexStroke;
  tooltip: ApexTooltip;
  noData: ApexNoData;
  colors: string[];
}

/**
 * `ios-bar-chart` — ApexCharts column chart for monthly mock-test scores.
 *
 * Pure presentation: receives `MonthlyScore[]`, emits year-filter changes.
 * Bar colour: #6b7280 (gray-500) matching Figma exactly.
 *
 * Lives in @ui so it can be shared across features (dashboard, certificates, …).
 */
@Component({
  selector: 'ios-bar-chart',
  imports: [NgApexchartsModule, IosIcon],
  providers: [provideIcons(LucideChevronDown)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-3 h-full">
      <!-- Title + filter — outside the card -->
      <div class="flex items-center justify-between">
        <h2 class="text-[18px] font-semibold leading-[1.3] text-ios-fg-13">
          {{ lang.t('dashboard.charts.mockTestScores') }}
        </h2>

        <button
          type="button"
          class="flex items-center gap-1 text-[14px] font-semibold text-ios-fg-10 hover:text-ios-fg-13 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50 rounded"
          (click)="cycleFilter()"
          [attr.aria-label]="lang.t('dashboard.charts.filterLabel', { label: filterLabel() })"
        >
          {{ filterLabel() }}
          <ios-icon name="chevron-down" class="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      <!-- Card -->
      <div class="bg-ios-surface-muted rounded-2xl p-5 flex-1">
        <apx-chart
          [series]="series()"
          [chart]="chartOptions().chart"
          [xaxis]="xaxis()"
          [yaxis]="chartOptions().yaxis"
          [fill]="chartOptions().fill"
          [dataLabels]="chartOptions().dataLabels"
          [plotOptions]="chartOptions().plotOptions"
          [grid]="chartOptions().grid"
          [stroke]="chartOptions().stroke"
          [tooltip]="chartOptions().tooltip"
          [noData]="chartOptions().noData"
          [colors]="chartOptions().colors"
        />
      </div>
    </div>
  `,
})
export class BarChart {
  protected readonly lang = inject(LanguageService);
  readonly scores = input.required<readonly MonthlyScore[]>();
  readonly yearFilter = input<ScoreFilterYear>('this_year');
  readonly filterChange = output<ScoreFilterYear>();

  protected readonly filterLabel = computed(() =>
    this.yearFilter() === 'this_year'
      ? this.lang.t('dashboard.charts.thisYear')
      : this.lang.t('dashboard.charts.lastYear'),
  );

  /** ApexCharts series derived from the monthly score data. */
  protected readonly series = computed(() => [
    {
      name: this.lang.t('dashboard.charts.score'),
      data: this.scores().map((s) => s.score ?? 0),
    },
  ]);

  /** X-axis categories from month labels. */
  protected readonly xaxis = computed<ApexXAxis>(() => ({
    categories: this.scores().map((s) => s.month),
    axisBorder: { show: false },
    axisTicks: { show: false },
    labels: {
      style: {
        colors: '#9ca3af',
        fontSize: '11px',
        fontFamily: 'inherit',
      },
    },
  }));

  /** Chart configuration — computed so noData reacts to language changes. */
  protected readonly chartOptions = computed<ChartOptions>(() => ({
    chart: {
      type: 'bar',
      height: 220,
      toolbar: { show: false },
      sparkline: { enabled: false },
      fontFamily: 'inherit',
      background: 'transparent',
      animations: { enabled: true, speed: 400 },
    },
    colors: ['#6b7280'],
    fill: { type: 'solid' },
    dataLabels: { enabled: false },
    plotOptions: {
      bar: {
        columnWidth: '45%',
        borderRadius: 3,
        borderRadiusApplication: 'end',
      },
    },
    yaxis: {
      min: 0,
      max: 100,
      tickAmount: 4,
      labels: {
        formatter: (v: number) => `+${v}%`,
        style: {
          colors: '#9ca3af',
          fontSize: '11px',
          fontFamily: 'inherit',
        },
      },
    },
    grid: {
      borderColor: '#e5e7eb',
      strokeDashArray: 0,
      xaxis: { lines: { show: true } },
      yaxis: { lines: { show: true } },
      padding: { left: 0, right: 0 },
    },
    stroke: { show: false },
    tooltip: {
      theme: 'light',
      y: { formatter: (v: number) => `${v}%` },
    },
    noData: {
      text: this.lang.t('dashboard.charts.noData'),
      style: { color: '#9ca3af', fontSize: '12px', fontFamily: 'inherit' },
    },
  }));

  protected cycleFilter(): void {
    const next: ScoreFilterYear = this.yearFilter() === 'this_year' ? 'last_year' : 'this_year';
    this.filterChange.emit(next);
  }
}
