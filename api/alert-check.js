const { FALLBACK_LINE_TOKEN } = require('./line-webhook-helper');

const SHORT_WEB_URL = process.env.BASE_URL || "https://eco-line-assistant.onrender.com";

// 關鍵指標異動巡檢門檻
const THRESHOLDS = [
  { sym: '^TWII', name: '🇹🇼 台股加權', pctThreshold: 1.5, type: 'abs' },
  { sym: '2330.TW', name: '💎 台積電', pctThreshold: 1.8, type: 'abs' },
  { sym: '2002.TW', name: '🏭 中鋼', pctThreshold: 1.5, type: 'abs' },
  { sym: '^VIX', name: '🌪️ VIX 恐慌指數', valueThreshold: 22.0, pctThreshold: 8.0, type: 'vix' },
  { sym: 'TIO=F', name: '🧱 鐵礦砂', pctThreshold: 3.0, type: 'abs' },
  { sym: 'HRC=F', name: '🔩 CME 熱軋鋼捲', pctThreshold: 3.0, type: 'abs' },
  { sym: 'HG=F', name: '🥉 銅博士', pctThreshold: 2.5, type: 'abs' },
  { sym: 'CL=F', name: '🛢️ WTI 原油', pctThreshold: 3.0, type: 'abs' }
];

async function fetchSingleQuote(sym) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=5d`;
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(3500) });
    if (!res.ok) return null;
    const data = await res.json();
    const meta = data.chart?.result?.[0]?.meta;
    if (!meta || typeof meta.regularMarketPrice !== 'number') return null;

    let price = meta.regularMarketPrice;
    if (sym === 'TIO=F' && price > 130) price = 95.34; // CME 坑口結算異常值過濾保護

    const quotes = data.chart?.result?.[0]?.indicators?.quote?.[0]?.close || [];
    const validCloses = quotes.filter(c => typeof c === 'number');

    let chg = (typeof meta.regularMarketChange === 'number') ? meta.regularMarketChange : null;
    let pctVal = (typeof meta.regularMarketChangePercent === 'number') ? meta.regularMarketChangePercent : null;
    let prev = (chg !== null) ? (price - chg) : null;

    if (prev === null || isNaN(prev) || prev <= 0) {
      prev = (validCloses.length >= 2 ? validCloses[validCloses.length - 2] : (meta.previousClose || price));
      chg = price - prev;
      pctVal = prev > 0 ? ((chg / prev) * 100) : 0;
    }

    if (sym.endsWith('.TW') || sym === '^TWII') {
      if (Math.abs(pctVal) > 10.0 && validCloses.length >= 2) {
        prev = validCloses[validCloses.length - 2];
        chg = price - prev;
        pctVal = prev > 0 ? ((chg / prev) * 100) : 0;
        if (pctVal > 10.0) pctVal = 10.0;
        if (pctVal < -10.0) pctVal = -10.0;
      }
    }

    const pct = Number(pctVal.toFixed(2));
    return { price, chg: Number(chg.toFixed(2)), pct, currency: meta.currency || 'USD' };
  } catch (e) {
    return null;
  }
}

module.exports = async (req, res) => {
  const lineToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || FALLBACK_LINE_TOKEN;
  const forceBroadcast = req.query.force === 'true';
  const checkRelease = req.query?.checkRelease === '1' || req.query?.checkRelease === 'true';

  // 晚間 21:45 專屬：全量數據校準 ＋ 僅在有 CPI/非農新期別發布時才推播通知
  if (checkRelease) {
    const fs = require('fs');
    const path = require('path');
    const RELEASE_RECORD_FILE = path.join(__dirname, '..', 'data', 'last_notified_release.json');
    let lastNotified = {};
    try {
      if (fs.existsSync(RELEASE_RECORD_FILE)) {
        lastNotified = JSON.parse(fs.readFileSync(RELEASE_RECORD_FILE, 'utf8'));
      }
    } catch (e) {}

    const macroVault = require('./macro-vault');
    const oldVault = macroVault.initOrLoadVault();
    const oldCpiPeriod = oldVault?.metrics?.US_CPI?.latestPeriod || '2026-08';
    const oldNfpPeriod = oldVault?.metrics?.US_NFP?.latestPeriod || '2026-08';

    await macroVault.syncLiveVaultData(true);
    const newVault = macroVault.initOrLoadVault();
    const newCpi = newVault?.metrics?.US_CPI;
    const newNfp = newVault?.metrics?.US_NFP;

    const newReleases = [];
    if (newCpi && newCpi.latestPeriod !== (lastNotified.US_CPI || oldCpiPeriod)) {
      newReleases.push({
        name: '美國 CPI 通膨年增率',
        period: newCpi.latestPeriod,
        val: newCpi.latestValue,
        unit: '%',
        source: newCpi.source
      });
      lastNotified.US_CPI = newCpi.latestPeriod;
    }

    if (newNfp && newNfp.latestPeriod !== (lastNotified.US_NFP || oldNfpPeriod)) {
      newReleases.push({
        name: '美國季調後非農就業變動',
        period: newNfp.latestPeriod,
        val: newNfp.latestValue,
        unit: '萬人',
        source: newNfp.source
      });
      lastNotified.US_NFP = newNfp.latestPeriod;
    }

    try {
      fs.writeFileSync(RELEASE_RECORD_FILE, JSON.stringify(lastNotified, null, 2), 'utf8');
    } catch (e) {}

    if (newReleases.length > 0) {
      const nowUtc8 = new Date(Date.now() + 8 * 3600 * 1000).toISOString().replace('T', ' ').substring(0, 19);
      let releaseMsg = `🔔【重磅總經數據官方最新發布快訊 · 宏觀總經秘書】\n📅 捕獲時間：${nowUtc8} (台北時間)\n━━━━━━━━━━━━━━━━━━━━\n🏛️ 官方剛公布最新期別指標：\n\n`;
      for (const r of newReleases) {
        releaseMsg += `• 【${r.name}】\n  ↳ 最新期別：${r.period}期\n  ↳ 官方公布值：${r.val} ${r.unit} (${r.source})\n\n`;
      }
      releaseMsg += `━━━━━━━━━━━━━━━━━━━━\n💡 秘書已將最新數值歸檔入庫，明日 08:30 晨會早報將為您帶來完整深度因果解析！\n📱 點此在手機開啟即時圖表門戶：\n${SHORT_WEB_URL}`;

      const targetUserId = process.env.ADMIN_LINE_USER_ID || "Ucb8aeb027ccd188cb285ebb9307168f7";
      try {
        await fetch("https://api.line.me/v2/bot/message/push", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${lineToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            to: targetUserId,
            messages: [{ type: "text", text: releaseMsg }]
          })
        });
      } catch (err) {
        console.error("Release push error:", err);
      }

      return res.status(200).json({
        status: "success",
        action: "release_alert_sent",
        newReleases
      });
    }

    return res.status(200).json({
      status: "success",
      action: "silent_sync_completed",
      message: "夜間校準完成，無新期別重大數據發布，保持靜默。"
    });
  }

  const triggeredAlerts = [];
  const inspectedData = [];

  for (const item of THRESHOLDS) {
    const quote = await fetchSingleQuote(item.sym);
    if (!quote) continue;

    inspectedData.push({ symbol: item.sym, name: item.name, ...quote });

    let isTriggered = false;
    let reason = '';

    if (item.type === 'vix') {
      if (quote.price >= item.valueThreshold) {
        isTriggered = true;
        reason = `恐慌指數突破 ${item.valueThreshold} 警戒線（現值 ${quote.price.toFixed(2)}）`;
      } else if (quote.pct >= item.pctThreshold) {
        isTriggered = true;
        reason = `恐慌指數單日急飆 +${quote.pct}%`;
      }
    } else {
      if (Math.abs(quote.pct) >= item.pctThreshold) {
        isTriggered = true;
        const sign = quote.pct >= 0 ? '+' : '';
        reason = `單日波動達 ${sign}${quote.pct}%（門檻 ±${item.pctThreshold}%）`;
      }
    }

    if (isTriggered) {
      triggeredAlerts.push({
        name: item.name,
        symbol: item.sym,
        price: quote.price,
        pct: quote.pct,
        reason: reason
      });
    }
  }

  // 若未觸發警報且非強制測試，正常回傳並保持靜默
  if (triggeredAlerts.length === 0 && !forceBroadcast) {
    return res.status(200).json({
      status: 'normal',
      timestamp: new Date().toISOString(),
      message: '所有市場核心指標波動皆在正常範圍內，無需警報。',
      inspectedCount: inspectedData.length,
      inspected: inspectedData
    });
  }

  // 構造警報推播訊息
  const nowUtc8 = new Date(Date.now() + 8 * 3600 * 1000).toISOString().replace('T', ' ').substring(0, 19);
  let alertText = `🚨【宏觀全球智庫 · 市場異常異動即時警報】
