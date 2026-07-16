import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { NgApexchartsModule } from 'ng-apexcharts';
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

import { LanguageService } from '@core/i18n';

import { type MonthlyRevenuePoint, formatMoney } from '../data-access/dashboard.model';

/**
 * `ios-admin-revenue-chart` — ApexCharts column chart for the admin dashboard's
 * monthly revenue series (B6). Feature-local presentational component.
 *
 * The shared `@ui` charts (`ios-bar-chart` / `ios-donut-chart`) are hard-wired to
 * the student dashboard's semantics — a fixed 0–100 % score axis and mock-test
 * labels — so they can't render currency amounts without distorting the axis.
 * This wraps the already-bundled `apx-chart` directly (no new chart library),
 * with a currency-aware Y axis and tooltip.
 */
@Component({
  selector: 'ios-admin-revenue-chart',
  imports: [NgApexchartsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-white rounded-2xl border border-gray-200 p-5">
      <apx-chart
        [series]="series()"
        [chart]="chart"
        [xaxis]="xaxis()"
        [yaxis]="yaxis()"
        [colors]="colors"
        [fill]="fill"
        [dataLabels]="dataLabels"
        [plotOptions]="plotOptions"
        [grid]="grid"
        [stroke]="stroke"
        [tooltip]="tooltip()"
        [noData]="noData()"
      />
    </div>
  `,
})
export class AdminRevenueChart {
  protected readonly lang = inject(LanguageService);

  readonly points = input.required<readonly MonthlyRevenuePoint[]>();
  /** Currency of the amounts (may be the `"MIXED"` sentinel). */
  readonly currency = input<string>('');

  protected readonly series = computed(() => [
    {
      name: this.lang.t('admin.home.metrics.revenueChartSeries'),
      data: this.points().map((p) => p.revenue),
    },
  ]);

  protected readonly xaxis = computed<ApexXAxis>(() => ({
    categories: this.points().map((p) => p.month),
    axisBorder: { show: false },
    axisTicks: { show: false },
    labels: { style: { colors: '#9ca3af', fontSize: '11px', fontFamily: 'inherit' } },
  }));

  protected readonly yaxis = computed<ApexYAxis>(() => {
    const locale = this.lang.locale();
    const currency = this.currency();
    return {
      min: 0,
      labels: {
        formatter: (v: number) => formatMoney(v, currency, locale),
        style: { colors: '#9ca3af', fontSize: '11px', fontFamily: 'inherit' },
      },
    };
  });

  protected readonly tooltip = computed<ApexTooltip>(() => {
    const locale = this.lang.locale();
    const currency = this.currency();
    return {
      theme: 'light',
      y: { formatter: (v: number) => formatMoney(v, currency, locale) },
    };
  });

  protected readonly noData = computed<ApexNoData>(() => ({
    text: this.lang.t('admin.home.metrics.revenueChartEmpty'),
    style: { color: '#9ca3af', fontSize: '12px', fontFamily: 'inherit' },
  }));

  protected readonly chart: ApexChart = {
    type: 'bar',
    height: 260,
    toolbar: { show: false },
    fontFamily: 'inherit',
    background: 'transparent',
    animations: { enabled: true, speed: 400 },
  };

  protected readonly colors: string[] = ['#8b0000'];
  protected readonly fill: ApexFill = { type: 'solid' };
  protected readonly dataLabels: ApexDataLabels = { enabled: false };
  protected readonly plotOptions: ApexPlotOptions = {
    bar: { columnWidth: '45%', borderRadius: 3, borderRadiusApplication: 'end' },
  };
  protected readonly grid: ApexGrid = {
    borderColor: '#e5e7eb',
    strokeDashArray: 0,
    xaxis: { lines: { show: false } },
    yaxis: { lines: { show: true } },
    padding: { left: 0, right: 0 },
  };
  protected readonly stroke: ApexStroke = { show: false };
}

export default AdminRevenueChart;
