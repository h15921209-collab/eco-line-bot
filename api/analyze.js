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
    const userQuery = req.query?.q || req.body?.q || '當前全球總體經濟情勢、聯準會政策路徑與股債匯跨資產配置策略';
    
    // 1. 抓取即時數據與時序庫
    const marketSnapshot = await fetchLiveMarketAndHistory();
    
    // 2. 呼叫 Gemini AI 進行分析
    const aiReport = await callGemini(userQuery);

    const now = new Date();
    const utc8 = new Date(now.getTime() + 8 * 3600 * 1000);
    const timeStr = utc8.toISOString().replace('T', ' ').substring(0, 19);

    return res.status(200).json({
      status: 'success',
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
