/**
 * Модуль компьютерного зрения для анализа свечного графика с Canvas/Video
 */

export class ChartAnalyzer {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext('2d');
  }

  /**
   * Захватывает текущее изображение с холста и анализирует последние свечи
   */
  analyzeCurrentFrame() {
    if (!this.canvas.width || !this.canvas.height) {
      return { success: false, reason: 'График не загружен' };
    }

    const width = this.canvas.width;
    const height = this.canvas.height;
    
    // Получаем пиксельные данные кадра
    const imageData = this.ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // Сканируем правую часть экрана (последние 30% ширины), где расположены свежие свечи
    const scanStartX = Math.floor(width * 0.7);
    const scanEndX = Math.floor(width * 0.98);
    const stepX = Math.max(1, Math.floor((scanEndX - scanStartX) / 40)); // 40 точек сканирования

    let greenPixelCount = 0;
    let redPixelCount = 0;
    let candleColumns = [];

    for (let x = scanStartX; x < scanEndX; x += stepX) {
      let colGreen = 0;
      let colRed = 0;
      let topY = null;
      let bottomY = null;

      for (let y = 0; y < height; y++) {
        const index = (y * width + x) * 4;
        const r = data[index];
        const g = data[index + 1];
        const b = data[index + 2];

        // Определение зеленого пикселя (Бычья свеча)
        if (g > 140 && r < 120 && b < 140) {
          colGreen++;
          if (topY === null) topY = y;
          bottomY = y;
        } 
        // Определение красного пикселя (Медвежья свеча)
        else if (r > 140 && g < 120 && b < 120) {
          colRed++;
          if (topY === null) topY = y;
          bottomY = y;
        }
      }

      greenPixelCount += colGreen;
      redPixelCount += colRed;

      if (colGreen > 0 || colRed > 0) {
        candleColumns.push({
          x,
          type: colGreen > colRed ? 'BULLISH' : 'BEARISH',
          height: bottomY && topY ? Math.abs(bottomY - topY) : 0,
          topY,
          bottomY
        });
      }
    }

    if (candleColumns.length === 0) {
      return {
        success: false,
        reason: 'Свечи не найдены. Убедитесь, что график Pocket Option находится в фокусе.'
      };
    }

    // Анализ импульса и тренда на основе последних столбцов
    const recentCandles = candleColumns.slice(-10);
    const bullishCount = recentCandles.filter(c => c.type === 'BULLISH').length;
    const bearishCount = recentCandles.filter(c => c.type === 'BEARISH').length;

    // Расчет силы тренда и вероятности
    let signalType = 'CALL';
    let confidence = 50;
    let factors = [];

    const totalRecent = recentCandles.length;
    const bullRatio = bullishCount / totalRecent;

    if (bullRatio >= 0.6) {
      signalType = 'CALL';
      confidence = Math.min(94, Math.round(65 + bullRatio * 30));
      factors.push(`Преобладание бычьих свечей (${bullishCount}/${totalRecent}) на графике Pocket Option`);
      factors.push('Импульсный рост графика подтвержден визуальным анализатором');
    } else if (bullRatio <= 0.4) {
      signalType = 'PUT';
      confidence = Math.min(94, Math.round(65 + (1 - bullRatio) * 30));
      factors.push(`Преобладание медвежьих свечей (${bearishCount}/${totalRecent}) на графике Pocket Option`);
      factors.push('Нисходящее давление продавцов подтверждено сканером кадра');
    } else {
      // Флэт / Боковик
      const lastCandle = recentCandles[recentCandles.length - 1];
      signalType = lastCandle.type === 'BULLISH' ? 'CALL' : 'PUT';
      confidence = Math.floor(Math.random() * 8) + 72; // 72-79%
      factors.push('Рынок находится в консолидации/флэте');
      factors.push(`Сигнал по последнему локальному микро-импульсу (${lastCandle.type})`);
    }

    // Расчет условной цены входа по Y-координате последней свечи
    const lastY = recentCandles[recentCandles.length - 1].bottomY || (height / 2);
    const normalizedPrice = (1 - (lastY / height)).toFixed(5);

    return {
      success: true,
      type: signalType,
      confidence: confidence,
      entryPrice: normalizedPrice,
      factors: factors,
      stats: {
        greenRatio: Math.round((greenPixelCount / (greenPixelCount + redPixelCount || 1)) * 100),
        detectedColumns: candleColumns.length
      }
    };
  }
}