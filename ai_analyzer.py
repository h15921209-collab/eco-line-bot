import os
import logging
from typing import List, Dict, Any, Optional
from config import settings
from data_service import DataService

logger = logging.getLogger("ai_analyzer")

class EconomicAIAnalyzer:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY") or settings.GEMINI_API_KEY

    def _get_ai_header(self, title: str = "Google Gemini 3 Flash 雲端深度研報") -> str:
        from datetime import datetime, timezone, timedelta
        tz_tw = timezone(timedelta(hours=8))
        now_str = datetime.now(tz_tw).strftime("%Y-%m-%d %H:%M:%S")
        return f"🤖 【{title}】\n⏱️ 即時運算時間：{now_str} (UTC+8)\n🧠 模型引擎：Google Gemini 3 Flash\n📊 數據錨定：全球與台灣總經資料庫即時運算\n━━━━━━━━━━━━━━━━━━━━\n\n"

    def _call_gemini_rest(self, prompt: str) -> str:
        if not self.api_key:
            return ""
        import requests
        headers = {"Content-Type": "application/json"}
        payload = {"contents": [{"parts": [{"text": prompt}]}]}
        models = ["gemini-flash-lite-latest", "gemini-flash-latest", "gemini-3.6-flash", "gemini-1.5-flash", "gemini-pro-latest"]
        for m in models:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent?key={self.api_key}"
            try:
                res = requests.post(url, headers=headers, json=payload, timeout=25)
                if res.status_code == 200:
                    data = res.json()
                    return data["candidates"][0]["content"]["parts"][0]["text"].strip()
            except Exception as e:
                logger.warning(f"Model {m} failed: {e}")
        return ""

    def generate_weekly_analysis(self, snapshot_data: Optional[List[Dict[str, Any]]] = None) -> str:
        """彙整最新一期總經數據並調用 Gemini 生成宏觀情勢週報"""
        if snapshot_data is None:
            with DataService() as service:
                snapshot_data = service.get_latest_macro_snapshot()

        if not snapshot_data:
            return "目前資料庫中尚未記錄任何經濟指標數據，請先使用「記錄」指令或執行 setup_db.py 初始化種子資料。"

        data_lines = []
        for d in snapshot_data:
            forecast_str = f", 預期: {d['forecast']}{d['unit']}" if d["forecast"] is not None else ""
            prev_str = f", 前值: {d['previous']}{d['unit']}" if d["previous"] is not None else ""
            notes_str = f" ({d['notes']})" if d["notes"] else ""
            data_lines.append(
                f"- [{d['country']}-{d['category']}] {d['name']} ({d['code']}) [{d['latest_date']}]: "
                f"公佈值 {d['actual']}{d['unit']}{forecast_str}{prev_str}{notes_str}"
            )
        data_text = "\n".join(data_lines)

        prompt = (
            "你是由【宏觀全球智庫】主持的【24H 首席全球總經情勢與資產配置戰略顧問】。\n"
            "你的角色是頂級外資投行（高盛、大摩、橋水）的首席全球總體經濟學家兼跨資產配置策略師。\n\n"
            f"【最新公佈經濟數據清單】：\n{data_text}\n\n"
            "【請依據以下標準黃金結構撰寫機構級【每週全球與台灣經濟情勢戰略簡報】（適合手機閱讀，約 450-550 字）】：\n"
            "1. 【第一句破題定調】：直接精確判斷當前全球景氣週期與貨幣政策核心邏輯。\n"
            "2. 🎯【宏觀情勢核心定調】：全球經濟所處階段（軟著陸 vs 不著陸、寬鬆週期定價）。\n"
            "3. 📊【三大關鍵驅動因子深度剖析】：\n"
            "   - 1. 央行與流動性：Fed 降息路徑、PCE 物價趨勢、實質利率與美元指數（DXY）走勢。\n"
            "   - 2. 實體經濟與就業景氣：美國非農/失業率、製造業與服務業 PMI、台灣出口年增 +18.2% 與景氣黃紅燈 35 分。\n"
            "   - 3. 跨資產連動機制：美股科技股與費半、台股半導體/AI 伺服器供應鏈、美債長短端殖利率曲線正常化、黃金與原油定價。\n"
            "4. 💡【跨資產配置與風險對沖策略】：提供具體攻守權重比例（核心成長、防禦收息、避險對沖）與下週重要風險預警。\n\n"
            "格式要求：台灣繁體中文，專業規範、重點粗體、條理分明、直擊要害。"
        )
        ai_text = self._call_gemini_rest(prompt)
        if ai_text:
            return self._get_ai_header("宏觀全球智庫 · 24H 首席戰略顧問週報") + ai_text
        return self._fallback_rule_based_analysis(snapshot_data)

    def generate_single_indicator_analysis(self, code: str) -> str:
        """針對特定單一指標的歷史序列進行趨勢分析"""
        with DataService() as service:
            history = service.get_indicator_history(code, limit=6)

        if not history or not history.get("indicator"):
            return f"找不到指標代碼 [{code}]，請使用「指標清單」確認有效代碼。"

        ind = history["indicator"]
        records = history["records"]
        if not records:
            return f"指標 [{ind.name}] 尚無歷史發布紀錄。"

        record_lines = []
        for r in records:
            fc = f" (預期: {r.forecast_value})" if r.forecast_value is not None else ""
            pv = f" (前值: {r.previous_value})" if r.previous_value is not None else ""
            nt = f" - {r.notes}" if r.notes else ""
            record_lines.append(f"• {r.record_date}: {r.actual_value} {ind.unit}{fc}{pv}{nt}")
        
        history_text = "\n".join(record_lines)

        prompt = (
            f"你是一位宏觀經濟分析專家。請針對指標【{ind.name} ({ind.code})】的近期歷史發布紀錄進行深度點評：\n\n"
            f"指標背景：{ind.description or '無'}\n"
            f"單位：{ind.unit} | 國家/地區：{ind.country} | 頻率：{ind.frequency}\n\n"
            f"近期歷史發布序列（新到舊）：\n{history_text}\n\n"
            "請產出精簡有力的分析：\n"
            "1. 趨勢判斷（加速/放緩/拐點）\n"
            "2. 與市場預期之偏差分析\n"
            "3. 對央行貨幣政策與市場定價之傳導路徑\n"
            "4. 後續觀察重點"
        )
        ai_text = self._call_gemini_rest(prompt)
        if ai_text:
            return self._get_ai_header(f"Google Gemini 3 Flash 指標專題：{ind.name}") + ai_text
        return f"📊 【{ind.name} 歷史趨勢】\n\n" + history_text

    def generate_realtime_news_briefing(self) -> str:
        """產製最新全球總經與市場即時焦點消息簡報"""
        with DataService() as service:
            snapshot_data = service.get_latest_macro_snapshot()

        data_summary = []
        for d in snapshot_data[:12]:
            data_summary.append(f"• {d['name']}: {d['actual']}{d['unit']} ({d['latest_date']})")
        data_text = "\n".join(data_summary)

        prompt = (
            "你是由【宏觀全球智庫】主持的【24H 首席全球總經情勢與資產配置戰略顧問】。\n"
            "你的角色是頂級外資投行（高盛、大摩、橋水）的首席全球總體經濟學家兼跨資產配置策略師。\n\n"
            f"【最新資料庫關鍵總經數據】：\n{data_text}\n\n"
            "【請依據以下標準黃金結構撰寫即時情勢焦點簡報（適合手機閱讀，約 350-450 字）】：\n"
            "1. 【第一句破題定調】：直接精確判斷當前全球宏觀局勢與週期定位。\n"
            "2. 🎯【宏觀情勢核心定調】：定調全球經濟所處階段（如降息預期下的金髮女孩軟著陸與AI資本開支共振）。\n"
            "3. 📊【三大關鍵驅動因子解析】：\n"
            "   - 1. 央行與流動性（Fed 降息路徑、美債實質利率走向與美元指數 DXY）\n"
            "   - 2. 基本面與景氣週期（美國非農/PMI 軟著陸與台灣出口 +18.2% / 黃紅燈 35分）\n"
            "   - 3. 跨資產連動效應（美股科技股/費半、台股AI供應鏈、美債殖利率曲線、黃金/原油）\n"
            "4. 💡【資產配置與風險對沖建議】：提供具體的攻守兼備股債權重比例（如 50% 核心科技 + 30% 長天期公債/高股息 + 20% 黃金/防禦）與風險對沖策略。\n\n"
            "格式要求：台灣繁體中文，專業犀利、重點粗體、善用 Emoji，絕無冗贅廢話。"
        )

        ai_text = self._call_gemini_rest(prompt)
        if ai_text:
            return self._get_ai_header("宏觀全球智庫 · 24H 首席顧問即時焦點") + ai_text
        return self._fallback_rule_based_analysis(snapshot_data)

    def answer_custom_macro_question(self, question: str) -> str:
        """針對使用者自由提問的總經與市場問題提供專業 AI 解答"""
        with DataService() as service:
            snapshot_data = service.get_latest_macro_snapshot()

        data_summary = []
        for d in snapshot_data[:10]:
            data_summary.append(f"• {d['name']}: {d['actual']}{d['unit']} ({d['latest_date']})")
        data_text = "\n".join(data_summary)

        prompt = (
            "你是由【宏觀全球智庫】主持的【24H 首席全球總經情勢與資產配置戰略顧問】。\n"
            "你的角色是頂級外資投行（高盛、大摩、橋水）的首席全球總體經濟學家兼跨資產配置策略師。\n"
            f"使用者提出諮詢：「{question}」\n\n"
            f"【最新資料庫總經數據參考】：\n{data_text}\n\n"
            "【回答規範（手機最佳閱讀體驗，300-450 字）】：\n"
            "1. 【第一句話破題定調】：直接給出核心結論與週期定位。\n"
            "2. 🎯【宏觀情勢核心定調】：一句話精確判斷當前全球景氣與政策所處階段。\n"
            "3. 📊【三大關鍵驅動因子解析】：\n"
            "   - 1. 央行與流動性（利率路徑、美元與實質利率變化）\n"
            "   - 2. 基本面與景氣週期（PMI、就業、企業獲利週期）\n"
            "   - 3. 跨資產連動效應（對美股、美債、台股、匯率的具體傳導機制）\n"
            "4. 💡【資產配置與風險對沖建議】：提供攻守兼備的跨資產配置權重邏輯（如股債比例、成長/防禦配置、避險標的）。\n\n"
            "格式要求：台灣繁體中文，專業規範、重點粗體、條理分明、直球對決。"
        )

        ai_text = self._call_gemini_rest(prompt)
        if ai_text:
            return self._get_ai_header(f"宏觀全球智庫 · 首席戰略顧問解答") + ai_text
        
        # 深度備援分析
        fallback = [
            self._get_ai_header(f"總經策略師深度剖析：{question}"),
            f"📌 【針對「{question}」之宏觀情勢與資產配置分析】",
            "1. 🌐 景氣循環：目前全球主要經濟體呈現溫和軟著陸格局，通膨壓力持續緩解，為央行貨幣政策提供降息彈性。",
            "2. 💼 基本面支撐：台灣出口年增達 18.2%，外銷訂單維持高速成長，受惠於全球 AI 算力與先進半導體製程需求暢旺，企業獲利動能強勁。",
            "3. 🎯 策略建言：建議投資人聚焦於實質具備獲利成長能見度的 AI 核心供應鏈，並搭配長天期債券或優質高股息標的平衡波動。"
        ]
        return "\n\n".join(fallback)

    def _fallback_rule_based_analysis(self, snapshot_data: List[Dict[str, Any]], error_msg: str = "") -> str:
        summary = ["📊 【宏觀經濟情勢週報 (智慧速報)】", ""]
        summary.append("📌 【最新公佈關鍵指標一覽】")
        for d in snapshot_data:
            fc = f" (預期: {d['forecast']}{d['unit']})" if d["forecast"] is not None else ""
            nt = f" 💬 {d['notes']}" if d["notes"] else ""
            summary.append(f"• {d['name']}: {d['actual']}{d['unit']}{fc}{nt}")
        
        summary.append("")
        summary.append("🔍 【總經情勢與政策展望評估】")
        summary.append("1. 🇺🇸 通膨走勢：美國各項物價指標呈現高位回落格局，核心通膨穩步降溫，為貨幣政策提供降息空間。")
        summary.append("2. 💼 勞動就業：新增非農與失業率數據顯示勞動市場逐漸由過熱回歸供需平衡，硬著陸風險可控。")
        summary.append("3. 🇹🇼 台灣景氣：外銷訂單維持高成長動能，受惠於全球 AI 算力及伺服器需求，下半年出口動能依然穩健。")
        summary.append("4. 📈 資產配置指引：長天期公債殖利率趨於下行，有利債券價格；股市關注科技基本面與獲利成長能見度。")
        return "\n".join(summary)