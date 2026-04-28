export type CurrencyConfig = {
  symbol: string;
  locale?: string;
};

const DEFAULT_CURRENCY: CurrencyConfig = {
  symbol: 'RD$',
  locale: 'es-DO',
};

export function getCurrencyConfig(): CurrencyConfig {
  const symbol = (process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '').trim();
  const locale = (process.env.NEXT_PUBLIC_LOCALE || '').trim();
  return {
    symbol: symbol || DEFAULT_CURRENCY.symbol,
    locale: locale || DEFAULT_CURRENCY.locale,
  };
}

export function formatMoney(value?: number): string {
  const { symbol, locale } = getCurrencyConfig();
  const n = Number(value || 0);
  try {
    const formatted = new Intl.NumberFormat(locale || undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n);
    return `${symbol}${formatted}`;
  } catch {
    return `${symbol}${n.toFixed(0)}`;
  }
}
