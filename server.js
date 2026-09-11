const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

// 解析 JSON 與 URL-encoded 請求主體
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 跨域 CORS 與快取標頭中介軟體
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('X-Voice-Engine', 'Neural-Dual-Anchor-v2.1');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// 掛載 API 模組
const lineWebhookHandler = require('./api/line-webhook');
const collectorHandler = require('./api/collector');
const quoteHandler = require('./api/quote');
const analyzeHandler = require('./api/analyze');
const morningBroadcastHandler = require('./api/morning-broadcast');
const alertCheckHandler = require('./api/alert-check');
const topicsHandler = require('./api/topics');
const calendarHandler = require('./api/calendar');
const calendarSyncModule = require('./api/calendar-sync');
const newsHandler = require('./api/news');
const recordsHandler = require('./api/records');
const macroVaultHandler = require('./api/macro-vault');

// 註冊 API 路由
app.all('/api/line-webhook', (req, res) => lineWebhookHandler(req, res));
app.all('/api/collector', (req, res) => collectorHandler(req, res));
app.all('/api/quote', (req, res) => quoteHandler(req, res));
app.all('/api/analyze', (req, res) => analyzeHandler(req, res));
app.all('/api/records', (req, res) => recordsHandler(req, res));
app.all('/api/macro-vault', (req, res) => macroVaultHandler(req, res));
app.all('/api/topics', (req, res) => topicsHandler(req, res));
app.all('/api/calendar', (req, res) => calendarHandler(req, res));
app.all('/api/calendar-sync', (req, res) => calendarSyncModule(req, res));
app.all('/api/news', (req, res) => newsHandler(req, res));
app.all('/api/morning-broadcast', (req, res) => morningBroadcastHandler(req, res));
app.all('/api/cron-daily', (req, res) => morningBroadcastHandler(req, res));
app.all('/api/alert-check', (req, res) => alertCheckHandler(req, res));

// 靜態資源目錄
app.use(express.static(path.join(__dirname, 'public')));

// 根路由首頁
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 健康檢查端點（Google Cloud Run 健康探測專用）
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Render 免費版 24H 防休眠保活心跳（每 10 分鐘自主向外部公開網址發送 Health 探測，突破 15 分鐘無請求休眠機制）
function startKeepAlive() {
  const PING_INTERVAL_MS = 10 * 60 * 1000; // 每 10 分鐘（Render 15 分鐘無流量休眠）
  const rawUrl = process.env.RENDER_EXTERNAL_URL || 'https://eco-line-assistant.onrender.com';
  const targetUrl = rawUrl.replace(/\/$/, '') + '/health';

  console.log(`🛡️ [Keep-Alive] 24H 在線守護引擎已啟動 (每 10 分鐘自動心跳探測: ${targetUrl})`);

  // 伺服器啟動 15 秒後先執行第一次自我探測
  setTimeout(async () => {
    try {
      const res = await fetch(targetUrl);
      console.log(`💓 [Keep-Alive] 初始在線心跳探測成功: HTTP ${res.status}`);
    } catch (err) {
      console.warn(`💓 [Keep-Alive] 初始心跳警告:`, err.message);
    }
  }, 15 * 1000);

  // 定期每 10 分鐘循環心跳探測
  setInterval(async () => {
    try {
      const res = await fetch(targetUrl);
      const timeStr = new Date().toLocaleTimeString('zh-TW', { timeZone: 'Asia/Taipei' });
      console.log(`💓 [Keep-Alive] 24H 在線心跳維持成功: HTTP ${res.status} (${timeStr})`);
    } catch (err) {
      console.warn(`💓 [Keep-Alive] 心跳探測警告:`, err.message);
    }
  }, PING_INTERVAL_MS);
}

// 啟動 HTTP 伺服器
app.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`🚀 宏觀全球智庫 · 總經分析伺服器已成功啟動！`);
  console.log(`📡 監聽地址: http://0.0.0.0:${PORT}`);
  console.log(`🌐 環境: ${process.env.NODE_ENV || 'production'}`);
  console.log(`⏰ 時間: ${new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })} (台北時間)`);
  console.log(`====================================================`);
  try {
    calendarSyncModule.setupCalendarCronTimer();
  } catch (err) {
    console.error('Failed to setup calendar cron timer:', err);
  }
  try {
    startKeepAlive();
  } catch (err) {
    console.error('Failed to start keep-alive:', err);
  }
});
