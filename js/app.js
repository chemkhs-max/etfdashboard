/**
 * KRX ETF EDA Dashboard - Main Application Controller
 * Handles data fetching, live sync, tab routing, KPI rendering, and event binding.
 */

const ETF_APP = (() => {
  let rawData = null;
  let analysis = null;

  /**
   * Show floating toast notification
   */
  function showToast(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconName = 'info';
    if (type === 'success') iconName = 'check-circle';
    if (type === 'error') iconName = 'alert-triangle';

    toast.innerHTML = `
      <i data-lucide="${iconName}" style="width: 18px; height: 18px;"></i>
      <span>${message}</span>
    `;

    container.appendChild(toast);
    if (window.lucide) lucide.createIcons();

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 250);
    }, duration);
  }

  /**
   * Load Data on App Launch:
   * 1. Check window.INITIAL_ETF_DATA (loaded via data/etfs_data.js)
   * 2. If not found, fetch data/etfs.json
   */
  async function loadInitialData() {
    try {
      if (window.INITIAL_ETF_DATA && window.INITIAL_ETF_DATA.items && window.INITIAL_ETF_DATA.items.length > 0) {
        console.log('Loaded from window.INITIAL_ETF_DATA');
        applyData(window.INITIAL_ETF_DATA, '내장 스냅샷 데이터');
        return;
      }

      // Fallback to fetch data/etfs.json
      const res = await fetch('data/etfs.json');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      applyData(data, '로컬 JSON 스냅샷');
    } catch (err) {
      console.warn('Initial data load warning:', err);
      showToast('초기 데이터를 불러오지 못했습니다. 상단 "새로고침" 또는 "데이터 업로드"를 이용해 주세요.', 'error', 5000);
      document.getElementById('screener-table-body').innerHTML = `
        <tr>
          <td colspan="10" style="text-align: center; padding: 3rem 1rem;">
            데이터를 불러올 수 없습니다. 터미널에서 <code class="mono" style="color:var(--accent-cyan);">uv run python fetch_data.py</code> 를 실행하거나 상단 <strong>실시간 새로고침</strong>을 클릭해주세요.
          </td>
        </tr>
      `;
    }
  }

  /**
   * Process and apply dataset to all UI modules
   */
  function applyData(data, sourceLabel = '실시간 API') {
    rawData = data;
    analysis = ETF_EDA.analyze(data.items);

    // Update Header Metadata
    const updateElem = document.getElementById('last-update-time');
    if (updateElem) {
      updateElem.textContent = data.updatedAt || new Date().toLocaleString();
    }
    const sourceElem = document.getElementById('data-source-badge');
    if (sourceElem) {
      sourceElem.textContent = sourceLabel;
    }

    // Render KPI Overview Cards
    renderKPIs(analysis);

    // Render Tab Views
    renderMarketOverviewTab(analysis);
    renderIssuerTab(analysis);
    renderReturnsTab(analysis);
    renderLiquidityDisparityTab(analysis);

    // Initialize Screener
    ETF_SCREENER.init(analysis.items);

    // Populate filter dropdowns
    populateBrandAndCategoryFilters(analysis);

    if (window.lucide) lucide.createIcons();
    showToast(`${analysis.totalCount.toLocaleString()}개 ETF 분석 완료 (${sourceLabel})`, 'success');
  }

  /**
   * 1. Render Top KPI Metrics Cards
   */
  function renderKPIs(a) {
    document.getElementById('kpi-total-count').textContent = `${a.totalCount.toLocaleString()} 종목`;
    document.getElementById('kpi-total-aum').textContent = `${(a.totalAUM / 1e12).toFixed(1)}조 원`;
    document.getElementById('kpi-total-trading').textContent = `${(a.totalTradingValue / 1e12).toFixed(2)}조 원`;
    
    // Breadth
    document.getElementById('kpi-breadth-up').textContent = `${a.risingCount}`;
    document.getElementById('kpi-breadth-down').textContent = `${a.fallingCount}`;
    document.getElementById('kpi-breadth-flat').textContent = `${a.unchangedCount}`;

    const segUp = document.getElementById('breadth-seg-up');
    const segDown = document.getElementById('breadth-seg-down');
    const segFlat = document.getElementById('breadth-seg-flat');

    if (segUp) segUp.style.width = `${a.breadthRate.up}%`;
    if (segDown) segDown.style.width = `${a.breadthRate.down}%`;
    if (segFlat) segFlat.style.width = `${a.breadthRate.flat}%`;

    // Disparity alert count
    const dispAlertElem = document.getElementById('kpi-disparity-alert');
    if (dispAlertElem) {
      dispAlertElem.textContent = `${a.warningDisparitiesCount} 종목`;
    }
  }

  /**
   * 2. Render Tab 1: Market Overview
   */
  function renderMarketOverviewTab(a) {
    // Charts
    ETF_CHARTS.renderCategoryAUMChart('chart-cat-aum', a.categoryStats);
    ETF_CHARTS.renderBrandShareChart('chart-brand-share', a.brandStats);
    ETF_CHARTS.renderReturnHistChart('chart-return-hist', a.hist1m);

    // Top AUM and Trading Value lists
    renderMiniRankingList('rank-top-aum', a.top10AUM.slice(0, 5), item => `${(item.totalNetAssets / 1e12).toFixed(2)}조 원`, '순자산');
    renderMiniRankingList('rank-top-trading', a.top10Trading.slice(0, 5), item => `${(item.tradingValue / 1e8).toFixed(0)}억 원`, '거래대금');
  }

  /**
   * 3. Render Tab 2: Issuer Analysis
   */
  function renderIssuerTab(a) {
    const tableBody = document.getElementById('issuer-table-body');
    if (!tableBody) return;

    tableBody.innerHTML = a.brandStats.map((b, idx) => {
      const avgReturnClass = b.avgReturn1m > 0 ? 'val-up' : b.avgReturn1m < 0 ? 'val-down' : 'val-flat';
      const sign = b.avgReturn1m > 0 ? '+' : '';

      return `
        <tr>
          <td><span class="ranking-badge-idx ${idx < 3 ? 'top-' + (idx + 1) : ''}">${idx + 1}</span></td>
          <td>
            <div style="display:flex; align-items:center; gap:0.5rem;">
              <span class="badge-brand ${b.badgeClass}">${b.name}</span>
              <strong style="color:#fff;">${b.company}</strong>
            </div>
          </td>
          <td class="text-right num">${b.count}개</td>
          <td class="text-right num font-semibold">${ETF_CHARTS.formatKoreanMoney(b.totalAUM)}</td>
          <td class="text-right num">${b.marketShare.toFixed(2)}%</td>
          <td class="text-right num">${ETF_CHARTS.formatKoreanMoney(b.totalTradingValue)}</td>
          <td class="text-right num ${avgReturnClass}">${sign}${b.avgReturn1m.toFixed(2)}%</td>
          <td class="text-center">
            <button class="btn btn-icon-only filter-by-brand-btn" data-brand="${b.name}" title="${b.name} 종목만 보기">
              <i data-lucide="filter" style="width: 14px; height: 14px;"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');

    tableBody.querySelectorAll('.filter-by-brand-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const brand = btn.getAttribute('data-brand');
        switchToTab('tab-screener');
        document.getElementById('filter-brand').value = brand;
        ETF_SCREENER.setBrand(brand);
        showToast(`"${brand}" 브랜드 필터가 적용되었습니다.`, 'info');
      });
    });
  }

  /**
   * 4. Render Tab 3: Returns & Performance EDA
   */
  function renderReturnsTab(a) {
    // Stats KPI cards for 1M, 3M, 6M
    document.getElementById('stat-1m-mean').textContent = `${a.stats1m.mean > 0 ? '+' : ''}${a.stats1m.mean}%`;
    document.getElementById('stat-1m-median').textContent = `${a.stats1m.median > 0 ? '+' : ''}${a.stats1m.median}%`;
    document.getElementById('stat-1m-range').textContent = `${a.stats1m.min}% ~ +${a.stats1m.max}%`;
    document.getElementById('stat-1m-std').textContent = `±${a.stats1m.std}%`;

    // Top Gainers / Losers
    renderMiniRankingList('rank-top-gainers-1m', a.topGainers1m.slice(0, 5), item => `+${item.return1m.toFixed(2)}%`, '1M 수익률', true);
    renderMiniRankingList('rank-top-losers-1m', a.topLosers1m.slice(0, 5), item => `${item.return1m.toFixed(2)}%`, '1M 수익률', false);

    renderMiniRankingList('rank-top-gainers-1d', a.topGainers1d.slice(0, 5), item => `+${item.changeRate.toFixed(2)}%`, '당일 등락률', true);
    renderMiniRankingList('rank-top-losers-1d', a.topLosers1d.slice(0, 5), item => `${item.changeRate.toFixed(2)}%`, '당일 등락률', false);
  }

  /**
   * 5. Render Tab 4: Liquidity & Disparity Diagnosis
   */
  function renderLiquidityDisparityTab(a) {
    // Scatter chart: AUM vs Trading
    ETF_CHARTS.renderAumVolumeScatter('chart-aum-volume-scatter', a.items);
    // Disparity distribution chart
    ETF_CHARTS.renderDisparityChart('chart-disparity-dist', a.items);

    // Concentration Metrics
    document.getElementById('metric-top10-aum-share').textContent = `${a.top10AUMShare.toFixed(1)}%`;
    document.getElementById('metric-top10-trade-share').textContent = `${a.top10TradeShare.toFixed(1)}%`;

    // Disparity Outlier lists
    renderMiniRankingList('rank-premium-outliers', a.premiumOutliers.slice(0, 5), item => `+${item.disparityRate.toFixed(2)}%`, '괴리율', true);
    renderMiniRankingList('rank-discount-outliers', a.discountOutliers.slice(0, 5), item => `${item.disparityRate.toFixed(2)}%`, '괴리율', false);

    // Low liquidity caution table
    const cautionBody = document.getElementById('low-liquidity-table-body');
    if (cautionBody) {
      cautionBody.innerHTML = a.lowLiquidity.slice(0, 10).map(item => `
        <tr data-code="${item.itemCode}">
          <td>
            <strong>${item.itemName}</strong>
            <span class="etf-code" style="margin-left:0.4rem;">${item.itemCode}</span>
          </td>
          <td class="text-right num">${ETF_CHARTS.formatKoreanMoney(item.totalNetAssets)}</td>
          <td class="text-right num">${ETF_CHARTS.formatKoreanMoney(item.tradingValue)}</td>
          <td class="text-right num">${item.tradingVolume.toLocaleString()}주</td>
          <td class="text-center">
            <span class="badge-disp badge-disp-alert">유동성 유의</span>
          </td>
        </tr>
      `).join('');

      cautionBody.querySelectorAll('tr[data-code]').forEach(tr => {
        tr.addEventListener('click', () => ETF_SCREENER.openDetailModal(tr.getAttribute('data-code')));
      });
    }
  }

  /**
   * Helper to render mini ranking cards
   */
  function renderMiniRankingList(containerId, items, valFormatter, subLabel, isPositive = null) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = items.map((item, idx) => {
      let valClass = '';
      if (isPositive === true) valClass = 'val-up';
      else if (isPositive === false) valClass = 'val-down';

      return `
        <div class="ranking-item" data-code="${item.itemCode}">
          <div class="ranking-left">
            <span class="ranking-badge-idx ${idx < 3 ? 'top-' + (idx + 1) : ''}">${idx + 1}</span>
            <div class="ranking-title-group">
              <span class="ranking-name">${item.itemName}</span>
              <span class="ranking-sub">${item.itemCode} · ${item.brand.name}</span>
            </div>
          </div>
          <div class="ranking-right">
            <div class="ranking-val-primary ${valClass}">${valFormatter(item)}</div>
            <div class="ranking-val-secondary">${subLabel}</div>
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.ranking-item[data-code]').forEach(el => {
      el.addEventListener('click', () => ETF_SCREENER.openDetailModal(el.getAttribute('data-code')));
    });
  }

  /**
   * Populate filter dropdowns dynamically
   */
  function populateBrandAndCategoryFilters(a) {
    const brandSelect = document.getElementById('filter-brand');
    if (brandSelect) {
      const cur = brandSelect.value;
      let html = '<option value="ALL">전체 운용사</option>';
      a.brandStats.forEach(b => {
        html += `<option value="${b.name}">${b.name} (${b.count}개 / ${b.company})</option>`;
      });
      brandSelect.innerHTML = html;
      brandSelect.value = cur || 'ALL';
    }

    const catSelect = document.getElementById('filter-category');
    if (catSelect) {
      const cur = catSelect.value;
      let html = '<option value="ALL">전체 자산군</option>';
      a.categoryStats.forEach(c => {
        html += `<option value="${c.category}">${c.category} (${c.count}개)</option>`;
      });
      catSelect.innerHTML = html;
      catSelect.value = cur || 'ALL';
    }
  }

  /**
   * Tab Switching Navigation
   */
  function switchToTab(tabId) {
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
    });
    document.querySelectorAll('.tab-content-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === tabId);
    });

    // Resize active charts if switching tabs
    window.dispatchEvent(new Event('resize'));
  }

  /**
   * Live Fetch from Naver API (Browser Client-Side)
   */
  async function performLiveRefresh() {
    const refreshBtn = document.getElementById('btn-refresh');
    const refreshIcon = refreshBtn?.querySelector('i');
    if (refreshBtn) refreshBtn.disabled = true;
    if (refreshIcon) refreshIcon.classList.add('spinner');

    showToast('네이버 증권 실시간 ETF 데이터 수집을 시작합니다...', 'info');

    try {
      // Direct fetch test on first page
      const testUrl = 'https://stock.naver.com/api/stockSecurity/etfs/v2/domestic?listingType=aumDesc&size=100&index=0';
      let canDirectFetch = false;

      try {
        const testRes = await fetch(testUrl, { method: 'GET', mode: 'cors' });
        if (testRes.ok) canDirectFetch = true;
      } catch (corsErr) {
        console.warn('Direct CORS fetch blocked as expected by browser policy');
      }

      if (canDirectFetch) {
        // Direct fetch available!
        showToast('실시간 API 직접 연결 성공! 전체 12페이지를 병렬 수집합니다...', 'info');
        const pages = await Promise.all(
          Array.from({ length: 12 }, (_, i) =>
            fetch(`https://stock.naver.com/api/stockSecurity/etfs/v2/domestic?listingType=aumDesc&size=100&index=${i}`)
              .then(r => r.json())
          )
        );
        const allFetched = [];
        pages.forEach(p => {
          if (p.items) allFetched.push(...p.items);
        });

        applyData({
          updatedAt: new Date().toLocaleString(),
          totalCount: allFetched.length,
          items: allFetched
        }, '실시간 API 수집');
      } else {
        // Try relative data/etfs.json first
        const localRes = await fetch('data/etfs.json?t=' + Date.now());
        if (localRes.ok) {
          const freshData = await localRes.json();
          applyData(freshData, '최신 스냅샷 동기화');
          showToast('최신 ETF 로컬 스냅샷 데이터로 갱신되었습니다.', 'success');
        } else {
          // Open Sync Helper Modal
          document.getElementById('sync-helper-modal')?.classList.add('open');
        }
      }
    } catch (e) {
      console.error(e);
      document.getElementById('sync-helper-modal')?.classList.add('open');
      showToast('브라우저 CORS 정책으로 인해 스크립트 실행 또는 업로드가 권장됩니다.', 'info', 4000);
    } finally {
      if (refreshBtn) refreshBtn.disabled = false;
      if (refreshIcon) refreshIcon.classList.remove('spinner');
    }
  }

  /**
   * Bind all DOM Event Listeners
   */
  function bindEvents() {
    // 1. Tab buttons
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => switchToTab(btn.getAttribute('data-tab')));
    });

    // 2. Refresh Button
    document.getElementById('btn-refresh')?.addEventListener('click', performLiveRefresh);

    // 3. Sync Helper Modal close
    document.querySelectorAll('.modal-close-btn, .modal-backdrop').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target === el || el.classList.contains('modal-close-btn') || el.closest('.modal-close-btn')) {
          document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.remove('open'));
        }
      });
    });

    // 4. File Upload (JSON)
    const fileInput = document.getElementById('json-file-input');
    document.getElementById('btn-upload-json')?.addEventListener('click', () => fileInput?.click());
    fileInput?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          if (parsed && Array.isArray(parsed.items)) {
            applyData(parsed, '사용자 JSON 업로드');
            showToast(`${parsed.items.length.toLocaleString()}개 종목 업로드 완료!`, 'success');
          } else {
            showToast('올바른 ETF JSON 형식이 아닙니다.', 'error');
          }
        } catch (err) {
          showToast('JSON 파일 파싱 실패: ' + err.message, 'error');
        }
      };
      reader.readAsText(file);
    });

    // 5. CSV Export Button
    document.getElementById('btn-export-csv')?.addEventListener('click', () => {
      ETF_SCREENER.exportCSV();
      showToast('CSV 파일 다운로드가 시작되었습니다.', 'success');
    });

    // 6. Color Mode Toggle (KRX vs Global)
    document.getElementById('btn-toggle-color-mode')?.addEventListener('click', () => {
      const isGlobal = document.body.classList.toggle('color-mode-global');
      const label = isGlobal ? '글로벌 스타일 (녹색 상승/적색 하락)' : '국내 기준 (빨강 상승/파랑 하락)';
      showToast(`차트/등락 색상이 ${label}로 변경되었습니다.`, 'info');
      // Re-render charts
      if (analysis) {
        ETF_CHARTS.renderReturnHistChart('chart-return-hist', analysis.hist1m);
      }
    });

    // 7. Screener Search & Filters
    const searchInput = document.getElementById('screener-search');
    searchInput?.addEventListener('input', (e) => ETF_SCREENER.setSearch(e.target.value));

    document.getElementById('filter-brand')?.addEventListener('change', (e) => ETF_SCREENER.setBrand(e.target.value));
    document.getElementById('filter-category')?.addEventListener('change', (e) => ETF_SCREENER.setCategory(e.target.value));
    document.getElementById('filter-movement')?.addEventListener('change', (e) => ETF_SCREENER.setMovement(e.target.value));
    document.getElementById('filter-page-size')?.addEventListener('change', (e) => ETF_SCREENER.setPageSize(e.target.value));

    // Tag chips
    document.querySelectorAll('.tag-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const tag = chip.getAttribute('data-tag');
        const active = ETF_SCREENER.toggleTag(tag);
        document.querySelectorAll('.tag-chip').forEach(c => c.classList.remove('active'));
        if (active) chip.classList.add('active');
      });
    });

    // Disparity alert filter button
    document.getElementById('btn-filter-disp-alert')?.addEventListener('click', function() {
      const active = ETF_SCREENER.toggleDisparityAlert();
      this.classList.toggle('active', active);
    });

    // Table Header Sorting
    document.querySelectorAll('.etf-table th[data-sort]').forEach(th => {
      th.addEventListener('click', () => {
        ETF_SCREENER.setSort(th.getAttribute('data-sort'));
      });
    });

    // 8. Global Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === '/' && document.activeElement !== searchInput) {
        e.preventDefault();
        switchToTab('tab-screener');
        searchInput?.focus();
        searchInput?.select();
      }
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.remove('open'));
      }
    });
  }

  /**
   * App Initializer
   */
  function init() {
    bindEvents();
    loadInitialData();
  }

  return {
    init,
    showToast,
    switchToTab,
    applyData
  };
})();

// Launch application on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  ETF_APP.init();
});
