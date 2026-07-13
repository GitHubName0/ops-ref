#!/usr/bin/env node
/**
 * generate_embeddings.js — 读取 ops-ref 章节，生成知识块索引
 * 
 * 输入：../ops-ref/0*.md
 * 输出：embeddings.json（用于浏览器端语义检索）
 * 
 * 适配 LiteRT.js + EmbeddingGemma 的工作流：
 *   阶段一（当前）：基于关键词的检索，无需模型
 *   阶段二（未来）：浏览器端用 EmbeddingGemma 做真实语义向量检索
 */

const fs = require('fs');
const path = require('path');

const OPS_DIR = path.resolve(__dirname, '..', 'ops-ref');
const OUTPUT = path.join(__dirname, 'embeddings.json');

// 读取章节配置
function loadChapters() {
  const chaptersFile = path.join(OPS_DIR, 'chapters.sh');
  const content = fs.readFileSync(chaptersFile, 'utf-8');
  const chapters = [];
  const re = /"(\d+.*?\.md):(.*?)"/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    chapters.push({ file: m[1], name: m[2] });
  }
  return chapters;
}

// 分割 markdown 为语义块
function splitIntoChunks(md, chapterName) {
  const chunks = [];
  const lines = md.split('\n');
  let currentTitle = chapterName;
  let currentText = '';
  let inCode = false;
  let codeText = '';
  let lastHeadingLevel = 0;

  function saveChunk(forceTitle) {
    const combined = (currentText + (codeText ? '\n命令参考：\n' + codeText : '')).trim();
    if (combined.length > 30) {
      chunks.push({ title: forceTitle || currentTitle, text: combined, chapter: chapterName });
    }
    currentText = '';
    codeText = '';
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('```')) {
      if (inCode) { inCode = false; continue; }
      else { inCode = true; continue; }
    }
    if (inCode) {
      if (line.trim() && !line.startsWith('#')) codeText += line.trim() + '\n';
      continue;
    }

    const headingMatch = line.match(/^(#{1,4})\s+(.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      // 跳过章节主标题（第一个 H1 已经是 currentTitle）
      // H1-H3 总是分割，H4 当前块超过 200 字符也分割
      if (level <= 3 || currentText.length > 200) {
        saveChunk();
      }
      currentTitle = headingMatch[2];
      lastHeadingLevel = level;
      continue;
    }

    if (/^[-*_]{3,}\s*$/.test(line) || line.startsWith('![') || line.startsWith('<')) continue;

    if (line.trim()) {
      currentText += line.replace(/\|/g, ' ').trim() + '\n';
    }

    // 超过 1000 字符就分割，保留小标题
    if (currentText.length > 1000) {
      saveChunk(currentTitle);
    }
  }

  saveChunk();
  return chunks;
}

// 生成关键词权重（简单 TF 统计，用于无模型阶段的匹配）
function extractKeywords(text) {
  const words = text.toLowerCase()
    .replace(/[^\u4e00-\u9fffa-z0-9]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1);
  const freq = {};
  for (const w of words) freq[w] = (freq[w] || 0) + 1;
  // 返回权重前 20 的关键词
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([k, v]) => k);
}

// 主流程
function main() {
  const chapters = loadChapters();
  console.log(`加载 ${chapters.length} 个章节`);

  let allChunks = [];
  for (const ch of chapters) {
    const filePath = path.join(OPS_DIR, ch.file);
    if (!fs.existsSync(filePath)) {
      console.log(`  ⚠ 跳过：${ch.file} 不存在`);
      continue;
    }
    const md = fs.readFileSync(filePath, 'utf-8');
    const chunks = splitIntoChunks(md, ch.name);
    for (const c of chunks) {
      c.keywords = extractKeywords(c.text);
    }
    allChunks = allChunks.concat(chunks);
    console.log(`  ✓ ${ch.file}: ${chunks.length} 个知识块`);
  }

  // 去重相似块
  const seen = new Set();
  const deduped = [];
  for (const c of allChunks) {
    const key = c.title + c.text.substring(0, 100);
    if (!seen.has(key)) { seen.add(key); deduped.push(c); }
  }

  const output = {
    version: fs.readFileSync(path.join(__dirname, 'VERSION'), 'utf-8').trim(),
    generated: new Date().toISOString().slice(0, 10),
    total_chunks: deduped.length,
    chapters: chapters.length,
    chunks: deduped
  };

  fs.writeFileSync(OUTPUT, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`\n✓ embeddings.json 生成完成：${deduped.length} 个知识块，${(JSON.stringify(output).length / 1024).toFixed(1)} KB`);
}

main();
