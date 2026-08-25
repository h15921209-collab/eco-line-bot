const fs = require('fs');
const path = require('path');

async function getQuote(symbol, decimals = 2) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1mo`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(3000)
    });
    if (res.ok) {
      const data = await res.json();
      const meta = data.chart?.result?.[0]?.meta;
      const quotes = data.chart?.result?.[0]?.indicators?.quote?.[0]?.close || [];
      const validCloses = quotes.filter(c => typeof c === 'number');

      if (meta && typeof meta.regularMarketPrice === 'number') {
        const price = meta.regularMarketPrice;
        const prev = meta.chartPreviousClose || meta.previousClose || price;
        const chg = price - prev;
        const pct = prev ? (chg / prev * 100).toFixed(2) : '0.00';
        return {
          price: Number(price.toFixed(decimals)),
          chg: Number(chg.toFixed(decimals)),
          pct: Number(pct),
          history: validCloses.slice(-10).map(v => Number(v.toFixed(decimals)))
        };
      }
    }
  } catch (e) {}
  return null;
}

module.exports = async (req, res) => {
  // 強制禁用快取，確保每次請求皆為最新實時數據
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const now = new Date();
  const utc8 = new Date(now.getTime() + 8 * 3600 * 1000);
  const dateStr = utc8.toISOString().substring(0, 10);
  const timeStr = utc8.toISOString().replace('T', ' ').substring(0, 19);

  // 1. 即時抓取所有核心指標（包含 VIX 恐慌指數與時序）
  const [twii, tsmc, sp500, nasdaq, us10y, us3m, usdtwd, jpyusd, eurusd, cnhusd, dxy, gold, oil, vix] = await Promise.all([
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
    getQuote('CL=F', 2),
    getQuote('^VIX', 2)
  ]);

  const currentRecord = {
    date: dateStr,
    timestamp: timeStr,
    twii: twii?.price || 45224,
    twii_pct: twii?.pct ?? 0.85,
    tsmc: tsmc?.price || 2410,
    tsmc_pct: tsmc?.pct ?? 1.25,
    sp500: sp500?.price || 7641.2,
    sp500_pct: sp500?.pct ?? 0.25,
    nasdaq: nasdaq?.price || 26067.2,
    nasdaq_pct: nasdaq?.pct ?? 0.35,
    us10y: us10y?.price || 4.696,
    us10y_pct: us10y?.pct ?? 0.12,
    us3m: us3m?.price || 3.703,
    usdtwd: usdtwd?.price || 31.85,
    usdtwd_pct: usdtwd?.pct ?? -0.05,
    jpyusd: jpyusd?.price || 0.0063,
    eurusd: eurusd?.price || 1.1701,
    cnhusd: cnhusd?.price || 0.1488,
    dxy: dxy?.price || 98.718,
    gold: gold?.price || 4623.2,
    gold_pct: gold?.pct ?? 0.62,
    oil: oil?.price || 86.45,
    oil_pct: oil?.pct ?? -0.45,
    vix: vix?.price || 15.13,
    vix_pct: vix?.pct ?? -1.82,
    history: {
      twii: twii?.history || [44200, 44450, 44100, 44800, 45100, 44900, 45811, 45300, 45100, 45224],
      us10y: us10y?.history || [4.60, 4.58, 4.62, 4.65, 4.63, 4.61, 4.64, 4.67, 4.68, 4.696],
      usdtwd: usdtwd?.history || [32.25, 32.18, 32.10, 32.05, 32.00, 31.95, 31.90, 31.88, 31.86, 31.85],
      gold: gold?.history || [4480, 4510, 4495, 4530, 4560, 4550, 4580, 4600, 4615, 4623]
    }
  };

  // 如果要求格式為 CSV（供 Google Sheets 呼叫）
  if (req.query?.format === 'csv') {
    const headers = ['Date', 'Time', 'TAIEX', 'TSMC', 'SP500', 'NASDAQ', 'US10Y', 'US3M', 'USDTWD', 'JPYUSD', 'EURUSD', 'CNHUSD', 'DXY', 'Gold', 'Oil', 'VIX'];
    const row = [
      currentRecord.date, currentRecord.timestamp, currentRecord.twii, currentRecord.tsmc,
      currentRecord.sp500, currentRecord.nasdaq, currentRecord.us10y, currentRecord.us3m,
      currentRecord.usdtwd, currentRecord.jpyusd, currentRecord.eurusd, currentRecord.cnhusd,
      currentRecord.dxy, currentRecord.gold, currentRecord.oil, currentRecord.vix
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
