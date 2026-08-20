// analysis/config.js - Пороговые значения и весовые коэффициенты аналитического движка
export const ANALYSIS_CONFIG = {
  // Цветовые пороги в HSV диапазонах для свечей Pocket Option
  COLOR_HSV_THRESHOLDS: {
    BULLISH_GREEN: {
      hueMin: 110,
      hueMax: 160,
      satMin: 0.35,
      valMin: 0.35
    },
    BEARISH_RED: {
      hueMinRange1: [0, 15],
      hueMinRange2: [340, 360],
      satMin: 0.35,
      valMin: 0.35
    }
  },

  // Параметры технических индикаторов
  INDICATORS: {
    EMA_FAST_PERIOD: 9,
    EMA_SLOW_PERIOD: 21,
    RSI_PERIOD: 14,
    RSI_OVERBOUGHT: 70,
    RSI_OVERSOLD: 30,
    ATR_PERIOD: 14
  },

  // Весовая модель факторов для Score Engine (-1.0 ... +1.0)
  SCORE_WEIGHTS: {
    EMA_CROSS_AND_SLOPE: 0.25,
    RSI_MOMENTUM: 0.20,
    CANDLE_PATTERN: 0.25,
    SUPPORT_RESISTANCE: 0.20,
    VOLATILITY_FACTOR: 0.10
  },

  // Порог уверенности для выдачи сигнала
  MIN_SIGNAL_THRESHOLD: 0.35 // Если |Final Score| < 0.35, сигнал NO TRADE
};