from http.server import BaseHTTPRequestHandler
import os
import sys
import json

root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from config import settings
from bot_handler import LineBotHandler

handler_logic = LineBotHandler()

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        res_data = {
            "status": "healthy",
            "service": "eco-line-bot",
            "database": "Supabase PostgreSQL"
        }
        self.wfile.write(json.dumps(res_data).encode('utf-8'))

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length).decode('utf-8') if content_length > 0 else ""
        
        # LINE 官方 Verify 探針
        sig = self.headers.get('X-Line-Signature', '')
        if not sig or not body:
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(b'{"status": "OK", "msg": "Probe Accepted"}')
            return

        token = settings.LINE_CHANNEL_ACCESS_TOKEN
        try:
            data = json.loads(body)
            events = data.get('events', [])
            import requests
            for event in events:
                if event.get('type') == 'message' and event.get('message', {}).get('type') == 'text':
                    user_msg = event['message']['text']
                    reply_token = event.get('replyToken')
                    
                    # 產製分析回覆
                    reply_text = handler_logic.handle_message(user_msg)
                    
                    # 呼叫 LINE Reply API 回覆用戶
                    if token and reply_token:
                        requests.post(
                            'https://api.line.me/v2/bot/message/reply',
                            headers={
                                'Authorization': f'Bearer {token}',
                                'Content-Type': 'application/json'
                            },
                            json={
                                'replyToken': reply_token,
                                'messages': [{'type': 'text', 'text': reply_text}]
                            },
                            timeout=30
                        )
        except Exception as e:
            print("Webhook error:", e)

        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(b'{"status": "OK"}')