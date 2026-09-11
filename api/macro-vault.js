const fs = require('fs');
const path = require('path');

const VAULT_FILE_PATH = path.join(__dirname, '..', 'data', 'macro_vault.json');

// 24 大關鍵總經與跨資產指標元數據庫（涵蓋 6 大維度）
const METRIC_DEFINITIONS = {
  // 1. 美國通膨指標
  'US_CPI': {
    id: 'US_CPI',
    name: '美國 CPI 通膨年增率',
    category: 'inflation',
    categoryZh: '通膨指標',
    unit: '%',
    source: 'FRED (CPIAUCSL)',
    defaultVal: 3.4,
    defaultPeriod: '2026-07',
    defaultRelease: '08/12',
    description: '衡量美國城市消費者日常生活商品與服務之整體物價年變動率'
  },
  'US_CORE_CPI': {
    id: 'US_CORE_CPI',
    name: '美國核心 CPI 通膨年增率',
    category: 'inflation',
    categoryZh: '通膨指標',
    unit: '%',
    source: 'FRED (CPILFESL)',
    defaultVal: 3.3,
    defaultPeriod: '2026-07',
    defaultRelease: '08/12',
    description: '排除波動劇烈之食品與能源項，反映物價結構性核心黏性'
  },
  'US_PCE': {
    id: 'US_PCE',
    name: '美國核心 PCE 物價指數年率',
    category: 'inflation',
    categoryZh: '通膨指標',
    unit: '%',
    source: 'BEA / FRED (PCEPILFE)',
    defaultVal: 3.3,
    defaultPeriod: '2026-07',
    defaultRelease: '08/28',
    description: '聯準會 FOMC 最重視之長期通膨官方定價參考錨點'
  },
  'US_PPI': {
    id: 'US_PPI',
    name: '美國 PPI 生產者物價年率',
    category: 'inflation',
    categoryZh: '通膨指標',
    unit: '%',
    source: 'BLS (PPIACO)',
    defaultVal: 2.8,
    defaultPeriod: '2026-07',
    defaultRelease: '08/14',
    description: '批發端出廠物價，為消費者端通膨之上游先行預警指標'
  },

  // 2. 就業市場與消費活力
  'US_NFP': {
    id: 'US_NFP',
    name: '美國季調後非農就業變動',
    category: 'labor',
    categoryZh: '就業消費',
    unit: '萬人',
    source: 'BLS / FRED (PAYEMS)',
    defaultVal: -2.3,
    defaultPeriod: '2026-08',
    defaultRelease: '09/04',
    description: '美國非農業聘僱淨增減人數，衡量勞動力市場邊際冷暖'
  },
  'US_UR': {
    id: 'US_UR',
    name: '美國官方失業率 (U3)',
    category: 'labor',
    categoryZh: '就業消費',
    unit: '%',
    source: 'BLS / FRED (UNRATE)',
    defaultVal: 4.1,
    defaultPeriod: '2026-08',
    defaultRelease: '09/04',
    description: '官方勞動力失業比率，觸發薩姆規則與預防性降息關鍵'
  },
  'US_RETAIL': {
    id: 'US_RETAIL',
    name: '美國零售銷售月增率',
    category: 'labor',
    categoryZh: '就業消費',
    unit: '%',
    source: 'Census Bureau (RSAFS)',
    defaultVal: 0.5,
    defaultPeriod: '2026-07',
    defaultRelease: '08/15',
    description: '衡量佔美國 GDP 70% 之終端消費支出動能強度'
  },

  // 3. 利率、殖利率曲線與貨幣政策
  'US_FOMC': {
    id: 'US_FOMC',
    name: '聯邦基金基準利率 (Fed Funds)',
    category: 'monetary',
    categoryZh: '利率政策',
    unit: '%',
    source: 'Federal Reserve (FEDFUNDS)',
    defaultVal: 3.65,
    defaultPeriod: '2026-08',
    defaultRelease: '09/01',
    description: '聯準會貨幣政策核心目標利率區間之有效基準'
  },
  'US_10Y': {
    id: 'US_10Y',
    name: '美國 10Y 公債基準殖利率',
    category: 'monetary',
    categoryZh: '利率政策',
    unit: '%',
    source: 'US Treasury / FRED (DGS10)',
    defaultVal: 4.704,
    defaultPeriod: '2026-09',
    defaultRelease: '09/10',
    description: '全球無風險資產定價之錨，實體企業長天期融資成本基準'
  },
  'US_2Y': {
    id: 'US_2Y',
    name: '美國 2Y 公債政策敏感殖利率',
    category: 'monetary',
    categoryZh: '利率政策',
    unit: '%',
    source: 'US Treasury / FRED (DGS2)',
    defaultVal: 3.961,
    defaultPeriod: '2026-09',
    defaultRelease: '09/10',
    description: '對聯準會未來 1~2 年升降息路徑最敏感之短端市場定價'
  },
  'US_SPREAD': {
    id: 'US_SPREAD',
    name: '美債 10Y-2Y 經典殖利率利差',
    category: 'monetary',
    categoryZh: '利率政策',
    unit: '%',
    source: 'US Treasury Yield Curve',
    defaultVal: 0.743,
    defaultPeriod: '2026-09',
    defaultRelease: '09/10',
    description: '10Y 減 2Y 利率差，正斜率擴大為熊市走陡，負數為倒掛警訊'
  },
  'MARKET_DXY': {
    id: 'MARKET_DXY',
    name: '美元指數 (DXY)',
    category: 'monetary',
    categoryZh: '利率政策',
    unit: '點',
    source: 'ICE (DX-Y.NYB)',
    defaultVal: 98.75,
    defaultPeriod: '2026-09',
    defaultRelease: '09/11',
    description: '衡量美元對一籃子六大主要貨幣之整體全球流動性溢價'
  },

  // 4. 全球製造業與對外貿易出口
  'TW_EXPORT': {
    id: 'TW_EXPORT',
    name: '台灣海關出口年增率',
    category: 'trade',
    categoryZh: '貿易外銷',
    unit: '%',
    source: '中華民國財政部統計處',
    defaultVal: 18.5,
    defaultPeriod: '2026-08',
    defaultRelease: '09/08',
    description: '反映台灣資通訊電子與傳統貨品之全球實體出貨動能'
  },
  'CN_PMI': {
    id: 'CN_PMI',
    name: '中國官方製造業 PMI',
    category: 'trade',
    categoryZh: '貿易外銷',
    unit: '榮枯線50',
    source: '中國國家統計局',
    defaultVal: 49.4,
    defaultPeriod: '2026-08',
    defaultRelease: '08/31',
    description: '衡量全球最大製造業實體工廠開工與新訂單之景氣榮枯'
  },

  // 5. 大宗工業原料、能源與貴金屬
  'COMMODITY_IRON_ORE': {
    id: 'COMMODITY_IRON_ORE',
    name: '國際鐵礦砂現貨 62% (CFR)',
    category: 'commodity',
    categoryZh: '大宗重工',
    unit: '美元/噸',
    source: 'SGX / Fastmarkets (TIO=F)',
    defaultVal: 95.34,
    defaultPeriod: '2026-09',
    defaultRelease: '09/11',
    description: '全球高爐煉鋼之命脈原料，95~100 美元為非主流邊際礦成本底線'
  },
  'COMMODITY_COAL': {
    id: 'COMMODITY_COAL',
    name: '國際動力煤現貨 (Newcastle Coal)',
    category: 'commodity',
    categoryZh: '大宗重工',
    unit: '美元/噸',
    source: 'Newcastle Benchmark',
    defaultVal: 124.50,
    defaultPeriod: '2026-09',
    defaultRelease: '09/11',
    description: '亞太重工業實體發電與鋼鐵焦化重要能量基準'
  },
  'COMMODITY_COPPER': {
    id: 'COMMODITY_COPPER',
    name: '國際銅博士 (High Grade Copper)',
    category: 'commodity',
    categoryZh: '大宗重工',
    unit: '美元/磅',
    source: 'COMEX (HG=F)',
    defaultVal: 6.604,
    defaultPeriod: '2026-09',
    defaultRelease: '09/11',
    description: '電網基建、AI 伺服器散熱與實體景氣擴張最敏感領先晴雨表'
  },
  'COMMODITY_OIL': {
    id: 'COMMODITY_OIL',
    name: '紐約輕原油期貨 (WTI)',
    category: 'commodity',
    categoryZh: '大宗重工',
    unit: '美元/桶',
    source: 'NYMEX (CL=F)',
    defaultVal: 85.69,
    defaultPeriod: '2026-09',
    defaultRelease: '09/11',
    description: '全球大宗工業運輸與實體化學基礎能源成本定價'
  },
  'COMMODITY_GOLD': {
    id: 'COMMODITY_GOLD',
    name: '國際黃金現貨 (Gold)',
    category: 'commodity',
    categoryZh: '大宗重工',
    unit: '美元/盎司',
    source: 'COMEX (GC=F)',
    defaultVal: 4712.3,
    defaultPeriod: '2026-09',
    defaultRelease: '09/11',
    description: '對沖全球主權債務擴張與法幣購買力稀釋之終極硬資產'
  },

  // 6. 科技權值龍頭與市場恐慌指數
  'MARKET_TSMC': {
    id: 'MARKET_TSMC',
    name: '台積電現股 (2330.TW)',
    category: 'equity',
    categoryZh: '科技權值',
    unit: '元',
    source: 'TWSE (2330.TW)',
    defaultVal: 2365,
    defaultPeriod: '2026-09',
    defaultRelease: '09/11',
    description: '全球先進製程晶圓代工龍頭，AI 算力基礎建設核心定價權'
  },
  'MARKET_NVDA': {
    id: 'MARKET_NVDA',
    name: '輝達 NVIDIA (NVDA)',
    category: 'equity',
    categoryZh: '科技權值',
    unit: '美元',
    source: 'NASDAQ (NVDA)',
    defaultVal: 208.48,
    defaultPeriod: '2026-09',
    defaultRelease: '09/11',
    description: '全球 GPU 算力架構與雲端巨頭 (CSP) 資本支出總指標'
  },
  'MARKET_SOX': {
    id: 'MARKET_SOX',
    name: '費城半導體指數 (^SOX)',
    category: 'equity',
    categoryZh: '科技權值',
    unit: '點',
    source: 'PHLX (^SOX)',
    defaultVal: 11423.2,
    defaultPeriod: '2026-09',
    defaultRelease: '09/11',
    description: '全球半導體硬體製造與設備景氣風向標'
  },
  'MARKET_TAIEX': {
    id: 'MARKET_TAIEX',
    name: '台股加權指數 (^TWII)',
    category: 'equity',
    categoryZh: '科技權值',
    unit: '點',
    source: 'TWSE (^TWII)',
    defaultVal: 44369,
    defaultPeriod: '2026-09',
    defaultRelease: '09/11',
    description: '高度連動全球科技供應鏈與外資資本流向之核心股指'
  },
  'MARKET_VIX': {
    id: 'MARKET_VIX',
    name: '美股 VIX 恐慌指數',
    category: 'equity',
    categoryZh: '科技權值',
    unit: '點',
    source: 'CBOE (^VIX)',
    defaultVal: 15.85,
    defaultPeriod: '2026-09',
    defaultRelease: '09/11',
    description: 'S&P 500 選擇權隱含波動率，20 以下為平穩，30 以上為市場極度恐慌'
  }
};

