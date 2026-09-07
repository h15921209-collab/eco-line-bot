const https = require('https');
const fs = require('fs');
const path = require('path');

const NEWS_FILE_PATH = path.join(__dirname, '..', 'data', 'macro_news.json');

// 記憶體快取
let inMemoryNews = [];
let lastFetchTime = 0;
const FETCH_INTERVAL_MS = 15 * 60 * 1000; // 15 分鐘快取更新

// 初始化載入既有儲存的新聞
function loadStoredNews() {
  try {
    if (fs.existsSync(NEWS_FILE_PATH)) {
      const raw = fs.readFileSync(NEWS_FILE_PATH, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        inMemoryNews = parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to load stored news:', e.message);
  }
}

// 儲存新聞至本地 JSON 檔案
function saveNewsToStorage(newsList) {
  try {
    const dir = path.dirname(NEWS_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(NEWS_FILE_PATH, JSON.stringify(newsList, null, 2), 'utf8');
  } catch (e) {
    console.warn('Failed to save news to storage:', e.message);
  }
}

// 自動判斷美歐央行與總經分類及標籤
function categorizeNews(title) {
  const t = title.toLowerCase();
  let category = 'macro';
  let tag = '#全球總經';
  let icon = '🌐';

  if (/聯準會|fed|鮑爾|fomc|降息|升息|利率決策|點陣圖/.test(t)) {
    category = 'fed';
    tag = '#Fed聯準會';
    icon = '🏛️';
  } else if (/cpi|pce|通膨|物價|通縮|生活成本/.test(t)) {
    category = 'cpi';
    tag = '#CPI通膨';
    icon = '📊';
  } else if (/非農|就業|失業|初領|薪資|勞動力/.test(t)) {
    category = 'employment';
    tag = '#非農就業';
    icon = '💼';
  } else if (/美債|公債|殖利率|利差|國債|10y|2y/.test(t)) {
    category = 'yield';
    tag = '#美債殖利率';
    icon = '📈';
  } else if (/歐洲央行|ecb|拉加德|歐元區|歐債/.test(t)) {
    category = 'ecb';
    tag = '#歐洲央行';
    icon = '🇪🇺';
  }

  return { category, tag, icon };
}

// 1. 抓取 Yahoo 股市國際總經新聞 (具備直接文章 URL)
function fetchYahooMacroNews() {
  return new Promise((resolve) => {
    https.get('https://tw.stock.yahoo.com/rss?category=intl-markets', { timeout: 4000, headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode !== 200) return resolve([]);
      let rawData = '';
      res.on('data', (c) => { rawData += c; });
      res.on('end', () => {
        try {
          const itemRegex = /<item>[\s\S]*?<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>[\s\S]*?<link>([\s\S]*?)<\/link>[\s\S]*?<pubDate>([\s\S]*?)<\/pubDate>[\s\S]*?<\/item>/gi;
          let match;
          const items = [];
          while ((match = itemRegex.exec(rawData))) {
            const title = match[1].trim();
            const link = match[2].trim();
            const pubDateStr = match[3].trim();
            if (title && title.length >= 8) {
              const pubTime = new Date(pubDateStr);
              const utc8Time = new Date(pubTime.getTime() + (pubTime.getTimezoneOffset() + 480) * 60000);
              const timeStr = `${String(utc8Time.getMonth() + 1).padStart(2, '0')}/${String(utc8Time.getDate()).padStart(2, '0')} ${String(utc8Time.getHours()).padStart(2, '0')}:${String(utc8Time.getMinutes()).padStart(2, '0')}`;
              const { category, tag, icon } = categorizeNews(title);
              items.push({
                id: Buffer.from(title).toString('base64').substring(0, 16),
                title,
                source: 'Yahoo股市',
                link,
                pubDate: pubDateStr,
                timeDisplay: timeStr,
                timestamp: isNaN(pubTime.getTime()) ? Date.now() : pubTime.getTime(),
                category,
                tag,
                icon,
                aiPrompt: `請針對最新重大總經與央行新聞「${title}」深入剖析其對聯準會利率決策、美債殖利率曲線、通膨定價及全球跨資產之連鎖傳導影響`
              });
            }
          }
          resolve(items);
        } catch (e) {
          resolve([]);
        }
      });
    }).on('error', () => resolve([])).on('timeout', function() { this.destroy(); resolve([]); });
  });
}

// 2. 抓取 鉅亨網 (Cnyes) 焦點總經新聞 (具備直接文章 URL)
function fetchCnyesMacroNews() {
  return new Promise((resolve) => {
    https.get('https://news.cnyes.com/api/v3/news/category/headline?limit=30', { timeout: 4000, headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode !== 200) return resolve([]);
      let rawData = '';
      res.on('data', (c) => { rawData += c; });
      res.on('end', () => {
        try {
          const json = JSON.parse(rawData);
          const raw = json.items?.data || [];
          const items = [];
          raw.forEach(it => {
            const title = it.title.trim();
            if (title && title.length >= 8) {
              const pubTime = new Date(it.publishAt * 1000);
              const utc8Time = new Date(pubTime.getTime() + (pubTime.getTimezoneOffset() + 480) * 60000);
              const timeStr = `${String(utc8Time.getMonth() + 1).padStart(2, '0')}/${String(utc8Time.getDate()).padStart(2, '0')} ${String(utc8Time.getHours()).padStart(2, '0')}:${String(utc8Time.getMinutes()).padStart(2, '0')}`;
              const { category, tag, icon } = categorizeNews(title);
              items.push({
                id: Buffer.from(title).toString('base64').substring(0, 16),
                title,
                source: '鉅亨網',
                link: `https://news.cnyes.com/news/id/${it.newsId}`,
                pubDate: pubTime.toUTCString(),
                timeDisplay: timeStr,
                timestamp: it.publishAt * 1000,
                category,
                tag,
                icon,
                aiPrompt: `請針對最新重大總經與央行新聞「${title}」深入剖析其對聯準會利率決策、美債殖利率曲線、通膨定價及全球跨資產之連鎖傳導影響`
              });
            }
          });
          resolve(items);
        } catch (e) {
          resolve([]);
        }
      });
    }).on('error', () => resolve([])).on('timeout', function() { this.destroy(); resolve([]); });
  });
}

// 3. 抓取 Google News RSS 美歐央行與總經新聞 (將重定向失效之 CBMi 網址安全升級為直達搜尋)
function fetchMacroNewsRss() {
  return new Promise((resolve) => {
    const query = encodeURIComponent('聯準會 OR Fed OR 鮑爾 OR "核心CPI" OR "非農就業" OR "美債殖利率" OR "歐洲央行" OR "PCE物價"');
    const rssUrl = `https://news.google.com/rss/search?q=${query}&hl=zh-TW&gl=TW&ceid=TW:zh-Hant`;

    const req = https.get(rssUrl, { timeout: 4000, headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode !== 200) return resolve([]);

      let rawData = '';
      res.on('data', (chunk) => { rawData += chunk; });
      res.on('end', () => {
        try {
          const items = [];
          const regex = /<item>[\s\S]*?<title>(.*?)<\/title>[\s\S]*?<link>(.*?)<\/link>[\s\S]*?<pubDate>(.*?)<\/pubDate>[\s\S]*?<\/item>/gi;
          let match;
          while ((match = regex.exec(rawData)) !== null) {
            let title = match[1]
              .replace(/<!\[CDATA\[/g, '')
              .replace(/\]\]>/g, '')
              .replace(/&amp;/g, '&')
              .replace(/&quot;/g, '"')
              .replace(/&#39;/g, "'")
              .trim();
            const rawLink = match[2].trim();
            const pubDateStr = match[3].trim();

            let source = '財經新聞';
            const dashIdx = title.lastIndexOf(' - ');
            if (dashIdx > 0) {
              source = title.substring(dashIdx + 3).trim();
              title = title.substring(0, dashIdx).trim();
            }

            // 避開 Google News CBMi 轉址白屏：若為 Google News 封裝網址，升級為精準直達原文搜尋
            const cleanLink = rawLink.includes('news.google.com/rss/articles/')
              ? `https://www.google.com/search?q=${encodeURIComponent(title + ' ' + source)}`
              : rawLink;

            if (title && title.length >= 8) {
              const pubTime = new Date(pubDateStr);
              const utc8Time = new Date(pubTime.getTime() + (pubTime.getTimezoneOffset() + 480) * 60000);
              const timeStr = `${String(utc8Time.getMonth() + 1).padStart(2, '0')}/${String(utc8Time.getDate()).padStart(2, '0')} ${String(utc8Time.getHours()).padStart(2, '0')}:${String(utc8Time.getMinutes()).padStart(2, '0')}`;

              const { category, tag, icon } = categorizeNews(title);

              items.push({
                id: Buffer.from(title).toString('base64').substring(0, 16),
                title,
                source,
                link: cleanLink,
                pubDate: pubDateStr,
                timeDisplay: timeStr,
                timestamp: isNaN(pubTime.getTime()) ? Date.now() : pubTime.getTime(),
                category,
                tag,
                icon,
                aiPrompt: `請針對最新重大總經與央行新聞「${title}」深入剖析其對聯準會利率決策、美債殖利率曲線、通膨定價及全球跨資產之連鎖傳導影響`
              });
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

// 核心更新與儲存函式 (三源並行匯聚)
async function refreshAndStoreNews() {
  loadStoredNews();
  const [yahooNews, cnyesNews, googleNews] = await Promise.all([
    fetchYahooMacroNews(),
    fetchCnyesMacroNews(),
    fetchMacroNewsRss()
  ]);

  const allFetched = [...yahooNews, ...cnyesNews, ...googleNews];

  if (allFetched && allFetched.length > 0) {
    const existingTitles = new Set(inMemoryNews.map(n => n.title));
    const newItems = allFetched.filter(n => !existingTitles.has(n.title));

    if (newItems.length > 0) {
      inMemoryNews = [...newItems, ...inMemoryNews];
    }
  }

  // 若資料庫完全空白，塞入高品質預設備援新聞
  if (inMemoryNews.length === 0) {
    inMemoryNews = [
      {
        id: 'seed-1',
        title: '聯準會官員暗示降息步伐依賴數據，強調就業市場平衡與通膨可控',
        source: '工商時報',
        link: '#',
        timeDisplay: '今日 14:00',
        timestamp: Date.now(),
        category: 'fed',
        tag: '#Fed聯準會',
        icon: '🏛️',
        aiPrompt: '請深度剖析聯準會最新降息步伐展望對短天期與長天期美債殖利率之定價衝擊'
      },
      {
        id: 'seed-2',
        title: '最新核心 CPI 與 PCE 通膨數據趨緩，美債殖利率維持倒掛修復格局',
        source: '經濟日報',
        link: '#',
        timeDisplay: '今日 11:30',
        timestamp: Date.now() - 3600000,
        category: 'cpi',
        tag: '#CPI通膨',
        icon: '📊',
        aiPrompt: '美國核心通膨向 2% 目標收斂進程對實質利率與全球實體經濟流動性之約束分析'
      },
      {
        id: 'seed-3',
        title: '非農就業增長穩健但薪資增速降溫，市場預期經濟維持軟著陸路徑',
        source: '鉅亨網',
        link: '#',
        timeDisplay: '昨日 20:30',
        timestamp: Date.now() - 7200000,
        category: 'employment',
        tag: '#非農就業',
        icon: '💼',
        aiPrompt: '美國非農就業與時薪增長放緩對服務業通膨黏性緩解之深度評估'
      },
      {
        id: 'seed-4',
        title: '美債 10Y-2Y 殖利率曲線斜率趨陡，外資機構增配投資級債券',
        source: '中央社',
        link: '#',
        timeDisplay: '昨日 17:15',
        timestamp: Date.now() - 10800000,
        category: 'yield',
        tag: '#美債殖利率',
        icon: '📈',
        aiPrompt: '10Y-2Y 美債利差由負轉正對銀行業淨利息收益率 (NIM) 與信用週期之投射'
      }
    ];
  }

  // 依時間排序並限制保留最近 100 則
  inMemoryNews.sort((a, b) => b.timestamp - a.timestamp);
  if (inMemoryNews.length > 100) {
    inMemoryNews = inMemoryNews.slice(0, 100);
  }

  saveNewsToStorage(inMemoryNews);
  lastFetchTime = Date.now();
  return inMemoryNews;
}

// 供其他模組（如 AI RAG 與晨報廣播）直接引用
async function getLatestMacroNews(limit = 8) {
  if (inMemoryNews.length === 0 || Date.now() - lastFetchTime > FETCH_INTERVAL_MS) {
    await refreshAndStoreNews();
  }
  return inMemoryNews.slice(0, limit);
}

// 將新聞陣列轉為 CSV 格式 (支援 Excel 與 Google Sheets)
function convertNewsToCsv(newsList) {
  const header = ['時間', '分類', '標籤', '媒體來源', '新聞標題', 'AI解讀指令', '連結'];
  const rows = [header.join(',')];

  newsList.forEach(n => {
    const cleanTitle = `"${n.title.replace(/"/g, '""')}"`;
    const cleanPrompt = `"${n.aiPrompt.replace(/"/g, '""')}"`;
    const row = [
      `"${n.timeDisplay}"`,
      `"${n.category}"`,
      `"${n.tag}"`,
      `"${n.source}"`,
      cleanTitle,
      cleanPrompt,
      `"${n.link || ''}"`
    ];
    rows.push(row.join(','));
  });

  // 加入 UTF-8 BOM 避免 Excel/Google 試算表亂碼
  return '\uFEFF' + rows.join('\r\n');
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const isForce = req.query?.force === '1' || req.query?.refresh === '1';
    if (isForce || inMemoryNews.length === 0 || Date.now() - lastFetchTime > FETCH_INTERVAL_MS) {
      await refreshAndStoreNews();
    }

    const format = req.query?.format;
    const category = req.query?.category || 'all';

    let filtered = inMemoryNews;
    if (category !== 'all') {
      filtered = filtered.filter(n => n.category === category);
    }

    // CSV 匯出（供 Google 試算表 =IMPORTDATA 調用）
    if (format === 'csv') {
      const csvContent = convertNewsToCsv(filtered);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="macro_news.csv"');
      return res.status(200).send(csvContent);
    }

    // JSON 輸出（供前端視覺化情報流調用）
    return res.status(200).json({
      status: 'success',
      totalCount: filtered.length,
      allCount: inMemoryNews.length,
      category,
      lastUpdated: new Date(lastFetchTime).toISOString(),
      news: filtered
    });
  } catch (error) {
    console.error('News API error:', error);
    return res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
};

module.exports.getLatestMacroNews = getLatestMacroNews;
