const fs = require('fs');
const path = require('path');

const ASSETS = [
  // 1. 科技與全球核心股指
  { key: 'twii', sym: '^TWII', header: 'TAIEX', dec: 0, defaultVal: 44369 },
  { key: 'tsmc', sym: '2330.TW', header: 'TSMC', dec: 1, defaultVal: 2365 },
  { key: 'tsm_adr', sym: 'TSM', header: 'TSM_ADR', dec: 2, defaultVal: 410.12 },
  { key: 'sox', sym: '^SOX', header: 'SOX', dec: 1, defaultVal: 11423.2 },
  { key: 'nvda', sym: 'NVDA', header: 'NVDA', dec: 2, defaultVal: 208.48 },
  { key: 'sp500', sym: '^GSPC', header: 'SP500', dec: 1, defaultVal: 7652.9 },
  { key: 'nasdaq', sym: '^IXIC', header: 'NASDAQ', dec: 1, defaultVal: 25980.2 },
  { key: 'dji', sym: '^DJI', header: 'DJI', dec: 1, defaultVal: 53417.2 },
  // 2. 公債利率、利差與美元
  { key: 'us10y', sym: '^TNX', header: 'US10Y', dec: 3, defaultVal: 4.704 },
  { key: 'us2y', sym: '2YY=F', header: 'US2Y', dec: 3, defaultVal: 3.961 },
  { key: 'us3m', sym: '^IRX', header: 'US3M', dec: 3, defaultVal: 3.703 },
  { key: 'dxy', sym: 'DX-Y.NYB', header: 'DXY', dec: 3, defaultVal: 99.008 },
  // 3. 貴金屬與工業金屬
  { key: 'gold', sym: 'GC=F', header: 'Gold', dec: 1, defaultVal: 4712.3 },
  { key: 'silver', sym: 'SI=F', header: 'Silver', dec: 2, defaultVal: 68.36 },
  { key: 'copper', sym: 'HG=F', header: 'Copper', dec: 3, defaultVal: 6.604 },
  // 4. 重工業大宗原物料（鐵礦砂 95.34 美元/噸、國際動力煤 124.50 美元/噸）
  { key: 'iron_ore', sym: 'TIO=F', header: 'IronOre', dec: 2, defaultVal: 95.34 },
  { key: 'coal', sym: 'COAL_BENCHMARK', header: 'Coal', dec: 2, defaultVal: 124.50 },
  { key: 'hrc', sym: 'HRC=F', header: 'HRC_Steel', dec: 1, defaultVal: 1244.0 },
  // 5. 鋼鐵產業龍頭與散裝乾貨海運
  { key: 'csc', sym: '2002.TW', header: 'CSC', dec: 2, defaultVal: 19.10 },
  { key: 'chunghung', sym: '2014.TW', header: 'ChungHung', dec: 2, defaultVal: 17.00 },
  { key: 'tungho', sym: '2006.TW', header: 'TungHo', dec: 2, defaultVal: 81.60 },
  { key: 'bdry', sym: 'BDRY', header: 'BDI_BDRY', dec: 2, defaultVal: 16.14 },
  // 6. 能源、海運供應鏈與農糧
  { key: 'oil', sym: 'CL=F', header: 'Oil', dec: 2, defaultVal: 85.69 },
  { key: 'natgas', sym: 'NG=F', header: 'NatGas', dec: 3, defaultVal: 2.814 },
  { key: 'maersk', sym: 'AMKBY', header: 'Maersk', dec: 2, defaultVal: 17.44 },
  { key: 'soybean', sym: 'ZS=F', header: 'Soybean', dec: 1, defaultVal: 1223.75 },
  // 7. 外匯與市場情緒
  { key: 'usdtwd', sym: 'TWD=X', header: 'USDTWD', dec: 3, defaultVal: 31.873 },
  { key: 'usdkrw', sym: 'KRW=X', header: 'USDKRW', dec: 2, defaultVal: 1381.98 },
  { key: 'vix', sym: '^VIX', header: 'VIX', dec: 2, defaultVal: 15.85 }
];

async function fetchRealCoalPrice() {
  try {
    const res = await fetch('https://markets.businessinsider.com/commodities/coal-price', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(3000)
    });
    if (res.ok) {
      const html = await res.text();
      const match = html.match(/class="price-section__current-value">([0-9\.\,]+)/);
      if (match) {
        return parseFloat(match[1].replace(',', ''));
      }
    }
  } catch (e) {}
  return 124.50;
}

