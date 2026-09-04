const { callGemini, fetchLiveMarketAndHistory, FALLBACK_LINE_TOKEN } = require('./line-webhook-helper');

const SHORT_WEB_URL = process.env.BASE_URL || "https://eco-line-bot.vercel.app";

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
    : '首席財經晨訊 · 今日開盤指引';

  console.log(`[${timeStr}] 正在生成【${reportTypeTitle}】並發動 LINE 廣播推播...`);

  try {
    let promptTheme = '';
    if (dayOfWeek === 6) {
      // 週六：當週全球市場總結週報
      promptTheme = `請作為頂級外資投行首席策略師，為投資人撰寫【週末全球總經與跨資產配置 · 當週總結研報】。
請結合當前最新市場數據與全週收盤表現，架構如下：
1. 🏆 【當週核心結論（一句話總結全週股債匯定價核心）】
2. 📊 【當週全球主要資產表現（美股四大指數、台股加權、10Y美債殖利率、美元指數週累積變動）】
3. 🔄 【宏觀核心驅動因素（Fed政策預期、通膨與就業數據傳導）】
4. 💡 【跨資產配置觀點（下週持倉與風險控管建議）】
請務必精煉、數據具體（引用近5日/近月累積幅度）、語氣客觀權威。`;
    } else if (dayOfWeek === 0) {
      // 週日：下週重磅前瞻週報
      promptTheme = `請作為頂級外資投行首席策略師，為投資人撰寫【下週全球總經與重大財經事件 · 展望前瞻】。
請結合最新宏觀數據，架構如下：
1. 🔮 【下週宏觀總體核心展望】
2. 🗓️ 【下週全球關鍵觀察焦點（Fed官員談話、美國重要指標、台灣出口/法說動態）】
3. 📈 【股債匯跨市場潛在波動點與定價風險】
4. 💡 【投資人配置因應戰略】
請務必精煉、數據具體、語氣客觀權威。`;
    } else {
      // 週一至週五：平日開盤晨會早報
      promptTheme = `請作為頂級外資投行首席策略師，為投資人撰寫今日【全球總經與跨資產配置 · 晨會早報】。
請結合當前最新市場數據與隔夜美股美債表現，架構如下：
1. ☀️ 【今日核心結論（一句話切中今日盤前定價核心）】
2. 🇺🇸 【隔夜美股與美債核心動態（美股四大指數、10Y殖利率走勢）】
3. 🇹🇼 【今日台股開盤指引與匯率觀察（台積電、AI供應鏈、台幣匯率）】
4. 💡 【跨資產配置策略焦點（股、債、原物料）】
請務必精煉、數據具體、語氣客觀權威，適合手機 1 分鐘快速閱讀。`;
    }

    // 1. 呼叫 Gemini AI 生成今日早報/週報
    const rawReport = await callGemini(promptTheme);

    const broadcastMessage = `☀️ 宏觀全球智庫 · ${reportTypeTitle}
📅 發布時間：${timeStr.substring(0, 16)} (盤前晨訊)
━━━━━━━━━━━━━━━━━━━━

${rawReport || '今日全球總經數據同步中，請點擊下方連結查看最新實時行情。'}

━━━━━━━━━━━━━━━━━━━━
📱 點此查看【手機即時圖表完整版】：
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
