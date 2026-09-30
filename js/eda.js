/**
 * KRX ETF EDA Core Engine
 * Computes descriptive statistics, distributions, groupings, and outlier detection.
 */

const ETF_EDA = (() => {
  // Brand definitions and Korean Asset Manager mapping
  const BRAND_MAP = {
    'KODEX': { name: 'KODEX', company: '삼성자산운용', color: '#3b82f6', badgeClass: 'badge-kodex' },
    'TIGER': { name: 'TIGER', company: '미래에셋자산운용', color: '#f97316', badgeClass: 'badge-tiger' },
    'RISE':  { name: 'RISE',  company: 'KB자산운용',     color: '#eab308', badgeClass: 'badge-rise' },
    'ACE':   { name: 'ACE',   company: '한국투자신탁운용', color: '#6366f1', badgeClass: 'badge-ace' },
    'SOL':   { name: 'SOL',   company: '신한자산운용',   color: '#0ea5e9', badgeClass: 'badge-sol' },
    'PLUS':  { name: 'PLUS',  company: '한화자산운용',   color: '#f43f5e', badgeClass: 'badge-plus' },
    'KIWOOM':{ name: 'KIWOOM',company: '키움투자자산운용', color: '#d946ef', badgeClass: 'badge-default' },
    '히어로즈':{ name: '히어로즈',company: '키움투자자산운용', color: '#d946ef', badgeClass: 'badge-default' },
    'HANARO':{ name: 'HANARO',company: 'NH-Amundi자산운용', color: '#10b981', badgeClass: 'badge-default' },
    '1Q':    { name: '1Q',    company: '하나자산운용',   color: '#14b8a6', badgeClass: 'badge-default' },
    'KoAct': { name: 'KoAct', company: '삼성액티브자산운용', color: '#2563eb', badgeClass: 'badge-default' },
    'TIME':  { name: 'TIME',  company: '타임폴리오자산운용', color: '#8b5cf6', badgeClass: 'badge-default' },
    'WON':   { name: 'WON',   company: '우리자산운용',   color: '#0284c7', badgeClass: 'badge-default' },
    '에셋플러스': { name: '에셋플러스', company: '에셋플러스자산운용', color: '#64748b', badgeClass: 'badge-default' },
    'IBK':   { name: 'IBK',   company: 'IBK자산운용',   color: '#64748b', badgeClass: 'badge-default' },
    'BNK':   { name: 'BNK',   company: 'BNK자산운용',   color: '#64748b', badgeClass: 'badge-default' },
    '마이티': { name: '마이티', company: '흥국자산운용',   color: '#64748b', badgeClass: 'badge-default' },
    'MIDAS': { name: 'MIDAS', company: '마이다스에셋자산운용', color: '#64748b', badgeClass: 'badge-default' },
    'FOCUS': { name: 'FOCUS', company: '브레인자산운용', color: '#64748b', badgeClass: 'badge-default' }
  };

  /**
   * Parse brand prefix from item name
   */
  function extractBrand(itemName) {
    if (!itemName) return { name: '기타', company: '기타', color: '#64748b', badgeClass: 'badge-default' };
    const prefix = itemName.trim().split(' ')[0];
    return BRAND_MAP[prefix] || { name: prefix, company: prefix + '자산운용', color: '#64748b', badgeClass: 'badge-default' };
  }

  /**
   * Classify broad asset class from etfType and name
   */
  function classifyAsset(etfType, itemName = '') {
    const t = etfType || '';
    if (t.includes('국내주식')) return '국내주식';
    if (t.includes('해외주식')) return '해외주식';
    if (t.includes('국내채권')) return '국내채권';
    if (t.includes('해외채권')) return '해외채권';
    if (t.includes('혼합') || t.includes('주식/채권')) return '혼합자산';
    if (t.includes('파생') || t.includes('레버리지') || t.includes('인버스')) return '파생형';
    if (t.includes('상품') || t.includes('원자재') || t.includes('부동산') || t.includes('통화')) return '원자재/실물';
    if (itemName.includes('채권') || itemName.includes('국고채') || itemName.includes('금리')) return '채권/금리';
    return '기타';
  }

  /**
   * Classify investment strategy / theme tags
   */
  function extractTags(item) {
    const name = item.itemName || '';
    const type = item.etfType || '';
    const tags = [];

    if (name.includes('배당') || name.includes('배당귀족') || name.includes('고배당')) tags.push('배당/인컴');
    if (name.includes('커버드콜') || name.includes('타겟커버드콜')) tags.push('커버드콜');
    if (name.includes('반도체') || name.includes('소부장') || name.includes('HBM')) tags.push('반도체');
    if (name.includes('AI') || name.includes('인공지능') || name.includes('빅테크') || name.includes('로봇')) tags.push('AI/빅테크');
    if (name.includes('2차전지') || name.includes('배터리')) tags.push('2차전지');
    if (name.includes('레버리지')) tags.push('레버리지');
    if (name.includes('인버스') || name.includes('선물인버스')) tags.push('인버스');
    if (name.includes('미국') || name.includes('S&P') || name.includes('나스닥')) tags.push('미국투자');
    if (name.includes('금리') || name.includes('CD금리') || name.includes('KOFR') || name.includes('파킹')) tags.push('파킹/금리');
    if (name.includes('액티브')) tags.push('액티브');
    if (name.includes('바이오') || name.includes('헬스케어')) tags.push('바이오');
    if (name.includes('방산') || name.includes('우주항공')) tags.push('방산/우주');

    return tags;
  }

  /**
   * Enrich raw ETF item with computed numerical fields
   */
  function enrichItem(raw) {
    const currentPrice = parseFloat(raw.currentPrice) || 0;
    const changePrice = parseFloat(raw.changePrice) || 0;
    const changeRate = parseFloat(raw.changeRate) || 0;
    const tradingVolume = parseFloat(raw.tradingVolume) || 0;
    const tradingValue = parseFloat(raw.tradingValue) || 0;
    const totalNetAssets = parseFloat(raw.totalNetAssets) || 0;
    const iNav = parseFloat(raw.iNav) || 0;
    
    // Disparity rate % = ((currentPrice - iNav) / iNav) * 100
    let disparityRate = 0;
    if (iNav > 0) {
      disparityRate = ((currentPrice - iNav) / iNav) * 100;
    }

    const return1m = raw.returnRate1m !== null && raw.returnRate1m !== undefined ? parseFloat(raw.returnRate1m) : null;
    const return3m = raw.returnRate3m !== null && raw.returnRate3m !== undefined ? parseFloat(raw.returnRate3m) : null;
    const return6m = raw.returnRate6m !== null && raw.returnRate6m !== undefined ? parseFloat(raw.returnRate6m) : null;

    const brand = extractBrand(raw.itemName);
    const broadCategory = classifyAsset(raw.etfType, raw.itemName);
    const tags = extractTags(raw);

    return {
      ...raw,
      currentPrice,
      changePrice,
      changeRate,
      tradingVolume,
      tradingValue,
      totalNetAssets,
      iNav,
      disparityRate,
      return1m,
      return3m,
      return6m,
      brand,
      broadCategory,
      tags
    };
  }

  /**
   * Basic statistical helpers
   */
  function calculateStats(values) {
    const valid = values.filter(v => typeof v === 'number' && !isNaN(v)).sort((a, b) => a - b);
    if (!valid.length) {
      return { count: 0, mean: 0, median: 0, std: 0, min: 0, max: 0, q25: 0, q75: 0 };
    }
    const count = valid.length;
    const sum = valid.reduce((acc, v) => acc + v, 0);
    const mean = sum / count;
    
    const median = count % 2 === 0
      ? (valid[count / 2 - 1] + valid[count / 2]) / 2
      : valid[Math.floor(count / 2)];

    const q25 = valid[Math.floor(count * 0.25)];
    const q75 = valid[Math.floor(count * 0.75)];

    const variance = valid.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / count;
    const std = Math.sqrt(variance);

    return {
      count,
      mean: Math.round(mean * 100) / 100,
      median: Math.round(median * 100) / 100,
      std: Math.round(std * 100) / 100,
      min: valid[0],
      max: valid[count - 1],
      q25: Math.round(q25 * 100) / 100,
      q75: Math.round(q75 * 100) / 100
    };
  }

  /**
   * Create histogram bins
   */
  function createHistogram(values, minVal, maxVal, step) {
    const bins = [];
    for (let cur = minVal; cur < maxVal; cur += step) {
      bins.push({
        label: `${cur > 0 ? '+' : ''}${cur}% ~ ${cur + step > 0 ? '+' : ''}${cur + step}%`,
        min: cur,
        max: cur + step,
        count: 0
      });
    }

    let underMin = 0;
    let overMax = 0;

    values.forEach(v => {
      if (typeof v !== 'number' || isNaN(v)) return;
      if (v < minVal) {
        underMin++;
      } else if (v >= maxVal) {
        overMax++;
      } else {
        const idx = Math.min(Math.floor((v - minVal) / step), bins.length - 1);
        if (idx >= 0 && idx < bins.length) bins[idx].count++;
      }
    });

    return {
      bins,
      underMin,
      overMax
    };
  }

  /**
   * Full EDA Summary Report Generation
   */
  function analyze(rawItems) {
    const items = rawItems.map(enrichItem);
    const totalCount = items.length;

    // 1. Overall Aggregates
    const totalAUM = items.reduce((sum, item) => sum + item.totalNetAssets, 0);
    const totalTradingValue = items.reduce((sum, item) => sum + item.tradingValue, 0);
    const totalVolume = items.reduce((sum, item) => sum + item.tradingVolume, 0);

    // 2. Market Breadth
    const rising = items.filter(x => x.priceMovement === 'rising');
    const falling = items.filter(x => x.priceMovement === 'falling');
    const unchanged = items.filter(x => x.priceMovement === 'unchanged');

    // 3. Disparity Anomaly Detection (Extreme Outliers)
    // In KRX, Disparity |rate| > 1% is warning, > 3% is extreme
    const warningDisparities = items.filter(x => Math.abs(x.disparityRate) >= 1.0);
    const premiumOutliers = [...items].sort((a, b) => b.disparityRate - a.disparityRate).slice(0, 10);
    const discountOutliers = [...items].sort((a, b) => a.disparityRate - b.disparityRate).slice(0, 10);

    // 4. Return Rate Statistics
    const returns1m = items.map(x => x.return1m).filter(v => v !== null);
    const returns3m = items.map(x => x.return3m).filter(v => v !== null);
    const returns6m = items.map(x => x.return6m).filter(v => v !== null);
    const stats1m = calculateStats(returns1m);
    const stats3m = calculateStats(returns3m);
    const stats6m = calculateStats(returns6m);

    // Return distribution histogram (-20% to +20%, step 4%)
    const hist1m = createHistogram(returns1m, -20, 20, 4);

    // 5. Brand Aggregations (Issuers)
    const brandMap = {};
    items.forEach(item => {
      const b = item.brand.name;
      if (!brandMap[b]) {
        brandMap[b] = {
          name: b,
          company: item.brand.company,
          color: item.brand.color,
          badgeClass: item.brand.badgeClass,
          count: 0,
          totalAUM: 0,
          totalTradingValue: 0,
          returnSum1m: 0,
          returnCount1m: 0,
          items: []
        };
      }
      brandMap[b].count++;
      brandMap[b].totalAUM += item.totalNetAssets;
      brandMap[b].totalTradingValue += item.tradingValue;
      if (item.return1m !== null) {
        brandMap[b].returnSum1m += item.return1m;
        brandMap[b].returnCount1m++;
      }
      brandMap[b].items.push(item);
    });

    const brandStats = Object.values(brandMap)
      .map(b => ({
        ...b,
        marketShare: (b.totalAUM / (totalAUM || 1)) * 100,
        avgReturn1m: b.returnCount1m > 0 ? b.returnSum1m / b.returnCount1m : 0
      }))
      .sort((a, b) => b.totalAUM - a.totalAUM);

    // 6. Broad Category Aggregations
    const catMap = {};
    items.forEach(item => {
      const c = item.broadCategory;
      if (!catMap[c]) {
        catMap[c] = {
          category: c,
          count: 0,
          totalAUM: 0,
          totalTradingValue: 0,
          returnSum1m: 0,
          returnCount1m: 0
        };
      }
      catMap[c].count++;
      catMap[c].totalAUM += item.totalNetAssets;
      catMap[c].totalTradingValue += item.tradingValue;
      if (item.return1m !== null) {
        catMap[c].returnSum1m += item.return1m;
        catMap[c].returnCount1m++;
      }
    });

    const categoryStats = Object.values(catMap)
      .map(c => ({
        ...c,
        marketShare: (c.totalAUM / (totalAUM || 1)) * 100,
        avgReturn1m: c.returnCount1m > 0 ? c.returnSum1m / c.returnCount1m : 0
      }))
      .sort((a, b) => b.totalAUM - a.totalAUM);

    // 7. Concentration (Lorenz / Top N Share)
    const sortedByAUM = [...items].sort((a, b) => b.totalNetAssets - a.totalNetAssets);
    const top10AUMSum = sortedByAUM.slice(0, 10).reduce((s, x) => s + x.totalNetAssets, 0);
    const top10AUMShare = (top10AUMSum / (totalAUM || 1)) * 100;

    const sortedByTradeVal = [...items].sort((a, b) => b.tradingValue - a.tradingValue);
    const top10TradeSum = sortedByTradeVal.slice(0, 10).reduce((s, x) => s + x.tradingValue, 0);
    const top10TradeShare = (top10TradeSum / (totalTradingValue || 1)) * 100;

    // 8. Low Liquidity & Delisting Caution Screening
    // Low AUM (< 50억원 = 5,000,000,000) or Low Trading (< 1,000만원 = 10,000,000)
    const lowLiquidity = items.filter(x => x.totalNetAssets < 5000000000 || x.tradingValue < 10000000);

    return {
      items,
      totalCount,
      totalAUM,
      totalTradingValue,
      totalVolume,
      risingCount: rising.length,
      fallingCount: falling.length,
      unchangedCount: unchanged.length,
      breadthRate: {
        up: (rising.length / (totalCount || 1)) * 100,
        down: (falling.length / (totalCount || 1)) * 100,
        flat: (unchanged.length / (totalCount || 1)) * 100
      },
      warningDisparitiesCount: warningDisparities.length,
      premiumOutliers,
      discountOutliers,
      stats1m,
      stats3m,
      stats6m,
      hist1m,
      brandStats,
      categoryStats,
      top10AUM: sortedByAUM.slice(0, 10),
      top10AUMShare,
      top10Trading: sortedByTradeVal.slice(0, 10),
      top10TradeShare,
      topGainers1d: [...items].sort((a, b) => b.changeRate - a.changeRate).slice(0, 10),
      topLosers1d: [...items].sort((a, b) => a.changeRate - b.changeRate).slice(0, 10),
      topGainers1m: [...items].filter(x => x.return1m !== null).sort((a, b) => b.return1m - a.return1m).slice(0, 10),
      topLosers1m: [...items].filter(x => x.return1m !== null).sort((a, b) => a.return1m - b.return1m).slice(0, 10),
      lowLiquidity
    };
  }

  return {
    analyze,
    enrichItem,
    extractBrand,
    classifyAsset,
    BRAND_MAP
  };
})();
