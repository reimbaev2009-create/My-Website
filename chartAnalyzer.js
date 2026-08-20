// chartAnalyzer.js - Мост между видеопотоком экрана и модулем анализа
import { MarketAnalyzer } from './analysis/marketAnalyzer.js';

export class ChartAnalyzer {
  /**
   * Захват текущего кадра с видеотега и отправка на глубокий анализ
   * @param {HTMLVideoElement} videoElement 
   * @param {HTMLCanvasElement} canvasElement 
   * @returns {object|null}
   */
  static processCurrentFrame(videoElement, canvasElement) {
    if (!videoElement || !videoElement.videoWidth) {
      return null;
    }

    const ctx = canvasElement.getContext('2d', { willReadFrequently: true });
    canvasElement.width = videoElement.videoWidth;
    canvasElement.height = videoElement.videoHeight;

    // Отрисовка кадра на холсте
    ctx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
    const imageData = ctx.getImageData(0, 0, canvasElement.width, canvasElement.height);

    // Вызов полного цикла анализа
    return MarketAnalyzer.analyzeFrame(imageData);
  }
}