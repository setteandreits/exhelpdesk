#!/bin/bash
echo ">>> Creazione bucket S3..."
awslocal s3 mb s3://exhelpdesk-files
echo ">>> Bucket exhelpdesk-files creato."