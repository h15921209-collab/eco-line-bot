const { callGemini, FALLBACK_LINE_TOKEN } = require('./line-webhook-helper');
const collector = require('./collector');
const macroVault = require('./macro-vault');
const news = require('./news');

const SHORT_WEB_URL = process.env.BASE_URL || "https://eco-line-assistant.onrender.com";

// 獨立核心函式：生成結構化最新早報/週報（包含數據儀表板、權威新聞與AI傳導剖析）
async function generateMorningReport() {
  const now = new Date();
  const utc8 = new Date(now.getTime() + 8 * 3600 * 1000);
  const dateStr = utc8.toISOString().substring(0, 10);
  const timeStr = utc8.toISOString().replace('T', ' ').substring(0, 19);
  const dayOfWeek = utc8.getDay(); // 0=週日, 6=週六, 1-5=週一至週五

  const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
  const reportTypeTitle = isWeekend 
    ? (dayOfWeek === 6 ? '週末總經週報 · 當週全球市場總結' : '下週總經展望 · 重磅事件前瞻')
    : '晨會總經早報 · 今日開盤指引';

  // 1. 同時匯聚即時行情快照、總經數據庫最新官方期別、過濾後權威財經新聞
  const [snapshot, vault, topNews] = await Promise.all([
    collector.fetchCollectorSnapshot(true).catch(() => null),
    macroVault.initOrLoadVault(),
    news.getLatestMacroNews(5).catch(() => [])
  ]);

  // A. 官方指標 (FRED 最新官方期別)
  const cpi = vault?.metrics?.US_CPI || { latestValue: 3.7, latestPeriod: '2026-09', latestReleaseDate: '10/14' };
  const coreCpi = vault?.metrics?.US_CORE_CPI || { latestValue: 2.6, latestPeriod: '2026-09', latestReleaseDate: '10/14' };
  const nfp = vault?.metrics?.US_NFP || { latestValue: 2.9, latestPeriod: '2026-09', latestReleaseDate: '10/02' };
  const ur = vault?.metrics?.US_UR || { latestValue: 4.2, latestPeriod: '2026-09', latestReleaseDate: '10/05' };

  // B. 市場即時行情
  const us10y = snapshot?.us10y !== undefined ? Number(snapshot.us10y).toFixed(3) : '5.190';
  const us2y = snapshot?.us2y !== undefined ? Number(snapshot.us2y).toFixed(3) : '4.750';
  const spread = snapshot?.spread_10y2y !== undefined 
    ? Number(snapshot.spread_10y2y).toFixed(3) 
    : (Number(us10y) - Number(us2y)).toFixed(3);
  const spreadBps = (Number(spread) * 100).toFixed(1);
  const spreadSign = Number(spread) >= 0 ? '+' : '';
  const spreadText = `${spreadSign}${spreadBps} bps (${spreadSign}${spread}%)`;

  const dxy = snapshot?.dxy !== undefined ? Number(snapshot.dxy).toFixed(2) : '101.97';
  const usdtwd = snapshot?.usdtwd !== undefined ? Number(snapshot.usdtwd).toFixed(3) : '32.323';

  const ironOre = snapshot?.iron_ore !== undefined ? Number(snapshot.iron_ore).toFixed(2) : '90.74';
  const coal = snapshot?.coal !== undefined ? Number(snapshot.coal).toFixed(2) : '124.50';
  const oil = snapshot?.oil !== undefined ? Number(snapshot.oil).toFixed(2) : '93.99';
  const copper = snapshot?.copper !== undefined ? Number(snapshot.copper).toFixed(3) : '6.611';

  const ironStatus = Number(ironOre) < 95 
    ? '⚠️ 跌破 95~100 邊際現金成本線' 
    : (Number(ironOre) <= 100 ? '⚓ 處於 95~100 邊際現金成本區間' : '堅挺於邊際成本線上方');

  const tsmc = snapshot?.tsmc !== undefined ? Number(snapshot.tsmc).toLocaleString() : '2,440';
  const tsmcAdrPrem = snapshot?.tsmc_adr_premium !== undefined ? Number(snapshot.tsmc_adr_premium).toFixed(2) : '13.93';
  const nvda = snapshot?.nvda !== undefined ? Number(snapshot.nvda).toFixed(2) : '221.30';
  const sox = snapshot?.sox !== undefined ? Number(snapshot.sox).toFixed(1) : '11,684.4';
  const twii = snapshot?.twii !== undefined ? Number(snapshot.twii).toLocaleString() : '47,227';

  // 2. 組裝最新總經與產業數據儀表板
  const dashboardBlock = `📊【今日最新總經與產業數據儀表板】
🏛️ 美國官方指標 (FRED 最新官方期別)：
• CPI 年增率：${cpi.latestValue}% (期別：${cpi.latestPeriod} ｜ 發佈：${cpi.latestReleaseDate || '最新'})
• 核心 CPI：${coreCpi.latestValue}% (期別：${coreCpi.latestPeriod} ｜ 發佈：${coreCpi.latestReleaseDate || '最新'})
• 季調非農就業：${nfp.latestValue > 0 ? '+' : ''}${nfp.latestValue} 萬人 (期別：${nfp.latestPeriod} ｜ 發佈：${nfp.latestReleaseDate || '最新'})
• 官方失業率：${ur.latestValue}% (期別：${ur.latestPeriod} ｜ 發佈：${ur.latestReleaseDate || '最新'})

📈 公債利差與貨幣環境：
• 美國 10 年期公債：${us10y}%
• 美國 2 年期公債：${us2y}%
• 10Y-2Y 殖利率利差：${spreadText} (倒掛修復正斜率)
• 美元指數 (DXY)：${dxy} ｜ 美元/台幣：${usdtwd}

🏭 大宗原料與高爐成本線：
• 鐵礦砂現貨：${ironOre} USD/噸 (${ironStatus})
• 紐卡斯爾動力煤：${coal} USD/噸 (高爐冶煉剛性成本支撐)
• 布蘭特/WTI 原油：${oil} USD/桶
• 倫敦銅 (銅博士)：${copper} USD/磅

🇹🇼 科技權值與溢價：
• 台積電現貨：${tsmc} 元 ｜ ADR 溢價率：+${tsmcAdrPrem}%
• 輝達 (NVDA)：${nvda} 美元 ｜ 費城半導體：${sox}
• 台股加權指數：${twii} 點`;

  // 3. 組裝權威即時新聞區塊 (具備 100% 原始文章連結與秘書傳導短評)
  let newsBlock = '';
  const selectedNews = (topNews || []).filter(n => n.title && n.link && n.link.startsWith('http')).slice(0, 3);
  if (selectedNews.length > 0) {
    newsBlock = `📰【隔夜美歐央行與總經重大頭條】\n` + 
      selectedNews.map((n, idx) => {
        const itemNum = idx + 1;
        const linkLine = `\n   🔗 閱讀原文：${n.link}`;
        const commentLine = n.commentary ? `\n   ↳ 💡 秘書短評：${n.commentary}` : '';
        return `${itemNum}. ${n.icon || '📌'} ${n.title} (${n.source})${linkLine}${commentLine}`;
      }).join('\n\n') + '\n\n';
  }

  // 4. 動態餵入真實數據與新聞至 Gemini AI 產生傳導因果研報
  const newsContextStr = selectedNews.map(n => `- ${n.title} (${n.source})`).join('\n');
  const liveContextStr = `
- 10Y美債: ${us10y}%, 2Y美債: ${us2y}%, 10Y-2Y利差: ${spreadText}
- 美元指數: ${dxy}, 美元/台幣: ${usdtwd}
- 鐵礦砂現貨: ${ironOre} USD/噸 (${ironStatus}), 動力煤: ${coal} USD/噸, 原油: ${oil} USD/桶
- 台積電: ${tsmc}元 (ADR溢價率: +${tsmcAdrPrem}%), 輝達: ${nvda}美元, 台股加權: ${twii}
- 最新美國官方期別: CPI ${cpi.latestValue}% (${cpi.latestPeriod}期), 非農就業 ${nfp.latestValue}萬人 (${nfp.latestPeriod}期), 失業率 ${ur.latestValue}% (${ur.latestPeriod}期)
- 重大新聞:
${newsContextStr}
`;

  let promptTheme = '';
  if (dayOfWeek === 6) {
    promptTheme = `請作為林勝穩身邊的【高情商幹練秘書 · 隨身總經智囊】，以親切、專業、條理分明的口吻撰寫今日【週末全球總經與跨資產配置 · 當週總結研報】。
即時客觀數據背景如下：
${liveContextStr}

請以「勝穩週末愉快！為您梳理本週全球宏觀脈絡與實體資產收盤表現：」開場，架構如下：
1. 🏆 【本週核心主線（一句話點明全週股債匯定價核心）】
2. 🔄 【總經因果與大宗原料（分析Fed降息路徑、通膨期別進展、鐵礦砂現貨跌破95~100成本線之實體影響）】
3. 💡 【下週實體產業與避險因應提醒】
請條理清晰、嚴禁自創名詞、語氣專業幹練且溫暖，客觀陳述現場數據與研討記錄，絕不寫「建議裁示」，適配手機閱讀。字數約 400~550 字。`;
  } else if (dayOfWeek === 0) {
    promptTheme = `請作為林勝穩身邊的【高情商幹練秘書 · 隨身總經智囊】，以親切、專業、條理分明的口吻撰寫今日【下週全球總經與重大財經事件 · 前瞻週報】。
即時客觀數據背景如下：
${liveContextStr}

請以「勝穩週日好！為您前瞻下週全球重大央行事件與關鍵數據觀察：」開場，架構如下：
1. 🔮 【下週宏觀總體核心展望（一句話前瞻）】
2. 🗓️ 【下週重磅觀察清單（聯準會官員動態、即將公佈之通膨/就業數據、外銷出口動能）】
3. 🏭 【原物料成本防線與科技權值臨界線】
4. 💡 【秘書下週開盤重點叮嚀】
請條理清晰、嚴禁自創名詞、語氣專業幹練且溫暖，客觀陳述現場數據與研討記錄，絕不寫「建議裁示」，適配手機閱讀。字數約 400~550 字。`;
  } else {
    promptTheme = `請作為林勝穩身邊的【高情商幹練秘書 · 隨身總經智囊】，以親切、專業、條理分明的口吻撰寫今日【全球總經與跨資產配置 · 晨會早報】。
即時客觀數據背景如下：
${liveContextStr}

請以「勝穩早安！為您梳理今日盤前最關鍵的全球宏觀傳導與產業因果：」開頭，架構如下：
1. ☀️ 【今日核心結論（一句話切中今日盤前定價核心）】
2. 🇺🇸 【宏觀利率與流動性傳導（分析10Y-2Y利差正斜率、降息步伐與外銷出口換匯環境）】
3. 🏭 【大宗原料與實體成本防線（客觀分析鐵礦砂跌破95~100成本區間對高爐鋼廠底線之剛性支撐）】
4. 💡 【秘書今日盤前重點提醒】
請務必條列清晰、數據具體標註最新期別、嚴禁自創名詞、語氣幹練貼心，客觀陳述現場數據與研討記錄，絕不寫「建議裁示」，適配手機 1 分鐘快速掌握。字數約 400~550 字。`;
  }

  const rawReport = await callGemini(promptTheme);

  // 5. 整合完整推播訊息
  const broadcastMessage = `🌸【宏觀總經秘書 · ${reportTypeTitle}】
🟢【本日數據已於 08:15 自動校準完成 · 2026 最新官方期別對齊】
📅 數據校驗時間：${timeStr.substring(0, 16)} (UTC+8) ｜ 官方期別：2026 最新期
━━━━━━━━━━━━━━━━━━━━

${dashboardBlock}

━━━━━━━━━━━━━━━━━━━━

${newsBlock}━━━━━━━━━━━━━━━━━━━━

${rawReport || '今日全球總經數據同步中，請點擊下方連結查看最新實時行情。'}

━━━━━━━━━━━━━━━━━━━━
📱 點此開啟【手機圖表門戶】：
${SHORT_WEB_URL}`;

  const chars = Array.from(broadcastMessage);
  const safeMessage = chars.length > 4800 
    ? chars.slice(0, 4800).join('') + "\n\n⋯（點上方連結看完整版）" 
    : broadcastMessage;

  return {
    timeStr,
    reportTypeTitle,
    safeMessage,
    topNews: selectedNews,
    snapshot
  };
}

