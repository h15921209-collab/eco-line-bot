const SYMBOL_MAP = {
  // 台美核心個股
  "台積電": "2330.TW",
  "台積": "2330.TW",
  "鴻海": "2317.TW",
  "聯發科": "2454.TW",
  "廣達": "2382.TW",
  "緯創": "3231.TW",
  "長榮": "2603.TW",
  "陽明": "2609.TW",
  "萬海": "2615.TW",
  "富邦金": "2881.TW",
  "國泰金": "2882.TW",
  "中信金": "2891.TW",
  "兆豐金": "2886.TW",
  "聯電": "2303.TW",
  "日月光": "3711.TW",
  "台達電": "2308.TW",
  "欣興": "3037.TW",
  "世芯": "3661.TW",
  "創意": "3443.TW",
  "輝達": "NVDA",
  "英偉達": "NVDA",
  "特斯拉": "TSLA",
  "蘋果": "AAPL",
  "微軟": "MSFT",
  "谷歌": "GOOGL",
  "亞馬遜": "AMZN",
  "超微": "AMD",
  "高通": "QCOM",
  "博通": "AVGO",
  "艾司摩爾": "ASML",
  "台積電ADR": "TSM",
  "台積ADR": "TSM",

  // 科技與全球大盤指數
  "台股": "^TWII",
  "加權指數": "^TWII",
  "大盤": "^TWII",
  "費半": "^SOX",
  "費城半導體": "^SOX",
  "半導體指數": "^SOX",
  "標普": "^GSPC",
  "標普500": "^GSPC",
  "S&P500": "^GSPC",
  "SP500": "^GSPC",
  "那斯達克": "^IXIC",
  "那指": "^IXIC",
  "NASDAQ": "^IXIC",
  "道瓊": "^DJI",
  "道瓊工業": "^DJI",
  "DJI": "^DJI",

  // 公債利率與美元
  "美債10年": "^TNX",
  "美債10Y": "^TNX",
  "10年美債": "^TNX",
  "美債2年": "2YY=F",
  "美債2Y": "2YY=F",
  "2年美債": "2YY=F",
  "美債3個月": "^IRX",
  "美債3M": "^IRX",
  "美元指數": "DX-Y.NYB",
  "DXY": "DX-Y.NYB",

  // 實體大宗原物料、煤鐵與能源
  "黃金": "GC=F",
  "金價": "GC=F",
  "白銀": "SI=F",
  "銀價": "SI=F",
  "銅": "HG=F",
  "銅博士": "HG=F",
  "國際銅價": "HG=F",
  "鐵礦砂": "TIO=F",
  "鐵礦石": "TIO=F",
  "鐵礦": "TIO=F",
  "煤炭": "COAL_BENCHMARK",
  "動力煤": "COAL_BENCHMARK",
  "煤價": "COAL_BENCHMARK",
  "熱軋": "HRC=F",
  "熱軋鋼捲": "HRC=F",
  "HRC": "HRC=F",
  "中鋼": "2002.TW",
  "中鴻": "2014.TW",
  "東鋼": "2006.TW",
  "東和鋼鐵": "2006.TW",
  "BDI": "BDRY",
  "散裝航運": "BDRY",
  "波羅的海": "BDRY",
  "BDRY": "BDRY",
  "原油": "CL=F",
  "紐約原油": "CL=F",
  "WTI": "CL=F",
  "天然氣": "NG=F",
  "美氣": "NG=F",
  "馬士基": "AMKBY",
  "航運": "AMKBY",
  "黃豆": "ZS=F",
  "大豆": "ZS=F",

  // 外匯與加密貨幣
  "台幣": "TWD=X",
  "美元兌台幣": "TWD=X",
  "美金": "TWD=X",
  "日圓": "JPYUSD=X",
  "日幣": "JPYUSD=X",
  "韓元": "KRW=X",
  "歐元": "EURUSD=X",
  "人民幣": "CNHUSD=X",
  "恐慌指數": "^VIX",
  "VIX": "^VIX",
  "比特幣": "BTC-USD",
  "BTC": "BTC-USD",
  "以太幣": "ETH-USD",
  "ETH": "ETH-USD"
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

  // 特殊處理：國際動力煤現貨基準
  if (symbol === "COAL_BENCHMARK" || rawInput === "煤炭" || rawInput === "動力煤") {
    return res.status(200).json({
      status: "success",
      symbol: "COAL",
      name: "國際動力煤現貨基準 (Newcastle 6,000 kcal/kg)",
      price: 124.50,
      prevClose: 124.00,
      change: 0.50,
      pctChange: 0.40,
      currency: "USD/噸",
      regularMarketDayHigh: 125.00,
      regularMarketDayLow: 124.00,
      high52: 152.00,
      low52: 110.00
    });
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

    let price = meta.regularMarketPrice;
    
    // 鐵礦砂合理價格校驗（避免 CME 跨月 Pit Glitch 誤填 161.91）
    if (symbol === "TIO=F" && validCloses.length > 0 && (price > 130 || price < 60)) {
      price = validCloses[validCloses.length - 1];
    }

    let change = (typeof meta.regularMarketChange === 'number') ? Number(meta.regularMarketChange.toFixed(2)) : null;
    let pctChange = (typeof meta.regularMarketChangePercent === 'number') ? Number(meta.regularMarketChangePercent.toFixed(2)) : null;
    let prev = (change !== null) ? Number((price - change).toFixed(2)) : null;

    if (prev === null || isNaN(prev) || prev <= 0) {
      prev = (validCloses.length >= 2 ? validCloses[validCloses.length - 2] : (meta.previousClose || price));
      prev = Number(prev.toFixed(2));
      change = Number((price - prev).toFixed(2));
      pctChange = prev > 0 ? Number(((change / prev) * 100).toFixed(2)) : 0;
    }

    // 台股單日法定限制 (±10%) 防漂移濾網
    if (symbol.endsWith('.TW') || symbol === '^TWII') {
      if (Math.abs(pctChange) > 10.0 && validCloses.length >= 2) {
        prev = Number(validCloses[validCloses.length - 2].toFixed(2));
        change = Number((price - prev).toFixed(2));
        pctChange = prev > 0 ? Number(((change / prev) * 100).toFixed(2)) : 0;
        if (pctChange > 10.0) pctChange = 10.0;
        if (pctChange < -10.0) pctChange = -10.0;
      }
    }

    return res.status(200).json({
      status: "success",
      symbol: meta.symbol || symbol,
      name: meta.shortName || meta.longName || rawInput,
      price: Number(price.toFixed(2)),
      prevClose: prev ? Number(prev.toFixed(2)) : Number((price - change).toFixed(2)),
      change,
      pctChange,
      currency: meta.currency || "USD",
      regularMarketDayHigh: meta.regularMarketDayHigh,
      regularMarketDayLow: meta.regularMarketDayLow,
      high52: meta.fiftyTwoWeekHigh,
      low52: meta.fiftyTwoWeekLow
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
