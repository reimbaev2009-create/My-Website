// chartAnalyzer.js - Мост между видеопотоком экрана и модулем анализа
import { MarketAnalyzer } from './analysis/marketAnalyzer.js';

const MAX_ANALYSIS_WIDTH = 960; // ограничиваем разрешение перед анализом, чтобы не фризить UI

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

    // Даунскейл: если кадр больше MAX_ANALYSIS_WIDTH, уменьшаем пропорционально.
    // Это снижает объём getImageData/обработки в разы на 4K/Retina экранах,
    // не меняя логику анализа — она работает с любым width/height.
    const srcW = videoElement.videoWidth;
    const srcH = videoElement.videoHeight;
    const scale = srcW > MAX_ANALYSIS_WIDTH ? MAX_ANALYSIS_WIDTH / srcW : 1;

    const targetW = Math.round(srcW * scale);
    const targetH = Math.round(srcH * scale);

    canvasElement.width = targetW;
    canvasElement.height = targetH;

    // Отрисовка текущего кадра с Pocket Option на холсте (с учётом масштаба)
    ctx.drawImage(videoElement, 0, 0, targetW, targetH);
    const imageData = ctx.getImageData(0, 0, targetW, targetH);

    // Вызов полного цикла анализа с прокидыванием выбранного таймфрейма
    return MarketAnalyzer.analyzeFrame(imageData, timeframe);
  }
}