// analysis/colorDetector.js — максимально лёгкая версия

import { ANALYSIS_CONFIG } from './config.js';

export class ColorDetector {
  static rgbToHsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    let h = 0;
    const s = max === 0 ? 0 : d / max;
    const v = max;

    if (d !== 0) {
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return { h: (h * 360) | 0, s, v };
  }

  static detectCandlePixels(imageData) {
    if (!imageData?.data || !imageData.width || !imageData.height) {
      return { greenPixels: [], redPixels: [], width: 0, height: 0 };
    }

    const { width, height, data } = imageData;
    const greenPixels = [];
    const redPixels = [];

    const t = ANALYSIS_CONFIG?.COLOR_HSV_THRESHOLDS || {};
    const G = t.BULLISH_GREEN || { hueMin: 70, hueMax: 170, satMin: 0.12, valMin: 0.18 };
    const R = t.BEARISH_RED || { hueMinRange1: [0, 35], hueMinRange2: [320, 360], satMin: 0.12, valMin: 0.18 };

    const minX = (width * 0.05) | 0;
    const maxX = (width * 0.95) | 0;
    const minY = (height * 0.08) | 0;
    const maxY = (height * 0.88) | 0;

    // step = 3 → очень быстро
    const step = 3;

    for (let y = minY; y < maxY; y += step) {
      for (let x = minX; x < maxX; x += step) {
        const i = (y * width + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Быстрый отсев фона
        if (r + g + b < 80) continue;

        const hsv = this.rgbToHsv(r, g, b);

        if (hsv.h >= G.hueMin && hsv.h <= G.hueMax && hsv.s >= G.satMin && hsv.v >= G.valMin) {
          greenPixels.push({ x, y });
        } else if (
          ((hsv.h >= R.hueMinRange1[0] && hsv.h <= R.hueMinRange1[1]) ||
           (hsv.h >= R.hueMinRange2[0] && hsv.h <= R.hueMinRange2[1])) &&
          hsv.s >= R.satMin && hsv.v >= R.valMin
        ) {
          redPixels.push({ x, y });
        }
      }
    }

    console.log(`[ColorDetector] G:${greenPixels.length} R:${redPixels.length}`);
    return { greenPixels, redPixels, width, height };
  }
}