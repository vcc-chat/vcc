FROM node:latest AS frontend_build
ADD ./frontend ./
RUN npm i&&npm run build

FROM alpine:edge
RUN apk add py3-pip
RUN mkdir /app
ADD ./backend /app/backend
RUN pip3 install -r /app/backend/requirements.txt
COPY --from=frontend_build dist /app/frontend/static


CMD ["/usr/bin/python3","/app/backend/main.py"]

