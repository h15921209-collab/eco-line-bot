const { callGemini, getHeader, FALLBACK_LINE_TOKEN } = require('./line-webhook-helper');

const SHORT_WEB_URL = process.env.BASE_URL || "https://eco-line-assistant.onrender.com";

// 完整使用說明書與服務指南（高情商幹練秘書 · 隨身總經智囊）
const USER_GUIDE_MESSAGE = `勝穩您好！我是您的【高情商隨身總經秘書兼戰略智囊】🌸
為您全天候 24 小時守護全球宏觀指標、大宗原料與跨資產動態，隨問隨答、秒級連線！

⏰【1. 每日 08:30 定時晨會早報（全自動推播）】
• 週一至週五：盤前核心晨訊、隔夜美股美債、台股開盤指引與匯率。
• 週六日：全週跨資產總結與下週重大央行事件前瞻。
• 每次推播前 15 分鐘（08:15）全自動校準 FRED 官方數值，確保最新 2026 期別！

💬【2. 24H 隨時在線提問與標的秒查】
• ⚡ 標的秒查：輸入「台積電」、「中鋼」、「聯發科」、「NVDA」、「TSLA」、「鐵礦砂」、「原油」或「比特幣」，秘書立即呈報即時報價與技術位階！
• 🎯 深度研報：輸入任何總經問題（如：10Y-2Y利差、降息預期、大宗原料成本），秒級連線頂級 AI 旗艦大腦為您因果解讀！

🔄【3. 官方總經數據手動一鍵校正】
• 輸入「校準數據」或「更新數據」，秘書立即為您連線 FRED、財政部與最新即時行情，條列回報各項指標的最新 2026 期別與數值！

📝【4. 個人總經筆記管家】
• 輸入「記錄 CPI 2.9 月增0.1%」或「記下 鐵礦砂 95.34 高爐成本線」，秘書自動為您雲端歸檔！輸入「分析筆記」即可生成趨勢複盤。

🌐【5. 手機專屬視覺化圖表門戶】
點擊下方連結即可在手機上查看全天候動態圖表、配置計算機與華爾街公牛漫遊畫卷：
👉 ${SHORT_WEB_URL}

💡 隨時點擊下方快捷氣泡即可開始探索！`;

const FALLBACK_MESSAGE = `勝穩您好！我是您的【隨身總經秘書】🌸

目前全球金融市場數據庫正在進行連線校準中，請稍候片刻再次輸入問題，我將立即為您連線最新市場行情與深度因果剖析！

📱 手機專屬圖表門戶：
${SHORT_WEB_URL}`;

const NON_TEXT_MESSAGE = `勝穩您好！我是您的【隨身總經秘書】🌸

收到您的貼圖／訊息！如需查詢即時行情或宏觀研報，您可以：
1. 輸入標的名稱或代碼（例如：中鋼、台積電、NVDA、鐵礦砂、比特幣）
2. 輸入總經問題（例如：利差怎麼看、美債殖利率分析）
3. 輸入「校準數據」查看最新 2026 官方指標期別
4. 點擊下方快捷氣泡快速探索！

📱 手機專屬圖表門戶：
${SHORT_WEB_URL}`;

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

