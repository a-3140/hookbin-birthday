.PHONY: up down build-lambda deploy-lambda invoke-producer invoke-consumer logs-producer logs-consumer queue-status purge-queue clean setup restart

ENDPOINT=http://localhost:4566
REGION=us-east-1

up:
	docker-compose up -d
	@sleep 5

down:
	docker-compose down

build-lambda:
	cd lambda && pnpm install && pnpm run build && pnpm run package

deploy-lambda:
	@bash scripts/setup-localstack.sh

setup: up build-lambda deploy-lambda

invoke-producer:
	@echo "Invoking producer lambda..."
	@aws --endpoint-url=$(ENDPOINT) lambda invoke \
		--function-name birthday-producer \
		--log-type Tail \
		/tmp/producer-output.json \
		--query 'LogResult' \
		--output text | base64 -d
	@echo "\nResponse:"
	@cat /tmp/producer-output.json

invoke-consumer:
	@echo "Invoking consumer lambda..."
	@aws --endpoint-url=$(ENDPOINT) lambda invoke \
		--function-name birthday-consumer \
		--log-type Tail \
		/tmp/consumer-output.json \
		--query 'LogResult' \
		--output text | base64 -d
	@echo "\nResponse:"
	@cat /tmp/consumer-output.json

logs-producer:
	@aws --endpoint-url=$(ENDPOINT) logs tail \
		/aws/lambda/birthday-producer --follow

logs-consumer:
	@aws --endpoint-url=$(ENDPOINT) logs tail \
		/aws/lambda/birthday-consumer --follow

queue-status:
	@echo "Queue Status:"
	@aws --endpoint-url=$(ENDPOINT) --region $(REGION) sqs get-queue-attributes \
		--queue-url $(ENDPOINT)/000000000000/birthday-notifications-queue \
		--attribute-names All \
		--query 'Attributes.{Messages:ApproximateNumberOfMessages,InFlight:ApproximateNumberOfMessagesNotVisible,Delayed:ApproximateNumberOfMessagesDelayed}' \
		--output table
	@echo "\nDLQ Status:"
	@aws --endpoint-url=$(ENDPOINT) --region $(REGION) sqs get-queue-attributes \
		--queue-url $(ENDPOINT)/000000000000/birthday-notifications-dlq \
		--attribute-names All \
		--query 'Attributes.{Messages:ApproximateNumberOfMessages}' \
		--output table

purge-queue:
	@echo "Purging main queue..."
	@aws --endpoint-url=$(ENDPOINT) --region $(REGION) sqs purge-queue \
		--queue-url $(ENDPOINT)/000000000000/birthday-notifications-queue
	@echo "Purging DLQ..."
	@aws --endpoint-url=$(ENDPOINT) --region $(REGION) sqs purge-queue \
		--queue-url $(ENDPOINT)/000000000000/birthday-notifications-dlq

clean:
	rm -rf lambda/dist
	rm -rf lambda/node_modules

restart: down up deploy-lambda
