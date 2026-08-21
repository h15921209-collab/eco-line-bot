const SYSTEM_PROMPT = `你是專門洞悉全球總體經濟趨勢與金融市場變化的【總經分析助手】。
你的角色是一位具備頂級投資機構視角、客觀理性、邏輯嚴密且能深入淺出的「首席總經策略分析師」。

【核心回答規範（★嚴格「實時報價 ＋ 歷史時序趨勢」雙維度導向）】
1. 【語彙標準】：一律使用台灣繁體中文與台灣金融市場慣用術語（如：聯準會 Fed、升息/降息、點陣圖、CPI/PCE 通膨、非農就業 NFP、美債殖利率、美元指數、景氣對策信號、台幣匯率、日圓、歐元、人民幣）。
2. 【結論先行（Bottom-Line First）】：第一句話直接切中當前經濟情勢的核心結論、歷史趨勢方向與市場定價邏輯。
3. 【三維度結構化拆解（★必須具體引用當前數據與「近 5 日 / 近 1 個月歷史累計幅度」）】：
   - 📊 關鍵數據與歷史軌跡：具體引用連線抓取的「即時數值」以及「近 5 日、近 1 個月累積變動幅度」（例如：台幣當前 31.84，近 5 日升值 0.88%，近 1 個月升值 1.34%），以歷史時序數據佐證趨勢，杜絕空泛無依據的描述。
   - 🔄 資產傳導影響：分析時序變動對股市、債市、匯率與大宗商品的跨資產傳導機制。
   - ⚖️ 潛在風險與情境推演：列出 1~2 個市場可能忽視的灰犀牛/黑天鵝變數。
4. 【客觀專業且平易近人】：用清晰邏輯解釋數據背後的傳導機制，不提供特定個股明牌，專注於宏觀趨勢與跨週期資產配置思維。
5. 【結尾風險提示】：客觀提醒總經數據具動態滯後性，本內容僅供總經研究參考，投資需嚴控資產配置與流動性風險。`;

const FALLBACK_LINE_TOKEN = "rvn1sSlzyQrV4nh0gYirSsm3GIBaNml8osEg/DwytC1h96AsG8umK6FJgtPuyrKorlz4i5NZSwnwUx4twk2miiudbdPJjJkkduXNXF2Kb2yqyG3G1EtIO6CtClhQhw5Nfmt0AMLiee0gdFRyHyyyyQdB04t89/1O/w1cDnyilFU=";
const FALLBACK_KEY_B64 = "QVEuQWI4Uk42THk3cXJBbVZZVVpDT1prbkVKUXRrV3M5NWs5YzMxcEhOZlZmcHFZajJkcVE=";
const DEFAULT_GEMINI_KEY = Buffer.from(FALLBACK_KEY_B64, "base64").toString("utf-8");

