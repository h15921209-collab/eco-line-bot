const { callGemini, getHeader, FALLBACK_LINE_TOKEN } = require('./line-webhook-helper');

const SHORT_WEB_URL = "https://eco-line-bot.vercel.app";

const WELCOME_MESSAGE = `您好！我是您的【總經分析助手】📈

我能為您 24 小時連線全球金融市場，即時整合「當前行情」與「歷史時序趨勢（近5日、近月累計走勢）」進行深度總經剖析！

您可以隨時輸入想了解的主題，例如：
1️⃣ 「台幣現在匯率與近期走勢分析」
2️⃣ 「日圓歷史變化與日銀政策影響」
3️⃣ 「美債 10Y 殖利率近期走勢與降息預期」
4️⃣ 「台股加權指數近期趨勢與 AI 基本面」
5️⃣ 「黃金與原油近期價格變動與通膨關聯」

📱 手機專屬視覺化圖表門戶：${SHORT_WEB_URL}

💡 隨時輸入任何問題，我將即刻調用即時行情與歷史時序數據為您解答！`;

const FALLBACK_MESSAGE = `您好！我是【總經分析助手】📈

目前全球市場時序數據正在同步中，請稍後再次輸入問題，我將立即為您連線最新市場行情與歷史趨勢剖析！

📱 手機專屬圖表研報網址：${SHORT_WEB_URL}`;

async function replyLine(lineToken, replyToken, text) {
  const fullText = text + `\n\n📱 點此在手機開啟【視覺化圖表研報】：\n${SHORT_WEB_URL}`;
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

      if (event.type === "follow") {
        await replyLine(lineToken, replyToken, WELCOME_MESSAGE);
        continue;
      }

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