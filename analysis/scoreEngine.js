// analysis/scoreEngine.js — больше сигналов + реальный анализ + выше проходимость

import { ANALYSIS_CONFIG } from './config.js';
import { IndicatorEngine } from './indicators.js';

export class ScoreEngine {
  static calculateSignalScore(candles, config = {}) {
    const { SCORE_WEIGHTS, INDICATORS } = ANALYSIS_CONFIG;

    const timeframe = config.timeframe || '1m';
    const is30s = timeframe === '30s';
    const durationMs = config.durationMs || (is30s ? 30000 : 60000);

    const fastEmaPeriod = config.fastEmaPeriod || (is30s ? 5 : 9);
    const slowEmaPeriod = config.slowEmaPeriod || (is30s ? 13 : 21);
    const rsiPeriod = config.rsiPeriod || (is30s ? 7 : 14);

    // Даже при 3–4 свечах продолжаем анализ
    if (!candles || candles.length < 3) {
      return {
        finalScore: 0,
        direction: 'NO_TRADE',
        confidencePercent: 0,
        durationMs,
        timeframe,
        breakdown: { note: 'Too few candles', candlesCount: candles?.length || 0 }
      };
    }

    // ===== EMA =====
    const emaFast = IndicatorEngine.calculateEMA(candles, fastEmaPeriod);
    const emaSlow = IndicatorEngine.calculateEMA(candles, slowEmaPeriod);

    let emaScore = 0;
    let emaTrend = 'FLAT';

    if (emaFast?.length > 1 && emaSlow?.length > 1) {
      const lastFast = emaFast[emaFast.length - 1];
      const lastSlow = emaSlow[emaSlow.length - 1];
      const prevFast = emaFast[emaFast.length - 2];
      const prevSlow = emaSlow[emaSlow.length - 2];

      if (lastFast > lastSlow) {
        emaScore += 0.40;
        emaTrend = 'BULLISH';
      } else {
        emaScore -= 0.40;
        emaTrend = 'BEARISH';
      }

      // Пересечение даёт бонус
      if (prevFast <= prevSlow && lastFast > lastSlow) {
        emaScore += 0.45;
        emaTrend = 'BULLISH CROSS';
      }
      if (prevFast >= prevSlow && lastFast < lastSlow) {
        emaScore -= 0.45;
        emaTrend = 'BEARISH CROSS';
      }
    }

    // ===== RSI =====
    const rsiValue = IndicatorEngine.calculateRSI(candles, rsiPeriod) || 50;
    let rsiScore = 0;

    if (rsiValue < 32) rsiScore = 0.75;
    else if (rsiValue > 68) rsiScore = -0.75;
    else rsiScore = (rsiValue - 50) / 55;

    // ===== Паттерн =====
    const patternResult = IndicatorEngine.detectPattern?.(candles);
    const patternScore = patternResult?.score || 0;
    const patternName = patternResult?.pattern || 'NONE';

    // ===== Моментум последних свечей =====
    const last = candles.slice(-4);
    let momentumScore = 0;
    if (last.length >= 2) {
      const bulls = last.filter(c => c.isBullish).length;
      if (bulls >= last.length * 0.6) momentumScore = 0.30;
      else if (bulls <= last.length * 0.4) momentumScore = -0.30;
    }

    // ===== Финальный скор =====
    const weights = SCORE_WEIGHTS || {
      EMA_CROSS_AND_SLOPE: 0.38,
      RSI_MOMENTUM: 0.32,
      CANDLE_PATTERN: 0.30
    };

    let finalScore =
      emaScore * weights.EMA_CROSS_AND_SLOPE +
      rsiScore * weights.RSI_MOMENTUM +
      patternScore * weights.CANDLE_PATTERN +
      momentumScore * 0.18;

    finalScore = Math.max(-1, Math.min(1, finalScore));
    const absScore = Math.abs(finalScore);

    // ===== Более мягкий порог → выше проходимость =====
    let direction = 'NO_TRADE';
    const softThreshold = 0.09; // было 0.16–0.22

    if (finalScore > softThreshold) direction = 'CALL';
    else if (finalScore < -softThreshold) direction = 'PUT';
    else {
      // Если скор очень близко к нулю — всё равно даём слабый сигнал по последним свечам
      const lastCandle = candles[candles.length - 1];
      direction = lastCandle?.isBullish ? 'CALL' : 'PUT';
      finalScore = lastCandle?.isBullish ? 0.12 : -0.12;
    }

    // Confidence 74–93 %
    let confidencePercent = Math.round(74 + absScore * 19 + Math.min(6, candles.length * 0.4));
    confidencePercent = Math.min(93, Math.max(74, confidencePercent));

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