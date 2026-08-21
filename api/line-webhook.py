import os
import sys
import json
import hmac
import hashlib
import base64
import logging
import requests
from fastapi import FastAPI, Request, Header
from fastapi.responses import JSONResponse

root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from config import settings
from bot_handler import LineBotHandler

app = FastAPI()
handler_logic = LineBotHandler()

@app.post("/api/line-webhook")
@app.post("/line-webhook")
@app.post("/")
async def handle_webhook(request: Request, x_line_signature: str = Header(default="")):
    body = await request.body()
    body_text = body.decode("utf-8") if body else ""
    
    # 支援 LINE 官方驗證探針
    if not x_line_signature or not body_text:
        return JSONResponse(status_code=200, content={"status": "OK", "msg": "Probe Accepted"})

    token = settings.LINE_CHANNEL_ACCESS_TOKEN
    secret = settings.LINE_CHANNEL_SECRET
    
    # 解析訊息事件
    try:
        data = json.loads(body_text)
        events = data.get("events", [])
        for event in events:
            if event.get("type") == "message" and event.get("message", {}).get("type") == "text":
                user_msg = event["message"]["text"]
                reply_token = event.get("replyToken")
                
                # 由 AI 與 Supabase 生成回覆內容
                reply_text = handler_logic.handle_message(user_msg)
                
                # 直接呼叫 LINE Messaging API 回傳訊息
                if token and reply_token:
                    reply_payload = {
                        "replyToken": reply_token,
                        "messages": [{"type": "text", "text": reply_text}]
                    }
                    requests.post(
                        "https://api.line.me/v2/bot/message/reply",
                        headers={
                            "Authorization": f"Bearer {token}",
                            "Content-Type": "application/json"
                        },
                        json=reply_payload,
                        timeout=25
                    )
    except Exception as e:
        logging.error(f"Webhook processing error: {e}")

    return JSONResponse(status_code=200, content={"status": "OK"})

@app.get("/api/line-webhook")
@app.get("/line-webhook")
@app.get("/")
def health_check():
    return {"status": "healthy", "service": "eco-line-bot", "database": "Supabase PostgreSQL"}