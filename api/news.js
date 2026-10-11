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

// 自動辨識新聞提及之關鍵總經指標代碼 (供多維指標研討室與 AI 連動調用)
function extractRelatedIndicators(title) {
  const t = title.toLowerCase();
  const indicators = [];

  // 通膨相關
  if (/cpi|消費者物價|物價指數/.test(t)) {
    indicators.push('US_CPI');
    if (/核心/.test(t)) indicators.push('US_CORE_CPI');
  }
  if (/pce|個人消費支出/.test(t)) indicators.push('US_PCE');
  if (/ppi|生產者物價/.test(t)) indicators.push('US_PPI');

  // 就業與消費
  if (/非農|非農業就業|就業人口|新增就業/.test(t)) indicators.push('US_NFP');
  if (/失業率|初領失業|請領失業|勞動力/.test(t)) indicators.push('US_UR');
  if (/零售銷售|消費者支出|零售額/.test(t)) indicators.push('US_RETAIL');

  // 利率與債券
  if (/聯準會|fed|鮑爾|fomc|降息|升息|利率決策|點陣圖|基準利率/.test(t)) {
    indicators.push('US_FOMC');
    indicators.push('US_2Y');
  }
  if (/美債|公債|國債|殖利率|10y|長天期債|長債/.test(t)) indicators.push('US_10Y');
  if (/2y|短天期債|短債/.test(t)) indicators.push('US_2Y');
  if (/利差|倒掛|走陡|殖利率曲線|steepener/.test(t)) indicators.push('US_SPREAD');
  if (/美元指數|dxy|美元走勢/.test(t)) indicators.push('MARKET_DXY');

  // 貿易與製造業
  if (/出口|外銷訂單|進出口|出超/.test(t)) indicators.push('TW_EXPORT');
  if (/pmi|採購經理人|製造業指數/.test(t)) indicators.push('CN_PMI');

  // 大宗原物料
  if (/鐵礦砂|鐵礦石|高爐|煉鋼|熱軋/.test(t)) indicators.push('COMMODITY_IRON_ORE');
  if (/煤炭|動力煤|焦煤/.test(t)) indicators.push('COMMODITY_COAL');
  if (/銅|銅價|銅博士/.test(t)) indicators.push('COMMODITY_COPPER');
  if (/原油|油價|wti|布蘭特/.test(t)) indicators.push('COMMODITY_OIL');
  if (/黃金|金價|金銀比/.test(t)) indicators.push('COMMODITY_GOLD');

  // 科技與股市
  if (/台積電|tsmc|晶圓代工/.test(t)) indicators.push('MARKET_TSMC');
  if (/輝達|nvidia|ai晶片|gpu/.test(t)) indicators.push('MARKET_NVDA');
  if (/費城半導體|費半|半導體指數/.test(t)) indicators.push('MARKET_SOX');
  if (/台股|加權指數|台指期/.test(t)) indicators.push('MARKET_TAIEX');
  if (/vix|恐慌指數|恐慌情緒/.test(t)) indicators.push('MARKET_VIX');

  // 若無特定匹配，依央行或通膨主題預設關聯
  if (indicators.length === 0) {
    if (/fed|聯準會|央行/.test(t)) indicators.push('US_FOMC', 'US_10Y');
    else if (/通膨|物價/.test(t)) indicators.push('US_CPI');
    else if (/就業|工資/.test(t)) indicators.push('US_NFP');
    else indicators.push('US_10Y', 'MARKET_TAIEX');
  }

  return Array.from(new Set(indicators));
}

