import os
import io
import uuid

import minio

import base


class File:
    def __init__(self):

        self.minio = minio.Minio(
            os.environ.get("MINIO_URL","localhost:9000"),
            os.environ.get("MINIO_ACCESS","minioadmin"),
            os.environ.get("MINIO_SECRET","minioadmin"),
            secure=False,
        )

    def _create_bucket(self, bucket):
        if not self.minio.bucket_exists(bucket):
            self.minio.make_bucket(bucket)

    def new_object(self, name, bucket="file"):
        self._create_bucket(bucket)

        id = str(uuid.uuid4())
        url = url = self.minio.get_presigned_url(
            "PUT", bucket, id, extra_query_params={"X-Amz-Meta-realname": name}
        )
        # url+="&X-Realname="+name
        return url, id

    def new_object_with_content(self, name, content, bucket="file"):
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

    def get_object(self, id, bucket="file"):
        self._create_bucket(bucket)

        try:
            stat = self.minio.stat_object(bucket, id)
        except minio.error.S3Error:
            return None, None

        name = stat.metadata.get("X-Amz-Meta-realname")
        url = self.minio.presigned_get_object(bucket, id)
        return url, name  # pre-sign url and file name

    def get_object_content(self, id, bucket="file"):
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


if __name__ == "__main__":
    server = base.RpcServiceFactory("file")
    server.register(File())
    server.connect()
