import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException, Header
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any

from config import settings
from database import init_db
from bot_handler import LineBotHandler
from data_service import DataService
from ai_analyzer import EconomicAIAnalyzer

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("main")

handler_logic = LineBotHandler()

line_webhook_handler = None
line_bot_api = None

if settings.LINE_CHANNEL_SECRET and settings.LINE_CHANNEL_ACCESS_TOKEN:
    try:
        from linebot.v3 import WebhookHandler
        from linebot.v3.messaging import Configuration, ApiClient, MessagingApi, ReplyMessageRequest, TextMessage
        from linebot.v3.webhooks import MessageEvent, TextMessageContent

        line_webhook_handler = WebhookHandler(settings.LINE_CHANNEL_SECRET)
        configuration = Configuration(access_token=settings.LINE_CHANNEL_ACCESS_TOKEN)

        @line_webhook_handler.add(MessageEvent, message=TextMessageContent)
        def handle_text_message(event):
            user_msg = event.message.text
            reply_text = handler_logic.handle_message(user_msg)
            
            with ApiClient(configuration) as api_client:
                line_bot = MessagingApi(api_client)
                line_bot.reply_message_with_http_info(
                    ReplyMessageRequest(
                        reply_token=event.reply_token,
                        messages=[TextMessage(text=reply_text)]
                    )
                )
        logger.info("LINE Webhook Handler initialized successfully.")
    except Exception as e:
        logger.warning(f"LINE SDK initialization note: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    try:
        from populate_full_data import populate_comprehensive_economic_data
        populate_comprehensive_economic_data()
    except Exception as e:
        logger.warning(f"Populate data note: {e}")
    logger.info("Economic Line Bot Server started successfully.")
    yield

app = FastAPI(title="Economic Line Bot Assistant", lifespan=lifespan)

@app.get("/")
def root():
    return {
        "status": "online",
        "service": "Economic Data Line Bot Assistant",
        "endpoints": {
            "webhook": "/callback",
            "generate_weekly_analysis": "/api/analysis/weekly",
            "indicators": "/api/indicators"
        }
    }

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/callback")
@app.post("/api/line-webhook")
async def callback(request: Request, x_line_signature: Optional[str] = Header(None)):
    body = await request.body()
    body_text = body.decode("utf-8")
    
    if not line_webhook_handler or not x_line_signature:
        return JSONResponse(status_code=200, content={"status": "OK", "detail": "Verification Accepted"})

    try:
        line_webhook_handler.handle(body_text, x_line_signature)
    except Exception as e:
        logger.warning(f"Webhook handle note: {e}")
        return JSONResponse(status_code=200, content={"status": "OK", "note": str(e)})

    return JSONResponse(status_code=200, content={"status": "OK"})

@app.get("/api/analysis/weekly")
def get_weekly_analysis():
    analyzer = EconomicAIAnalyzer()
    report = analyzer.generate_weekly_analysis()
    return {"report": report}

@app.get("/api/indicators")
def get_indicators():
    with DataService() as service:
        snapshot = service.get_latest_macro_snapshot()
    return {"indicators": snapshot}

class ManualRecordPayload(BaseModel):
    code: str
    actual_value: float
    record_date: Optional[str] = None
    forecast_value: Optional[float] = None
    previous_value: Optional[float] = None
    notes: Optional[str] = None

@app.post("/api/records")
def add_record_api(payload: ManualRecordPayload):
    with DataService() as service:
        rec = service.add_record(
            code=payload.code,
            actual_value=payload.actual_value,
            record_date=payload.record_date,
            forecast_value=payload.forecast_value,
            previous_value=payload.previous_value,
            notes=payload.notes
        )
    return {"status": "success", "record_id": rec.id}

class SimulateMessagePayload(BaseModel):
    message: str

@app.post("/api/simulate-chat")
def simulate_chat(payload: SimulateMessagePayload):
    reply = handler_logic.handle_message(payload.message)
    return {"input": payload.message, "reply": reply}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))`nuvicorn.run("main:app", host="0.0.0.0", port=port)