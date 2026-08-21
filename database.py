import os
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from config import settings

db_url = settings.DATABASE_URL
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql+pg8000://", 1)
elif db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+pg8000://", 1)

# 清理可能存在的 sslmode 參數衝突
if "sslmode=" in db_url and "pg8000" in db_url:
    db_url = db_url.replace("?sslmode=require", "").replace("&sslmode=require", "")

connect_args = {}
if "sqlite" in db_url:
    connect_args["check_same_thread"] = False
elif "pg8000" in db_url:
    import ssl
    ssl_context = ssl.create_default_context()
    connect_args["ssl_context"] = ssl_context

engine = create_engine(db_url, connect_args=connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class EconomicIndicator(Base):
    __tablename__ = "economic_indicators"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    category = Column(String(50), default="總經指標")
    country = Column(String(50), default="美國")
    unit = Column(String(20), default="%")
    frequency = Column(String(20), default="月度")
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    records = relationship("IndicatorRecord", back_populates="indicator", cascade="all, delete-orphan")

class IndicatorRecord(Base):
    __tablename__ = "indicator_records"

    id = Column(Integer, primary_key=True, index=True)
    indicator_id = Column(Integer, ForeignKey("economic_indicators.id"), nullable=False)
    record_date = Column(String(20), nullable=False, index=True)
    actual_value = Column(Float, nullable=False)
    forecast_value = Column(Float, nullable=True)
    previous_value = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    indicator = relationship("EconomicIndicator", back_populates="records")

class WeeklyReport(Base):
    __tablename__ = "weekly_reports"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    report_date = Column(String(20), nullable=False, index=True)
    summary_text = Column(Text, nullable=False)
    raw_data_snapshot = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    Base.metadata.create_all(bind=engine)