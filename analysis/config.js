// analysis/config.js - Пороговые значения и весовые коэффициенты аналитического движка
export const ANALYSIS_CONFIG = {
  // Расширенные цветовые пороги под реальные цвета Pocket Option
  COLOR_HSV_THRESHOLDS: {
    BULLISH_GREEN: {
      hueMin: 70,        // было 110 — сильно расширили в сторону салатового/лаймового
      hueMax: 170,       // было 160
      satMin: 0.12,      // было 0.20 — ловим более бледные и полупрозрачные зелёные
      valMin: 0.18       // было 0.25
    },
    BEARISH_RED: {
      hueMinRange1: [0, 35],     // было [0, 20] — захватываем оранжево-красные
      hueMinRange2: [320, 360],  // было [330, 360]
      satMin: 0.12,
      valMin: 0.18
    }
  },

  // Настройки индикаторов по умолчанию (1m)
  INDICATORS: {
    EMA_FAST_PERIOD: 9,
    EMA_SLOW_PERIOD: 21,
    RSI_PERIOD: 14,
    RSI_OVERBOUGHT: 70,
    RSI_OVERSOLD: 30,
    ATR_PERIOD: 14
  },

  // Специализированные конфиги индикаторов под разные таймфреймы
  TIMEFRAME_CONFIGS: {
    '30s': {
      durationMs: 30000,
      EMA_FAST_PERIOD: 5,
      EMA_SLOW_PERIOD: 13,
      RSI_PERIOD: 7,
      RSI_OVERBOUGHT: 70,
      RSI_OVERSOLD: 30
    },
    '1m': {
      durationMs: 60000,
      EMA_FAST_PERIOD: 9,
      EMA_SLOW_PERIOD: 21,
      RSI_PERIOD: 14,
      RSI_OVERBOUGHT: 70,
      RSI_OVERSOLD: 30
    }
  },

  // Весовая модель факторов для Score Engine
  SCORE_WEIGHTS: {
    EMA_CROSS_AND_SLOPE: 0.40,
    RSI_MOMENTUM: 0.30,
    CANDLE_PATTERN: 0.30
  },

  // Порог уверенности для выдачи сигнала
  MIN_SIGNAL_THRESHOLD: 0.09
};