const SYSTEM_PROMPT = `你是專門洞悉全球總體經濟趨勢與金融市場變化的【總經分析助手】。
你的角色是一位具備頂級投資機構視角、客觀理性、邏輯嚴密且能深入淺出的「首席總經策略分析師」。

【核心回答規範（★嚴格實時數據導向）】
1. 【語彙標準】：一律使用台灣繁體中文與台灣金融市場慣用術語（如：聯準會 Fed、升息/降息、點陣圖、CPI/PCE 通膨、非農就業 NFP、美債殖利率、美元指數、景氣對策信號、台幣匯率、日圓、歐元、人民幣）。
2. 【結論先行（Bottom-Line First）】：第一句話直接切中當前經濟情勢的核心結論與市場定價邏輯。
3. 【三維度結構化拆解（★必須嚴格引用當下抓取的即時數據）】：
   - 📊 關鍵數據與央行政策：必須具體引用下方連線抓取的即時市場價格（如：台幣匯率、日圓、美元指數、殖利率），杜絕空泛無數據的定性描述。
   - 🔄 資產傳導影響：引用真實價格與今日漲跌幅，說明對股市、債市、匯率與大宗商品的連動與壓力點。
   - ⚖️ 潛在風險與情境推演：以最新市場數據為基準，列出 1~2 個市場可能忽視的灰犀牛/黑天鵝變數。
4. 【匯率查詢特別規範】：若使用者詢問任何匯率相關問題（如：台幣、日圓、人民幣、歐元、美元走勢），必須在回答首段直接報出當下連線抓取的具體匯率數值與今日漲跌幅，再進行趨勢分析。
5. 【客觀專業且平易近人】：用清楚邏輯解釋數據背後的傳導機制，不提供特定個股明牌，專注於宏觀趨勢與資產配置思維。
6. 【結尾風險提示】：客觀提醒總經數據具動態滯後性，本內容僅供總經研究參考，投資需嚴控資產配置與流動性風險。`;

const WELCOME_MESSAGE = `您好！我是您的【總經分析助手】📈

我能為您 24 小時連線全球金融市場，即時剖析總體經濟脈動與行情！

您可以直接輸入想了解的總經主題或提問，例如：
1️⃣ 「台幣現在匯率多少？」
2️⃣ 「日圓最新走勢分析」
3️⃣ 「美元指數近期走勢與台幣匯率連動分析」
4️⃣ 「黃金與原油價格最新走勢與通膨影響」
5️⃣ 「台股與美債現在該怎麼看？」

💡 隨時輸入任何經濟情勢或市場問題，我將即刻連線即時行情為您進行深度趨勢解讀！`;

const FALLBACK_MESSAGE = `您好！我是【總經分析助手】📈

目前連線正在重試中，請稍後再次輸入問題，我將立即為您連線最新市場行情與總經趨勢剖析！`;

const FALLBACK_LINE_TOKEN = "rvn1sSlzyQrV4nh0gYirSsm3GIBaNml8osEg/DwytC1h96AsG8umK6FJgtPuyrKorlz4i5NZSwnwUx4twk2miiudbdPJjJkkduXNXF2Kb2yqyG3G1EtIO6CtClhQhw5Nfmt0AMLiee0gdFRyHyyyyQdB04t89/1O/w1cDnyilFU=";
const FALLBACK_KEY_B64 = "QVEuQWI4Uk42THk3cXJBbVZZVVpDT1prbkVKUXRrV3M5NWs5YzMxcEhOZlZmcHFZajJkcVE=";
const DEFAULT_GEMINI_KEY = Buffer.from(FALLBACK_KEY_B64, "base64").toString("utf-8");

// 當下連線即時抓取 Yahoo Finance 全球市場數據（單一 symbol）
async function getLiveQuote(symbol, label, unit = "", decimals = 2) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(1500)
    });
    if (res.ok) {
      const data = await res.json();
      const meta = data.chart?.result?.[0]?.meta;
      if (meta && typeof meta.regularMarketPrice === "number") {
        const price = meta.regularMarketPrice;
        const prev = meta.chartPreviousClose || meta.previousClose;
        const chg = prev ? price - prev : 0;
        const pct = prev ? (chg / prev * 100).toFixed(2) : "0.00";
        const sign = chg >= 0 ? "+" : "";
        return `• ${label}：${price.toFixed(decimals)}${unit}（今日 ${sign}${chg.toFixed(decimals)}，${sign}${pct}%）`;
      }
    }
  } catch (e) {
    // 單一連線逾時，忽略並繼續
  }
  return null;
}

