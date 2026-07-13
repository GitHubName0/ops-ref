#!/bin/bash
# ============================================================
# Ops Ref 构建脚本
# 功能：合并各章节 .md → index.md，并生成带搜索的 HTML
# 用法：./build.sh
# 依赖：pandoc（如无则仅生成 index.md）
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
VERSION="$(cat "$SCRIPT_DIR/VERSION" 2>/dev/null || echo 'unknown')"
BUILD_TIME="$(date +%Y-%m-%d)"

# 加载共享章节定义（与 ops 脚本共用）
source "$SCRIPT_DIR/chapters.sh"

# 从 CHAPTERS 提取纯文件名数组（去掉 ":显示名" 部分）
CHAPTER_FILES=()
for entry in "${CHAPTERS[@]}"; do
  CHAPTER_FILES+=("${entry%%:*}")
done

OUTPUT_MD="$SCRIPT_DIR/index.md"
OUTPUT_HTML="$SCRIPT_DIR/docs/index.html"

echo "==> 合并 Markdown 文件..."

# 写入文档标题和说明
cat > "$OUTPUT_MD" << HEADER
# Ops Ref — 运维命令速查手册（完整版）

> 版本：$VERSION | 构建日期：$BUILD_TIME
> 包含：Linux 基础 / Linux 排障 / Kubernetes / OpenStack / Ansible
>
> 断网环境下的运维排查与日常管理
> 适用系统：CentOS/RHEL + Ubuntu/Debian

---

HEADER

for chapter in "${CHAPTER_FILES[@]}"; do
  chapter_path="$SCRIPT_DIR/$chapter"
  if [[ -f "$chapter_path" ]]; then
    echo "" >> "$OUTPUT_MD"
    echo "---" >> "$OUTPUT_MD"
    echo "" >> "$OUTPUT_MD"
    cat "$chapter_path" >> "$OUTPUT_MD"
    echo "  ✔ 已合并: $chapter"
  else
    echo "  ⚠ 跳过（不存在）: $chapter"
  fi
done

echo ""
echo "==> 完成: $OUTPUT_MD"
echo "    行数: $(wc -l < "$OUTPUT_MD")"
echo ""

# 尝试用 pandoc 转 HTML
if command -v pandoc &>/dev/null; then
  echo "==> 转换 HTML..."
  mkdir -p "$SCRIPT_DIR/docs"

  # 使用 pandoc 生成带搜索所需锚点的 HTML
  pandoc "$OUTPUT_MD" \
    --from markdown \
    --to html5 \
    --standalone \
    --toc \
    --toc-depth=3 \
    --metadata title="Ops Ref 运维命令速查" \
    --metadata lang="zh-CN" \
    --css /dev/null \
    -o "$OUTPUT_HTML" \
    --variable "mainfont=system-ui" \
    --embed-resources \
    --metadata pagetitle="Ops Ref 运维命令速查手册" 2>/dev/null && \
    echo "  ✔ HTML 已生成: $OUTPUT_HTML" || \
    echo "  ⚠ pandoc 转 HTML 失败，仅生成 index.md"

  # 如果上面有 JS 搜索功能需要，建议直接 HTML 文件方式保留
  # 或者将生成的 HTML 配合自定义模板使用
  if [ -f "$OUTPUT_HTML" ]; then
    echo "    大小: $(du -h "$OUTPUT_HTML" | cut -f1)"
  fi
else
  echo "==> pandoc 未安装，跳过 HTML 生成"
  echo "    安装 pandoc 后重新运行即可："
  echo "    # CentOS: yum install pandoc"
  echo "    # Ubuntu: apt install pandoc"
  echo "    # Windows: choco install pandoc"
fi

echo ""
echo "==> 构建完成！"
echo "    📄 合并版 Markdown: $OUTPUT_MD"
[[ -f "$OUTPUT_HTML" ]] && echo "    🌐 HTML 浏览器版:   $OUTPUT_HTML"
