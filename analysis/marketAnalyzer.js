// analysis/marketAnalyzer.js - Главный координатор анализа рынка
import { ColorDetector } from './colorDetector.js';
import { CandleDetector } from './candleDetector.js';
import { ScoreEngine } from './scoreEngine.js';

export class MarketAnalyzer {
  /**
   * Полный цикл анализа графического кадра
   * @param {ImageData} imageData 
   * @returns {{candlesCount: number, candles: Array, signal: object}}
   */
  static analyzeFrame(imageData) {
    // 1. Извлечение пикселей свечей
    const detectionData = ColorDetector.detectCandlePixels(imageData);

    // 2. Реконструкция свечей (OHLC)
    const candles = CandleDetector.extractCandles(detectionData);

    // 3. Расчет индикаторов и итогового скоринга
    const signalResult = ScoreEngine.calculateSignalScore(candles);

    return {
      candlesCount: candles.length,
      candles,
      signal: signalResult
    };
  }
}