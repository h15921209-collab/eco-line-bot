const fs = require('fs');
const path = require('path');

const CSV_PATH = path.join(__dirname, '../data/macro_daily.csv');
const JSON_PATH = path.join(__dirname, '../data/macro_daily.json');

// 抓取單一商品即時行情數據
async function getQuote(symbol, decimals = 2) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(4000)
    });
    if (res.ok) {
      const data = await res.json();
      const meta = data.chart?.result?.[0]?.meta;
      if (meta && typeof meta.regularMarketPrice === 'number') {
        const price = meta.regularMarketPrice;
        const prev = meta.chartPreviousClose || meta.previousClose || price;
        const chg = price - prev;
        const pct = prev ? (chg / prev * 100).toFixed(2) : '0.00';
        return {
          price: Number(price.toFixed(decimals)),
          chg: Number(chg.toFixed(decimals)),
          pct: Number(pct)
        };
      }
    }
  } catch (e) {
    console.warn(`Failed fetching ${symbol}:`, e.message);
  }
  return null;
}

async function runCollector() {
  const now = new Date();
  const utc8 = new Date(now.getTime() + 8 * 3600 * 1000);
  const dateStr = utc8.toISOString().substring(0, 10);
  const timeStr = utc8.toISOString().replace('T', ' ').substring(0, 19);

  console.log(`[${timeStr}] 正在連線採集全球總經與市場時序數據...`);

  const [twii, tsmc, sp500, nasdaq, us10y, us3m, usdtwd, jpyusd, eurusd, cnhusd, dxy, gold, oil] = await Promise.all([
    getQuote('^TWII', 0),
    getQuote('2330.TW', 1),
    getQuote('^GSPC', 1),
    getQuote('^IXIC', 1),
    getQuote('^TNX', 3),
    getQuote('^IRX', 3),
    getQuote('TWD=X', 3),
    getQuote('JPYUSD=X', 6),
    getQuote('EURUSD=X', 4),
    getQuote('CNHUSD=X', 4),
    getQuote('DX-Y.NYB', 3),
    getQuote('GC=F', 1),
    getQuote('CL=F', 2)
  ]);

  const record = {
    date: dateStr,
    timestamp: timeStr,
    twii: twii?.price || 0,
    tsmc: tsmc?.price || 0,
    sp500: sp500?.price || 0,
    nasdaq: nasdaq?.price || 0,
    us10y: us10y?.price || 0,
    us3m: us3m?.price || 0,
    usdtwd: usdtwd?.price || 0,
    jpyusd: jpyusd?.price || 0,
    eurusd: eurusd?.price || 0,
    cnhusd: cnhusd?.price || 0,
    dxy: dxy?.price || 0,
    gold: gold?.price || 0,
    oil: oil?.price || 0
  };

  const dataDir = path.dirname(CSV_PATH);
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  // 1. 更新 JSON 時序庫
  let history = [];
  if (fs.existsSync(JSON_PATH)) {
    try {
      history = JSON.parse(fs.readFileSync(JSON_PATH, 'utf-8'));
    } catch (e) {}
  }

  const existingIdx = history.findIndex(h => h.date === dateStr);
  if (existingIdx >= 0) {
    history[existingIdx] = record;
  } else {
    history.push(record);
  }
  fs.writeFileSync(JSON_PATH, JSON.stringify(history, null, 2), 'utf-8');
  console.log(`✅ JSON 時序庫已更新（累計 ${history.length} 筆紀錄）`);

  // 2. 更新 CSV 檔案
  const headers = ['Date', 'Time', 'TAIEX', 'TSMC', 'SP500', 'NASDAQ', 'US10Y', 'US3M', 'USDTWD', 'JPYUSD', 'EURUSD', 'CNHUSD', 'DXY', 'Gold', 'Oil'];
  const csvRows = [headers.join(',')];
  for (const h of history) {
    csvRows.push([
      h.date, h.timestamp, h.twii, h.tsmc, h.sp500, h.nasdaq, h.us10y, h.us3m, h.usdtwd, h.jpyusd, h.eurusd, h.cnhusd, h.dxy, h.gold, h.oil
    ].join(','));
  }
  fs.writeFileSync(CSV_PATH, csvRows.join('\n'), 'utf-8');
  console.log(`✅ CSV 時序庫已更新: ${CSV_PATH}`);
}

runCollector();
