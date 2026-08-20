// analysis/candleDetector.js - Преобразование массивов пикселей в геометрические свечи (OHLC)

export class CandleDetector {
  /**
   * Восстановление списка свечей из выделенных пикселей
   * @param {{greenPixels: Array<{x: number, y: number}>, redPixels: Array<{x: number, y: number}>, width: number, height: number}} detectionData 
   * @returns {Array<{x: number, open: number, high: number, low: number, close: number, isBullish: boolean, bodySize: number, wickTop: number, wickBottom: number}>}
   */
  static extractCandles(detectionData) {
    const { greenPixels, redPixels, height } = detectionData;
    const allPixels = [
      ...greenPixels.map(p => ({ ...p, isBullish: true })),
      ...redPixels.map(p => ({ ...p, isBullish: false }))
    ];

    if (allPixels.length === 0) return [];

    // 1. Группировка пикселей по X с шагом (ширина колонки)
    const columnsMap = new Map();
    const X_TOLERANCE = 4; // Расстояние для объединения пикселей в одну свечу

    allPixels.forEach(p => {
      const bucketX = Math.round(p.x / X_TOLERANCE) * X_TOLERANCE;
      if (!columnsMap.has(bucketX)) {
        columnsMap.set(bucketX, []);
      }
      columnsMap.get(bucketX).push(p);
    });

    // Sort columns by X coordinate (left to right)
    const sortedX = Array.from(columnsMap.keys()).sort((a, b) => a - b);
    const rawCandles = [];

    // 2. Обработка каждой колонки пикселей
    sortedX.forEach(x => {
      const pixels = columnsMap.get(x);
      if (pixels.length < 6) return; // Игнорируем шумы и мелкие точки UI

      let minY = height; // На экране top = 0, поэтому min Y = High свечи
      let maxY = 0;      // max Y = Low свечи
      let greenCount = 0;
      let redCount = 0;

      pixels.forEach(p => {
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
        if (p.isBullish) greenCount++;
        else redCount++;
      });

      const isBullish = greenCount >= redCount;

      // Нормализуем Y в условные цены (инвертируем Y, так как 0 находится вверху)
      const highPrice = height - minY;
      const lowPrice = height - maxY;

      // Оценка размера тела на основе концентрации пикселей
      const totalSpan = Math.max(1, maxY - minY);
      const estimatedBodyRatio = Math.min(1, pixels.length / (totalSpan * 1.5));
      const bodyLength = totalSpan * estimatedBodyRatio;

      let openPrice, closePrice;
      if (isBullish) {
        openPrice = lowPrice + (totalSpan - bodyLength) / 2;
        closePrice = openPrice + bodyLength;
      } else {
        openPrice = highPrice - (totalSpan - bodyLength) / 2;
        closePrice = openPrice - bodyLength;
      }

      rawCandles.push({
        x,
        open: parseFloat(openPrice.toFixed(2)),
        high: parseFloat(highPrice.toFixed(2)),
        low: parseFloat(lowPrice.toFixed(2)),
        close: parseFloat(closePrice.toFixed(2)),
        isBullish,
        bodySize: parseFloat(Math.abs(closePrice - openPrice).toFixed(2)),
        wickTop: parseFloat((highPrice - Math.max(openPrice, closePrice)).toFixed(2)),
        wickBottom: parseFloat((Math.min(openPrice, closePrice) - lowPrice).toFixed(2))
      });
    });

    // 3. Фильтрация и устранение слишком близких колонок
    return this.mergeAdjacentCandleColumns(rawCandles);
  }

  /**
   * Слияние соседних колонок одного графического элемента
   */
  static mergeAdjacentCandleColumns(candles) {
    if (candles.length === 0) return [];

    const merged = [];
    let current = candles[0];

    for (let i = 1; i < candles.length; i++) {
      const next = candles[i];

      // Если колонки стоят вплотную (меньше 8px)
      if (Math.abs(next.x - current.x) <= 8) {
        current = {
          x: Math.round((current.x + next.x) / 2),
          open: current.open,
          high: Math.max(current.high, next.high),
          low: Math.min(current.low, next.low),
          close: next.close,
          isBullish: next.isBullish,
          bodySize: Math.max(current.bodySize, next.bodySize),
          wickTop: Math.max(current.wickTop, next.wickTop),
          wickBottom: Math.max(current.wickBottom, next.wickBottom)
        };
      } else {
        merged.push(current);
        current = next;
      }
    }
    merged.push(current);

    return merged;
  }
}