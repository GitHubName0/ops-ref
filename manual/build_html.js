#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const dir = __dirname;
const version = fs.readFileSync(path.join(dir, 'VERSION'), 'utf-8').trim();
const buildTime = new Date().toISOString().slice(0, 10);

const md = fs.readFileSync(path.join(dir, 'index.md'), 'utf-8');
const mdJson = JSON.stringify(md);
const pinyinRaw = fs.readFileSync(path.join(dir, 'pinyin.txt'), 'utf-8').trim();
const renderJs = fs.readFileSync(path.join(dir, 'render.js'), 'utf-8')
  .replace('DATA_PLACEHOLDER', mdJson)
  .replace('VERSION_PLACEHOLDER', version)
  .replace('BUILD_PLACEHOLDER', buildTime)
  .replace('PYDICT_PLACEHOLDER', pinyinRaw);

const css = [
  // ===== CSS Variables (dark default) =====
  ':root,[data-theme="dark"]{',
  '--bg:#0d1117;--bg2:#161b22;--bg3:#1c2333;--border:#21262d;--border2:#30363d;',
  '--fg:#c9d1d9;--fg2:#8b949e;--fg3:#484f58;',
  '--accent:#58a6ff;--accent2:#1f3a5f;--accent3:#0f3460;',
  '--red:#ff6b6b;--red2:#f85149;--green:#3fb950;--yellow:#f0c674;--orange:#e2b714;',
  '--syn-cmt:#8b949e;--syn-str:#a5d6ff;--syn-opt:#7ee787;--syn-kw:#ff7b72;--syn-num:#79c0ff;--syn-op:#d2a8ff;',
  '}',
  '[data-theme="light"]{',
  '--bg:#ffffff;--bg2:#f6f8fa;--bg3:#eaeef2;--border:#d0d7de;--border2:#d0d7de;',
  '--fg:#24292f;--fg2:#57606a;--fg3:#8c959f;',
  '--accent:#0969da;--accent2:#ddf4ff;--accent3:#0969da;',
  '--red:#cf222e;--red2:#cf222e;--green:#1a7f37;--yellow:#9a6700;--orange:#bf8700;',
  '--syn-cmt:#6e7781;--syn-str:#0a3069;--syn-opt:#116329;--syn-kw:#cf222e;--syn-num:#0550ae;--syn-op:#8250df;',
  '}',

  // ===== Base =====
  '*{box-sizing:border-box;margin:0;padding:0}',
  'body{font-family:-apple-system,"Segoe UI","Noto Sans SC",system-ui,sans-serif;background:var(--bg);color:var(--fg);line-height:1.7}',

  // ===== Header =====
  '.header{position:sticky;top:0;z-index:200;background:var(--accent3);color:#fff;padding:10px 24px;display:flex;align-items:center;gap:10px;flex-wrap:wrap}',
  '.header h1{font-size:16px;font-weight:700;margin:0;white-space:nowrap}',
  '.header input{flex:1;min-width:160px;max-width:360px;padding:7px 12px;border:none;border-radius:6px;font-size:13px;background:rgba(255,255,255,.15);color:#fff;outline:none}',
  '.header input:focus{background:rgba(255,255,255,.25)}',
  '.header input::placeholder{color:rgba(255,255,255,.6)}',
  '.header .match-count{font-size:12px;opacity:.8;white-space:nowrap}',
  '.header .search-hint{font-size:10px;opacity:.5;white-space:nowrap}',

  // Theme toggle
  '.theme-btn{background:rgba(255,255,255,.15);color:#fff;border:none;border-radius:6px;padding:4px 8px;font-size:14px;cursor:pointer;line-height:1}',

  // Command count
  '.cmd-count{font-size:11px;opacity:.7;white-space:nowrap}',

  // ===== Autocomplete dropdown =====
  '.suggest-list{display:none;position:absolute;top:100%;left:0;right:0;max-width:400px;background:var(--bg2);border:1px solid var(--border2);border-radius:0 0 8px 8px;list-style:none;padding:4px 0;margin:0;z-index:300;box-shadow:0 8px 24px rgba(0,0,0,.4);max-height:320px;overflow-y:auto}',
  '.suggest-list li{padding:6px 14px;font-size:13px;color:var(--fg);cursor:pointer;display:flex;align-items:center;gap:8px;line-height:1.4}',
  '.suggest-list li:hover,.suggest-list li.active{background:var(--accent2)}',
  '.suggest-icon{font-size:11px;color:var(--fg2);flex-shrink:0;width:14px;text-align:center}',
  '.suggest-sec{font-size:10px;color:var(--fg2);margin-left:auto;padding-left:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:120px}',

  // ===== Layout =====
  '.layout{display:flex;min-height:calc(100vh - 52px)}',
  '.sidebar{width:260px;flex-shrink:0;background:var(--bg2);border-right:1px solid var(--border);position:sticky;top:52px;height:calc(100vh - 52px);overflow-y:auto;padding:8px 0}',
  '.sidebar::-webkit-scrollbar{width:6px}',
  '.sidebar::-webkit-scrollbar-thumb{background:var(--border2);border-radius:3px}',

  // ===== TOC =====
  '#sidebarToc a{display:block;padding:4px 16px;font-size:12.5px;color:var(--fg2);text-decoration:none;border-left:3px solid transparent;transition:all.15s;line-height:1.4}',
  '#sidebarToc a:hover{color:var(--accent);background:var(--bg2)}',
  '#sidebarToc a.active{color:var(--accent);border-left-color:var(--accent);background:var(--bg2);font-weight:500}',
  '#sidebarToc .toc-l2{padding-left:28px;font-size:12px}',
  '.toc-group-header{display:flex;align-items:center;gap:4px;padding:6px 14px;font-size:12.5px;font-weight:600;color:var(--fg);cursor:pointer;border-left:3px solid transparent;transition:all.15s;user-select:none}',
  '.toc-group-header:hover{color:var(--accent);background:var(--bg2)}',
  '.toc-group-header.active{color:var(--accent);border-left-color:var(--accent);background:var(--bg2)}',
  '.toc-arrow{font-size:10px;width:14px;flex-shrink:0;color:var(--fg2);transition:transform.15s}',
  '.toc-group-body{overflow:hidden;transition:max-height.2s ease;max-height:9999px}',
  '.toc-group-body.collapsed{max-height:0}',

  // ===== Main content =====
  '.main{flex:1;min-width:0;max-width:900px;padding:20px 32px 80px}',
  'h2{margin:28px 0 10px;padding-bottom:8px;border-bottom:2px solid var(--accent);font-size:20px;color:var(--accent);scroll-margin-top:60px;position:relative}',
  'h3{margin:18px 0 8px;font-size:16px;color:var(--red);scroll-margin-top:60px;position:relative}',
  'h4{font-size:14px;scroll-margin-top:60px}',

  // Anchor link
  '.anchor-link{position:absolute;left:-20px;top:50%;transform:translateY(-50%);font-size:14px;color:var(--fg3);text-decoration:none;opacity:0;transition:opacity.15s;padding:0 4px}',
  'h2:hover .anchor-link,h3:hover .anchor-link{opacity:1}',
  '.anchor-link:hover{color:var(--accent)}',
  '.anchor-link.copied{color:var(--green)}',

  // ===== Content elements =====
  'p,li{font-size:14px}',
  'table{width:100%;border-collapse:collapse;margin:10px 0 18px;font-size:13px}',
  'th,td{padding:6px 10px;text-align:left;border:1px solid var(--border2)}',
  'th{background:var(--accent2);color:var(--fg);font-weight:600}',
  'tr:nth-child(even){background:var(--bg3)}',
  'pre{background:var(--bg2);color:var(--fg);padding:14px 18px;overflow-x:auto;font-size:12.5px;line-height:1.6;border:1px solid var(--border2);border-radius:0 0 8px 8px;margin:0}',
  'code{font-family:"Cascadia Code","Fira Code",Consolas,monospace}',
  'p>code,li>code{background:var(--bg3);color:var(--yellow);padding:1px 6px;border-radius:4px;border:1px solid var(--border2)}',
  'blockquote{border-left:4px solid var(--red);padding:8px 16px;margin:10px 0;background:var(--bg2);border-radius:0 6px 6px 0;font-size:13px;color:var(--fg2)}',
  'blockquote code{background:var(--bg)}',
  'ul,ol{padding-left:22px;margin:6px 0 10px}',
  'li{margin:3px 0}',
  'hr{border:none;border-top:1px solid var(--border2);margin:20px 0}',
  'a{color:var(--accent);text-decoration:none}',
  'a:hover{text-decoration:underline}',

  // ===== Syntax highlighting =====
  '.syn-cmt{color:var(--syn-cmt);font-style:italic}',
  '.syn-str{color:var(--syn-str)}',
  '.syn-opt{color:var(--syn-opt)}',
  '.syn-kw{color:var(--syn-kw);font-weight:500}',
  '.syn-num{color:var(--syn-num)}',
  '.syn-op{color:var(--syn-op)}',

  // ===== Code block =====
  '.code-block{position:relative;margin:8px 0 14px}',
  '.code-lang{position:absolute;top:0;left:12px;font-size:10px;color:var(--fg2);background:var(--border);padding:2px 8px;border-radius:0 0 4px 4px;text-transform:uppercase;letter-spacing:.5px}',
  '.copy-btn{position:absolute;top:6px;right:8px;background:var(--border);color:var(--fg2);border:1px solid var(--border2);border-radius:4px;padding:3px 7px;font-size:11px;cursor:pointer;opacity:0;transition:opacity.15s,color.15s;z-index:1}',
  '.code-block:hover .copy-btn{opacity:1}',
  '.copy-btn:hover{color:var(--accent);border-color:var(--accent)}',
  '.copy-btn.copied{color:var(--green);border-color:var(--green)}',

  // ===== Search highlight =====
  '.search-hl{background:var(--orange);color:var(--bg);border-radius:2px;padding:0 1px}',
  '.search-hl.search-active{background:var(--red);color:#fff;box-shadow:0 0 6px rgba(255,107,107,.5)}',

  // ===== Domain filter chips =====
  '.filter-chips{display:flex;gap:6px;padding:6px 24px;background:var(--bg2);border-bottom:1px solid var(--border);flex-wrap:wrap}',
  '.filter-chip{padding:3px 10px;font-size:11px;border-radius:12px;border:1px solid var(--border2);background:transparent;color:var(--fg2);cursor:pointer;transition:all.15s;white-space:nowrap}',
  '.filter-chip:hover{color:var(--accent);border-color:var(--accent)}',
  '.filter-chip.active{background:var(--accent);color:#fff;border-color:var(--accent)}',

  // ===== Disclaimer =====
  '.disclaimer{text-align:center;padding:5px 16px;font-size:11px;color:var(--orange);background:var(--bg2);border-bottom:1px solid var(--border)}',

  // ===== Warning notice (under H1) =====
  '.warn-notice{color:var(--red);background:var(--bg2);border:1px solid var(--red);border-radius:6px;padding:10px 16px;margin-bottom:16px;font-size:13px;font-weight:500;text-align:center}',

  // ===== Back to top =====
  '.back-to-top{position:fixed;bottom:32px;right:32px;width:44px;height:44px;border-radius:50%;background:var(--accent2);color:var(--fg);border:1px solid var(--border2);cursor:pointer;font-size:20px;display:flex;align-items:center;justify-content:center;opacity:0;transform:translateY(12px);transition:all.25s;pointer-events:none;z-index:50}',
  '.back-to-top.visible{opacity:1;transform:translateY(0);pointer-events:auto}',
  '.back-to-top:hover{background:var(--accent);color:#fff;border-color:var(--accent)}',

  // ===== Misc =====
  '.version-badge{display:inline-block;font-size:11px;padding:1px 8px;background:rgba(255,255,255,.15);border-radius:10px;color:#fff;font-weight:600;letter-spacing:.3px;white-space:nowrap}',
  '.version-badge:hover{background:rgba(255,255,255,.25)}',
  'kbd{display:inline-block;padding:1px 5px;font-size:10px;font-family:inherit;color:var(--fg);background:var(--bg3);border:1px solid var(--border2);border-radius:3px;box-shadow:0 1px 0 var(--border2)}',

  // ===== Star / favorites =====
  '.star-btn{display:inline-block;cursor:pointer;font-size:14px;color:var(--fg3);padding:0 4px;vertical-align:middle;transition:color.15s;user-select:none}',
  '.star-btn:hover{color:var(--orange)}',
  '.star-btn.starred{color:var(--orange)}',
  '.star-btn-cmd{position:absolute;top:6px;right:38px;font-size:13px;z-index:1;opacity:0;transition:opacity.15s}',
  '.code-block:hover .star-btn-cmd{opacity:1}',
  '#favoritesList{border-bottom:1px solid var(--border);padding:6px 0;margin-bottom:4px}',
  '#favoritesList .fav-empty{font-size:11px;color:var(--fg3);padding:4px 16px}',
  '#favoritesList a{display:block;padding:3px 16px;font-size:11.5px;color:var(--fg2);text-decoration:none;border-left:2px solid transparent;transition:all.15s;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
  '#favoritesList a:hover{color:var(--orange);background:var(--bg2)}',

  // ===== Footer =====
  '.footer{text-align:center;padding:20px 32px;font-size:11px;color:var(--fg3);border-top:1px solid var(--border)}',
  '.footer .ver{color:var(--fg2)}',

  // ===== Mobile: hamburger + sidebar overlay =====
  '.hamburger{display:none;background:rgba(255,255,255,.15);color:#fff;border:none;border-radius:6px;padding:6px 8px;font-size:16px;cursor:pointer;line-height:1}',
  '.sidebar-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:250}',
  '.sidebar-overlay.show{display:block}',

  // ===== Responsive =====
  '@media(max-width:768px){',
  '.hamburger{display:block}',
  '.sidebar{position:fixed;top:52px;left:0;bottom:0;z-index:260;transform:translateX(-100%);transition:transform.25s ease;width:280px;height:auto}',
  '.sidebar.open{transform:translateX(0)}',
  '.sidebar-overlay.show{display:block}',
  '.main{padding:16px}',
  '.anchor-link{left:-16px}',
  '.header .search-hint{display:none}',
  '.header .cmd-count{display:none}',
  '.copy-btn{opacity:.6 !important}',     // 触屏常显
  '.back-to-top{opacity:.7;transform:none;pointer-events:auto;bottom:16px;right:16px}',
  'table{display:block;overflow-x:auto;-webkit-overflow-scrolling:touch}',
  'pre{font-size:11.5px;padding:10px 12px}',
  'p,li{font-size:13.5px}',
  'h2{font-size:18px}h3{font-size:15px}',
  '.filter-chips{overflow-x:auto;flex-wrap:nowrap;padding:6px 12px;-webkit-overflow-scrolling:touch}',
  '.filter-chips::-webkit-scrollbar{height:0}',
  '.filter-chip{flex-shrink:0;font-size:12px;padding:4px 12px}',
  '.code-lang{font-size:9px}',
  '}',
  '@media(max-width:480px){',
  '.header{gap:6px;padding:8px 12px}',
  '.header h1{font-size:14px}',
  '.header input{padding:6px 10px;font-size:12px}',
  '.main{padding:10px}',
  '.version-badge{font-size:10px;padding:1px 6px}',
  '.suggest-list{max-width:100%;max-height:240px}',
  'pre{font-size:11px;padding:8px 10px}',
  '.search-hint{display:none !important}',
  '}',
].join('\n');

