#!/usr/bin/env bash

[ -z "${TAG}" ] && echo "No tag specified" && exit 1
[ -z "${GIT_COMMIT}" ] && echo "No GIT_COMMIT specified" && exit 1

PROJECT=$(git config --get remote.origin.url | cut -d"/" -f2 | sed 's/\.git$//')
SERVICE="app"

DOCKER_BUILDKIT=1 docker build -f Dockerfile \
  --build-arg APP_VERSION=$(date "+%Y%m%d%H%M") \
  --build-arg GIT_COMMIT_SHA=$(git rev-parse --short HEAD) \
  -t "053497547689.dkr.ecr.eu-central-1.amazonaws.com/${PROJECT}/${SERVICE}:${TAG}" \
  --label org.opencontainers.image.created="$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
  --label org.opencontainers.image.revision="${GIT_COMMIT}" \
  --label org.opencontainers.image.title="${SERVICE}" \
  .

docker push "053497547689.dkr.ecr.eu-central-1.amazonaws.com/${PROJECT}/${SERVICE}:${TAG}"
