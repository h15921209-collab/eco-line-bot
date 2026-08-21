import logging
from typing import Optional
from data_service import DataService
from ai_analyzer import EconomicAIAnalyzer

logger = logging.getLogger("bot_handler")

class LineBotHandler:
    def __init__(self):
        self.analyzer = EconomicAIAnalyzer()

    def handle_message(self, user_text: str) -> str:
        text = user_text.strip()
        
        # 1. 說明與選單
        if text in ("說明", "幫助", "help", "選單", "指令", "?"):
            return self._get_help_menu()

        # 2. 產出最新經濟情勢分析 / 週報
        if text in ("週報", "分析", "經濟分析", "最新分析", "總經分析", "情勢分析", "報告"):
            return self.analyzer.generate_weekly_analysis()

        # 3. 查詢指標清單
        if text in ("指標清單", "清單", "指標", "list"):
            return self._get_indicator_list()

        # 4. 歷史數據查詢 (如: 查詢 CPI, 歷史 NFP)
        if text.startswith(("查詢", "歷史", "趨勢", "history")):
            parts = text.split()
            if len(parts) > 1:
                code = parts[1].upper()
                return self.analyzer.generate_single_indicator_analysis(code)
            else:
                return "請指定要查詢的指標代碼！例如：`查詢 CPI` 或 `趨勢 NFP`"

        # 5. 數據錄入 (如: 記錄 CPI 3.1 3.0 或 記錄 CPI 2026-07 3.1 3.0)
        if text.startswith(("記錄", "新增", "add", "record", "更新")):
            return self._handle_add_record(text)

        # 6. 模糊比對特定指標名 (如用戶直接輸入 CPI)
        with DataService() as service:
            indicator = service.get_indicator_by_code(text)
            if indicator:
                return self.analyzer.generate_single_indicator_analysis(indicator.code)

        # 預設回傳智能提示
        return (
            f"收到訊息：「{text}」\n\n"
            "您可以輸入以下常用指令：\n"
            "👉 【週報】或【經濟分析】：產出最新總經情勢報告\n"
            "👉 【查詢 CPI】：查看指定指標歷史趨勢與點評\n"
            "👉 【指標清單】：瀏覽所有追蹤的總經指標\n"
            "👉 【記錄 CPI 3.1 3.0】：錄入最新公佈數據\n"
            "👉 【說明】：查看完整操作指南"
        )

    def _get_help_menu(self) -> str:
        return (
            "🤖 【經濟數據與分析 LINE 助手 - 操作說明】\n\n"
            "📊 產出分析報告：\n"
            "• 輸入「週報」或「最新分析」\n"
            "  👉 根據最新公佈數據與歷史走勢，自動生成專業宏觀經濟簡報與股債匯影響評估。\n\n"
            "📈 指標與歷史查詢：\n"
            "• 輸入「指標清單」：查看所有追蹤指標與最新期數\n"
            "• 輸入「查詢 CPI」或「歷史 NFP」：查看該指標歷史數據與專題分析\n\n"
            "✍️ 分析員快捷錄入數據：\n"
            "• 格式：`記錄 [代碼] [公佈值] [預測值] [前值] [備註]`\n"
            "• 範例 1：`記錄 CPI 2.9 3.0 3.0 超預期降溫`\n"
            "• 範例 2 (指定月份)：`記錄 NFP 2026-07 11.4 17.5`\n\n"
            "💡 提示：所有歷史數據皆會永久安全存檔在資料庫中！"
        )

    def _get_indicator_list(self) -> str:
        with DataService() as service:
            snapshot = service.get_latest_macro_snapshot()
        
        if not snapshot:
            return "目前尚未建立任何指標，請先執行 setup_db.py"

        lines = ["📋 【系統追蹤經濟指標與最新數值】\n"]
        current_cat = ""
        for item in snapshot:
            if item["category"] != current_cat:
                current_cat = item["category"]
                lines.append(f"\n【{current_cat}】")
            
            fc = f"(預期:{item['forecast']})" if item["forecast"] is not None else ""
            lines.append(f"• {item['name']} [{item['code']}]: {item['actual']}{item['unit']} {fc} [{item['latest_date']}]")
        
        lines.append("\n\n💡 提示：輸入 `查詢 [代碼]` 可查看歷史明細，如 `查詢 CPI`")
        return "\n".join(lines)

    def _handle_add_record(self, text: str) -> str:
        with DataService() as service:
            try:
                res = service.parse_manual_input(text)
                return (
                    f"✅ 數據已成功寫入資料庫！\n\n"
                    f"📌 指標代碼：{res['code']}\n"
                    f"📅 數據所屬期間：{res['record_date']}\n"
                    f"🔢 公佈值：{res['actual']}\n"
                    f"🎯 市場預期：{res['forecast'] if res['forecast'] is not None else '無'}\n"
                    f"⏮️ 前期修正值：{res['previous'] if res['previous'] is not None else '無'}\n"
                    f"💬 備註：{res['notes'] or '無'}\n\n"
                    f"您可以隨時輸入「週報」取得更新後的最新情勢分析！"
                )
            except Exception as e:
                return f"❌ 錄入失敗：{str(e)}"