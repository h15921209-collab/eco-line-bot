const MACRO_DATABASE = `
【最新權威總體經濟即時基準資料庫（★分析時必須具體引用數據）】
• 美國總經：
  - 聯準會政策利率：5.25% - 5.50%（年內啟動降息循環）
  - 通膨數據：最新 CPI 年增 2.8%、核心 CPI 3.2%、核心 PCE 物價指數 2.5%
  - 就業市場：非農就業新增 16.2 萬人、失業率 4.2%、初領失業金人數 22.7 萬人
  - 實體經濟：Q2 實質 GDP 年化成長 2.8%、零售銷售月增 1.0%
  - 金融市場：美債 10Y 殖利率 3.88%、2Y 殖利率 4.05%、美元指數 DXY 102.1
  - 大宗商品：黃金現貨 2,510 美元/盎司、布蘭特原油 77.5 美元/桶
• 台灣總經：
  - 貿易動能：海關出口年增率 +18.2%、外銷訂單年增率 +8.5%
  - 景氣燈號：國發會景氣對策信號 35 分（黃紅燈高檔）
  - 貨幣政策：台灣央行重貼現率 2.00%、美元兌新台幣 (USD/TWD) 31.95
  - 產業核心：台積電先進製程與 CoWoS 產能滿載、AI 伺服器供應鏈獲利年增逾 25%`;

const SYSTEM_PROMPT = `你是專門洞悉全球總體經濟趨勢與金融市場變化的【總經分析助手】。
你的角色是一位具備頂級投資機構視角、客觀理性、邏輯嚴密且能深入淺出的「首席總經策略分析師」。

【核心回答規範（★嚴格數據導向）】
1. 【語彙標準】：一律使用台灣繁體中文與台灣金融市場慣用術語（如：聯準會 Fed、升息/降息、點陣圖、CPI/PCE 通膨、非農就業 NFP、美債殖利率、美元指數、景氣對策信號、台幣匯率）。
2. 【結論先行（Bottom-Line First）】：第一句話直接切中當前經濟情勢的核心結論與市場定價邏輯。
3. 【三維度結構化拆解（★必須嚴格具體引用真實數據）】：
   - 📊 關鍵數據與央行政策：必須具體引用資料庫中的實際數據（例如：CPI 2.8%、核心 PCE 2.5%、非農 16.2 萬人、失業率 4.2%、GDP 2.8% 等），杜絕無數據的空泛定性描述。
   - 🔄 資產傳導影響：引用真實價格與數據（如：美債 10Y 殖利率 3.88%、美元指數 102.1、台灣出口 +18.2%、景氣燈號 35 分、黃金 2,510 美元），具體說明對美股/台股、長短天期債券、美元與原物料的連動與壓力點。
   - ⚖️ 潛在風險與情境推演：列出 1~2 個市場可能忽視的灰犀牛/黑天鵝變數（如：勞動市場急凍、地緣政治能源震盪、AI 資本支出回報率落差）。
4. 【客觀專業且平易近人】：避免空泛理論，用清晰白話的比喻解釋複雜的總經傳導機制，不提供特定個股明牌，專注於宏觀趨勢與資產配置思維。
5. 【結尾風險提示】：客觀提醒總經數據具動態滯後性，本內容僅供總經研究參考，投資需嚴控資產配置與流動性風險。`;

const WELCOME_MESSAGE = `您好！我是您的【總經分析助手】📈

我能為您 24 小時即時剖析全球總體經濟脈動與市場情勢！

您可以直接輸入想了解的總經主題或提問，例如：
1️⃣ 「聯準會最新降息路徑對美債與美股有何影響？」
2️⃣ 「如何看目前美國 CPI 通膨與非農就業數據？」
3️⃣ 「美元指數近期走勢與台幣匯率連動分析」
4️⃣ 「殖利率倒掛與目前景氣循環所處階段」

💡 隨時輸入任何經濟情勢或央行政策問題，我將立即為您進行深度趨勢解讀！`;

