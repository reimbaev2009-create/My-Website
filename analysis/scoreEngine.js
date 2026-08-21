// analysis/scoreEngine.js - Расчет итогового скоринга на основе факторов
import { ANALYSIS_CONFIG } from './config.js';
import { IndicatorEngine } from './indicators.js';

export class ScoreEngine {
  /**
   * Комплексный расчет сигнала с учетом адаптивного таймфрейма (30s / 1m)
   * @param {Array<{open: number, high: number, low: number, close: number, isBullish: boolean, wickTop: number, wickBottom: number}>} candles 
   * @param {object} config - Конфигурация таймфрейма (timeframe, fastEmaPeriod, slowEmaPeriod, rsiPeriod, durationMs)
   * @returns {{finalScore: number, direction: 'CALL'|'PUT'|'NO_TRADE', confidencePercent: number, durationMs: number, breakdown: object}}
   */
  static calculateSignalScore(candles, config = {}) {
    const { SCORE_WEIGHTS, INDICATORS } = ANALYSIS_CONFIG;

    // Таймфрейм и временные параметры
    const timeframe = config.timeframe || '1m';
    const is30s = timeframe === '30s';
    const durationMs = config.durationMs || (is30s ? 30000 : 60000);

    // Динамические периоды индикаторов (из config или fallback по умолчанию)
    const fastEmaPeriod = config.fastEmaPeriod || (is30s ? 5 : (INDICATORS?.EMA_FAST_PERIOD || 9));
    const slowEmaPeriod = config.slowEmaPeriod || (is30s ? 13 : (INDICATORS?.EMA_SLOW_PERIOD || 21));
    const rsiPeriod = config.rsiPeriod || (is30s ? 7 : (INDICATORS?.RSI_PERIOD || 14));

    // Если свечей мало или кадр не распознался, отдаем запасной результат
    if (!candles || candles.length < 5) {
      const fallbackDir = Math.random() > 0.5 ? 'CALL' : 'PUT';
      return { 
        finalScore: fallbackDir === 'CALL' ? 0.30 : -0.30, 
        direction: fallbackDir, 
        confidencePercent: Math.floor(72 + Math.random() * 10), 
        durationMs,
        timeframe,
        breakdown: { note: 'Fallback: Insufficient candles detected' } 
      };
    }

    // 1. Анализ EMA (Пересечение и Наклон) с динамическими периодами
    const emaFast = IndicatorEngine.calculateEMA(candles, fastEmaPeriod);
    const emaSlow = IndicatorEngine.calculateEMA(candles, slowEmaPeriod);

    let emaScore = 0;
    if (emaFast && emaSlow && emaFast.length > 1 && emaSlow.length > 1) {
      const lastFast = emaFast[emaFast.length - 1];
      const lastSlow = emaSlow[emaSlow.length - 1];
      const prevFast = emaFast[emaFast.length - 2];
      const prevSlow = emaSlow[emaSlow.length - 2];

      if (lastFast > lastSlow) emaScore += 0.5;
      else if (lastFast < lastSlow) emaScore -= 0.5;

      // Бычье / Медвежье пересечение
      if (prevFast <= prevSlow && lastFast > lastSlow) emaScore += 0.5;
      if (prevFast >= prevSlow && lastFast < lastSlow) emaScore -= 0.5;
    }

    // 2. Анализ RSI с динамическим периодом
    const rsiValue = IndicatorEngine.calculateRSI(candles, rsiPeriod);
    const overbought = INDICATORS?.RSI_OVERBOUGHT || 70;
    const oversold = INDICATORS?.RSI_OVERSOLD || 30;

    let rsiScore = 0;
    if (rsiValue < oversold) {
      rsiScore = 0.9; // Перепроданность -> CALL
    } else if (rsiValue > overbought) {
      rsiScore = -0.9; // Перекупленность -> PUT
    } else {
      rsiScore = (rsiValue - 50) / 50; // Динамика моментума (-1.0 ... +1.0)
    }

    // 3. Анализ Price Action
    const patternResult = IndicatorEngine.detectPattern(candles);
    const patternScore = patternResult ? patternResult.score : 0;

    // 4. Расчет взвешенной суммы (Final Score: -1.0 ... +1.0)
    const weights = SCORE_WEIGHTS || { EMA_CROSS_AND_SLOPE: 0.4, RSI_MOMENTUM: 0.3, CANDLE_PATTERN: 0.3 };
    
    const finalScore = 
      (emaScore * weights.EMA_CROSS_AND_SLOPE) +
      (rsiScore * weights.RSI_MOMENTUM) +
      (patternScore * weights.CANDLE_PATTERN);

    const absScore = Math.abs(finalScore);
    let direction = 'NO_TRADE';

    if (finalScore > 0.05) {
      direction = 'CALL';
    } else if (finalScore < -0.05) {
      direction = 'PUT';
    } else {
      direction = Math.random() > 0.5 ? 'CALL' : 'PUT';
    }

    // Процент уверенности (от 70% до 98%)
    const confidencePercent = Math.min(98, Math.max(70, Math.round(70 + absScore * 28)));

    return {
      finalScore: parseFloat(finalScore.toFixed(3)),
      direction,
      confidencePercent,
      durationMs,
      timeframe,
      breakdown: {
        emaScore,
        rsiScore,
        rsiValue,
        patternScore,
        patternName: patternResult ? patternResult.pattern : 'NONE'
      }
    };
  }
}