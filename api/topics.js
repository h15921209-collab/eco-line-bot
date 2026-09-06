const https = require('https');

// 記憶體快取（10 分鐘過期）
let cachedTopics = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 10 * 60 * 1000;

// 頂級精選總體經濟數據題庫庫池（5 大面向均衡涵蓋）
const FALLBACK_TOPIC_POOL = [
  // 1. 美歐央行利率與通膨 (CPI/PCE)
  {
    label: '📊 CPI 通膨與降息路徑',
    query: '美國最新 CPI 與核心 PCE 通膨年增率走勢，對聯準會 (Fed) 利率決策路徑與終點利率定價的傳導分析'
  },
  {
    label: '🏛️ 10Y-2Y 美債殖利率曲線',
    query: '美債 10Y-2Y 殖利率曲線斜率變化、倒掛修復歷程，對美國景氣衰退預警與金融流動性環境之深度剖析'
  },
  {
    label: '📉 PCE 物價與實質利率',
    query: '美國核心 PCE 物價指數變動與實質中性利率 (r*) 水位評估，以及對全球資金成本的長期約束'
  },

  // 2. 美國就業與經濟增長 (非農/GDP)
  {
    label: '💼 非農就業與薪資增長',
    query: '美國非農就業人口增長、失業率跳動與平均時薪年增率，對就業市場冷卻進度與通膨黏性之影響'
  },
  {
    label: '📈 美國實質 GDP 與消費動能',
    query: '美國實質 GDP 季增年率 (SAAR)、個人消費支出 (PCE) 動能與民間儲蓄率對總體經濟軟著陸之支撐力驗證'
  },
  {
    label: '📋 初領失業金與勞動參與率',
    query: '每週初領與續領失業救濟金人數波動、勞動參與率變化，對勞動力供需再平衡與降息節奏的預判'
  },

  // 3. 台灣外銷訂單與半導體供應鏈景氣
  {
    label: '🇹🇼 台灣外銷訂單與 AI 需求',
    query: '經濟部最新台灣外銷訂單金額、年增動能與電子資通訊產品接單表現，對半導體先進製程景氣週期之投射'
  },
  {
    label: '🏭 景氣對策信號與出口動能',
    query: '國發會最新景氣對策信號分數、海關出口貿易年增率與台幣匯率波動，對台灣實體經濟成長動能之綜合研判'
  },
  {
    label: '🤖 半導體產能利用率與資本支出',
    query: '全球半導體代工龍頭產能利用率、先進封裝 CoWoS 擴產進度與非計畫型資本支出對全球科技週期的連動影響'
  },

  // 4. 全球製造業與貿易 (PMI/關稅)
  {
    label: '🌐 全球製造業 PMI 與新訂單',
    query: '全球主要經濟體（美、歐、中、台）製造業 PMI 採購經理人指數、新訂單減庫存差額，對製造業補庫存循環的驗證'
  },
  {
    label: '🚢 全球貿易量與海運運價指數',
    query: 'BDI 散裝運價指數、貨櫃海運報價與全球出口貿易量變化，對國際實體經貿活動與供應鏈通膨之傳導分析'
  },
  {
    label: '⚖️ 關稅壁壘與區域供應鏈重組',
    query: '美國貿易關稅政策動向、全球關稅調整對跨境商品流動、通膨輸入壓力與新興市場代工鏈之結構性衝擊'
  },

  // 5. 大宗商品原物料數據 (金/油/銅/煤鐵實體數據)
  {
    label: '⛏️ 銅博士/黃金比率景氣指標',
    query: '國際高級銅價、紐約黃金價格走勢與金銅比 (Gold/Copper Ratio) 波動，對全球實體製造業景氣擴張或避險升溫之訊號解讀'
  },
  {
    label: '🔩 鐵礦砂/動力煤與煉鋼成本',
    query: '國際鐵礦砂 62% 現貨價格、紐卡斯爾動力煤價格走勢與高爐煉鋼成本變化，對全球粗鋼產銷供需平衡的影響'
  },
  {
    label: '🛢️ 國際原油供需與天然氣庫存',
    query: 'WTI 原油價格、美國天然氣庫存水位與 EIA 能源供需平衡月報，對全球製造業能源成本與核心通膨預期的實證分析'
  }
];

