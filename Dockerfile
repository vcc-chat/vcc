FROM node:latest AS frontend_build
ADD ./frontend ./
# FIXME: generate methodtype.ts first if possible
RUN npm i&&./node_modules/.bin/vite build

FROM alpine:edge
RUN apk add py3-pip git
RUN mkdir /app
ADD ./backend /app/
RUN pip3 install git+https://github.com/vcc-chat/vcc_lib.git  --break-system-packages ;pip3 install -r /app/requirements.txt  --break-system-packages
COPY --from=frontend_build dist /app/static


CMD ["/usr/bin/python3","/app/main.py"]
