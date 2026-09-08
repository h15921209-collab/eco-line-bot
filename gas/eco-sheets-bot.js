/**
 * ==============================================================================
 * 宏觀全球智庫 · 個人專屬 Google 試算表 ＋ Gemini 總經數據機器人 (GAS 端)
 * 專為：林勝穩 (CSC 中鋼 F42) 個人 Google 帳號打造
 * 
 * 功能亮點：
 * 1. 【自動記帳入表】：LINE 輸入「記錄 CPI 2.9 月增0.1%」自動解析填入試算表
 * 2. 【智慧分類標籤】：自動標註通膨、鋼鐵原物料、科技半導體或利率公債
 * 3. 【Gemini 趨勢研報】：輸入「分析試算表」或「分析 鐵礦砂」，AI 讀取試算表歷史趨勢產出分析簡報
 * 4. 【雙軌雙向相容】：支援 Render 轉發調用，亦支援 LINE Webhook 直連！
 * ==============================================================================
 */

// ★ 請在此處填入您的 Google Gemini API Key（可在 Google AI Studio 免費取得）
const GEMINI_API_KEY = "YOUR_GEMINI_API_KEY_HERE";

// 試算表頁籤名稱
const SHEET_NAME = "總經指標歷程庫";

/**
 * HTTP GET：提供基本健康檢查與狀態監控
 */
