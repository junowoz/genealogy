#!/bin/sh
set -eu

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  node ./node_modules/prisma/build/index.js migrate deploy
fi

exec "$@"