// 洗牌演算法 (Fisher-Yates)
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// 簡易抓取 Google News RSS 總經頭條
function fetchMacroNewsRss() {
  return new Promise((resolve) => {
    const query = encodeURIComponent('總體經濟 OR CPI OR 聯準會 OR 非農 OR 外銷訂單 OR PMI');
    const rssUrl = `https://news.google.com/rss/search?q=${query}&hl=zh-TW&gl=TW&ceid=TW:zh-Hant`;

    const req = https.get(rssUrl, { timeout: 3500, headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode !== 200) {
        return resolve([]);
      }
      let rawData = '';
      res.on('data', (chunk) => { rawData += chunk; });
      res.on('end', () => {
        try {
          const items = [];
          const regex = /<item>[\s\S]*?<title>(.*?)<\/title>[\s\S]*?<\/item>/gi;
          let match;
          while ((match = regex.exec(rawData)) !== null) {
            let title = match[1]
              .replace(/<!\[CDATA\[/g, '')
              .replace(/\]\]>/g, '')
              .replace(/&amp;/g, '&')
              .replace(/&quot;/g, '"')
              .replace(/&#39;/g, "'")
              .trim();
            // 移除新聞來源尾綴 (例如 - 工商時報、- 自由時報)
            const dashIdx = title.lastIndexOf(' - ');
            if (dashIdx > 0) {
              title = title.substring(0, dashIdx).trim();
            }
            if (title && title.length >= 8 && title.length <= 45) {
              items.push(title);
            }
          }
          resolve(items);
        } catch (e) {
          resolve([]);
        }
      });
    });

    req.on('error', () => resolve([]));
    req.on('timeout', () => {
      req.destroy();
      resolve([]);
    });
  });
}

// 將新聞標題轉換為總經數據分析題目
function convertNewsToTopic(headline) {
  // 自動挑選合適的 Emoji
  let emoji = '📰';
  if (/通膨|CPI|PCE|物價/i.test(headline)) emoji = '📊';
  else if (/聯準會|Fed|降息|升息|利率/i.test(headline)) emoji = '🏛️';
  else if (/就業|非農|失業|薪資/i.test(headline)) emoji = '💼';
  else if (/出口|外銷|訂單|貿易/i.test(headline)) emoji = '🇹🇼';
  else if (/PMI|製造業|鋼鐵|產能/i.test(headline)) emoji = '🏭';
  else if (/油價|銅|黃金|天然氣|煤/i.test(headline)) emoji = '⛏️';

  // 截短為按鈕標籤
  let shortLabel = headline.length > 16 ? headline.substring(0, 15) + '...' : headline;

  return {
    label: `${emoji} ${shortLabel}`,
    query: `請針對最新經濟事件焦點「${headline}」結合當前關鍵總體經濟數據（通膨指標、就業市況、央行政策與產銷動能）進行深度的實證經濟學分析`,
    isLiveNews: true
  };
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const now = Date.now();

  try {
    // 檢查快取
    if (cachedTopics && (now - lastCacheTime < CACHE_TTL_MS)) {
      return res.status(200).json({
        status: 'success',
        source: 'cache',
        topics: shuffleArray(cachedTopics).slice(0, 5)
      });
    }

    // 即時抓取最新新聞
    const newsHeadlines = await fetchMacroNewsRss();
    let topicResults = [];

    if (newsHeadlines && newsHeadlines.length >= 2) {
      // 隨機選 2~3 條最新總經新聞
      const selectedNews = shuffleArray(newsHeadlines).slice(0, 3);
      selectedNews.forEach(headline => {
        topicResults.push(convertNewsToTopic(headline));
      });
    }

    // 補充精選總經數據題庫直到滿 5 組
    const shuffledFallback = shuffleArray(FALLBACK_TOPIC_POOL);
    for (const fb of shuffledFallback) {
      if (topicResults.length >= 5) break;
      // 避免重複
      if (!topicResults.some(t => t.label === fb.label)) {
        topicResults.push(fb);
      }
    }

    // 儲存快取
    cachedTopics = topicResults;
    lastCacheTime = now;

    return res.status(200).json({
      status: 'success',
      source: 'live',
      topics: topicResults
    });
  } catch (error) {
    console.error('Topics API error:', error);
    // 回退到精選數據題庫
    return res.status(200).json({
      status: 'success',
      source: 'fallback',
      topics: shuffleArray(FALLBACK_TOPIC_POOL).slice(0, 5)
    });
  }
};
