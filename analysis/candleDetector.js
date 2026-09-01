// analysis/candleDetector.js — улучшенная детекция всех видимых свечей (гистограмма + адаптивная ширина)

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

    // ===== 1. Строим гистограмму по X =====
    const hist = new Array(width).fill(0);
    const colorHist = new Array(width).fill(0); // >0 зелёный, <0 красный

    allPixels.forEach(p => {
      const x = Math.max(0, Math.min(width - 1, Math.round(p.x)));
      hist[x]++;
      colorHist[x] += p.isBullish ? 1 : -1;
    });

    // ===== 2. Сглаживаем гистограмму =====
    const smoothed = new Array(width).fill(0);
    const smoothRadius = 2;
    for (let x = 0; x < width; x++) {
      let sum = 0, count = 0;
      for (let dx = -smoothRadius; dx <= smoothRadius; dx++) {
        const nx = x + dx;
        if (nx >= 0 && nx < width) {
          sum += hist[nx];
          count++;
        }
      }
      smoothed[x] = sum / count;
    }

    // ===== 3. Находим пики (центры свечей) =====
    const peaks = [];
    const minPeakHeight = Math.max(3, Math.floor(allPixels.length / (width * 0.8) * 4)); // адаптивный порог

    for (let x = 2; x < width - 2; x++) {
      if (
        smoothed[x] >= minPeakHeight &&
        smoothed[x] >= smoothed[x - 1] &&
        smoothed[x] >= smoothed[x + 1] &&
        smoothed[x] >= smoothed[x - 2] &&
        smoothed[x] >= smoothed[x + 2]
      ) {
        // Проверяем, не слишком ли близко к предыдущему пику
        if (peaks.length === 0 || x - peaks[peaks.length - 1] > 4) {
          peaks.push(x);
        } else {
          // Берём более сильный пик
          if (smoothed[x] > smoothed[peaks[peaks.length - 1]]) {
            peaks[peaks.length - 1] = x;
          }
        }
      }
    }

    if (peaks.length === 0) {
      // Fallback на старый метод, если пики не найдены
      return this.fallbackExtract(allPixels, height, width);
    }

    // ===== 4. Для каждого пика собираем свечу =====
    const candles = [];
    const halfWidth = 6; // начальная полуширина поиска

    for (let i = 0; i < peaks.length; i++) {
      const centerX = peaks[i];

      // Адаптивная ширина: смотрим расстояние до соседей
      let leftBound = i > 0 ? Math.floor((peaks[i - 1] + centerX) / 2) : Math.max(0, centerX - halfWidth);
      let rightBound = i < peaks.length - 1 ? Math.floor((centerX + peaks[i + 1]) / 2) : Math.min(width - 1, centerX + halfWidth);

      // Собираем все пиксели в этом диапазоне
      const columnPixels = allPixels.filter(p => p.x >= leftBound && p.x <= rightBound);

      if (columnPixels.length < 3) continue;

      let minY = height, maxY = 0;
      let greenCount = 0, redCount = 0;

      columnPixels.forEach(p => {
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
        if (p.isBullish) greenCount++;
        else redCount++;
      });

      const isBullish = greenCount >= redCount;
      const totalSpan = Math.max(1, maxY - minY);

      const highPrice = Math.max(0, height - minY);
      const lowPrice  = Math.max(0, height - maxY);

      const density = columnPixels.length / totalSpan;
      const bodyRatio = Math.min(0.85, Math.max(0.25, density * 0.6));
      const bodyLength = totalSpan * bodyRatio;

      let openPrice, closePrice;
      if (isBullish) {
        openPrice  = lowPrice + (totalSpan - bodyLength) * 0.4;
        closePrice = openPrice + bodyLength;
      } else {
        openPrice  = highPrice - (totalSpan - bodyLength) * 0.4;
        closePrice = openPrice - bodyLength;
      }

      candles.push({
        x: centerX,
        open:  +openPrice.toFixed(2),
        high:  +highPrice.toFixed(2),
        low:   +lowPrice.toFixed(2),
        close: +closePrice.toFixed(2),
        isBullish,
        bodySize: +Math.abs(closePrice - openPrice).toFixed(2),
        wickTop: +Math.max(0, highPrice - Math.max(openPrice, closePrice)).toFixed(2),
        wickBottom: +Math.max(0, Math.min(openPrice, closePrice) - lowPrice).toFixed(2),
        pixelCount: columnPixels.length
      });
    }

    // Сортируем слева направо и убираем совсем уж мусор
    return candles
      .sort((a, b) => a.x - b.x)
      .filter(c => c.pixelCount >= 3 || c.bodySize > 1.5);
  }

  // Запасной метод (на случай если гистограмма не сработала)
  static fallbackExtract(allPixels, height, width) {
    const X_TOLERANCE = 3;
    const columnsMap = new Map();

    allPixels.forEach(p => {
      const bucketX = Math.round(p.x / X_TOLERANCE) * X_TOLERANCE;
      if (!columnsMap.has(bucketX)) columnsMap.set(bucketX, []);
      columnsMap.get(bucketX).push(p);
    });

    const sortedX = Array.from(columnsMap.keys()).sort((a, b) => a - b);
    const rawCandles = [];

    sortedX.forEach(x => {
      const pixels = columnsMap.get(x);
      if (!pixels || pixels.length < 3) return;

      let minY = height, maxY = 0;
      let greenCount = 0, redCount = 0;

      pixels.forEach(p => {
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
        if (p.isBullish) greenCount++;
        else redCount++;
      });

      const isBullish = greenCount >= redCount;
      const totalSpan = Math.max(1, maxY - minY);
      const highPrice = Math.max(0, height - minY);
      const lowPrice  = Math.max(0, height - maxY);

      const density = pixels.length / totalSpan;
      const bodyRatio = Math.min(0.85, Math.max(0.25, density * 0.6));
      const bodyLength = totalSpan * bodyRatio;

      let openPrice, closePrice;
      if (isBullish) {
        openPrice  = lowPrice + (totalSpan - bodyLength) * 0.4;
        closePrice = openPrice + bodyLength;
      } else {
        openPrice  = highPrice - (totalSpan - bodyLength) * 0.4;
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
    });

    // Мягкая склейка
    const merged = [];
    let current = rawCandles[0];

    for (let i = 1; i < rawCandles.length; i++) {
      const next = rawCandles[i];
      if (Math.abs(next.x - current.x) <= 5) {
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
    if (current) merged.push(current);

    return merged.filter(c => c.pixelCount >= 3 || c.bodySize > 1.5);
  }
}