#!/usr/bin/env python3
import http.server
import ssl
import os

# Create a simple HTTPS server for file downloads
class CORSRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

# Server configuration
PORT = 8443
DIRECTORY = "/home/sabro/ollama-chat-app"

# Create SSL context
context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
context.load_cert_chain('certs/cert.pem', 'certs/key.pem')

# Change to the directory
os.chdir(DIRECTORY)

# Create and start the server
with http.server.HTTPServer(("0.0.0.0", PORT), CORSRequestHandler) as httpd:
    httpd.socket = context.wrap_socket(httpd.socket, server_side=True)
    print(f"HTTPS Server running on port {PORT}")
    print(f"Access the file at: https://<your-ip>:{PORT}/NewNaAI-Windows-Fixed.zip")
    httpd.serve_forever()