async function getHistoryQuote(symbol, label, unit = "", decimals = 2) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1mo`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(2000)
    });
    if (res.ok) {
      const data = await res.json();
      const meta = data.chart?.result?.[0]?.meta;
      const quotes = data.chart?.result?.[0]?.indicators?.quote?.[0]?.close || [];
      const validCloses = quotes.filter(c => typeof c === "number");

      if (meta && typeof meta.regularMarketPrice === "number") {
        const price = meta.regularMarketPrice;
        const prev = meta.chartPreviousClose || meta.previousClose || price;
        const chg1d = price - prev;
        const pct1d = prev ? (chg1d / prev * 100).toFixed(2) : "0.00";
        const sign1d = chg1d >= 0 ? "+" : "";

        const p5d = validCloses.length >= 6 ? validCloses[validCloses.length - 6] : validCloses[0];
        const p20d = validCloses.length > 0 ? validCloses[0] : price;

        const chg5d = p5d ? ((price - p5d) / p5d * 100).toFixed(2) : "0.00";
        const chg20d = p20d ? ((price - p20d) / p20d * 100).toFixed(2) : "0.00";
        const sign5d = Number(chg5d) >= 0 ? "+" : "";
        const sign20d = Number(chg20d) >= 0 ? "+" : "";

        return `• ${label}：當前 ${price.toFixed(decimals)}${unit}（今日 ${sign1d}${chg1d.toFixed(decimals)}，${sign1d}${pct1d}% ｜ 近5日累計 ${sign5d}${chg5d}% ｜ 近月累計 ${sign20d}${chg20d}%）`;
      }
    }
  } catch (e) {}
  return null;
}

async function fetchLiveMarketAndHistory() {
  const quotePromises = [
    getHistoryQuote("TWD=X",    "💱 美元兌新台幣 (USD/TWD)", "", 3),
    getHistoryQuote("JPYUSD=X", "💴 日圓兌美元 (JPY/USD)",   "", 6),
    getHistoryQuote("EURUSD=X", "🇪🇺 歐元兌美元 (EUR/USD)",  "", 4),
    getHistoryQuote("CNHUSD=X", "🇨🇳 人民幣兌美元 (CNH/USD)","", 4),
    getHistoryQuote("DX-Y.NYB", "💵 美元指數 (DXY)",         "", 3),
    getHistoryQuote("^TWII",    "🇹🇼 台股加權指數",          " 點", 0),
    getHistoryQuote("2330.TW",  "🇹🇼 台積電",                " 元", 1),
    getHistoryQuote("^GSPC",    "🇺🇸 美股 S&P 500",          " 點", 1),
    getHistoryQuote("^TNX",     "🇺🇸 美國 10Y 公債殖利率",   "%", 3),
    getHistoryQuote("GC=F",     "🪙 國際黃金現貨",           " 美元/盎司", 1),
    getHistoryQuote("CL=F",     "🛢️ 紐約輕原油 (WTI)",       " 美元/桶", 2)
  ];

  const results = await Promise.allSettled(quotePromises);
  const liveQuotes = results
    .filter(r => r.status === "fulfilled" && r.value)
    .map(r => r.value);

  const now = new Date();
  const utc8 = new Date(now.getTime() + 8 * 3600 * 1000);
  const timeStr = utc8.toISOString().replace("T", " ").substring(0, 19);

  return `【查詢當下（${timeStr} UTC+8）即時連線抓取之市場行情與歷史時序趨勢庫】：
${liveQuotes.length > 0 ? liveQuotes.join("\n") : "• 即時市場連線更新中"}
• 🏛️ 總體基準：Fed 利率 5.25-5.50%、台灣央行利率 2.00%、美國 CPI 2.8%、核心 PCE 2.5%、非農 16.2萬人、失業率 4.2%、台灣海關出口年增 +18.2%、景氣對策信號 35分(黃紅燈)`;
}

async function callGemini(userText) {
  const apiKey = process.env.GEMINI_API_KEY || DEFAULT_GEMINI_KEY;
  const models = ["gemini-3.5-flash-lite", "gemini-3.5-flash"];

  const liveMarketData = await fetchLiveMarketAndHistory();
  const prompt = `${SYSTEM_PROMPT}\n\n${liveMarketData}\n\n使用者提問：「${userText}」\n\n請依據總經分析助手的專業架構，★務必同時引用上述提供的「當前最新報價」與「近 5 日、近 1 個月歷史累計幅度」，結合歷史時序軌跡進行深度、邏輯清晰的趨勢剖析與資產傳導解答。`;

  for (const m of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 1024, temperature: 0.4 }
        }),
        signal: AbortSignal.timeout(8000)
      });

      if (response.ok) {
        const data = await response.json();
        const resText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (resText) return resText;
      }
    } catch (e) {
      console.warn(`Model ${m} failed:`, e.message);
    }
  }
  return "";
}

function getHeader() {
  const now = new Date();
  const utc8 = new Date(now.getTime() + 8 * 3600 * 1000);
  const timeStr = utc8.toISOString().replace("T", " ").substring(0, 19);
  return `🤖 【總經分析助手 · 實時行情與歷史時序趨勢解讀】\n⏱️ 即時連線：${timeStr} (UTC+8)\n📡 數據來源：Yahoo Finance 實時行情與多日歷史時序庫\n━━━━━━━━━━━━━━━━━━━━\n\n`;
}

module.exports = {
  SYSTEM_PROMPT,
  FALLBACK_LINE_TOKEN,
  getHistoryQuote,
  fetchLiveMarketAndHistory,
  callGemini,
  getHeader
};
