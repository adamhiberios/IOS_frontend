import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { NgApexchartsModule } from 'ng-apexcharts';

import { LanguageService } from '@core/i18n';
import type {
  ApexChart,
  ApexDataLabels,
  ApexFill,
  ApexLegend,
  ApexNoData,
  ApexPlotOptions,
  ApexResponsive,
  ApexStroke,
  ApexTooltip,
} from 'ng-apexcharts';

import type { ExamSummary } from '@shared';

/**
 * `ios-donut-chart` — ApexCharts donut ring showing passed/failed ratio.
 *
 * · Passed = green (#22c55e)
 * · Failed  = red   (#ef4444)
 * · When both are 0 the ring renders in light gray (empty state).
 *
 * Legend is rendered as custom HTML below the chart so it precisely matches
 * the Figma layout: coloured dot + "N Passed Exams / N Fail Exams".
 */
@Component({
  selector: 'ios-donut-chart',
  imports: [NgApexchartsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-3 h-full">
      <!-- Title — outside the card -->
      <h2 class="text-[18px] font-semibold leading-[1.3] text-ios-fg-13 shrink-0">
        {{ lang.t('dashboard.charts.totalMockTests') }}
      </h2>

      <!-- Card — flex-1 so it grows to match the bar chart height -->
      <div class="bg-ios-surface-muted rounded-2xl p-5 flex flex-col flex-1">
        <!-- Donut ring — centred, 132 × 132 px -->
        <div class="flex justify-center" style="margin: -8px 0 -4px;">
          <apx-chart
            [series]="series()"
            [chart]="chartBase"
            [labels]="labels()"
            [colors]="colors()"
            [fill]="fill"
            [dataLabels]="dataLabels"
            [plotOptions]="plotOptions"
            [stroke]="stroke"
            [legend]="legend"
            [tooltip]="tooltip"
            [noData]="noData"
            [responsive]="responsive"
          />
        </div>

        <!-- Custom legend — 16px SemiBold, stacked below the ring -->
        <div class="flex flex-col gap-2 mt-4">
          <div class="flex items-center gap-2 text-[16px] font-semibold text-ios-fg leading-[1.4]">
            <span
              class="w-4 h-4 rounded-full bg-ios-success-mid shrink-0"
              aria-hidden="true"
            ></span>
            <span>{{ summary().passed }} {{ lang.t('dashboard.charts.passedExams') }}</span>
          </div>
          <div class="flex items-center gap-2 text-[16px] font-semibold text-ios-fg leading-[1.4]">
            <span class="w-4 h-4 rounded-full bg-ios-danger-mid shrink-0" aria-hidden="true"></span>
            <span>{{ summary().failed }} {{ lang.t('dashboard.charts.failedExams') }}</span>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class DonutChart {
  protected readonly lang = inject(LanguageService);
  readonly summary = input.required<ExamSummary>();

  /** Series values. When both are 0 render a single empty placeholder segment. */
  protected readonly series = computed<number[]>(() => {
    const { passed, failed } = this.summary();
    return passed === 0 && failed === 0 ? [1] : [passed, failed];
  });

  /** Colours: green + red. When empty, use a single light gray segment. */
  protected readonly colors = computed<string[]>(() => {
    const { passed, failed } = this.summary();
    return passed === 0 && failed === 0 ? ['#e5e7eb'] : ['#22c55e', '#ef4444'];
  });

  protected readonly labels = computed<string[]>(() => [
    this.lang.t('dashboard.charts.passedExams'),
    this.lang.t('dashboard.charts.failedExams'),
  ]);

  /* ── Static ApexCharts config ───────────────────────────────────────── */

  protected readonly chartBase: ApexChart = {
    type: 'donut',
    width: 132,
    height: 132,
    toolbar: { show: false },
    sparkline: { enabled: false },
    fontFamily: 'inherit',
    background: 'transparent',
    animations: { enabled: true, speed: 400 },
  };

  protected readonly fill: ApexFill = { type: 'solid' };

  protected readonly dataLabels: ApexDataLabels = { enabled: false };

  protected readonly plotOptions: ApexPlotOptions = {
    pie: {
      donut: {
        size: '72%',
        labels: { show: false },
      },
    },
  };

  protected readonly stroke: ApexStroke = { width: 0 };

  protected readonly legend: ApexLegend = { show: false };

  protected readonly tooltip: ApexTooltip = {
    enabled: true,
    theme: 'light',
    y: { formatter: (v: number) => `${v}` },
  };

  protected readonly noData: ApexNoData = {
    text: '',
  };

  protected readonly responsive: ApexResponsive[] = [
    { breakpoint: 480, options: { chart: { width: 120, height: 120 } } },
  ];
}
