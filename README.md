# Clevertap connector for Lokalise content type app engine

## Tech stack:

- Docker
- Typescript
- Fastify

## Installation

Add .env file to your project root directory based on `docker/.env.default` but with NODE_ENV changed to development.

If needed, update host ports starting `HOST_*`

For development, use the dockerized environment:

    docker compose up -d

The app is available at: http://localhost:3000/ (If `HOST_APP_PORT` was not changed)

We recommend the following settings to avoid port conflicts when working with the Content Engine locally:

```
HOST_APP_PORT=3488
HOST_PRIVATE_APP_PORT=9088
```

Make sure that the `/node_modules` folder is not empty.
If that's the case, you can execute the following .

```
 docker compose exec -it app npm install
 make sync-modules
```

## Testing

Run tests and coverage:

`docker compose exec -it app npm run test:coverage`

Run tests:

    docker compose exec -it app npm run test

Run formatting:

    docker compose exec -it app npm run format

Run linter:

    docker compose exec -it app npm run lint

## Monitoring endpoint

http://localhost:9080/metrics (If `HOST_PRIVATE_APP_PORT` was not changed)

## Openapi

Openapi docs are available at https://github.com/lokalise/connector-openapi/blob/master/postman/schemas/schema.yaml
