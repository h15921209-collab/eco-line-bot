/**
 * 🐂 華爾街公牛 · 總經景氣大漫遊 (Macro Cycle 2D-IK Rider Engine)
 * 核心特性：
 * 1. 2-Bone IK (雙關節逆運動學) 實時幾何求解公牛腿部踩踏運動軌跡
 * 2. 多層次經濟視差滾動 (天空/熱氣球/金融天際線/K線山脈/護欄/道路)
 * 3. 純自動市場數據驅動 (VIX 與大盤連動自動調節車速、天空光影與夜間車燈)
 * 4. 車前籃裝載金條、百元美鈔、輝達 AI 晶片 (顛簸物理微動)
 * 5. Web Audio API 紐約證交所開盤金屬敲鐘音效合成 (零外部資源依賴)
 */

(function() {
  'use strict';

  // 系統全域單例
  const MacroBullEngine = {
    mode: 'bull_sprint', // 'bull_sprint' | 'cruise' | 'risk_off'
    speedKmH: 32,
    targetSpeedKmH: 32,
    crankAngle: 0,
    wheelAngle: 0,
    distanceTraveled: 0,
    isCollapsed: false,
    lastFrameTime: 0,
    animFrameId: null,

    // 配置參數
    config: {
      hip: { x: 460, y: 142 },
      crankCenter: { x: 495, y: 205 },
      crankRadius: 15,
      boneL1: 44, // 大腿長度
      boneL2: 42, // 小腿長度
      wheelRadius: 34,
      rearWheelCenter: { x: 420, y: 205 },
      frontWheelCenter: { x: 590, y: 205 },
      headlightPos: { x: 590, y: 138 },
      basketPos: { x: 585, y: 128 }
    },

    // 模式定義配置
    MODES: {
      bull_sprint: {
        id: 'bull_sprint',
        name: '牛市狂飆',
        targetSpeed: 32,
        skyFill: 'url(#sky-grad-day)',
        sunOpacity: 1,
        moonOpacity: 0,
        starsOpacity: 0,
        headlightOpacity: 0,
        lampGlowOpacity: 0,
        badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        dotColor: 'bg-emerald-400'
      },
      cruise: {
        id: 'cruise',
        name: '軟著陸巡航',
        targetSpeed: 20,
        skyFill: 'url(#sky-grad-sunset)',
        sunOpacity: 0.6,
        moonOpacity: 0,
        starsOpacity: 0.3,
        headlightOpacity: 0.25,
        lampGlowOpacity: 0.35,
        badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        dotColor: 'bg-amber-400'
      },
      risk_off: {
        id: 'risk_off',
        name: '避險防禦',
        targetSpeed: 10,
        skyFill: 'url(#sky-grad-night)',
        sunOpacity: 0,
        moonOpacity: 1,
        starsOpacity: 0.95,
        headlightOpacity: 0.85,
        lampGlowOpacity: 0.9,
        badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
        dotColor: 'bg-rose-400'
      }
    },

    // 初始化引擎
    init: function() {
      if (typeof window === 'undefined') return;
      this.initBackgroundElements();
      this.initBicycleAndBullSvg();
      this.startAnimationLoop();

      // 檢查 localStorage 記住折疊偏好
      try {
        const savedCollapsed = localStorage.getItem('bull_hero_collapsed');
        if (savedCollapsed === 'true') {
          this.setCollapsed(true);
        }
      } catch (e) {}

      // 預設套用牛市狂飆
      this.setMode('bull_sprint', '系統啟動：牛市狂飆 (32 km/h) · 實時動態');
      console.log('🐂 [Macro Bull Engine] 華爾街公牛 2D-IK 景氣大漫遊引擎已啟動！');
    },

    // 2-Bone IK 逆運動學幾何求解器
    solveIK: function(hipX, hipY, targetX, targetY, l1, l2) {
      const dx = targetX - hipX;
      const dy = targetY - hipY;
      let dist = Math.hypot(dx, dy);

      // 限制踏板距離不可超過雙腿連桿總和
      const maxDist = l1 + l2 - 0.01;
      const minDist = Math.abs(l1 - l2) + 0.01;
      if (dist > maxDist) dist = maxDist;
      if (dist < minDist) dist = minDist;

      // 計算基底角度與夾角 (餘弦定理)
      const phi = Math.atan2(dy, dx);
      const cosAlpha = (l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist);
      const alpha = Math.acos(Math.max(-1, Math.min(1, cosAlpha)));

      // 膝蓋向前微彎 (Cyclist forward knee-bend)
      const kneeAngle = phi - alpha;
      const kneeX = hipX + l1 * Math.cos(kneeAngle);
      const kneeY = hipY + l1 * Math.sin(kneeAngle);

      return { kneeX, kneeY, footX: targetX, footY: targetY };
    },

    // 繪製背景靜態與重複元素
    initBackgroundElements: function() {
      // 1. 群星
      const starsLayer = document.getElementById('svg-stars');
      if (starsLayer && starsLayer.children.length === 0) {
        let starsHtml = '';
        for (let i = 0; i < 35; i++) {
          const sx = (i * 37 + 13) % 990 + 5;
          const sy = (i * 23 + 7) % 110 + 10;
          const sr = ((i % 3) + 1) * 0.7;
          starsHtml += `<circle cx="${sx}" cy="${sy}" r="${sr}" fill="#ffffff" opacity="${0.4 + (i % 5) * 0.12}" />`;
        }
        starsLayer.innerHTML = starsHtml;
      }

      // 2. 雲朵
      const cloudsLayer = document.getElementById('svg-clouds-layer');
      if (cloudsLayer && cloudsLayer.children.length === 0) {
        cloudsLayer.innerHTML = `
          <g id="cloud-1" transform="translate(120, 35)">
            <ellipse cx="0" cy="0" rx="35" ry="14" fill="#ffffff" opacity="0.65" />
            <ellipse cx="-15" cy="-6" rx="20" ry="15" fill="#ffffff" opacity="0.65" />
            <ellipse cx="15" cy="-4" rx="22" ry="13" fill="#ffffff" opacity="0.65" />
          </g>
          <g id="cloud-2" transform="translate(480, 50)">
            <ellipse cx="0" cy="0" rx="42" ry="16" fill="#ffffff" opacity="0.55" />
            <ellipse cx="-18" cy="-8" rx="24" ry="16" fill="#ffffff" opacity="0.55" />
            <ellipse cx="18" cy="-5" rx="26" ry="14" fill="#ffffff" opacity="0.55" />
          </g>
          <g id="cloud-3" transform="translate(820, 28)">
            <ellipse cx="0" cy="0" rx="30" ry="12" fill="#ffffff" opacity="0.6" />
            <ellipse cx="-12" cy="-5" rx="16" ry="12" fill="#ffffff" opacity="0.6" />
            <ellipse cx="12" cy="-3" rx="18" ry="11" fill="#ffffff" opacity="0.6" />
          </g>
        `;
      }

      // 3. 宏觀熱氣球 ($, €, Au)
      const balloonsLayer = document.getElementById('svg-balloons-layer');
      if (balloonsLayer && balloonsLayer.children.length === 0) {
        balloonsLayer.innerHTML = `
          <!-- 美元熱氣球 ($) -->
          <g id="balloon-usd" transform="translate(230, 65)">
            <path d="M 0,-24 C 18,-24 22,-8 10,12 C 6,18 4,22 0,24 C -4,22 -6,18 -10,12 C -22,-8 -18,-24 0,-24 Z" fill="#10b981" />
            <path d="M -7,-24 C -22,-8 -8,18 0,24 C 8,18 22,-8 7,-24 Z" fill="#34d399" opacity="0.4" />
            <rect x="-4" y="27" width="8" height="6" rx="1.5" fill="#78350f" />
            <line x1="-3" y1="24" x2="-3" y2="27" stroke="#64748b" stroke-width="0.8" />
            <line x1="3" y1="24" x2="3" y2="27" stroke="#64748b" stroke-width="0.8" />
            <text x="0" y="-3" font-size="15" font-weight="900" fill="#ffffff" text-anchor="middle" font-family="monospace">$</text>
          </g>

          <!-- 歐元熱氣球 (€) -->
          <g id="balloon-eur" transform="translate(560, 48)">
            <path d="M 0,-20 C 15,-20 18,-6 8,10 C 5,15 3,18 0,20 C -3,18 -5,15 -8,10 C -18,-6 -15,-20 0,-20 Z" fill="#3b82f6" />
            <rect x="-3.5" y="22" width="7" height="5" rx="1" fill="#78350f" />
            <line x1="-2.5" y1="20" x2="-2.5" y2="22" stroke="#64748b" stroke-width="0.8" />
            <line x1="2.5" y1="20" x2="2.5" y2="22" stroke="#64748b" stroke-width="0.8" />
            <text x="0" y="-2" font-size="13" font-weight="900" fill="#ffffff" text-anchor="middle" font-family="monospace">€</text>
          </g>

          <!-- 黃金熱氣球 (Au) -->
          <g id="balloon-gold" transform="translate(760, 70)">
            <path d="M 0,-22 C 16,-22 20,-7 9,11 C 5,16 3,19 0,21 C -3,19 -5,16 -9,11 C -20,-7 -16,-22 0,-22 Z" fill="#f59e0b" />
            <rect x="-4" y="23" width="8" height="5.5" rx="1" fill="#78350f" />
            <line x1="-3" y1="21" x2="-3" y2="23" stroke="#64748b" stroke-width="0.8" />
            <line x1="3" y1="21" x2="3" y2="23" stroke="#64748b" stroke-width="0.8" />
            <text x="0" y="-3" font-size="11" font-weight="900" fill="#ffffff" text-anchor="middle" font-family="sans-serif">Au</text>
          </g>
        `;
      }

      // 4. 華爾街金融大廈剪影
      const skylineLayer = document.getElementById('svg-skyline-layer');
      if (skylineLayer && skylineLayer.children.length === 0) {
        let bldHtml = '';
        const buildings = [
          { x: 30, w: 45, h: 80, winCols: 3, winRows: 6 },
          { x: 85, w: 35, h: 105, spire: 25, winCols: 2, winRows: 8 },
          { x: 130, w: 50, h: 70, winCols: 3, winRows: 5 },
          { x: 195, w: 40, h: 95, winCols: 2, winRows: 7 },
          { x: 250, w: 55, h: 85, winCols: 4, winRows: 6 },
          { x: 320, w: 38, h: 115, spire: 30, winCols: 2, winRows: 9 },
          { x: 375, w: 48, h: 75, winCols: 3, winRows: 5 },
          { x: 440, w: 52, h: 90, winCols: 3, winRows: 7 },
          { x: 510, w: 40, h: 80, winCols: 2, winRows: 6 },
          { x: 565, w: 60, h: 100, winCols: 4, winRows: 8 },
          { x: 640, w: 35, h: 70, winCols: 2, winRows: 5 },
          { x: 690, w: 48, h: 110, spire: 20, winCols: 3, winRows: 8 },
          { x: 755, w: 42, h: 85, winCols: 2, winRows: 6 },
          { x: 815, w: 55, h: 75, winCols: 4, winRows: 5 },
          { x: 885, w: 45, h: 95, winCols: 3, winRows: 7 },
          { x: 945, w: 50, h: 80, winCols: 3, winRows: 6 }
        ];

        buildings.forEach(b => {
          const y = 235 - b.h;
          bldHtml += `<rect x="${b.x}" y="${y}" width="${b.w}" height="${b.h}" fill="#0f172a" opacity="0.85" />`;
          if (b.spire) {
            bldHtml += `<line x1="${b.x + b.w / 2}" y1="${y}" x2="${b.x + b.w / 2}" y2="${y - b.spire}" stroke="#334155" stroke-width="2" />`;
          }
          for (let r = 0; r < b.winRows; r++) {
            for (let c = 0; c < b.winCols; c++) {
              const wx = b.x + 5 + c * ((b.w - 10) / b.winCols);
              const wy = y + 8 + r * 10;
              bldHtml += `<rect x="${wx}" y="${wy}" width="3" height="4" fill="#fef08a" opacity="0.35" />`;
            }
          }
        });
        skylineLayer.innerHTML = bldHtml;
      }

      // 5. 綠紅 K 線山脈 (Candlestick Mountains)
      const candleLayer = document.getElementById('svg-candlestick-layer');
      if (candleLayer && candleLayer.children.length === 0) {
        let kHtml = '';
        const candles = [
          { x: 15, open: 195, close: 180, high: 172, low: 200, green: true },
          { x: 35, open: 180, close: 168, high: 162, low: 185, green: true },
          { x: 55, open: 168, close: 178, high: 165, low: 182, green: false },
          { x: 75, open: 178, close: 165, high: 160, low: 183, green: true },
          { x: 95, open: 165, close: 155, high: 150, low: 170, green: true },
          { x: 115, open: 155, close: 162, high: 152, low: 168, green: false },
          { x: 135, open: 162, close: 150, high: 145, low: 165, green: true },
          { x: 155, open: 150, close: 142, high: 136, low: 155, green: true },
          { x: 175, open: 142, close: 152, high: 140, low: 158, green: false },
          { x: 195, open: 152, close: 145, high: 140, low: 156, green: true },
          { x: 215, open: 145, close: 135, high: 130, low: 150, green: true },
          { x: 235, open: 135, close: 144, high: 132, low: 148, green: false },
          { x: 255, open: 144, close: 156, high: 140, low: 160, green: false },
          { x: 275, open: 156, close: 150, high: 145, low: 162, green: true },
          { x: 295, open: 150, close: 140, high: 135, low: 154, green: true },
          { x: 315, open: 140, close: 132, high: 126, low: 145, green: true },
          { x: 335, open: 132, close: 142, high: 128, low: 146, green: false },
          { x: 355, open: 142, close: 135, high: 130, low: 148, green: true },
          { x: 375, open: 135, close: 125, high: 120, low: 140, green: true },
          { x: 395, open: 125, close: 134, high: 122, low: 138, green: false },
          { x: 620, open: 140, close: 130, high: 124, low: 145, green: true },
          { x: 640, open: 130, close: 122, high: 116, low: 135, green: true },
          { x: 660, open: 122, close: 132, high: 118, low: 136, green: false },
          { x: 680, open: 132, close: 125, high: 120, low: 138, green: true },
          { x: 700, open: 125, close: 118, high: 112, low: 130, green: true },
          { x: 720, open: 118, close: 128, high: 115, low: 132, green: false },
          { x: 740, open: 128, close: 120, high: 114, low: 134, green: true },
          { x: 760, open: 120, close: 112, high: 106, low: 125, green: true },
          { x: 780, open: 112, close: 122, high: 108, low: 126, green: false },
          { x: 800, open: 122, close: 115, high: 110, low: 128, green: true },
          { x: 820, open: 115, close: 105, high: 100, low: 120, green: true },
          { x: 840, open: 105, close: 115, high: 102, low: 118, green: false },
          { x: 860, open: 115, close: 108, high: 104, low: 120, green: true },
          { x: 880, open: 108, close: 98, high: 92, low: 114, green: true },
          { x: 900, open: 98, close: 108, high: 95, low: 112, green: false },
          { x: 920, open: 108, close: 100, high: 96, low: 114, green: true },
          { x: 940, open: 100, close: 92, high: 88, low: 106, green: true },
          { x: 960, open: 92, close: 102, high: 90, low: 106, green: false },
          { x: 980, open: 102, close: 95, high: 90, low: 108, green: true }
        ];

        candles.forEach(c => {
          const color = c.green ? '#10b981' : '#ef4444';
          const top = Math.min(c.open, c.close);
          const height = Math.max(3, Math.abs(c.open - c.close));
          kHtml += `<line x1="${c.x + 4}" y1="${c.high}" x2="${c.x + 4}" y2="${c.low}" stroke="${color}" stroke-width="1.2" opacity="0.65" />`;
          kHtml += `<rect x="${c.x}" y="${top}" width="8" height="${height}" fill="${color}" opacity="0.7" rx="1" />`;
        });
        candleLayer.innerHTML = kHtml;
      }

      // 6. 護欄與街燈
      const guardLayer = document.getElementById('svg-guardrail-layer');
      if (guardLayer && guardLayer.children.length === 0) {
        let gHtml = '<line x1="0" y1="233" x2="1000" y2="233" stroke="#475569" stroke-width="2.5" />';
        for (let i = 0; i < 25; i++) {
          const px = i * 40 + 10;
          gHtml += `<line x1="${px}" y1="233" x2="${px}" y2="242" stroke="#64748b" stroke-width="2.5" />`;
        }
        guardLayer.innerHTML = gHtml;
      }

      const lampLayer = document.getElementById('svg-streetlamps-layer');
      if (lampLayer && lampLayer.children.length === 0) {
        let lHtml = '';
        [150, 480, 810].forEach(lx => {
          lHtml += `
            <g class="street-lamp-group" transform="translate(${lx}, 235)">
              <line x1="0" y1="0" x2="0" y2="-65" stroke="#334155" stroke-width="3" />
              <path d="M 0,-65 Q 12,-72 20,-68" fill="none" stroke="#334155" stroke-width="2.5" />
              <circle cx="20" cy="-68" r="4.5" fill="#fef08a" />
              <circle class="lamp-glow-bulb" cx="20" cy="-68" r="28" fill="url(#lamp-glow)" opacity="0" />
            </g>
          `;
        });
        lampLayer.innerHTML = lHtml;
      }
    },

    // 建立自行車與公牛向量圖形實體
    initBicycleAndBullSvg: function() {
      const g = document.getElementById('svg-bull-bike-group');
      if (!g) return;

      const c = this.config;
      g.innerHTML = `
        <!-- 自行車後輪 (420, 205) -->
        <g id="bike-rear-wheel">
          <circle cx="${c.rearWheelCenter.x}" cy="${c.rearWheelCenter.y}" r="${c.wheelRadius}" fill="#0f172a" stroke="#475569" stroke-width="3" />
          <circle cx="${c.rearWheelCenter.x}" cy="${c.rearWheelCenter.y}" r="${c.wheelRadius - 4}" fill="none" stroke="#94a3b8" stroke-width="1.5" />
          <g id="rear-wheel-spokes"></g>
          <circle cx="${c.rearWheelCenter.x}" cy="${c.rearWheelCenter.y}" r="6" fill="#38bdf8" />
        </g>

        <!-- 自行車前輪 (590, 205) -->
        <g id="bike-front-wheel">
          <circle cx="${c.frontWheelCenter.x}" cy="${c.frontWheelCenter.y}" r="${c.wheelRadius}" fill="#0f172a" stroke="#475569" stroke-width="3" />
          <circle cx="${c.frontWheelCenter.x}" cy="${c.frontWheelCenter.y}" r="${c.wheelRadius - 4}" fill="none" stroke="#94a3b8" stroke-width="1.5" />
          <g id="front-wheel-spokes"></g>
          <circle cx="${c.frontWheelCenter.x}" cy="${c.frontWheelCenter.y}" r="6" fill="#38bdf8" />
        </g>

        <!-- 左腿 (遠端腿部 - 較深陰影色，Phase +180度) -->
        <g id="bull-leg-left" opacity="0.8">
          <line id="leg-thigh-left" x1="460" y1="142" x2="490" y2="175" stroke="#0f2238" stroke-width="8" stroke-linecap="round" />
          <line id="leg-shin-left" x1="490" y1="175" x2="480" y2="205" stroke="#0f2238" stroke-width="6.5" stroke-linecap="round" />
          <line id="leg-crank-left" x1="495" y1="205" x2="480" y2="205" stroke="#64748b" stroke-width="3" stroke-linecap="round" />
          <rect id="leg-foot-left" x="473" y="202" width="16" height="5" rx="1.5" fill="#451a03" />
        </g>

        <!-- 自行車經典雙管高剛性鋼架 -->
        <g id="bike-frame">
          <!-- 後下叉 Chainstay -->
          <line x1="${c.rearWheelCenter.x}" y1="${c.rearWheelCenter.y}" x2="${c.crankCenter.x}" y2="${c.crankCenter.y}" stroke="#0284c7" stroke-width="3.5" stroke-linecap="round" />
          <!-- 後上叉 Seatstay -->
          <line x1="${c.rearWheelCenter.x}" y1="${c.rearWheelCenter.y}" x2="458" y2="142" stroke="#0284c7" stroke-width="3" stroke-linecap="round" />
          <!-- 立管 Seat tube -->
          <line x1="${c.crankCenter.x}" y1="${c.crankCenter.y}" x2="458" y2="140" stroke="#0284c7" stroke-width="3.5" stroke-linecap="round" />
          <!-- 座墊 Saddle -->
          <path d="M 444,138 Q 458,135 470,138 Q 460,143 444,138 Z" fill="#0f172a" stroke="#334155" stroke-width="1.5" />
          <!-- 上管 1 Top tube primary -->
          <line x1="458" y1="142" x2="560" y2="132" stroke="#0284c7" stroke-width="3.5" stroke-linecap="round" />
          <!-- 上管 2 Double tube vintage line -->
          <line x1="460" y1="154" x2="560" y2="142" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round" />
          <!-- 下管 Down tube -->
          <line x1="${c.crankCenter.x}" y1="${c.crankCenter.y}" x2="560" y2="142" stroke="#0284c7" stroke-width="3.5" stroke-linecap="round" />
          <!-- 前叉 Fork -->
          <line x1="560" y1="130" x2="${c.frontWheelCenter.x}" y2="${c.frontWheelCenter.y}" stroke="#0284c7" stroke-width="3.5" stroke-linecap="round" />
          <!-- 龍頭與手把 Stem & Handlebar -->
          <line x1="560" y1="130" x2="566" y2="118" stroke="#64748b" stroke-width="3" stroke-linecap="round" />
          <path d="M 566,118 Q 572,112 578,118" fill="none" stroke="#64748b" stroke-width="3" stroke-linecap="round" />
          <!-- 大齒盤 Chainring -->
          <circle cx="${c.crankCenter.x}" cy="${c.crankCenter.y}" r="13" fill="#334155" stroke="#94a3b8" stroke-width="2" />
          <circle cx="${c.crankCenter.x}" cy="${c.crankCenter.y}" r="5" fill="#f8fafc" />
        </g>

        <!-- 前車籃與經濟寶藏 (金條、美鈔、AI晶片) -->
        <g id="bike-front-basket">
          <rect x="580" y="128" width="38" height="24" rx="2.5" fill="#334155" opacity="0.6" stroke="#94a3b8" stroke-width="1.8" />
          <line x1="580" y1="136" x2="618" y2="136" stroke="#64748b" stroke-width="1" />
          <line x1="580" y1="144" x2="618" y2="144" stroke="#64748b" stroke-width="1" />
          <line x1="592" y1="128" x2="592" y2="152" stroke="#64748b" stroke-width="1" />
          <line x1="605" y1="128" x2="605" y2="152" stroke="#64748b" stroke-width="1" />

          <!-- 籃中寶物動態群組 (隨車身微幅震顫彈跳) -->
          <g id="basket-treasures" transform="translate(0, 0)">
            <!-- 輝達 AI 晶片 (GPU Die) -->
            <g transform="translate(584, 122)">
              <rect x="0" y="0" width="14" height="14" rx="1.5" fill="url(#chip-grad)" stroke="#22c55e" stroke-width="1" />
              <rect x="3" y="3" width="8" height="8" rx="0.5" fill="#0f172a" />
              <text x="7" y="9" font-size="5" font-weight="900" fill="#22c55e" text-anchor="middle" font-family="monospace">AI</text>
            </g>
            <!-- 實體金條 2 塊 (Gold Bars) -->
            <g transform="translate(598, 123)">
              <rect x="0" y="4" width="16" height="7" rx="1" fill="url(#gold-bar-grad)" stroke="#f59e0b" stroke-width="0.8" />
              <text x="8" y="9.5" font-size="5" font-weight="900" fill="#78350f" text-anchor="middle" font-family="sans-serif">999.9</text>
              <rect x="2" y="-1" width="14" height="6.5" rx="1" fill="url(#gold-bar-grad)" stroke="#f59e0b" stroke-width="0.8" />
            </g>
            <!-- 百元美鈔現鈔束 (Cash Stacks) -->
            <g transform="translate(591, 115)">
              <rect x="0" y="0" width="13" height="7" rx="1" fill="url(#cash-grad)" stroke="#16a34a" stroke-width="0.8" />
              <rect x="4.5" y="0" width="4" height="7" fill="#fef08a" opacity="0.8" />
              <text x="6.5" y="5.2" font-size="4" font-weight="900" fill="#0f172a" text-anchor="middle">$100</text>
            </g>
          </g>

          <!-- 車頭復古鉻銀子彈大燈 (Headlight) -->
          <g transform="translate(608, 140)">
            <ellipse cx="0" cy="0" rx="4" ry="5.5" fill="#e2e8f0" stroke="#475569" stroke-width="1" />
            <path d="M 0,-5.5 Q -8,-4 -8,0 Q -8,4 0,5.5 Z" fill="#94a3b8" />
            <circle cx="2" cy="0" r="2.5" fill="#fef08a" />
          </g>
        </g>

        <!-- 華爾街公牛軀幹與雙臂 (Wall Street Bull Torso & Suit) -->
        <g id="bull-torso-group">
          <!-- 健壯西裝軀幹 (深藍商務色) -->
          <path d="M 458,142 Q 470,120 514,114 Q 528,118 522,146 Q 490,148 458,142 Z" fill="#1e3a5f" stroke="#0f172a" stroke-width="1.5" />
          <!-- 白色襯衫領口 -->
          <polygon points="514,114 522,115 518,124 510,122" fill="#f8fafc" />
          <!-- 飄揚的華爾街力量紅領帶 (動態 Path) -->
          <path id="bull-red-tie" d="M 514,120 Q 480,132 445,128 Q 450,134 516,125 Z" fill="#dc2626" stroke="#991b1b" stroke-width="0.8" />
          <!-- 西裝右手臂與握把之手 -->
          <path d="M 512,116 Q 542,126 572,118" fill="none" stroke="#1e3a5f" stroke-width="7" stroke-linecap="round" />
          <!-- 白色襯衫袖口與皮手套 -->
          <circle cx="568" cy="119" r="3.5" fill="#f8fafc" />
          <circle cx="572" cy="118" r="3.2" fill="#78350f" />
        </g>

        <!-- 華爾街公牛頭部 (Bull Head, Golden Horns & Sunglasses) -->
        <g id="bull-head-group" transform="translate(0, 0)">
          <!-- 公牛面部與強健下頜 -->
          <path d="M 508,98 Q 514,84 532,82 Q 548,82 552,94 Q 554,106 538,108 Q 518,108 508,98 Z" fill="#78350f" stroke="#451a03" stroke-width="1.5" />
          <ellipse cx="542" cy="102" rx="7" ry="5" fill="#9a3412" opacity="0.7" />
          <!-- 自信微笑嘴部 -->
          <path d="M 536,104 Q 542,107 547,104" fill="none" stroke="#451a03" stroke-width="1.5" stroke-linecap="round" />
          <circle cx="538" cy="101" r="1.2" fill="#451a03" />
          <circle cx="544" cy="101" r="1.2" fill="#451a03" />
          <!-- 帥氣牛角 (金黃色漸變角尖) -->
          <path d="M 522,84 Q 518,65 504,58 Q 514,70 524,80 Z" fill="#f59e0b" stroke="#b45309" stroke-width="1" />
          <path d="M 534,83 Q 542,64 558,58 Q 548,70 536,81 Z" fill="#f59e0b" stroke="#b45309" stroke-width="1" />
          <!-- 帥氣黑超墨鏡 (Cool Sunglasses) -->
          <path d="M 520,89 L 548,89 L 545,97 L 522,96 Z" fill="#020617" stroke="#38bdf8" stroke-width="1" rx="1.5" />
          <line x1="524" y1="91" x2="534" y2="91" stroke="#38bdf8" stroke-width="1" stroke-linecap="round" opacity="0.8" />
          <line x1="538" y1="91" x2="544" y2="91" stroke="#38bdf8" stroke-width="1" stroke-linecap="round" opacity="0.8" />
        </g>

        <!-- 右腿 (近端主腿部 - 亮色，Phase 0度，2-Bone IK) -->
        <g id="bull-leg-right">
          <line id="leg-thigh-right" x1="460" y1="142" x2="505" y2="175" stroke="#1e3a5f" stroke-width="8.5" stroke-linecap="round" />
          <line id="leg-shin-right" x1="505" y1="175" x2="510" y2="205" stroke="#1e3a5f" stroke-width="7" stroke-linecap="round" />
          <line id="leg-crank-right" x1="495" y1="205" x2="510" y2="205" stroke="#94a3b8" stroke-width="3.5" stroke-linecap="round" />
          <rect id="leg-foot-right" x="502" y="202" width="18" height="6" rx="2" fill="#78350f" stroke="#451a03" stroke-width="0.8" />
          <rect id="leg-sole-right" x="502" y="207" width="18" height="1.8" fill="#f8fafc" />
        </g>
      `;

      this.updateSpokes();
    },

    // 更新輪圈輻條
    updateSpokes: function() {
      const c = this.config;
      const rearSpokes = document.getElementById('rear-wheel-spokes');
      const frontSpokes = document.getElementById('front-wheel-spokes');
      if (!rearSpokes || !frontSpokes) return;

      let rHtml = '';
      let fHtml = '';
      const spokeCount = 12;
      const r = c.wheelRadius - 4;

      for (let i = 0; i < spokeCount; i++) {
        const ang = this.wheelAngle + (i * Math.PI * 2) / spokeCount;
        const cos = Math.cos(ang);
        const sin = Math.sin(ang);

        const rx2 = c.rearWheelCenter.x + r * cos;
        const ry2 = c.rearWheelCenter.y + r * sin;
        rHtml += `<line x1="${c.rearWheelCenter.x}" y1="${c.rearWheelCenter.y}" x2="${rx2}" y2="${ry2}" stroke="#64748b" stroke-width="1" opacity="0.75" />`;

        const fx2 = c.frontWheelCenter.x + r * cos;
        const fy2 = c.frontWheelCenter.y + r * sin;
        fHtml += `<line x1="${c.frontWheelCenter.x}" y1="${c.frontWheelCenter.y}" x2="${fx2}" y2="${fy2}" stroke="#64748b" stroke-width="1" opacity="0.75" />`;
      }

      rearSpokes.innerHTML = rHtml;
      frontSpokes.innerHTML = fHtml;
    },

    // 啟動 60 FPS 動畫幀循環
    startAnimationLoop: function() {
      const self = this;
      self.lastFrameTime = performance.now();

      function loop(currentTime) {
        const dt = Math.min((currentTime - self.lastFrameTime) / 1000, 0.1);
        self.lastFrameTime = currentTime;

        if (!self.isCollapsed) {
          self.updatePhysics(dt, currentTime);
        }

        self.animFrameId = requestAnimationFrame(loop);
      }

      self.animFrameId = requestAnimationFrame(loop);
    },

    // 物理運動學與視差步進
    updatePhysics: function(dt, currentTime) {
      this.speedKmH += (this.targetSpeedKmH - this.speedKmH) * Math.min(dt * 3, 1);

      const angularSpeed = (this.speedKmH / 32) * 8.2;
      this.crankAngle += angularSpeed * dt;
      this.wheelAngle += angularSpeed * 1.8 * dt;

      const pxSpeed = this.speedKmH * 16 * dt;
      this.distanceTraveled += pxSpeed;

      // 2. 2-Bone IK 計算右腿 (相位 0)
      const c = this.config;
      const rightPedalX = c.crankCenter.x + c.crankRadius * Math.cos(this.crankAngle);
      const rightPedalY = c.crankCenter.y + c.crankRadius * Math.sin(this.crankAngle);
      const rightIK = this.solveIK(c.hip.x, c.hip.y, rightPedalX, rightPedalY, c.boneL1, c.boneL2);

      const thighR = document.getElementById('leg-thigh-right');
      const shinR = document.getElementById('leg-shin-right');
      const crankR = document.getElementById('leg-crank-right');
      const footR = document.getElementById('leg-foot-right');
      const soleR = document.getElementById('leg-sole-right');

      if (thighR && shinR && crankR && footR && soleR) {
        thighR.setAttribute('x2', rightIK.kneeX);
        thighR.setAttribute('y2', rightIK.kneeY);
        shinR.setAttribute('x1', rightIK.kneeX);
        shinR.setAttribute('y1', rightIK.kneeY);
        shinR.setAttribute('x2', rightIK.footX);
        shinR.setAttribute('y2', rightIK.footY);
        crankR.setAttribute('x2', rightIK.footX);
        crankR.setAttribute('y2', rightIK.footY);
        footR.setAttribute('x', rightIK.footX - 9);
        footR.setAttribute('y', rightIK.footY - 3);
        soleR.setAttribute('x', rightIK.footX - 9);
        soleR.setAttribute('y', rightIK.footY + 2);
      }

      // 3. 2-Bone IK 計算左腿 (相位 +PI)
      const leftAngle = this.crankAngle + Math.PI;
      const leftPedalX = c.crankCenter.x + c.crankRadius * Math.cos(leftAngle);
      const leftPedalY = c.crankCenter.y + c.crankRadius * Math.sin(leftAngle);
      const leftIK = this.solveIK(c.hip.x, c.hip.y, leftPedalX, leftPedalY, c.boneL1, c.boneL2);

      const thighL = document.getElementById('leg-thigh-left');
      const shinL = document.getElementById('leg-shin-left');
      const crankL = document.getElementById('leg-crank-left');
      const footL = document.getElementById('leg-foot-left');

      if (thighL && shinL && crankL && footL) {
        thighL.setAttribute('x2', leftIK.kneeX);
        thighL.setAttribute('y2', leftIK.kneeY);
        shinL.setAttribute('x1', leftIK.kneeX);
        shinL.setAttribute('y1', leftIK.kneeY);
        shinL.setAttribute('x2', leftIK.footX);
        shinL.setAttribute('y2', leftIK.footY);
        crankL.setAttribute('x2', leftIK.footX);
        crankL.setAttribute('y2', leftIK.footY);
        footL.setAttribute('x', leftIK.footX - 8);
        footL.setAttribute('y', leftIK.footY - 2.5);
      }

      // 4. 車輪輻條旋轉更新
      this.updateSpokes();

      // 5. 飄揚的紅色領帶動態
      const tie = document.getElementById('bull-red-tie');
      if (tie) {
        const wave1 = Math.sin(currentTime * 0.012 * (this.speedKmH / 20)) * 6;
        const wave2 = Math.cos(currentTime * 0.015 * (this.speedKmH / 20)) * 4;
        const endX = 445 - (this.speedKmH / 32) * 20;
        const endY = 126 + wave1;
        const midX = 480 - (this.speedKmH / 32) * 8;
        const midY = 132 + wave2;
        tie.setAttribute('d', `M 514,120 Q ${midX},${midY} ${endX},${endY} Q ${midX + 5},${midY + 4} 516,125 Z`);
      }

      // 6. 車籃寶物微幅彈跳
      const treasures = document.getElementById('basket-treasures');
      if (treasures) {
        const bounce = Math.sin(this.crankAngle * 2) * (this.speedKmH / 32) * 2.2;
        treasures.setAttribute('transform', `translate(0, ${bounce})`);
      }

      // 7. 公牛頭部隨踩踏微幅點頭
      const head = document.getElementById('bull-head-group');
      if (head) {
        const headBob = Math.sin(this.crankAngle * 2) * 1.5;
        head.setAttribute('transform', `translate(0, ${headBob})`);
      }

      // 8. 視差捲動：柏油路白色虛線標線 (Modulo 70)
      const laneMarkers = document.getElementById('svg-lane-markers');
      if (laneMarkers) {
        const markerOffset = (this.distanceTraveled * 1.0) % 70;
        let lmHtml = '';
        for (let x = -70; x < 1070; x += 70) {
          const rx = x - markerOffset;
          lmHtml += `<rect x="${rx}" y="258" width="42" height="4" rx="2" fill="#f8fafc" opacity="0.95" />`;
        }
        laneMarkers.innerHTML = lmHtml;
      }

      // 9. 視差捲動：K線山脈 (速度 0.45x)
      const candleLayer = document.getElementById('svg-candlestick-layer');
      if (candleLayer) {
        const kOffset = (this.distanceTraveled * 0.45) % 960;
        candleLayer.setAttribute('transform', `translate(-${kOffset}, 0)`);
      }

      // 10. 視差捲動：天際線大廈群 (速度 0.22x)
      const skylineLayer = document.getElementById('svg-skyline-layer');
      if (skylineLayer) {
        const sOffset = (this.distanceTraveled * 0.22) % 960;
        skylineLayer.setAttribute('transform', `translate(-${sOffset}, 0)`);
      }

      // 11. 視差捲動：雲層與熱氣球 (速度 0.08x 與 0.12x)
      const cloudsLayer = document.getElementById('svg-clouds-layer');
      if (cloudsLayer) {
        const cOffset = (this.distanceTraveled * 0.08) % 960;
        cloudsLayer.setAttribute('transform', `translate(-${cOffset}, 0)`);
      }

      const balloonsLayer = document.getElementById('svg-balloons-layer');
      if (balloonsLayer) {
        const bOffset = (this.distanceTraveled * 0.12) % 960;
        const bBob = Math.sin(currentTime * 0.002) * 5;
        balloonsLayer.setAttribute('transform', `translate(-${bOffset}, ${bBob})`);
      }
    },

    // 切換模式 (牛市狂飆 / 軟著陸巡航 / 避險防禦)
    setMode: function(modeKey, customStatusText) {
      const mode = this.MODES[modeKey];
      if (!mode) return;
      this.mode = modeKey;
      this.targetSpeedKmH = mode.targetSpeed;

      const skyBg = document.getElementById('svg-sky-bg');
      if (skyBg) skyBg.setAttribute('fill', mode.skyFill);

      const sun = document.getElementById('svg-sun');
      if (sun) sun.setAttribute('opacity', mode.sunOpacity);

      const moon = document.getElementById('svg-moon');
      if (moon) moon.setAttribute('opacity', mode.moonOpacity);

      const stars = document.getElementById('svg-stars');
      if (stars) stars.setAttribute('opacity', mode.starsOpacity);

      const beam = document.getElementById('svg-headlight-beam');
      if (beam) beam.setAttribute('opacity', mode.headlightOpacity);

      const lamps = document.querySelectorAll('.lamp-glow-bulb');
      lamps.forEach(l => l.setAttribute('opacity', mode.lampGlowOpacity));

      const badge = document.getElementById('bull-status-badge');
      const text = document.getElementById('bull-status-text');
      if (badge && text) {
        badge.className = `px-2.5 py-0.5 rounded-full text-[11px] font-bold border flex items-center gap-1.5 transition ${mode.badgeClass}`;
        text.innerText = customStatusText || `即時數據：${mode.name} (${mode.targetSpeed} km/h)`;
      }
    },

    // 依據首頁真實市場行情數據自動對齊 (Pure Data-Driven)
    syncWithMarketData: function(data) {
      if (!data) return;
      const vix = typeof data.vix === 'number' ? data.vix : 17.3;
      const twiiPct = typeof data.twii_pct === 'number' ? data.twii_pct : 0.5;

      if (vix > 24 || twiiPct < -1.0) {
        const reason = vix > 24 ? `恐慌 VIX ${vix.toFixed(1)} 高企` : `大盤承壓 ${twiiPct.toFixed(2)}%`;
        this.setMode('risk_off', `🔴 即時數據驅動：避險防禦 (10 km/h) · ${reason}`);
      } else if (vix >= 18 || twiiPct < 0) {
        this.setMode('cruise', `🟡 即時數據驅動：軟著陸巡航 (20 km/h) · VIX ${vix.toFixed(1)} 盤整`);
      } else {
        const sign = twiiPct >= 0 ? '+' : '';
        this.setMode('bull_sprint', `🟢 即時數據驅動：牛市狂飆 (32 km/h) · 台股 ${sign}${twiiPct.toFixed(2)}% · VIX ${vix.toFixed(1)}`);
      }
    },

    // 紐約證交所開盤敲鐘聲 (Web Audio API 合成經典金屬開盤鐘聲)
    playNYSEBell: function() {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const now = ctx.currentTime;

        const harmonics = [784, 1174.66, 1568, 2349.32];
        const weights = [0.6, 0.4, 0.25, 0.15];

        harmonics.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = idx === 0 ? 'triangle' : 'sine';
          osc.frequency.setValueAtTime(freq, now);

          gain.gain.setValueAtTime(weights[idx] * 0.45, now);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.4);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now);
          osc.stop(now + 2.5);
        });

        const head = document.getElementById('bull-head-group');
        if (head) {
          head.setAttribute('transform', 'scale(1.08) translate(-40, -10)');
          setTimeout(() => {
            head.setAttribute('transform', 'scale(1) translate(0, 0)');
          }, 180);
        }
      } catch (e) {
        console.warn('NYSE Bell audio synthesis notice:', e.message);
      }
    },

    // 收合 / 展開畫卷
    toggleCollapse: function() {
      this.setCollapsed(!this.isCollapsed);
    },

    setCollapsed: function(collapsed) {
      this.isCollapsed = collapsed;
      const wrap = document.getElementById('bull-hero-canvas-wrap');
      const toggleText = document.getElementById('bull-toggle-text');
      const toggleIcon = document.getElementById('bull-toggle-icon');

      if (wrap) {
        if (this.isCollapsed) {
          wrap.style.maxHeight = '0px';
          wrap.style.opacity = '0';
          wrap.style.pointerEvents = 'none';
          if (toggleText) toggleText.innerText = '展開';
          if (toggleIcon) toggleIcon.innerText = '🔽';
        } else {
          wrap.style.maxHeight = '290px';
          wrap.style.opacity = '1';
          wrap.style.pointerEvents = 'auto';
          if (toggleText) toggleText.innerText = '收合';
          if (toggleIcon) toggleIcon.innerText = '🔼';
        }
      }

      try {
        localStorage.setItem('bull_hero_collapsed', this.isCollapsed ? 'true' : 'false');
      } catch (e) {}
    }
  };

  // 掛載至全域
  window.MacroBullEngine = MacroBullEngine;

  // DOM 載入後自動初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => MacroBullEngine.init());
  } else {
    MacroBullEngine.init();
  }
})();