// 嚴格過濾無關雜訊、社會事件與政治口水，僅保留真正宏觀、金融、大宗原料與半導體財經新聞
function isRelevantMacroNews(title) {
  if (!title || typeof title !== 'string') return false;
  const t = title.toLowerCase();

  // 1. 黑名單排除過濾
  const blacklistRegex = /盜古墓|古墓|違建|頂樓加蓋|陽台外推|夾層|騎樓|殺人|車禍|性侵|詐騙|吸毒|毒品|偷竊|竊盜|打架|火警|火災|八卦|藝人|緋聞|戀情|婚姻|出軌|分居|國台辦|政治攻防|選戰|候選人|網紅|正妹|自拍|樂透|威力彩|大樂透|星座|運勢|命理|鄉民|網友|討教|狠酸|爆廢|爆料|dcard|ptt|開箱/;
  if (blacklistRegex.test(t)) return false;

  // 2. 總經、央行、大宗原料、債券、利率、半導體或實體產業關鍵字白名單
  const macroKeywordsRegex = /fed|聯準會|降息|升息|利率|公債|美債|國債|殖利率|利差|通膨|cpi|pce|ppi|物價|非農|就業|失業|薪資|工資|美元|dxy|匯率|台幣|出口|外銷|進出口|貿易|鋼鐵|高爐|鐵礦|熱軋|中鋼|動力煤|煤炭|銅價|銅博士|原油|油價|wti|布蘭特|金價|黃金|台積電|tsmc|晶圓|半導體|費半|sox|輝達|nvidia|ai晶片|伺服器|資本支出|capex|大盤|加權|台股|美股|標普|那斯達克|道瓊|央行|ecb|歐洲央行|pmi|opec|減產|增產|關稅|制裁|柴油|天然氣|航運|bdi|散裝|貨櫃|融資|借貸/;
  return macroKeywordsRegex.test(t);
}

// 根據新聞內容生成一針見血的秘書總經傳導短評
function generateNewsCommentary(title) {
  const t = title.toLowerCase();
  if (/鐵礦|鋼鐵|高爐|熱軋|中鋼/.test(t)) {
    return '高爐原料端邊際現金成本形成剛性底線，關注亞洲鋼廠開工率與下游實體需求承接力。';
  }
  if (/煤炭|動力煤|焦煤/.test(t)) {
    return '煤焦報價直接錨定鋼廠高爐冶煉成本線，原料剛性限制了成品盤價進一步折讓空間。';
  }
  if (/原油|油價|柴油|能源|天然氣|opec/.test(t)) {
    return '大宗能源供給與地緣政治溢價直接牽動輸入型通膨預期，影響央行中性利率定價區間。';
  }
  if (/台積電|tsmc|半導體|晶片|輝達|nvidia|費半/.test(t)) {
    return '先進製程與 AI 算力資本支出維持高景氣，龍頭定價權溢價持續支撐外銷出口基本面。';
  }
  if (/聯準會|fed|鮑爾|降息|升息|fomc/.test(t)) {
    return '牽動基準利率降息節奏與短端美債定價，市場聚焦中性利率落點與實體資金借貸成本。';
  }
  if (/cpi|pce|ppi|通膨|物價/.test(t)) {
    return '通膨黏性緩解進程直接決定限制性利率退場斜率，為跨資產長天期估值提供下檔保護。';
  }
  if (/非農|就業|失業|薪資|勞動力/.test(t)) {
    return '勞動市場供需缺口收斂壓制工資螺旋上漲動能，奠定貨幣政策轉向中性的實體數據基礎。';
  }
  if (/美債|公債|殖利率|利差|10y|2y/.test(t)) {
    return '財政部赤字天量發債推升期限溢價，短端降息預期與長端融資成本剛性呈現結構性背馳。';
  }
  if (/美元|匯率|台幣|外銷|出口|貿易/.test(t)) {
    return '美元強弱直接影響跨國企業長天期再融資利息負擔，並牽動製造業出口換匯實質毛利。';
  }
  if (/銅|金屬|銅博士/.test(t)) {
    return '銅博士報價高度敏銳反映全球製造業實體資本開支，為宏觀景氣邊際榮枯先行指標。';
  }
  return '隔夜宏觀條件變動穿透實體產業定價鏈條，持續重塑全球資產配置的多空風險臨界線。';
}

