// analysis/colorDetector.js - HSV конвертация и цветовая фильтрация графика
import { ANALYSIS_CONFIG } from './config.js';

export class ColorDetector {
  /**
   * Конвертация RGB пикселя в HSV
   * @param {number} r - Red (0-255)
   * @param {number} g - Green (0-255)
   * @param {number} b - Blue (0-255)
   * @returns {{h: number, s: number, v: number}} HSV объекты (H: 0-360, S: 0-1, V: 0-1)
   */
  static rgbToHsv(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;

    let h = 0;
    const v = max;
    const s = max === 0 ? 0 : diff / max;

    if (max !== min) {
      switch (max) {
        case r:
          h = (g - b) / diff + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / diff + 2;
          break;
        case b:
          h = (r - g) / diff + 4;
          break;
      }
      h /= 6;
    }

    return {
      h: Math.round(h * 360),
      s: parseFloat(s.toFixed(3)),
      v: parseFloat(v.toFixed(3))
    };
  }

  /**
   * Анализ ImageData кадра и выделение свечных массивов (Зеленые / Красные пиксели)
   * @param {ImageData} imageData 
   * @returns {{greenPixels: Array<{x: number, y: number}>, redPixels: Array<{x: number, y: number}>, width: number, height: number}}
   */
static detectCandlePixels(imageData) {
  if (!imageData || !imageData.data || !imageData.width || !imageData.height) {
    console.warn("ColorDetector: Нет imageData");
    return { greenPixels: [], redPixels: [], width: 0, height: 0 };
  }

  const { width, height, data } = imageData;
  const greenPixels = [];
  const redPixels = [];

  const thresholds = ANALYSIS_CONFIG?.COLOR_HSV_THRESHOLDS || {};
  const BULLISH_GREEN = thresholds.BULLISH_GREEN || {
    hueMin: 70, hueMax: 170, satMin: 0.12, valMin: 0.18
  };
  const BEARISH_RED = thresholds.BEARISH_RED || {
    hueMinRange1: [0, 35],
    hueMinRange2: [320, 360],
    satMin: 0.12,
    valMin: 0.18
  };

  const minX = Math.floor(width * 0.05);
  const maxX = Math.floor(width * 0.95);
  const minY = Math.floor(height * 0.05);
  const maxY = Math.floor(height * 0.92);

  const step = 1; // более точное сканирование

  for (let y = minY; y < maxY; y += step) {
    for (let x = minX; x < maxX; x += step) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      const hsv = this.rgbToHsv(r, g, b);

      // Зелёные
      if (
        hsv.h >= BULLISH_GREEN.hueMin &&
        hsv.h <= BULLISH_GREEN.hueMax &&
        hsv.s >= BULLISH_GREEN.satMin &&
        hsv.v >= BULLISH_GREEN.valMin
      ) {
        greenPixels.push({ x, y });
      }
      // Красные
      else if (
        ((hsv.h >= BEARISH_RED.hueMinRange1[0] && hsv.h <= BEARISH_RED.hueMinRange1[1]) ||
         (hsv.h >= BEARISH_RED.hueMinRange2[0] && hsv.h <= BEARISH_RED.hueMinRange2[1])) &&
        hsv.s >= BEARISH_RED.satMin &&
        hsv.v >= BEARISH_RED.valMin
      ) {
        redPixels.push({ x, y });
      }
    }
  }

  // ===== ДИАГНОСТИКА =====
  console.log("=== ColorDetector DEBUG ===");
  console.log("Размер кадра:", width, "x", height);
  console.log("Найдено зелёных пикселей:", greenPixels.length);
  console.log("Найдено красных пикселей:", redPixels.length);
  console.log("===========================");

  return {
    greenPixels,
    redPixels,
    width,
    height
  };
}
}