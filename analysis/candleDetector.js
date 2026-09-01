// analysis/candleDetector.js — максимально чувствительная детекция всех видимых свечей

export class CandleDetector {
  static extractCandles(detectionData) {
    if (!detectionData) return [];

    const { greenPixels = [], redPixels = [], height = 0, width = 0 } = detectionData;
    if (height <= 0 || width <= 0) return [];

    const allPixels = [
      ...greenPixels.map(p => ({ ...p, isBullish: true })),
      ...redPixels.map(p => ({ ...p, isBullish: false }))
    ];

    if (allPixels.length < 10) return [];

    // ===== 1. Гистограмма по X =====
    const hist = new Float32Array(width);
    const bullHist = new Float32Array(width);
    const bearHist = new Float32Array(width);

    for (const p of allPixels) {
      const x = Math.max(0, Math.min(width - 1, Math.round(p.x)));
      hist[x]++;
      if (p.isBullish) bullHist[x]++;
      else bearHist[x]++;
    }

    // ===== 2. Лёгкое сглаживание =====
    const smoothed = new Float32Array(width);
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let cnt = 0;
      for (let d = -1; d <= 1; d++) {
        const nx = x + d;
        if (nx >= 0 && nx < width) {
          sum += hist[nx];
          cnt++;
        }
      }
      smoothed[x] = sum / cnt;
    }

    // ===== 3. Находим ВСЕ значимые пики (очень чувствительно) =====
    const peaks = [];
    const minHeight = 4; // очень низкий порог

    for (let x = 1; x < width - 1; x++) {
      if (smoothed[x] >= minHeight && smoothed[x] >= smoothed[x - 1] && smoothed[x] >= smoothed[x + 1]) {
        // не даём пикам быть слишком близко
        if (peaks.length === 0 || x - peaks[peaks.length - 1].x >= 5) {
          peaks.push({ x, strength: smoothed[x] });
        } else {
          // оставляем более сильный
          if (smoothed[x] > peaks[peaks.length - 1].strength) {
            peaks[peaks.length - 1] = { x, strength: smoothed[x] };
          }
        }
      }
    }

    // Если пиков слишком мало — пробуем ещё более мягкий режим
    if (peaks.length < 8) {
      peaks.length = 0;
      for (let x = 1; x < width - 1; x++) {
        if (smoothed[x] >= 3 && smoothed[x] >= smoothed[x - 1] && smoothed[x] >= smoothed[x + 1]) {
          if (peaks.length === 0 || x - peaks[peaks.length - 1].x >= 4) {
            peaks.push({ x, strength: smoothed[x] });
          } else if (smoothed[x] > peaks[peaks.length - 1].strength) {
            peaks[peaks.length - 1] = { x, strength: smoothed[x] };
          }
        }
      }
    }

    if (peaks.length === 0) {
      return this.fallbackMethod(allPixels, height, width);
    }

    // ===== 4. Собираем свечи по пикам =====
    const candles = [];

    for (let i = 0; i < peaks.length; i++) {
      const center = peaks[i].x;

      // Границы колонки
      let left = i > 0 ? Math.floor((peaks[i - 1].x + center) / 2) : Math.max(0, center - 8);
      let right = i < peaks.length - 1 ? Math.floor((center + peaks[i + 1].x) / 2) : Math.min(width - 1, center + 8);

      // Собираем пиксели этой колонки
      const colPixels = [];
      for (const p of allPixels) {
        if (p.x >= left && p.x <= right) colPixels.push(p);
      }

      if (colPixels.length < 4) continue;

      let minY = height, maxY = 0;
      let green = 0, red = 0;

      for (const p of colPixels) {
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
        if (p.isBullish) green++;
        else red++;
      }

      const isBullish = green >= red;
      const span = Math.max(1, maxY - minY);

      const high = height - minY;
      const low = height - maxY;

      // Оценка тела
      const density = colPixels.length / span;
      const bodyRatio = Math.min(0.82, Math.max(0.22, density * 0.55));
      const bodyLen = span * bodyRatio;

      let open, close;
      if (isBullish) {
        open = low + (span - bodyLen) * 0.38;
        close = open + bodyLen;
      } else {
        open = high - (span - bodyLen) * 0.38;
        close = open - bodyLen;
      }

      candles.push({
        x: center,
        open: +open.toFixed(2),
        high: +high.toFixed(2),
        low: +low.toFixed(2),
        close: +close.toFixed(2),
        isBullish,
        bodySize: +Math.abs(close - open).toFixed(2),
        wickTop: +Math.max(0, high - Math.max(open, close)).toFixed(2),
        wickBottom: +Math.max(0, Math.min(open, close) - low).toFixed(2),
        pixelCount: colPixels.length
      });
    }

    // Финальная очистка
    const result = candles
      .sort((a, b) => a.x - b.x)
      .filter(c => c.pixelCount >= 4);

    console.log(`[CandleDetector] Найдено пиков: ${peaks.length} → свечей после фильтра: ${result.length}`);
    return result;
  }

  // Запасной метод
  static fallbackMethod(allPixels, height, width) {
    const TOL = 4;
    const map = new Map();

    for (const p of allPixels) {
      const key = Math.round(p.x / TOL) * TOL;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(p);
    }

    const keys = Array.from(map.keys()).sort((a, b) => a - b);
    const raw = [];

    for (const x of keys) {
      const pixels = map.get(x);
      if (pixels.length < 4) continue;

      let minY = height, maxY = 0;
      let green = 0, red = 0;

      for (const p of pixels) {
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
        if (p.isBullish) green++;
        else red++;
      }

      const isBullish = green >= red;
      const span = Math.max(1, maxY - minY);
      const high = height - minY;
      const low = height - maxY;

      const bodyRatio = Math.min(0.8, Math.max(0.25, (pixels.length / span) * 0.5));
      const bodyLen = span * bodyRatio;

      let open, close;
      if (isBullish) {
        open = low + (span - bodyLen) * 0.4;
        close = open + bodyLen;
      } else {
        open = high - (span - bodyLen) * 0.4;
        close = open - bodyLen;
      }

      raw.push({
        x,
        open: +open.toFixed(2),
        high: +high.toFixed(2),
        low: +low.toFixed(2),
        close: +close.toFixed(2),
        isBullish,
        bodySize: +Math.abs(close - open).toFixed(2),
        wickTop: +Math.max(0, high - Math.max(open, close)).toFixed(2),
        wickBottom: +Math.max(0, Math.min(open, close) - low).toFixed(2),
        pixelCount: pixels.length
      });
    }

    // Мягкое слияние
    const merged = [];
    let cur = raw[0];
    for (let i = 1; i < raw.length; i++) {
      if (raw[i].x - cur.x <= 6) {
        cur = {
          x: Math.round((cur.x + raw[i].x) / 2),
          open: cur.open,
          high: Math.max(cur.high, raw[i].high),
          low: Math.min(cur.low, raw[i].low),
          close: raw[i].close,
          isBullish: raw[i].isBullish,
          bodySize: Math.max(cur.bodySize, raw[i].bodySize),
          wickTop: Math.max(cur.wickTop, raw[i].wickTop),
          wickBottom: Math.max(cur.wickBottom, raw[i].wickBottom),
          pixelCount: cur.pixelCount + raw[i].pixelCount
        };
      } else {
        merged.push(cur);
        cur = raw[i];
      }
    }
    if (cur) merged.push(cur);

    console.log(`[CandleDetector] Fallback → ${merged.length} свечей`);
    return merged.filter(c => c.pixelCount >= 4);
  }
}