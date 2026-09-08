const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'personal_records.json');

// 確保 data 目錄與資料庫檔案存在
function ensureDataFile() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    // 預先寫入幾筆標準初始範例，方便使用者一開始就能檢視與測試
    const initialData = [
      {
        id: "rec_init_01",
        timestamp: "2026-09-07 08:30:00",
        metric: "美國 CPI 通膨年增率",
        value: "3.4",
        unit: "%",
        note: "核心 PCE 3.3%，月增 0.1%，通膨溫和放緩",
        tag: "🏷️ 通膨物價",
        source: "系統初始"
      },
      {
        id: "rec_init_02",
        timestamp: "2026-09-07 10:15:00",
        metric: "國際鐵礦砂 62%",
        value: "99.57",
        unit: "美元/噸",
        note: "跌破 100 美元整數關卡，測試邊際礦山現金成本防線",
        tag: "🏷️ 原物料鋼鐵",
        source: "系統初始"
      },
      {
        id: "rec_init_03",
        timestamp: "2026-09-07 14:00:00",
        metric: "台灣外銷訂單",
        value: "979.4",
        unit: "億美元",
        note: "年增 +61.9%，AI 伺服器與先進封裝需求強勁支撐",
        tag: "🏷️ 實體經貿",
        source: "系統初始"
      }
    ];
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2), 'utf8');
  }
}

function readRecords() {
  try {
    ensureDataFile();
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw) || [];
  } catch (e) {
    console.error("Read records error:", e);
    return [];
  }
}

function writeRecords(records) {
  try {
    ensureDataFile();
    fs.writeFileSync(DATA_FILE, JSON.stringify(records, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error("Write records error:", e);
    return false;
  }
}

function parseRecordText(rawText) {
  let body = rawText.replace(/^(記錄|紀錄|記下|寫入|存入|記|記：|記:)\s*/, "").trim();

  let tag = "🏷️ 總經指標";
  if (/cpi|pce|通膨|物價|cpi年增/i.test(body)) tag = "🏷️ 通膨物價";
  else if (/鐵礦|鋼|煤|熱軋|中鋼|礦商|高爐/i.test(body)) tag = "🏷️ 原物料鋼鐵";
  else if (/台積|半導體|費半|輝達|nvda|tsmc|晶片/i.test(body)) tag = "🏷️ 科技半導體";
  else if (/美債|殖利率|fed|降息|升息|利差|10y|2y/i.test(body)) tag = "🏷️ 貨幣利率";
  else if (/外銷訂單|出口|進口|pmi|gdp|經貿/i.test(body)) tag = "🏷️ 實體經貿";
  else if (/匯率|台幣|美元|日圓|換匯/i.test(body)) tag = "🏷️ 匯率外匯";

  const parts = body.split(/[\s,，]+/);
  if (parts.length === 0) return null;

  const metric = parts[0];
  let valueStr = parts[1] || "";
  let note = parts.slice(2).join(" ");

  let valMatch = valueStr.match(/^([+-]?\d+(?:\.\d+)?)(.*)$/);
  let numVal = "";
  let unit = "";

  if (valMatch) {
    numVal = valMatch[1];
    unit = valMatch[2] || "";
  } else {
    let combined = body.match(/([^\d:：=]+)[:：=\s]+([+-]?\d+(?:\.\d+)?)\s*([^\s]*)(.*)/);
    if (combined) {
      return {
        metric: combined[1].trim(),
        value: combined[2].trim(),
        unit: combined[3].trim(),
        note: combined[4].trim(),
        tag: tag
      };
    }
    numVal = valueStr;
  }

  const knownUnits = ["美元/噸", "億美元", "百萬美元", "美元", "台幣", "元", "點", "bps", "%", "噸", "萬噸", "億元", "張", "口"];
  if (!unit && parts.length > 2 && knownUnits.includes(parts[2])) {
    unit = parts[2];
    note = parts.slice(3).join(" ");
  }

  return {
    metric: metric,
    value: numVal,
    unit: unit,
    note: note,
    tag: tag
  };
}

function addRecord(data, source = "LINE Bot") {
  const records = readRecords();
  const now = new Date();
  const utc8 = new Date(now.getTime() + 8 * 3600 * 1000);
  const timeStr = utc8.toISOString().replace("T", " ").substring(0, 19);

  const newRecord = {
    id: "rec_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
    timestamp: timeStr,
    metric: data.metric,
    value: data.value,
    unit: data.unit || "",
    note: data.note || "",
    tag: data.tag || "🏷️ 總經指標",
    source: source
  };

  records.unshift(newRecord); // 新的排在最前
  writeRecords(records);
  return { record: newRecord, totalCount: records.length };
}

function deleteRecord(id) {
  let records = readRecords();
  const initialLen = records.length;
  records = records.filter(r => r.id !== id);
  if (records.length !== initialLen) {
    writeRecords(records);
    return true;
  }
  return false;
}

// 產生 CSV 格式（支援 Google 試算表 =IMPORTDATA 直接連動）
function generateCSV(records) {
  const header = "時間,指標名稱,數值,單位,備註脈絡,分類標籤,來源";
  const rows = records.map(r => {
    const cleanNote = (r.note || "").replace(/"/g, '""');
    return `"${r.timestamp}","${r.metric}","${r.value}","${r.unit}","${cleanNote}","${r.tag}","${r.source}"`;
  });
  return [header, ...rows].join("\n");
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const format = req.query?.format || 'json';

  // GET: 查詢所有筆記
  if (req.method === 'GET') {
    const records = readRecords();

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="macro_records.csv"');
      return res.status(200).send('\uFEFF' + generateCSV(records)); // 帶 UTF-8 BOM 避免 Excel 亂碼
    }

    return res.status(200).json({
      status: "success",
      count: records.length,
      records: records
    });
  }

  // POST: 新增一筆記錄
  if (req.method === 'POST') {
    const body = req.body || {};
    if (!body.metric || !body.value) {
      return res.status(400).json({ status: "error", message: "請提供 metric 與 value" });
    }
    const result = addRecord(body, body.source || "Web Portal");
    return res.status(200).json({
      status: "success",
      record: result.record,
      totalCount: result.totalCount
    });
  }

  // DELETE: 刪除某一筆
  if (req.method === 'DELETE') {
    const id = req.query?.id || req.body?.id;
    if (!id) {
      return res.status(400).json({ status: "error", message: "請提供 id" });
    }
    const success = deleteRecord(id);
    return res.status(200).json({ status: success ? "success" : "not_found" });
  }

  return res.status(405).json({ status: "method_not_allowed" });
};

module.exports.parseRecordText = parseRecordText;
module.exports.addRecord = addRecord;
module.exports.readRecords = readRecords;
module.exports.deleteRecord = deleteRecord;
