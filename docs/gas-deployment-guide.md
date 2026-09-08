# 宏觀全球智庫 · 個人 Google 試算表 ＋ LINE Bot 極速 3 分鐘部署指南

> **專屬使用者**：林勝穩（CSC 中鋼 F42，分機：2044）  
> **架構目標**：將經濟指標直接從 LINE 記錄到個人的 Google 試算表，並由 Gemini 讀取試算表走勢產出個人化專屬研報！

---

## 🎯 運作模式說明

您在 LINE 輸入：
- `記錄 CPI 2.9 月增0.1%` ➔ **自動在您的 Google 試算表新增一列**，並帶有時間戳記與分類標籤！
- `記下 鐵礦砂 99.5 美元/噸 高爐成本線` ➔ **自動歸檔至「原物料鋼鐵」標籤**！
- `分析試算表` 或 `分析 鐵礦砂` ➔ **Gemini AI 自動閱讀試算表歷史數值**，直接在 LINE 回傳趨勢分析簡報！

---

## 🚀 3 步驟極速建立（只需做一次）

### 步驟 1：建立全新 Google 試算表
1. 打開瀏覽器進入 [Google Drive (雲端硬碟)](https://drive.google.com/) 或 [Google 試算表](https://sheets.new)。
2. 新增一個空白試算表，左上角名稱命名為：`宏觀總經指標資料庫`。

---

### 步驟 2：開啟 Apps Script 並貼上程式碼
1. 在試算表上方選單點選 **「擴充功能 (Extensions)」** ➜ **「Apps Script」**。
2. 進入編輯器後，將預設的代碼清空。
3. 打開專案中的 [`gas/eco-sheets-bot.js`](file:///C:/Users/Superby08/.gemini/antigravity/scratch/eco_line_bot/gas/eco-sheets-bot.js)，複製全部程式碼，貼到 Apps Script 編輯器中。
4. 找到第 17 行：
   ```javascript
   const GEMINI_API_KEY = "YOUR_GEMINI_API_KEY_HERE";
   ```
   將您目前使用的 Google Gemini API Key 貼在引號內（若暫時不填亦可正常記錄試算表）。
5. 點擊上方的 **💾 儲存專案**（或按 `Ctrl + S`）。

---

### 步驟 3：部署為 Web 應用程式（取得連動網址）
1. 點擊編輯器右上角藍色按鈕 **「部署 (Deploy)」** ➜ **「新增部署 (New deployment)」**。
2. 點選左側齒輪圖示，選擇 **「網頁應用程式 (Web app)」**。
3. 設定如下（極重要）：
   - **說明**：`Eco Sheets Bot Webhook`
   - **執行身分 (Execute as)**：**我 (Me)**
   - **誰可以存取 (Who has access)**：**所有人 (Anyone)**（這樣 Render 才能將 LINE 訊息轉發過來）
4. 點擊 **「部署 (Deploy)」**。
5. （首次部署若跳出「需要授權」，點選「審查權限」➜ 選擇您的 Google 帳號 ➜ 點擊「進階 (Advanced)」➜ 點擊「前往宏觀總經指標資料庫 (不安全)」➜ 點擊「允許」即可）。
6. 部署完成後，複製產生的 **「網頁應用程式網址 (Web app URL)」**（網址開頭為 `https://script.google.com/macros/s/.../exec`）。

---

## 🔗 與 Render 連動（讓 LINE 自動轉發）

1. 登入您的 [Render 後台 (Dashboard)](https://dashboard.render.com/)。
2. 進入服務 **`eco-line-assistant`** ➜ 點選左側 **「Environment」**。
3. 點擊 **「Add Environment Variable」**：
   - **Key**：`GAS_WEBHOOK_URL`
   - **Value**：貼上剛才取得的 Google Apps Script 網頁應用程式網址。
4. 點擊 **「Save Changes」**。

---

## 📱 實測指令清單

現在打開您的 LINE 官方帳號聊天室，立即測試以下指令：

| 測試動作 | 輸入指令範例 | 預期效果 |
| :--- | :--- | :--- |
| **記錄通膨** | `記錄 CPI 2.9 月增0.1%` | 自動填入試算表，標註為 `🏷️ 通膨物價` |
| **記錄鋼鐵** | `記下 鐵礦砂 99.5 美元/噸 高爐成本支撐` | 自動填入試算表，標註為 `🏷️ 原物料鋼鐵` |
| **記錄外銷** | `記錄 台灣外銷訂單 979.4 億美元 年增61.9%` | 自動填入試算表，標註為 `🏷️ 實體經貿` |
| **分析全表** | `分析試算表` | Gemini 讀取試算表最近 20 筆記錄產出總體研報 |
| **分析單一指標** | `分析 鐵礦砂` | Gemini 針對試算表中鐵礦砂歷次變化產出走勢推演 |

隨時打開您的 Google 試算表，即可看到數據即時一列列整齊排好，隨時可以自己修改、增刪或繪製折線圖！
