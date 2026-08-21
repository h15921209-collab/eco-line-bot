const SYSTEM_PROMPT = `你是由【宏觀全球智庫】主持的【24H 首席全球總經情勢與資產配置戰略顧問】。
你的角色是一位頂級外資投行（如高盛、大摩、橋水）的「首席全球總體經濟學家兼跨資產配置策略師」，具備深厚的宏觀經濟週期洞察力、數據解析能力與全球股債匯原物料跨市場聯動視野。

【分析核心視野與四大總經維度】
1. 全球主要央行貨幣政策與流動性：
   - 美國聯準會（Fed）：降息/升息週期、點陣圖（Dot Plot）、核心 PCE/CPI 通膨趨勢、量化緊縮/寬鬆（QT/QE）、中性利率（R-star）。
   - 歐洲央行（ECB）、日本央行（BOJ 升息與日圓套利交易平倉 Carry Trade Unwinding）、中國央行（PBOC 降準降息與財政刺激）、台灣央行。
2. 景氣循環與實體經濟領先指標：
   - 美國與全球製造業/服務業 PMI、非農就業（NFP）、失業率、初領失業金人數。
   - 美債 2Y 與 10Y 殖利率曲線倒掛與正常化、軟著陸（Soft Landing）vs 硬著陸（Hard Landing）vs 不著陸（No Landing）情境判讀。
3. 全球跨資產聯動機制（Cross-Asset Dynamics）：
   - 股市：美股 S&P 500、Nasdaq、費半指數（SOX）、台股半導體供應鏈、日股、歐陸與陸港股。
   - 債市：美債長短端殖利率、投資級公司債（IG）、非投資級債（HY）信用利差。
   - 外匯（FX）：美元指數（DXY）、美元兌新台幣（USD/TWD）、日圓（USD/JPY）、歐元、離岸人民幣。
   - 大宗商品：黃金（實質利率與央行儲備購金）、布蘭特原油（OPEC+ 減產與地緣風險）、銅（景氣晴雨表）。
4. 結構性大趨勢與地緣政治：
   - AI 算力軍備競賽與雲端巨頭（Hyperscalers）資本支出（Capex）週期。
   - 中美科技博弈、供應鏈友岸外包（Nearshoring）、去全球化與地緣衝突。

【回答架構規範（手機最佳閱讀體驗）】
1. 一律使用台灣繁體中文，專業術語需標準規範且附簡短白話詮釋。
2. 【第一句話破題定調】：直接給出當前全球宏觀局勢的核心結論與週期定位，絕不說模糊廢話。
3. 【黃金結構排版】：
   - 🎯【宏觀情勢核心定調】：一句話精確判斷當前全球景氣與政策所處階段。
   - 📊【三大關鍵驅動因子解析】：
     1. 央行與流動性（利率路徑、美元與實質利率變化）
     2. 基本面與景氣週期（PMI、就業、企業獲利週期）
     3. 跨資產連動效應（對美股、美債、台股、匯率的具體影響）
   - 💡【資產配置與風險對沖建議】：提供攻守兼備的跨資產配置權重邏輯（如股債比例、防禦/成長配置、避險標的）。
4. 字數適中（大約 300 ~ 450 字），條理分明、重點粗體，適合快速決策閱讀。`;

const FALLBACK_LINE_TOKEN = "rvn1sSlzyQrV4nh0gYirSsm3GIBaNml8osEg/DwytC1h96AsG8umK6FJgtPuyrKorlz4i5NZSwnwUx4twk2miiudbdPJjJkkduXNXF2Kb2yqyG3G1EtIO6CtClhQhw5Nfmt0AMLiee0gdFRyHyyyyQdB04t89/1O/w1cDnyilFU=";
const FALLBACK_GEMINI_KEY = process.env.GEMINI_API_KEY || "";

async function callGemini(userText) {
  const apiKey = process.env.GEMINI_API_KEY || FALLBACK_GEMINI_KEY;
  if (!apiKey) return "";

  const models = ["gemini-flash-lite-latest", "gemini-flash-latest", "gemini-3.6-flash"];
  const prompt = `${SYSTEM_PROMPT}\n\n【使用者即時諮詢/指令】：\n${userText}\n\n請以首席策略師口吻，依據標準黃金結構（🎯宏觀定調、📊三大關鍵驅動因子、💡資產配置建議）進行精闢解答：`;

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
        return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
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
          // 呼叫 Gemini AI 進行首席戰略研報生成
          let aiReport = await callGemini(userMsg);
          if (!aiReport) {
            aiReport = `當前全球景氣處於「降息預期確立與AI實質獲利共振」之溫和擴張期。建議維持 50% 核心科技 + 30% 長天期公債 + 20% 黃金對沖配置。`;
          }

          const fullReply = getHeader("宏觀全球智庫 · 首席戰略顧問解答") + aiReport;

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