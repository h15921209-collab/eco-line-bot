from datetime import datetime
from typing import List, Dict, Optional, Any
from sqlalchemy.orm import Session
from database import SessionLocal, EconomicIndicator, IndicatorRecord, WeeklyReport

class DataService:
    def __init__(self, db: Optional[Session] = None):
        self.db = db or SessionLocal()
        self._owned = db is None

    def close(self):
        if self._owned and self.db:
            self.db.close()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()

    def get_all_indicators(self) -> List[EconomicIndicator]:
        """取得所有已註冊的經濟指標"""
        return self.db.query(EconomicIndicator).order_by(EconomicIndicator.category, EconomicIndicator.code).all()

    def get_indicator_by_code(self, code: str) -> Optional[EconomicIndicator]:
        """依代碼查詢指標 (大小寫不敏感)"""
        return self.db.query(EconomicIndicator).filter(EconomicIndicator.code.ilike(code.strip())).first()

    def create_or_get_indicator(
        self, 
        code: str, 
        name: str, 
        category: str = "總經指標", 
        country: str = "美國", 
        unit: str = "%", 
        frequency: str = "月度",
        description: str = ""
    ) -> EconomicIndicator:
        """建立或獲取指標定義"""
        code = code.strip().upper()
        indicator = self.get_indicator_by_code(code)
        if not indicator:
            indicator = EconomicIndicator(
                code=code,
                name=name,
                category=category,
                country=country,
                unit=unit,
                frequency=frequency,
                description=description
            )
            self.db.add(indicator)
            self.db.commit()
            self.db.refresh(indicator)
        return indicator

    def add_record(
        self,
        code: str,
        actual_value: float,
        record_date: Optional[str] = None,
        forecast_value: Optional[float] = None,
        previous_value: Optional[float] = None,
        notes: Optional[str] = None
    ) -> IndicatorRecord:
        """新增或更新指定指標的一筆歷史數據"""
        indicator = self.get_indicator_by_code(code)
        if not indicator:
            raise ValueError(f"找不到指標代碼: {code}，請先確認指標是否存在")

        if not record_date:
            record_date = datetime.now().strftime("%Y-%m")

        # 檢查該期是否已存在記錄
        existing = (
            self.db.query(IndicatorRecord)
            .filter(
                IndicatorRecord.indicator_id == indicator.id,
                IndicatorRecord.record_date == record_date
            )
            .first()
        )

        if existing:
            existing.actual_value = actual_value
            if forecast_value is not None:
                existing.forecast_value = forecast_value
            if previous_value is not None:
                existing.previous_value = previous_value
            if notes is not None:
                existing.notes = notes
            self.db.commit()
            self.db.refresh(existing)
            return existing
        else:
            new_record = IndicatorRecord(
                indicator_id=indicator.id,
                record_date=record_date,
                actual_value=actual_value,
                forecast_value=forecast_value,
                previous_value=previous_value,
                notes=notes
            )
            self.db.add(new_record)
            self.db.commit()
            self.db.refresh(new_record)
            return new_record

    def get_indicator_history(self, code: str, limit: int = 12) -> Dict[str, Any]:
        """查詢單一指標的歷史序列"""
        indicator = self.get_indicator_by_code(code)
        if not indicator:
            return {}
        
        records = (
            self.db.query(IndicatorRecord)
            .filter(IndicatorRecord.indicator_id == indicator.id)
            .order_by(IndicatorRecord.record_date.desc())
            .limit(limit)
            .all()
        )
        return {
            "indicator": indicator,
            "records": records
        }

    def get_latest_macro_snapshot(self) -> List[Dict[str, Any]]:
        """彙整所有指標的最新一期數據與上一期比較"""
        indicators = self.get_all_indicators()
        snapshot = []
        for ind in indicators:
            latest_records = (
                self.db.query(IndicatorRecord)
                .filter(IndicatorRecord.indicator_id == ind.id)
                .order_by(IndicatorRecord.record_date.desc())
                .limit(2)
                .all()
            )
            if latest_records:
                current = latest_records[0]
                prev = latest_records[1] if len(latest_records) > 1 else None
                snapshot.append({
                    "code": ind.code,
                    "name": ind.name,
                    "category": ind.category,
                    "country": ind.country,
                    "unit": ind.unit,
                    "frequency": ind.frequency,
                    "latest_date": current.record_date,
                    "actual": current.actual_value,
                    "forecast": current.forecast_value,
                    "previous": current.previous_value if current.previous_value is not None else (prev.actual_value if prev else None),
                    "notes": current.notes or ""
                })
        return snapshot

    def save_weekly_report(self, title: str, report_date: str, summary_text: str, raw_snapshot: str = "") -> WeeklyReport:
        """保存 AI 生成的週報"""
        report = WeeklyReport(
            title=title,
            report_date=report_date,
            summary_text=summary_text,
            raw_data_snapshot=raw_snapshot
        )
        self.db.add(report)
        self.db.commit()
        self.db.refresh(report)
        return report

    def get_latest_saved_report(self) -> Optional[WeeklyReport]:
        """取得上一份保存的分析週報"""
        return self.db.query(WeeklyReport).order_by(WeeklyReport.created_at.desc()).first()

    def parse_manual_input(self, text: str) -> Dict[str, Any]:
        """
        解析分析員在 LINE 發送的手動數據輸入指令
        支援格式：
        - 記錄 CPI 3.2 3.1
        - 記錄 CPI 2026-07 3.2 3.1 3.0 超預期
        - 記錄 NFP 18.5 15.0
        """
        parts = text.strip().split()
        if len(parts) < 3:
            raise ValueError("格式錯誤！正確格式範例：\n`記錄 CPI 3.2 3.1` (指標 公佈值 預測值)\n或 `記錄 CPI 2026-07 3.2 3.1 3.0 超預期`")
        
        code = parts[1].upper()
        arg3 = parts[2]
        record_date = datetime.now().strftime("%Y-%m")
        value_idx = 2

        if "-" in arg3 and len(arg3) in (7, 10):
            record_date = arg3
            value_idx = 3

        if len(parts) <= value_idx:
            raise ValueError("請輸入公佈數值！例如：`記錄 CPI 3.2`")

        try:
            actual_val = float(parts[value_idx])
        except ValueError:
            raise ValueError(f"數值解析失敗：{parts[value_idx]} 不是有效數字")

        forecast_val = None
        prev_val = None
        notes = ""

        if len(parts) > value_idx + 1:
            try:
                forecast_val = float(parts[value_idx + 1])
            except ValueError:
                notes = " ".join(parts[value_idx + 1:])

        if len(parts) > value_idx + 2 and forecast_val is not None:
            try:
                prev_val = float(parts[value_idx + 2])
            except ValueError:
                notes = " ".join(parts[value_idx + 2:])

        if len(parts) > value_idx + 3 and not notes:
            notes = " ".join(parts[value_idx + 3:])

        record = self.add_record(
            code=code,
            actual_value=actual_val,
            record_date=record_date,
            forecast_value=forecast_val,
            previous_value=prev_val,
            notes=notes
        )
        return {
            "code": code,
            "record_date": record_date,
            "actual": actual_val,
            "forecast": forecast_val,
            "previous": prev_val,
            "notes": notes,
            "record": record
        }