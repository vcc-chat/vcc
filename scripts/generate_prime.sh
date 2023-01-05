#!/bin/sh
mkdir $1
openssl prime  -generate -safe -bits 2048 >$1/2048
openssl prime  -generate  -bits 4096 >$1/4096
