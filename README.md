```bash
cp .env.example .env # then update .env with hookbin url
pnpm install
cd lambda
pnpm install
cd ..
```

```bash
# Start PostgreSQL and LocalStack
docker-compose up -d
```

```bash
pnpm run migration:run
```

```bash
# Build and deploy Lambda to LocalStack
bash scripts/setup-localstack.sh
```

```bash
pnpm run start:dev

pnpm run start:prod
```