// 自動判斷美歐央行與總經分類及標籤
function categorizeNews(title) {
  const t = title.toLowerCase();
  let category = 'macro';
  let tag = '#全球總經';
  let icon = '🌐';

  if (/鐵礦|鋼鐵|高爐|熱軋|中鋼|煤炭|動力煤|焦煤/.test(t)) {
    category = 'steel';
    tag = '#大宗重工';
    icon = '🏭';
  } else if (/原油|油價|wti|布蘭特|柴油|天然氣|opec/.test(t)) {
    category = 'energy';
    tag = '#能源原油';
    icon = '🛢️';
  } else if (/台積電|tsmc|晶圓|半導體|費半|sox|輝達|nvidia|ai/.test(t)) {
    category = 'tech';
    tag = '#科技半導體';
    icon = '💎';
  } else if (/美元|匯率|台幣|出口|外銷|進出口|貿易|關稅/.test(t)) {
    category = 'trade';
    tag = '#外銷匯率';
    icon = '💱';
  } else if (/聯準會|fed|鮑爾|fomc|降息|升息|利率決策|點陣圖/.test(t)) {
    category = 'fed';
    tag = '#Fed聯準會';
    icon = '🏛️';
  } else if (/cpi|pce|ppi|通膨|物價|通縮|生活成本/.test(t)) {
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

  const relatedIndicators = extractRelatedIndicators(title);
  const commentary = generateNewsCommentary(title);
  return { category, tag, icon, relatedIndicators, commentary };
}

// 1. 抓取 Yahoo 股市國際總經與焦點新聞 (具備 100% 直接文章原生 URL)
function fetchYahooMacroNews() {
  return new Promise((resolve) => {
    const urls = [
      'https://tw.stock.yahoo.com/rss?category=intl-markets',
      'https://tw.stock.yahoo.com/rss?category=headline'
    ];
    let completed = 0;
    const allItems = [];

    urls.forEach(url => {
      https.get(url, { timeout: 4500, headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        if (res.statusCode !== 200) {
          completed++;
          if (completed === urls.length) resolve(allItems);
          return;
        }
        let rawData = '';
        res.on('data', (c) => { rawData += c; });
        res.on('end', () => {
          try {
            const itemRegex = /<item>[\s\S]*?<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>[\s\S]*?<link>([\s\S]*?)<\/link>[\s\S]*?<pubDate>([\s\S]*?)<\/pubDate>[\s\S]*?<\/item>/gi;
            let match;
            while ((match = itemRegex.exec(rawData))) {
              const title = match[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"').trim();
              const link = match[2].trim();
              const pubDateStr = match[3].trim();
              if (title && title.length >= 8 && link.startsWith('http')) {
                if (!isRelevantMacroNews(title)) continue;
                const pubTime = new Date(pubDateStr);
                const utc8Time = new Date(pubTime.getTime() + (pubTime.getTimezoneOffset() + 480) * 60000);
                const timeStr = `${String(utc8Time.getMonth() + 1).padStart(2, '0')}/${String(utc8Time.getDate()).padStart(2, '0')} ${String(utc8Time.getHours()).padStart(2, '0')}:${String(utc8Time.getMinutes()).padStart(2, '0')}`;
                const { category, tag, icon, relatedIndicators, commentary } = categorizeNews(title);
                allItems.push({
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
                  relatedIndicators,
                  commentary,
                  aiPrompt: `請針對最新重大總經與央行新聞「${title}」深入剖析其對聯準會利率決策、美債殖利率曲線、通膨定價及全球跨資產之連鎖傳導影響`
                });
              }
            }
          } catch (e) {}
          completed++;
          if (completed === urls.length) resolve(allItems);
        });
      }).on('error', () => {
        completed++;
        if (completed === urls.length) resolve(allItems);
      }).on('timeout', function() {
        this.destroy();
        completed++;
        if (completed === urls.length) resolve(allItems);
      });
    });
  });
}

// 2. 抓取 鉅亨網 (Cnyes) 焦點與國際政經新聞 (具備 100% 直接文章原生 URL)
function fetchCnyesMacroNews() {
  return new Promise((resolve) => {
    const urls = [
      'https://news.cnyes.com/api/v3/news/category/headline?limit=50',
      'https://news.cnyes.com/api/v3/news/category/international?limit=50'
    ];
    let completed = 0;
    const allItems = [];

    urls.forEach(url => {
      https.get(url, { timeout: 4500, headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        if (res.statusCode !== 200) {
          completed++;
          if (completed === urls.length) resolve(allItems);
          return;
        }
        let rawData = '';
        res.on('data', (c) => { rawData += c; });
        res.on('end', () => {
          try {
            const json = JSON.parse(rawData);
            const raw = json.items?.data || [];
            raw.forEach(it => {
              const title = (it.title || '').trim();
              if (title && title.length >= 8 && it.newsId) {
                if (!isRelevantMacroNews(title)) return;
                const pubTime = new Date(it.publishAt * 1000);
                const utc8Time = new Date(pubTime.getTime() + (pubTime.getTimezoneOffset() + 480) * 60000);
                const timeStr = `${String(utc8Time.getMonth() + 1).padStart(2, '0')}/${String(utc8Time.getDate()).padStart(2, '0')} ${String(utc8Time.getHours()).padStart(2, '0')}:${String(utc8Time.getMinutes()).padStart(2, '0')}`;
                const { category, tag, icon, relatedIndicators, commentary } = categorizeNews(title);
                allItems.push({
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
                  relatedIndicators,
                  commentary,
                  aiPrompt: `請針對最新重大總經與央行新聞「${title}」深入剖析其對聯準會利率決策、美債殖利率曲線、通膨定價及全球跨資產之連鎖傳導影響`
                });
              }
            });
          } catch (e) {}
          completed++;
          if (completed === urls.length) resolve(allItems);
        });
      }).on('error', () => {
        completed++;
        if (completed === urls.length) resolve(allItems);
      }).on('timeout', function() {
        this.destroy();
        completed++;
        if (completed === urls.length) resolve(allItems);
      });
    });
  });
}

// 3. 抓取 經濟日報 (UDN) 國際財經與總經原生新聞 (具備 100% 直接文章原生 URL)
function fetchUdnMacroNews() {
  return new Promise((resolve) => {
    const urls = [
      'https://money.udn.com/rssfeed/news/1001/5588', // 國際要聞
      'https://money.udn.com/rssfeed/news/1001/5589'  // 國際焦點
    ];
    let completed = 0;
    const allItems = [];

    urls.forEach(url => {
      https.get(url, { timeout: 4500, headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        if (res.statusCode !== 200) {
          completed++;
          if (completed === urls.length) resolve(allItems);
          return;
        }
        let rawData = '';
        res.on('data', (c) => { rawData += c; });
        res.on('end', () => {
          try {
            const itemRegex = /<item>[\s\S]*?<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>[\s\S]*?<link>([\s\S]*?)<\/link>[\s\S]*?<pubDate>([\s\S]*?)<\/pubDate>[\s\S]*?<\/item>/gi;
            let match;
            while ((match = itemRegex.exec(rawData))) {
              let title = match[1].replace(/<!\[CDATA\[/g, '').replace(/\]\]>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').trim();
              const link = match[2].trim();
              const pubDateStr = match[3].trim();
              if (title && title.length >= 8 && link.startsWith('http')) {
                if (!isRelevantMacroNews(title)) continue;
                const pubTime = new Date(pubDateStr);
                const utc8Time = new Date(pubTime.getTime() + (pubTime.getTimezoneOffset() + 480) * 60000);
                const timeStr = `${String(utc8Time.getMonth() + 1).padStart(2, '0')}/${String(utc8Time.getDate()).padStart(2, '0')} ${String(utc8Time.getHours()).padStart(2, '0')}:${String(utc8Time.getMinutes()).padStart(2, '0')}`;
                const { category, tag, icon, relatedIndicators, commentary } = categorizeNews(title);
                allItems.push({
                  id: Buffer.from(title).toString('base64').substring(0, 16),
                  title,
                  source: '經濟日報',
                  link,
                  pubDate: pubDateStr,
                  timeDisplay: timeStr,
                  timestamp: isNaN(pubTime.getTime()) ? Date.now() : pubTime.getTime(),
                  category,
                  tag,
                  icon,
                  relatedIndicators,
                  commentary,
                  aiPrompt: `請針對最新重大總經與央行新聞「${title}」深入剖析其對聯準會利率決策、美債殖利率曲線、通膨定價及全球跨資產之連鎖傳導影響`
                });
              }
            }
          } catch (e) {}
          completed++;
          if (completed === urls.length) resolve(allItems);
        });
      }).on('error', () => {
        completed++;
        if (completed === urls.length) resolve(allItems);
      }).on('timeout', function() {
        this.destroy();
        completed++;
        if (completed === urls.length) resolve(allItems);
      });
    });
  });
}

// 核心更新與儲存函式 (三大權威財經源並行匯聚，徹底淘汰任何 Google 搜尋假連結)
async function refreshAndStoreNews() {
  loadStoredNews();

  // 清洗舊庫存：徹底移除任何包含 google.com/search 或無效連結的歷史項目，且排除非宏觀雜訊
  inMemoryNews = inMemoryNews.filter(n => n.link && !n.link.includes('google.com/search') && n.link.startsWith('http') && n.link !== '#' && isRelevantMacroNews(n.title));
  
  // 補齊可能缺失之秘書短評
  inMemoryNews.forEach(n => {
    if (!n.commentary) {
      n.commentary = generateNewsCommentary(n.title);
    }
  });

  const [yahooNews, cnyesNews, udnNews] = await Promise.all([
    fetchYahooMacroNews(),
    fetchCnyesMacroNews(),
    fetchUdnMacroNews()
  ]);

  const allFetched = [...yahooNews, ...cnyesNews, ...udnNews].filter(n => n.link && !n.link.includes('google.com/search') && n.link.startsWith('http') && isRelevantMacroNews(n.title));

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

async function newsHandler(req, res) {
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
    const indicatorQuery = req.query?.indicator;

    let filtered = inMemoryNews;
    if (category !== 'all') {
      filtered = filtered.filter(n => n.category === category);
    }

    // 依指定總經指標代碼過濾（支援多指標逗號分隔，如 ?indicator=US_CPI,US_10Y）
    if (indicatorQuery) {
      const targetList = indicatorQuery.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
      filtered = filtered.filter(n => Array.isArray(n.relatedIndicators) && n.relatedIndicators.some(ind => targetList.includes(ind)));
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
      indicator: indicatorQuery || null,
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

// 依指定總經指標群組獲取關聯重大新聞（供多維指標研討室與 AI 連動調用）
function getNewsForIndicators(indicators, limit = 5) {
  if (!Array.isArray(indicators) || indicators.length === 0) return inMemoryNews.slice(0, limit);
  const target = indicators.map(s => s.trim().toUpperCase());
  const matched = inMemoryNews.filter(n => Array.isArray(n.relatedIndicators) && n.relatedIndicators.some(i => target.includes(i)));
  if (matched.length >= limit) return matched.slice(0, limit);
  const matchedIds = new Set(matched.map(n => n.id));
  const remaining = inMemoryNews.filter(n => !matchedIds.has(n.id));
  return [...matched, ...remaining].slice(0, limit);
}

module.exports = newsHandler;
module.exports.getLatestMacroNews = getLatestMacroNews;
module.exports.getNewsForIndicators = getNewsForIndicators;
module.exports.extractRelatedIndicators = extractRelatedIndicators;
module.exports.refreshAndStoreNews = refreshAndStoreNews;
module.exports.isRelevantMacroNews = isRelevantMacroNews;
