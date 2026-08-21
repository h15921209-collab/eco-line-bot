import sys
import os

os.environ["PYTHONIOENCODING"] = "utf-8"
os.environ["PYTHONUTF8"] = "1"
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

from database import init_db
from data_service import DataService

def populate_comprehensive_economic_data():
    print("[INIT] Starting economic database initialization...")
    init_db()
    
    with DataService() as service:
        service.create_or_get_indicator(
            code="CPI",
            name="美國消費者物價指數 (CPI 年增率)",
            category="美國通膨",
            country="美國",
            unit="%",
            frequency="月度",
            description="衡量美國城市消費者購買商品與服務的價格變化。"
        )
        service.create_or_get_indicator(
            code="CORE_CPI",
            name="美國核心CPI (Core CPI 年增率)",
            category="美國通膨",
            country="美國",
            unit="%",
            frequency="月度",
            description="排除波動較大的食品與能源價格。"
        )
        service.create_or_get_indicator(
            code="CORE_PCE",
            name="美國核心PCE物價指數 (Core PCE 年增率)",
            category="美國通膨",
            country="美國",
            unit="%",
            frequency="月度",
            description="聯準會制定貨幣政策最核心關注的通膨指標。"
        )
        service.create_or_get_indicator(
            code="PPI",
            name="美國生產者物價指數 (PPI 年增率)",
            category="美國通膨",
            country="美國",
            unit="%",
            frequency="月度",
            description="衡量生產端批發價格變動。"
        )
        service.create_or_get_indicator(
            code="NFP",
            name="美國非農就業人口新增 (NFP)",
            category="美國就業",
            country="美國",
            unit="萬人",
            frequency="月度",
            description="勞動市場景氣首要指標。"
        )
        service.create_or_get_indicator(
            code="UNEMP",
            name="美國失業率 (Unemployment Rate)",
            category="美國就業",
            country="美國",
            unit="%",
            frequency="月度",
            description="衡量失業狀態之勞動力比例。"
        )
        service.create_or_get_indicator(
            code="JOBLESS_CLAIMS",
            name="美國初領失業金人數",
            category="美國就業",
            country="美國",
            unit="萬人",
            frequency="週度",
            description="每週四發布之高頻勞動數據。"
        )
        service.create_or_get_indicator(
            code="WAGE_GROWTH",
            name="美國平均時薪年增率",
            category="美國就業",
            country="美國",
            unit="%",
            frequency="月度",
            description="評估工資螺旋上升壓力。"
        )
        service.create_or_get_indicator(
            code="FED_RATE",
            name="聯準會基準利率上限",
            category="貨幣政策",
            country="美國",
            unit="%",
            frequency="不定期",
            description="政策基準利率區間上限。"
        )
        service.create_or_get_indicator(
            code="US10Y",
            name="美國10年期公債殖利率",
            category="金融市場",
            country="美國",
            unit="%",
            frequency="日度/週度",
            description="全球無風險資產定價之錨。"
        )
        service.create_or_get_indicator(
            code="US2Y",
            name="美國2年期公債殖利率",
            category="金融市場",
            country="美國",
            unit="%",
            frequency="日度/週度",
            description="短期利率預期指標。"
        )
        service.create_or_get_indicator(
            code="DXY",
            name="美元指數",
            category="金融市場",
            country="全球",
            unit="點",
            frequency="日度/週度",
            description="美元強弱指標。"
        )
        service.create_or_get_indicator(
            code="US_GDP",
            name="美國實質GDP季增年率",
            category="美國經濟動能",
            country="美國",
            unit="%",
            frequency="季度",
            description="宏觀經濟增長數據。"
        )
        service.create_or_get_indicator(
            code="ISM_MFG",
            name="美國ISM製造業PMI",
            category="美國經濟動能",
            country="美國",
            unit="點",
            frequency="月度",
            description="製造業景氣指標。"
        )
        service.create_or_get_indicator(
            code="ISM_SERVICES",
            name="美國ISM服務業PMI",
            category="美國經濟動能",
            country="美國",
            unit="點",
            frequency="月度",
            description="服務業景氣指標。"
        )
        service.create_or_get_indicator(
            code="RETAIL_SALES",
            name="美國零售銷售月增率",
            category="美國經濟動能",
            country="美國",
            unit="%",
            frequency="月度",
            description="民間消費動能。"
        )
        service.create_or_get_indicator(
            code="TW_EXPORT_ORDERS",
            name="台灣外銷訂單年增率",
            category="台灣總經",
            country="台灣",
            unit="%",
            frequency="月度",
            description="全球科技供應鏈拉貨動能。"
        )
        service.create_or_get_indicator(
            code="TW_EXPORTS",
            name="台灣海關出口總值年增率",
            category="台灣總經",
            country="台灣",
            unit="%",
            frequency="月度",
            description="實體海關出口年變動率。"
        )
        service.create_or_get_indicator(
            code="TW_PMI",
            name="台灣製造業PMI",
            category="台灣總經",
            country="台灣",
            unit="點",
            frequency="月度",
            description="製造業擴張動能。"
        )
        service.create_or_get_indicator(
            code="TW_SIGNAL",
            name="台灣景氣對策信號綜合分數",
            category="台灣總經",
            country="台灣",
            unit="分",
            frequency="月度",
            description="景氣循環位置。"
        )
        service.create_or_get_indicator(
            code="TW_CPI",
            name="台灣消費者物價指數年增率",
            category="台灣總經",
            country="台灣",
            unit="%",
            frequency="月度",
            description="國內物價穩定依據。"
        )
        service.create_or_get_indicator(
            code="TW_CBC_RATE",
            name="台灣央行重貼現率",
            category="台灣總經",
            country="台灣",
            unit="%",
            frequency="季度",
            description="央行基準利率。"
        )
        service.create_or_get_indicator(
            code="BRENT_OIL",
            name="布蘭特原油價格",
            category="大宗原物料",
            country="全球",
            unit="美元/桶",
            frequency="日度/週度",
            description="全球能源成本基準。"
        )
        service.create_or_get_indicator(
            code="GOLD",
            name="國際黃金現貨價格",
            category="大宗原物料",
            country="全球",
            unit="美元/盎司",
            frequency="日度/週度",
            description="避險與央行購金指標。"
        )

        dataset = [
            ("CPI", "2026-06", 3.0, 3.1, 3.3, "降溫超預期"),
            ("CPI", "2026-07", 2.9, 3.0, 3.0, "創近三年新低"),
            ("CPI", "2026-08", 2.8, 2.9, 2.9, "商品物價續跌"),
            ("CORE_CPI", "2026-07", 3.2, 3.2, 3.3, "核心通膨受控"),
            ("CORE_CPI", "2026-08", 3.1, 3.2, 3.2, "朝目標靠攏"),
            ("CORE_PCE", "2026-07", 2.5, 2.5, 2.6, "接近2%目標"),
            ("PPI", "2026-07", 2.2, 2.3, 2.6, "生產者通膨降溫"),
            ("NFP", "2026-07", 11.4, 17.5, 17.9, "就業放緩"),
            ("NFP", "2026-08", 16.2, 15.0, 11.4, "回歸溫和均衡"),
            ("UNEMP", "2026-07", 4.3, 4.1, 4.1, "觸及高點"),
            ("UNEMP", "2026-08", 4.2, 4.3, 4.3, "失業率回落"),
            ("JOBLESS_CLAIMS", "2026-08-15", 22.7, 23.5, 23.3, "就業數據穩固"),
            ("WAGE_GROWTH", "2026-07", 3.6, 3.7, 3.9, "創2021年以來最低"),
            ("FED_RATE", "2026-07", 5.50, 5.50, 5.50, "維持利率"),
            ("US10Y", "2026-08", 3.88, None, 4.05, "殖利率跌破3.9%"),
            ("US2Y", "2026-08", 3.95, None, 4.26, "倒掛收窄"),
            ("DXY", "2026-08", 102.1, None, 104.2, "走勢偏弱"),
            ("US_GDP", "2026-Q2", 2.8, 2.0, 1.4, "消費與投資強勁"),
            ("ISM_MFG", "2026-07", 46.8, 48.8, 48.5, "製造業緊縮"),
            ("ISM_SERVICES", "2026-07", 51.4, 51.0, 48.8, "重返擴張"),
            ("RETAIL_SALES", "2026-07", 1.0, 0.3, 0.0, "零售強勁"),
            ("TW_EXPORT_ORDERS", "2026-07", 8.5, 6.5, 3.1, "AI訂單爆發"),
            ("TW_EXPORTS", "2026-07", 18.2, 14.0, 23.5, "AI出口創新高"),
            ("TW_PMI", "2026-07", 52.2, 53.0, 53.7, "維持擴張"),
            ("TW_SIGNAL", "2026-07", 35.0, 36.0, 38.0, "處黃紅燈高位"),
            ("TW_CPI", "2026-07", 2.52, 2.30, 2.42, "蔬果價格推升"),
            ("TW_CBC_RATE", "2026-06", 2.00, 2.00, 2.00, "維持利率"),
            ("BRENT_OIL", "2026-08", 77.5, None, 81.3, "下破80美元"),
            ("GOLD", "2026-08", 2510.0, None, 2420.0, "歷史新高")
        ]

        count = 0
        for code, r_date, actual, fc, prev, note in dataset:
            try:
                service.add_record(code, actual, r_date, fc, prev, note)
                count += 1
            except Exception as e:
                print(f"Error adding {code}: {e}")

        print(f"[OK] Successfully initialized {len(service.get_all_indicators())} indicators and {count} records.")

if __name__ == "__main__":
    populate_comprehensive_economic_data()