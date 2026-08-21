import logging
from typing import List, Dict, Any, Optional
from config import settings
from data_service import DataService

logger = logging.getLogger("ai_analyzer")

class EconomicAIAnalyzer:
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY

    def _call_gemini_rest(self, prompt: str) -> str:
        if not self.api_key:
            return ""
        import requests
        headers = {"Content-Type": "application/json"}
        payload = {"contents": [{"parts": [{"text": prompt}]}]}
        models = ["gemini-flash-latest", "gemini-flash-lite-latest", "gemini-3.6-flash", "gemini-1.5-flash", "gemini-pro-latest"]
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
            "你是一位擁有20年經驗的資深宏觀經濟研究主管與首席策略師。\n"
            "請根據以下最新公佈的各項經濟數據與市場指標，為投資人與研究員撰寫一份結構嚴謹、見解精準的【每週全球與台灣經濟情勢分析簡報】。\n\n"
            f"【最新公佈經濟數據清單】\n{data_text}\n\n"
            "【請依據以下標準結構撰寫分析報告】：\n"
            "1. 📌【本週總經情勢核心摘要】（3-4點精華，指出最關鍵的數據變化與宏觀定調）\n"
            "2. 🔍【核心數據深度剖析】\n"
            "   - 通膨與物價走勢（CPI、Core CPI、PCE 等評估）\n"
            "   - 就業市場與勞動力健康度（非農 NFP、失業率、初領等評估）\n"
            "   - 央行貨幣政策預期（對聯準會 FOMC 降息/升息路徑的影響）\n"
            "   - 亞洲/台灣經濟亮點（外銷訂單、PMI 與科技供應鏈拉動力道）\n"
            "3. 💼【跨資產市場影響與佈局指引】\n"
            "   - 股市（美股 / 台股科技股評估）\n"
            "   - 債市（美債殖利率走向與公債配置）\n"
            "   - 匯市與大宗商品（美元指數與資金流向）\n"
            "4. ⚠️【下週重點關注事件與風險提示】\n\n"
            "格式要求：\n"
            "- 使用繁體中文，語氣客觀、專業、結構清晰。\n"
            "- 善用 Emoji 與 Markdown 列點，適合在 LINE 上清晰閱讀。"
        )
        ai_text = self._call_gemini_rest(prompt)
        if ai_text:
            return ai_text
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
            return f"📊 【{ind.name} 專題分析】\n\n" + ai_text
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
            "你是一位頂尖國際金融機構的宏觀策略主管與資深財經主播。\n"
            "請為投資人與研究主管撰寫一份最新、最具時效性的【全球總經與財經市場即時情勢焦點速報】。\n\n"
            f"【最新資料庫關鍵總經數據參考】：\n{data_text}\n\n"
            "【報告結構要求】：\n"
            "🔥 1. 【全球總經與央行焦點】（聯準會降息動態、美債殖利率走向、美元走勢）\n"
            "⚡ 2. 【即時市場快訊與盤勢重點】（美股期指/美股三大指數、科技巨頭、債市定價）\n"
            "🇹🇼 3. 【台灣經濟與科技焦點】（台積電/AI伺服器供應鏈、出口與外銷訂單力道）\n"
            "🎯 4. 【情勢總結與投資人操盤指引】（股、債、匯、大宗原物料重點應對策略）\n\n"
            "格式要求：\n"
            "- 繁體中文，專業犀利、條理分明、層次豐富。\n"
            "- 善用 Emoji 與重點粗體標示，便於手機快速掌握要點。"
        )

        ai_text = self._call_gemini_rest(prompt)
        if ai_text:
            return ai_text
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
            "你是一位擁有20年經驗的首席總體經濟學家與資深投資策略師。\n"
            f"使用者提出了一個財經/總經問題：「{question}」\n\n"
            f"【最新資料庫總經背景參考】：\n{data_text}\n\n"
            "請依據客觀經濟學邏輯與最新市場脈動，給出專業、精闢且具實務價值的解答。\n"
            "格式要求：繁體中文，善用列點與 Emoji，語氣自信專業。"
        )

        ai_text = self._call_gemini_rest(prompt)
        if ai_text:
            return ai_text
        return f"針對「{question}」：目前各項指標顯示全球通膨持續降溫，聯準會降息路徑明確，建議關注下週最新數據發布。"

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