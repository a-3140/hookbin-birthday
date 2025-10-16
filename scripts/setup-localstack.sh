#!/bin/bash
set -e

ENDPOINT="http://localhost:4566"
REGION="us-east-1"

echo "Building Lambda function..."
cd lambda
pnpm install
pnpm run build
pnpm run package
cd ..

echo "Creating Dead Letter Queue..."
DLQ_URL=$(aws --endpoint-url=$ENDPOINT --region $REGION sqs create-queue \
  --queue-name birthday-notifications-dlq \
  --query 'QueueUrl' \
  --output text)

DLQ_ARN=$(aws --endpoint-url=$ENDPOINT --region $REGION sqs get-queue-attributes \
  --queue-url $DLQ_URL \
  --attribute-names QueueArn \
  --query 'Attributes.QueueArn' \
  --output text)

echo "DLQ created: $DLQ_URL"

echo "Creating SQS queue with DLQ..."
QUEUE_URL=$(aws --endpoint-url=$ENDPOINT --region $REGION sqs create-queue \
  --queue-name birthday-notifications-queue \
  --attributes "{\"RedrivePolicy\":\"{\\\"deadLetterTargetArn\\\":\\\"$DLQ_ARN\\\",\\\"maxReceiveCount\\\":\\\"3\\\"}\"}" \
  --query 'QueueUrl' \
  --output text)

QUEUE_ARN=$(aws --endpoint-url=$ENDPOINT --region $REGION sqs get-queue-attributes \
  --queue-url $QUEUE_URL \
  --attribute-names QueueArn \
  --query 'Attributes.QueueArn' \
  --output text)

echo "SQS queue created: $QUEUE_URL"

echo "Creating Birthday Producer Lambda..."
aws --endpoint-url=$ENDPOINT --region $REGION lambda create-function \
  --function-name birthday-producer \
  --runtime nodejs18.x \
  --handler birthday-producer.handler \
  --zip-file fileb://lambda/dist/function.zip \
  --role arn:aws:iam::000000000000:role/lambda-role \
  --timeout 300 \
  --memory-size 512 \
  --environment "Variables={DB_HOST=host.docker.internal,DB_PORT=5432,DB_USERNAME=postgres,DB_PASSWORD=postgres,DB_DATABASE=boomering,HOOKBIN_URL=https://eoi5vi6f2y827c6.m.pipedream.net,SQS_QUEUE_URL=$QUEUE_URL,SQS_ENDPOINT_URL=$ENDPOINT}"

echo "Creating Birthday Consumer Lambda..."
aws --endpoint-url=$ENDPOINT --region $REGION lambda create-function \
  --function-name birthday-consumer \
  --runtime nodejs18.x \
  --handler birthday-consumer.handler \
  --zip-file fileb://lambda/dist/function.zip \
  --role arn:aws:iam::000000000000:role/lambda-role \
  --timeout 60 \
  --memory-size 256 \
  --environment "Variables={DB_HOST=host.docker.internal,DB_PORT=5432,DB_USERNAME=postgres,DB_PASSWORD=postgres,DB_DATABASE=boomering,HOOKBIN_URL=https://eoi5vi6f2y827c6.m.pipedream.net}"

echo "Creating EventBridge rule (every 15 minutes for producer)..."
aws --endpoint-url=$ENDPOINT --region $REGION events put-rule \
  --name birthday-producer-every-15min \
  --schedule-expression "cron(0/15 * * * ? *)" \
  --state ENABLED

echo "Adding Producer Lambda as EventBridge target..."
aws --endpoint-url=$ENDPOINT --region $REGION events put-targets \
  --rule birthday-producer-every-15min \
  --targets "Id=1,Arn=arn:aws:lambda:$REGION:000000000000:function:birthday-producer"

echo "Creating event source mapping (SQS -> Consumer Lambda)..."
aws --endpoint-url=$ENDPOINT --region $REGION lambda create-event-source-mapping \
  --function-name birthday-consumer \
  --batch-size 10 \
  --event-source-arn $QUEUE_ARN

echo "Setup complete!"
echo "Queue URL: $QUEUE_URL"
echo "DLQ URL: $DLQ_URL"
