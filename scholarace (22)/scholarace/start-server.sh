#!/bin/sh
cd "$(dirname "$0")"
[ -f server/.env ] || cp server/.env.example server/.env
node server/server.js
