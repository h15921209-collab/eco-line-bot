const fs = require('fs');
const path = require('path');

const ASSETS = [
  { key: 'twii', sym: '^TWII', header: 'TAIEX', dec: 0, defaultVal: 44291 },
  { key: 'tsmc', sym: '2330.TW', header: 'TSMC', dec: 1, defaultVal: 2360 },
  { key: 'sp500', sym: '^GSPC', header: 'SP500', dec: 1, defaultVal: 7641.2 },
  { key: 'nasdaq', sym: '^IXIC', header: 'NASDAQ', dec: 1, defaultVal: 26067.2 },
  { key: 'us10y', sym: '^TNX', header: 'US10Y', dec: 3, defaultVal: 4.696 },
  { key: 'us3m', sym: '^IRX', header: 'US3M', dec: 3, defaultVal: 3.703 },
  { key: 'usdtwd', sym: 'TWD=X', header: 'USDTWD', dec: 3, defaultVal: 31.85 },
  { key: 'gold', sym: 'GC=F', header: 'Gold', dec: 1, defaultVal: 4623.2 },
  { key: 'oil', sym: 'CL=F', header: 'Oil', dec: 2, defaultVal: 86.45 },
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

  // 1. 並行抓取所有資產的近 1 個月時序數據
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

  // 4. 如果要求格式為 CSV（供 Google Sheets `=IMPORTDATA` 匯入完整歷史表格）
  if (req.query?.format === 'csv') {
    const headers = ['Date', 'Time', ...ASSETS.map(a => a.header)];
    
    // 由最新排到最舊（Newest to Oldest），方便在試算表頂部瀏覽最新走勢
    const csvRows = [...historyRows].reverse().map(row => {
      const rowTime = row.date === todayStr ? timeStr : `${row.date} 16:00:00`;
      const vals = [row.date, rowTime, ...ASSETS.map(a => row[a.key])];
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
        us10y: historyRows.slice(-10).map(r => r.us10y),
        usdtwd: historyRows.slice(-10).map(r => r.usdtwd),
        gold: historyRows.slice(-10).map(r => r.gold)
      }
    },
    history_table: historyRows
  });
};
