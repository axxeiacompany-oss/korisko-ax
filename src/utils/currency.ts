import { Currency, ExchangeRates } from '../types';

export const DEFAULT_EXCHANGE_RATES: ExchangeRates = {
  BRL_TO_PYG: 1,
  USD_TO_BRL: 1,
  USD_TO_PYG: 1,
  updatedAt: new Date().toISOString(),
};

/**
 * Sistema operando exclusivamente em Guaranis (₲ PYG).
 * Formata sempre no padrão oficial paraguaio sem casas decimais e com separador de milhar.
 */
export function formatCurrency(amount: number, _currency?: Currency): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    amount = 0;
  }

  const roundedPyg = Math.round(amount);
  return `₲ ${new Intl.NumberFormat('es-PY', {
    maximumFractionDigits: 0,
  }).format(roundedPyg)}`;
}

export function formatBrl(amount: number): string {
  return formatCurrency(amount, 'PYG');
}

/**
 * Moeda base nativa: Guaraní (PYG) 1:1
 */
export function toBrl(amount: number, _from?: Currency, _rates?: ExchangeRates): number {
  if (!amount || amount <= 0) return 0;
  return Math.round(amount);
}

/**
 * Retorna o valor em Guaraní (PYG)
 */
export function fromBrl(amount: number, _to?: Currency, _rates?: ExchangeRates): number {
  if (!amount || amount <= 0) return 0;
  return Math.round(amount);
}

/**
 * Conversão direta (todas as operações em Guaraní)
 */
export function convertCurrency(
  amount: number,
  _from: Currency,
  _to: Currency,
  _rates?: ExchangeRates
): number {
  return Math.round(amount || 0);
}

/**
 * Símbolo oficial da moeda única do sistema: ₲ (Guaraní)
 */
export function getCurrencySymbol(_currency?: Currency): string {
  return '₲';
}

/**
 * Nome de exibição da moeda do sistema
 */
export function getCurrencyName(_currency?: Currency): string {
  return 'Guaraní (Paraguay)';
}
