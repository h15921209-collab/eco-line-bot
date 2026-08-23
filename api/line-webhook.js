const { callGemini, getHeader, FALLBACK_LINE_TOKEN } = require('./line-webhook-helper');

const SHORT_WEB_URL = "https://eco-line-bot.vercel.app";

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

💬【2. 24H 隨時在線提問指南（支援代碼秒查 ＆ 快捷氣泡）】
• ⚡ 代碼秒查：在聊天室直接輸入「NVDA」、「TSLA」、「2330」或「BTC」，立即回傳最新即時報價！
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

// 快速代碼查詢偵測（若使用者只輸入純代碼如 NVDA, 2330, TSLA, BTC，秒級回傳報價卡片）
async function tryFetchStockQuote(text) {
  const t = text.trim().toUpperCase();
  let symbol = t;

  if (/^\d{4}$/.test(t)) {
    symbol = t + ".TW";
  } else if (/^[A-Z]{1,5}$/.test(t)) {
    if (t === "BTC") symbol = "BTC-USD";
    else if (t === "ETH") symbol = "ETH-USD";
  } else if (/^[A-Z0-9\.\=\-]{2,10}$/.test(t)) {
    symbol = t;
  } else {
    return null;
  }

  // 排除一般指令詞
  if (["HELP", "MENU", "INFO", "TEST", "OK", "YES", "NO"].includes(symbol)) return null;

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(3500) });
    if (!res.ok) return null;
    const data = await res.json();
    const meta = data.chart?.result?.[0]?.meta;
    if (!meta || typeof meta.regularMarketPrice !== "number") return null;

    const price = meta.regularMarketPrice;
    const prev = meta.chartPreviousClose || meta.previousClose || price;
    const chg = price - prev;
    const pct = prev ? ((chg / prev) * 100).toFixed(2) : "0.00";
    const sign = chg >= 0 ? "+" : "";
    const emoji = chg >= 0 ? "🔺" : "🔻";
    const cur = meta.currency || "USD";
    const name = meta.shortName || meta.symbol || symbol;

    return `📊【${name} (${symbol}) 即時行情】
━━━━━━━━━━━━━━━━━━━━
💵 最新現價：${price.toFixed(2)} ${cur}
${emoji} 今日漲跌：${sign}${chg.toFixed(2)} (${sign}${pct}%)
📈 今日最高：${meta.regularMarketDayHigh ? meta.regularMarketDayHigh.toFixed(2) : "--"}
📉 今日最低：${meta.regularMarketDayLow ? meta.regularMarketDayLow.toFixed(2) : "--"}
🏔️ 52週高點：${meta.fiftyTwoWeekHigh ? meta.fiftyTwoWeekHigh.toFixed(2) : "--"}
🏖️ 52週低點：${meta.fiftyTwoWeekLow ? meta.fiftyTwoWeekLow.toFixed(2) : "--"}

💡 提示：如需針對【${symbol}】進行基本面估值與全球總經連動分析，請輸入：「分析 ${symbol}」或點擊下方快捷氣泡！`;
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

async function replyLine(lineToken, replyToken, text) {
  const fullText = text.includes(SHORT_WEB_URL) ? text : (text + `\n\n📱 點此在手機開啟【視覺化圖表研報】：\n${SHORT_WEB_URL}`);
  const safeText = safeTruncate(fullText, 4800);
  
  return fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${lineToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      replyToken: replyToken,
      messages: [
        {
          type: "text",
          text: safeText,
          quickReply: getQuickReplyItems()
        }
      ]
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

      if (event.type === "message" && event.message?.type === "text") {
        const userMsg = event.message.text.trim();
        if (!userMsg) continue;

        // 1. 優先判斷是否為說明書指令
        if (isHelpQuery(userMsg)) {
          await replyLine(lineToken, replyToken, USER_GUIDE_MESSAGE);
          continue;
        }

        // 2. 判斷是否為純代碼查詢（例如 NVDA, TSLA, 2330, BTC），若是則秒級回傳報價
        const quickQuote = await tryFetchStockQuote(userMsg);
        if (quickQuote) {
          await replyLine(lineToken, replyToken, quickQuote);
          continue;
        }

        // 3. 一般總經諮詢走 Gemini 深度推理
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