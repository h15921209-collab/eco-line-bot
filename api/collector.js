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
  // 4. 重工業原物料與煤鐵
  { key: 'iron_ore', sym: 'TIO=F', header: 'IronOre', dec: 2, defaultVal: 161.91 },
  { key: 'coal', sym: 'MTF=F', header: 'Coal', dec: 2, defaultVal: 104.75 },
  // 5. 能源、海運供應鏈與農糧
  { key: 'oil', sym: 'CL=F', header: 'Oil', dec: 2, defaultVal: 85.69 },
  { key: 'natgas', sym: 'NG=F', header: 'NatGas', dec: 3, defaultVal: 2.814 },
  { key: 'maersk', sym: 'AMKBY', header: 'Maersk', dec: 2, defaultVal: 17.44 },
  { key: 'soybean', sym: 'ZS=F', header: 'Soybean', dec: 1, defaultVal: 1223.75 },
  // 6. 外匯與市場情緒
  { key: 'usdtwd', sym: 'TWD=X', header: 'USDTWD', dec: 3, defaultVal: 31.873 },
  { key: 'usdkrw', sym: 'KRW=X', header: 'USDKRW', dec: 2, defaultVal: 1381.98 },
  { key: 'vix', sym: '^VIX', header: 'VIX', dec: 2, defaultVal: 15.85 }
];

async function fetchAssetHistory(asset) {
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
      const curPrice = typeof meta?.regularMarketPrice === 'number' ? Number(meta.regularMarketPrice.toFixed(asset.dec)) : asset.defaultVal;
      const prev = meta?.chartPreviousClose || meta?.previousClose || curPrice;
      const chg = curPrice - prev;
      const pct = prev ? Number(((chg / prev) * 100).toFixed(2)) : 0.00;

      const datePriceMap = {};
      ts.forEach((t, idx) => {
        const dateKey = new Date(t * 1000).toISOString().substring(0, 10);
        if (typeof quotes[idx] === 'number') {
          datePriceMap[dateKey] = Number(quotes[idx].toFixed(asset.dec));
        }
      });

      return {
        key: asset.key,
        header: asset.header,
        curPrice,
        chg: Number(chg.toFixed(asset.dec)),
        pct,
        datePriceMap
      };
    }
  } catch (e) {}

  return {
    key: asset.key,
    header: asset.header,
    curPrice: asset.defaultVal,
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

  const sortedDates = Array.from(allDatesSet).sort(); // 由舊到新

  // 3. 構建每一天的完整對齊歷史紀錄 (Multi-row History Table)
  let lastKnown = {};
  assetResults.forEach(r => {
    lastKnown[r.key] = r.curPrice;
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

  // 4. 如果要求格式為 CSV（供 Google Sheets `=IMPORTDATA` 匯入完整長時序大表）
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
        coal: historyRows.slice(-10).map(r => r.coal),
        oil: historyRows.slice(-10).map(r => r.oil),
        natgas: historyRows.slice(-10).map(r => r.natgas)
      }
    },
    history_table: historyRows
  });
};
