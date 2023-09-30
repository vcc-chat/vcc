FROM alpine:edge

EXPOSE 5022
RUN apk add python3 py3-pip openssl openssh-keygen
RUN mkdir /data
ADD ./ /app
RUN pip3 install -r /app/requirements.txt
ENV VOS_DATAROOT=/data
WORKDIR /app
CMD ["python3","/app/ssh.py"]
