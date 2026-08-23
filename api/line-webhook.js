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

💬【2. 24H 隨時在線提問指南（支援底部零打字快捷氣泡）】
您可以隨時在聊天室輸入任何總經問題或具體資金金額，AI 將在秒級連線最新數據（含 VIX 情緒、台股本益比估值、美國財政部官方利率與公債利差）為您解答！

🔥【熱門提問範例（直接點擊下方快捷按鈕或輸入）】：
1️⃣ 配置類：「我有 100 萬想做總經資產配置該怎麼分？」或「50萬資產配置建議」
2️⃣ 估值類：「台股大盤本益比與估值位階」或「台股與美債現在該怎麼看？」
3️⃣ 債市類：「美債 10Y 殖利率近期走勢與降息預期」或「殖利率曲線利差分析」
4️⃣ 匯率類：「台幣現在匯率多少？」或「日圓最新走勢與日銀政策影響」
5️⃣ 情緒類：「VIX 恐慌指數與美股情緒評估」
6️⃣ 商品類：「黃金與原油價格最新走勢與通膨關聯」

🌐【3. 專屬手機視覺化圖表門戶】
點擊下方連結即可在手機上查看全天候動態圖表與歷史時序庫：
👉 ${SHORT_WEB_URL}

💡 隨時點擊下方「📖 說明」即可再次查看本手冊；現在您可以直接點擊快捷氣泡開始體驗！`;

const FALLBACK_MESSAGE = `您好！我是【總經分析助手】📈

目前全球市場時序數據正在同步中，請稍後再次輸入問題，我將立即為您連線最新市場行情與歷史趨勢剖析！

📱 手機專屬圖表研報網址：${SHORT_WEB_URL}`;

// 升級版智慧 Quick Reply 快捷追問氣泡選單
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
          label: "🇹🇼 台股估值位階",
          text: "台股加權指數目前本益比估值、殖利率與位階評估"
        }
      },
      {
        type: "action",
        action: {
          type: "message",
          label: "📈 台股與美債",
          text: "台股與美債現在該怎麼看？"
        }
      },
      {
        type: "action",
        action: {
          type: "message",
          label: "💱 台幣日圓走勢",
          text: "台幣匯率與日圓最新走勢分析"
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
      role: "總經分析助手 · 實時行情與時序歷史策略分析師（配置試算旗艦版）",
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

        if (isHelpQuery(userMsg)) {
          await replyLine(lineToken, replyToken, USER_GUIDE_MESSAGE);
          continue;
        }

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