#!/bin/bash
# Startup script for PM2 to run serve
cd "$(dirname "$0")"
exec npm run serve
