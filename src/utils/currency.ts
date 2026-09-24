import { Currency, ExchangeRates } from '../types';

export const DEFAULT_EXCHANGE_RATES: ExchangeRates = {
  BRL_TO_PYG: 1380, // 1 Real = 1.380 Guaranis
  USD_TO_BRL: 5.65, // 1 Dólar = 5,65 Reais
  USD_TO_PYG: 7800, // 1 Dólar = 7.800 Guaranis
  updatedAt: new Date().toISOString(),
};

/**
 * Format currency with official symbols and localization
 */
export function formatCurrency(amount: number, currency: Currency): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    amount = 0;
  }

  switch (currency) {
    case 'BRL':
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);

    case 'PYG':
      // Guaraní has no decimal fractions in daily trade
      const roundedPyg = Math.round(amount);
      return `₲ ${new Intl.NumberFormat('es-PY', {
        maximumFractionDigits: 0,
      }).format(roundedPyg)}`;

    case 'USD':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);

    default:
      return `${amount}`;
  }
}

/**
 * Convert any amount from one currency to BRL (base internal accounting currency)
 */
export function toBrl(amount: number, from: Currency, rates: ExchangeRates): number {
  if (!amount || amount <= 0) return 0;
  switch (from) {
    case 'BRL':
      return amount;
    case 'USD':
      return amount * rates.USD_TO_BRL;
    case 'PYG':
      return rates.BRL_TO_PYG > 0 ? amount / rates.BRL_TO_PYG : 0;
  }
}

/**
 * Convert an amount in BRL to another currency
 */
export function fromBrl(amountBrl: number, to: Currency, rates: ExchangeRates): number {
  if (!amountBrl || amountBrl <= 0) return 0;
  switch (to) {
    case 'BRL':
      return amountBrl;
    case 'USD':
      return rates.USD_TO_BRL > 0 ? amountBrl / rates.USD_TO_BRL : 0;
    case 'PYG':
      return Math.round(amountBrl * rates.BRL_TO_PYG);
  }
}

/**
 * Convert between any two currencies directly
 */
export function convertCurrency(
  amount: number,
  from: Currency,
  to: Currency,
  rates: ExchangeRates
): number {
  if (from === to) return amount;
  const inBrl = toBrl(amount, from, rates);
  return fromBrl(inBrl, to, rates);
}

/**
 * Get currency symbol
 */
export function getCurrencySymbol(currency: Currency): string {
  switch (currency) {
    case 'BRL':
      return 'R$';
    case 'PYG':
      return '₲';
    case 'USD':
      return '$';
  }
}

/**
 * Get currency display name
 */
export function getCurrencyName(currency: Currency): string {
  switch (currency) {
    case 'BRL':
      return 'Real (Brasil)';
    case 'PYG':
      return 'Guaraní (Paraguay)';
    case 'USD':
      return 'Dólar Comercial (USD)';
  }
}
