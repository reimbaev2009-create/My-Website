// chartAnalyzer.js - Мост между видеопотоком экрана и модулем анализа
import { MarketAnalyzer } from './analysis/marketAnalyzer.js';

export class ChartAnalyzer {
  /**
   * Захват текущего кадра с видеотега и отправка на глубокий анализ
   * @param {HTMLVideoElement} videoElement 
   * @param {HTMLCanvasElement} canvasElement 
   * @param {string} timeframe - Таймфрейм сигнала ('30s' или '1m')
   * @returns {object|null}
   */
  static processCurrentFrame(videoElement, canvasElement, timeframe = '1m') {
    // Проверка наличия видео и активных размеров кадра
    if (!videoElement || !videoElement.videoWidth || !videoElement.videoHeight || videoElement.readyState < 2) {
      console.warn("ChartAnalyzer: Видеопоток недоступен или ещё не загрузился.");
      return null;
    }

    const ctx = canvasElement.getContext('2d', { willReadFrequently: true });
    canvasElement.width = videoElement.videoWidth;
    canvasElement.height = videoElement.videoHeight;

    // Отрисовка текущего кадра с Pocket Option на холсте
    ctx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
    const imageData = ctx.getImageData(0, 0, canvasElement.width, canvasElement.height);

    // Вызов полного цикла анализа с прокидыванием выбранного таймфрейма
    return MarketAnalyzer.analyzeFrame(imageData, timeframe);
  }
}