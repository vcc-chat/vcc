import io
import uuid

import minio

import base


class File:
    def __init__(self):
        self.minio=minio.Minio("localhost:9000",access_key="minioadmin",secret_key="minioadmin",secure=False)
        if not self.minio.bucket_exists("file"):
            self.minio.make_bucket("file")
    def new_object(self,name):
        id=str(uuid.uuid4())
        url=url = self.minio.get_presigned_url("PUT","file",id,extra_query_params={"X-Amz-Meta-realname":name})
        #url+="&X-Realname="+name
        return url,id
    def new_object_with_content(self,name,content):
        id=str(uuid.uuid4())
        data=io.BytesIO(content.encode())
        self.minio.put_object("file",id,data,length=len(content),metadata={"X-Amz-Meta-realname":name})
        return id
    def get_object(self,id):
        print(1)
        try:
            stat=self.minio.stat_object("file",id)
        except minio.error.S3Error:
            return None,None

        name=stat.metadata.get("X-Amz-Meta-realname")
        url=self.minio.presigned_get_object("file",id)
        return url,name # pre-sign url and file name
    def get_object_content(self,id):
        try:
            stat=self.minio.stat_object("file",id)
        except minio.error.S3Error:
            return None,None
        conn=self.minio.get_object("file",id)
        data=conn.read(decode_content=True)
        conn.close()
        conn.release_conn()
        return data.decode(),stat.metadata.get("X-Amz-Meta-realname") # file content and file name

if __name__ == "__main__":
    server = base.RpcServiceFactory("file")
    server.register(File())
    server.connect()
