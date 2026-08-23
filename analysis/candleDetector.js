// analysis/candleDetector.js - Улучшенное восстановление свечей (больше свечей + чище)

export class CandleDetector {
  /**
   * Восстановление списка свечей из выделенных пикселей
   */
  static extractCandles(detectionData) {
    if (!detectionData) return [];

    const { greenPixels = [], redPixels = [], height = 0, width = 0 } = detectionData;
    
    if (height <= 0 || width <= 0) return [];

    const allPixels = [
      ...greenPixels.map(p => ({ ...p, isBullish: true })),
      ...redPixels.map(p => ({ ...p, isBullish: false }))
    ];

    if (allPixels.length < 8) return []; // слишком мало данных

    // 1. Группировка по X с меньшим допуском → больше свечей
    const columnsMap = new Map();
    const X_TOLERANCE = 3; // было 4

    allPixels.forEach(p => {
      const bucketX = Math.round(p.x / X_TOLERANCE) * X_TOLERANCE;
      if (!columnsMap.has(bucketX)) {
        columnsMap.set(bucketX, []);
      }
      columnsMap.get(bucketX).push(p);
    });

    const sortedX = Array.from(columnsMap.keys()).sort((a, b) => a - b);
    const rawCandles = [];

    // 2. Обработка каждой колонки
    sortedX.forEach(x => {
      const pixels = columnsMap.get(x);
      // Снизили порог с 6 до 3 → находим больше свечей
      if (!pixels || pixels.length < 3) return;

      let minY = height;
      let maxY = 0;
      let greenCount = 0;
      let redCount = 0;

      pixels.forEach(p => {
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
        if (p.isBullish) greenCount++;
        else redCount++;
      });

      const isBullish = greenCount >= redCount;
      const totalSpan = Math.max(1, maxY - minY);

      // Нормализация Y → цена (0 вверху)
      const highPrice = Math.max(0, height - minY);
      const lowPrice  = Math.max(0, height - maxY);

      // Более точная оценка тела
      const density = pixels.length / totalSpan;
      const estimatedBodyRatio = Math.min(0.95, Math.max(0.25, density * 0.7));
      const bodyLength = totalSpan * estimatedBodyRatio;

      let openPrice, closePrice;
      if (isBullish) {
        openPrice  = lowPrice + (totalSpan - bodyLength) * 0.5;
        closePrice = openPrice + bodyLength;
      } else {
        openPrice  = highPrice - (totalSpan - bodyLength) * 0.5;
        closePrice = openPrice - bodyLength;
      }

      const topWick    = Math.max(0, highPrice - Math.max(openPrice, closePrice));
      const bottomWick = Math.max(0, Math.min(openPrice, closePrice) - lowPrice);

      rawCandles.push({
        x,
        open:  +openPrice.toFixed(2),
        high:  +highPrice.toFixed(2),
        low:   +lowPrice.toFixed(2),
        close: +closePrice.toFixed(2),
        isBullish,
        bodySize: +Math.abs(closePrice - openPrice).toFixed(2),
        wickTop: +topWick.toFixed(2),
        wickBottom: +bottomWick.toFixed(2),
        pixelCount: pixels.length
      });
    });

    // 3. Более умное слияние соседних колонок
    return this.mergeAdjacentCandleColumns(rawCandles);
  }

  static mergeAdjacentCandleColumns(candles) {
    if (!candles || candles.length === 0) return [];

    const merged = [];
    let current = { ...candles[0] };

    for (let i = 1; i < candles.length; i++) {
      const next = candles[i];

      // Склеиваем, если очень близко
      if (Math.abs(next.x - current.x) <= 7) {
        current = {
          x: Math.round((current.x + next.x) / 2),
          open: current.open,
          high: Math.max(current.high, next.high),
          low: Math.min(current.low, next.low),
          close: next.close,
          isBullish: next.isBullish,
          bodySize: Math.max(current.bodySize, next.bodySize),
          wickTop: Math.max(current.wickTop, next.wickTop),
          wickBottom: Math.max(current.wickBottom, next.wickBottom),
          pixelCount: (current.pixelCount || 0) + (next.pixelCount || 0)
        };
      } else {
        merged.push(current);
        current = { ...next };
      }
    }
    merged.push(current);

    // Финальная фильтрация совсем крошечных свечей
    return merged.filter(c => c.bodySize > 1.5 || c.pixelCount >= 5);
  }
}