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

// 註冊 API 路由
app.all('/api/line-webhook', (req, res) => lineWebhookHandler(req, res));
app.all('/api/collector', (req, res) => collectorHandler(req, res));
app.all('/api/quote', (req, res) => quoteHandler(req, res));
app.all('/api/analyze', (req, res) => analyzeHandler(req, res));
app.all('/api/morning-broadcast', (req, res) => morningBroadcastHandler(req, res));
app.all('/api/cron-daily', (req, res) => morningBroadcastHandler(req, res));

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

// 啟動 HTTP 伺服器
app.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`🚀 宏觀全球智庫 · 總經分析伺服器已成功啟動！`);
  console.log(`📡 監聽地址: http://0.0.0.0:${PORT}`);
  console.log(`🌐 環境: ${process.env.NODE_ENV || 'production'}`);
  console.log(`⏰ 時間: ${new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })} (台北時間)`);
  console.log(`====================================================`);
});
