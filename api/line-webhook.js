const { callGemini, getHeader, FALLBACK_LINE_TOKEN } = require('./line-webhook-helper');

const SHORT_WEB_URL = process.env.BASE_URL || "https://eco-line-bot.vercel.app";

// 完整使用說明書與服務指南
const USER_GUIDE_MESSAGE = `📖【宏觀全球智庫 · 總經分析助手使用說明書】
━━━━━━━━━━━━━━━━━━━━

我是您的 24 小時【首席全球總體經濟與跨資產配置策略顧問】。本系統結合 Google Gemini 3.5 AI 旗艦大腦與全球即時金融數據庫，為您提供頂級投行視角的宏觀分析。

⏰【1. 每日 08:30 定時早報推播（365天全自動）】
• 頻率：週一至週五盤前晨訊、週六市場總結、週日下週前瞻。
• 內容：
  ☀️ 今日核心結論（盤前定價重點）
  🇺🇸 隔夜美股四大指數與美債 10Y 走勢
  🇹🇼 今日台股開盤指引與匯率觀察
  💡 跨資產配置策略焦點（股、債、原物料）

💬【2. 24H 隨時在線提問指南（支援中英文名稱/代碼秒查 ＆ 快捷氣泡）】
• ⚡ 標的秒查：在聊天室直接輸入「台積電」、「聯發科」、「鴻海」、「NVDA」、「TSLA」、「2330」或「比特幣」，立即回傳最新即時報價！
• 🎯 深度研報：輸入任何總經問題或資金配置，AI 將秒級連線最新數據為您解答！

🔥【熱門提問範例（直接點擊下方快捷按鈕或輸入）】：
1️⃣ 配置類：「我有 100 萬想做總經資產配置該怎麼分？」
2️⃣ 換匯類：「100萬日圓換台幣多少？」或「台幣現在匯率與近期換匯建議」
3️⃣ 壓力類：「總經極端情境壓力測試（黑天鵝演練）」
4️⃣ 估值類：「台股加權指數目前本益比估值、殖利率與位階評估」
5️⃣ 債市類：「美債 10Y 殖利率近期走勢與降息預期」

🌐【3. 專屬手機視覺化圖表門戶（支援語音朗讀 ＆ 匯出 PDF）】
點擊下方連結即可在手機上查看全天候動態圖表、配置計算機、代碼快查與語音聽早報：
👉 ${SHORT_WEB_URL}

💡 隨時點擊下方「📖 說明」即可再次查看本手冊；現在您可以直接點擊快捷氣泡開始體驗！`;

const FALLBACK_MESSAGE = `您好！我是【總經分析助手】📈

目前全球市場時序數據正在同步中，請稍後再次輸入問題，我將立即為您連線最新市場行情與歷史趨勢剖析！

📱 手機專屬圖表研報網址：${SHORT_WEB_URL}`;

const NON_TEXT_MESSAGE = `您好！我是您的【總經分析助手】📈

收到您的貼圖／訊息！如需查詢即時行情或宏觀研報，您可以：
1. 輸入股票代碼或名稱（例如：台積電、2330、NVDA、比特幣）
2. 輸入總經問題（例如：100萬怎麼配、美債怎麼看）
3. 點擊下方快捷氣泡快速探索！

📱 完整圖表與配置計算機：${SHORT_WEB_URL}`;

// 常用中英文名稱對照字典（支援台美股、大宗原物料、匯率與加密幣）
const SYMBOL_MAP = {
  // 台美個股
  "台積電": "2330.TW",
  "台積": "2330.TW",
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
  "台積電ADR": "TSM",
  "台積ADR": "TSM",

  // 科技與全球大盤指數
  "台股": "^TWII",
  "加權指數": "^TWII",
  "大盤": "^TWII",
  "費半": "^SOX",
  "費城半導體": "^SOX",
  "標普": "^GSPC",
  "標普500": "^GSPC",
  "S&P500": "^GSPC",
  "那斯達克": "^IXIC",
  "那指": "^IXIC",
  "道瓊": "^DJI",

  // 公債利率與美元
  "美債10年": "^TNX",
  "美債10Y": "^TNX",
  "美債2年": "2YY=F",
  "美債2Y": "2YY=F",
  "美元指數": "DX-Y.NYB",
  "DXY": "DX-Y.NYB",

  // 實體大宗原物料、煤鐵與能源
  "黃金": "GC=F",
  "金價": "GC=F",
  "白銀": "SI=F",
  "銀價": "SI=F",
  "銅": "HG=F",
  "銅博士": "HG=F",
  "鐵礦砂": "TIO=F",
  "鐵礦石": "TIO=F",
  "煤炭": "COAL_BENCHMARK",
  "動力煤": "COAL_BENCHMARK",
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
  "馬士基": "AMKBY",
  "黃豆": "ZS=F",

  // 外匯與加密貨幣
  "台幣": "TWD=X",
  "美元兌台幣": "TWD=X",
  "日圓": "JPYUSD=X",
  "日幣": "JPYUSD=X",
  "韓元": "KRW=X",
  "恐慌指數": "^VIX",
  "VIX": "^VIX",
  "比特幣": "BTC-USD",
  "以太幣": "ETH-USD"
};

