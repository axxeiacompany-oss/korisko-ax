import { ExchangeRates } from '../types';

export interface FetchRateResult {
  success: boolean;
  rates?: {
    USD_TO_BRL: number;
    BRL_TO_PYG: number;
    USD_TO_PYG: number;
  };
  provider: string;
  timestamp: string;
  error?: string;
  details?: {
    usdBrlVariation?: string;
    usdBrlPctChange?: string;
  };
}

/**
 * Fetches real-time exchange rates from public financial market APIs (AwesomeAPI / Open ER API)
 */
export async function fetchLiveExchangeRates(): Promise<FetchRateResult> {
  const timestamp = new Date().toISOString();

  // Attempt 1: AwesomeAPI (Real-time Brazilian financial market API)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL,BRL-PYG,USD-PYG', {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      
      const usdBrl = data.USDBRL ? parseFloat(data.USDBRL.bid) : 0;
      let brlPyg = data.BRLPYG ? parseFloat(data.BRLPYG.bid) : 0;
      let usdPyg = data.USDPYG ? parseFloat(data.USDPYG.bid) : 0;

      // In case BRLPYG is not directly returned or zero, compute via USD
      if (usdBrl > 0 && usdPyg > 0 && (!brlPyg || brlPyg <= 0)) {
        brlPyg = Math.round(usdPyg / usdBrl);
      } else if (usdBrl > 0 && brlPyg > 0 && (!usdPyg || usdPyg <= 0)) {
        usdPyg = Math.round(usdBrl * brlPyg);
      }

      if (usdBrl > 0 && brlPyg > 0) {
        return {
          success: true,
          rates: {
            USD_TO_BRL: Math.round(usdBrl * 100) / 100,
            BRL_TO_PYG: Math.round(brlPyg),
            USD_TO_PYG: Math.round(usdPyg || (usdBrl * brlPyg)),
          },
          provider: 'AwesomeAPI Mercados (Ao Vivo)',
          timestamp,
          details: {
            usdBrlVariation: data.USDBRL?.varBid,
            usdBrlPctChange: data.USDBRL?.pctChange ? `${data.USDBRL.pctChange}%` : undefined,
          },
        };
      }
    }
  } catch (err) {
    console.warn('AwesomeAPI fetch failed or timed out, trying fallback provider...', err);
  }

  // Attempt 2: Open ER API (Global exchange rate feed)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch('https://open.er-api.com/v6/latest/BRL', {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.rates) {
        const usdRate = data.rates.USD; // 1 BRL in USD (e.g. 0.177)
        const pygRate = data.rates.PYG; // 1 BRL in PYG (e.g. 1380)

        const usdBrl = usdRate > 0 ? 1 / usdRate : 5.65;
        const brlPyg = pygRate > 0 ? pygRate : 1380;
        const usdPyg = Math.round(usdBrl * brlPyg);

        return {
          success: true,
          rates: {
            USD_TO_BRL: Math.round(usdBrl * 100) / 100,
            BRL_TO_PYG: Math.round(brlPyg),
            USD_TO_PYG: usdPyg,
          },
          provider: 'Open Exchange Rates (Global)',
          timestamp,
        };
      }
    }
  } catch (err) {
    console.warn('Fallback currency API failed:', err);
  }

  return {
    success: false,
    provider: 'Offline / Armazenamento Local',
    timestamp,
    error: 'Não foi possível conectar aos servidores de câmbio no momento. As cotações salvas foram mantidas.',
  };
}
