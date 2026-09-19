import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

def start_local_server(directory):
    """Starts a ThreadingHTTPServer serving directory on 127.0.0.1 with an OS-assigned port."""
    handler = partial(SimpleHTTPRequestHandler, directory=str(directory))
    server = ThreadingHTTPServer(('127.0.0.1', 0), handler)
    port = server.server_address[1]
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server, port
