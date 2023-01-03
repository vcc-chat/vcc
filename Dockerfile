FROM node:latest AS frontend_build
ADD ./frontend
WORKDIR frontend
RUN npm i&&npm run build

FROM apline:edge
RUN apk add supervisor inotify-tools
RUN apk add nginx && mkdir /run/nginx/

MKDIR /app/
MKDIR /app/static
COPT --from=frontend_build frontend/dist /app/static