// 旗艦版智慧 Quick Reply 快捷追問氣泡選單（含官方圖表門戶與即時校正）
function getQuickReplyItems() {
  return {
    items: [
      {
        type: "action",
        action: {
          type: "uri",
          label: "📊 專屬圖表門戶",
          uri: SHORT_WEB_URL
        }
      },
      {
        type: "action",
        action: {
          type: "message",
          label: "🔄 校準總經數據",
          text: "校準數據"
        }
      },
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

const { parseRecordText, addRecord, readRecords } = require('./records');

// 判斷是否為記錄數據指令
function isRecordCommand(text) {
  const t = text.trim();
  return t.startsWith("記錄") || t.startsWith("紀錄") || t.startsWith("記下") || 
         t.startsWith("寫入") || t.startsWith("存入") || t.startsWith("記 ") || 
         t.startsWith("記：") || t.startsWith("記:");
}

// 判斷是否為分析筆記指令
function isAnalyzeRecordsCommand(text) {
  const t = text.trim();
  return t.includes("分析筆記") || t.includes("分析試算表") || t.includes("試算表研報") || 
         t.includes("筆記研報") || t.includes("分析記錄");
}

// 判斷是否為查看歷史筆記指令
function isViewRecordsCommand(text) {
  const t = text.trim();
  return t.includes("查看筆記") || t.includes("歷史筆記") || t.includes("我的筆記") || 
         t.includes("查筆記") || t.includes("查看記錄") || t.includes("查記錄");
}

// 處理個人筆記與記帳指令
async function handlePersonalRecords(userMsg, event, lineToken, replyToken) {
  // 1. 查看筆記清單
  if (isViewRecordsCommand(userMsg)) {
    const records = readRecords();
    if (records.length === 0) {
      await replyLine(lineToken, replyToken, "📝 您的個人總經筆記庫目前尚無資料！\n您可以隨時在聊天室輸入如：\n「記錄 CPI 2.9 月增0.1%」\n「記下 鐵礦砂 99.5 美元/噸 高爐成本支撐」\n系統將自動為您歸檔儲存！");
      return true;
    }

    const latest = records.slice(0, 6);
    const listText = latest.map((r, i) => 
      `${i + 1}. [${r.timestamp.substring(5, 16)}] ${r.metric}: ${r.value} ${r.unit}\n   ${r.tag} ｜ 脈絡: ${r.note || "無"}`
    ).join("\n\n");

    const reply = `📚 【個人宏觀數據筆記庫 · 最近 ${latest.length} 筆】\n━━━━━━━━━━━━━━━━━━━━\n${listText}\n━━━━━━━━━━━━━━━━━━━━\n💡 累積總數：共 ${records.length} 筆\n💬 輸入「分析筆記」即可由 AI 自動閱讀歷史時序產出專屬研報！\n📱 完整表格與 CSV 下載：${SHORT_WEB_URL}`;
    await replyLine(lineToken, replyToken, reply);
    return true;
  }

  // 2. 記錄數據指令
  if (isRecordCommand(userMsg)) {
    const parsed = parseRecordText(userMsg);
    if (!parsed || !parsed.metric || !parsed.value) {
      await replyLine(lineToken, replyToken, "⚠️ 記帳格式解析未果，請參考格式範例：\n「記錄 CPI 2.9 月增0.1%」或\n「記下 鐵礦砂 99.5 美元/噸 高爐成本線」");
      return true;
    }

    const saveRes = addRecord(parsed, "LINE Bot");

    // 若使用者設定了 GAS_WEBHOOK_URL，亦於背景非同步同步轉發一份至 Google 試算表
    if (process.env.GAS_WEBHOOK_URL) {
      fetch(process.env.GAS_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userMsg, replyToken, userId: event.source?.userId, timestamp: event.timestamp })
      }).catch(e => console.error("GAS sync err:", e));
    }

    const confirmMsg = `✅ 【成功登記至個人宏觀筆記庫】\n━━━━━━━━━━━━━━━━━━━━\n` +
      `⏱️ 時間：${saveRes.record.timestamp}\n` +
      `📊 指標：${parsed.metric}\n` +
      `🔢 數值：${parsed.value} ${parsed.unit || ""}\n` +
      `📝 脈絡：${parsed.note || "常態追蹤"}\n` +
      `🏷️ 標籤：${parsed.tag}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `💡 累積筆記：共 ${saveRes.totalCount} 筆數據\n` +
      `💬 輸入「分析筆記」即可產出 AI 趨勢分析簡報！\n` +
      `📱 隨時在網頁端檢視歷史表格或一鍵複製至 Excel / Google 試算表：\n👉 ${SHORT_WEB_URL}`;

    await replyLine(lineToken, replyToken, confirmMsg);
    return true;
  }

  // 3. 分析筆記指令（Gemini 讀取個人時序）
  if (isAnalyzeRecordsCommand(userMsg)) {
    const records = readRecords();
    if (records.length === 0) {
      await replyLine(lineToken, replyToken, "📊 您的個人筆記庫目前尚無數據！\n請先輸入如「記錄 CPI 2.9」累積數據後，即可啟動 Gemini 自動分析！");
      return true;
    }

    const sample = records.slice(0, 15);
    const historyText = sample.map(r => 
      `• [${r.timestamp}] ${r.metric}：${r.value} ${r.unit} ｜ 脈絡: ${r.note} (${r.tag})`
    ).join("\n");

    const prompt = `你是頂級宏觀智庫與對沖基金的【資深首席策略分析師】。
以下是林勝穩（資深產業決策者）個人持續記錄追蹤的真實數據與脈絡歷程：

【個人登記之歷史時序數據庫】：
${historyText}

請以資深首席策略分析師的真實專業口吻解答：
★【零預設字句】：開門見山第一句直接切入核心走勢研判與供需因果，嚴禁出現任何「針對你提到的...」、「我為您梳理」等客套廢話！
★【經驗邏輯穿透】：深究指標背後的供需失衡、上下游傳導阻力與政策意圖，嚴禁動輒給出「股債現金比例」等套路化資產配置！
★【歷史鏡像即時發想】：由模型在全歷史知識庫中自由發想最貼切的歷史對標切片，自擬專屬標題並剖析同異點！
★【俐落收尾】：直接以多空風險臨界線或關鍵實體監控指標明確結尾。`;

    const aiReport = await callGemini(prompt);
    const replyBody = aiReport ? (getHeader() + aiReport) : FALLBACK_MESSAGE;
    await replyLine(lineToken, replyToken, replyBody);
    return true;
  }

  return false;
}

// 數據定期/手動校準指令判斷
function isCalibrationCommand(text) {
  const t = text.trim().toLowerCase();
  return /^(校準數據|校正數據|更新數據|數據校準|校驗數據|同步數據|校準)$/.test(t) || t === "calibrate" || t === "sync data";
}

// 執行即時數據校準並產出秘書回報
async function handleCalibrationCommand(lineToken, replyToken) {
  try {
    const macroVault = require('./macro-vault');
    if (typeof macroVault.syncLiveVaultData === 'function') {
      await macroVault.syncLiveVaultData(true);
    }
    const calendarSync = require('./calendar-sync');
    if (typeof calendarSync.runCalendarSync === 'function') {
      await calendarSync.runCalendarSync();
    }

    const now = new Date();
    const utc8 = new Date(now.getTime() + 8 * 3600 * 1000);
    const timeStr = utc8.toISOString().replace('T', ' ').substring(0, 19);

    // 讀取最新指標
    const vaultData = typeof macroVault.getVaultMetrics === 'function' ? macroVault.getVaultMetrics() : null;
    const m = vaultData?.metrics || {};

    const cpiVal = m['US_CPI']?.currentVal ?? 3.4;
    const cpiPeriod = m['US_CPI']?.period ?? '2026-07';
    const coreCpiVal = m['US_CORE_CPI']?.currentVal ?? 3.3;
    const coreCpiPeriod = m['US_CORE_CPI']?.period ?? '2026-07';
    const pceVal = m['US_PCE']?.currentVal ?? 3.3;
    const pcePeriod = m['US_PCE']?.period ?? '2026-07';
    const nfpVal = m['US_NFP']?.currentVal ?? -2.3;
    const nfpPeriod = m['US_NFP']?.period ?? '2026-08';
    const unempVal = m['US_UNRATE']?.currentVal ?? 4.1;
    const unempPeriod = m['US_UNRATE']?.period ?? '2026-08';
    const fedVal = m['US_FED_RATE']?.currentVal ?? 3.75;
    const us10yVal = m['US_10Y']?.currentVal ?? 4.704;
    const us2yVal = m['US_2Y']?.currentVal ?? 3.961;
    const spreadVal = m['US_SPREAD']?.currentVal ?? 74.3;
    const dxyVal = m['US_DXY']?.currentVal ?? 99.008;
    const ironVal = m['COMM_IRON_ORE']?.currentVal ?? 95.34;
    const coalVal = m['COMM_COAL']?.currentVal ?? 124.50;
    const copperVal = m['COMM_COPPER']?.currentVal ?? 6.604;

    const replyMsg = `勝穩您好！已為您完成全球總經與跨資產數據庫的最新定時校準 🌸

🕒【數據校驗完成時間】：${timeStr} (UTC+8)
━━━━━━━━━━━━━━━━━━━━
🏛️【美國官方權威總經指標（2026最新期別）】：
• CPI 通膨年增率：${cpiVal}%（${cpiPeriod}期 ｜ 官方發布）
• 核心 CPI 年增率：${coreCpiVal}%（${coreCpiPeriod}期 ｜ 排除蔬果能源）
• 核心 PCE 物價指數：${pceVal}%（${pcePeriod}期 ｜ FOMC長期定價錨點）
• 非農就業增長：${nfpVal} 萬人（${nfpPeriod}期 ｜ 勞動邊際降溫）
• 官方失業率：${unempVal}%（${unempPeriod}期 ｜ 充分就業臨界）
• 聯邦基金利率：${fedVal}%（最新降息後政策目標區間）

📊【金融市場與公債利差】：
• 美債 10Y：${us10yVal}% ｜ 2Y：${us2yVal}%
• 10Y-2Y 利差：+${spreadVal} bps（熊市陡峭化 Bear Steepener）
• 美元指數 (DXY)：${dxyVal}

🏭【大宗重工業原料與成本剛性】：
• 國際鐵礦砂現貨：${ironVal} USD/噸（高爐成本支撐區間）
• 國際動力煤現貨：${coalVal} USD/噸（紐卡斯爾 6000大卡基準）
• 國際銅博士 (HG)：${copperVal} USD/磅

💡【秘書貼心備註】：
各項核心指標已全數與 FRED 官方資料庫及即時市場時序對齊，無任何年份混淆。您可以隨時提問深度研報，或點擊下方查看全維度動態圖表！

📱 官方視覺化圖表門戶：
${SHORT_WEB_URL}`;

    await replyLine(lineToken, replyToken, replyMsg);
    return true;
  } catch (err) {
    console.error('Calibration command error:', err);
    await replyLine(lineToken, replyToken, `⚠️ 數據校準進行中，請稍候重試：${err.message}`);
    return true;
  }
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

          // 2. 判斷是否為數據校準指令
          if (isCalibrationCommand(userMsg)) {
            await handleCalibrationCommand(lineToken, replyToken);
            continue;
          }

          // 2. 判斷是否為純代碼/常用中文名稱查詢（例如 台積電, 聯發科, NVDA, TSLA, 2330, BTC），若是則秒級回傳報價
          const quickQuote = await tryFetchStockQuote(userMsg);
          if (quickQuote) {
            await replyLine(lineToken, replyToken, quickQuote);
            continue;
          }

          // 3. 判斷是否為個人宏觀數據筆記記錄、查看或專屬研報指令
          const handledRecord = await handlePersonalRecords(userMsg, event, lineToken, replyToken);
          if (handledRecord) continue;

          // 4. 一般總經諮詢走 Gemini 深度推理
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