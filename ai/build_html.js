#!/usr/bin/env node
/**
 * build_html.js — 构建 ops-ref-ai 聊天问答页面
 * 嵌入 embeddings.json 和聊天 UI，生成单文件离线 HTML
 */

const fs = require('fs');
const path = require('path');

const dir = __dirname;
const version = fs.readFileSync(path.join(dir, 'VERSION'), 'utf-8').trim();
const buildTime = new Date().toISOString().slice(0, 10);
const embeddings = JSON.parse(fs.readFileSync(path.join(dir, 'embeddings.json'), 'utf-8'));
const embeddingsJson = JSON.stringify(embeddings);

const css = [
  ':root,[data-theme="dark"]{',
  '--bg:#0d1117;--bg2:#161b22;--border:#21262d;--border2:#30363d;',
  '--fg:#c9d1d9;--fg2:#8b949e;--accent:#58a6ff;--accent2:#0f3460;',
  '--green:#3fb950;--orange:#e2b714;--red:#ff6b6b;',
  '}',
  '[data-theme="light"]{',
  '--bg:#ffffff;--bg2:#f6f8fa;--border:#d0d7de;--border2:#d0d7de;',
  '--fg:#24292f;--fg2:#57606a;--accent:#0969da;--accent2:#ddf4ff;',
  '--green:#1a7f37;--orange:#bf8700;--red:#cf222e;',
  '}',
  '*{box-sizing:border-box;margin:0;padding:0}',
  'body{font-family:-apple-system,"Segoe UI","Noto Sans SC",sans-serif;background:var(--bg);color:var(--fg);height:100vh;display:flex;flex-direction:column}',
  '.header{background:var(--accent2);color:#fff;padding:8px 20px;display:flex;align-items:center;gap:12px;flex-shrink:0}',
  '.header h1{font-size:15px;font-weight:700}',
  '.header .badge{font-size:10px;padding:1px 8px;background:rgba(255,255,255,.15);border-radius:10px}',
  '.header .status{font-size:11px;margin-left:auto;opacity:.8}',
  '.chat{flex:1;overflow-y:auto;padding:16px 20px;display:flex;flex-direction:column;gap:12px}',
  '.msg{max-width:80%;padding:10px 14px;border-radius:12px;font-size:13px;line-height:1.6;white-space:pre-wrap;word-break:break-word}',
  '.msg.user{align-self:flex-end;background:var(--accent2);color:#fff;border-bottom-right-radius:4px}',
  '.msg.ai{align-self:flex-start;background:var(--bg2);border:1px solid var(--border2);border-bottom-left-radius:4px}',
  '.msg.ai .src{display:block;margin-top:6px;font-size:10px;color:var(--fg2);border-top:1px solid var(--border);padding-top:4px}',
  '.msg.ai code{background:var(--bg);color:var(--orange);padding:1px 4px;border-radius:3px;font-size:11px}',
  '.input-bar{display:flex;gap:8px;padding:10px 20px;background:var(--bg2);border-top:1px solid var(--border);flex-shrink:0}',
  '.input-bar input{flex:1;padding:8px 14px;border:1px solid var(--border2);border-radius:8px;background:var(--bg);color:var(--fg);font-size:13px;outline:none}',
  '.input-bar input:focus{border-color:var(--accent)}',
  '.input-bar button{padding:8px 16px;background:var(--accent);color:#fff;border:none;border-radius:8px;font-size:13px;cursor:pointer}',
  '.input-bar button:hover{opacity:.9}',
  '.loading{display:flex;align-items:center;gap:6px;color:var(--fg2);font-size:12px;padding:4px 0}',
  '.loading .dot{width:6px;height:6px;border-radius:50%;background:var(--accent);animation:bounce 1.4s infinite}',
  '.loading .dot:nth-child(2){animation-delay:.2s}',
  '.loading .dot:nth-child(3){animation-delay:.4s}',
  '@keyframes bounce{0%,80%,100%{transform:scale(0)}40%{transform:scale(1)}}',
  '.feedback{display:flex;gap:8px;margin-top:6px;opacity:0;transition:opacity.15s}',
  '.msg.ai:hover .feedback{opacity:1}',
  '.fb-btn{cursor:pointer;font-size:12px;padding:2px;opacity:.4;transition:opacity.15s}',
  '.fb-btn:hover,.fb-btn.active{opacity:1}',
  '.msg.weak{opacity:.6;border-left:3px solid var(--orange)}',
  '.empty{text-align:center;color:var(--fg2);padding:60px 20px;font-size:14px}',
  '.empty p{margin:4px 0}',
  '.theme-btn{background:rgba(255,255,255,.15);color:#fff;border:none;border-radius:6px;padding:4px 8px;font-size:14px;cursor:pointer}',
  '@media(max-width:600px){.header{padding:6px 12px}.chat{padding:10px}.msg{max-width:90%;font-size:12px}.input-bar{padding:8px 12px}}',
].join('\n');

const html = [
  '<!DOCTYPE html>',
  '<html lang="zh-CN" data-theme="dark">',
  '<head>',
  '<meta charset="UTF-8">',
  '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
  '<title>Ops Ref AI — 离线运维问答</title>',
  '<meta name="description" content="基于 LiteRT.js 的离线运维 AI 问答助手">',
  '<style>' + css + '</style>',
  '</head>',
  '<body>',
  '<div class="header">',
  '<h1>🐧 Ops Ref AI</h1>',
  '<span class="badge">' + version + '</span>',
  '<span class="status" id="modelStatus">模型未加载</span>',
  '<button class="theme-btn" id="themeToggle" title="切换主题">☀</button>',
  '</div>',
  '<div class="chat" id="chat">',
  '<div class="empty">',
  '<p>🤖 离线运维 AI 问答助手</p>',
  '<p style="font-size:12px">基于 ' + embeddings.total_chunks + ' 个知识块 · 覆盖 ' + embeddings.chapters + ' 个章节</p>',
  '<p style="font-size:11px;margin-top:8px">试试问：<code>磁盘满了怎么办</code> <code>nginx 502怎么排查</code> <code>k8s pod pending</code></p>',
  '</div>',
  '</div>',
  '<div class="input-bar">',
  '<input type="text" id="userInput" placeholder="输入运维问题，例如：CPU 飙高怎么排查…" autocomplete="off">',
  '<button id="sendBtn">发送</button>',
  '</div>',
  '<script>',
  'var EMBEDDINGS = ' + embeddingsJson + ';',
  '</script>',
  '<script>' + fs.readFileSync(path.join(dir, 'chat.js'), 'utf-8') + '</script>',
  '</body>',
  '</html>',
].join('\n');

const outDir = path.join(dir, 'docs');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf-8');
const stats = fs.statSync(path.join(outDir, 'index.html'));
console.log('Done! ' + stats.size + ' bytes (' + (stats.size / 1024).toFixed(1) + ' KB)');