function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  const totalRows = sheet ? Math.max(0, sheet.getLastRow() - 1) : 0;

  return ContentService.createTextOutput(JSON.stringify({
    status: "healthy",
    service: "google-apps-script-eco-bot",
    sheetTitle: ss.getName(),
    sheetName: SHEET_NAME,
    totalRecords: totalRows,
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * HTTP POST：接收來自 Render 轉發或 LINE 直連的 Webhook
 */
function doPost(e) {
  try {
    const postData = e.postData ? JSON.parse(e.postData.contents) : {};
    
    // 支援格式 A：來自 Render 智慧分流轉發 { userMsg, replyToken, userId }
    // 支援格式 B：來自 LINE Webhook 直連 { events: [...] }
    let userMsg = "";
    let replyToken = "";
    let isLineDirect = false;

    if (postData.userMsg) {
      userMsg = String(postData.userMsg).trim();
      replyToken = postData.replyToken || "";
    } else if (postData.events && postData.events.length > 0) {
      const ev = postData.events[0];
      if (ev.type === "message" && ev.message?.type === "text") {
        userMsg = String(ev.message.text).trim();
        replyToken = ev.replyToken || "";
        isLineDirect = true;
      }
    }

    if (!userMsg) {
      return ContentService.createTextOutput(JSON.stringify({ status: "ignored", reason: "no text" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 1. 判斷是否為「試算表研報分析」指令
    if (isAnalyzeCommand(userMsg)) {
      const metricTarget = extractAnalyzeTarget(userMsg);
      const analysisReport = generateSheetAnalysis(metricTarget);
      
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        type: "analysis",
        replyText: analysisReport
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 2. 判斷是否為「記錄數據」指令（如：記錄 CPI 2.9 / 記下 鐵礦砂 100 美元/噸）
    if (isRecordCommand(userMsg)) {
      const record = parseRecordText(userMsg);
      if (!record.metric) {
        return ContentService.createTextOutput(JSON.stringify({
          status: "error",
          replyText: "⚠️ 指令格式解析未果，請參考格式：\n「記錄 CPI 2.9 月增0.1%」或\n「記下 鐵礦砂 99.5 美元/噸 高爐成本支撐」"
        })).setMimeType(ContentService.MimeType.JSON);
      }

      const saveResult = appendRecordToSheet(record);

      const confirmMsg = `✅ 【成功記錄至個人 Google 試算表】\n━━━━━━━━━━━━━━━━━━━━\n` +
        `⏱️ 時間：${saveResult.timeStr}\n` +
        `📊 指標：${record.metric}\n` +
        `🔢 數值：${record.value} ${record.unit || ""}\n` +
        `📝 脈絡：${record.note || "一般常態記錄"}\n` +
        `🏷️ 標籤：${record.tag}\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `💡 累積記錄：共 ${saveResult.totalRows} 筆資料\n` +
        `💬 輸入「分析試算表」或「分析 ${record.metric}」即可即時產出個人化趨勢研報！`;

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        type: "record",
        replyText: confirmMsg,
        data: record
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 3. 其他指令：回傳提示或呼叫 Gemini 進行通用分析
    return ContentService.createTextOutput(JSON.stringify({
      status: "unhandled",
      replyText: "收到您的訊息！若要記錄指標至試算表，請輸入如：\n「記錄 CPI 2.9」或「記錄 鐵礦砂 100 美元/噸」\n若要分析試算表歷史，請輸入「分析試算表」。"
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 判斷是否為記錄指令
 */
function isRecordCommand(text) {
  const t = text.trim();
  return t.startsWith("記錄") || t.startsWith("紀錄") || t.startsWith("記下") || 
         t.startsWith("寫入") || t.startsWith("存入") || t.startsWith("記 ") || 
         t.startsWith("記：") || t.startsWith("記:");
}

/**
 * 判斷是否為分析試算表指令
 */
function isAnalyzeCommand(text) {
  const t = text.trim();
  return t.includes("分析試算表") || t.includes("試算表研報") || t.includes("分析筆記") ||
         t.includes("分析我的") || (t.startsWith("分析") && t.length <= 15);
}

/**
 * 萃取分析標的名稱
 */
function extractAnalyzeTarget(text) {
  let clean = text.replace(/分析試算表|試算表研報|分析筆記|分析我的|分析/g, "").trim();
  return clean || null;
}

/**
 * 自然語言數據解析器：高強韌度拆解「指標名稱、數值、單位、備註」
 */
function parseRecordText(rawText) {
  // 移除開頭的記錄動詞
  let body = rawText.replace(/^(記錄|紀錄|記下|寫入|存入|記|記：|記:)\s*/, "").trim();

  // 自動標註標籤
  let tag = "🏷️ 總經指標";
  if (/cpi|pce|通膨|物價|cpi年增/i.test(body)) tag = "🏷️ 通膨物價";
  else if (/鐵礦|鋼|煤|熱軋|中鋼|礦商|高爐/i.test(body)) tag = "🏷️ 原物料鋼鐵";
  else if (/台積|半導體|費半|輝達|nvda|tsmc|晶片/i.test(body)) tag = "🏷️ 科技半導體";
  else if (/美債|殖利率|fed|降息|升息|利差|10y|2y/i.test(body)) tag = "🏷️ 貨幣利率";
  else if (/外銷訂單|出口|進口|pmi|gdp|經貿/i.test(body)) tag = "🏷️ 實體經貿";
  else if (/匯率|台幣|美元|日圓|換匯/i.test(body)) tag = "🏷️ 匯率外匯";

  // 切分空格或逗號
  const parts = body.split(/[\s,，]+/);
  if (parts.length === 0) return { metric: null };

  const metric = parts[0];
  let valueStr = parts[1] || "";
  let note = parts.slice(2).join(" ");

  // 從數值字串中分離單位（如 2.9% 或 99.5美元/噸）
  let valMatch = valueStr.match(/^([+-]?\d+(?:\.\d+)?)(.*)$/);
  let numVal = "";
  let unit = "";

  if (valMatch) {
    numVal = valMatch[1];
    unit = valMatch[2] || "";
  } else {
    // 若第二欄不是純數字開頭，可能整串寫在一起（如：CPI:2.9）
    let combined = body.match(/([^\d:：=]+)[:：=\s]+([+-]?\d+(?:\.\d+)?)\s*([^\s]*)(.*)/);
    if (combined) {
      return {
        metric: combined[1].trim(),
        value: combined[2].trim(),
        unit: combined[3].trim(),
        note: combined[4].trim(),
        tag: tag
      };
    }
    numVal = valueStr;
  }

  // 智慧辨識常見單位（當數值與單位之間有空格時，例如：99.5 美元/噸）
  const knownUnits = ["美元/噸", "億美元", "百萬美元", "美元", "台幣", "元", "點", "bps", "%", "噸", "萬噸", "億元", "張", "口"];
  if (!unit && parts.length > 2 && knownUnits.includes(parts[2])) {
    unit = parts[2];
    note = parts.slice(3).join(" ");
  }

  return {
    metric: metric,
    value: numVal,
    unit: unit,
    note: note,
    tag: tag
  };
}

/**
 * 寫入試算表
 */
function appendRecordToSheet(record) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);

  // 若頁籤不存在，自動建立並美化欄位標題
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    const headers = [
      ["記錄時間 (UTC+8)", "指標名稱", "數值", "單位", "備註脈絡", "分類標籤", "建立管道"]
    ];
    sheet.getRange(1, 1, 1, 7).setValues(headers);
    sheet.getRange(1, 1, 1, 7)
      .setBackground("#1e293b")
      .setFontColor("#f8fafc")
      .setFontWeight("bold")
      .setHorizontalAlignment("center");
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 180);
    sheet.setColumnWidth(2, 140);
    sheet.setColumnWidth(3, 90);
    sheet.setColumnWidth(4, 90);
    sheet.setColumnWidth(5, 220);
    sheet.setColumnWidth(6, 120);
    sheet.setColumnWidth(7, 100);
  }

  // 格式化當前 UTC+8 時間
  const now = new Date();
  const timeStr = Utilities.formatDate(now, "Asia/Taipei", "yyyy-MM-dd HH:mm:ss");

  sheet.appendRow([
    timeStr,
    record.metric,
    record.value,
    record.unit || "",
    record.note || "",
    record.tag,
    "LINE Bot"
  ]);

  const totalRows = sheet.getLastRow() - 1;
  return { timeStr: timeStr, totalRows: totalRows };
}

/**
 * 讀取試算表資料，並由 Gemini 產生個人化研報
 */
function generateSheetAnalysis(targetMetric) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet || sheet.getLastRow() <= 1) {
    return "📊 您的試算表目前尚無足夠數據！\n請先在 LINE 輸入如「記錄 CPI 2.9」或「記錄 鐵礦砂 100 美元/噸」累積歷史時序數據後，即可啟動 Gemini 自動分析！";
  }

  // 讀取最近 20 筆記錄
  const lastRow = sheet.getLastRow();
  const startRow = Math.max(2, lastRow - 19);
  const numRows = lastRow - startRow + 1;
  const values = sheet.getRange(startRow, 1, numRows, 6).getValues();

  let filtered = values;
  if (targetMetric) {
    const tLower = targetMetric.toLowerCase();
    const matched = values.filter(r => String(r[1]).toLowerCase().includes(tLower));
    if (matched.length > 0) filtered = matched;
  }

  // 組裝歷史時序摘要
  const historyLines = filtered.map(r => 
    `• [${r[0]}] ${r[1]}：${r[2]} ${r[3]} ｜ 脈絡: ${r[4] || "無"} (${r[5]})`
  ).join("\n");

  const prompt = `你是頂級宏觀對沖基金的【資深首席策略分析師】。
以下是資深決策者個人在 Google 試算表中所持續登記追蹤的真實數據與脈絡歷程：

【個人試算表歷史時序記錄】：
${historyLines}

請針對上述登記的數據（特別聚焦：${targetMetric || "近期核心總經指標趨勢"}），進行機構級的深度策略推演：
★【零預設字句】：開門見山第一句直接切入核心走勢評定與定價因果，嚴禁出現「針對你提到的...」、「我為您分析」等任何客套廢話！
★【經驗邏輯穿透】：深究指標背後的供需失衡、產業傳導與政策意圖，嚴禁動輒給出資產配置建議！
★【歷史鏡像即時發想】：由模型在全歷史知識庫中自由發想最貼切的歷史對標切片，自擬標題並剖析同異點！
★【實戰收尾】：以多空防守臨界線或關鍵實體監控指標乾淨俐落收尾。`;

  return callGeminiApi(prompt);
}

/**
 * 呼叫 Google Gemini API
 */
function callGeminiApi(promptText) {
  const apiKey = GEMINI_API_KEY;
  if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY_HERE") {
    return "⚠️ 請先在 Google Apps Script 腳本頂部填入您的 GEMINI_API_KEY，即可啟用 AI 自動研報分析！";
  }

  const models = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash-latest",
    "gemini-1.5-flash"
  ];

  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
    const payload = {
      contents: [{ parts: [{ text: promptText }] }],
      generationConfig: {
        maxOutputTokens: 1000,
        temperature: 0.6
      }
    };

    const options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    try {
      const res = UrlFetchApp.fetch(url, options);
      const code = res.getResponseCode();
      if (code === 200) {
        const json = JSON.parse(res.getContentText());
        const candidate = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (candidate && candidate.trim().length > 30) {
          return candidate.trim();
        }
      }
    } catch (e) {
      // 嘗試下一款模型
    }
  }

  return "⚠️ 連線 Gemini 分析逾時或配額限制，請稍後再試。";
}
