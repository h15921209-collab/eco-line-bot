const fs = require('fs');
const path = require('path');

const CSV_PATH = path.join(__dirname, '../data/macro_daily.csv');
const JSON_PATH = path.join(__dirname, '../data/macro_daily.json');

async function getQuote(symbol, decimals = 2) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(3000)
    });
    if (res.ok) {
      const data = await res.json();
      const meta = data.chart?.result?.[0]?.meta;
      if (meta && typeof meta.regularMarketPrice === 'number') {
        const price = meta.regularMarketPrice;
        const prev = meta.chartPreviousClose || meta.previousClose || price;
        const chg = price - prev;
        const pct = prev ? (chg / prev * 100).toFixed(2) : '0.00';
        return { price: Number(price.toFixed(decimals)), chg: Number(chg.toFixed(decimals)), pct: Number(pct) };
      }
    }
  } catch (e) {}
  return null;
}

module.exports = async (req, res) => {
  const now = new Date();
  const utc8 = new Date(now.getTime() + 8 * 3600 * 1000);
  const dateStr = utc8.toISOString().substring(0, 10);
  const timeStr = utc8.toISOString().replace('T', ' ').substring(0, 19);

  // 1. 即時抓取所有核心指標
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

  const currentRecord = {
    date: dateStr,
    timestamp: timeStr,
    twii: twii?.price || 45224,
    tsmc: tsmc?.price || 2410,
    sp500: sp500?.price || 7641.2,
    nasdaq: nasdaq?.price || 26067.2,
    us10y: us10y?.price || 4.696,
    us3m: us3m?.price || 3.703,
    usdtwd: usdtwd?.price || 31.85,
    jpyusd: jpyusd?.price || 0.0063,
    eurusd: eurusd?.price || 1.1701,
    cnhusd: cnhusd?.price || 0.1488,
    dxy: dxy?.price || 98.718,
    gold: gold?.price || 4623.2,
    oil: oil?.price || 86.45
  };

  // 如果要求格式為 CSV（供 Google Sheets 呼叫）
  if (req.query?.format === 'csv') {
    const headers = ['Date', 'Time', 'TAIEX', 'TSMC', 'SP500', 'NASDAQ', 'US10Y', 'US3M', 'USDTWD', 'JPYUSD', 'EURUSD', 'CNHUSD', 'DXY', 'Gold', 'Oil'];
    const row = [
      currentRecord.date, currentRecord.timestamp, currentRecord.twii, currentRecord.tsmc,
      currentRecord.sp500, currentRecord.nasdaq, currentRecord.us10y, currentRecord.us3m,
      currentRecord.usdtwd, currentRecord.jpyusd, currentRecord.eurusd, currentRecord.cnhusd,
      currentRecord.dxy, currentRecord.gold, currentRecord.oil
    ];
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    return res.status(200).send(headers.join(',') + '\n' + row.join(','));
  }

  return res.status(200).json({
    status: 'success',
    timestamp: timeStr,
    data: currentRecord
  });
};
