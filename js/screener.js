/**
 * KRX ETF Interactive Screener & Table Engine
 * Handles multi-column sorting, multi-criteria filtering, pagination, and CSV export.
 */

const ETF_SCREENER = (() => {
  let allItems = [];
  let filteredItems = [];
  
  // State
  let currentPage = 1;
  let pageSize = 25;
  let sortField = 'totalNetAssets';
  let sortOrder = 'desc'; // 'asc' or 'desc'
  
  // Filters
  let activeSearch = '';
  let activeBrand = 'ALL';
  let activeCategory = 'ALL';
  let activeMovement = 'ALL';
  let activeTag = null;
  let activeDisparityAlertOnly = false;

  /**
   * Initialize screener with enriched items
   */
  function init(items) {
    allItems = items;
    applyFilters();
  }

  /**
   * Apply all active filter criteria
   */
  function applyFilters() {
    const q = activeSearch.trim().toLowerCase();

    filteredItems = allItems.filter(item => {
      // 1. Text search (Name or 6-digit Code)
      if (q) {
        const matchesName = item.itemName.toLowerCase().includes(q);
        const matchesCode = item.itemCode.includes(q);
        if (!matchesName && !matchesCode) return false;
      }

      // 2. Brand filter
      if (activeBrand !== 'ALL') {
        if (item.brand.name !== activeBrand) return false;
      }

      // 3. Asset category filter
      if (activeCategory !== 'ALL') {
        if (item.broadCategory !== activeCategory) return false;
      }

      // 4. Movement filter (rising, falling, unchanged)
      if (activeMovement !== 'ALL') {
        if (item.priceMovement !== activeMovement) return false;
      }

      // 5. Tag filter
      if (activeTag) {
        if (!item.tags || !item.tags.includes(activeTag)) return false;
      }

      // 6. Disparity alert only
      if (activeDisparityAlertOnly) {
        if (Math.abs(item.disparityRate) < 1.0) return false;
      }

      return true;
    });

    // Apply Sorting
    sortItems();
    currentPage = 1;
    render();
  }

  /**
   * Sort filtered items by sortField and sortOrder
   */
  function sortItems() {
    filteredItems.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      // Handle nulls
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = (valB || '').toLowerCase();
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }

      return sortOrder === 'asc' ? valA - valB : valB - valA;
    });
  }

  /**
   * Format helper
   */
  function fmtMoney(val) {
    return ETF_CHARTS.formatKoreanMoney(val);
  }

  function fmtNumber(val) {
    return val ? val.toLocaleString() : '0';
  }

  function fmtPercent(val) {
    if (val === null || val === undefined) return '-';
    const sign = val > 0 ? '+' : '';
    return `${sign}${val.toFixed(2)}%`;
  }

  /**
   * Render table rows and pagination controls
   */
  function render() {
    const tbody = document.getElementById('screener-table-body');
    const countBadge = document.getElementById('screener-result-count');
    const paginationWrap = document.getElementById('screener-pagination');

    if (countBadge) {
      countBadge.textContent = `${filteredItems.length.toLocaleString()}개 종목`;
    }

    if (!tbody) return;

    if (filteredItems.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10" style="text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
            검색 및 필터 조건에 부합하는 ETF 종목이 없습니다.
          </td>
        </tr>
      `;
      if (paginationWrap) paginationWrap.innerHTML = '';
      return;
    }

    // Slice for current page
    const startIdx = (currentPage - 1) * pageSize;
    const endIdx = Math.min(startIdx + pageSize, filteredItems.length);
    const pageItems = filteredItems.slice(startIdx, endIdx);

    const rowsHtml = pageItems.map(item => {
      // Movement color
      const isUp = item.priceMovement === 'rising';
      const isDown = item.priceMovement === 'falling';
      const changeClass = isUp ? 'val-up' : isDown ? 'val-down' : 'val-flat';
      const changeSign = isUp ? '▲ ' : isDown ? '▼ ' : '- ';

      // Disparity badge
      const isDispAlert = Math.abs(item.disparityRate) >= 1.0;
      const dispBadgeClass = isDispAlert ? 'badge-disp badge-disp-alert' : 'badge-disp badge-disp-normal';
      const dispSign = item.disparityRate > 0 ? '+' : '';

      // Return rates
      const r1mClass = item.return1m > 0 ? 'val-up' : item.return1m < 0 ? 'val-down' : 'val-flat';
      const r3mClass = item.return3m > 0 ? 'val-up' : item.return3m < 0 ? 'val-down' : 'val-flat';
      const r6mClass = item.return6m > 0 ? 'val-up' : item.return6m < 0 ? 'val-down' : 'val-flat';

      return `
        <tr data-code="${item.itemCode}">
          <td>
            <div class="etf-name-cell">
              <span class="etf-name">${item.itemName}</span>
              <div class="etf-meta-sub">
                <span class="etf-code">${item.itemCode}</span>
                <span class="badge-brand ${item.brand.badgeClass}">${item.brand.name}</span>
                <span style="color: var(--text-muted);">${item.broadCategory}</span>
              </div>
            </div>
          </td>
          <td class="text-right num font-semibold">${fmtNumber(item.currentPrice)}원</td>
          <td class="text-right num ${changeClass}">${changeSign}${fmtPercent(item.changeRate)}</td>
          <td class="text-right num ${dispBadgeClass}">${dispSign}${item.disparityRate.toFixed(2)}%</td>
          <td class="text-right num">${fmtMoney(item.tradingValue)}</td>
          <td class="text-right num font-semibold">${fmtMoney(item.totalNetAssets)}</td>
          <td class="text-right num ${r1mClass}">${fmtPercent(item.return1m)}</td>
          <td class="text-right num ${r3mClass}">${fmtPercent(item.return3m)}</td>
          <td class="text-right num ${r6mClass}">${fmtPercent(item.return6m)}</td>
          <td class="text-center">
            <a href="https://finance.naver.com/item/main.naver?code=${item.itemCode}" 
               target="_blank" rel="noopener noreferrer" 
               class="btn btn-icon-only" title="네이버증권 상세 보기" onclick="event.stopPropagation()">
              <i data-lucide="external-link" style="width: 14px; height: 14px;"></i>
            </a>
          </td>
        </tr>
      `;
    }).join('');

    tbody.innerHTML = rowsHtml;

    // Attach row click listeners for detailed modal
    tbody.querySelectorAll('tr[data-code]').forEach(tr => {
      tr.addEventListener('click', () => {
        const code = tr.getAttribute('data-code');
        openDetailModal(code);
      });
    });

    // Re-render Lucide icons for table
    if (window.lucide) {
      lucide.createIcons();
    }

    // Render pagination
    renderPagination(paginationWrap, filteredItems.length);
  }

  /**
   * Render pagination controls
   */
  function renderPagination(container, total) {
    if (!container) return;
    const totalPages = Math.ceil(total / pageSize);
    if (totalPages <= 1) {
      container.innerHTML = `
        <span>전체 <strong>${total.toLocaleString()}</strong>개 종목 표시 중</span>
        <div></div>
      `;
      return;
    }

    const startIdx = (currentPage - 1) * pageSize + 1;
    const endIdx = Math.min(currentPage * pageSize, total);

    let pagesHtml = '';
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    pagesHtml += `
      <button class="page-btn" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>
        <i data-lucide="chevron-left" style="width: 14px; height: 14px;"></i>
      </button>
    `;

    for (let p = startPage; p <= endPage; p++) {
      pagesHtml += `
        <button class="page-btn ${p === currentPage ? 'active' : ''}" data-page="${p}">${p}</button>
      `;
    }

    pagesHtml += `
      <button class="page-btn" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}>
        <i data-lucide="chevron-right" style="width: 14px; height: 14px;"></i>
      </button>
    `;

    container.innerHTML = `
      <span>${startIdx.toLocaleString()} - ${endIdx.toLocaleString()} / 전체 <strong>${total.toLocaleString()}</strong>개</span>
      <div class="pagination-pages">${pagesHtml}</div>
    `;

    container.querySelectorAll('.page-btn[data-page]').forEach(btn => {
      btn.addEventListener('click', () => {
        const p = parseInt(btn.getAttribute('data-page'), 10);
        if (p >= 1 && p <= totalPages) {
          currentPage = p;
          render();
          document.getElementById('screener-table-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });

    if (window.lucide) lucide.createIcons();
  }

  /**
   * Open Detail Modal for an ETF
   */
  function openDetailModal(code) {
    const item = allItems.find(x => x.itemCode === code);
    if (!item) return;

    const modal = document.getElementById('etf-detail-modal');
    if (!modal) return;

    const isUp = item.priceMovement === 'rising';
    const isDown = item.priceMovement === 'falling';
    const changeClass = isUp ? 'val-up' : isDown ? 'val-down' : 'val-flat';
    const changeSign = isUp ? '▲ +' : isDown ? '▼ ' : '';

    modal.querySelector('#modal-etf-name').textContent = item.itemName;
    modal.querySelector('#modal-etf-code').textContent = item.itemCode;
    modal.querySelector('#modal-etf-brand').textContent = `${item.brand.name} (${item.brand.company})`;
    modal.querySelector('#modal-etf-type').textContent = item.etfType || '미분류';
    
    modal.querySelector('#modal-cur-price').textContent = `${fmtNumber(item.currentPrice)}원`;
    const changeElem = modal.querySelector('#modal-change-rate');
    changeElem.textContent = `${changeSign}${item.changeRate}% (${item.changePrice.toLocaleString()}원)`;
    changeElem.className = `detail-kv-val ${changeClass}`;

    modal.querySelector('#modal-inav').textContent = `${item.iNav ? item.iNav.toLocaleString() + '원' : '-'}`;
    
    const dispElem = modal.querySelector('#modal-disparity');
    const dispSign = item.disparityRate > 0 ? '+' : '';
    dispElem.textContent = `${dispSign}${item.disparityRate.toFixed(2)}%`;
    dispElem.className = `detail-kv-val ${Math.abs(item.disparityRate) >= 1.0 ? 'val-up' : ''}`;

    modal.querySelector('#modal-aum').textContent = `${fmtMoney(item.totalNetAssets)} (${item.totalNetAssets.toLocaleString()}원)`;
    modal.querySelector('#modal-trading-val').textContent = `${fmtMoney(item.tradingValue)} (${fmtNumber(item.tradingVolume)}주)`;

    modal.querySelector('#modal-ret-1m').textContent = fmtPercent(item.return1m);
    modal.querySelector('#modal-ret-3m').textContent = fmtPercent(item.return3m);
    modal.querySelector('#modal-ret-6m').textContent = fmtPercent(item.return6m);

    const naverLink = modal.querySelector('#modal-naver-link');
    if (naverLink) {
      naverLink.href = `https://finance.naver.com/item/main.naver?code=${item.itemCode}`;
    }

    modal.classList.add('open');
  }

  /**
   * Export to CSV
   */
  function exportCSV() {
    if (!filteredItems.length) {
      alert('내보낼 ETF 데이터가 없습니다.');
      return;
    }

    const headers = [
      '종목코드', '종목명', '운용사', '운용사명', '자산분류', '세부유형',
      '현재가(원)', '전일대비(원)', '등락률(%)', 'iNAV(원)', '괴리율(%)',
      '순자산총액(원)', '거래대금(원)', '거래량(주)', '1개월수익률(%)', '3개월수익률(%)', '6개월수익률(%)'
    ];

    const rows = filteredItems.map(item => [
      `"${item.itemCode}"`,
      `"${item.itemName.replace(/"/g, '""')}"`,
      `"${item.brand.name}"`,
      `"${item.brand.company}"`,
      `"${item.broadCategory}"`,
      `"${(item.etfType || '').replace(/"/g, '""')}"`,
      item.currentPrice,
      item.changePrice,
      item.changeRate,
      item.iNav || '',
      item.disparityRate.toFixed(2),
      item.totalNetAssets,
      item.tradingValue,
      item.tradingVolume,
      item.return1m !== null ? item.return1m : '',
      item.return3m !== null ? item.return3m : '',
      item.return6m !== null ? item.return6m : ''
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `KRX_ETF_EDA_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Setters for UI interactions
  function setSearch(val) {
    activeSearch = val;
    applyFilters();
  }

  function setBrand(brand) {
    activeBrand = brand;
    applyFilters();
  }

  function setCategory(cat) {
    activeCategory = cat;
    applyFilters();
  }

  function setMovement(mov) {
    activeMovement = mov;
    applyFilters();
  }

  function toggleTag(tag) {
    activeTag = (activeTag === tag) ? null : tag;
    applyFilters();
    return activeTag;
  }

  function toggleDisparityAlert() {
    activeDisparityAlertOnly = !activeDisparityAlertOnly;
    applyFilters();
    return activeDisparityAlertOnly;
  }

  function setSort(field) {
    if (sortField === field) {
      sortOrder = (sortOrder === 'asc') ? 'desc' : 'asc';
    } else {
      sortField = field;
      sortOrder = 'desc';
    }

    // Update table header UI classes
    document.querySelectorAll('.etf-table th[data-sort]').forEach(th => {
      const f = th.getAttribute('data-sort');
      if (f === sortField) {
        th.classList.add('sort-active');
        const icon = th.querySelector('.sort-icon');
        if (icon) icon.textContent = sortOrder === 'asc' ? '▲' : '▼';
      } else {
        th.classList.remove('sort-active');
        const icon = th.querySelector('.sort-icon');
        if (icon) icon.textContent = '⇅';
      }
    });

    sortItems();
    render();
  }

  function setPageSize(sz) {
    pageSize = parseInt(sz, 10);
    currentPage = 1;
    render();
  }

  return {
    init,
    render,
    setSearch,
    setBrand,
    setCategory,
    setMovement,
    toggleTag,
    toggleDisparityAlert,
    setSort,
    setPageSize,
    exportCSV,
    openDetailModal
  };
})();
