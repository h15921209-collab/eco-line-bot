const { callGemini, fetchLiveMarketAndHistory, getHeader } = require('./line-webhook-helper');

// 公開網頁呼叫的即時分析 API
module.exports = async (req, res) => {
  // 允許跨來源請求 (CORS)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const reportType = req.query?.type || req.body?.type || '';
    let userQuery = req.query?.q || req.body?.q || '';

    if (reportType === 'friday_finance' || userQuery.includes('財務班')) {
      if (!userQuery) {
        userQuery = '週五財務班專題發言稿：深度剖析美國總經指標（就業、通膨、美債殖利率曲線、利差與美元指數）之連鎖因果傳導與指標背馳矛盾';
      }
    } else if (!userQuery) {
      userQuery = '全球總體經濟數據深度剖析：通膨指標 (CPI/PCE)、就業市場與聯準會貨幣政策路徑研判';
    }
    
    // 1. 抓取即時數據與時序庫
    const marketSnapshot = await fetchLiveMarketAndHistory();
    
    // 2. 呼叫 Gemini AI 進行分析
    const aiReport = await callGemini(userQuery, marketSnapshot, { type: reportType });

    const now = new Date();
    const utc8 = new Date(now.getTime() + 8 * 3600 * 1000);
    const timeStr = utc8.toISOString().replace('T', ' ').substring(0, 19);

    return res.status(200).json({
      status: 'success',
      type: reportType,
      query: userQuery,
      timestamp: timeStr,
      report: aiReport || '總經數據連線分析中，請稍後刷新。',
      rawMarketData: marketSnapshot
    });
  } catch (error) {
    console.error('Analyze API Error:', error);
    return res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
};
