const { callGemini, fetchLiveMarketAndHistory, FALLBACK_LINE_TOKEN } = require('./line-webhook-helper');

const SHORT_WEB_URL = process.env.BASE_URL || "https://eco-line-assistant.onrender.com";

// 每日早報/週末週報專屬生成與推播端點
module.exports = async (req, res) => {
  const lineToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || FALLBACK_LINE_TOKEN;
  
  const now = new Date();
  const utc8 = new Date(now.getTime() + 8 * 3600 * 1000);
  const dateStr = utc8.toISOString().substring(0, 10);
  const timeStr = utc8.toISOString().replace('T', ' ').substring(0, 19);
  const dayOfWeek = utc8.getDay(); // 0=週日, 6=週六, 1-5=週一至週五

  const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
  const reportTypeTitle = isWeekend 
    ? (dayOfWeek === 6 ? '週末總經週報 · 當週全球市場總結' : '下週總經展望 · 重磅事件前瞻')
    : '晨會總經早報 · 今日開盤指引';

  console.log(`[${timeStr}] 正在生成【${reportTypeTitle}】並發動 LINE 廣播推播...`);

  try {
    let promptTheme = '';
    if (dayOfWeek === 6) {
      // 週六：當週全球市場總結週報
      promptTheme = `請作為林勝穩身邊的【高情商幹練秘書 · 隨身總經智囊】，以親切、專業、條理分明的口吻撰寫【週末全球總經與跨資產配置 · 當週總結研報】。
請以「勝穩週末愉快！為您梳理本週全球宏觀脈絡與資產收盤表現：」開場，架構如下：
1. 🏆 【本週核心主線（一句話點明全週股債匯定價核心）】
2. 📊 【全球主要資產全週表現（美股四大指數、台股加權、10Y/2Y美債利差、美元指數）】
3. 🔄 【總經因果與大宗原料（Fed降息路徑、通膨期別進展、鐵礦砂與動力煤現貨走勢）】
4. 💡 【下週持倉與風險防禦建議】
請條理清晰、數據精確標註期別、語氣專業幹練且溫暖，適配手機閱讀。`;
    } else if (dayOfWeek === 0) {
      // 週日：下週重磅前瞻週報
      promptTheme = `請作為林勝穩身邊的【高情商幹練秘書 · 隨身總經智囊】，以親切、專業、條理分明的口吻撰寫【下週全球總經與重大財經事件 · 前瞻週報】。
請以「勝穩週日好！為您前瞻下週全球重大央行事件與關鍵數據觀察：」開場，架構如下：
1. 🔮 【下週宏觀總體核心展望】
2. 🗓️ 【下週重磅事件時間表（FOMC會議、非農/CPI公佈日、台灣出口貿易數據）】
3. 📈 【股債匯與原物料潛在波動臨界線】
4. 💡 【實體產業與避險因應提醒】
請條理清晰、數據精確標註期別、語氣專業幹練且溫暖，適配手機閱讀。`;
    } else {
      // 週一至週五：平日開盤晨會早報
      promptTheme = `請作為林勝穩身邊的【高情商幹練秘書 · 隨身總經智囊】，以親切、專業、條理分明的口吻撰寫今日【全球總經與跨資產配置 · 晨會早報】。
請以「勝穩早安！為您整理今日盤前最關鍵的全球宏觀與產業鏈情報：」開頭，架構如下：
1. ☀️ 【今日核心結論（一句話切中今日盤前定價核心）】
2. 🇺🇸 【隔夜美股與美債動態（美股四大指數漲跌、10Y美債利率與10Y-2Y利差）】
3. 🇹🇼 【今日台股開盤指引與匯率觀察（台積電、AI供應鏈、台幣匯率）】
4. 🏭 【大宗原料與實體成本觀察（鐵礦砂、動力煤現貨與高爐成本線）】
5. 💡 【秘書今日重點提醒】
請務必條列清晰、數據具體標註 2026 最新期別、語氣幹練貼心，適配手機 1 分鐘快速掌握。`;
    }

    // 1. 呼叫 Gemini AI 生成今日早報/週報
    const rawReport = await callGemini(promptTheme);

    let headlinesBlock = '';
    try {
      const { getLatestMacroNews } = require('./news');
      const topNews = await getLatestMacroNews(3);
      if (topNews && topNews.length > 0) {
        headlinesBlock = `📰 【隔夜美歐央行與總經重大頭條】\n` + topNews.map((n, i) => `${i + 1}. ${n.icon} ${n.title} (${n.source})`).join('\n') + '\n\n';
      }
    } catch (e) {}

    const broadcastMessage = `🌸【宏觀總經秘書 · ${reportTypeTitle}】
📅 數據校驗時間：${timeStr.substring(0, 16)} (UTC+8) ｜ 官方期別：2026最新期
━━━━━━━━━━━━━━━━━━━━

${headlinesBlock}${rawReport || '今日全球總經數據同步中，請點擊下方連結查看最新實時行情。'}

━━━━━━━━━━━━━━━━━━━━
📱 點此開啟【手機圖表門戶】：
${SHORT_WEB_URL}`;

    const chars = Array.from(broadcastMessage);
    const safeMessage = chars.length > 4800 
      ? chars.slice(0, 4800).join('') + "\n\n⋯（點上方連結看完整版）" 
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
      reportType: reportTypeTitle,
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