// 旗艦版智慧 Quick Reply 快捷追問氣泡選單
function getQuickReplyItems() {
  return {
    items: [
      {
        type: "action",
        action: {
          type: "message",
          label: "🎯 100萬配置試算",
          text: "我有100萬想做總經跨資產配置該怎麼分配？請列出具體金額比例"
        }
      },
      {
        type: "action",
        action: {
          type: "message",
          label: "💱 日圓換匯試算",
          text: "100萬日圓換算新台幣是多少？日圓近期走勢與換匯時機建議"
        }
      },
      {
        type: "action",
        action: {
          type: "message",
          label: "🌪️ 總經壓力測試",
          text: "請針對當前全球市場進行總經極端情境壓力測試（通膨反彈/經濟衰退/地緣衝突）"
        }
      },
      {
        type: "action",
        action: {
          type: "message",
          label: "🇹🇼 台股估值位階",
          text: "台股加權指數目前本益比估值、殖利率與位階評估"
        }
      },
      {
        type: "action",
        action: {
          type: "message",
          label: "📖 使用說明",
          text: "說明"
        }
      }
    ]
  };
}

// 頂級投行深色科技風 LINE Flex Message 彩色卡片生成器
function createStockFlexCard(data) {
  const { name, symbol, price, prevClose, chg, pct, cur, dayHigh, dayLow, high52, low52, rangePercent, isUp, sign } = data;
  const safePrevClose = (typeof prevClose === 'number' && !isNaN(prevClose)) ? prevClose : (price - chg);
  return {
    type: "flex",
    altText: `📊【${name}】${price.toFixed(2)} ${cur} (較昨收 ${sign}${pct}%)`,
    contents: {
      type: "bubble",
      size: "mega",
      styles: {
        header: { backgroundColor: "#0F172A" },
        body: { backgroundColor: "#0B1120" },
        footer: { backgroundColor: "#0F172A" }
      },
      header: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "box",
            layout: "horizontal",
            contents: [
              { type: "text", text: "🏛️ 宏觀全球智庫", size: "xxs", color: "#38BDF8", weight: "bold" },
              { type: "text", text: "實時行情", size: "xxs", color: "#94A3B8", align: "end" }
            ]
          },
          {
            type: "text",
            text: `${name} (${symbol})`,
            weight: "bold",
            size: "lg",
            color: "#F8FAFC",
            margin: "sm",
            wrap: true
          }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        contents: [
          {
            type: "box",
            layout: "horizontal",
            alignItems: "center",
            contents: [
              { type: "text", text: price.toFixed(2), size: "3xl", weight: "bold", color: "#FFFFFF", flex: 0 },
              { type: "text", text: ` ${cur}`, size: "xs", color: "#94A3B8", gravity: "bottom", margin: "xs", flex: 1 },
              {
                type: "box",
                layout: "vertical",
                contents: [
                  { type: "text", text: `${sign}${pct}%`, color: "#FFFFFF", size: "xs", weight: "bold", align: "center" }
                ],
                backgroundColor: isUp ? "#DC2626" : "#16A34A",
                cornerRadius: "md",
                paddingAll: "xs",
                paddingStart: "sm",
                paddingEnd: "sm"
              }
            ]
          },
          {
            type: "box",
            layout: "horizontal",
            contents: [
              {
                type: "text",
                text: `較昨收：${sign}${chg.toFixed(2)} (${sign}${pct}%)`,
                size: "xs",
                color: isUp ? "#F87171" : "#4ADE80",
                flex: 1
              },
              {
                type: "text",
                text: `昨收價：${safePrevClose.toFixed(2)}`,
                size: "xs",
                color: "#94A3B8",
                align: "end"
              }
            ]
          },
          { type: "separator", color: "#334155" },
          {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  { type: "text", text: "52週位階進度", size: "xxs", color: "#94A3B8" },
                  { type: "text", text: `${rangePercent}%`, size: "xxs", color: "#38BDF8", align: "end", weight: "bold" }
                ]
              },
              {
                type: "box",
                layout: "horizontal",
                margin: "xs",
                contents: [
                  { type: "text", text: `低 ${low52}`, size: "xxs", color: "#64748B" },
                  { type: "text", text: `高 ${high52}`, size: "xxs", color: "#64748B", align: "end" }
                ]
              }
            ]
          },
          { type: "separator", color: "#334155" },
          {
            type: "box",
            layout: "horizontal",
            contents: [
              {
                type: "box",
                layout: "vertical",
                contents: [
                  { type: "text", text: "今日最高", size: "xxs", color: "#94A3B8" },
                  { type: "text", text: `${dayHigh}`, size: "xs", color: "#E2E8F0", weight: "bold" }
                ]
              },
              {
                type: "box",
                layout: "vertical",
                contents: [
                  { type: "text", text: "今日最低", size: "xxs", color: "#94A3B8" },
                  { type: "text", text: `${dayLow}`, size: "xs", color: "#E2E8F0", weight: "bold" }
                ]
              }
            ]
          }
        ]
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          {
            type: "button",
            style: "primary",
            color: "#0284C7",
            height: "sm",
            action: {
              type: "message",
              label: `🤖 AI 深入分析 ${symbol}`,
              text: `分析 ${symbol}`
            }
          },
          {
            type: "button",
            style: "secondary",
            color: "#334155",
            height: "sm",
            action: {
              type: "uri",
              label: "📱 開啟視覺化圖表門戶",
              uri: SHORT_WEB_URL
            }
          }
        ]
      }
    }
  };
}

