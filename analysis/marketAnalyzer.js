// analysis/marketAnalyzer.js - Главный координатор анализа рынка
import { ColorDetector } from './colorDetector.js';
import { CandleDetector } from './candleDetector.js';
import { ScoreEngine } from './scoreEngine.js';

export class MarketAnalyzer {
  /**
   * Полный цикл анализа графического кадра с учетом выбранного таймфрейма
   * @param {ImageData} imageData 
   * @param {string} timeframe - '30s' или '1m'
   * @returns {{candlesCount: number, candles: Array, timeframe: string, signal: object}}
   */
  static analyzeFrame(imageData, timeframe = '1m') {
    if (!imageData || !imageData.data) {
      return this.getFallbackResponse(timeframe, "Отсутствуют данные изображения");
    }

    // Параметры конфигурации под таймфрейм
    const is30s = timeframe === '30s';
    const config = {
      timeframe,
      durationMs: is30s ? 30000 : 60000,
      rsiPeriod: is30s ? 7 : 14,          // Быстрый RSI для 30s
      fastEmaPeriod: is30s ? 5 : 9,      // Быстрая EMA для micro-movements
      slowEmaPeriod: is30s ? 13 : 21     // Медленная EMA
    };

    // 1. Извлечение пикселей свечей
    const detectionData = ColorDetector.detectCandlePixels(imageData);

    // 2. Реконструкция свечей (OHLC)
    const candles = CandleDetector.extractCandles(detectionData);

    // Безопасная проверка: если свечи не найдены
    if (!candles || candles.length === 0) {
      return this.getFallbackResponse(timeframe, "Свечи не обнаружены на графике");
    }

    // 3. Расчет индикаторов и итогового скоринга с учетом параметров таймфрейма
    const signalResult = ScoreEngine.calculateSignalScore(candles, config);

    // Гарантируем наличие durationMs в объекте сигнала
    if (signalResult) {
      signalResult.durationMs = config.durationMs;
      signalResult.timeframe = timeframe;
    }

    return {
      candlesCount: candles.length,
      candles,
      timeframe,
      signal: signalResult
    };
  }

  /**
   * Запасной ответ на случай отсутствия кадра или ошибок сканирования
   */
  static getFallbackResponse(timeframe, reason = "Ошибка сканирования") {
    const is30s = timeframe === '30s';
    return {
      candlesCount: 0,
      candles: [],
      timeframe,
      signal: {
        direction: 'NO_TRADE',
        confidencePercent: 0,
        finalScore: 0,
        durationMs: is30s ? 30000 : 60000,
        reason,
        breakdown: {
          rsiValue: 50,
          emaScore: 0,
          patternName: 'NONE'
        }
      }
    };
  }
}