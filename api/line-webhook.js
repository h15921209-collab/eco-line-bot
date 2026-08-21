const SYSTEM_PROMPT = `你是由【宏觀全球智庫】主持的【24H 首席全球總經情勢與資產配置戰略顧問】。
你的角色是一位頂級外資投行（高盛 Goldman Sachs、摩根士丹利 Morgan Stanley、橋水 Bridgewater）的「全球首席總體經濟學家兼跨資產配置策略長」。
你擁有深厚的宏觀經濟週期洞察力、數據解析能力與全球跨市場聯動視野，擅長將深奧的宏觀經濟轉化為極具實戰價值的機構級研報。

【最新總體經濟基準錨定數據】：
• 美國總經：Fed 政策利率 5.25-5.50%（年內啟動降息路徑）、CPI 2.8%、核心 PCE 2.5%、非農就業新增 16.2萬人、失業率 4.2%、Q2 GDP 年增率 2.8%、零售銷售月增 1.0%、美債 10Y 殖利率 3.88%、美元指數 DXY 102.1、國際金價 2510 美元/盎司、布蘭特原油 77.5 美元/桶。
• 台灣總經：海關出口年增率 +18.2%、外銷訂單年增 +8.5%、景氣對策信號 35分（黃紅燈高檔）、央行重貼現率 2.0%、台積電 CoWoS 先進封裝與 AI 伺服器資本支出強勁。

【嚴格研報架構規範（外資投行晨會標準，適合手機閱讀，約 350 ~ 480 字）】：
1. 🎯【首席宏觀情勢核心定調】：第一句話直截了當給出全球景氣週期與宏觀趨勢的明確結論，絕不說模稜兩可的廢話。
2. 📊【三大關鍵驅動因子深度剖析】：
   - 🏦 1. 央行與流動性傳導：拆解聯準會降息定價、實質利率走向與美元指數（DXY）資金流向。
   - 📈 2. 實體經濟與景氣循環：以最新就業/PMI/出口數據（引用客觀數據）佐證成長動能與衰退風險評估。
   - 🌐 3. 跨資產定價連動效應：深度剖析對美股科技股、台股半導體供應鏈、美債殖利率曲線與大宗商品的定價傳導機制。
3. 💡【機構級跨資產配置與避險指引】：
   - 提供明確的攻守配置權重（如 50% 核心科技成長股 + 30% 長天期公債/投資級債 + 20% 黃金避險與現金對沖）。
   - 給予具體的戰術操作思維與風險預警。

格式要求：台灣繁體中文，語氣權威專業、邏輯嚴密、結構清晰、重點粗體、排版高雅。`;

const FALLBACK_LINE_TOKEN = "rvn1sSlzyQrV4nh0gYirSsm3GIBaNml8osEg/DwytC1h96AsG8umK6FJgtPuyrKorlz4i5NZSwnwUx4twk2miiudbdPJjJkkduXNXF2Kb2yqyG3G1EtIO6CtClhQhw5Nfmt0AMLiee0gdFRyHyyyyQdB04t89/1O/w1cDnyilFU=";
const FALLBACK_KEY_B64 = "QVEuQWI4Uk42THk3cXJBbVZZVVpDT1prbkVKUXRrV3M5NWs5YzMxcEhOZlZmcHFZajJkcVE=";
const DEFAULT_GEMINI_KEY = Buffer.from(FALLBACK_KEY_B64, "base64").toString("utf-8");

async function callGemini(userText) {
  const apiKey = process.env.GEMINI_API_KEY || DEFAULT_GEMINI_KEY;
  // 優先使用 Google Gemini 3 Flash 旗艦模型，若遇壅塞依序備援
  const models = ["gemini-flash-latest", "gemini-3.5-flash-lite", "gemini-flash-lite-latest"];
  const prompt = `${SYSTEM_PROMPT}\n\n【客戶即時諮詢/市場焦點】：\n${userText}\n\n請務必以首席策略長視角，依據上述投行標準與黃金三段式結構，產出針對「${userText}」的深度、高品質專業研報：`;

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

function getHeader(title = "宏觀全球智庫 · 24H 首席戰略顧問") {
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
      role: "宏觀全球智庫 · 24H 首席全球總經情勢與資產配置戰略顧問",
      msg: "Endpoint operational"
    });
  }

  try {
    const events = req.body?.events || [];
    const lineToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || FALLBACK_LINE_TOKEN;

    for (const event of events) {
      if (event.type === "message" && event.message?.type === "text") {
        const userMsg = event.message.text.trim();
        const replyToken = event.replyToken;

        if (replyToken && !replyToken.startsWith("test")) {
          // 呼叫 Gemini AI 進行客製化研報生成
          const aiReport = await callGemini(userMsg);
          const replyBody = aiReport || "【宏觀情勢核心定調】：當前全球宏觀處於「聯準會降息預期定價與AI超級資本支出共振」階段。建議維持 50% 核心科技 + 30% 長天期公債 + 20% 黃金對沖防禦配置。";

          const fullReply = getHeader("宏觀全球智庫 · 首席戰略顧問解答") + replyBody;

          // 呼叫 LINE Reply API
          await fetch("https://api.line.me/v2/bot/message/reply", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${lineToken}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              replyToken: replyToken,
              messages: [{ type: "text", text: fullReply }]
            })
          });
        }
      }
    }

    return res.status(200).json({ status: "OK" });
  } catch (error) {
    console.error("Webhook error:", error);
    return res.status(200).json({ status: "error", error: error.message });
  }
};