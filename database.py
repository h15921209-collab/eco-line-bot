from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from config import settings

engine = create_engine(
    settings.DATABASE_URL, 
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class EconomicIndicator(Base):
    '''經濟指標基本定義表'''
    __tablename__ = "economic_indicators"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=False)  # 代碼，如 CPI, NFP, UNEMP
    name = Column(String(100), nullable=False)                           # 中文名稱，如 美國消費者物價指數
    category = Column(String(50), default="總經指標")                   # 分類，如 通膨、就業、央行、產業
    country = Column(String(50), default="美國")                        # 地區/國家
    unit = Column(String(20), default="%")                             # 單位，如 %, 萬人, 點
    frequency = Column(String(20), default="月度")                      # 頻率，如 月度, 週度, 季度
    description = Column(Text, nullable=True)                          # 指標意義說明
    created_at = Column(DateTime, default=datetime.utcnow)

    records = relationship("IndicatorRecord", back_populates="indicator", cascade="all, delete-orphan", order_by="desc(IndicatorRecord.record_date)")

    def __repr__(self):
        return f"<Indicator {self.code}: {self.name}>"

class IndicatorRecord(Base):
    '''經濟指標歷史發布紀錄表'''
    __tablename__ = "indicator_records"

    id = Column(Integer, primary_key=True, index=True)
    indicator_id = Column(Integer, ForeignKey("economic_indicators.id"), nullable=False)
    record_date = Column(String(20), nullable=False, index=True)       # 數據所屬期間或公佈日期，例如 2026-07 或 2026-08-01
    actual_value = Column(Float, nullable=False)                       # 實際公佈值
    forecast_value = Column(Float, nullable=True)                      # 市場預期值
    previous_value = Column(Float, nullable=True)                      # 前期值 (修正後前值)
    notes = Column(Text, nullable=True)                                # 備註 (如超預期、創近年新高等)
    created_at = Column(DateTime, default=datetime.utcnow)

    indicator = relationship("EconomicIndicator", back_populates="records")

    def __repr__(self):
        return f"<Record {self.record_date}: Actual={self.actual_value}>"

class WeeklyReport(Base):
    '''AI 生成之歷史週報存檔表'''
    __tablename__ = "weekly_reports"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    report_date = Column(String(20), nullable=False, index=True)       # 週報日期
    summary_text = Column(Text, nullable=False)                        # AI 生成的分析內容
    raw_data_snapshot = Column(Text, nullable=True)                    # 當時數據快照 (JSON 或純文字)
    created_at = Column(DateTime, default=datetime.utcnow)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    Base.metadata.create_all(bind=engine)
