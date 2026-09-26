/**
 * One display format for every certification fee in the app (IDD-356):
 * symbol, amount, ISO code — `$130 USD`, `$175.50 USD`.
 *
 * - Whole amounts drop the `.00`; amounts with cents keep two decimals.
 * - The number follows the UI locale (digits, decimal separator), but the
 *   symbol is always the short English one. `Intl` in `ar` renders the symbol
 *   as `US$`, which next to the appended code would read `US$ USD`.
 * - Wrapped in a Unicode LTR isolate so `$130 USD` keeps its order inside
 *   right-to-left (Arabic) text.
 * - A currency with no distinct symbol renders as the amount and code only
 *   (`130 CHF`), never the code twice.
 */
export function formatFee(amount: number, currency: string, locale: string): string {
  const code = currency.toUpperCase();
  const whole = Number.isInteger(amount);
  const number = new Intl.NumberFormat(locale, {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));

  const sign = amount < 0 ? '-' : '';
  const symbol = currencySymbol(code);
  const body = symbol ? `${sign}${symbol}${number} ${code}` : `${sign}${number} ${code}`;
  return `⁦${body}⁩`;
}

/** Short English symbol for `code` (`$`, `€`), or `''` when it has none or is invalid. */
function currencySymbol(code: string): string {
  try {
    const part = new Intl.NumberFormat('en', {
      style: 'currency',
      currency: code,
      currencyDisplay: 'narrowSymbol',
    })
      .formatToParts(0)
      .find((p) => p.type === 'currency')?.value;
    return part && part !== code ? part : '';
  } catch {
    return '';
  }
}
