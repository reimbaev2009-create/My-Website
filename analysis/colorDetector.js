// analysis/colorDetector.js — быстрая версия (не вешает браузер)

import { ANALYSIS_CONFIG } from './config.js';

export class ColorDetector {
  static rgbToHsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;

    let h = 0;
    const v = max;
    const s = max === 0 ? 0 : diff / max;

    if (max !== min) {
      switch (max) {
        case r: h = (g - b) / diff + (g < b ? 6 : 0); break;
        case g: h = (b - r) / diff + 2; break;
        case b: h = (r - g) / diff + 4; break;
      }
      h /= 6;
    }

    return {
      h: (h * 360) | 0,
      s: s,
      v: v
    };
  }

  static detectCandlePixels(imageData) {
    if (!imageData || !imageData.data || !imageData.width || !imageData.height) {
      return { greenPixels: [], redPixels: [], width: 0, height: 0 };
    }

    const { width, height, data } = imageData;
    const greenPixels = [];
    const redPixels = [];

    const thresholds = ANALYSIS_CONFIG?.COLOR_HSV_THRESHOLDS || {};
    const GREEN = thresholds.BULLISH_GREEN || { hueMin: 70, hueMax: 170, satMin: 0.12, valMin: 0.18 };
    const RED = thresholds.BEARISH_RED || {
      hueMinRange1: [0, 35],
      hueMinRange2: [320, 360],
      satMin: 0.12,
      valMin: 0.18
    };

    // Сканируем только рабочую зону графика
    const minX = (width * 0.04) | 0;
    const maxX = (width * 0.96) | 0;
    const minY = (height * 0.06) | 0;
    const maxY = (height * 0.90) | 0;

    // ===== ВАЖНО: шаг 2 — в 4 раза быстрее =====
    const step = 2;

    for (let y = minY; y < maxY; y += step) {
      for (let x = minX; x < maxX; x += step) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        // Быстрая предварительная фильтрация (отсекаем тёмный фон)
        if (r < 25 && g < 25 && b < 25) continue;

        const hsv = this.rgbToHsv(r, g, b);

        // Зелёные свечи
        if (
          hsv.h >= GREEN.hueMin &&
          hsv.h <= GREEN.hueMax &&
          hsv.s >= GREEN.satMin &&
          hsv.v >= GREEN.valMin
        ) {
          greenPixels.push({ x, y });
        }
        // Красные свечи
        else if (
          ((hsv.h >= RED.hueMinRange1[0] && hsv.h <= RED.hueMinRange1[1]) ||
           (hsv.h >= RED.hueMinRange2[0] && hsv.h <= RED.hueMinRange2[1])) &&
          hsv.s >= RED.satMin &&
          hsv.v >= RED.valMin
        ) {
          redPixels.push({ x, y });
        }
      }
    }

    console.log(`[ColorDetector] Зелёных: ${greenPixels.length} | Красных: ${redPixels.length}`);

    return {
      greenPixels,
      redPixels,
      width,
      height
    };
  }
}