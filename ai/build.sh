#!/bin/bash
# ============================================================
# Ops Ref AI 构建脚本
# 1. 读取 ../ops-ref/*.md 生成 embeddings.json
# 2. 构建带聊天 UI 的离线 HTML
# ============================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "==> 生成知识库嵌入..."
node generate_embeddings.js

echo ""
echo "==> 构建聊天页面..."
node build_html.js

echo ""
echo "==> 构建完成！"
echo "    📄 聊天页面: $SCRIPT_DIR/docs/index.html"
wc -c < "$SCRIPT_DIR/docs/index.html" | awk '{printf "    大小: %d bytes (%.1f KB)\n", $1, $1/1024}'
