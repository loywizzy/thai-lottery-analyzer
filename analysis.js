/**
 * analysis.js - Statistical Analysis Engine
 * เครื่องมือวิเคราะห์ทางสถิติสำหรับล็อตเตอรี่ไทย
 */

const AnalysisEngine = (() => {
  
  /**
   * Model 1: Digit Frequency Analysis
   * วิเคราะห์ความถี่ของตัวเลข 0-9 ในแต่ละตำแหน่ง
   */
  function digitFrequency(results) {
    // frequency[position][digit] = count
    const frequency = Array.from({ length: 6 }, () => Array(10).fill(0));
    let totalDraws = 0;

    results.forEach(r => {
      const first = DataManager.getFirstPrize(r);
      if (!first || first.length !== 6) return;
      
      totalDraws++;
      for (let pos = 0; pos < 6; pos++) {
        const digit = parseInt(first[pos]);
        if (!isNaN(digit)) {
          frequency[pos][digit]++;
        }
      }
    });

    // Normalize
    const normalized = frequency.map(posFreq => {
      const total = posFreq.reduce((a, b) => a + b, 0) || 1;
      return posFreq.map(count => ({
        count,
        frequency: count / total,
        deviation: (count / total) - 0.10
      }));
    });

    return { raw: frequency, normalized, totalDraws };
  }

  /**
   * วิเคราะห์ความถี่เลขท้าย 2 ตัว
   */
  function last2Frequency(results) {
    const frequency = {};
    let totalDraws = 0;

    for (let i = 0; i < 100; i++) {
      frequency[String(i).padStart(2, '0')] = 0;
    }

    results.forEach(r => {
      const last2 = DataManager.getLast2(r);
      if (last2 && last2.length === 2) {
        frequency[last2]++;
        totalDraws++;
      }
    });

    return Object.entries(frequency)
      .map(([number, count]) => ({
        number,
        count,
        frequency: count / (totalDraws || 1),
        expected: 1 / 100
      }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * วิเคราะห์ความถี่เลขท้าย 3 ตัว
   */
  function last3Frequency(results) {
    const frequency = {};

    results.forEach(r => {
      const last3b = DataManager.getLast3Back(r);
      last3b.forEach(num => {
        if (num) {
          frequency[num] = (frequency[num] || 0) + 1;
        }
      });
    });

    return Object.entries(frequency)
      .map(([number, count]) => ({ number, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * วิเคราะห์ความถี่เลขหน้า 3 ตัว
   */
  function front3Frequency(results) {
    const frequency = {};

    results.forEach(r => {
      const last3f = DataManager.getLast3Front(r);
      last3f.forEach(num => {
        if (num) {
          frequency[num] = (frequency[num] || 0) + 1;
        }
      });
    });

    return Object.entries(frequency)
      .map(([number, count]) => ({ number, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Model 2: Hot/Cold Number Analysis
   */
  function hotColdAnalysis(results, recentN = 10) {
    const allResults = results;
    const recentResults = results.slice(-recentN);

    // Overall frequency
    const overallFreq = {};
    for (let i = 0; i <= 9; i++) overallFreq[i] = 0;
    let overallTotal = 0;

    allResults.forEach(r => {
      const first = DataManager.getFirstPrize(r);
      if (!first) return;
      overallTotal++;
      for (const ch of first) {
        const d = parseInt(ch);
        if (!isNaN(d)) overallFreq[d]++;
      }
    });

    // Recent frequency
    const recentFreq = {};
    for (let i = 0; i <= 9; i++) recentFreq[i] = 0;
    let recentTotal = 0;

    recentResults.forEach(r => {
      const first = DataManager.getFirstPrize(r);
      if (!first) return;
      recentTotal++;
      for (const ch of first) {
        const d = parseInt(ch);
        if (!isNaN(d)) recentFreq[d]++;
      }
    });

    // Calculate Hot/Cold Ratio
    const result = [];
    for (let digit = 0; digit <= 9; digit++) {
      const overallRate = overallFreq[digit] / ((overallTotal * 6) || 1);
      const recentRate = recentFreq[digit] / ((recentTotal * 6) || 1);
      const ratio = overallRate > 0 ? recentRate / overallRate : 1;

      let classification;
      if (ratio > 1.3) classification = 'hot';
      else if (ratio < 0.7) classification = 'cold';
      else classification = 'neutral';

      result.push({
        digit,
        overallCount: overallFreq[digit],
        recentCount: recentFreq[digit],
        overallRate: (overallRate * 100).toFixed(2),
        recentRate: (recentRate * 100).toFixed(2),
        ratio: ratio.toFixed(2),
        classification
      });
    }

    return result;
  }

  /**
   * Model 3: Gap Analysis
   */
  function gapAnalysis(results) {
    // Track last appearance of each digit pair (last 2 digits)
    const lastAppearance = {};
    const gaps = {};
    
    for (let i = 0; i < 100; i++) {
      const num = String(i).padStart(2, '0');
      lastAppearance[num] = -1;
      gaps[num] = [];
    }

    results.forEach((r, drawIndex) => {
      const last2 = DataManager.getLast2(r);
      if (!last2) return;

      if (lastAppearance[last2] >= 0) {
        gaps[last2].push(drawIndex - lastAppearance[last2]);
      }
      lastAppearance[last2] = drawIndex;
    });

    const currentDraw = results.length;
    const analysis = [];

    for (let i = 0; i < 100; i++) {
      const num = String(i).padStart(2, '0');
      const numGaps = gaps[num];
      const avgGap = numGaps.length > 0 
        ? numGaps.reduce((a, b) => a + b, 0) / numGaps.length 
        : currentDraw;
      const currentGap = lastAppearance[num] >= 0 
        ? currentDraw - lastAppearance[num] 
        : currentDraw;
      const gapScore = avgGap > 0 ? currentGap / avgGap : 0;

      analysis.push({
        number: num,
        avgGap: avgGap.toFixed(1),
        currentGap,
        gapScore: gapScore.toFixed(2),
        isOverdue: gapScore > 1.5,
        lastSeen: lastAppearance[num] >= 0 ? results.length - lastAppearance[num] : 'ไม่เคยออก'
      });
    }

    return analysis.sort((a, b) => parseFloat(b.gapScore) - parseFloat(a.gapScore));
  }

  /**
   * Model 4: Digit-to-Digit Correlation
   */
  function digitCorrelation(results) {
    const pairCount = Array.from({ length: 10 }, () => Array(10).fill(0));
    let totalDraws = 0;

    results.forEach(r => {
      const first = DataManager.getFirstPrize(r);
      if (!first || first.length !== 6) return;
      
      totalDraws++;
      const digits = [...new Set(first.split('').map(Number))];
      
      for (let i = 0; i < digits.length; i++) {
        for (let j = i + 1; j < digits.length; j++) {
          pairCount[digits[i]][digits[j]]++;
          pairCount[digits[j]][digits[i]]++;
        }
      }
    });

    // Normalize
    const matrix = pairCount.map(row => 
      row.map(count => totalDraws > 0 ? count / totalDraws : 0)
    );

    return { pairCount, matrix, totalDraws };
  }

  /**
   * Model 5: Moving Average Trend
   */
  function trendAnalysis(results, windowSize = 10) {
    const trends = {};
    
    for (let digit = 0; digit <= 9; digit++) {
      const frequencies = [];
      
      for (let i = 0; i < results.length; i++) {
        const first = DataManager.getFirstPrize(results[i]);
        if (!first) continue;
        
        const count = first.split('').filter(ch => parseInt(ch) === digit).length;
        frequencies.push(count);
      }

      // Calculate SMA
      const sma = [];
      for (let i = windowSize - 1; i < frequencies.length; i++) {
        const window = frequencies.slice(i - windowSize + 1, i + 1);
        sma.push(window.reduce((a, b) => a + b, 0) / windowSize);
      }

      // Simple trend direction from last values
      const shortWindow = 5;
      const shortSma = sma.slice(-shortWindow);
      const longSma = sma.slice(-windowSize * 2);
      
      const shortAvg = shortSma.length > 0 ? shortSma.reduce((a, b) => a + b, 0) / shortSma.length : 0;
      const longAvg = longSma.length > 0 ? longSma.reduce((a, b) => a + b, 0) / longSma.length : 0;

      trends[digit] = {
        sma,
        shortAvg: shortAvg.toFixed(3),
        longAvg: longAvg.toFixed(3),
        trend: shortAvg > longAvg ? 'up' : shortAvg < longAvg ? 'down' : 'flat',
        trendScore: ((shortAvg - longAvg) / (longAvg || 1) * 100).toFixed(2)
      };
    }

    return trends;
  }

  /**
   * Model 6: Day-of-Week Influence
   */
  function dayOfWeekAnalysis(results) {
    const dayFreq = Array.from({ length: 7 }, () => ({}));
    const dayTotal = Array(7).fill(0);

    results.forEach(r => {
      const date = new Date(r.drawDate);
      const day = date.getDay();
      const first = DataManager.getFirstPrize(r);
      if (!first) return;

      dayTotal[day]++;
      for (const ch of first) {
        const d = parseInt(ch);
        if (!isNaN(d)) {
          dayFreq[day][d] = (dayFreq[day][d] || 0) + 1;
        }
      }
    });

    // Calculate influence
    const dayNames = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
    const influence = {};
    
    for (let day = 0; day < 7; day++) {
      if (dayTotal[day] === 0) continue;
      
      influence[dayNames[day]] = {};
      for (let d = 0; d <= 9; d++) {
        const freq = (dayFreq[day][d] || 0) / (dayTotal[day] * 6);
        influence[dayNames[day]][d] = {
          frequency: freq,
          bias: freq / 0.10 // compare to expected 10%
        };
      }
    }

    return { influence, dayTotal, dayNames };
  }

  /**
   * สรุปสถิติจำนวนตัวเลขแต่ละตัว (0-9) ทั้งหมด
   */
  function overallDigitStats(results) {
    const counts = Array(10).fill(0);
    let total = 0;

    results.forEach(r => {
      const first = DataManager.getFirstPrize(r);
      if (!first) return;
      
      for (const ch of first) {
        const d = parseInt(ch);
        if (!isNaN(d)) {
          counts[d]++;
          total++;
        }
      }
    });

    return counts.map((count, digit) => ({
      digit,
      count,
      percentage: ((count / (total || 1)) * 100).toFixed(2),
      deviation: ((count / (total || 1) - 0.10) * 100).toFixed(2)
    }));
  }

  /**
   * วิเคราะห์เลขคู่/คี่
   */
  function oddEvenAnalysis(results) {
    let oddCount = 0, evenCount = 0;
    let totalDigits = 0;

    results.forEach(r => {
      const first = DataManager.getFirstPrize(r);
      if (!first) return;
      for (const ch of first) {
        const d = parseInt(ch);
        if (!isNaN(d)) {
          totalDigits++;
          if (d % 2 === 0) evenCount++;
          else oddCount++;
        }
      }
    });

    return {
      odd: oddCount,
      even: evenCount,
      total: totalDigits,
      oddPct: ((oddCount / (totalDigits || 1)) * 100).toFixed(1),
      evenPct: ((evenCount / (totalDigits || 1)) * 100).toFixed(1)
    };
  }

  /**
   * วิเคราะห์ช่วงตัวเลข (สูง/ต่ำ)
   */
  function highLowAnalysis(results) {
    let highCount = 0, lowCount = 0;
    let total = 0;

    results.forEach(r => {
      const first = DataManager.getFirstPrize(r);
      if (!first) return;
      for (const ch of first) {
        const d = parseInt(ch);
        if (!isNaN(d)) {
          total++;
          if (d >= 5) highCount++;
          else lowCount++;
        }
      }
    });

    return {
      high: highCount,
      low: lowCount,
      total,
      highPct: ((highCount / (total || 1)) * 100).toFixed(1),
      lowPct: ((lowCount / (total || 1)) * 100).toFixed(1)
    };
  }

  /**
   * วิเคราะห์ผลรวมตัวเลข
   */
  function sumAnalysis(results) {
    const sums = [];

    results.forEach(r => {
      const first = DataManager.getFirstPrize(r);
      if (!first) return;
      const sum = first.split('').reduce((acc, ch) => acc + parseInt(ch), 0);
      sums.push(sum);
    });

    const avg = sums.length > 0 ? sums.reduce((a, b) => a + b, 0) / sums.length : 0;
    const sorted = [...sums].sort((a, b) => a - b);
    const median = sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)] : 0;
    
    // Sum frequency distribution
    const sumFreq = {};
    sums.forEach(s => { sumFreq[s] = (sumFreq[s] || 0) + 1; });

    return {
      average: avg.toFixed(1),
      median,
      min: sorted[0] || 0,
      max: sorted[sorted.length - 1] || 0,
      distribution: sumFreq,
      recent10: sums.slice(-10)
    };
  }

  /**
   * รวบรวมผลวิเคราะห์ทั้งหมด
   */
  function runFullAnalysis(results) {
    return {
      digitFrequency: digitFrequency(results),
      last2Frequency: last2Frequency(results),
      last3Frequency: last3Frequency(results),
      front3Frequency: front3Frequency(results),
      hotCold: hotColdAnalysis(results),
      gap: gapAnalysis(results),
      correlation: digitCorrelation(results),
      trends: trendAnalysis(results),
      dayOfWeek: dayOfWeekAnalysis(results),
      overallDigits: overallDigitStats(results),
      oddEven: oddEvenAnalysis(results),
      highLow: highLowAnalysis(results),
      sumAnalysis: sumAnalysis(results)
    };
  }

  return {
    digitFrequency,
    last2Frequency,
    last3Frequency,
    front3Frequency,
    hotColdAnalysis,
    gapAnalysis,
    digitCorrelation,
    trendAnalysis,
    dayOfWeekAnalysis,
    overallDigitStats,
    oddEvenAnalysis,
    highLowAnalysis,
    sumAnalysis,
    runFullAnalysis
  };
})();
