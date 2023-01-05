FROM alpine:edge

EXPOSE 5022
RUN apk add python3 py3-pip openssl
RUN mkdir /data
ADD ./ /app
RUN pip3 install -r /app/requirements.txt
RUN apk add py3-twisted
ENV VOS_DATAROOT=/data
WORKDIR /app
CMD ["python3","/app/ssh.py"]
