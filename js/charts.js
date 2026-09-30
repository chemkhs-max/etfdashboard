/**
 * KRX ETF Dashboard Chart.js Visualizations
 * High-performance, responsive charts with custom financial tooltips and dark theme.
 */

const ETF_CHARTS = (() => {
  const chartInstances = {};

  // Color tokens
  const THEME = {
    textColor: '#94a3b8',
    textHighlight: '#f8fafc',
    gridColor: 'rgba(255, 255, 255, 0.05)',
    tooltipBg: 'rgba(15, 23, 42, 0.95)',
    tooltipBorder: 'rgba(255, 255, 255, 0.12)',
    fontFamily: "'Pretendard', sans-serif",
    palette: [
      '#38bdf8', '#6366f1', '#f59e0b', '#10b981', '#ec4899', 
      '#8b5cf6', '#14b8a6', '#f97316', '#3b82f6', '#84cc16'
    ]
  };

  /**
   * Helper to format Korean currency (조 / 억 원)
   */
  function formatKoreanMoney(val) {
    if (val >= 1e12) return (val / 1e12).toFixed(2) + '조 원';
    if (val >= 1e8) return (val / 1e8).toFixed(1) + '억 원';
    if (val >= 1e4) return (val / 1e4).toFixed(0) + '만 원';
    return val.toLocaleString() + '원';
  }

  /**
   * Safe destroy previous chart instance before re-creating
   */
  function destroyChart(id) {
    if (chartInstances[id]) {
      chartInstances[id].destroy();
      delete chartInstances[id];
    }
  }

  /**
   * 1. Asset Class Category AUM Donut Chart
   */
  function renderCategoryAUMChart(canvasId, categoryStats) {
    destroyChart(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const labels = categoryStats.map(c => c.category);
    const data = categoryStats.map(c => c.totalAUM);
    const colors = THEME.palette.slice(0, labels.length);

    chartInstances[canvasId] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors,
          borderColor: '#0f172a',
          borderWidth: 2,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: THEME.textColor,
              font: { family: THEME.fontFamily, size: 12 },
              padding: 14,
              boxWidth: 12
            }
          },
          tooltip: {
            backgroundColor: THEME.tooltipBg,
            borderColor: THEME.tooltipBorder,
            borderWidth: 1,
            titleColor: THEME.textHighlight,
            bodyColor: THEME.textColor,
            padding: 10,
            callbacks: {
              label: (context) => {
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const val = context.raw;
                const pct = ((val / total) * 100).toFixed(1);
                return ` ${context.label}: ${formatKoreanMoney(val)} (${pct}%)`;
              }
            }
          }
        },
        cutout: '68%'
      }
    });
  }

  /**
   * 2. Brand / Issuer AUM Market Share (Horizontal Bar Chart)
   */
  function renderBrandShareChart(canvasId, brandStats) {
    destroyChart(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    // Top 8 brands + others
    const topBrands = brandStats.slice(0, 8);
    const otherBrands = brandStats.slice(8);
    const otherAUM = otherBrands.reduce((s, b) => s + b.totalAUM, 0);
    const otherCount = otherBrands.reduce((s, b) => s + b.count, 0);

    const labels = topBrands.map(b => `${b.name} (${b.company.replace('자산운용', '')})`);
    const data = topBrands.map(b => b.totalAUM / 1e12); // in 조원
    const counts = topBrands.map(b => b.count);
    const colors = topBrands.map(b => b.color || '#64748b');

    if (otherAUM > 0) {
      labels.push(`기타 (${otherBrands.length}개 운용사)`);
      data.push(otherAUM / 1e12);
      counts.push(otherCount);
      colors.push('#475569');
    }

    chartInstances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: '순자산총액 (조 원)',
          data,
          backgroundColor: colors,
          borderRadius: 6,
          borderSkipped: false
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: THEME.tooltipBg,
            borderColor: THEME.tooltipBorder,
            borderWidth: 1,
            titleColor: THEME.textHighlight,
            bodyColor: THEME.textColor,
            padding: 10,
            callbacks: {
              afterLabel: (ctx) => `상장 종목수: ${counts[ctx.dataIndex]}개`
            }
          }
        },
        scales: {
          x: {
            grid: { color: THEME.gridColor },
            ticks: {
              color: THEME.textColor,
              font: { family: THEME.fontFamily },
              callback: (val) => val + '조'
            }
          },
          y: {
            grid: { display: false },
            ticks: {
              color: THEME.textHighlight,
              font: { family: THEME.fontFamily, weight: '500' }
            }
          }
        }
      }
    });
  }

  /**
   * 3. 1-Month Return Distribution Histogram (Bar Chart)
   */
  function renderReturnHistChart(canvasId, histData) {
    destroyChart(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const labels = [];
    const data = [];
    const bgColors = [];

    // Under min bin
    if (histData.underMin > 0) {
      labels.push('<-20%');
      data.push(histData.underMin);
      bgColors.push('rgba(59, 130, 246, 0.85)'); // Down
    }

    histData.bins.forEach(b => {
      labels.push(b.label);
      data.push(b.count);
      const isPositive = b.min >= 0;
      bgColors.push(isPositive ? 'rgba(239, 68, 68, 0.8)' : 'rgba(59, 130, 246, 0.8)');
    });

    // Over max bin
    if (histData.overMax > 0) {
      labels.push('>+20%');
      data.push(histData.overMax);
      bgColors.push('rgba(239, 68, 68, 0.85)'); // Up
    }

    chartInstances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: '종목 수',
          data,
          backgroundColor: bgColors,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: THEME.tooltipBg,
            borderColor: THEME.tooltipBorder,
            borderWidth: 1,
            padding: 10,
            callbacks: {
              label: (ctx) => `종목 수: ${ctx.raw}개`
            }
          }
        },
        scales: {
          x: {
            grid: { color: THEME.gridColor },
            ticks: {
              color: THEME.textColor,
              font: { size: 10, family: THEME.fontFamily },
              maxRotation: 45
            }
          },
          y: {
            grid: { color: THEME.gridColor },
            ticks: {
              color: THEME.textColor,
              font: { family: THEME.fontFamily }
            }
          }
        }
      }
    });
  }

  /**
   * 4. AUM vs Trading Value Liquidity Scatter Plot
   */
  function renderAumVolumeScatter(canvasId, items) {
    destroyChart(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    // Filter items with valid data and take top 200 items for smooth performance
    const points = items.slice(0, 250).map(item => ({
      x: item.totalNetAssets / 1e8, // 억원
      y: item.tradingValue / 1e8,    // 억원
      name: item.itemName,
      code: item.itemCode,
      rate: item.changeRate,
      brand: item.brand.name
    }));

    chartInstances[canvasId] = new Chart(ctx, {
      type: 'scatter',
      data: {
        datasets: [{
          label: 'ETF 종목',
          data: points,
          backgroundColor: 'rgba(56, 189, 248, 0.65)',
          borderColor: 'rgba(56, 189, 248, 0.9)',
          pointHoverRadius: 8,
          pointRadius: 4.5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: THEME.tooltipBg,
            borderColor: THEME.tooltipBorder,
            borderWidth: 1,
            padding: 12,
            callbacks: {
              title: (ctx) => ctx[0].raw.name,
              label: (ctx) => {
                const p = ctx.raw;
                return [
                  `종목코드: ${p.code}`,
                  `순자산: ${formatKoreanMoney(p.x * 1e8)}`,
                  `거래대금: ${formatKoreanMoney(p.y * 1e8)}`,
                  `당일등락: ${p.rate > 0 ? '+' : ''}${p.rate}%`
                ];
              }
            }
          }
        },
        scales: {
          x: {
            type: 'logarithmic',
            title: {
              display: true,
              text: '순자산총액 (억 원, 로그 스케일)',
              color: THEME.textColor,
              font: { family: THEME.fontFamily, size: 12 }
            },
            grid: { color: THEME.gridColor },
            ticks: {
              color: THEME.textColor,
              callback: (val) => val.toLocaleString() + '억'
            }
          },
          y: {
            type: 'logarithmic',
            title: {
              display: true,
              text: '일일 거래대금 (억 원, 로그 스케일)',
              color: THEME.textColor,
              font: { family: THEME.fontFamily, size: 12 }
            },
            grid: { color: THEME.gridColor },
            ticks: {
              color: THEME.textColor,
              callback: (val) => val.toLocaleString() + '억'
            }
          }
        }
      }
    });
  }

  /**
   * 5. Disparity Rate Distribution & Outlier Strip Chart
   */
  function renderDisparityChart(canvasId, items) {
    destroyChart(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    // Filter reasonable disparity range [-3% to +3%] for visual histogram
    const filtered = items.filter(x => x.disparityRate >= -3 && x.disparityRate <= 3);
    const step = 0.5;
    const bins = [];
    for (let c = -3; c < 3; c += step) {
      bins.push({
        label: `${c > 0 ? '+' : ''}${c.toFixed(1)}% ~ ${c + step > 0 ? '+' : ''}${(c + step).toFixed(1)}%`,
        min: c,
        max: c + step,
        count: 0
      });
    }

    filtered.forEach(item => {
      const idx = Math.min(Math.floor((item.disparityRate - (-3)) / step), bins.length - 1);
      if (idx >= 0 && idx < bins.length) bins[idx].count++;
    });

    chartInstances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: bins.map(b => b.label),
        datasets: [{
          label: '종목 수',
          data: bins.map(b => b.count),
          backgroundColor: bins.map(b => Math.abs(b.min) >= 1.0 ? 'rgba(245, 158, 11, 0.75)' : 'rgba(16, 185, 129, 0.65)'),
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: THEME.tooltipBg,
            borderColor: THEME.tooltipBorder,
            borderWidth: 1,
            callbacks: {
              label: (ctx) => `종목 수: ${ctx.raw}개`
            }
          }
        },
        scales: {
          x: {
            grid: { color: THEME.gridColor },
            ticks: {
              color: THEME.textColor,
              font: { size: 10, family: THEME.fontFamily },
              maxRotation: 45
            }
          },
          y: {
            grid: { color: THEME.gridColor },
            ticks: { color: THEME.textColor }
          }
        }
      }
    });
  }

  return {
    renderCategoryAUMChart,
    renderBrandShareChart,
    renderReturnHistChart,
    renderAumVolumeScatter,
    renderDisparityChart,
    formatKoreanMoney,
    destroyChart
  };
})();