const html = [
  '<!DOCTYPE html>',
  '<html lang="zh-CN" data-theme="dark">',
  '<head>',
  '<meta charset="UTF-8">',
  '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
  '<meta name="description" content="Ops Ref 运维命令速查手册 — Linux/K8s/OpenStack/Ansible 离线命令参考">',
  '<title>Ops Ref — 运维命令速查手册</title>',
  '<style>' + css + '</style>',
  '</head>',
  '<body>',
  '<div class="header">',
  '<button class="hamburger" id="hamburgerBtn" title="目录">☰</button>',
  '<h1>🐧 Ops Ref</h1>',
  '<span class="version-badge">' + version + ' · ' + buildTime + '</span>',
  '<span class="cmd-count" id="cmdCount">—</span>',
  '<input type="text" id="searchInput" placeholder="搜索命令、关键词…" autocomplete="off">',
  '<span class="search-hint"><kbd>/</kbd> 搜索 &nbsp;<kbd>Enter</kbd> 高亮 &nbsp;<kbd>↑↓</kbd> 选择 &nbsp;空格=AND</span>',
  '<span class="match-count" id="matchCount"></span>',
  '<button class="theme-btn" id="themeToggle" title="切换主题">☀</button>',
  '</div>',
  '<div class="filter-chips">',
  '<span class="filter-chip active" data-domain="" onclick="setDomainFilter(\'\',this)">全部</span>',
  '<span class="filter-chip" data-domain="linux" onclick="setDomainFilter(\'linux\',this)">Linux</span>',
  '<span class="filter-chip" data-domain="kubernetes" onclick="setDomainFilter(\'kubernetes\',this)">K8s</span>',
  '<span class="filter-chip" data-domain="openstack" onclick="setDomainFilter(\'openstack\',this)">OpenStack</span>',
  '<span class="filter-chip" data-domain="ansible" onclick="setDomainFilter(\'ansible\',this)">Ansible</span>',
  '<span class="filter-chip" data-domain="docker" onclick="setDomainFilter(\'docker\',this)">Docker</span>',
  '</div>',
  '<div class="disclaimer">⚠ 命令仅供参考，生产环境请先在测试环境验证后小心使用</div>',
  '<div class="sidebar-overlay" id="sidebarOverlay"></div>',
  '<div class="layout">',
  '<div class="sidebar"><div id="favoritesList"></div><div id="sidebarToc"></div></div>',
  '<div class="main" id="mainContent"><div class="warn-notice">⚠ 注意：其中案例仅为演示，与实际生产环境无关，请勿直接操作。如按操作，后果概不负责</div></div>',
  '</div>',
  '<div class="footer">Ops Ref · 离线可用 · 风吟 &amp; LP</div>',
  '<button class="back-to-top" id="backToTop" title="回到顶部">↑</button>',
  '<script>' + renderJs + '</script>',
  '</body>',
  '</html>',
].join('\n');

const outDir = path.join(dir, 'docs');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf-8');
const stats = fs.statSync(path.join(outDir, 'index.html'));
console.log('Done! Size: ' + stats.size + ' bytes (' + (stats.size / 1024).toFixed(1) + ' KB)');
