#!/usr/bin/env python3
"""
Simple HTTP server to serve the podcast generator frontend locally.
Usage: python serve.py [port]
Default port: 8000
"""

import http.server
import socketserver
import sys
import os

# Default port
PORT = 8000

# Get port from command line argument if provided
if len(sys.argv) > 1:
    try:
        PORT = int(sys.argv[1])
    except ValueError:
        print(f"Invalid port number: {sys.argv[1]}")
        print("Usage: python serve.py [port]")
        sys.exit(1)

# Change to the directory where this script is located
os.chdir(os.path.dirname(os.path.abspath(__file__)))

# Create handler with CORS support
class CORSRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add CORS headers
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

# Create server
Handler = CORSRequestHandler

try:
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"🚀 Server started successfully!")
        print(f"📡 Serving at: http://localhost:{PORT}")
        print(f"📁 Directory: {os.getcwd()}")
        print(f"\n🌐 Open in browser: http://localhost:{PORT}/index.html")
        print(f"\n⏹️  Press Ctrl+C to stop the server\n")
        httpd.serve_forever()
except KeyboardInterrupt:
    print("\n\n👋 Server stopped by user")
    sys.exit(0)
except OSError as e:
    if e.errno == 10048 or e.errno == 48:  # Port already in use
        print(f"❌ Error: Port {PORT} is already in use")
        print(f"💡 Try a different port: python serve.py 8080")
    else:
        print(f"❌ Error: {e}")
    sys.exit(1)