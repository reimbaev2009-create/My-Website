// analysis/indicators.js - Расчет EMA, RSI и определение паттернов Price Action
import { ANALYSIS_CONFIG } from './config.js';

export class IndicatorEngine {
  /**
   * Расчет экспоненциального скользящего среднего (EMA)
   * @param {Array<{close: number}>} candles 
   * @param {number} period 
   * @returns {Array<number>}
   */
  static calculateEMA(candles, period) {
    if (!candles || candles.length < period || period <= 0) return [];
    const k = 2 / (period + 1);
    const closes = candles.map(c => c.close);
    
    let ema = closes.slice(0, period).reduce((sum, val) => sum + val, 0) / period;
    const emaArray = [ema];

    for (let i = period; i < closes.length; i++) {
      ema = closes[i] * k + ema * (1 - k);
      emaArray.push(parseFloat(ema.toFixed(4)));
    }

    return emaArray;
  }

  /**
   * Расчет индекса относительной силы (RSI)
   * @param {Array<{close: number}>} candles 
   * @param {number} [period] 
   * @returns {number} Значение RSI (0 - 100)
   */
  static calculateRSI(candles, period) {
    const defaultPeriod = ANALYSIS_CONFIG?.INDICATORS?.RSI_PERIOD || 14;
    const activePeriod = (period && period > 0) ? period : defaultPeriod;

    if (!candles || candles.length <= activePeriod) return 50;

    const closes = candles.map(c => c.close);
    let gains = 0;
    let losses = 0;

    for (let i = 1; i <= activePeriod; i++) {
      const diff = closes[i] - closes[i - 1];
      if (diff >= 0) gains += diff;
      else losses += Math.abs(diff);
    }

    let avgGain = gains / activePeriod;
    let avgLoss = losses / activePeriod;

    for (let i = activePeriod + 1; i < closes.length; i++) {
      const diff = closes[i] - closes[i - 1];
      const gain = diff >= 0 ? diff : 0;
      const loss = diff < 0 ? Math.abs(diff) : 0;

      avgGain = (avgGain * (activePeriod - 1) + gain) / activePeriod;
      avgLoss = (avgLoss * (activePeriod - 1) + loss) / activePeriod;
    }

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return parseFloat((100 - (100 / (1 + rs))).toFixed(2));
  }

  /**
   * Распознавание Price Action паттернов (Engulfing, Pinbar)
   * @param {Array<{open: number, high: number, low: number, close: number, isBullish: boolean, wickTop?: number, wickBottom?: number}>} candles 
   * @returns {{pattern: string, score: number}}
   */
  static detectPattern(candles) {
    if (!candles || candles.length < 2) return { pattern: 'NONE', score: 0 };

    const current = candles[candles.length - 1];
    const prev = candles[candles.length - 2];

    // Bullish Engulfing
    if (!prev.isBullish && current.isBullish && current.close > prev.open && current.open < prev.close) {
      return { pattern: 'BULLISH_ENGULFING', score: 0.8 };
    }
    // Bearish Engulfing
    if (prev.isBullish && !current.isBullish && current.close < prev.open && current.open > prev.close) {
      return { pattern: 'BEARISH_ENGULFING', score: -0.8 };
    }

    // Pinbar detection
    const totalHeight = Math.max(0.001, current.high - current.low);
    const wickBottom = current.wickBottom !== undefined ? current.wickBottom : Math.min(current.open, current.close) - current.low;
    const wickTop = current.wickTop !== undefined ? current.wickTop : current.high - Math.max(current.open, current.close);

    if (wickBottom / totalHeight > 0.6) {
      return { pattern: 'BULLISH_PINBAR', score: 0.6 };
    }
    if (wickTop / totalHeight > 0.6) {
      return { pattern: 'BEARISH_PINBAR', score: -0.6 };
    }

    return { pattern: 'NONE', score: 0 };
  }
}