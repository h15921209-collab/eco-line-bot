import os
import shutil
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import declarative_base, sessionmaker, relationship

root_dir = os.path.dirname(os.path.abspath(__file__))
src_db = os.path.join(root_dir, 'eco_data.db')
tmp_db = '/tmp/eco_data.db'

# 確保在 Vercel Serverless /tmp 目錄中可讀寫種子資料庫
if os.path.exists(src_db):
    try:
        if not os.path.exists(tmp_db) or os.path.getsize(tmp_db) == 0:
            shutil.copyfile(src_db, tmp_db)
        db_url = f'sqlite:///{tmp_db}'
    except Exception:
        db_url = f'sqlite:///{src_db}'
else:
    db_url = 'sqlite:///./eco_data.db'

engine = create_engine(db_url, connect_args={'check_same_thread': False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class EconomicIndicator(Base):
    __tablename__ = 'economic_indicators'

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    category = Column(String(50), default='總經指標')
    country = Column(String(50), default='美國')
    unit = Column(String(20), default='%')
    frequency = Column(String(20), default='月度')
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    records = relationship('IndicatorRecord', back_populates='indicator', cascade='all, delete-orphan')

class IndicatorRecord(Base):
    __tablename__ = 'indicator_records'

    id = Column(Integer, primary_key=True, index=True)
    indicator_id = Column(Integer, ForeignKey('economic_indicators.id'), nullable=False)
    record_date = Column(String(20), nullable=False, index=True)
    actual_value = Column(Float, nullable=False)
    forecast_value = Column(Float, nullable=True)
    previous_value = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    indicator = relationship('EconomicIndicator', back_populates='records')

class WeeklyReport(Base):
    __tablename__ = 'weekly_reports'

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
