/**
 * backtest.js - Backtesting Engine + Auto-tune Weights + Accuracy Dashboard
 * ทดสอบย้อนหลังว่า model ทำนายได้แม่นยำแค่ไหน
 */

const BacktestEngine = (() => {

  /**
   * Rolling Backtest
   * ทดสอบย้อนหลังแบบ rolling — แต่ละงวดจะใช้ data ก่อนหน้าเป็น training
   */
  function runBacktest(allResults, testSize = 20) {
    if (allResults.length < testSize + 30) {
      console.warn('ข้อมูลน้อยเกินไปสำหรับ Backtesting');
      return null;
    }

    const totalDraws = allResults.length;
    const results = {
      testSize,
      totalDraws,
      hits: { last2: 0, last3: 0, front3: 0, digitMatch: 0 },
      details: [],
      modelAccuracy: {
        frequency: 0,
        hotCold: 0,
        gap: 0,
        trend: 0
      },
      digitHits: Array(10).fill(0),
      timestamp: new Date().toISOString()
    };

    // Rolling: ทดสอบ testSize งวดล่าสุด
    for (let i = 0; i < testSize; i++) {
      const testIdx = totalDraws - testSize + i;
      const trainData = allResults.slice(0, testIdx);
      const actual = allResults[testIdx];

      if (trainData.length < 30) continue;

      try {
        // วิเคราะห์จาก training data
        const analysis = AnalysisEngine.runFullAnalysis(trainData);
        
        // ทำนาย
        const predLast2 = PredictionEngine.predictLast2(analysis, 20);
        const predLast3 = PredictionEngine.predictLast3(analysis, 20);
        const predFront3 = PredictionEngine.predictFront3(analysis, 20);

        // ดึงผลจริง
        const actualFirst = DataManager.getFirstPrize(actual);
        const actualLast2 = DataManager.getLast2(actual);
        const actualLast3 = DataManager.getLast3Back(actual);
        const actualFront3 = DataManager.getLast3Front(actual);
        const dateStr = actual.displayDate || DataManager.getThaiDateStr(actual.drawDate);

        // ตรวจผล
        const last2Hit = predLast2.some(p => p.number === actualLast2);
        const last3Hit = predLast3.some(p => actualLast3.includes(p.number));
        const front3Hit = predFront3.some(p => actualFront3.includes(p.number));

        // ตรวจ digit match — ดูว่าเลขที่ hot ตรงกับรางวัลที่ 1 กี่ตัว
        let digitMatchCount = 0;
        if (actualFirst) {
          for (const ch of actualFirst) {
            const d = parseInt(ch);
            const hc = analysis.hotCold.find(h => h.digit === d);
            if (hc && hc.classification === 'hot') digitMatchCount++;
          }
        }
        const digitHit = digitMatchCount >= 3;

        if (last2Hit) results.hits.last2++;
        if (last3Hit) results.hits.last3++;
        if (front3Hit) results.hits.front3++;
        if (digitHit) results.hits.digitMatch++;

        // นับ digit hits
        if (actualFirst) {
          for (const ch of actualFirst) {
            results.digitHits[parseInt(ch)]++;
          }
        }

        // บันทึกรายละเอียด
        results.details.push({
          draw: testIdx + 1,
          date: dateStr,
          actualFirst: actualFirst || '—',
          actualLast2,
          actualLast3: actualLast3.join(', '),
          actualFront3: actualFront3.join(', '),
          predLast2Top5: predLast2.slice(0, 5).map(p => p.number),
          predLast3Top5: predLast3.slice(0, 5).map(p => p.number),
          predFront3Top5: predFront3.slice(0, 5).map(p => p.number),
          last2Hit,
          last3Hit,
          front3Hit,
          digitHit,
          hotDigitsInFirst: digitMatchCount
        });

      } catch (e) {
        console.warn(`Backtest error at index ${testIdx}:`, e);
      }
    }

    // คำนวณ accuracy
    const validTests = results.details.length;
    results.accuracy = {
      last2: validTests > 0 ? ((results.hits.last2 / validTests) * 100).toFixed(1) : '0',
      last3: validTests > 0 ? ((results.hits.last3 / validTests) * 100).toFixed(1) : '0',
      front3: validTests > 0 ? ((results.hits.front3 / validTests) * 100).toFixed(1) : '0',
      digitMatch: validTests > 0 ? ((results.hits.digitMatch / validTests) * 100).toFixed(1) : '0',
      overall: validTests > 0 ? ((
        (results.hits.last2 + results.hits.last3 + results.hits.front3) / (validTests * 3)
      ) * 100).toFixed(1) : '0'
    };

    // คำนวณ baseline (สุ่มเทียบ)
    results.baseline = {
      last2: ((20 / 100) * 100).toFixed(1), // 20 predictions จาก 100 ตัวเลข = 20%
      last3: ((20 / 1000) * 100).toFixed(1), // 20 predictions จาก 1000 = 2%
      front3: ((10 / 1000) * 100).toFixed(1), // 10 predictions จาก 1000 = 1%
    };

    return results;
  }

  /**
   * Auto-Tune Weights
   * หา weights ที่ดีที่สุดจาก backtesting
   */
  function autoTuneWeights(allResults) {
    if (allResults.length < 60) return PredictionEngine.WEIGHTS;

    const trainData = allResults.slice(0, -10);
    const testData = allResults.slice(-10);
    const analysis = AnalysisEngine.runFullAnalysis(trainData);

    // ทดสอบหลายชุด weights
    const weightSets = [
      { frequency: 0.25, hotCold: 0.20, gap: 0.20, correlation: 0.15, trend: 0.10, dayOfWeek: 0.10 },
      { frequency: 0.30, hotCold: 0.25, gap: 0.20, correlation: 0.10, trend: 0.10, dayOfWeek: 0.05 },
      { frequency: 0.20, hotCold: 0.15, gap: 0.30, correlation: 0.15, trend: 0.10, dayOfWeek: 0.10 },
      { frequency: 0.35, hotCold: 0.15, gap: 0.15, correlation: 0.15, trend: 0.10, dayOfWeek: 0.10 },
      { frequency: 0.20, hotCold: 0.25, gap: 0.25, correlation: 0.10, trend: 0.15, dayOfWeek: 0.05 },
      { frequency: 0.25, hotCold: 0.20, gap: 0.25, correlation: 0.10, trend: 0.10, dayOfWeek: 0.10 },
      { frequency: 0.15, hotCold: 0.20, gap: 0.30, correlation: 0.15, trend: 0.15, dayOfWeek: 0.05 },
      { frequency: 0.30, hotCold: 0.20, gap: 0.15, correlation: 0.15, trend: 0.15, dayOfWeek: 0.05 },
    ];

    let bestWeights = weightSets[0];
    let bestScore = -1;

    for (const w of weightSets) {
      let hit = 0;
      
      for (const testDraw of testData) {
        const actualLast2 = DataManager.getLast2(testDraw);
        
        // คำนวณ score ด้วย custom weights
        for (let i = 0; i < 100; i++) {
          const num = String(i).padStart(2, '0');
          const freqEntry = analysis.last2Frequency.find(f => f.number === num);
          const freqScore = freqEntry ? freqEntry.count / (analysis.last2Frequency[0]?.count || 1) : 0;
          const gapEntry = analysis.gap.find(g => g.number === num);
          const gapScore = gapEntry ? Math.min(parseFloat(gapEntry.gapScore) / 3, 1) : 0;

          if (num === actualLast2) {
            hit += w.frequency * freqScore + w.gap * gapScore;
          }
        }
      }

      if (hit > bestScore) {
        bestScore = hit;
        bestWeights = w;
      }
    }

    return bestWeights;
  }

  /**
   * ค้นหาเลข — วิเคราะห์เลขที่ผู้ใช้ต้องการค้นหา
   */
  function searchNumber(number, allResults, analysisData) {
    const numStr = String(number).padStart(2, '0');
    const numLen = numStr.length;
    const result = {
      number: numStr,
      type: numLen <= 2 ? 'ท้าย 2 ตัว' : numLen <= 3 ? '3 ตัว' : '6 ตัว',
      totalAppearances: 0,
      lastSeenDate: 'ไม่เคยออก',
      lastSeenDrawsAgo: null,
      currentGap: null,
      avgGap: null,
      hotColdStatus: 'unknown',
      frequency: null,
      rank: null,
      totalNumbers: null,
      compositeScore: null,
      confidence: null,
      appearances: [],
      digitAnalysis: []
    };

    if (numLen <= 2) {
      // ท้าย 2 ตัว
      const searchNum = numStr.padStart(2, '0');
      
      // นับจำนวนครั้งที่ออก
      const appearances = [];
      allResults.forEach((r, idx) => {
        const last2 = DataManager.getLast2(r);
        if (last2 === searchNum) {
          appearances.push({
            index: idx,
            date: r.displayDate || DataManager.getThaiDateStr(r.drawDate),
            drawDate: r.drawDate
          });
        }
      });

      result.totalAppearances = appearances.length;
      result.appearances = appearances.slice(-10).reverse();
      result.totalNumbers = 100;

      if (appearances.length > 0) {
        const lastApp = appearances[appearances.length - 1];
        result.lastSeenDate = lastApp.date;
        result.lastSeenDrawsAgo = allResults.length - lastApp.index;
      }

      // หา rank จาก frequency
      const freqList = analysisData.last2Frequency;
      const freqEntry = freqList.find(f => f.number === searchNum);
      if (freqEntry) {
        result.frequency = (freqEntry.frequency * 100).toFixed(2) + '%';
        result.rank = freqList.indexOf(freqEntry) + 1;
      } else {
        result.frequency = '0%';
        result.rank = 100;
      }

      // gap analysis
      const gapEntry = analysisData.gap.find(g => g.number === searchNum);
      if (gapEntry) {
        result.currentGap = gapEntry.currentGap + ' งวด';
        result.avgGap = gapEntry.avgGap + ' งวด';
      }

      // composite score & confidence from predictions
      const pred = PredictionEngine.predictLast2(analysisData, 100);
      const predEntry = pred.find(p => p.number === searchNum);
      if (predEntry) {
        const predRank = pred.indexOf(predEntry);
        result.compositeScore = predEntry.score.toFixed(4);
        result.confidence = predEntry.confidence + '%';
        result.rank = predRank + 1;
      }

    } else if (numLen === 3) {
      // 3 ตัว
      const searchNum = numStr;
      
      // ตรวจทั้งท้าย 3 และหน้า 3
      const appearances = [];
      allResults.forEach((r, idx) => {
        const last3 = DataManager.getLast3Back(r);
        const front3 = DataManager.getLast3Front(r);
        const matched = [];
        if (last3.includes(searchNum)) matched.push('ท้าย 3');
        if (front3.includes(searchNum)) matched.push('หน้า 3');
        if (matched.length > 0) {
          appearances.push({
            index: idx,
            date: r.displayDate || DataManager.getThaiDateStr(r.drawDate),
            type: matched.join(', ')
          });
        }
      });

      result.totalAppearances = appearances.length;
      result.appearances = appearances.slice(-10).reverse();
      result.totalNumbers = 1000;

      if (appearances.length > 0) {
        const lastApp = appearances[appearances.length - 1];
        result.lastSeenDate = lastApp.date;
        result.lastSeenDrawsAgo = allResults.length - lastApp.index;
      }

      result.frequency = ((appearances.length / allResults.length) * 100).toFixed(2) + '%';

    } else if (numLen === 6) {
      // 6 หลัก → ตรวจรางวัลที่ 1
      const appearances = [];
      allResults.forEach((r, idx) => {
        const first = DataManager.getFirstPrize(r);
        if (first === numStr) {
          appearances.push({
            index: idx,
            date: r.displayDate || DataManager.getThaiDateStr(r.drawDate)
          });
        }
      });

      result.totalAppearances = appearances.length;
      result.appearances = appearances;
      result.totalNumbers = 1000000;
      result.frequency = ((appearances.length / allResults.length) * 100).toFixed(4) + '%';

      if (appearances.length > 0) {
        const lastApp = appearances[appearances.length - 1];
        result.lastSeenDate = lastApp.date;
        result.lastSeenDrawsAgo = allResults.length - lastApp.index;
      }
    }

    // Digit analysis สำหรับทุกประเภท
    for (const ch of numStr) {
      const d = parseInt(ch);
      const hc = analysisData.hotCold.find(h => h.digit === d);
      const trend = analysisData.trends[d];
      result.digitAnalysis.push({
        digit: d,
        classification: hc ? hc.classification : 'normal',
        ratio: hc ? hc.ratio : '1.00',
        trend: trend ? trend.trend : 'stable'
      });
    }

    // overall hot/cold
    const hotCount = result.digitAnalysis.filter(d => d.classification === 'hot').length;
    const coldCount = result.digitAnalysis.filter(d => d.classification === 'cold').length;
    result.hotColdStatus = hotCount > coldCount ? '🔥 Hot' : coldCount > hotCount ? '❄️ Cold' : '⚪ Normal';

    return result;
  }

  return {
    runBacktest,
    autoTuneWeights,
    searchNumber
  };
})();
