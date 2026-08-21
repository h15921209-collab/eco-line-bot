from http.server import BaseHTTPRequestHandler
import os
import sys
import json
import traceback
import requests

root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from config import settings
from bot_handler import LineBotHandler

handler_logic = LineBotHandler()

# 確保 Token 絕對存在
FALLBACK_TOKEN = "rvn1sSlzyQrV4nh0gYirSsm3GIBaNml8osEg/DwytC1h96AsG8umK6FJgtPuyrKorlz4i5NZSwnwUx4twk2miiudbdPJjJkkduXNXF2Kb2yqyG3G1EtIO6CtClhQhw5Nfmt0AMLiee0gdFRyHyyyyQdB04t89/1O/w1cDnyilFU="

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header("Content-type", "application/json")
        self.end_headers()
        res = {
            "status": "healthy",
            "service": "eco-line-bot",
            "msg": "Webhook is live and ready"
        }
        self.wfile.write(json.dumps(res).encode("utf-8"))

    def do_POST(self):
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            body_bytes = self.rfile.read(content_length) if content_length > 0 else b""
            body_str = body_bytes.decode("utf-8", errors="replace")

            if not body_str:
                self.send_response(200)
                self.send_header("Content-type", "application/json")
                self.end_headers()
                self.wfile.write(b'{"status": "OK", "msg": "Empty body"}')
                return

            token = settings.LINE_CHANNEL_ACCESS_TOKEN or FALLBACK_TOKEN
            data = json.loads(body_str)
            events = data.get("events", [])
            
            for event in events:
                if event.get("type") == "message" and event.get("message", {}).get("type") == "text":
                    user_msg = event["message"]["text"].strip()
                    reply_token = event.get("replyToken")
                    
                    # 產製分析回覆
                    reply_text = handler_logic.handle_message(user_msg)
                    
                    # 呼叫 LINE Reply API 回覆用戶
                    if reply_token and not reply_token.startswith("test"):
                        reply_res = requests.post(
                            "https://api.line.me/v2/bot/message/reply",
                            headers={
                                "Authorization": f"Bearer {token}",
                                "Content-Type": "application/json"
                            },
                            json={
                                "replyToken": reply_token,
                                "messages": [{"type": "text", "text": reply_text}]
                            },
                            timeout=25
                        )
                        print("LINE Reply Response:", reply_res.status_code, reply_res.text)

            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"status": "OK"}')
        except Exception as e:
            err_detail = traceback.format_exc()
            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "error", "error": str(e), "trace": err_detail}).encode("utf-8"))