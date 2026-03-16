/**
 * app.js - Main Application Controller
 * ควบคุมการทำงานหลักของระบบ Thai Lottery Prediction
 */

const App = (() => {
  let results = [];
  let analysisData = null;
  let predictions = null;
  let currentSection = 'dashboard';

  /**
   * เริ่มต้นระบบ
   */
  async function init() {
    showLoading(true);
    
    try {
      // โหลดข้อมูล
      results = await DataManager.getData(false, (pct, msg) => {
        updateLoadingProgress(pct, msg);
      });

      // วิเคราะห์ข้อมูล
      updateLoadingProgress(80, 'กำลังวิเคราะห์ข้อมูล...');
      analysisData = AnalysisEngine.runFullAnalysis(results);

      // ทำนาย
      updateLoadingProgress(90, 'กำลังคำนวณเลขเด็ด...');
      predictions = PredictionEngine.predict(analysisData);

      // แสดงผล
      updateLoadingProgress(95, 'กำลังแสดงผล...');
      renderDashboard();
      setupNavigation();
      setupThemeToggle();
      setupSearchHandler();
      
      updateLoadingProgress(100, 'โหลดเสร็จสิ้น!');
      
      setTimeout(() => showLoading(false), 500);
    } catch (error) {
      console.error('Init error:', error);
      updateLoadingProgress(100, 'เกิดข้อผิดพลาด: ' + error.message);
      setTimeout(() => showLoading(false), 2000);
    }
  }

  /**
   * ตั้งค่า Navigation
   */
  function setupNavigation() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const section = btn.dataset.section;
        switchSection(section);
        // Scroll to top on section switch for mobile friendliness
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });
  }

  /**
   * เปลี่ยน Section
   */
  function switchSection(sectionName) {
    currentSection = sectionName;
    
    // Update nav
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.section === sectionName);
    });
    
    // Update sections
    document.querySelectorAll('.section').forEach(sec => {
      sec.classList.toggle('active', sec.id === `section-${sectionName}`);
    });

    // Render section if needed
    switch (sectionName) {
      case 'dashboard': renderDashboard(); break;
      case 'analysis': renderAnalysis(); break;
      case 'prediction': renderPrediction(); break;
      case 'accuracy': renderAccuracy(); break;
      case 'history': renderHistory(); break;
    }
  }

  /**
   * ── Dashboard Section ──
   */
  function renderDashboard() {
    const latest = DataManager.getLatestResult(results);
    const nextDraw = DataManager.getNextDrawDate();
    
    // Hero Stats
    setContent('stat-total-draws', results.length);
    setContent('stat-data-range', `${results.length > 0 ? results[0].drawDate?.split('-')[0] : '?'}-${new Date().getFullYear()}`);
    setContent('stat-next-draw', nextDraw.thaiStr);
    setContent('stat-next-day', nextDraw.dayOfWeek);

    // Latest Result
    if (latest) {
      setContent('latest-date', latest.displayDate || DataManager.getThaiDateStr(latest.drawDate));
      setContent('latest-first', DataManager.getFirstPrize(latest));
      setContent('latest-last2', DataManager.getLast2(latest));
      
      const last3f = DataManager.getLast3Front(latest);
      setContent('latest-front3', last3f.join(', '));
      
      const last3b = DataManager.getLast3Back(latest);
      setContent('latest-back3', last3b.join(', '));
    }

    // Hot Picks
    renderHotPicks();

    // Mini Stats
    renderMiniStats();

    // Quick Charts
    setTimeout(() => {
      ChartRenderer.drawFrequencyBar('chart-digit-freq', analysisData.overallDigits);
      
      const { oddEven, highLow } = analysisData;
      ChartRenderer.drawPieChart('chart-odd-even', 
        [oddEven.odd, oddEven.even],
        ['คี่', 'คู่'],
        ['#ef4444', '#3b82f6']
      );
      ChartRenderer.drawPieChart('chart-high-low',
        [highLow.high, highLow.low],
        ['สูง(5-9)', 'ต่ำ(0-4)'],
        ['#f59e0b', '#10b981']
      );
    }, 100);
  }

  /**
   * แสดงเลขเด็ด Hot Picks
   */
  function renderHotPicks() {
    const container = document.getElementById('hot-picks-container');
    if (!container || !predictions) return;

    const last2 = predictions.last2.slice(0, 6);
    
    container.innerHTML = last2.map((item, i) => `
      <div class="prediction-item animate-slide-up" style="animation-delay: ${i * 0.08}s">
        <div class="prediction-rank">${i + 1}</div>
        <div class="prediction-number">${item.number}</div>
        <div class="prediction-score">ความมั่นใจ ${item.confidence}%</div>
        <div class="prediction-confidence">
          <div class="prediction-confidence-bar" style="width: ${item.confidence}%"></div>
        </div>
      </div>
    `).join('');
  }

  /**
   * แสดง Mini Stats
   */
  function renderMiniStats() {
    const { oddEven, highLow, sumAnalysis: sumData } = analysisData;
    
    setContent('stat-odd-pct', `${oddEven.oddPct}%`);
    setContent('stat-even-pct', `${oddEven.evenPct}%`);
    setContent('stat-sum-avg', sumData.average);
    setContent('stat-sum-median', sumData.median);
  }

  /**
   * ── Analysis Section ──
   */
  function renderAnalysis() {
    // Tabs
    setupAnalysisTabs();
    
    // Render default tab
    renderAnalysisTab('freq');
  }

  function setupAnalysisTabs() {
    document.querySelectorAll('#analysis-tabs .tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        
        document.querySelectorAll('#analysis-tabs .tab-btn').forEach(b => 
          b.classList.toggle('active', b === btn)
        );
        
        document.querySelectorAll('.analysis-tab-content').forEach(c =>
          c.classList.toggle('active', c.id === `analysis-${tab}`)
        );

        renderAnalysisTab(tab);
      });
    });
  }

  function renderAnalysisTab(tab) {
    switch (tab) {
      case 'freq': renderFrequencyAnalysis(); break;
      case 'hotcold': renderHotColdAnalysis(); break;
      case 'gap': renderGapAnalysis(); break;
      case 'trend': renderTrendAnalysis(); break;
      case 'heatmap': renderHeatmapAnalysis(); break;
    }
  }

  function renderFrequencyAnalysis() {
    // Digit frequency bar chart
    const container = document.getElementById('freq-bars-container');
    if (!container) return;

    const digits = analysisData.overallDigits;
    const maxCount = Math.max(...digits.map(d => d.count));
    
    container.innerHTML = digits.map(d => {
      const width = (d.count / (maxCount || 1)) * 100;
      const color = ChartRenderer.DIGIT_COLORS[d.digit];
      return `
        <div class="freq-row">
          <div class="freq-label" style="color: ${color}">${d.digit}</div>
          <div class="freq-bar-wrapper">
            <div class="freq-bar" style="width: ${width}%; background: linear-gradient(90deg, ${color}, ${color}88)">
              <span>${d.percentage}%</span>
            </div>
          </div>
          <div class="freq-count">${d.count} ครั้ง</div>
        </div>
      `;
    }).join('');

    // Last 2 frequency table
    renderLast2FreqTable();

    setTimeout(() => {
      ChartRenderer.drawSumDistribution('chart-sum-dist', analysisData.sumAnalysis);
    }, 100);
  }

  function renderLast2FreqTable() {
    const tbody = document.getElementById('last2-freq-tbody');
    if (!tbody) return;

    const top20 = analysisData.last2Frequency.slice(0, 20);
    tbody.innerHTML = top20.map((item, i) => `
      <tr>
        <td class="td-highlight">${i + 1}</td>
        <td class="td-highlight" style="font-size: 1.1rem">${item.number}</td>
        <td>${item.count}</td>
        <td>${(item.frequency * 100).toFixed(2)}%</td>
        <td>${item.count > item.expected * results.length ? '🔴 สูง' : '🔵 ต่ำ'}</td>
      </tr>
    `).join('');
  }

  function renderHotColdAnalysis() {
    const container = document.getElementById('hotcold-container');
    if (!container) return;

    const data = analysisData.hotCold;
    
    container.innerHTML = `
      <div style="display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; margin-bottom: 24px;">
        ${data.map(d => {
          const cls = d.classification;
          return `
            <div class="number-ball ${cls}" title="อัตราส่วน: ${d.ratio}">
              ${d.digit}
            </div>
          `;
        }).join('')}
      </div>
      <div class="data-table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>ตัวเลข</th>
              <th>จำนวน (ทั้งหมด)</th>
              <th>จำนวน (10 งวดล่าสุด)</th>
              <th>อัตราทั้งหมด</th>
              <th>อัตราล่าสุด</th>
              <th>อัตราส่วน</th>
              <th>สถานะ</th>
            </tr>
          </thead>
          <tbody>
            ${data.map(d => `
              <tr>
                <td class="td-highlight">${d.digit}</td>
                <td>${d.overallCount}</td>
                <td>${d.recentCount}</td>
                <td>${d.overallRate}%</td>
                <td>${d.recentRate}%</td>
                <td>${d.ratio}</td>
                <td>
                  <span class="card-badge badge-${d.classification === 'hot' ? 'hot' : d.classification === 'cold' ? 'cold' : 'gold'}">
                    ${d.classification === 'hot' ? '🔥 Hot' : d.classification === 'cold' ? '❄️ Cold' : '⚪ Normal'}
                  </span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderGapAnalysis() {
    const container = document.getElementById('gap-container');
    if (!container) return;

    const data = analysisData.gap.slice(0, 20);
    
    container.innerHTML = `
      <p style="color: var(--text-muted); margin-bottom: 16px; font-size: 0.88rem;">
        เลขที่มี Gap Score สูง = ครบรอบที่ควรจะออก (Overdue)
      </p>
      <div class="data-table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>อันดับ</th>
              <th>เลขท้าย 2 ตัว</th>
              <th>Gap เฉลี่ย</th>
              <th>Gap ปัจจุบัน</th>
              <th>Gap Score</th>
              <th>สถานะ</th>
            </tr>
          </thead>
          <tbody>
            ${data.map((d, i) => `
              <tr>
                <td>${i + 1}</td>
                <td class="td-highlight" style="font-size: 1.1rem">${d.number}</td>
                <td>${d.avgGap} งวด</td>
                <td>${d.currentGap} งวด</td>
                <td class="td-highlight">${d.gapScore}</td>
                <td>
                  <span class="card-badge ${d.isOverdue ? 'badge-hot' : 'badge-gold'}">
                    ${d.isOverdue ? '⏰ Overdue' : '✅ Normal'}
                  </span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderTrendAnalysis() {
    setTimeout(() => {
      ChartRenderer.drawTrendChart('chart-trend', analysisData.trends);
    }, 100);

    const container = document.getElementById('trend-summary');
    if (!container) return;

    const trends = analysisData.trends;
    container.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 12px;">
        ${Object.entries(trends).map(([digit, data]) => `
          <div class="stat-mini" style="flex-direction: column; align-items: center; text-align: center;">
            <div style="font-size: 1.5rem; font-weight: 800; color: ${ChartRenderer.DIGIT_COLORS[digit]}">${digit}</div>
            <div style="font-size: 0.8rem; color: var(--text-muted);">
              ${data.trend === 'up' ? '📈 ขาขึ้น' : data.trend === 'down' ? '📉 ขาลง' : '➡️ คงที่'}
            </div>
            <div style="font-size: 0.72rem; color: var(--text-muted);">
              Score: ${data.trendScore}%
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderHeatmapAnalysis() {
    setTimeout(() => {
      ChartRenderer.drawHeatmap('heatmap-container', analysisData.digitFrequency);
    }, 100);
  }

  /**
   * ── Prediction Section ──
   */
  function renderPrediction() {
    if (!predictions) return;
    
    const nextDraw = predictions.nextDraw;
    setContent('pred-next-date', nextDraw.thaiStr);
    setContent('pred-next-day', `วัน${nextDraw.dayOfWeek}`);

    // 6-digit predictions
    renderPredictionList('pred-first-container', predictions.first, 6);
    
    // Last 2 predictions
    renderPredictionList('pred-last2-container', predictions.last2, 2);
    
    // Back 3 predictions
    renderPredictionList('pred-last3-container', predictions.last3, 3);
    
    // Front 3 predictions
    renderPredictionList('pred-front3-container', predictions.front3, 3);

    // 🔗 Combo 6 predictions
    renderCombo6();

    // Hot Picks Summary
    renderHotPicksSummary();

    // Confidence Ring
    renderConfidenceRing();
  }

  /**
   * 🔗 แสดง Combo 6 หลัก (หน้า 3 + ท้าย 3 + ท้าย 2)
   */
  function renderCombo6() {
    const container = document.getElementById('combo6-container');
    const tableContainer = document.getElementById('combo6-table-container');
    if (!container || !predictions || !predictions.combo6) return;

    const combos = predictions.combo6;

    // === Visual Combo Cards ===
    container.innerHTML = `<div class="combo-grid">${combos.map((combo, i) => {
      const matchClass = combo.matchLevel >= 3 ? 'triple-match' : combo.matchLevel >= 2 ? 'double-match' : '';
      const badgeClass = combo.matchLevel >= 3 ? 'triple' : combo.matchLevel >= 2 ? 'double' : combo.matchLevel >= 1 ? 'single' : 'none';
      const last2Class = combo.last2Matched ? 'matched' : 'unmatched';

      return `
        <div class="combo-card ${matchClass} animate-slide-up" style="animation-delay: ${i * 0.1}s">
          <div class="combo-rank">${i + 1}</div>
          
          <!-- เลข 6 หลัก -->
          <div class="combo-number-main">
            <div class="combo-number-digits">${combo.number}</div>
          </div>

          <!-- สูตร: หน้า3 + ท้าย3 = 6 หลัก -->
          <div class="combo-formula">
            <div class="combo-part">
              <span class="combo-part-label">หน้า 3 ตัว</span>
              <span class="combo-part-value front3">${combo.front3}</span>
            </div>
            <span class="combo-plus">+</span>
            <div class="combo-part">
              <span class="combo-part-label">ท้าย 3 ตัว</span>
              <span class="combo-part-value back3">${combo.back3}</span>
            </div>
            <span class="combo-equals">→</span>
            <div class="combo-part">
              <span class="combo-part-label">ท้าย 2 ตัว</span>
              <span class="combo-part-value last2 ${last2Class}">${combo.last2} ${combo.last2Matched ? '✓' : '✗'}</span>
            </div>
          </div>

          <!-- Match Badge -->
          <div style="text-align: center; margin: 12px 0;">
            <span class="combo-match-badge ${badgeClass}">
              ${combo.matchLabel}${combo.matchLevel > 0 ? ' Match' : ' Base Combo'}
            </span>
          </div>

          <!-- Match Reasons -->
          ${combo.matchReasons.length > 0 ? `
            <div class="combo-reasons">
              ${combo.matchReasons.map(r => `<span class="combo-reason-tag">✓ ${r}</span>`).join('')}
            </div>
          ` : ''}

          <!-- Meta -->
          <div class="combo-meta">
            <div class="combo-confidence">
              ความมั่นใจ <strong>${combo.confidence}%</strong>
            </div>
            <div style="font-size: 0.72rem; color: var(--text-muted);">
              🔥 Hot: ${combo.hotDigits}/6
            </div>
          </div>

          <!-- Confidence Bar -->
          <div class="prediction-confidence" style="margin-top: 8px;">
            <div class="prediction-confidence-bar" style="width: ${combo.confidence}%"></div>
          </div>
        </div>
      `;
    }).join('')}</div>`;

    // === Details Table ===
    if (tableContainer) {
      tableContainer.innerHTML = `
        <div class="data-table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>เลข 6 หลัก</th>
                <th>หน้า 3</th>
                <th>ท้าย 3</th>
                <th>ท้าย 2</th>
                <th>Match Level</th>
                <th>Score หน้า3</th>
                <th>Score ท้าย3</th>
                <th>Score ท้าย2</th>
                <th>ความมั่นใจ</th>
              </tr>
            </thead>
            <tbody>
              ${combos.map((combo, i) => {
                const badgeClass = combo.matchLevel >= 3 ? 'badge-hot' : combo.matchLevel >= 2 ? 'badge-cold' : combo.matchLevel >= 1 ? 'badge-success' : 'badge-gold';
                return `
                  <tr>
                    <td>${i + 1}</td>
                    <td class="td-highlight" style="font-size: 1.1rem; letter-spacing: 2px;">${combo.number}</td>
                    <td style="color: var(--blue-400); font-weight: 600;">${combo.front3}</td>
                    <td style="color: var(--success); font-weight: 600;">${combo.back3}</td>
                    <td style="color: ${combo.last2Matched ? 'var(--gold-400)' : 'var(--text-muted)'}; font-weight: 600;">
                      ${combo.last2} ${combo.last2Matched ? '✓' : '—'}
                    </td>
                    <td><span class="card-badge ${badgeClass}">${combo.matchLabel}</span></td>
                    <td>${combo.components.front3Score.toFixed(1)}%</td>
                    <td>${combo.components.back3Score.toFixed(1)}%</td>
                    <td>${combo.components.last2Score > 0 ? combo.components.last2Score.toFixed(1) + '%' : '—'}</td>
                    <td class="td-highlight">${combo.confidence}%</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;
    }
  }

  function renderPredictionList(containerId, items, digits) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = items.map((item, i) => `
      <div class="prediction-item animate-slide-up" style="animation-delay: ${i * 0.1}s">
        <div class="prediction-rank">${i + 1}</div>
        <div class="prediction-number" style="font-size: ${digits > 4 ? '1.5rem' : '2rem'}">${item.number}</div>
        <div class="prediction-score">ความมั่นใจ ${item.confidence}%</div>
        <div class="prediction-confidence">
          <div class="prediction-confidence-bar" style="width: ${item.confidence}%"></div>
        </div>
      </div>
    `).join('');
  }

  function renderHotPicksSummary() {
    const container = document.getElementById('hot-picks-summary');
    if (!container) return;

    const hotPicks = PredictionEngine.getHotPicks(analysisData);
    
    container.innerHTML = hotPicks.map(p => `
      <div style="display: flex; align-items: center; gap: 12px; padding: 10px; background: var(--bg-card); border-radius: 8px; border: 1px solid var(--border-color);">
        <div class="number-ball ${p.type === 'hot' ? 'hot' : 'neutral'}">${p.digit}</div>
        <div>
          <div style="font-weight: 600; font-size: 0.9rem;">${p.reason}</div>
          <div style="color: var(--text-muted); font-size: 0.78rem;">Score: ${p.score.toFixed(2)}</div>
        </div>
      </div>
    `).join('');
  }

  function renderConfidenceRing() {
    const ring = document.querySelector('.progress-ring');
    if (!ring || !predictions) return;

    // Average confidence from all predictions
    const allConfs = [
      ...predictions.first.map(p => parseFloat(p.confidence)),
      ...predictions.last2.map(p => parseFloat(p.confidence))
    ];
    const avgConf = allConfs.length > 0 
      ? allConfs.reduce((a, b) => a + b, 0) / allConfs.length 
      : 0;

    const dashOffset = 314 - (314 * avgConf / 100);
    ring.style.strokeDashoffset = dashOffset;

    const valueEl = document.querySelector('.confidence-value');
    if (valueEl) valueEl.textContent = avgConf.toFixed(0) + '%';
  }

  /**
   * ── History Section ──
   */
  function renderHistory() {
    const tbody = document.getElementById('history-tbody');
    if (!tbody) return;

    const recentResults = DataManager.getRecentResults(results, 30).reverse();
    
    tbody.innerHTML = recentResults.map(r => {
      const firstPrize = DataManager.getFirstPrize(r);
      const last2 = DataManager.getLast2(r);
      const front3 = DataManager.getLast3Front(r);
      const back3 = DataManager.getLast3Back(r);
      const dateStr = r.displayDate || DataManager.getThaiDateStr(r.drawDate);
      
      return `
        <tr>
          <td class="td-highlight">${dateStr}</td>
          <td class="td-highlight" style="font-size: 1.1rem; letter-spacing: 2px;">${firstPrize}</td>
          <td>${front3.join(', ')}</td>
          <td>${back3.join(', ')}</td>
          <td>${last2}</td>
        </tr>
      `;
    }).join('');
  }

  /**
   * ── Utility Functions ──
   */
  function setContent(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value || '-';
  }

  function showLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
      if (show) {
        overlay.classList.remove('hidden');
      } else {
        overlay.classList.add('hidden');
      }
    }
  }

  function updateLoadingProgress(pct, msg) {
    const bar = document.querySelector('.loading-progress-bar');
    const text = document.querySelector('.loading-text');
    if (bar) bar.style.width = pct + '%';
    if (text) text.textContent = msg;
  }

  // ═══════════════════════════════════════════
  // 🌙 Theme Toggle
  // ═══════════════════════════════════════════
  function setupThemeToggle() {
    const toggle = document.getElementById('theme-toggle');
    const icon = document.getElementById('theme-icon');
    if (!toggle) return;

    // โหลดจาก localStorage
    const saved = localStorage.getItem('lottery-theme');
    if (saved === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
      if (icon) icon.textContent = '☀️';
    }

    toggle.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      if (current === 'light') {
        document.documentElement.removeAttribute('data-theme');
        if (icon) icon.textContent = '🌙';
        localStorage.setItem('lottery-theme', 'dark');
      } else {
        document.documentElement.setAttribute('data-theme', 'light');
        if (icon) icon.textContent = '☀️';
        localStorage.setItem('lottery-theme', 'light');
      }
    });
  }

  // ═══════════════════════════════════════════
  // 🔍 Number Search
  // ═══════════════════════════════════════════
  function setupSearchHandler() {
    const btn = document.getElementById('search-number-btn');
    const input = document.getElementById('search-number-input');
    if (!btn || !input) return;

    const doSearch = () => {
      const val = input.value.replace(/\D/g, '');
      if (val.length < 2 || val.length === 4 || val.length === 5) {
        alert('กรุณาพิมพ์เลข 2, 3, หรือ 6 หลัก');
        return;
      }
      renderSearchResult(val);
    };

    btn.addEventListener('click', doSearch);
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') doSearch();
    });

    // กรองเฉพาะตัวเลข
    input.addEventListener('input', () => {
      input.value = input.value.replace(/\D/g, '');
    });
  }

  function renderSearchResult(number) {
    const container = document.getElementById('search-result-container');
    if (!container || !analysisData) return;

    const result = BacktestEngine.searchNumber(number, results, analysisData);

    container.innerHTML = `
      <div class="search-result-card">
        <div class="search-result-number">${result.number}</div>
        
        <div style="text-align: center; margin-bottom: 16px;">
          <span class="card-badge ${result.hotColdStatus.includes('Hot') ? 'badge-hot' : result.hotColdStatus.includes('Cold') ? 'badge-cold' : 'badge-gold'}">
            ${result.hotColdStatus}
          </span>
          <span class="card-badge badge-gold" style="margin-left: 8px;">${result.type}</span>
        </div>

        <div class="search-stats-grid">
          <div class="search-stat-item">
            <div class="value">${result.totalAppearances}</div>
            <div class="label">จำนวนครั้งที่ออก</div>
          </div>
          <div class="search-stat-item">
            <div class="value">${result.frequency || '—'}</div>
            <div class="label">อัตราความถี่</div>
          </div>
          <div class="search-stat-item">
            <div class="value">${result.rank || '—'}/${result.totalNumbers || '?'}</div>
            <div class="label">อันดับ</div>
          </div>
          <div class="search-stat-item">
            <div class="value">${result.lastSeenDate}</div>
            <div class="label">ออกครั้งล่าสุด</div>
          </div>
          <div class="search-stat-item">
            <div class="value">${result.lastSeenDrawsAgo != null ? result.lastSeenDrawsAgo + ' งวดก่อน' : '—'}</div>
            <div class="label">Gap ปัจจุบัน</div>
          </div>
          <div class="search-stat-item">
            <div class="value">${result.confidence || '—'}</div>
            <div class="label">Composite Score</div>
          </div>
        </div>

        <!-- Digit Analysis -->
        <div style="margin-top: 16px;">
          <div style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 8px;">วิเคราะห์แต่ละหลัก:</div>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            ${result.digitAnalysis.map(d => `
              <div class="number-ball ${d.classification}" title="Ratio: ${d.ratio}, Trend: ${d.trend}">
                ${d.digit}
              </div>
            `).join('')}
          </div>
        </div>

        ${result.appearances.length > 0 ? `
          <div style="margin-top: 20px;">
            <div style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 8px;">ประวัติการออก:</div>
            <div style="display: flex; flex-wrap: wrap; gap: 6px;">
              ${result.appearances.map(a => `
                <span class="combo-reason-tag">${a.date}${a.type ? ' (' + a.type + ')' : ''}</span>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  // ═══════════════════════════════════════════
  // 📈 Accuracy Section
  // ═══════════════════════════════════════════
  let backtestResults = null;

  function renderAccuracy() {
    // ตั้งค่า event handlers
    const btnBacktest = document.getElementById('btn-run-backtest');
    const btnAutoTune = document.getElementById('btn-auto-tune');

    if (btnBacktest) {
      btnBacktest.onclick = () => runBacktestUI();
    }
    if (btnAutoTune) {
      btnAutoTune.onclick = () => runAutoTune();
    }

    // แสดง weights ปัจจุบัน
    renderWeightsDisplay();

    // ถ้ามีผล backtest แล้ว
    if (backtestResults) {
      renderBacktestResults();
    }
  }

  function runBacktestUI() {
    const loadingEl = document.getElementById('accuracy-loading');
    const resultsEl = document.getElementById('accuracy-results');
    const emptyEl = document.getElementById('accuracy-empty');

    if (loadingEl) loadingEl.style.display = 'block';
    if (resultsEl) resultsEl.style.display = 'none';
    if (emptyEl) emptyEl.style.display = 'none';

    // ใช้ setTimeout เพื่อให้ UI อัพเดตก่อน
    setTimeout(() => {
      try {
        backtestResults = BacktestEngine.runBacktest(results, 20);
        if (loadingEl) loadingEl.style.display = 'none';
        renderBacktestResults();
      } catch (err) {
        console.error('Backtest error:', err);
        if (loadingEl) loadingEl.style.display = 'none';
        if (emptyEl) {
          emptyEl.style.display = 'block';
          emptyEl.innerHTML = `<div class="card" style="text-align:center; padding:40px; color: var(--hot);">Backtest Error: ${err.message}</div>`;
        }
      }
    }, 100);
  }

  function renderBacktestResults() {
    if (!backtestResults) return;
    const bt = backtestResults;
    const resultsEl = document.getElementById('accuracy-results');
    const emptyEl = document.getElementById('accuracy-empty');

    if (resultsEl) resultsEl.style.display = 'block';
    if (emptyEl) emptyEl.style.display = 'none';

    // อัพเดต stat cards
    setContent('acc-last2', bt.accuracy.last2 + '%');
    setContent('acc-last3', bt.accuracy.last3 + '%');
    setContent('acc-front3', bt.accuracy.front3 + '%');
    setContent('acc-overall', bt.accuracy.overall + '%');

    // Accuracy vs Baseline
    const compContainer = document.getElementById('accuracy-comparison');
    if (compContainer) {
      const categories = [
        { label: 'ท้าย 2 ตัว', system: parseFloat(bt.accuracy.last2), baseline: parseFloat(bt.baseline.last2) },
        { label: 'ท้าย 3 ตัว', system: parseFloat(bt.accuracy.last3), baseline: parseFloat(bt.baseline.last3) },
        { label: 'หน้า 3 ตัว', system: parseFloat(bt.accuracy.front3), baseline: parseFloat(bt.baseline.front3) },
      ];

      const maxVal = Math.max(...categories.map(c => Math.max(c.system, c.baseline)), 30);

      compContainer.innerHTML = categories.map(c => {
        const sysWidth = (c.system / maxVal * 100).toFixed(0);
        const baseWidth = (c.baseline / maxVal * 100).toFixed(0);
        const improvement = c.baseline > 0 ? ((c.system / c.baseline - 1) * 100).toFixed(0) : 'N/A';
        return `
          <div class="accuracy-bar-row">
            <div class="accuracy-bar-label">${c.label}</div>
            <div style="flex: 1;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                <div class="accuracy-bar-track">
                  <div class="accuracy-bar-fill system" style="width: ${sysWidth}%">
                    <span>ระบบ</span>
                  </div>
                </div>
                <span class="accuracy-bar-value">${c.system}%</span>
              </div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <div class="accuracy-bar-track">
                  <div class="accuracy-bar-fill baseline" style="width: ${baseWidth}%">
                    <span>สุ่ม</span>
                  </div>
                </div>
                <span class="accuracy-bar-value" style="color: var(--text-muted);">${c.baseline}%</span>
              </div>
              <div style="font-size: 0.7rem; color: ${parseInt(improvement) > 0 ? 'var(--success)' : 'var(--hot)'}; margin-top: 2px;">
                ${parseInt(improvement) > 0 ? '▲' : '▼'} ${improvement}% vs สุ่ม
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    // Backtest detail table
    const tbody = document.getElementById('backtest-detail-tbody');
    if (tbody) {
      tbody.innerHTML = bt.details.map(d => `
        <tr>
          <td class="td-highlight">${d.date}</td>
          <td style="letter-spacing: 2px; font-weight: 600;">${d.actualFirst}</td>
          <td class="td-highlight">${d.actualLast2}</td>
          <td>${d.last2Hit ? '<span class="card-badge badge-success">✓ Hit</span>' : '<span class="card-badge badge-gold">✗</span>'}</td>
          <td>${d.last3Hit ? '<span class="card-badge badge-success">✓ Hit</span>' : '<span class="card-badge badge-gold">✗</span>'}</td>
          <td>${d.front3Hit ? '<span class="card-badge badge-success">✓ Hit</span>' : '<span class="card-badge badge-gold">✗</span>'}</td>
          <td>${d.hotDigitsInFirst}/6 🔥</td>
        </tr>
      `).join('');
    }

    renderWeightsDisplay();
  }

  function renderWeightsDisplay() {
    const container = document.getElementById('weights-display');
    if (!container) return;

    const w = PredictionEngine.WEIGHTS;
    const names = {
      frequency: 'Frequency Analysis',
      hotCold: 'Hot/Cold System',
      gap: 'Gap Analysis',
      correlation: 'Pair Correlation',
      trend: 'Trend Analysis',
      dayOfWeek: 'Day-of-Week'
    };

    container.innerHTML = Object.entries(w).map(([key, val]) => `
      <div class="weight-row">
        <div class="weight-label">${names[key] || key}</div>
        <div class="weight-bar">
          <div class="weight-bar-fill" style="width: ${val * 100 * 2.5}%"></div>
        </div>
        <div class="weight-value">${(val * 100).toFixed(0)}%</div>
      </div>
    `).join('');
  }

  function runAutoTune() {
    const badge = document.getElementById('weights-badge');
    try {
      const newWeights = BacktestEngine.autoTuneWeights(results);
      PredictionEngine.setWeights(newWeights);

      // Re-run predictions with new weights
      analysisData = AnalysisEngine.runFullAnalysis(results);
      predictions = PredictionEngine.predict(analysisData);

      if (badge) {
        badge.textContent = 'Auto-Tuned ✓';
        badge.className = 'card-badge badge-success';
      }

      renderWeightsDisplay();
      alert('✅ Auto-Tune เสร็จ! Weights ถูกปรับแล้ว \nกด "ทำนาย" เพื่อดูผลทำนายใหม่');
    } catch (err) {
      console.error('Auto-tune error:', err);
      alert('เกิดข้อผิดพลาด: ' + err.message);
    }
  }

  // Expose public API
  return {
    init,
    switchSection,
    refreshData: async () => {
      DataManager.clearCache();
      results = [];
      analysisData = null;
      predictions = null;
      await init();
    }
  };
})();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', App.init);
