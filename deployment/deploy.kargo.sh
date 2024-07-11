#!/bin/bash

set -ex

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)
cd "$SCRIPT_DIR" || :

COMPOSE_FILE=docker-compose.kargo.yml
export COMPOSE_FILE
PROJECT=$(git config --get remote.origin.url | cut -d"/" -f2 | sed 's/\.git$//')
export PROJECT

docker-compose pull
docker-compose up -d
