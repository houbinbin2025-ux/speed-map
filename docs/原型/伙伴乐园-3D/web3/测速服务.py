import http.server, sys, json, time, os
root, logf = sys.argv[1], sys.argv[2]
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(s, *a, **k): super().__init__(*a, directory=root, **k)
    def do_POST(s):
        n = int(s.headers.get('Content-Length', 0)); d = s.rfile.read(n).decode('utf-8', 'replace')
        open(logf, 'a').write(time.strftime('%H:%M:%S ') + s.client_address[0] + ' ' + d + '\n'); s.send_response(204); s.end_headers()
    def log_message(s, *a): pass
http.server.ThreadingHTTPServer(('0.0.0.0', int(sys.argv[3])), H).serve_forever()