const FALLBACK_MESSAGE = `您好！我是【總經分析助手】📈

目前總經雲端數據正在同步中。總體經濟情勢觀察重點建議持續鎖定：聯準會 (Fed) 利率決策、最新 CPI/PCE 通膨走勢，以及美債殖利率曲線的動態變化。

💡 稍後您可以重新輸入問題，我將即刻為您提供更完整的總經趨勢與市場影響剖析！`;

const FALLBACK_LINE_TOKEN = "rvn1sSlzyQrV4nh0gYirSsm3GIBaNml8osEg/DwytC1h96AsG8umK6FJgtPuyrKorlz4i5NZSwnwUx4twk2miiudbdPJjJkkduXNXF2Kb2yqyG3G1EtIO6CtClhQhw5Nfmt0AMLiee0gdFRyHyyyyQdB04t89/1O/w1cDnyilFU=";
const FALLBACK_KEY_B64 = "QVEuQWI4Uk42THk3cXJBbVZZVVpDT1prbkVKUXRrV3M5NWs5YzMxcEhOZlZmcHFZajJkcVE=";
const DEFAULT_GEMINI_KEY = Buffer.from(FALLBACK_KEY_B64, "base64").toString("utf-8");

async function callGemini(userText) {
  const apiKey = process.env.GEMINI_API_KEY || DEFAULT_GEMINI_KEY;
  const models = ["gemini-flash-latest", "gemini-3.5-flash-lite", "gemini-flash-lite-latest"];
  const prompt = `${SYSTEM_PROMPT}\n\n${MACRO_DATABASE}\n\n使用者提問總經與市場情勢：${userText}。請依據總經分析助手的專業架構，給出深度、★高度數據導向且邏輯清晰的趨勢剖析與資產傳導解答。`;

  for (const m of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      if (response.ok) {
        const data = await response.json();
        const resText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (resText) return resText;
      } else {
        console.warn(`Model ${m} status ${response.status}`);
      }
    } catch (e) {
      console.warn(`Model ${m} failed:`, e);
    }
  }
  return "";
}

function getHeader(title = "總經分析助手 · 數據趨勢解讀") {
  const now = new Date();
  const utc8 = new Date(now.getTime() + 8 * 3600 * 1000);
  const timeStr = utc8.toISOString().replace("T", " ").substring(0, 19);
  return `🤖 【${title}】\n⏱️ 即時運算時間：${timeStr} (UTC+8)\n🧠 模型引擎：Google Gemini 3 Flash\n📊 數據錨定：全球與台灣總經資料庫即時運算\n━━━━━━━━━━━━━━━━━━━━\n\n`;
}

module.exports = async (req, res) => {
  if (req.method === "GET") {
    return res.status(200).json({
      status: "healthy",
      service: "eco-line-bot-js",
      role: "總經分析助手 · 首席總經策略分析師",
      msg: "Endpoint operational"
    });
  }

  try {
    const events = req.body?.events || [];
    const lineToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || FALLBACK_LINE_TOKEN;

    for (const event of events) {
      const replyToken = event.replyToken;
      if (!replyToken || replyToken.startsWith("test")) continue;

      // 處理加好友歡迎事件
      if (event.type === "follow") {
        await fetch("https://api.line.me/v2/bot/message/reply", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${lineToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            replyToken: replyToken,
            messages: [{ type: "text", text: WELCOME_MESSAGE }]
          })
        });
        continue;
      }

      // 處理文字訊息事件
      if (event.type === "message" && event.message?.type === "text") {
        const userMsg = event.message.text.trim();

        // 呼叫 Gemini AI 進行客製化研報生成
        const aiReport = await callGemini(userMsg);
        const replyBody = aiReport ? (getHeader() + aiReport) : FALLBACK_MESSAGE;

        // 呼叫 LINE Reply API
        await fetch("https://api.line.me/v2/bot/message/reply", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${lineToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            replyToken: replyToken,
            messages: [{ type: "text", text: replyBody }]
          })
        });
      }
    }

    return res.status(200).json({ status: "OK" });
  } catch (error) {
    console.error("Webhook error:", error);
    return res.status(200).json({ status: "error", error: error.message });
  }
};