import os
import sys


ENVIRON_PREFIX = "WEBVCC_"

SERVER = """
root /app/static
index index.html;
server_name SERVERNAME;

limit_conn conn 20;
limit_req zone=req burst=10;
location / {
        limit_except GET HEAD POST {
                deny all;
        }
        try_files $uri $uri/ /index.html;
}
location ^~ /assets/ {
        add_header Cache-Control "public, max-age=31536000, s-maxage=31536000, immutable";
}
location ^~ /workbox- {
        add_header Cache-Control "public, max-age=31536000, s-maxage=31536000, immutable";
}
location /ws/ {
        proxy_http_version 1.1;
        proxy_pass http://127.0.0.1:7000;
        proxy_set_header Connection $http_connection;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
}
"""

TEMPLATE = """
server {
        CONTENT
        LISTEN
}
"""

NOSSL = """
listen 80
"""

SSL = """
listen [::]:443 ssl http2 ipv6only=on;
listen 443 ssl http2;
ssl_certificate SSL_CERT;
ssl_certificate_key SSL_KEY;
ssl_dhparam SSL_DHPARAM;
"""

FORCESSL = """server {
    if ($host = SERVERNAME) {
        return 301 https://$host$request_uri;
        listen 80;
        listen [::]:80 ipv6only=on;
        server_name SERVERNAME;
}
"""


if os.environ.get(ENVIRON_PREFIX + "SSL") == "1":
    for i in ["SSL_CERT", "SSL_KEY", "SSL_DHPARAM"]:
        if (value := os.environ.get(ENVIRON_PREFIX + i)) == None:
            raise RuntimeError("No such environ " + i)
        SSL = SSL.replace(i, value)
    TEMPLATE = TEMPLATE.replace("LISTEN", SSL)
    TEMPLATE += FORCESSL
else:
    TEMPLATE = TEMPLATE.replace("LISTEN", NOSSL)
TEMPLATE = TEMPLATE.replace("CONTENT", SERVER)
if (value := os.environ.get(ENVIRON_PREFIX + "SERVERNAME")) == None:
    raise RuntimeError
TEMPLATE = TEMPLATE.replace("SERVERNAME", os.environ.get(ENVIRON_PREFIX + "SERVERNAME"))

if len(sys.argv)==2:
    open(sys.argv[1],"w").write(TEMPLATE)
else:
    print(TEMPLATE)
