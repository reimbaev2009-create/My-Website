// analysis/candleDetector.js — умная фильтрация: находим реальное количество свечей

export class CandleDetector {
  static extractCandles(detectionData) {
    if (!detectionData) return [];

    const { greenPixels = [], redPixels = [], height = 0, width = 0 } = detectionData;
    if (height <= 0 || width <= 0) return [];

    const allPixels = [
      ...greenPixels.map(p => ({ ...p, isBullish: true })),
      ...redPixels.map(p => ({ ...p, isBullish: false }))
    ];

    if (allPixels.length < 20) return [];

    // ===== 1. Гистограмма =====
    const hist = new Float32Array(width);

    for (const p of allPixels) {
      const x = Math.max(0, Math.min(width - 1, Math.round(p.x)));
      hist[x]++;
    }

    // ===== 2. Сглаживание =====
    const smoothed = new Float32Array(width);
    for (let x = 0; x < width; x++) {
      let sum = 0, cnt = 0;
      for (let d = -2; d <= 2; d++) {
        const nx = x + d;
        if (nx >= 0 && nx < width) {
          sum += hist[nx];
          cnt++;
        }
      }
      smoothed[x] = sum / cnt;
    }

    // ===== 3. Находим кандидатов в пики =====
    const candidates = [];
    for (let x = 3; x < width - 3; x++) {
      if (
        smoothed[x] > smoothed[x - 1] &&
        smoothed[x] > smoothed[x + 1] &&
        smoothed[x] >= smoothed[x - 2] &&
        smoothed[x] >= smoothed[x + 2]
      ) {
        candidates.push({ x, strength: smoothed[x] });
      }
    }

    if (candidates.length === 0) {
      return this.fallbackMethod(allPixels, height, width);
    }

    // ===== 4. Умная фильтрация пиков =====
    // Сортируем по силе (самые мощные сначала)
    candidates.sort((a, b) => b.strength - a.strength);

    const selected = [];
    const minDistance = 7; // минимальное расстояние между свечами (важно!)

    for (const cand of candidates) {
      // Проверяем, не слишком ли близко к уже выбранным
      const tooClose = selected.some(s => Math.abs(s.x - cand.x) < minDistance);
      if (!tooClose) {
        selected.push(cand);
      }

      // Ограничиваем максимальное количество (чтобы не было сотен)
      if (selected.length >= 60) break;
    }

    // Сортируем слева направо
    selected.sort((a, b) => a.x - b.x);

    // ===== 5. Собираем свечи =====
    const candles = [];

    for (let i = 0; i < selected.length; i++) {
      const center = selected[i].x;

      // Границы колонки
      let left = i > 0 ? Math.floor((selected[i - 1].x + center) / 2) : Math.max(0, center - 9);
      let right = i < selected.length - 1 ? Math.floor((center + selected[i + 1].x) / 2) : Math.min(width - 1, center + 9);

      const colPixels = allPixels.filter(p => p.x >= left && p.x <= right);
      if (colPixels.length < 6) continue;

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

      const density = colPixels.length / span;
      const bodyRatio = Math.min(0.80, Math.max(0.20, density * 0.52));
      const bodyLen = span * bodyRatio;

      let open, close;
      if (isBullish) {
        open = low + (span - bodyLen) * 0.37;
        close = open + bodyLen;
      } else {
        open = high - (span - bodyLen) * 0.37;
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

    const result = candles.filter(c => c.pixelCount >= 6);

    console.log(`[CandleDetector] Кандидатов: ${candidates.length} → выбрано пиков: ${selected.length} → свечей: ${result.length}`);
    return result;
  }

  static fallbackMethod(allPixels, height, width) {
    const TOL = 5;
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
      if (pixels.length < 6) continue;

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

      const bodyRatio = Math.min(0.78, Math.max(0.22, (pixels.length / span) * 0.5));
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

    // Слияние близких
    const merged = [];
    let cur = raw[0];
    for (let i = 1; i < raw.length; i++) {
      if (raw[i].x - cur.x <= 7) {
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
    return merged.filter(c => c.pixelCount >= 6);
  }
}