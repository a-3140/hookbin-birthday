#!/bin/bash
set -e

echo "Building Lambda function..."
cd lambda
npm install
npm run build
npm run package
cd ..

echo "Creating Lambda function in LocalStack..."
aws --endpoint-url=http://localhost:4566 lambda create-function \
  --function-name birthday-processor \
  --runtime nodejs18.x \
  --handler index.handler \
  --zip-file fileb://lambda/dist/function.zip \
  --role arn:aws:iam::000000000000:role/lambda-role \
  --timeout 300 \
  --memory-size 512 \
  --environment "Variables={DB_HOST=host.docker.internal,DB_PORT=5432,DB_USERNAME=postgres,DB_PASSWORD=postgres,DB_DATABASE=boomering,HOOKBIN_URL=https://hookb.in/YOUR_BIN_ID}"

echo "Creating EventBridge rule (every 15 minutes)..."
aws --endpoint-url=http://localhost:4566 events put-rule \
  --name birthday-check-every-15min \
  --schedule-expression "cron(0/15 * * * ? *)" \
  --state ENABLED

echo "Adding Lambda as target..."
aws --endpoint-url=http://localhost:4566 events put-targets \
  --rule birthday-check-every-15min \
  --targets "Id=1,Arn=arn:aws:lambda:us-east-1:000000000000:function:birthday-processor"

echo "Setup complete!"