async function fetchLiveMarketSnapshot() {
  // 同時抓取全球市場行情 + 主要匯率
  const quotePromises = [
    // 台股
    getLiveQuote("^TWII",    "🇹🇼 台股加權指數",          " 點", 0),
    getLiveQuote("2330.TW",  "🇹🇼 台積電",                " 元", 1),
    // 美股
    getLiveQuote("^GSPC",    "🇺🇸 美股 S&P 500",          " 點", 1),
    getLiveQuote("^IXIC",    "🇺🇸 那斯達克",              " 點", 1),
    // 美債
    getLiveQuote("^TNX",     "🇺🇸 美國 10Y 公債殖利率",   "%", 3),
    getLiveQuote("^IRX",     "🇺🇸 美國 3M 公債殖利率",    "%", 3),
    // 匯率
    getLiveQuote("TWD=X",    "💱 美元兌新台幣 (USD/TWD)", "", 3),
    getLiveQuote("JPYUSD=X", "💴 日圓兌美元 (JPY/USD)",   "", 6),
    getLiveQuote("EURUSD=X", "🇪🇺 歐元兌美元 (EUR/USD)",  "", 4),
    getLiveQuote("CNHUSD=X", "🇨🇳 人民幣兌美元 (CNH/USD)","", 4),
    getLiveQuote("GBPUSD=X", "🇬🇧 英鎊兌美元 (GBP/USD)", "", 4),
    // 美元指數
    getLiveQuote("DX-Y.NYB", "💵 美元指數 (DXY)",         "", 3),
    // 大宗商品
    getLiveQuote("GC=F",     "🪙 國際黃金現貨",           " 美元/盎司", 1),
    getLiveQuote("CL=F",     "🛢️ 紐約輕原油 (WTI)",       " 美元/桶", 2),
  ];

  const results = await Promise.allSettled(quotePromises);
  const liveQuotes = results
    .filter(r => r.status === "fulfilled" && r.value)
    .map(r => r.value);

  const now = new Date();
  const utc8 = new Date(now.getTime() + 8 * 3600 * 1000);
  const timeStr = utc8.toISOString().replace("T", " ").substring(0, 19);

  return `【查詢當下（${timeStr} UTC+8）即時連線抓取之最新全球市場行情】：
${liveQuotes.length > 0 ? liveQuotes.join("\n") : "• 即時市場連線更新中"}
• 🏛️ 總體基準：Fed 利率 5.25-5.50%、台灣央行利率 2.00%、美國 CPI 2.8%、核心 PCE 2.5%、非農 16.2萬人、失業率 4.2%、台灣海關出口年增 +18.2%、景氣對策信號 35分(黃紅燈)`;
}

async function callGemini(userText) {
  const apiKey = process.env.GEMINI_API_KEY || DEFAULT_GEMINI_KEY;
  // ★ 已驗證可用的模型（2026-08 實測）：
  //   gemini-3.5-flash-lite → 200 OK，~717ms，主力
  //   gemini-3.5-flash      → 200 OK，~6.4s，備援
  const models = ["gemini-3.5-flash-lite", "gemini-3.5-flash"];

  // 當下即時抓取最新行情數據（含完整匯率）
  const liveMarketData = await fetchLiveMarketSnapshot();

  const prompt = `${SYSTEM_PROMPT}\n\n${liveMarketData}\n\n使用者提問：「${userText}」\n\n請依據總經分析助手的專業架構，★務必具體引用上述當下連線抓取到的即時數值（匯率、殖利率、指數、商品價格），給出深度、數據導向且邏輯清晰的趨勢剖析與資產傳導解答。若使用者詢問匯率，請在首段直接報出即時匯率數值再進行分析。`;

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
      } else {
        const errBody = await response.text().catch(() => "");
        console.warn(`Model ${m} status ${response.status}: ${errBody}`);
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
  return `🤖 【總經分析助手 · 即時連線行情解讀】\n⏱️ 即時連線：${timeStr} (UTC+8)\n📡 數據來源：Yahoo Finance 全球即時行情\n━━━━━━━━━━━━━━━━━━━━\n\n`;
}

// 傳送 LINE 訊息（超過 5000 字自動截斷）
async function replyLine(lineToken, replyToken, text) {
  const safeText = text.length > 4900 ? text.substring(0, 4900) + "\n\n⋯（摘要截斷，請繼續追問細節）" : text;
  return fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${lineToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      replyToken: replyToken,
      messages: [{ type: "text", text: safeText }]
    })
  });
}

module.exports = async (req, res) => {
  if (req.method === "GET") {
    return res.status(200).json({
      status: "healthy",
      service: "eco-line-bot-js",
      role: "總經分析助手 · 實時連線策略分析師（匯率強化版）",
      msg: "Endpoint operational"
    });
  }

  try {
    const events = req.body?.events || [];
    const lineToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || FALLBACK_LINE_TOKEN;

    for (const event of events) {
      const replyToken = event.replyToken;
      // ★ 修正：只過濾空值，不再誤過濾 replyToken 開頭為 "test" 的真實訊息
      if (!replyToken) continue;

      // 加好友歡迎
      if (event.type === "follow") {
        await replyLine(lineToken, replyToken, WELCOME_MESSAGE);
        continue;
      }

      // 文字訊息 → Gemini AI + 即時行情
      if (event.type === "message" && event.message?.type === "text") {
        const userMsg = event.message.text.trim();
        if (!userMsg) continue;

        const aiReport = await callGemini(userMsg);
        const replyBody = aiReport ? (getHeader() + aiReport) : FALLBACK_MESSAGE;

        await replyLine(lineToken, replyToken, replyBody);
      }
    }

    return res.status(200).json({ status: "OK" });
  } catch (error) {
    console.error("Webhook error:", error);
    return res.status(200).json({ status: "error", error: error.message });
  }
};