from database import init_db
from data_service import DataService

def seed_initial_data():
    print('Initializing SQLite database tables...')
    init_db()
    
    with DataService() as service:
        print('Creating seed economic indicators...')
        
        # 1. 美國通膨指標
        service.create_or_get_indicator(
            code='CPI',
            name='美國消費者物價指數 (CPI 年增率)',
            category='通膨指標',
            country='美國',
            unit='%',
            frequency='月度',
            description='反映消費者購買商品與服務的價格變動，為聯準會評估通膨的核心基準。'
        )
        service.create_or_get_indicator(
            code='CORE_CPI',
            name='美國核心CPI (Core CPI 年增率)',
            category='通膨指標',
            country='美國',
            unit='%',
            frequency='月度',
            description='扣除波動較大的食品與能源價格後的消費者物價年增率。'
        )
        service.create_or_get_indicator(
            code='CORE_PCE',
            name='美國核心PCE物價指數',
            category='通膨指標',
            country='美國',
            unit='%',
            frequency='月度',
            description='聯準會最看重的通膨目標指標 (2% 目標)。'
        )

        # 2. 美國就業指標
        service.create_or_get_indicator(
            code='NFP',
            name='美國非農就業人口新增 (NFP)',
            category='就業指標',
            country='美國',
            unit='萬人',
            frequency='月度',
            description='每個月首個星期五公佈，為評估美國勞動市場熱度的最關鍵數據。'
        )
        service.create_or_get_indicator(
            code='UNEMP',
            name='美國失業率',
            category='就業指標',
            country='美國',
            unit='%',
            frequency='月度',
            description='反映勞動人口中處於失業狀態的比例。'
        )
        service.create_or_get_indicator(
            code='JOBLESS_CLAIMS',
            name='美國初領失業金人數',
            category='就業指標',
            country='美國',
            unit='萬人',
            frequency='週度',
            description='每週四公佈的高頻就業領先指標。'
        )

        # 3. 央行與利率指標
        service.create_or_get_indicator(
            code='FED_RATE',
            name='聯準會基準利率上限 (Fed Funds Rate)',
            category='貨幣政策',
            country='美國',
            unit='%',
            frequency='不定期',
            description='美國聯準會 FOMC 決策之聯邦基金目標利率區間上限。'
        )
        service.create_or_get_indicator(
            code='US10Y',
            name='美國10年期公債殖利率',
            category='金融市場',
            country='美國',
            unit='%',
            frequency='日度/週度',
            description='全球無風險資產定價錨點與長期經濟預期指標。'
        )

        # 4. 台灣經濟與製造業指標
        service.create_or_get_indicator(
            code='TW_EXPORT',
            name='台灣外銷訂單年增率',
            category='台灣總經',
            country='台灣',
            unit='%',
            frequency='月度',
            description='反映全球終端電子與科技供應鏈需求之領先指標。'
        )
        service.create_or_get_indicator(
            code='TW_PMI',
            name='台灣製造業採購經理人指數 (PMI)',
            category='台灣總經',
            country='台灣',
            unit='點',
            frequency='月度',
            description='50 榮枯線以上代表製造業處於擴張階段。'
        )

        print('Adding sample historical records...')
        history_samples = [
            # CPI
            ('CPI', '2026-04', 3.4, 3.4, 3.5, '持平預期'),
            ('CPI', '2026-05', 3.3, 3.4, 3.4, '小幅回落'),
            ('CPI', '2026-06', 3.0, 3.1, 3.3, '通膨降溫顯著'),
            ('CPI', '2026-07', 2.9, 3.0, 3.0, '創近期新低，強化降息預期'),
            
            # CORE_CPI
            ('CORE_CPI', '2026-05', 3.4, 3.5, 3.6, '穩步放緩'),
            ('CORE_CPI', '2026-06', 3.3, 3.3, 3.4, '符合預期'),
            ('CORE_CPI', '2026-07', 3.2, 3.2, 3.3, '租金通膨降溫'),

            # NFP
            ('NFP', '2026-05', 21.6, 18.0, 16.5, '勞動市場具韌性'),
            ('NFP', '2026-06', 17.9, 19.0, 21.6, '就業增長放緩'),
            ('NFP', '2026-07', 11.4, 17.5, 17.9, '就業大幅降溫引發市場波動'),

            # UNEMP
            ('UNEMP', '2026-05', 4.0, 3.9, 3.9, '上升至4.0%'),
            ('UNEMP', '2026-06', 4.1, 4.0, 4.0, '緩步上升'),
            ('UNEMP', '2026-07', 4.3, 4.1, 4.1, '觸發薩姆規則關注'),

            # FED_RATE
            ('FED_RATE', '2026-06', 5.50, 5.50, 5.50, '維持利率不變'),
            ('FED_RATE', '2026-07', 5.50, 5.50, 5.50, '預期下半年開啟降息'),

            # US10Y
            ('US10Y', '2026-07', 4.05, None, 4.25, '殖利率隨降息預期回落'),
            ('US10Y', '2026-08', 3.89, None, 4.05, '債市強勁反彈'),

            # 台灣外銷訂單
            ('TW_EXPORT', '2026-05', 7.0, 6.0, 2.8, 'AI 伺服器帶動'),
            ('TW_EXPORT', '2026-06', 3.1, 5.0, 7.0, '傳統產業略疲弱'),
            ('TW_EXPORT', '2026-07', 8.5, 6.5, 3.1, '電子零組件出貨暢旺'),

            # 台灣 PMI
            ('TW_PMI', '2026-06', 53.7, 54.0, 55.4, '維持在擴張區間'),
            ('TW_PMI', '2026-07', 52.2, 53.0, 53.7, '擴張速度放緩')
        ]

        for code, r_date, actual, fc, prev, note in history_samples:
            service.add_record(code, actual, r_date, fc, prev, note)

        print('Database initialized and seeded successfully!')

if __name__ == '__main__':
    seed_initial_data()
