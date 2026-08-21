import os
try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

class Settings:
    def __init__(self):
        self.LINE_CHANNEL_ACCESS_TOKEN = os.getenv("LINE_CHANNEL_ACCESS_TOKEN", "").strip()
        self.LINE_CHANNEL_SECRET = os.getenv("LINE_CHANNEL_SECRET", "").strip()
        self.GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
        self.DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./eco_data.db").strip()
        self.HOST = os.getenv("HOST", "0.0.0.0").strip()
        self.PORT = int(os.getenv("PORT") or 8000)

settings = Settings()