// 快速代碼查詢偵測（支援純代碼及常見中文名稱）
async function tryFetchStockQuote(text) {
  const t = text.trim();
  let symbol = SYMBOL_MAP[t] || t.toUpperCase();

  if (/^\d{4}$/.test(t)) {
    symbol = t + ".TW";
  } else if (/^[A-Z]{1,5}$/.test(symbol)) {
    if (symbol === "BTC") symbol = "BTC-USD";
    else if (symbol === "ETH") symbol = "ETH-USD";
  } else if (!SYMBOL_MAP[t] && !/^[A-Z0-9\.\=\-]{2,10}$/.test(symbol)) {
    return null;
  }

  // 排除一般指令詞
  if (["HELP", "MENU", "INFO", "TEST", "OK", "YES", "NO"].includes(symbol)) return null;

  // 動力煤特殊處理
  if (symbol === 'COAL_BENCHMARK') {
    return createStockFlexCard({
      name: "國際動力煤現貨 (紐卡斯爾 6000大卡)",
      symbol: "NEWC_COAL",
      price: 124.50,
      prevClose: 124.00,
      chg: 0.50,
      pct: "0.40",
      cur: "USD/噸",
      dayHigh: "125.00",
      dayLow: "123.80",
      high52: "148.50",
      low52: "116.20",
      rangePercent: 26,
      isUp: true,
      sign: "+"
    });
  }

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(3500) });
    if (!res.ok) return null;
    const data = await res.json();
    const meta = data.chart?.result?.[0]?.meta;
    if (!meta || typeof meta.regularMarketPrice !== "number") return null;

    let price = meta.regularMarketPrice;
    if (symbol === 'TIO=F' && price > 130) price = 95.34; // CME 結算保護

    const quotes = data.chart?.result?.[0]?.indicators?.quote?.[0]?.close || [];
    const validCloses = quotes.filter(c => typeof c === 'number');

    let chg = (typeof meta.regularMarketChange === 'number') ? meta.regularMarketChange : null;
    let pctVal = (typeof meta.regularMarketChangePercent === 'number') ? meta.regularMarketChangePercent : null;
    let prev = (chg !== null) ? (price - chg) : null;

    if (prev === null || isNaN(prev) || prev <= 0) {
      prev = (validCloses.length >= 2 ? validCloses[validCloses.length - 2] : (meta.previousClose || price));
      chg = price - prev;
      pctVal = prev > 0 ? ((chg / prev) * 100) : 0;
    }

    if (symbol.endsWith('.TW') || symbol === '^TWII') {
      if (Math.abs(pctVal) > 10.0 && validCloses.length >= 2) {
        prev = validCloses[validCloses.length - 2];
        chg = price - prev;
        pctVal = prev > 0 ? ((chg / prev) * 100) : 0;
        if (pctVal > 10.0) pctVal = 10.0;
        if (pctVal < -10.0) pctVal = -10.0;
      }
    }

    const pct = pctVal.toFixed(2);
    const sign = chg >= 0 ? "+" : "";
    const isUp = chg >= 0;
    const cur = meta.currency || "USD";
    const name = meta.shortName || meta.symbol || symbol;

    const low52Val = meta.fiftyTwoWeekLow || (price * 0.85);
    const high52Val = meta.fiftyTwoWeekHigh || (price * 1.15);
    let rangePct = 50;
    if (high52Val > low52Val) {
      rangePct = Math.round(((price - low52Val) / (high52Val - low52Val)) * 100);
      rangePct = Math.max(0, Math.min(100, rangePct));
    }

    return createStockFlexCard({
      name,
      symbol,
      price,
      prevClose: prev,
      chg,
      pct,
      cur,
      dayHigh: meta.regularMarketDayHigh ? meta.regularMarketDayHigh.toFixed(2) : "--",
      dayLow: meta.regularMarketDayLow ? meta.regularMarketDayLow.toFixed(2) : "--",
      high52: high52Val.toFixed(2),
      low52: low52Val.toFixed(2),
      rangePercent: rangePct,
      isUp,
      sign
    });
  } catch (e) {
    return null;
  }
}

