// analysis/candleDetector.js — улучшенная стабильная версия

export class CandleDetector {
  static extractCandles(detectionData) {
    if (!detectionData) return [];

    const { greenPixels = [], redPixels = [], height = 0, width = 0 } = detectionData;
    if (height <= 0 || width <= 0) return [];

    const allPixels = [
      ...greenPixels.map(p => ({ ...p, isBullish: true })),
      ...redPixels.map(p => ({ ...p, isBullish: false }))
    ];

    if (allPixels.length < 8) return [];

    // Более мелкий шаг → больше свечей
    const X_TOLERANCE = 2;
    const columnsMap = new Map();

    for (let i = 0; i < allPixels.length; i++) {
      const p = allPixels[i];
      const bucketX = Math.round(p.x / X_TOLERANCE) * X_TOLERANCE;
      if (!columnsMap.has(bucketX)) {
        columnsMap.set(bucketX, []);
      }
      columnsMap.get(bucketX).push(p);
    }

    const sortedX = Array.from(columnsMap.keys()).sort((a, b) => a - b);
    const rawCandles = [];

    for (let i = 0; i < sortedX.length; i++) {
      const x = sortedX[i];
      const pixels = columnsMap.get(x);
      if (!pixels || pixels.length < 3) continue;

      let minY = height;
      let maxY = 0;
      let greenCount = 0;
      let redCount = 0;

      for (let j = 0; j < pixels.length; j++) {
        const p = pixels[j];
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
        if (p.isBullish) greenCount++;
        else redCount++;
      }

      const isBullish = greenCount >= redCount;
      const totalSpan = Math.max(1, maxY - minY);

      const highPrice = Math.max(0, height - minY);
      const lowPrice  = Math.max(0, height - maxY);

      const density = pixels.length / totalSpan;
      const bodyRatio = Math.min(0.88, Math.max(0.22, density * 0.62));
      const bodyLength = totalSpan * bodyRatio;

      let openPrice, closePrice;
      if (isBullish) {
        openPrice  = lowPrice + (totalSpan - bodyLength) * 0.42;
        closePrice = openPrice + bodyLength;
      } else {
        openPrice  = highPrice - (totalSpan - bodyLength) * 0.42;
        closePrice = openPrice - bodyLength;
      }

      rawCandles.push({
        x,
        open:  +openPrice.toFixed(2),
        high:  +highPrice.toFixed(2),
        low:   +lowPrice.toFixed(2),
        close: +closePrice.toFixed(2),
        isBullish,
        bodySize: +Math.abs(closePrice - openPrice).toFixed(2),
        wickTop: +Math.max(0, highPrice - Math.max(openPrice, closePrice)).toFixed(2),
        wickBottom: +Math.max(0, Math.min(openPrice, closePrice) - lowPrice).toFixed(2),
        pixelCount: pixels.length
      });
    }

    const result = this.mergeAdjacentCandleColumns(rawCandles);
    console.log(`[CandleDetector] Сырых: ${rawCandles.length} → итого свечей: ${result.length}`);
    return result;
  }

  static mergeAdjacentCandleColumns(candles) {
    if (!candles || candles.length === 0) return [];

    const merged = [];
    let current = { ...candles[0] };

    for (let i = 1; i < candles.length; i++) {
      const next = candles[i];

      // Склеиваем только очень близкие
      if (Math.abs(next.x - current.x) <= 4) {
        current = {
          x: Math.round((current.x + next.x) / 2),
          open: current.open,
          high: Math.max(current.high, next.high),
          low: Math.min(current.low, next.low),
          close: next.close,
          isBullish: next.isBullish,
          bodySize: Math.max(current.bodySize, next.bodySize),
          wickTop: Math.max(current.wickTop || 0, next.wickTop || 0),
          wickBottom: Math.max(current.wickBottom || 0, next.wickBottom || 0),
          pixelCount: (current.pixelCount || 0) + (next.pixelCount || 0)
        };
      } else {
        merged.push(current);
        current = { ...next };
      }
    }
    merged.push(current);

    return merged.filter(c => c.pixelCount >= 3 || c.bodySize > 1.2);
  }
}