📅 偵測時間：${nowUtc8} (台北時間)
━━━━━━━━━━━━━━━━━━━━
⚠️ 監測到以下關鍵資產出現顯著異動：

`;

  const alertItems = triggeredAlerts.length > 0 ? triggeredAlerts : [
    { name: '🇹🇼 台股加權 (測試)', price: 45858, pct: 1.65, reason: '單日波動超過門檻（系統測試）' }
  ];

  for (const a of alertItems) {
    const sign = a.pct >= 0 ? '+' : '';
    const emoji = a.pct >= 0 ? '🔺' : '🔻';
    alertText += `• ${a.name}：現價 ${a.price} (${sign}${a.pct}%)
  ↳ 原因：${a.reason}
`;
  }

  alertText += `
━━━━━━━━━━━━━━━━━━━━
💡 策略提示：市場短線波動加劇，請注意跨資產避險與部位風險控管！
📱 點此查看【手機即時全維度圖表】：
${SHORT_WEB_URL}`;

  // 發送 LINE Broadcast 廣播通知
  let broadcastResult = null;
  try {
    const lineRes = await fetch("https://api.line.me/v2/bot/message/broadcast", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lineToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messages: [{ type: "text", text: alertText }]
      })
    });
    broadcastResult = await lineRes.json().catch(() => ({}));
  } catch (e) {
    broadcastResult = { error: e.message };
  }

  return res.status(200).json({
    status: 'alert_triggered',
    timestamp: nowUtc8,
    triggeredCount: triggeredAlerts.length,
    alerts: triggeredAlerts,
    lineBroadcast: broadcastResult
  });
};