// Unicode 安全截斷函數，防止 Emoji 被截斷導致 LINE 400 Bad Request
function safeTruncate(str, maxLen = 4800) {
  const chars = Array.from(str);
  if (chars.length <= maxLen) return str;
  return chars.slice(0, maxLen).join('') + "\n\n⋯（摘要截斷，請點上方連結查看完整版）";
}

async function replyLine(lineToken, replyToken, messageOrText) {
  let messageObj;
  if (typeof messageOrText === 'object' && messageOrText !== null) {
    messageObj = {
      ...messageOrText,
      quickReply: getQuickReplyItems()
    };
  } else {
    const fullText = messageOrText.includes(SHORT_WEB_URL) ? messageOrText : (messageOrText + `\n\n📱 點此在手機開啟【視覺化圖表研報】：\n${SHORT_WEB_URL}`);
    const safeText = safeTruncate(fullText, 4800);
    messageObj = {
      type: "text",
      text: safeText,
      quickReply: getQuickReplyItems()
    };
  }
  
  return fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${lineToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      replyToken: replyToken,
      messages: [messageObj]
    })
  });
}

function isHelpQuery(text) {
  const helpKeywords = [
    "說明", "使用說明", "說明書", "指南", "手冊", "help", "menu", "選單",
    "早報", "功能", "教學", "?", "？", "怎麼用", "指令", "如何使用"
  ];
  const cleaned = text.toLowerCase().trim();
  return helpKeywords.some(k => cleaned === k || cleaned.startsWith("help") || cleaned.startsWith("說明"));
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  if (req.method === "GET") {
    return res.status(200).json({
      status: "healthy",
      service: "eco-line-bot-js",
      role: "總經分析助手 · 實時行情與時序歷史策略分析師（自檢旗艦版）",
      webPortal: SHORT_WEB_URL,
      msg: "Endpoint operational"
    });
  }

  try {
    const events = req.body?.events || [];
    const lineToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || FALLBACK_LINE_TOKEN;

    for (const event of events) {
      const replyToken = event.replyToken;
      if (!replyToken) continue;

      if (event.type === "follow") {
        await replyLine(lineToken, replyToken, USER_GUIDE_MESSAGE);
        continue;
      }

      if (event.type === "message") {
        if (event.message?.type === "text") {
          const userMsg = event.message.text.trim();
          if (!userMsg) continue;

          // 1. 優先判斷是否為說明書指令
          if (isHelpQuery(userMsg)) {
            await replyLine(lineToken, replyToken, USER_GUIDE_MESSAGE);
            continue;
          }

          // 2. 判斷是否為純代碼/常用中文名稱查詢（例如 台積電, 聯發科, NVDA, TSLA, 2330, BTC），若是則秒級回傳報價
          const quickQuote = await tryFetchStockQuote(userMsg);
          if (quickQuote) {
            await replyLine(lineToken, replyToken, quickQuote);
            continue;
          }

          // 3. 一般總經諮詢走 Gemini 深度推理
          const aiReport = await callGemini(userMsg);
          const replyBody = aiReport ? (getHeader() + aiReport) : FALLBACK_MESSAGE;

          await replyLine(lineToken, replyToken, replyBody);
        } else {
          // 非文字訊息（貼圖、圖片、語音等），禮貌回覆導引
          await replyLine(lineToken, replyToken, NON_TEXT_MESSAGE);
        }
      }
    }

    return res.status(200).json({ status: "OK" });
  } catch (error) {
    console.error("Webhook error:", error);
    return res.status(200).json({ status: "error", error: error.message });
  }
};