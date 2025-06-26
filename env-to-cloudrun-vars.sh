#!/bin/bash
ENV_FILE=${1:-.env}
if [ ! -f "$ENV_FILE" ]; then
  echo "❌ Không tìm thấy file $ENV_FILE"
  exit 1
fi
ENV_VARS=$(grep -v '^#' "$ENV_FILE" | grep -v '^\s*$' | sed 's/"/\\"/g' | paste -sd, -)
echo "$ENV_VARS"