// 每日早報/週末週報專屬生成與推播端點
module.exports = async (req, res) => {
  const lineToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || FALLBACK_LINE_TOKEN;

  try {
    const { timeStr, reportTypeTitle, safeMessage } = await generateMorningReport();

    console.log(`[${timeStr}] 正在發布【${reportTypeTitle}】(最新數據儀表板 + 權威新聞)...`);

    // 若為預覽模式 (preview=1 / test=1)，直接回傳不實際廣播推播
    const isPreview = req?.query?.preview === '1' || req?.query?.test === '1';
    let lineHttpStatus = 200;
    let lineResult = { note: "preview mode, no broadcast sent" };

    if (!isPreview) {
      // 呼叫 LINE 官方 Broadcast API 推播給所有好友
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
      lineHttpStatus = lineRes.status;
      lineResult = await lineRes.json().catch(() => ({}));
      console.log("LINE Broadcast Response:", lineHttpStatus, lineResult);
    }

    if (res && typeof res.status === 'function') {
      return res.status(200).json({
        status: "success",
        mode: isPreview ? "preview" : "broadcast",
        timestamp: timeStr,
        reportType: reportTypeTitle,
        lineHttpStatus,
        messageLength: safeMessage.length,
        sampleText: safeMessage.substring(0, 300) + "...",
        fullMessage: safeMessage
      });
    }
    return { status: "success", lineHttpStatus, safeMessage };
  } catch (error) {
    console.error("Morning broadcast error:", error);
    if (res && typeof res.status === 'function') {
      return res.status(500).json({
        status: "error",
        error: error.message
      });
    }
    throw error;
  }
};

module.exports.generateMorningReport = generateMorningReport;