// 內部記憶體資料快取
let inMemoryVault = null;
let lastSaveTime = 0;
const MIN_SAVE_INTERVAL_MS = 3 * 60 * 1000; // 最少 3 分鐘才落盤一次防 I/O 頻繁

// 初始化或讀取既有歸檔庫
function initOrLoadVault() {
  if (inMemoryVault) return inMemoryVault;

  try {
    if (fs.existsSync(VAULT_FILE_PATH)) {
      const content = fs.readFileSync(VAULT_FILE_PATH, 'utf8');
      inMemoryVault = JSON.parse(content);
    }
  } catch (e) {
    console.warn('[Macro Vault] 讀取既有數據庫失敗，初始化預設結構:', e.message);
  }

  if (!inMemoryVault || typeof inMemoryVault !== 'object' || !inMemoryVault.metrics) {
    inMemoryVault = {
      version: '2.4.0',
      system: 'Macro Intelligence Vault',
      lastUpdated: new Date().toISOString(),
      totalRecords: 0,
      metrics: {},
      timelineSnapshots: []
    };

    // 預先以指標定義進行初始化
    Object.keys(METRIC_DEFINITIONS).forEach(k => {
      const def = METRIC_DEFINITIONS[k];
      inMemoryVault.metrics[k] = {
        id: def.id,
        name: def.name,
        category: def.category,
        categoryZh: def.categoryZh,
        unit: def.unit,
        source: def.source,
        latestValue: def.defaultVal,
        latestPeriod: def.defaultPeriod,
        latestReleaseDate: def.defaultRelease,
        description: def.description,
        lastUpdated: new Date().toISOString(),
        history: [
          { period: '2026-03', value: def.defaultVal * 0.98, releaseDate: '04/10' },
          { period: '2026-04', value: def.defaultVal * 0.99, releaseDate: '05/12' },
          { period: '2026-05', value: def.defaultVal * 1.01, releaseDate: '06/11' },
          { period: '2026-06', value: def.defaultVal * 1.00, releaseDate: '07/14' },
          { period: '2026-07', value: def.defaultVal * 1.02, releaseDate: '08/12' },
          { period: def.defaultPeriod, value: def.defaultVal, releaseDate: def.defaultRelease }
        ]
      };
    });

    saveVaultToDisk(true);
  }

  return inMemoryVault;
}

