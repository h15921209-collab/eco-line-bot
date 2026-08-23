module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");

  const symbol = (req.query.symbol || "2330.TW").trim().toUpperCase();

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
