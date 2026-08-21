// analysis/config.js - Пороговые значения и весовые коэффициенты аналитического движка
export const ANALYSIS_CONFIG = {
  // Цветовые пороги в HSV диапазонах для свечей Pocket Option
  COLOR_HSV_THRESHOLDS: {
    BULLISH_GREEN: {
      hueMin: 110,
      hueMax: 160,
      satMin: 0.20, // Снижено с 0.35 для захвата полупрозрачных и темных зеленых тонов
      valMin: 0.25
    },
    BEARISH_RED: {
      hueMinRange1: [0, 20],
      hueMinRange2: [330, 360],
      satMin: 0.20, // Снижено с 0.35 для надежного детекта бордовых/красных свечей
      valMin: 0.25
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

  // Весовая модель факторов для Score Engine (Нормализована до суммарных 1.0)
  SCORE_WEIGHTS: {
    EMA_CROSS_AND_SLOPE: 0.40,
    RSI_MOMENTUM: 0.30,
    CANDLE_PATTERN: 0.30
  },

  // Порог уверенности для выдачи сигнала (|Final Score| >= 0.22)
  MIN_SIGNAL_THRESHOLD: 0.22
};