import sys
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass
from database import init_db
from data_service import DataService

def populate_comprehensive_economic_data():
    print("🚀 開始建置全方位全球、美國與台灣總體經濟指標與歷史數據庫...")
    init_db()
    
    with DataService() as service:
        # =========================================================================
        # 1. 美國通膨與物價 (US Inflation)
        # =========================================================================
        service.create_or_get_indicator(
            code="CPI",
            name="美國消費者物價指數 (CPI 年增率)",
            category="美國通膨",
            country="美國",
            unit="%",
            frequency="月度",
            description="衡量美國城市消費者購買商品與服務的價格變化，為市場評估生活成本與通膨預期的核心指標。"
        )
        service.create_or_get_indicator(
            code="CORE_CPI",
            name="美國核心CPI (Core CPI 年增率)",
            category="美國通膨",
            country="美國",
            unit="%",
            frequency="月度",
            description="排除波動較大的食品與能源價格，更能反映中長期通膨黏性與潛在物價壓力。"
        )
        service.create_or_get_indicator(
            code="CORE_PCE",
            name="美國核心PCE物價指數 (Core PCE 年增率)",
            category="美國通膨",
            country="美國",
            unit="%",
            frequency="月度",
            description="聯準會 (Fed) 制定貨幣政策最核心關注的通膨指標，官方長期目標錨定於 2.0%。"
        )
        service.create_or_get_indicator(
            code="PPI",
            name="美國生產者物價指數 (PPI 年增率)",
            category="美國通膨",
            country="美國",
            unit="%",
            frequency="月度",
            description="衡量生產端批發價格變動，為消費者物價 (CPI) 的重要領先指標。"
        )

        # =========================================================================
        # 2. 美國就業與勞動力市場 (US Labor Market)
        # =========================================================================
        service.create_or_get_indicator(
            code="NFP",
            name="美國非農就業人口新增 (NFP)",
            category="美國就業",
            country="美國",
            unit="萬人",
            frequency="月度",
            description="每月第一週週五由勞工統計局公佈，反映非農業部門新增就業人數，為勞動市場景氣首要指標。"
        )
        service.create_or_get_indicator(
            code="UNEMP",
            name="美國失業率 (Unemployment Rate)",
            category="美國就業",
            country="美國",
            unit="%",
            frequency="月度",
            description="衡量正在積極尋找工作但處於失業狀態之勞動力比例；薩姆規則 (Sahm Rule) 監控衰退風險的基準。"
        )
        service.create_or_get_indicator(
            code="JOBLESS_CLAIMS",
            name="美國初領失業金人數 (Initial Jobless Claims)",
            category="美國就業",
            country="美國",
            unit="萬人",
            frequency="週度",
            description="每週四發布之高頻勞動數據，即時反映裁員與就業市場邊際轉變。"
        )
        service.create_or_get_indicator(
            code="WAGE_GROWTH",
            name="美國平均時薪年增率 (Wage Growth)",
            category="美國就業",
            country="美國",
            unit="%",
            frequency="月度",
            description="評估工資螺旋上升壓力與服務業通膨黏性的關鍵指標。"
        )

        # =========================================================================
        # 3. 貨幣政策與利率/債市 (Central Bank & Yields)
        # =========================================================================
        service.create_or_get_indicator(
            code="FED_RATE",
            name="聯準會聯邦基金利率目標上限 (Fed Funds Rate)",
            category="貨幣政策",
            country="美國",
            unit="%",
            frequency="不定期(FOMC)",
            description="FOMC 決策之政策基準利率區間上限，主導全球資金流動性與利率水準。"
        )
        service.create_or_get_indicator(
            code="US10Y",
            name="美國10年期公債殖利率 (US 10Y Yield)",
            category="金融市場",
            country="美國",
            unit="%",
            frequency="日度/週度",
            description="全球無風險資產定價之錨，反映長期經濟增長與通膨預期。"
        )
        service.create_or_get_indicator(
            code="US2Y",
            name="美國2年期公債殖利率 (US 2Y Yield)",
            category="金融市場",
            country="美國",
            unit="%",
            frequency="日度/週度",
            description="對聯準會短期貨幣政策預期最敏感的債券市場指標。"
        )
        service.create_or_get_indicator(
            code="DXY",
            name="美元指數 (US Dollar Index)",
            category="金融市場",
            country="全球",
            unit="點",
            frequency="日度/週度",
            description="衡量美元兌一籃子主要國際貨幣之強弱程度，影響全球資金流向與原物料價格。"
        )

        # =========================================================================
        # 4. 美國景氣與製造/服務業指數 (US Activity & Growth)
        # =========================================================================
        service.create_or_get_indicator(
            code="US_GDP",
            name="美國實質GDP季增年率 (Real GDP QoQ Ann.)",
            category="美國經濟動能",
            country="美國",
            unit="%",
            frequency="季度",
            description="衡量美國整體經濟產出與消費動能的核心宏觀增長數據。"
        )
        service.create_or_get_indicator(
            code="ISM_MFG",
            name="美國ISM製造業採購經理人指數 (ISM PMI)",
            category="美國經濟動能",
            country="美國",
            unit="點",
            frequency="月度",
            description="美國製造業景氣榮枯線指標，大於50代表擴張，小於50代表緊縮。"
        )
        service.create_or_get_indicator(
            code="ISM_SERVICES",
            name="美國ISM非製造業/服務業PMI",
            category="美國經濟動能",
            country="美國",
            unit="點",
            frequency="月度",
            description="佔美國經濟比重逾七成的服務業景氣晴雨表。"
        )
        service.create_or_get_indicator(
            code="RETAIL_SALES",
            name="美國零售銷售月增率 (Retail Sales MoM)",
            category="美國經濟動能",
            country="美國",
            unit="%",
            frequency="月度",
            description="被譽為恐怖數據，直接反映美國民間消費支出的強弱。"
        )

        # =========================================================================
        # 5. 台灣總體經濟與科技供應鏈 (Taiwan Macro & Tech Supply Chain)
        # =========================================================================
        service.create_or_get_indicator(
            code="TW_EXPORT_ORDERS",
            name="台灣外銷訂單年增率",
            category="台灣總經",
            country="台灣",
            unit="%",
            frequency="月度",
            description="經濟部發布，反映全球各大科技巨頭對台灣半導體、伺服器與電子零組件的拉貨動能。"
        )
        service.create_or_get_indicator(
            code="TW_EXPORTS",
            name="台灣海關出口總值年增率",
            category="台灣總經",
            country="台灣",
            unit="%",
            frequency="月度",
            description="財政部發布之實體海關出口金額年變動率，AI 運算與資通訊產品為主要推動力。"
        )
        service.create_or_get_indicator(
            code="TW_PMI",
            name="台灣製造業採購經理人指數 (PMI)",
            category="台灣總經",
            country="台灣",
            unit="點",
            frequency="月度",
            description="中華經濟研究院發布，評估台灣製造業、電子光學與原物料產業擴張動能。"
        )
        service.create_or_get_indicator(
            code="TW_SIGNAL",
            name="台灣景氣對策信號綜合分數 (燈號)",
            category="台灣總經",
            country="台灣",
            unit="分",
            frequency="月度",
            description="國發會發布，32分以上為熱絡紅燈/黃紅燈，反映國內整體景氣循環位置。"
        )
        service.create_or_get_indicator(
            code="TW_CPI",
            name="台灣消費者物價指數年增率",
            category="台灣總經",
            country="台灣",
            unit="%",
            frequency="月度",
            description="主計總處發布，為台灣央行評估利率政策與物價穩定之主要依據。"
        )
        service.create_or_get_indicator(
            code="TW_CBC_RATE",
            name="台灣央行重貼現率 (CBC Discount Rate)",
            category="台灣總經",
            country="台灣",
            unit="%",
            frequency="季度(理監事會)",
            description="中華民國中央銀行之政策基準利率。"
        )

        # =========================================================================
        # 6. 大宗商品與市場避險指標 (Commodities & Risk)
        # =========================================================================
        service.create_or_get_indicator(
            code="BRENT_OIL",
            name="布蘭特原油期貨價格 (Brent Crude)",
            category="大宗原物料",
            country="全球",
            unit="美元/桶",
            frequency="日度/週度",
            description="全球能源成本基準，直接牽動各國能源通膨與運輸成本。"
        )
        service.create_or_get_indicator(
            code="GOLD",
            name="國際黃金現貨價格 (Gold Spot)",
            category="大宗原物料",
            country="全球",
            unit="美元/盎司",
            frequency="日度/週度",
            description="全球避險資產與去美元化/央行購金核心指標。"
        )

        print("\n📈 正在寫入完整歷史發布數據序列 (2025 ~ 2026 多期數值)...")

        # 完整歷史數值清單：(code, record_date, actual, forecast, previous, notes)
        dataset = [
            # 1. 美國 CPI
            ("CPI", "2026-02", 3.2, 3.1, 3.1, "物價小幅反彈"),
            ("CPI", "2026-03", 3.5, 3.4, 3.2, "油價與保險推升通膨"),
            ("CPI", "2026-04", 3.4, 3.4, 3.5, "持平市場預期"),
            ("CPI", "2026-05", 3.3, 3.4, 3.4, "通膨重回下行通道"),
            ("CPI", "2026-06", 3.0, 3.1, 3.3, "降溫幅度超預期"),
            ("CPI", "2026-07", 2.9, 3.0, 3.0, "創近三年新低，2字頭確立"),
            ("CPI", "2026-08", 2.8, 2.9, 2.9, "商品與二手車價格續跌"),

            # 2. 美國 CORE CPI
            ("CORE_CPI", "2026-03", 3.8, 3.7, 3.8, "服務業通膨具韌性"),
            ("CORE_CPI", "2026-04", 3.6, 3.6, 3.8, "符合預期"),
            ("CORE_CPI", "2026-05", 3.4, 3.5, 3.6, "穩步放緩"),
            ("CORE_CPI", "2026-06", 3.3, 3.3, 3.4, "房租項目增速放慢"),
            ("CORE_CPI", "2026-07", 3.2, 3.2, 3.3, "核心通膨穩健受控"),
            ("CORE_CPI", "2026-08", 3.1, 3.2, 3.2, "朝聯準會目標靠攏"),

            # 3. 美國 CORE PCE
            ("CORE_PCE", "2026-04", 2.8, 2.8, 2.8, "高位盤整"),
            ("CORE_PCE", "2026-05", 2.6, 2.6, 2.8, "降溫顯著"),
            ("CORE_PCE", "2026-06", 2.6, 2.5, 2.6, "大致符合預期"),
            ("CORE_PCE", "2026-07", 2.5, 2.5, 2.6, "非常接近 2% 政策目標"),

            # 4. 美國 PPI
            ("PPI", "2026-05", 2.2, 2.5, 2.3, "生產端成本壓力驟降"),
            ("PPI", "2026-06", 2.6, 2.3, 2.2, "批發端服務成本微幅回升"),
            ("PPI", "2026-07", 2.2, 2.3, 2.6, "生產者通膨降溫"),

            # 5. 美國非農就業 (NFP)
            ("NFP", "2026-03", 31.5, 20.0, 27.5, "就業增長大幅超預期"),
            ("NFP", "2026-04", 16.5, 24.3, 31.5, "招聘顯著放緩"),
            ("NFP", "2026-05", 21.6, 18.0, 16.5, "勞動市場仍具韌性"),
            ("NFP", "2026-06", 17.9, 19.0, 21.6, "符合降溫預期"),
            ("NFP", "2026-07", 11.4, 17.5, 17.9, "就業大幅降溫觸發市場避險"),
            ("NFP", "2026-08", 16.2, 15.0, 11.4, "勞動市場回歸溫和均衡"),

            # 6. 美國失業率 (UNEMP)
            ("UNEMP", "2026-03", 3.8, 3.9, 3.9, "維持歷史低檔"),
            ("UNEMP", "2026-04", 3.9, 3.8, 3.8, "微幅上升"),
            ("UNEMP", "2026-05", 4.0, 3.9, 3.9, "升至 4.0% 關卡"),
            ("UNEMP", "2026-06", 4.1, 4.0, 4.0, "續升至 4.1%"),
            ("UNEMP", "2026-07", 4.3, 4.1, 4.1, "觸及近三年高點"),
            ("UNEMP", "2026-08", 4.2, 4.3, 4.3, "失業率稍有回落"),

            # 7. 初領失業金人數 (JOBLESS_CLAIMS)
            ("JOBLESS_CLAIMS", "2026-08-01", 24.9, 23.6, 23.5, "升至近一年高點"),
            ("JOBLESS_CLAIMS", "2026-08-08", 23.3, 24.0, 24.9, "回落紓解衰退擔憂"),
            ("JOBLESS_CLAIMS", "2026-08-15", 22.7, 23.5, 23.3, "就業數據穩固"),

            # 8. 平均時薪年增率 (WAGE_GROWTH)
            ("WAGE_GROWTH", "2026-05", 4.1, 3.9, 4.0, "工資增速小幅反彈"),
            ("WAGE_GROWTH", "2026-06", 3.9, 3.9, 4.1, "降至 4% 以下"),
            ("WAGE_GROWTH", "2026-07", 3.6, 3.7, 3.9, "創2021年以來最低增速"),

            # 9. 聯準會利率 (FED_RATE)
            ("FED_RATE", "2026-05", 5.50, 5.50, 5.50, "按兵不動"),
            ("FED_RATE", "2026-06", 5.50, 5.50, 5.50, "維持利率於 5.25%-5.50%"),
            ("FED_RATE", "2026-07", 5.50, 5.50, 5.50, "為9月啟動降息鋪路"),

            # 10. 美國10年期公債殖利率 (US10Y)
            ("US10Y", "2026-05", 4.50, None, 4.68, "通膨疑慮降溫引導殖利率下修"),
            ("US10Y", "2026-06", 4.34, None, 4.50, "債市買盤進駐"),
            ("US10Y", "2026-07", 4.05, None, 4.34, "市場定價年內降息幅度"),
            ("US10Y", "2026-08", 3.88, None, 4.05, "殖利率跌破 3.9%"),

            # 11. 美國2年期公債殖利率 (US2Y)
            ("US2Y", "2026-06", 4.75, None, 4.95, "對利率預期敏感下行"),
            ("US2Y", "2026-07", 4.26, None, 4.75, "大幅反映寬鬆預期"),
            ("US2Y", "2026-08", 3.95, None, 4.26, "殖利率曲線倒掛迅速收窄"),

            # 12. 美元指數 (DXY)
            ("DXY", "2026-06", 105.8, None, 104.6, "強勢美元"),
            ("DXY", "2026-07", 104.2, None, 105.8, "隨降息預期回落"),
            ("DXY", "2026-08", 102.1, None, 104.2, "跌至年內低位區間"),

            # 13. 美國實質 GDP
            ("US_GDP", "2026-Q1", 1.4, 2.4, 3.4, "第一季消費增速放緩"),
            ("US_GDP", "2026-Q2", 2.8, 2.0, 1.4, "民間投資與庫存回補強勁"),

            # 14. 美國 ISM 製造業 PMI
            ("ISM_MFG", "2026-05", 48.7, 49.6, 49.2, "製造業持續處於緊縮"),
            ("ISM_MFG", "2026-06", 48.5, 49.1, 48.7, "新訂單分項疲弱"),
            ("ISM_MFG", "2026-07", 46.8, 48.8, 48.5, "降至八個月低點"),

            # 15. 美國 ISM 服務業 PMI
            ("ISM_SERVICES", "2026-05", 53.8, 50.8, 49.4, "服務業強勁擴張"),
            ("ISM_SERVICES", "2026-06", 48.8, 52.5, 53.8, "短暫跌入緊縮區間"),
            ("ISM_SERVICES", "2026-07", 51.4, 51.0, 48.8, "重返擴張區間"),

            # 16. 美國零售銷售月增率
            ("RETAIL_SALES", "2026-05", 0.1, 0.2, -0.2, "消費動能平淡"),
            ("RETAIL_SALES", "2026-06", 0.0, 0.0, 0.1, "持平預期"),
            ("RETAIL_SALES", "2026-07", 1.0, 0.3, 0.0, "汽車與電子消費大幅優於預期"),

            # 17. 台灣外銷訂單年增率
            ("TW_EXPORT_ORDERS", "2026-04", 2.8, 2.0, 1.2, "受惠高效能運算"),
            ("TW_EXPORT_ORDERS", "2026-05", 7.0, 6.0, 2.8, "AI 伺服器帶動電子產品大增"),
            ("TW_EXPORT_ORDERS", "2026-06", 3.1, 5.0, 7.0, "傳統貨品拉貨放緩"),
            ("TW_EXPORT_ORDERS", "2026-07", 8.5, 6.5, 3.1, "半導體先進製程訂單爆發"),

            # 18. 台灣海關出口總值年增率
            ("TW_EXPORTS", "2026-05", 3.5, 2.8, 4.3, "資通視聽產品領跑"),
            ("TW_EXPORTS", "2026-06", 23.5, 11.5, 3.5, "創近26個月最大增幅"),
            ("TW_EXPORTS", "2026-07", 18.2, 14.0, 23.5, "AI 與 HPC 出口續創同期新高"),

            # 19. 台灣製造業 PMI
            ("TW_PMI", "2026-05", 55.4, 53.0, 50.6, "強勢擴張"),
            ("TW_PMI", "2026-06", 53.7, 54.0, 55.4, "維持在擴張水準"),
            ("TW_PMI", "2026-07", 52.2, 53.0, 53.7, "電子光學產業獨強"),

            # 20. 台灣景氣對策信號 (燈號與分數)
            ("TW_SIGNAL", "2026-04", 35.0, 32.0, 31.0, "轉呈黃紅燈"),
            ("TW_SIGNAL", "2026-05", 36.0, 35.0, 35.0, "黃紅燈持續熱絡"),
            ("TW_SIGNAL", "2026-06", 38.0, 36.0, 36.0, "亮出代表熱絡的紅燈"),
            ("TW_SIGNAL", "2026-07", 35.0, 36.0, 38.0, "續處黃紅燈高位"),

            # 21. 台灣 CPI 年增率
            ("TW_CPI", "2026-05", 2.24, 2.10, 1.95, "蔬果與外食價格推升"),
            ("TW_CPI", "2026-06", 2.42, 2.20, 2.24, "電價調漲效應顯現"),
            ("TW_CPI", "2026-07", 2.52, 2.30, 2.42, "颱風豪雨短期擾動"),

            # 22. 台灣央行重貼現率
            ("TW_CBC_RATE", "2026-03", 2.00, 1.875, 1.875, "為抑制通膨意外升息半碼"),
            ("TW_CBC_RATE", "2026-06", 2.00, 2.00, 2.00, "維持利率不變但調升存準率一碼"),

            # 23. 布蘭特原油價格 (BRENT_OIL)
            ("BRENT_OIL", "2026-06", 85.2, None, 81.6, "中東地緣政治溢價"),
            ("BRENT_OIL", "2026-07", 81.3, None, 85.2, "需求疲軟預期打壓油價"),
            ("BRENT_OIL", "2026-08", 77.5, None, 81.3, "下破 80 美元大關助益通膨降溫"),

            # 24. 國際黃金現貨價格 (GOLD)
            ("GOLD", "2026-06", 2325.0, None, 2340.0, "高位震盪"),
            ("GOLD", "2026-07", 2420.0, None, 2325.0, "降息預期與避險需求推升突破2400"),
            ("GOLD", "2026-08", 2510.0, None, 2420.0, "歷史新高，央行購金動能強勁")
        ]

        count = 0
        for code, r_date, actual, fc, prev, note in dataset:
            try:
                service.add_record(code, actual, r_date, fc, prev, note)
                count += 1
            except Exception as e:
                print(f"寫入失敗 [{code}]: {e}")

        print(f"\n✅ 成功建立並匯入 {len(service.get_all_indicators())} 項總經指標，共 {count} 筆完整歷史時間序列紀錄！")

if __name__ == "__main__":
    populate_comprehensive_economic_data()