// analysis/scoreEngine.js - Улучшенный скоринг + больше свечей + честный NO_TRADE

import { ANALYSIS_CONFIG } from './config.js';
import { IndicatorEngine } from './indicators.js';

export class ScoreEngine {
  static calculateSignalScore(candles, config = {}) {
    const { SCORE_WEIGHTS, INDICATORS, MIN_SIGNAL_THRESHOLD } = ANALYSIS_CONFIG;

    const timeframe = config.timeframe || '1m';
    const is30s = timeframe === '30s';
    const durationMs = config.durationMs || (is30s ? 30000 : 60000);

    const fastEmaPeriod = config.fastEmaPeriod || (is30s ? 5 : (INDICATORS?.EMA_FAST_PERIOD || 9));
    const slowEmaPeriod = config.slowEmaPeriod || (is30s ? 13 : (INDICATORS?.EMA_SLOW_PERIOD || 21));
    const rsiPeriod = config.rsiPeriod || (is30s ? 7 : (INDICATORS?.RSI_PERIOD || 14));

    // ===== Меньше свечей = всё равно пробуем, но с пониженной уверенностью =====
    if (!candles || candles.length < 3) {
      return {
        finalScore: 0,
        direction: 'NO_TRADE',
        confidencePercent: 0,
        durationMs,
        timeframe,
        breakdown: { note: 'Too few candles detected', candlesCount: candles?.length || 0 }
      };
    }

    // 1. EMA
    const emaFast = IndicatorEngine.calculateEMA(candles, fastEmaPeriod);
    const emaSlow = IndicatorEngine.calculateEMA(candles, slowEmaPeriod);

    let emaScore = 0;
    let emaTrend = 'FLAT';

    if (emaFast && emaSlow && emaFast.length > 1 && emaSlow.length > 1) {
      const lastFast = emaFast[emaFast.length - 1];
      const lastSlow = emaSlow[emaSlow.length - 1];
      const prevFast = emaFast[emaFast.length - 2];
      const prevSlow = emaSlow[emaSlow.length - 2];

      if (lastFast > lastSlow) {
        emaScore += 0.45;
        emaTrend = 'BULLISH';
      } else if (lastFast < lastSlow) {
        emaScore -= 0.45;
        emaTrend = 'BEARISH';
      }

      // Пересечение
      if (prevFast <= prevSlow && lastFast > lastSlow) {
        emaScore += 0.55;
        emaTrend = 'BULLISH CROSS';
      }
      if (prevFast >= prevSlow && lastFast < lastSlow) {
        emaScore -= 0.55;
        emaTrend = 'BEARISH CROSS';
      }
    }

    // 2. RSI
    const rsiValue = IndicatorEngine.calculateRSI(candles, rsiPeriod) || 50;
    const overbought = INDICATORS?.RSI_OVERBOUGHT || 70;
    const oversold = INDICATORS?.RSI_OVERSOLD || 30;

    let rsiScore = 0;
    if (rsiValue < oversold) {
      rsiScore = 0.85;           // сильная перепроданность
    } else if (rsiValue > overbought) {
      rsiScore = -0.85;          // сильная перекупленность
    } else {
      rsiScore = (rsiValue - 50) / 50; // -1 ... +1
    }

    // 3. Price Action
    const patternResult = IndicatorEngine.detectPattern(candles);
    const patternScore = patternResult ? patternResult.score : 0;
    const patternName = patternResult?.pattern || 'NONE';

    // 4. Дополнительный фактор — сила последних свечей
    const last3 = candles.slice(-3);
    let momentumScore = 0;
    if (last3.length >= 2) {
      const bullishCount = last3.filter(c => c.isBullish).length;
      if (bullishCount >= 2) momentumScore = 0.25;
      else if (bullishCount <= 1) momentumScore = -0.25;
    }

    // 5. Финальный скор
    const weights = SCORE_WEIGHTS || {
      EMA_CROSS_AND_SLOPE: 0.40,
      RSI_MOMENTUM: 0.30,
      CANDLE_PATTERN: 0.30
    };

    let finalScore =
      (emaScore * weights.EMA_CROSS_AND_SLOPE) +
      (rsiScore * weights.RSI_MOMENTUM) +
      (patternScore * weights.CANDLE_PATTERN) +
      (momentumScore * 0.15);

    // Нормализация
    finalScore = Math.max(-1, Math.min(1, finalScore));
    const absScore = Math.abs(finalScore);

    // ===== Честное направление =====
    let direction = 'NO_TRADE';
    const threshold = MIN_SIGNAL_THRESHOLD || 0.18;

    if (finalScore > threshold) {
      direction = 'CALL';
    } else if (finalScore < -threshold) {
      direction = 'PUT';
    }

    // Confidence: 72–96 % в зависимости от силы + количества свечей
    let confidencePercent = 0;
    if (direction !== 'NO_TRADE') {
      const base = 72 + absScore * 24;
      const candleBonus = Math.min(8, candles.length * 0.6); // больше свечей = чуть выше уверенность
      confidencePercent = Math.min(96, Math.round(base + candleBonus));
    }

    return {
      finalScore: +finalScore.toFixed(3),
      direction,
      confidencePercent,
      durationMs,
      timeframe,
      breakdown: {
        emaScore: +emaScore.toFixed(2),
        emaTrend,
        rsiScore: +rsiScore.toFixed(2),
        rsiValue: +rsiValue.toFixed(1),
        patternScore: +patternScore.toFixed(2),
        patternName,
        momentumScore: +momentumScore.toFixed(2),
        candlesUsed: candles.length
      }
    };
  }
}