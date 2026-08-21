const { callGemini, fetchLiveMarketAndHistory, FALLBACK_LINE_TOKEN } = require('./line-webhook-helper');

const SHORT_WEB_URL = "https://eco-line-bot.vercel.app";

// 每日早報專屬生成與推播端點
module.exports = async (req, res) => {
  const lineToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || FALLBACK_LINE_TOKEN;
  
  const now = new Date();
  const utc8 = new Date(now.getTime() + 8 * 3600 * 1000);
  const dateStr = utc8.toISOString().substring(0, 10);
  const timeStr = utc8.toISOString().replace('T', ' ').substring(0, 19);

  console.log(`[${timeStr}] 正在生成今日財經早報並發動 LINE 廣播推播...`);

  try {
    const morningPrompt = `請作為頂級外資投行首席策略師，為投資人撰寫今日【全球總經與跨資產配置 · 晨會早報】。
請結合當前最新市場數據與隔夜美股美債表現，架構如下：
1. ☀️ 【今日核心結論（一句話切中今日盤前定價核心）】
2. 🇺🇸 【隔夜美股與美債核心動態（美股四大指數、10Y殖利率走勢）】
3. 🇹🇼 【今日台股開盤指引與匯率觀察（台積電、AI供應鏈、台幣匯率）】
4. 💡 【跨資產配置策略焦點（股、債、原物料）】
請務必精煉、數據具體、語氣客觀權威，適合手機 1 分鐘快速閱讀。`;

    // 1. 呼叫 Gemini AI 生成今日早報
    const rawReport = await callGemini(morningPrompt);

    const broadcastMessage = `☀️ 宏觀全球智庫 · 首席財經晨訊
📅 日期：${dateStr} (08:30 盤前發布)
━━━━━━━━━━━━━━━━━━━━

${rawReport || '今日全球總經數據同步中，請點擊下方連結查看最新實時行情。'}

━━━━━━━━━━━━━━━━━━━━
📱 點此查看【手機即時圖表完整版】：
${SHORT_WEB_URL}`;

    const safeMessage = broadcastMessage.length > 4900 
      ? broadcastMessage.substring(0, 4900) + "\n\n⋯（點上方連結看完整版）" 
      : broadcastMessage;

    // 2. 呼叫 LINE 官方 Broadcast API 推播給所有好友
    const lineRes = await fetch("https://api.line.me/v2/bot/message/broadcast", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lineToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messages: [
          {
            type: "text",
            text: safeMessage
          }
        ]
      })
    });

    const lineResult = await lineRes.json().catch(() => ({}));
    console.log("LINE Broadcast Response:", lineRes.status, lineResult);

    return res.status(200).json({
      status: "success",
      timestamp: timeStr,
      lineHttpStatus: lineRes.status,
      messageLength: safeMessage.length,
      sampleText: safeMessage.substring(0, 200) + "..."
    });
  } catch (error) {
    console.error("Morning broadcast error:", error);
    return res.status(500).json({
      status: "error",
      error: error.message
    });
  }
};
