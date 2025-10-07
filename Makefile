.PHONY: up down build-lambda deploy-lambda invoke-lambda logs clean setup restart

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

invoke-lambda:
	@aws --endpoint-url=http://localhost:4566 lambda invoke \
		--function-name birthday-processor \
		--log-type Tail \
		/tmp/lambda-output.json \
		--query 'LogResult' \
		--output text | base64 -d
	@cat /tmp/lambda-output.json

logs:
	@aws --endpoint-url=http://localhost:4566 logs tail \
		/aws/lambda/birthday-processor --follow

clean:
	rm -rf lambda/dist
	rm -rf lambda/node_modules

restart: down up deploy-lambda
