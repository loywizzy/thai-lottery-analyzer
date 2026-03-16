/**
 * prediction.js - Prediction Engine
 * เครื่องยนต์ทำนายตัวเลขล็อตเตอรี่ไทย
 * ใช้ Composite Score จากหลาย Models
 */

const PredictionEngine = (() => {

  // น้ำหนักของแต่ละ Model (ปรับได้ผ่าน auto-tune)
  let WEIGHTS = {
    frequency: 0.25,
    hotCold: 0.20,
    gap: 0.20,
    correlation: 0.15,
    trend: 0.10,
    dayOfWeek: 0.10
  };

  /**
   * ปรับ weights (จาก auto-tune)
   */
  function setWeights(newWeights) {
    WEIGHTS = { ...WEIGHTS, ...newWeights };
  }

  /**
   * ให้ Confidence แบบ Percentile Ranking
   * Top 1% → ~85%, Bottom 50% → ~30%, สุดท้าย → ~15%
   */
  function assignPercentileConfidence(sortedScores) {
    const n = sortedScores.length;
    if (n === 0) return sortedScores;
    
    // หา min/max score เพื่อ normalize
    const maxScore = sortedScores[0].score;
    const minScore = sortedScores[n - 1].score;
    const range = maxScore - minScore || 1;
    
    sortedScores.forEach((item, idx) => {
      // Percentile rank (0 = worst, 1 = best)
      const percentile = 1 - (idx / n);
      
      // Normalized score (0 to 1)
      const normalizedScore = (item.score - minScore) / range;
      
      // Blend percentile + normalized score for realistic confidence
      // Range: 12% ~ 82%
      const rawConf = percentile * 0.6 + normalizedScore * 0.4;
      item.confidence = (rawConf * 70 + 12).toFixed(1);
    });
    
    return sortedScores;
  }

  /**
   * ทำนายเลขท้าย 2 ตัว
   */
  function predictLast2(analysisData, topN = 10) {
    const { last2Frequency, gap, hotCold, trends } = analysisData;

    // Score each 2-digit number
    const scores = [];
    
    for (let i = 0; i < 100; i++) {
      const num = String(i).padStart(2, '0');
      
      // Frequency Score
      const freqEntry = last2Frequency.find(f => f.number === num);
      const freqScore = freqEntry ? freqEntry.count : 0;
      
      // Gap Score
      const gapEntry = gap.find(g => g.number === num);
      const gapScore = gapEntry ? parseFloat(gapEntry.gapScore) : 0;
      
      // Hot/Cold Score per digit
      let hotColdScore = 0;
      const d1 = parseInt(num[0]);
      const d2 = parseInt(num[1]);
      const hc1 = hotCold.find(h => h.digit === d1);
      const hc2 = hotCold.find(h => h.digit === d2);
      
      if (hc1) hotColdScore += parseFloat(hc1.ratio);
      if (hc2) hotColdScore += parseFloat(hc2.ratio);
      hotColdScore /= 2;
      
      // Trend Score per digit
      let trendScore = 0;
      if (trends[d1]) trendScore += parseFloat(trends[d1].trendScore);
      if (trends[d2]) trendScore += parseFloat(trends[d2].trendScore);
      trendScore = trendScore / 2;

      // Composite Score
      const maxFreq = last2Frequency[0]?.count || 1;
      const normalizedFreq = freqScore / maxFreq;
      const normalizedGap = Math.min(gapScore / 3, 1); // cap at 3
      const normalizedHC = Math.min(hotColdScore / 2, 1);
      const normalizedTrend = (trendScore + 100) / 200; // normalize around 0

      const compositeScore = 
        WEIGHTS.frequency * normalizedFreq +
        WEIGHTS.gap * normalizedGap +
        WEIGHTS.hotCold * normalizedHC +
        WEIGHTS.trend * normalizedTrend;

      scores.push({
        number: num,
        score: compositeScore,
        confidence: '0', // จะถูกคำนวณใหม่ด้วย percentile
        details: {
          freqScore: normalizedFreq.toFixed(3),
          gapScore: normalizedGap.toFixed(3),
          hotColdScore: normalizedHC.toFixed(3),
          trendScore: normalizedTrend.toFixed(3)
        }
      });
    }

    scores.sort((a, b) => b.score - a.score);
    assignPercentileConfidence(scores);
    return scores.slice(0, topN);
  }

  /**
   * ทำนายเลขท้าย 3 ตัว
   */
  function predictLast3(analysisData, topN = 10) {
    const { last3Frequency, hotCold, trends } = analysisData;
    
    const scores = [];
    const maxCount = last3Frequency[0]?.count || 1;
    
    // เน้นเลขที่เคยออกบ่อย + digit ที่เป็น hot
    last3Frequency.slice(0, 50).forEach(entry => {
      const num = entry.number;
      const freqScore = entry.count / maxCount;
      
      // Hot/Cold influence
      let hcScore = 0;
      for (const ch of num) {
        const d = parseInt(ch);
        const hc = hotCold.find(h => h.digit === d);
        if (hc) hcScore += parseFloat(hc.ratio);
      }
      hcScore /= num.length;

      // Trend influence  
      let trendScore = 0;
      for (const ch of num) {
        const d = parseInt(ch);
        if (trends[d]) trendScore += parseFloat(trends[d].trendScore);
      }
      trendScore = trendScore / num.length;

      const composite = 
        WEIGHTS.frequency * freqScore +
        WEIGHTS.hotCold * Math.min(hcScore / 2, 1) +
        WEIGHTS.trend * ((trendScore + 100) / 200);

      scores.push({
        number: num,
        score: composite,
        confidence: '0',
        count: entry.count
      });
    });

    // เพิ่มเลขที่สร้างจาก hot digits
    const hotDigits = hotCold
      .filter(h => h.classification === 'hot')
      .map(h => h.digit);
    
    if (hotDigits.length >= 3) {
      for (let i = 0; i < hotDigits.length; i++) {
        for (let j = 0; j < hotDigits.length; j++) {
          for (let k = 0; k < hotDigits.length; k++) {
            const num = `${hotDigits[i]}${hotDigits[j]}${hotDigits[k]}`;
            if (!scores.find(s => s.number === num)) {
              scores.push({
                number: num,
                score: 0.5,
                confidence: '50.0',
                count: 0,
                source: 'hot-digits'
              });
            }
          }
        }
      }
    }

    scores.sort((a, b) => b.score - a.score);
    assignPercentileConfidence(scores);
    return scores.slice(0, topN);
  }

  /**
   * ทำนายเลขหน้า 3 ตัว
   */
  function predictFront3(analysisData, topN = 10) {
    const { front3Frequency, hotCold, trends } = analysisData;
    
    const scores = [];
    const maxCount = front3Frequency[0]?.count || 1;
    
    front3Frequency.slice(0, 50).forEach(entry => {
      const num = entry.number;
      const freqScore = entry.count / maxCount;
      
      let hcScore = 0;
      for (const ch of num) {
        const d = parseInt(ch);
        const hc = hotCold.find(h => h.digit === d);
        if (hc) hcScore += parseFloat(hc.ratio);
      }
      hcScore /= num.length;

      let trendScore = 0;
      for (const ch of num) {
        const d = parseInt(ch);
        if (trends[d]) trendScore += parseFloat(trends[d].trendScore);
      }
      trendScore = trendScore / num.length;

      const composite = 
        WEIGHTS.frequency * freqScore +
        WEIGHTS.hotCold * Math.min(hcScore / 2, 1) +
        WEIGHTS.trend * ((trendScore + 100) / 200);

      scores.push({
        number: num,
        score: composite,
        confidence: '0',
        count: entry.count
      });
    });

    scores.sort((a, b) => b.score - a.score);
    assignPercentileConfidence(scores);
    return scores.slice(0, topN);
  }

  /**
   * ทำนายเลข 6 หลัก (รางวัลที่ 1)
   */
  function predictFirst(analysisData, topN = 5) {
    const { digitFrequency, hotCold, trends, correlation, dayOfWeek } = analysisData;
    
    // หา top digits ในแต่ละตำแหน่ง
    const topDigitsPerPos = [];
    
    for (let pos = 0; pos < 6; pos++) {
      const posData = digitFrequency.normalized[pos];
      const ranked = posData
        .map((data, digit) => ({ digit, ...data }))
        .sort((a, b) => b.frequency - a.frequency);
      
      // Apply hot/cold bias
      ranked.forEach(item => {
        const hc = hotCold.find(h => h.digit === item.digit);
        if (hc && hc.classification === 'hot') {
          item.boosted = item.frequency * 1.2;
        } else if (hc && hc.classification === 'cold') {
          // เลขเย็นก็มีโอกาส (mean reversion)
          item.boosted = item.frequency * 1.1;
        } else {
          item.boosted = item.frequency;
        }
        
        // Apply trend
        if (trends[item.digit]) {
          const ts = parseFloat(trends[item.digit].trendScore);
          item.boosted *= (1 + ts / 200);
        }
      });

      ranked.sort((a, b) => b.boosted - a.boosted);
      topDigitsPerPos.push(ranked.slice(0, 4));
    }

    // สร้าง combinations จาก top digits
    const combinations = [];
    
    // Strategy 1: Top-1 in each position
    let topNum = '';
    for (let pos = 0; pos < 6; pos++) {
      topNum += String(topDigitsPerPos[pos][0].digit);
    }
    combinations.push(topNum);

    // Strategy 2: Mix top-1 and top-2
    for (let swapPos = 0; swapPos < 6; swapPos++) {
      let num = '';
      for (let pos = 0; pos < 6; pos++) {
        if (pos === swapPos && topDigitsPerPos[pos].length > 1) {
          num += String(topDigitsPerPos[pos][1].digit);
        } else {
          num += String(topDigitsPerPos[pos][0].digit);
        }
      }
      if (!combinations.includes(num)) {
        combinations.push(num);
      }
    }

    // Strategy 3: Random combinations from top-3 per position
    for (let attempt = 0; attempt < 20; attempt++) {
      let num = '';
      for (let pos = 0; pos < 6; pos++) {
        const topCount = Math.min(3, topDigitsPerPos[pos].length);
        const idx = Math.floor(Math.random() * topCount);
        num += String(topDigitsPerPos[pos][idx].digit);
      }
      if (!combinations.includes(num)) {
        combinations.push(num);
      }
    }

    // Score each combination
    const scored = combinations.map(num => {
      let score = 0;
      
      // Position frequency score
      for (let pos = 0; pos < 6; pos++) {
        const digit = parseInt(num[pos]);
        const posEntry = topDigitsPerPos[pos].find(d => d.digit === digit);
        if (posEntry) score += posEntry.boosted;
      }
      
      // Correlation bonus
      const digits = num.split('').map(Number);
      let corrBonus = 0;
      for (let i = 0; i < digits.length; i++) {
        for (let j = i + 1; j < digits.length; j++) {
          corrBonus += correlation.matrix[digits[i]][digits[j]];
        }
      }
      score += corrBonus * WEIGHTS.correlation;

      return {
        number: num,
        score,
        confidence: '0' // percentile จะคำนวณหลัง sort
      };
    });

    scored.sort((a, b) => b.score - a.score);
    assignPercentileConfidence(scored);
    return scored.slice(0, topN);
  }

  /**
   * 🔗 Combo Prediction 6 หลัก
   * นำเลขหน้า 3 ตัว + เลขท้าย 3 ตัว ต่อกันเป็น 6 หลัก
   * แล้วตรวจว่าเลขท้าย 2 ตัวของ combo ตรงกับ prediction ท้าย 2 ตัวหรือไม่
   * ถ้าตรง = "Triple Match" → โอกาสสูงสุดในล็อตเตอรี่ 1 ชุด
   */
  function predictCombo6(analysisData, topN = 10) {
    // ดึง predictions แต่ละประเภท (เยอะขึ้นเพื่อสร้าง combos ที่หลากหลาย)
    const front3List = predictFront3(analysisData, 15);
    const last3List = predictLast3(analysisData, 15);
    const last2List = predictLast2(analysisData, 20);
    const { hotCold, correlation } = analysisData;

    // สร้าง lookup สำหรับ last-2 predictions (เพื่อตรวจ match เร็ว)
    const last2Set = new Map();
    last2List.forEach(item => {
      last2Set.set(item.number, {
        score: item.score,
        confidence: item.confidence
      });
    });

    const combos = [];
    const seen = new Set();

    // === Strategy 1: Front-3 + Back-3 Combinations ===
    for (const f3 of front3List) {
      for (const b3 of last3List) {
        const combo6 = f3.number + b3.number;
        if (seen.has(combo6)) continue;
        seen.add(combo6);

        // เลขท้าย 2 ตัวของ combo
        const comboLast2 = combo6.slice(-2);
        // เลขท้าย 3 ตัวของ combo
        const comboLast3 = combo6.slice(-3);
        // เลขหน้า 3 ตัวของ combo
        const comboFront3 = combo6.slice(0, 3);

        // ตรวจว่าท้าย 2 ตัว match กับ prediction ท้าย 2 ตัวหรือไม่
        const last2Match = last2Set.get(comboLast2);

        // === คำนวณ Score ===
        // Base score จาก front3 + back3
        let score = f3.score + b3.score;

        // Match bonuses
        let matchLevel = 0;
        const matchReasons = [];

        // 1. ท้าย 2 ตัว match
        if (last2Match) {
          score += last2Match.score * 1.5; // Bonus x1.5
          matchLevel++;
          matchReasons.push(`ท้าย 2 ตัว "${comboLast2}" ตรงกับ prediction`);
        }

        // 2. ตรวจว่าท้าย 3 ตัวของ combo ตรงกับ back3 prediction
        if (b3.number === comboLast3) {
          matchLevel++;
          matchReasons.push(`ท้าย 3 ตัว "${comboLast3}" = prediction`);
        }

        // 3. ตรวจว่าหน้า 3 ตัวของ combo ตรงกับ front3 prediction
        if (f3.number === comboFront3) {
          matchLevel++;
          matchReasons.push(`หน้า 3 ตัว "${comboFront3}" = prediction`);
        }

        // 4. Hot digit bonus
        let hotCount = 0;
        for (const ch of combo6) {
          const d = parseInt(ch);
          const hc = hotCold.find(h => h.digit === d);
          if (hc && hc.classification === 'hot') hotCount++;
        }
        score += hotCount * 0.05;

        // 5. Digit correlation bonus
        const digits = combo6.split('').map(Number);
        let corrBonus = 0;
        for (let i = 0; i < digits.length; i++) {
          for (let j = i + 1; j < digits.length; j++) {
            corrBonus += correlation.matrix[digits[i]][digits[j]];
          }
        }
        score += corrBonus * WEIGHTS.correlation * 0.5;

        // Match Level determines the "tier"
        // 3 = Triple Match (หน้า3 + ท้าย3 + ท้าย2 ตรงหมด) → สูงสุด
        // 2 = Double Match
        // 1 = Single Match
        // 0 = No Match (ยังเป็น combo ที่ดีจาก score ของ components)

        const matchLabels = ['—', '✦ Single', '✦✦ Double', '✦✦✦ Triple'];
        const matchLabel = matchLabels[Math.min(matchLevel, 3)];

        // Boost score based on match level
        score *= (1 + matchLevel * 0.3);

        const confidence = Math.min(score * 40, 99).toFixed(1);

        combos.push({
          number: combo6,
          score,
          confidence,
          matchLevel,
          matchLabel,
          matchReasons,
          front3: f3.number,
          back3: b3.number,
          last2: comboLast2,
          last2Matched: !!last2Match,
          hotDigits: hotCount,
          components: {
            front3Score: parseFloat(f3.confidence),
            back3Score: parseFloat(b3.confidence),
            last2Score: last2Match ? parseFloat(last2Match.confidence) : 0
          }
        });
      }
    }

    // จัดอันดับ: เรียงตาม matchLevel (สูงก่อน) แล้วตาม score
    combos.sort((a, b) => {
      if (b.matchLevel !== a.matchLevel) return b.matchLevel - a.matchLevel;
      return b.score - a.score;
    });

    return combos.slice(0, topN);
  }

  /**
   * ทำนายทั้งหมด
   */
  function predict(analysisData) {
    return {
      first: predictFirst(analysisData),
      last2: predictLast2(analysisData),
      last3: predictLast3(analysisData),
      front3: predictFront3(analysisData),
      combo6: predictCombo6(analysisData),
      timestamp: new Date().toISOString(),
      nextDraw: DataManager.getNextDrawDate()
    };
  }

  /**
   * สรุปเลขเด็ด (Hot Picks)
   */
  function getHotPicks(analysisData) {
    const { hotCold, trends, overallDigits } = analysisData;
    
    const picks = [];
    
    // เลขร้อน
    hotCold.filter(h => h.classification === 'hot').forEach(h => {
      picks.push({
        digit: h.digit,
        reason: 'เลขร้อน - ออกบ่อยใน 10 งวดล่าสุด',
        score: parseFloat(h.ratio),
        type: 'hot'
      });
    });

    // เลขมีเทรนด์ขึ้น
    for (let d = 0; d <= 9; d++) {
      if (trends[d] && trends[d].trend === 'up') {
        const existing = picks.find(p => p.digit === d);
        if (existing) {
          existing.reason += ' + แนวโน้มขาขึ้น';
          existing.score += Math.abs(parseFloat(trends[d].trendScore)) / 100;
        } else {
          picks.push({
            digit: d,
            reason: 'แนวโน้มขาขึ้น',
            score: Math.abs(parseFloat(trends[d].trendScore)) / 100 + 0.5,
            type: 'trending'
          });
        }
      }
    }

    return picks.sort((a, b) => b.score - a.score);
  }

  return {
    predict,
    predictFirst,
    predictLast2,
    predictLast3,
    predictFront3,
    predictCombo6,
    getHotPicks,
    setWeights,
    WEIGHTS
  };
})();
