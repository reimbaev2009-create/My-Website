// analysis/candleDetector.js — быстрая и стабильная версия

export class CandleDetector {
  static extractCandles(detectionData) {
    if (!detectionData) return [];

    const { greenPixels = [], redPixels = [], height = 0, width = 0 } = detectionData;
    if (height <= 0 || width <= 0) return [];

    const allPixels = greenPixels.length + redPixels.length;
    if (allPixels < 30) return [];

    // ===== Быстрая гистограмма =====
    const hist = new Int32Array(width);
    const color = new Int8Array(width); // +1 зелёный, -1 красный

    // Обрабатываем зелёные
    for (let i = 0; i < greenPixels.length; i++) {
      const x = greenPixels[i].x | 0;
      if (x >= 0 && x < width) {
        hist[x]++;
        color[x]++;
      }
    }

    // Обрабатываем красные
    for (let i = 0; i < redPixels.length; i++) {
      const x = redPixels[i].x | 0;
      if (x >= 0 && x < width) {
        hist[x]++;
        color[x]--;
      }
    }

    // ===== Ищем колонки (свечи) =====
    const candles = [];
    const minPixelsInColumn = 8;
    let i = 0;

    while (i < width) {
      // Пропускаем пустые места
      if (hist[i] < minPixelsInColumn) {
        i++;
        continue;
      }

      // Нашли начало колонки — собираем её
      let startX = i;
      let endX = i;
      let totalPixels = 0;
      let greenScore = 0;

      while (endX < width && hist[endX] >= 3) {
        totalPixels += hist[endX];
        greenScore += color[endX];
        endX++;
      }

      const colWidth = endX - startX;

      // Слишком узкая или слишком широкая — пропускаем
      if (colWidth < 2 || colWidth > 25 || totalPixels < minPixelsInColumn) {
        i = endX + 1;
        continue;
      }

      // Центр колонки
      const centerX = (startX + endX) >> 1;

      // Теперь нужно найти minY и maxY этой колонки
      // Для скорости берём приближённо через повторный проход только по этой зоне
      let minY = height;
      let maxY = 0;

      // Зелёные в этой зоне
      for (let p = 0; p < greenPixels.length; p++) {
        const px = greenPixels[p].x | 0;
        if (px >= startX && px < endX) {
          const py = greenPixels[p].y;
          if (py < minY) minY = py;
          if (py > maxY) maxY = py;
        }
      }

      // Красные в этой зоне
      for (let p = 0; p < redPixels.length; p++) {
        const px = redPixels[p].x | 0;
        if (px >= startX && px < endX) {
          const py = redPixels[p].y;
          if (py < minY) minY = py;
          if (py > maxY) maxY = py;
        }
      }

      if (maxY <= minY) {
        i = endX + 1;
        continue;
      }

      const isBullish = greenScore >= 0;
      const span = maxY - minY;
      const high = height - minY;
      const low = height - maxY;

      const bodyRatio = Math.min(0.8, Math.max(0.25, (totalPixels / span) * 0.4));
      const bodyLen = span * bodyRatio;

      let open, close;
      if (isBullish) {
        open = low + (span - bodyLen) * 0.4;
        close = open + bodyLen;
      } else {
        open = high - (span - bodyLen) * 0.4;
        close = open - bodyLen;
      }

      candles.push({
        x: centerX,
        open: +open.toFixed(2),
        high: +high.toFixed(2),
        low: +low.toFixed(2),
        close: +close.toFixed(2),
        isBullish,
        bodySize: +Math.abs(close - open).toFixed(2),
        wickTop: +Math.max(0, high - Math.max(open, close)).toFixed(2),
        wickBottom: +Math.max(0, Math.min(open, close) - low).toFixed(2),
        pixelCount: totalPixels
      });

      // Перескакиваем вперёд
      i = endX + 2;
    }

    console.log(`[CandleDetector] Найдено свечей: ${candles.length}`);
    return candles;
  }
}