// 儲存至磁碟
function saveVaultToDisk(force = false) {
  if (!inMemoryVault) return;
  const now = Date.now();
  if (!force && (now - lastSaveTime < MIN_SAVE_INTERVAL_MS)) {
    return;
  }

  try {
    const dir = path.dirname(VAULT_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    inMemoryVault.lastUpdated = new Date().toISOString();
    fs.writeFileSync(VAULT_FILE_PATH, JSON.stringify(inMemoryVault, null, 2), 'utf8');
    lastSaveTime = now;
  } catch (e) {
    console.warn('[Macro Vault] 儲存失敗:', e.message);
  }
}

// 記錄單項總經數據
function recordMacroMetric(metricId, data) {
  const vault = initOrLoadVault();
  if (!vault.metrics[metricId]) {
    const def = METRIC_DEFINITIONS[metricId] || {
      id: metricId,
      name: metricId,
      category: 'general',
      categoryZh: '綜合指標',
      unit: '',
      source: 'External System'
    };
    vault.metrics[metricId] = {
      ...def,
      latestValue: data.value,
      latestPeriod: data.period || '2026-當期',
      latestReleaseDate: data.releaseDate || '近期',
      lastUpdated: new Date().toISOString(),
      history: []
    };
  }

  const m = vault.metrics[metricId];
  if (data.value !== undefined && data.value !== null) {
    m.latestValue = typeof data.value === 'number' ? data.value : parseFloat(data.value);
  }
  if (data.period) m.latestPeriod = data.period;
  if (data.releaseDate) m.latestReleaseDate = data.releaseDate;
  if (data.unit) m.unit = data.unit;
  if (data.source) m.source = data.source;
  m.lastUpdated = new Date().toISOString();

  // 若歷史陣列存在，更新或追加當期走勢
  if (data.history && Array.isArray(data.history)) {
    m.history = data.history;
  } else if (data.period && m.latestValue !== undefined) {
    const existingIdx = m.history.findIndex(h => h.period === data.period);
    if (existingIdx >= 0) {
      m.history[existingIdx].value = m.latestValue;
      if (data.releaseDate) m.history[existingIdx].releaseDate = data.releaseDate;
    } else {
      m.history.push({
        period: data.period,
        value: m.latestValue,
        releaseDate: data.releaseDate || m.latestReleaseDate
      });
      if (m.history.length > 18) m.history.shift(); // 保留近 18 期
    }
  }

  saveVaultToDisk();
  return m;
}

// 自動記錄從 FRED 抓取到的最新即時趨勢數據
function recordFredTrends(fredTrends) {
  if (!fredTrends || typeof fredTrends !== 'object') return;
  const vault = initOrLoadVault();

  // 1. 🇺🇸 CPI
  if (fredTrends.US_CPI && fredTrends.US_CPI.history?.length > 0) {
    const hist = fredTrends.US_CPI.history;
    const last = hist[hist.length - 1];
    recordMacroMetric('US_CPI', {
      value: last.val,
      period: `2026-${last.label}`,
      releaseDate: fredTrends.US_CPI.latestReleaseDate || '08/12',
      history: hist.map(h => ({ period: `2026-${h.label}`, value: h.val, releaseDate: fredTrends.US_CPI.latestReleaseDate }))
    });
  }

  // 2. 🇺🇸 Core CPI
  if (fredTrends.US_CORE_CPI && fredTrends.US_CORE_CPI.history?.length > 0) {
    const hist = fredTrends.US_CORE_CPI.history;
    const last = hist[hist.length - 1];
    recordMacroMetric('US_CORE_CPI', {
      value: last.val,
      period: `2026-${last.label}`,
      releaseDate: fredTrends.US_CORE_CPI.latestReleaseDate || '08/12',
      history: hist.map(h => ({ period: `2026-${h.label}`, value: h.val, releaseDate: fredTrends.US_CORE_CPI.latestReleaseDate }))
    });
  }

  // 3. 🇺🇸 UR
  if (fredTrends.US_UR && fredTrends.US_UR.history?.length > 0) {
    const hist = fredTrends.US_UR.history;
    const last = hist[hist.length - 1];
    recordMacroMetric('US_UR', {
      value: last.val,
      period: `2026-${last.label}`,
      releaseDate: fredTrends.US_UR.latestReleaseDate || '09/04',
      history: hist.map(h => ({ period: `2026-${h.label}`, value: h.val, releaseDate: fredTrends.US_UR.latestReleaseDate }))
    });
  }

  // 4. 🇺🇸 NFP
  if (fredTrends.US_NFP && fredTrends.US_NFP.history?.length > 0) {
    const hist = fredTrends.US_NFP.history;
    const last = hist[hist.length - 1];
    recordMacroMetric('US_NFP', {
      value: last.val,
      period: `2026-${last.label}`,
      releaseDate: fredTrends.US_NFP.latestReleaseDate || '09/04',
      history: hist.map(h => ({ period: `2026-${h.label}`, value: h.val, releaseDate: fredTrends.US_NFP.latestReleaseDate }))
    });
  }

  // 5. 🇺🇸 PCE
  if (fredTrends.US_PCE && fredTrends.US_PCE.history?.length > 0) {
    const hist = fredTrends.US_PCE.history;
    const last = hist[hist.length - 1];
    recordMacroMetric('US_PCE', {
      value: last.val,
      period: `2026-${last.label}`,
      releaseDate: fredTrends.US_PCE.latestReleaseDate || '08/28',
      history: hist.map(h => ({ period: `2026-${h.label}`, value: h.val, releaseDate: fredTrends.US_PCE.latestReleaseDate }))
    });
  }

  // 6. 🇺🇸 FOMC Rate
  if (fredTrends.US_FOMC && fredTrends.US_FOMC.history?.length > 0) {
    const hist = fredTrends.US_FOMC.history;
    const last = hist[hist.length - 1];
    recordMacroMetric('US_FOMC', {
      value: last.val,
      period: `2026-${last.label}`,
      releaseDate: fredTrends.US_FOMC.latestReleaseDate || '09/01',
      history: hist.map(h => ({ period: `2026-${h.label}`, value: h.val, releaseDate: fredTrends.US_FOMC.latestReleaseDate }))
    });
  }

  // 7. 🇺🇸 10Y
  if (fredTrends.US_10Y && fredTrends.US_10Y.history?.length > 0) {
    const hist = fredTrends.US_10Y.history;
    const last = hist[hist.length - 1];
    recordMacroMetric('US_10Y', {
      value: last.val,
      period: `2026-${last.label}`,
      releaseDate: fredTrends.US_10Y.latestReleaseDate || '近期',
      history: hist.map(h => ({ period: `2026-${h.label}`, value: h.val, releaseDate: h.label }))
    });
  }

  // 8. 🇺🇸 2Y
  if (fredTrends.US_2Y && fredTrends.US_2Y.history?.length > 0) {
    const hist = fredTrends.US_2Y.history;
    const last = hist[hist.length - 1];
    recordMacroMetric('US_2Y', {
      value: last.val,
      period: `2026-${last.label}`,
      releaseDate: fredTrends.US_2Y.latestReleaseDate || '近期',
      history: hist.map(h => ({ period: `2026-${h.label}`, value: h.val, releaseDate: h.label }))
    });
  }

  // 9. 🇺🇸 SPREAD
  if (fredTrends.US_SPREAD && fredTrends.US_SPREAD.history?.length > 0) {
    const hist = fredTrends.US_SPREAD.history;
    const last = hist[hist.length - 1];
    recordMacroMetric('US_SPREAD', {
      value: last.val,
      period: `2026-${last.label}`,
      releaseDate: fredTrends.US_SPREAD.latestReleaseDate || '近期',
      history: hist.map(h => ({ period: `2026-${h.label}`, value: h.val, releaseDate: h.label }))
    });
  }
}

// 自動記錄從 collector 快照抓取的市場實時行情
function recordCollectorSnapshot(latestSnapshot) {
  if (!latestSnapshot || typeof latestSnapshot !== 'object') return;
  const now = new Date();
  const dateStr = `${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;
  const periodStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  if (latestSnapshot.us10y) {
    recordMacroMetric('US_10Y', { value: latestSnapshot.us10y, period: periodStr, releaseDate: dateStr });
  }
  if (latestSnapshot.us2y) {
    recordMacroMetric('US_2Y', { value: latestSnapshot.us2y, period: periodStr, releaseDate: dateStr });
  }
  if (latestSnapshot.spread_10y2y !== undefined) {
    recordMacroMetric('US_SPREAD', { value: latestSnapshot.spread_10y2y, period: periodStr, releaseDate: dateStr });
  }
  if (latestSnapshot.dxy) {
    recordMacroMetric('MARKET_DXY', { value: latestSnapshot.dxy, period: periodStr, releaseDate: dateStr });
  }
  if (latestSnapshot.gold) {
    recordMacroMetric('COMMODITY_GOLD', { value: latestSnapshot.gold, period: periodStr, releaseDate: dateStr });
  }
  if (latestSnapshot.copper) {
    recordMacroMetric('COMMODITY_COPPER', { value: latestSnapshot.copper, period: periodStr, releaseDate: dateStr });
  }
  if (latestSnapshot.iron_ore) {
    recordMacroMetric('COMMODITY_IRON_ORE', { value: latestSnapshot.iron_ore, period: periodStr, releaseDate: dateStr });
  }
  if (latestSnapshot.coal) {
    recordMacroMetric('COMMODITY_COAL', { value: latestSnapshot.coal, period: periodStr, releaseDate: dateStr });
  }
  if (latestSnapshot.oil) {
    recordMacroMetric('COMMODITY_OIL', { value: latestSnapshot.oil, period: periodStr, releaseDate: dateStr });
  }
  if (latestSnapshot.tsmc) {
    recordMacroMetric('MARKET_TSMC', { value: latestSnapshot.tsmc, period: periodStr, releaseDate: dateStr });
  }
  if (latestSnapshot.nvda) {
    recordMacroMetric('MARKET_NVDA', { value: latestSnapshot.nvda, period: periodStr, releaseDate: dateStr });
  }
  if (latestSnapshot.sox) {
    recordMacroMetric('MARKET_SOX', { value: latestSnapshot.sox, period: periodStr, releaseDate: dateStr });
  }
  if (latestSnapshot.twii) {
    recordMacroMetric('MARKET_TAIEX', { value: latestSnapshot.twii, period: periodStr, releaseDate: dateStr });
  }
  if (latestSnapshot.vix) {
    recordMacroMetric('MARKET_VIX', { value: latestSnapshot.vix, period: periodStr, releaseDate: dateStr });
  }
}

// 取得指標詳細數據（供 AI 研討室或 Prompt 連動使用）
function getMetricsByIds(metricIds) {
  const vault = initOrLoadVault();
  if (!Array.isArray(metricIds)) return [];
  return metricIds.map(id => vault.metrics[id] || METRIC_DEFINITIONS[id] || null).filter(Boolean);
}

// 產出 CSV 格式資料（供 Google 試算表 =IMPORTDATA 調用）
function convertVaultToCsv() {
  const vault = initOrLoadVault();
  const headers = ['指標代碼 (ID)', '指標名稱', '所屬類別', '最新數值', '單位', '所屬期別', '最新發布日期', '官方權威來源', '歷史6期趨勢(舊到新)', '更新時間 (UTC+8)'];
  
  const rows = Object.keys(vault.metrics).map(k => {
    const m = vault.metrics[k];
    const histTrend = (m.history || []).map(h => `${h.period}:${h.value}`).join(' | ');
    return [
      m.id,
      `"${m.name}"`,
      `"${m.categoryZh || m.category}"`,
      m.latestValue,
      `"${m.unit || ''}"`,
      `"${m.latestPeriod || ''}"`,
      `"${m.latestReleaseDate || ''}"`,
      `"${m.source || ''}"`,
      `"${histTrend}"`,
      `"${m.lastUpdated || ''}"`
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

// HTTP API 處理器 (/api/macro-vault)
async function macroVaultHandler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const vault = initOrLoadVault();
    const format = req.query?.format;

    // 匯出 CSV 檔案
    if (format === 'csv') {
      const csvData = convertVaultToCsv();
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="macro_data_vault.csv"');
      return res.status(200).send(csvData);
    }

    // 手動觸發快照存檔 (POST)
    if (req.method === 'POST') {
      const body = req.body || {};
      if (body.metricId && body.value !== undefined) {
        const updated = recordMacroMetric(body.metricId, body);
        return res.status(200).json({ status: 'success', message: '指標已歸檔', metric: updated });
      }
    }

    // 預設返回 JSON 數據庫
    const metricsList = Object.values(vault.metrics);
    return res.status(200).json({
      status: 'success',
      system: vault.system,
      version: vault.version,
      lastUpdated: vault.lastUpdated,
      totalMetrics: metricsList.length,
      categories: [
        { id: 'inflation', name: '通膨指標', count: metricsList.filter(m => m.category === 'inflation').length },
        { id: 'labor', name: '就業消費', count: metricsList.filter(m => m.category === 'labor').length },
        { id: 'monetary', name: '利率政策', count: metricsList.filter(m => m.category === 'monetary').length },
        { id: 'trade', name: '貿易外銷', count: metricsList.filter(m => m.category === 'trade').length },
        { id: 'commodity', name: '大宗重工', count: metricsList.filter(m => m.category === 'commodity').length },
        { id: 'equity', name: '科技權值', count: metricsList.filter(m => m.category === 'equity').length }
      ],
      metrics: vault.metrics,
      metricsArray: metricsList
    });
  } catch (err) {
    console.error('[Macro Vault API Error]:', err);
    return res.status(500).json({
      status: 'error',
      error: err.message
    });
  }
}

module.exports = macroVaultHandler;
module.exports.initOrLoadVault = initOrLoadVault;
module.exports.recordMacroMetric = recordMacroMetric;
module.exports.recordFredTrends = recordFredTrends;
module.exports.recordCollectorSnapshot = recordCollectorSnapshot;
module.exports.getMetricsByIds = getMetricsByIds;
module.exports.convertVaultToCsv = convertVaultToCsv;
module.exports.METRIC_DEFINITIONS = METRIC_DEFINITIONS;