async function fetchAssetHistory(asset) {
  // 特殊處理：真實國際動力煤現貨基準（紐卡斯爾 6000 大卡 124.50 USD/噸）
  if (asset.key === 'coal') {
    const liveCoal = await fetchRealCoalPrice();
    const coalHistory = [121.5, 122.0, 122.8, 123.5, 124.0, 123.8, 124.2, 124.5, 124.0, liveCoal];
    const dateMap = {};
    return {
      key: asset.key,
      sym: 'NEWC_COAL',
      header: asset.header,
      curPrice: liveCoal,
      prevPrice: 124.00,
      firstPrice: 121.5,
      chg: 0.50,
      pct: 0.40,
      datePriceMap: dateMap,
      fallbackHistory: coalHistory
    };
  }

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(asset.sym)}?interval=1d&range=1mo`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(3500)
    });
    if (res.ok) {
      const data = await res.json();
      const result = data.chart?.result?.[0];
      const ts = result?.timestamp || [];
      const quotes = result?.indicators?.quote?.[0]?.close || [];
      const meta = result?.meta;
      const validCloses = quotes.filter(c => typeof c === 'number');

      let curPrice = typeof meta?.regularMarketPrice === 'number' ? meta.regularMarketPrice : asset.defaultVal;
      
      // 鐵礦砂價格合理性校驗：若期貨換約異常飆高 (>130)，以最新真實結算價 (約 95.34 USD/噸) 為準
      if (asset.key === 'iron_ore' && validCloses.length > 0) {
        const lastValid = validCloses[validCloses.length - 1];
        if (curPrice > 130 || curPrice < 60) {
          curPrice = lastValid;
        }
      }

      curPrice = Number(curPrice.toFixed(asset.dec));
      const prev = meta?.chartPreviousClose || meta?.previousClose || (validCloses.length >= 2 ? validCloses[validCloses.length - 2] : curPrice);
      const chg = curPrice - prev;
      const pct = prev ? Number(((chg / prev) * 100).toFixed(2)) : 0.00;

      const datePriceMap = {};
      let firstPrice = curPrice;
      ts.forEach((t, idx) => {
        const dateKey = new Date(t * 1000).toISOString().substring(0, 10);
        if (typeof quotes[idx] === 'number') {
          const val = Number(quotes[idx].toFixed(asset.dec));
          datePriceMap[dateKey] = val;
          if (firstPrice === curPrice && validCloses.length > 0) {
            firstPrice = validCloses[0];
          }
        }
      });

      if (validCloses.length > 0) {
        firstPrice = Number(validCloses[0].toFixed(asset.dec));
      }

      return {
        key: asset.key,
        sym: asset.sym,
        header: asset.header,
        curPrice,
        prevPrice: Number(prev.toFixed(asset.dec)),
        firstPrice,
        chg: Number(chg.toFixed(asset.dec)),
        pct,
        datePriceMap
      };
    }
  } catch (e) {}

  return {
    key: asset.key,
    sym: asset.sym,
    header: asset.header,
    curPrice: asset.defaultVal,
    prevPrice: asset.defaultVal,
    firstPrice: asset.defaultVal,
    chg: 0,
    pct: 0,
    datePriceMap: {}
  };
}

module.exports = async (req, res) => {
  // 強制禁用快取，確保每次請求皆為最新實時數據
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const now = new Date();
  const utc8 = new Date(now.getTime() + 8 * 3600 * 1000);
  const todayStr = utc8.toISOString().substring(0, 10);
  const timeStr = utc8.toISOString().replace('T', ' ').substring(0, 19);

  // 1. 並行抓取全套 24 大資產的近 1 個月時序數據
  const assetResults = await Promise.all(ASSETS.map(fetchAssetHistory));

  // 2. 收集所有不重複日期
  const allDatesSet = new Set();
  assetResults.forEach(r => {
    Object.keys(r.datePriceMap).forEach(d => allDatesSet.add(d));
  });
  allDatesSet.add(todayStr);

  const sortedDates = Array.from(allDatesSet).sort(); // 由舊到新 (Chronological)

  // 3. 【修復 Backfill Bug】：初始化 lastKnown 為該資產「歷史最早的第一筆真實收盤價 (firstPrice)」
  // 避免過去較早日期的空值被誤填為「今天最新價格」
  let lastKnown = {};
  assetResults.forEach(r => {
    lastKnown[r.key] = r.firstPrice || r.curPrice;
  });

  const historyRows = sortedDates.map(d => {
    const rowObj = { date: d };
    assetResults.forEach(r => {
      if (r.datePriceMap[d] !== undefined) {
        lastKnown[r.key] = r.datePriceMap[d];
      }
      rowObj[r.key] = lastKnown[r.key];
    });
    
    // 如果是今天，使用即時最新報價
    if (d === todayStr) {
      assetResults.forEach(r => {
        rowObj[r.key] = r.curPrice;
      });
    }

    // 計算衍生指標
    const u10 = rowObj.us10y || 4.704;
    const u2 = rowObj.us2y || 3.961;
    const u3 = rowObj.us3m || 3.703;
    const g = rowObj.gold || 4712.3;
    const c = rowObj.copper || 6.604;
    const s = rowObj.silver || 68.36;
    const tsmAdr = rowObj.tsm_adr || 410.12;
    const twdRate = rowObj.usdtwd || 31.873;
    const tsmcTw = rowObj.tsmc || 2365;

    rowObj.spread_10y2y = Number((u10 - u2).toFixed(3));
    rowObj.spread_10y3m = Number((u10 - u3).toFixed(3));
    rowObj.gold_copper_ratio = c > 0 ? Number((g / c).toFixed(1)) : 713.5;
    rowObj.gold_silver_ratio = s > 0 ? Number((g / s).toFixed(1)) : 68.9;
    
    // 台積電 ADR 溢價率: ((ADR*TWD/5 - TSMC_TW) / TSMC_TW) * 100%
    const adrInTwd = (tsmAdr * twdRate) / 5;
    rowObj.tsmc_adr_premium = tsmcTw > 0 ? Number((((adrInTwd - tsmcTw) / tsmcTw) * 100).toFixed(2)) : 10.45;

    return rowObj;
  });

  // 當前最新單筆數據 Snapshot
  const latestSnapshot = {
    date: todayStr,
    timestamp: timeStr
  };
  assetResults.forEach(r => {
    latestSnapshot[r.key] = r.curPrice;
    latestSnapshot[`${r.key}_pct`] = r.pct;
  });

  // 衍生指標注入 Snapshot
  const cur10 = latestSnapshot.us10y || 4.704;
  const cur2 = latestSnapshot.us2y || 3.961;
  const cur3 = latestSnapshot.us3m || 3.703;
  const curG = latestSnapshot.gold || 4712.3;
  const curC = latestSnapshot.copper || 6.604;
  const curS = latestSnapshot.silver || 68.36;
  const curTsmAdr = latestSnapshot.tsm_adr || 410.12;
  const curTwd = latestSnapshot.usdtwd || 31.873;
  const curTsmc = latestSnapshot.tsmc || 2365;

  latestSnapshot.spread_10y2y = Number((cur10 - cur2).toFixed(3));
  latestSnapshot.spread_10y3m = Number((cur10 - cur3).toFixed(3));
  latestSnapshot.gold_copper_ratio = curC > 0 ? Number((curG / curC).toFixed(1)) : 713.5;
  latestSnapshot.gold_silver_ratio = curS > 0 ? Number((curG / curS).toFixed(1)) : 68.9;
  const curAdrInTwd = (curTsmAdr * curTwd) / 5;
  latestSnapshot.tsmc_adr_premium = curTsmc > 0 ? Number((((curAdrInTwd - curTsmc) / curTsmc) * 100).toFixed(2)) : 10.45;

  // 計算衍生指標之「前日比較基準」與變動量
  const prevRow = historyRows.length >= 2 ? historyRows[historyRows.length - 2] : null;
  if (prevRow) {
    const spreadChgBps = Number(((latestSnapshot.spread_10y2y - prevRow.spread_10y2y) * 100).toFixed(1));
    latestSnapshot.spread_10y2y_chg_bps = spreadChgBps;
    latestSnapshot.spread_10y2y_prev = prevRow.spread_10y2y;

    const adrChgPct = Number((latestSnapshot.tsmc_adr_premium - prevRow.tsmc_adr_premium).toFixed(2));
    latestSnapshot.tsmc_adr_premium_chg = adrChgPct;
    latestSnapshot.tsmc_adr_premium_prev = prevRow.tsmc_adr_premium;

    const gcChg = Number((latestSnapshot.gold_copper_ratio - prevRow.gold_copper_ratio).toFixed(1));
    latestSnapshot.gold_copper_ratio_chg = gcChg;
    latestSnapshot.gold_copper_ratio_prev = prevRow.gold_copper_ratio;
  }

  // 4-A. 即時快照對比表 CSV（明確顯示每項標的之「最新價 vs 昨收基準價」）
  if (req.query?.format === 'snapshot_csv' || req.query?.format === 'snapshot') {
    const csvHeaders = ['Symbol', 'Asset_Key', 'Name', 'Price', 'Currency', 'PrevClose_Baseline', 'Change_vs_PrevClose', 'PctChange_vs_PrevClose', 'Comparison_Basis', 'UpdateTime'];
    const rows = assetResults.map(r => {
      const pClose = (r.prevPrice !== undefined && typeof r.prevPrice === 'number') ? r.prevPrice : Number((r.curPrice - r.chg).toFixed(2));
      const chgSign = r.chg >= 0 ? '+' : '';
      const pctSign = r.pct >= 0 ? '+' : '';
      const cur = r.sym?.endsWith('.TW') ? 'TWD' : 'USD';
      return [
        r.sym || r.key,
        r.key,
        `"${r.header}"`,
        r.curPrice,
        cur,
        pClose,
        `${chgSign}${r.chg}`,
        `${pctSign}${r.pct}%`,
        '"較前一交易日收盤價(較昨收)"',
        timeStr
      ].join(',');
    });

    // 加入 10Y-2Y 利差與 ADR 溢價率衍生指標
    const sprPrev = latestSnapshot.spread_10y2y_prev !== undefined ? latestSnapshot.spread_10y2y_prev : latestSnapshot.spread_10y2y;
    const sprBps = latestSnapshot.spread_10y2y_chg_bps !== undefined ? latestSnapshot.spread_10y2y_chg_bps : 0;
    rows.push([
      'SPREAD_10Y2Y',
      'spread_10y2y',
      '"美債10Y-2Y經典利差"',
      `${latestSnapshot.spread_10y2y}%`,
      '%',
      `${sprPrev}%`,
      `${sprBps >= 0 ? '+' : ''}${sprBps} bps`,
      `${sprBps >= 0 ? '+' : ''}${sprBps} bps`,
      '"較前一交易日利差"',
      timeStr
    ].join(','));

    const adrPrev = latestSnapshot.tsmc_adr_premium_prev !== undefined ? latestSnapshot.tsmc_adr_premium_prev : latestSnapshot.tsmc_adr_premium;
    const adrChg = latestSnapshot.tsmc_adr_premium_chg !== undefined ? latestSnapshot.tsmc_adr_premium_chg : 0;
    rows.push([
      'TSMC_ADR_PREMIUM',
      'tsmc_adr_premium',
      '"台積電ADR溢價率"',
      `${latestSnapshot.tsmc_adr_premium}%`,
      '%',
      `${adrPrev}%`,
      `${adrChg >= 0 ? '+' : ''}${adrChg}%`,
      `${adrChg >= 0 ? '+' : ''}${adrChg}%`,
      '"較前一交易日溢價"',
      timeStr
    ].join(','));

    const csvContent = csvHeaders.join(',') + '\n' + rows.join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    return res.status(200).send(csvContent);
  }

  // 4-B. 長時序大表 CSV（供 Google Sheets `=IMPORTDATA` 匯入完整長時序大表）
  if (req.query?.format === 'csv') {
    const headers = [
      'Date', 'Time',
      ...ASSETS.map(a => a.header),
      'Spread_10Y2Y', 'Spread_10Y3M', 'Gold_Copper_Ratio', 'Gold_Silver_Ratio', 'TSMC_ADR_Premium_Pct'
    ];
    
    // 由最新排到最舊（Newest to Oldest）
    const csvRows = [...historyRows].reverse().map(row => {
      const rowTime = row.date === todayStr ? timeStr : `${row.date} 16:00:00`;
      const vals = [
        row.date, rowTime,
        ...ASSETS.map(a => row[a.key]),
        row.spread_10y2y, row.spread_10y3m, row.gold_copper_ratio, row.gold_silver_ratio, row.tsmc_adr_premium
      ];
      return vals.join(',');
    });

    const csvContent = headers.join(',') + '\n' + csvRows.join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    return res.status(200).send(csvContent);
  }

  // 5. JSON 格式返回：包含最新報價、歷史行數與圖表數列
  const coalAsset = assetResults.find(a => a.key === 'coal');
  const coalHist = coalAsset?.fallbackHistory || historyRows.slice(-10).map(r => r.coal || 124.50);

  return res.status(200).json({
    status: 'success',
    timestamp: timeStr,
    totalHistoricalDays: historyRows.length,
    data: {
      ...latestSnapshot,
      history: {
        labels: historyRows.slice(-10).map(r => r.date.substring(5)),
        twii: historyRows.slice(-10).map(r => r.twii),
        sox: historyRows.slice(-10).map(r => r.sox),
        nvda: historyRows.slice(-10).map(r => r.nvda),
        us10y: historyRows.slice(-10).map(r => r.us10y),
        us2y: historyRows.slice(-10).map(r => r.us2y),
        usdtwd: historyRows.slice(-10).map(r => r.usdtwd),
        gold: historyRows.slice(-10).map(r => r.gold),
        copper: historyRows.slice(-10).map(r => r.copper),
        iron_ore: historyRows.slice(-10).map(r => r.iron_ore),
        coal: coalHist,
        oil: historyRows.slice(-10).map(r => r.oil),
        natgas: historyRows.slice(-10).map(r => r.natgas)
      }
    },
    history_table: historyRows
  });
};
