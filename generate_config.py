from pathlib import Path

import uuid
import json

template_str = """\
[unix_http_server]
file=./supervisor.sock

[supervisord]
environment=RPCHOST="127.0.0.1:2474",MINIO_ROOT_USER={MINIO_ROOT_USER},MINIO_ROOT_PASSWORD={MINIO_ROOT_PASSWORD},\
MINIO_URL={MINIO_URL},MINIO_ACCESS={MINIO_ROOT_USER},MINIO_SECRET={MINIO_ROOT_PASSWORD},\
DATABASE={DATABASE},WEBVCC_DISABLE_STATIC="",VCC_CALL_VERBOSE="true"
directory=%(here)s
childlogfile=%(here)s/log

[rpcinterface:supervisor]
supervisor.rpcinterface_factory = supervisor.rpcinterface:make_main_rpcinterface

[supervisorctl]
serverurl=unix://./supervisor.sock

[program:rpc]
command=python3 ./vcc_rpc/server/main.py
autorestart=true
priority=10
startretries=3
redirect_stderr=true
stdout_logfile=./log/%(program_name)s.log

[program:minio]
command=minio server ./data
autorestart=true
priority=10
startretries=3
redirect_stderr=true
stdout_logfile=./log/%(program_name)s.log

[group:services]
programs=login,chat,file,record,bot,friend
priority=20

[program:login]
startsecs=5
command=python3 ./vcc_rpc/services/login.py
autorestart=true
startretries=3
redirect_stderr=true
stdout_logfile=./log/service_%(program_name)s.log

[program:chat]
startsecs=5
command=python3 ./vcc_rpc/services/chat.py
autorestart=true
startretries=3
redirect_stderr=true
stdout_logfile=./log/service_%(program_name)s.log

[program:file]
startsecs=5
command=python3 ./vcc_rpc/services/file.py
autorestart=true
startretries=3
redirect_stderr=true
stdout_logfile=./log/service_%(program_name)s.log

[program:record]
startsecs=5
command=python3 ./vcc_rpc/services/record.py
autorestart=true
startretries=3
redirect_stderr=true
stdout_logfile=./log/service_%(program_name)s.log

[program:bot]
startsecs=5
command=python3 ./vcc_rpc/services/bot.py
autorestart=true
startretries=3
redirect_stderr=true
stdout_logfile=./log/service_%(program_name)s.log

[program:friend]
startsecs=5
command=python3 ./vcc_rpc/services/friend.py
autorestart=true
startretries=3
redirect_stderr=true
stdout_logfile=./log/service_%(program_name)s.log

[group:gateways]
programs=web,bot2
priority=20

[program:web]
startsecs=5
command=python3 ./web-vcc/backend/main.py
autorestart=true
startretries=3
redirect_stderr=true
stdout_logfile=./log/gateway_%(program_name)s.log

[program:bot2]
startsecs=5
command=python3 ./vcc-bot/server/main.py
autorestart=true
startretries=3
redirect_stderr=true
stdout_logfile=./log/gateway_%(program_name)s.log
"""

def input_with_default(prompt: str, default: str):
    text = input(f"{prompt} [{default}]: ")
    return text if text else default

config_str = template_str.format_map({
    "MINIO_ROOT_USER": json.dumps(input_with_default("The root user name of the minio", "root")),
    "MINIO_ROOT_PASSWORD": json.dumps(input_with_default("The root password of the minio", str(uuid.uuid4()).replace("-", ""))),
    "MINIO_URL": json.dumps(input("The url that can be accessed by users: ")),
    "DATABASE": json.dumps(input("The python code to get the database: "))
})

(Path(__file__).parent / "supervisord.conf").write_text(config_str)
