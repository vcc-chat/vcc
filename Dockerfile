FROM node:latest AS frontend_build
ADD ./frontend ./
RUN npm i&&npm run build

FROM alpine:edge
RUN apk add supervisor inotify-tools py3-pip
RUN apk add nginx && mkdir /app
ADD scripts/generate_nginx_conf.py  /app/generate_nginx_conf.py
ADD res/supervisord.conf /app/supervisord.conf
ADD ./backend /app/backend
RUN pip3 install -r /app/backend/requirements.txt
COPY --from=frontend_build dist /app/static


CMD ["/usr/bin/supervisord","-c","/app/supervisord.conf"]

