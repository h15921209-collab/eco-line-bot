const SYMBOL_MAP = {
  "台積電": "2330.TW",
  "鴻海": "2317.TW",
  "聯發科": "2454.TW",
  "廣達": "2382.TW",
  "緯創": "3231.TW",
  "長榮": "2603.TW",
  "富邦金": "2881.TW",
  "國泰金": "2882.TW",
  "輝達": "NVDA",
  "英偉達": "NVDA",
  "特斯拉": "TSLA",
  "蘋果": "AAPL",
  "微軟": "MSFT",
  "谷歌": "GOOGL",
  "亞馬遜": "AMZN",
  "比特幣": "BTC-USD",
  "以太幣": "ETH-USD",
  "黃金": "GC=F",
  "原油": "CL=F"
};

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  const rawInput = (req.query.symbol || "2330.TW").trim();
  let symbol = SYMBOL_MAP[rawInput] || rawInput.toUpperCase();

  if (/^\d{4}$/.test(rawInput)) {
    symbol = rawInput + ".TW";
  } else if (symbol === "BTC") {
    symbol = "BTC-USD";
  } else if (symbol === "ETH") {
    symbol = "ETH-USD";
  }

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(4000)
    });

    if (!response.ok) {
      return res.status(404).json({ error: `查無標的代碼 ${symbol}` });
    }

    const data = await response.json();
    const meta = data.chart?.result?.[0]?.meta;
    const quotes = data.chart?.result?.[0]?.indicators?.quote?.[0]?.close || [];
    const validCloses = quotes.filter(c => typeof c === "number");

    if (!meta || typeof meta.regularMarketPrice !== "number") {
      return res.status(404).json({ error: `無有效行情數據 ${symbol}` });
    }

    const price = meta.regularMarketPrice;
    const prev = meta.chartPreviousClose || meta.previousClose || price;
    const chg = price - prev;
    const pct = prev ? ((chg / prev) * 100).toFixed(2) : "0.00";
    const currency = meta.currency || "USD";
    const shortName = meta.shortName || meta.symbol || symbol;

    return res.status(200).json({
      status: "success",
      symbol,
      name: shortName,
      currency,
      price,
      change: chg,
      pctChange: pct,
      high52: meta.fiftyTwoWeekHigh,
      low52: meta.fiftyTwoWeekLow,
      regularMarketDayHigh: meta.regularMarketDayHigh,
      regularMarketDayLow: meta.regularMarketDayLow
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
