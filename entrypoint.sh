#!/bin/sh
cp -rnv /app/public/config/* /app/dist/config
exec node /app/server.mjs
