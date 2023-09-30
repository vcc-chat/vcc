FROM python:3.11-bullseye


COPY server /app

RUN pip3 install -r /app/requirements.txt
WORKDIR /app
ENTRYPOINT  ["/usr/local/bin/python3.11","main.py"]
