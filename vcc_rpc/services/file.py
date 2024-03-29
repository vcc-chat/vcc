import os
import io
import uuid

import minio
from minio.commonconfig import ComposeSource


import base


class File:
    def __init__(self):
        self.bucket_prefix = os.environ.get("FILE_BUCKET_PREFIX", "")
        self.minio = minio.Minio(
            os.environ.get("MINIO_URL", "localhost:9000"),
            os.environ.get("MINIO_ACCESS", "minioadmin"),
            os.environ.get("MINIO_SECRET", "minioadmin"),
            secure=bool(os.environ.get("MINIO_SSL", False)),
        )

    def _create_bucket(self, bucket):
        if not self.minio.bucket_exists(bucket):
            self.minio.make_bucket(bucket)

    def new_object(self, name, id=None, bucket="file"):
        bucket = self.bucket_prefix + bucket
        self._create_bucket(bucket)
        if id == None:
            id = str(uuid.uuid4())
        url = url = self.minio.get_presigned_url(
            "PUT", bucket, id, extra_query_params={"X-Amz-Meta-realname": name}
        )
        # url+="&X-Realname="+name
        return url, id

    def new_object_with_content(self, name, content, bucket="file"):
        bucket = self.bucket_prefix + bucket
        self._create_bucket(bucket)
        id = str(uuid.uuid4())
        data = io.BytesIO(content.encode())
        self.minio.put_object(
            bucket,
            id,
            data,
            length=len(content),
            metadata={"X-Amz-Meta-realname": name},
        )
        return id

    # When I am writing this,I thinks I dont need this now
    # def compose_object(self,sources,name,id=None,bucket="file"):
    #     if id==None:
    #         id = str(uuid.uuid4())
    #     sources=list(map(lambda x:ComposeSource(bucket+"/"+x),sources))
    #     self.minio.compose_object(bucket,id,sourc es)
    def get_object(self, id, bucket="file"):
        bucket = self.bucket_prefix + bucket
        self._create_bucket(bucket)

        try:
            stat = self.minio.stat_object(bucket, id)
        except minio.error.S3Error:
            return None, None

        name = stat.metadata.get("X-Amz-Meta-realname")
        url = self.minio.presigned_get_object(bucket, id)
        return url, name  # pre-sign url and file name

    def has_object(self, id, bucket="file"):
        bucket = self.bucket_prefix + bucket
        try:
            self.minio.stat_object(bucket, id)
        except minio.error.S3Error as err:
            if err.code.startswith("NoSuch"):
                return False
            else:
                raise
        return True

    def get_object_content(self, id, bucket="file"):
        bucket = self.bucket_prefix + bucket
        self._create_bucket(bucket)

        try:
            stat = self.minio.stat_object(bucket, id)
        except minio.error.S3Error:
            return None, None
        conn = self.minio.get_object(bucket, id)
        data = conn.read(decode_content=True)
        conn.close()
        conn.release_conn()
        return data.decode(), stat.metadata.get(
            "X-Amz-Meta-realname"
        )  # file content and file name

    def list_object_names(self, prefix=None, bucket="record"):
        bucket = self.bucket_prefix + bucket
        objects = self.minio.list_objects(bucket, prefix=prefix)
        names: list[str] = [object.object_name for object in objects]
        return names


if __name__ == "__main__":
    server = base.RpcServiceFactory()
    server.register(File())
    server.connect()
