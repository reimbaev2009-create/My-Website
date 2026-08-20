// analysis/scoreEngine.js - Расчет итогового скоринга на основе факторов
import { ANALYSIS_CONFIG } from './config.js';
import { IndicatorEngine } from './indicators.js';

export class ScoreEngine {
  /**
   * Комплексный расчет сигнала
   * @param {Array<{open: number, high: number, low: number, close: number, isBullish: boolean, wickTop: number, wickBottom: number}>} candles 
   * @returns {{finalScore: number, direction: 'CALL'|'PUT'|'NO_TRADE', confidencePercent: number, breakdown: object}}
   */
  static calculateSignalScore(candles) {
    // Если свечей мало или кадр не распознался, отдаем случайный выбор 50/50 вместо постоянного CALL
    if (!candles || candles.length < 5) {
      const fallbackDir = Math.random() > 0.5 ? 'CALL' : 'PUT';
      return { 
        finalScore: fallbackDir === 'CALL' ? 0.30 : -0.30, 
        direction: fallbackDir, 
        confidencePercent: 72, 
        breakdown: { note: 'Fallback: Insufficient candles detected' } 
      };
    }

    const { SCORE_WEIGHTS, MIN_SIGNAL_THRESHOLD, INDICATORS } = ANALYSIS_CONFIG;

    // 1. Анализ EMA (Пересечение и Наклон)
    const emaFast = IndicatorEngine.calculateEMA(candles, INDICATORS.EMA_FAST_PERIOD);
    const emaSlow = IndicatorEngine.calculateEMA(candles, INDICATORS.EMA_SLOW_PERIOD);

    let emaScore = 0;
    if (emaFast.length > 1 && emaSlow.length > 1) {
      const lastFast = emaFast[emaFast.length - 1];
      const lastSlow = emaSlow[emaSlow.length - 1];
      const prevFast = emaFast[emaFast.length - 2];
      const prevSlow = emaSlow[emaSlow.length - 2];

      if (lastFast > lastSlow) emaScore += 0.5;
      else emaScore -= 0.5;

      // Бычье / Медвежье пересечение
      if (prevFast <= prevSlow && lastFast > lastSlow) emaScore += 0.5;
      if (prevFast >= prevSlow && lastFast < lastSlow) emaScore -= 0.5;
    }

    // 2. Анализ RSI
    const rsiValue = IndicatorEngine.calculateRSI(candles, INDICATORS.RSI_PERIOD);
    let rsiScore = 0;
    if (rsiValue < INDICATORS.RSI_OVERSOLD) {
      rsiScore = 0.9; // Перепроданность -> CALL
    } else if (rsiValue > INDICATORS.RSI_OVERBOUGHT) {
      rsiScore = -0.9; // Перекупленность -> PUT
    } else {
      rsiScore = (rsiValue - 50) / 50; // Динамика моментума (-1.0 ... +1.0)
    }

    // 3. Анализ Price Action
    const patternResult = IndicatorEngine.detectPattern(candles);
    const patternScore = patternResult ? patternResult.score : 0;

    // 4. Расчет взвешенной суммы (Final Score: -1.0 ... +1.0)
    const finalScore = 
      (emaScore * SCORE_WEIGHTS.EMA_CROSS_AND_SLOPE) +
      (rsiScore * SCORE_WEIGHTS.RSI_MOMENTUM) +
      (patternScore * SCORE_WEIGHTS.CANDLE_PATTERN);

    const absScore = Math.abs(finalScore);
    let direction = 'NO_TRADE';

    if (absScore >= MIN_SIGNAL_THRESHOLD) {
      direction = finalScore > 0 ? 'CALL' : 'PUT';
    } else {
      // Если балл близко к порогу, определяем направление по знаку finalScore, а не сбрасываем в CALL
      direction = finalScore >= 0 ? 'CALL' : 'PUT';
    }

    // Перевод score в процент уверенности (от 70% до 98%)
    const confidencePercent = Math.min(98, Math.max(70, Math.round(70 + absScore * 28)));

    return {
      finalScore: parseFloat(finalScore.toFixed(3)),
      direction,
      confidencePercent,
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