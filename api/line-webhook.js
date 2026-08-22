const { callGemini, getHeader, FALLBACK_LINE_TOKEN } = require('./line-webhook-helper');

const SHORT_WEB_URL = "https://eco-line-bot.vercel.app";

// 完整使用說明書與服務指南
const USER_GUIDE_MESSAGE = `📖【宏觀全球智庫 · 總經分析助手使用說明書】
━━━━━━━━━━━━━━━━━━━━

我是您的 24 小時【首席全球總體經濟與跨資產配置策略顧問】。本系統結合 Google Gemini 3.5 AI 旗艦大腦與全球即時金融數據庫，為您提供頂級投行視角的宏觀分析。

⏰【1. 每日 08:30 定時早報推播】
• 頻率：每週一至週五 早上 08:30 準時送達。
• 內容：
  ☀️ 今日核心結論（盤前定價重點）
  🇺🇸 隔夜美股四大指數與美債 10Y 走勢
  🇹🇼 今日台股開盤指引與匯率觀察
  💡 跨資產配置策略焦點（股、債、原物料）

💬【2. 24H 隨時在線提問指南】
您可以隨時在聊天室輸入任何總經或金融市場問題，AI 將在秒級連線最新真實數據（含近 5 日、近月累計幅度與美國財政部官方利率）為您解答！

🔥【熱門提問範例（直接複製或點擊輸入）】：
1️⃣ 匯率類：「台幣現在匯率多少？」或「日圓最新走勢與日銀政策影響」
2️⃣ 股市類：「台股與美債現在該怎麼看？」或「台積電近期基本面與大盤連動」
3️⃣ 債市類：「美債 10Y 殖利率近期走勢與降息預期」或「殖利率曲線利差分析」
4️⃣ 政策類：「聯準會最新降息路徑對美股有何影響？」
5️⃣ 商品類：「黃金與原油價格最新走勢與通膨關聯」
6️⃣ 歷史類：「台幣歷史走勢統計」或「美債近一個月變化」

🌐【3. 專屬手機視覺化圖表門戶】
點擊下方連結即可在手機上查看全天候動態圖表與歷史時序庫：
👉 ${SHORT_WEB_URL}

💡 隨時輸入「說明」即可再次查看本手冊；現在您可以直接輸入想了解的問題開始體驗！`;

const FALLBACK_MESSAGE = `您好！我是【總經分析助手】📈

目前全球市場時序數據正在同步中，請稍後再次輸入問題，我將立即為您連線最新市場行情與歷史趨勢剖析！

📱 手機專屬圖表研報網址：${SHORT_WEB_URL}`;

async function replyLine(lineToken, replyToken, text) {
  const fullText = text.includes(SHORT_WEB_URL) ? text : (text + `\n\n📱 點此在手機開啟【視覺化圖表研報】：\n${SHORT_WEB_URL}`);
  const safeText = fullText.length > 4900 ? fullText.substring(0, 4900) + "\n\n⋯（摘要截斷，請點上方連結查看完整版）" : fullText;
  
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

// 判斷是否為查詢說明書關鍵字
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
      role: "總經分析助手 · 實時行情與時序歷史策略分析師",
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

      // 1. 加好友事件 → 自動發送完整說明書
      if (event.type === "follow") {
        await replyLine(lineToken, replyToken, USER_GUIDE_MESSAGE);
        continue;
      }

      // 2. 文字訊息事件
      if (event.type === "message" && event.message?.type === "text") {
        const userMsg = event.message.text.trim();
        if (!userMsg) continue;

        // 若輸入說明書關鍵字 → 回傳使用指南
        if (isHelpQuery(userMsg)) {
          await replyLine(lineToken, replyToken, USER_GUIDE_MESSAGE);
          continue;
        }

        // 否則調用 Gemini AI 進行即時總經研報推理
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