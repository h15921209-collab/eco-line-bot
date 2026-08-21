import sys
import os

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

from database import init_db
from setup_db import seed_initial_data
from data_service import DataService
from bot_handler import LineBotHandler
from ai_analyzer import EconomicAIAnalyzer
from fastapi.testclient import TestClient
from main import app

def run_tests():
    print("=== 1. 測試資料庫初始化與種子資料 ===")
    seed_initial_data()

    print("\n=== 2. 測試 DataService 讀寫 ===")
    with DataService() as service:
        # 新增/更新一筆測試數據
        rec = service.add_record("CPI", actual_value=2.8, record_date="2026-08", forecast_value=2.9, previous_value=2.9, notes="再創低點")
        print(f"[OK] 成功寫入數據: {rec}")
        
        # 查詢歷史序列
        history = service.get_indicator_history("CPI", limit=5)
        print(f"[OK] 查詢 CPI 歷史筆數: {len(history['records'])}")
        assert len(history['records']) >= 4, "歷史筆數應大於等於 4 筆"

        # 取得總經快照
        snapshot = service.get_latest_macro_snapshot()
        print(f"[OK] 總經快照指標數量: {len(snapshot)}")
        assert len(snapshot) > 0, "快照不應為空"

    print("\n=== 3. 測試 LINE Bot 指令處理器 ===")
    handler = LineBotHandler()
    
    # 測試 '說明'
    help_resp = handler.handle_message("說明")
    print(f"[OK] 說明指令回應長度: {len(help_resp)}")
    assert "操作說明" in help_resp

    # 測試 '指標清單'
    list_resp = handler.handle_message("指標清單")
    print(f"[OK] 指標清單回應片段:\n{list_resp[:120]}...")
    assert "CPI" in list_resp

    # 測試 '記錄' 指令
    add_resp = handler.handle_message("記錄 NFP 2026-08 16.5 15.0 11.4 勞動市場溫和回升")
    print(f"[OK] 記錄指令回應:\n{add_resp}")
    assert "成功寫入" in add_resp

    # 測試 '查詢 CPI'
    query_resp = handler.handle_message("查詢 CPI")
    print(f"[OK] 查詢 CPI 回應片段:\n{query_resp[:150]}...")
    assert "CPI" in query_resp

    # 測試 '週報' 生成
    report_resp = handler.handle_message("週報")
    print(f"[OK] 週報生成回應片段:\n{report_resp[:200]}...")
    assert len(report_resp) > 50

    print("\n=== 4. 測試 FastAPI 端點 ===")
    client = TestClient(app)
    
    # Health check
    h_res = client.get("/health")
    assert h_res.status_code == 200 and h_res.json() == {"status": "ok"}
    print("[OK] GET /health 正常")

    # Indicators list
    ind_res = client.get("/api/indicators")
    assert ind_res.status_code == 200
    print(f"[OK] GET /api/indicators 正常, 回傳指標數: {len(ind_res.json()['indicators'])}")

    # Simulate Chat API
    chat_res = client.post("/api/simulate-chat", json={"message": "週報"})
    assert chat_res.status_code == 200
    print("[OK] POST /api/simulate-chat 正常")

    print("\n🎉 ALL TESTS PASSED SUCCESSFULLY! 系統各模組運作完全正常！")

if __name__ == "__main__":
    run_tests()