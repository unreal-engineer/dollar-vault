import json
import urllib.request
import urllib.error
from http.server import HTTPServer, BaseHTTPRequestHandler
import sys

OLLAMA_URL = "http://localhost:11434/api/generate"
DEFAULT_MODEL = "qwen2.5:14b"

class AIAssistantHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        # Override to suppress standard HTTP logging to terminal
        return

    def do_OPTIONS(self):
        # Handle CORS preflight
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        if self.path != '/api/message':
            self.send_response(404)
            self.end_headers()
            return

        # Read request body
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)
        
        try:
            body = json.loads(post_data.decode('utf-8'))
        except Exception:
            self.send_response(400)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Invalid JSON"}).encode('utf-8'))
            return

        prompt = body.get('message', '')

        # Set up SSE headers
        self.send_response(200)
        self.send_header('Content-Type', 'text/event-stream')
        self.send_header('Cache-Control', 'no-cache')
        self.send_header('Connection', 'keep-alive')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()

        # Send initial status back to front-end widget
        self.send_sse({"status": "Connecting to Ollama..."})

        ollama_payload = {
            "model": DEFAULT_MODEL,
            "prompt": prompt,
            "stream": True
        }

        try:
            req = urllib.request.Request(
                OLLAMA_URL,
                data=json.dumps(ollama_payload).encode('utf-8'),
                headers={'Content-Type': 'application/json'}
            )
            with urllib.request.urlopen(req) as response:
                self.send_sse({"status": "Consulting local AI models..."})
                buffer = ""
                while True:
                    chunk = response.read(512)
                    if not chunk:
                        break
                    buffer += chunk.decode('utf-8')
                    lines = buffer.split('\n')
                    buffer = lines.pop()
                    for line in lines:
                        if not line.strip():
                            continue
                        try:
                            ollama_chunk = json.loads(line)
                            word = ollama_chunk.get('response', '')
                            if word:
                                self.send_sse({"chunk": word})
                        except Exception:
                            pass
        except urllib.error.URLError as e:
            err_msg = (
                f"\n\n[Error] Unable to communicate with local Ollama API at {OLLAMA_URL}.\n"
                f"Please ensure:\n"
                f"1. Ollama is installed and running locally on your machine.\n"
                f"2. You have pulled the required model using: 'ollama pull {DEFAULT_MODEL}'"
            )
            self.send_sse({"chunk": err_msg})
        except Exception as e:
            self.send_sse({"chunk": f"\n\n[Error] An unexpected error occurred: {str(e)}"})
        
        self.wfile.flush()

    def send_sse(self, data):
        try:
            self.wfile.write(f"data: {json.dumps(data)}\n\n".encode('utf-8'))
            self.wfile.flush()
        except Exception:
            pass

def run(port=8000):
    server_address = ('', port)
    httpd = HTTPServer(server_address, AIAssistantHandler)
    print("=================================================================")
    print(f"Local AI Wrapper Server running at: http://localhost:{port}")
    print(f"Directing prompts to local Ollama API endpoint: {OLLAMA_URL}")
    print(f"Required model: {DEFAULT_MODEL} ('ollama pull {DEFAULT_MODEL}')")
    print("Press Ctrl+C to stop.")
    print("=================================================================")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping AI server...")
        sys.exit(0)

if __name__ == '__main__':
    run()
