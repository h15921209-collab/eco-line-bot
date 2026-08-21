# 經濟數據管理與 LINE 智慧分析助手 (EcoLineBot)

專為**每週經濟數據更新與宏觀研究分享員**設計的自動化助理系統。整合 SQLite 歷史資料庫、Google Gemini 大語言模型與 LINE Messaging API，實現：
1. **即時總經分析**：每週隨時一鍵產製結構化宏觀經濟簡報與股債匯市影響評估。
2. **歷史數據留存**：完整記錄每一期公佈值、市場預期、前值與備註，自動生成趨勢序列。
3. **LINE 快捷錄入**：每週五最新數據發布時，直接在 LINE 對話框輸入簡短指令即可入庫。

---

## 目錄結構

```
eco_line_bot/
├── config.py             # 環境變數與伺服器設定
├── database.py           # SQLite ORM 模型 (指標定義表、歷史紀錄表、週報表)
├── data_service.py       # 數據查詢、儲存、快照彙整與手動指令解析
├── ai_analyzer.py        # Gemini 2.5 Flash 宏觀情勢分析與深度評析引擎
├── bot_handler.py        # LINE 訊息邏輯處理與選單指令路由
├── main.py               # FastAPI 應用伺服器與 LINE Webhook (/callback)
├── setup_db.py           # 資料庫初始化與熱門指標種子數據載入
├── test_system.py        # 完整系統單元與端對端測試腳本
├── .env.example          # 環境變數範例檔
├── requirements.txt      # Python 相依套件
└── README.md             # 本說明文檔
```

---

## 快速開始

### 1. 安裝相依套件
```bash
pip install -r requirements.txt
```

### 2. 設定環境變數 (`.env`)
複製 `.env.example` 為 `.env`：
```bash
cp .env.example .env
```
編輯 `.env` 填入您的 Key：
```ini
# LINE Messaging API (由 LINE Developers Console 獲取)
LINE_CHANNEL_ACCESS_TOKEN=你的_Channel_Access_Token
LINE_CHANNEL_SECRET=你的_Channel_Secret

# Google Gemini API Key (由 Google AI Studio 獲取)
GEMINI_API_KEY=你的_Gemini_API_Key

# 資料庫連線字串 (預設使用專案目錄下的 SQLite)
DATABASE_URL=sqlite:///./eco_data.db
PORT=8000
HOST=0.0.0.0
```

### 3. 初始化歷史資料庫與熱門指標
執行以下指令建立資料表並載入熱門指標（美股 CPI、非農 NFP、失業率、聯準會利率、10年美債殖利率、台灣外銷訂單、台灣 PMI 等）：
```bash
python setup_db.py
```

### 4. 啟動伺服器
```bash
python main.py
```
伺服器將在 `http://127.0.0.1:8000` 啟動。

---

## LINE 串接教學 (Webhook 設定)

### 本機測試（使用 ngrok）
1. 安裝並啟動 [ngrok](https://ngrok.com/)：
   ```bash
   ngrok http 8000
   ```
2. 複製 ngrok 提供的 HTTPS 網址，例如：`https://xxxx-xx-xx.ngrok-free.app`
3. 登入 [LINE Developers Console](https://developers.line.biz/)：
   - 進入您的 Provider -> Messaging API channel。
   - 在 **Messaging API** 分頁中的 **Webhook URL** 填入：
     `https://xxxx-xx-xx.ngrok-free.app/callback`
   - 開啟 **Use webhook** 開關。
   - 點擊 **Verify** 驗證連線。

---

## LINE 指令操作說明

| 指令 | 說明 | 範例 |
| :--- | :--- | :--- |
| **週報** / **最新分析** | 彙整所有最新公佈數據與歷史走勢，由 Gemini 生成宏觀情勢簡報與股債匯市影響分析 | `週報` 或 `經濟分析` |
| **查詢 [指標代碼]** | 查看該指標歷史序列、前值、預期值與專題分析點評 | `查詢 CPI` 或 `歷史 NFP` |
| **指標清單** | 列出系統目前追蹤的所有指標分類與最新一期數值 | `指標清單` |
| **記錄 [代碼] [數值]...** | 分析員快捷錄入新發布的經濟數據，立即寫入歷史資料庫 | `記錄 CPI 2.9 3.0 3.0 超預期降溫` 或 `記錄 NFP 2026-08 16.5 15.0` |
| **說明** | 查看完整的機器人使用說明與操作指引 | `說明` |

---

## REST API 除錯與擴充端點

- `GET /health`：健康檢查。
- `GET /api/indicators`：取得所有指標及其最新數據快照。
- `GET /api/analysis/weekly`：直接調用 AI 生成最新總經分析報告。
- `POST /api/simulate-chat`：本機模擬 LINE 使用者輸入測試回應：
  ```json
  { "message": "週報" }
  ```
- `POST /api/records`：透過 API 寫入新經濟數據。