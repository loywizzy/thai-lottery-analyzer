/**
 * charts.js - Chart Rendering Utilities
 * วาดกราฟแบบ Custom บน Canvas API
 */

const ChartRenderer = (() => {

  const COLORS = {
    gold: '#fbbf24',
    goldDark: '#d97706',
    blue: '#3b82f6',
    red: '#ef4444',
    green: '#10b981',
    purple: '#8b5cf6',
    orange: '#f97316',
    cyan: '#06b6d4',
    pink: '#ec4899',
    teal: '#14b8a6',
    text: '#94a3b8',
    textMuted: '#64748b',
    gridLine: 'rgba(255, 255, 255, 0.05)',
    bg: '#1a1f35'
  };

  const DIGIT_COLORS = [
    '#ef4444', '#f97316', '#fbbf24', '#84cc16', '#10b981',
    '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e'
  ];

  /**
   * หาขนาด Canvas ที่เหมาะสม
   */
  function setupCanvas(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    return { ctx, width: rect.width, height: rect.height };
  }

  /**
   * วาด Bar Chart ความถี่ตัวเลข
   */
  function drawFrequencyBar(canvasId, data) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const { ctx, width, height } = setupCanvas(canvas);
    const padding = { top: 30, right: 20, bottom: 50, left: 50 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    // Clear
    ctx.clearRect(0, 0, width, height);

    if (!data || data.length === 0) return;

    const maxCount = Math.max(...data.map(d => d.count));
    const barWidth = chartW / data.length * 0.7;
    const barGap = chartW / data.length * 0.3;

    // Grid lines
    ctx.strokeStyle = COLORS.gridLine;
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (chartH / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      // Y-axis labels
      ctx.fillStyle = COLORS.textMuted;
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'right';
      const label = Math.round(maxCount - (maxCount / 5) * i);
      ctx.fillText(label, padding.left - 8, y + 4);
    }

    // Bars
    data.forEach((item, i) => {
      const x = padding.left + i * (barWidth + barGap) + barGap / 2;
      const barH = (item.count / (maxCount || 1)) * chartH;
      const y = padding.top + chartH - barH;

      // Gradient fill
      const gradient = ctx.createLinearGradient(x, y, x, padding.top + chartH);
      gradient.addColorStop(0, DIGIT_COLORS[item.digit] || COLORS.gold);
      gradient.addColorStop(1, 'rgba(251, 191, 36, 0.1)');

      ctx.fillStyle = gradient;
      
      // Rounded top bar
      const radius = 4;
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + barWidth - radius, y);
      ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + radius);
      ctx.lineTo(x + barWidth, padding.top + chartH);
      ctx.lineTo(x, padding.top + chartH);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.fill();

      // X-axis label
      ctx.fillStyle = COLORS.text;
      ctx.font = 'bold 13px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(item.digit), x + barWidth / 2, padding.top + chartH + 20);

      // Count on top
      ctx.fillStyle = COLORS.text;
      ctx.font = '10px Inter, sans-serif';
      ctx.fillText(item.count, x + barWidth / 2, y - 6);
    });

    // Title
    ctx.fillStyle = COLORS.text;
    ctx.font = '12px Kanit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('จำนวนครั้ง', padding.left, 16);
  }

  /**
   * วาด Heatmap ตัวเลข × ตำแหน่ง
   */
  function drawHeatmap(containerId, frequencyData) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';
    
    const posLabels = ['หลักแสน', 'หลักหมื่น', 'หลักพัน', 'หลักร้อย', 'หลักสิบ', 'หลักหน่วย'];
    
    // Header row
    const headerRow = document.createElement('div');
    headerRow.style.cssText = 'display: grid; grid-template-columns: 80px repeat(10, 1fr); gap: 3px; margin-bottom: 3px;';
    
    const emptyCell = document.createElement('div');
    headerRow.appendChild(emptyCell);
    
    for (let d = 0; d <= 9; d++) {
      const cell = document.createElement('div');
      cell.textContent = d;
      cell.style.cssText = 'text-align: center; font-weight: 700; font-size: 0.85rem; color: var(--text-secondary); padding: 6px;';
      headerRow.appendChild(cell);
    }
    container.appendChild(headerRow);

    // Data rows
    const { normalized } = frequencyData;
    
    // Find global max for color scaling
    const allFreqs = normalized.flat().map(d => d.frequency);
    const maxFreq = Math.max(...allFreqs);
    const minFreq = Math.min(...allFreqs);

    normalized.forEach((posData, pos) => {
      const row = document.createElement('div');
      row.style.cssText = 'display: grid; grid-template-columns: 80px repeat(10, 1fr); gap: 3px; margin-bottom: 3px;';
      
      const label = document.createElement('div');
      label.textContent = posLabels[pos];
      label.style.cssText = 'font-size: 0.72rem; color: var(--text-muted); display: flex; align-items: center; padding-right: 8px;';
      row.appendChild(label);

      posData.forEach((data, digit) => {
        const cell = document.createElement('div');
        const intensity = maxFreq > minFreq ? (data.frequency - minFreq) / (maxFreq - minFreq) : 0.5;
        
        // Gold to blue gradient based on intensity
        const r = Math.round(251 * intensity + 30 * (1 - intensity));
        const g = Math.round(191 * intensity + 31 * (1 - intensity));
        const b = Math.round(36 * intensity + 53 * (1 - intensity));
        const alpha = 0.2 + intensity * 0.6;

        cell.className = 'heatmap-cell tooltip';
        cell.setAttribute('data-tooltip', `${posLabels[pos]}: ตัวเลข ${digit} = ${data.count} ครั้ง (${(data.frequency * 100).toFixed(1)}%)`);
        cell.style.cssText = `
          background: rgba(${r}, ${g}, ${b}, ${alpha});
          aspect-ratio: 1;
          border-radius: 6px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        `;
        cell.innerHTML = `
          <span class="digit" style="color: rgba(255,255,255,${0.5 + intensity * 0.5})">${digit}</span>
          <span class="count" style="color: rgba(255,255,255,${0.3 + intensity * 0.3}); font-size: 0.6rem">${data.count}</span>
        `;
        row.appendChild(cell);
      });

      container.appendChild(row);
    });
  }

  /**
   * วาด Trend Line Chart
   */
  function drawTrendChart(canvasId, trends, recentN = 30) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const { ctx, width, height } = setupCanvas(canvas);
    const padding = { top: 30, right: 20, bottom: 40, left: 50 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    ctx.clearRect(0, 0, width, height);

    // Grid
    ctx.strokeStyle = COLORS.gridLine;
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }

    // Draw trend lines for each digit
    for (let digit = 0; digit <= 9; digit++) {
      const data = trends[digit];
      if (!data || !data.sma || data.sma.length < 2) continue;

      const points = data.sma.slice(-recentN);
      const maxVal = Math.max(...Object.values(trends).flatMap(t => t.sma.slice(-recentN)));
      const minVal = 0;

      ctx.strokeStyle = DIGIT_COLORS[digit];
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.7;
      ctx.beginPath();

      points.forEach((val, i) => {
        const x = padding.left + (i / (points.length - 1)) * chartW;
        const y = padding.top + chartH - ((val - minVal) / ((maxVal - minVal) || 1)) * chartH;
        
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });

      ctx.stroke();
      ctx.globalAlpha = 1;

      // Label at end
      const lastVal = points[points.length - 1];
      const lastX = padding.left + chartW;
      const lastY = padding.top + chartH - ((lastVal - minVal) / ((maxVal - minVal) || 1)) * chartH;
      
      ctx.fillStyle = DIGIT_COLORS[digit];
      ctx.font = 'bold 10px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(String(digit), lastX + 4, lastY + 3);
    }

    // Title
    ctx.fillStyle = COLORS.text;
    ctx.font = '12px Kanit, sans-serif';
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
    ctx.fillText('Moving Average Trend', padding.left, 16);
  }

  /**
   * วาด Pie Chart (คู่/คี่ หรือ สูง/ต่ำ)
   */
  function drawPieChart(canvasId, data, labels, colors) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const { ctx, width, height } = setupCanvas(canvas);
    ctx.clearRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2.8;
    
    const total = data.reduce((sum, val) => sum + val, 0);
    let startAngle = -Math.PI / 2;

    data.forEach((value, i) => {
      const sliceAngle = (value / (total || 1)) * 2 * Math.PI;
      
      // Slice
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
      ctx.closePath();
      ctx.fillStyle = colors[i];
      ctx.fill();

      // Label
      const midAngle = startAngle + sliceAngle / 2;
      const labelRadius = radius * 0.65;
      const lx = centerX + Math.cos(midAngle) * labelRadius;
      const ly = centerY + Math.sin(midAngle) * labelRadius;

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const pct = ((value / (total || 1)) * 100).toFixed(1) + '%';
      ctx.fillText(pct, lx, ly);

      startAngle += sliceAngle;
    });

    // Donut hole
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.45, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.bg;
    ctx.fill();

    // Center text
    ctx.fillStyle = COLORS.text;
    ctx.font = '11px Kanit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(labels.join(' / '), centerX, centerY);

    // Legend
    const legendY = height - 20;
    labels.forEach((label, i) => {
      const lx = centerX - 50 + i * 100;
      
      ctx.fillStyle = colors[i];
      ctx.beginPath();
      ctx.arc(lx - 8, legendY, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = COLORS.text;
      ctx.font = '11px Kanit, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(label, lx, legendY + 4);
    });
  }

  /**
   * วาด Sum Distribution Chart
   */
  function drawSumDistribution(canvasId, sumData) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const { ctx, width, height } = setupCanvas(canvas);
    const padding = { top: 30, right: 20, bottom: 50, left: 50 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    ctx.clearRect(0, 0, width, height);

    const distribution = sumData.distribution;
    const entries = Object.entries(distribution)
      .map(([sum, count]) => ({ sum: parseInt(sum), count }))
      .sort((a, b) => a.sum - b.sum);

    if (entries.length === 0) return;

    const maxCount = Math.max(...entries.map(e => e.count));
    const minSum = entries[0].sum;
    const maxSum = entries[entries.length - 1].sum;
    const sumRange = maxSum - minSum || 1;

    // Grid
    ctx.strokeStyle = COLORS.gridLine;
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }

    // Area fill
    ctx.beginPath();
    entries.forEach((entry, i) => {
      const x = padding.left + ((entry.sum - minSum) / sumRange) * chartW;
      const y = padding.top + chartH - (entry.count / (maxCount || 1)) * chartH;
      
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    
    // Close area
    ctx.lineTo(padding.left + chartW, padding.top + chartH);
    ctx.lineTo(padding.left, padding.top + chartH);
    ctx.closePath();
    
    const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
    gradient.addColorStop(0, 'rgba(251, 191, 36, 0.3)');
    gradient.addColorStop(1, 'rgba(251, 191, 36, 0.02)');
    ctx.fillStyle = gradient;
    ctx.fill();

    // Line
    ctx.beginPath();
    entries.forEach((entry, i) => {
      const x = padding.left + ((entry.sum - minSum) / sumRange) * chartW;
      const y = padding.top + chartH - (entry.count / (maxCount || 1)) * chartH;
      
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = COLORS.gold;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Average line
    const avgX = padding.left + ((parseFloat(sumData.average) - minSum) / sumRange) * chartW;
    ctx.beginPath();
    ctx.moveTo(avgX, padding.top);
    ctx.lineTo(avgX, padding.top + chartH);
    ctx.strokeStyle = COLORS.red;
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = COLORS.red;
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`เฉลี่ย: ${sumData.average}`, avgX, padding.top - 6);

    // X labels
    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'center';
    for (let s = minSum; s <= maxSum; s += 5) {
      const x = padding.left + ((s - minSum) / sumRange) * chartW;
      ctx.fillText(String(s), x, padding.top + chartH + 18);
    }

    // Title
    ctx.fillStyle = COLORS.text;
    ctx.font = '12px Kanit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('การกระจายผลรวม 6 หลัก', padding.left, 16);
  }

  return {
    drawFrequencyBar,
    drawHeatmap,
    drawTrendChart,
    drawPieChart,
    drawSumDistribution,
    COLORS,
    DIGIT_COLORS
  };
})();
