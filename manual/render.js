var MD = DATA_PLACEHOLDER;
var VERSION = 'VERSION_PLACEHOLDER';
var BUILD_DATE = 'BUILD_PLACEHOLDER';

// 拼音字典（858汉字，3.5KB紧凑格式：每个汉字+拼音直接拼接）
var PYDICT_RAW = "PYDICT_PLACEHOLDER";
var PYDICT_MAP = {};

function parsePinyinDict() {
  var map = {};
  var i = 0, s = PYDICT_RAW;
  while (i < s.length) {
    var c = s[i++]; // 汉字
    var py = '';
    while (i < s.length && !(s[i] >= '\u4e00' && s[i] <= '\u9fff')) {
      py += s[i++];
    }
    map[c] = py;
  }
  return map;
}

function toPinyin(text) {
  var r = '';
  for (var i = 0; i < text.length; i++) {
    var c = text[i];
    r += PYDICT_MAP[c] || c;
  }
  return r;
}

// ============================================================
// 工具函数
// ============================================================
function esc(s) {
  if (typeof s !== 'string') return '';
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function inl(s) {
  return esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}

// ============================================================
// Shell 语法高亮（纯 JS，零依赖）
// ============================================================
function highlightShell(raw) {
  var lines = raw.split('\n');
  var out = [];
  for (var i = 0; i < lines.length; i++) {
    var line = esc(lines[i]);
    // 整行注释
    if (/^\s*#/.test(line)) {
      out.push('<span class="syn-cmt">' + line + '</span>');
      continue;
    }
    // 行内标记
    line = line
      // 字符串
      .replace(/(&quot;[^&]*&quot;|&#39;[^&]*&#39;|"[^"]*"|'[^']*')/g, '<span class="syn-str">$1</span>')
      // 长选项 --xxx
      .replace(/(\s|^)(--[a-zA-Z0-9][a-zA-Z0-9_.-]*)/g, '$1<span class="syn-opt">$2</span>')
      // 短选项 -x
      .replace(/(\s|^)(-[a-zA-Z])(?=\s|$)/g, '$1<span class="syn-opt">$2</span>')
      // 管道/重定向/逻辑运算符
      .replace(/(\||&gt;|&gt;&gt;|&lt;|&amp;&amp;|\|\|)/g, '<span class="syn-op">$1</span>')
      // 常见关键字
      .replace(/\b(sudo|kubectl|docker|systemctl|grep|awk|sed|find|curl|wget|ssh|scp|rsync|tar|git|helm|ansible|python|node|npm|pip|apt|yum|dnf|echo|cat|ls|cd|cp|mv|rm|mkdir|chmod|chown|ps|kill|top|df|du|mount|iptables|nft|ss|netstat|tcpdump|ifconfig|ip|route|ping|nslookup|dig|nc|tee|xargs|sort|uniq|cut|tr|wc|head|tail|less|vi|vim|nano|export|source|alias|unalias|env)\b/g, '<span class="syn-kw">$1</span>')
      // 数字
      .replace(/\b(\d+)\b/g, '<span class="syn-num">$1</span>')
      // 行内注释
      .replace(/(\s#\s.*$)/, '<span class="syn-cmt">$1</span>');
    out.push(line);
  }
  return out.join('\n');
}

function highlightCode(code, lang) {
  if (!lang || lang === 'bash' || lang === 'sh' || lang === 'shell' || lang === 'console') {
    return highlightShell(code);
  }
  if (lang === 'yaml' || lang === 'yml') {
    return highlightYaml(code);
  }
  // 其他语言：只转义
  return esc(code);
}

function highlightYaml(raw) {
  var lines = raw.split('\n');
  var out = [];
  for (var i = 0; i < lines.length; i++) {
    var line = esc(lines[i]);
    if (/^\s*#/.test(line)) {
      out.push('<span class="syn-cmt">' + line + '</span>');
    } else {
      line = line
        .replace(/^(\s*)([a-zA-Z_][a-zA-Z0-9_.-]*)(\s*:)/, '$1<span class="syn-kw">$2</span>$3')
        .replace(/(:\s+)(true|false|null|yes|no)(\s*)$/i, '$1<span class="syn-num">$2</span>$3')
        .replace(/(:\s+)(".*?"|'.*?')(\s*)$/, '$1<span class="syn-str">$2</span>$3');
      out.push(line);
    }
  }
  return out.join('\n');
}

// ============================================================
// Markdown 渲染
// ============================================================
function render(md) {
  var html = '';
  var lines = md.split('\n');
  var inCode = false, codeBuf = [], codeLang = '';
  var inTable = false, tableRowNum = 0;
  var inList = false;
  var codeIdx = 0;   // 代码块计数器（用于收藏 key）

  function closeList() {
    if (inList) { html += '</' + inList + '>\n'; inList = false; }
  }

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];

    // Skip old TOC sections
    var headingMatch = line.match(/^(#{1,4})\s+(.+)/);
    if (headingMatch && headingMatch[2].indexOf('目录') >= 0) {
      while (i + 1 < lines.length) {
        i++;
        var nl = lines[i];
        var nm = nl.match(/^(#+)\s/);
        if (nm && nm[1].length <= headingMatch[1].length) { i--; break; }
      }
      continue;
    }

    // Fenced code block
    if (line.indexOf('```') === 0) {
      if (inCode) {
        closeList();
        var raw = codeBuf.join('\n');
        var highlighted = highlightCode(raw, codeLang);
        var firstCmd = raw.split('\n').find(function(l) { return l.trim() && !l.trim().startsWith('#'); }) || '';
        firstCmd = firstCmd.trim().substring(0, 80).replace(/"/g, '&quot;');
        var langLabel = codeLang ? '<span class="code-lang">' + esc(codeLang) + '</span>' : '';
        html += '<div class="code-block">' + langLabel +
          '<span class="star-btn star-btn-cmd" data-key="cmd-' + (codeIdx++) + '" data-text="' + firstCmd + '" title="收藏">☆</span>' +
          '<button class="copy-btn" title="复制">📋</button><pre>' + highlighted + '</pre></div>';
        codeBuf = []; codeLang = ''; inCode = false;
      } else {
        closeList();
        inCode = true;
        codeLang = line.slice(3).trim();
      }
      continue;
    }
    if (inCode) { codeBuf.push(line); continue; }

    // Empty line
    if (line.trim() === '') {
      if (inTable) { html += '</table>\n'; inTable = false; }
      html += '\n';
      continue;
    }

    // Headings
    var match = line.match(/^(#{1,4})\s+(.+)/);
    if (match) {
      if (inTable) { html += '</table>\n'; inTable = false; }
      closeList();
      var level = match[1].length;
      var text = inl(match[2]);
      var anchor = text.replace(/<[^>]+>/g, '').replace(/[^\w\u4e00-\u9fff\-]/g, ' ').trim().toLowerCase().replace(/\s+/g, '-');
      // Anchor permalink icon
      var linkIcon = '<a class="anchor-link" href="#' + anchor + '" title="复制链接">#</a>';
      var starIcon = '<span class="star-btn" data-key="h2-' + anchor + '" data-text="' + text.replace(/"/g, '&quot;') + '" data-anchor="' + anchor + '" title="收藏">☆</span>';
      html += '<h' + level + ' id="' + anchor + '">' + linkIcon + starIcon + text + '</h' + level + '>\n';
      continue;
    }

    // HR
    if (/^[-*_]{3,}\s*$/.test(line)) {
      if (inTable) { html += '</table>\n'; inTable = false; }
      closeList();
      html += '<hr>\n';
      continue;
    }

    // Blockquote
    if (line.indexOf('> ') === 0) {
      if (inTable) { html += '</table>\n'; inTable = false; }
      closeList();
      html += '<blockquote>' + inl(line.slice(2)) + '</blockquote>\n';
      continue;
    }

    // Table
    if (line.indexOf('|') === 0) {
      closeList();
      if (!inTable) { html += '<table>\n'; inTable = true; tableRowNum = 0; }
      var cells = line.split('|').filter(function(c) { return c !== ''; }).map(function(c) { return inl(c.trim()); });
      if (!cells.every(function(c) { return /^[-:]+$/.test(c.replace(/<[^>]+>/g, '')); })) {
        tableRowNum++;
        var cellTag = tableRowNum === 1 ? 'th' : 'td';
        html += '<tr>' + cells.map(function(c) { return '<' + cellTag + '>' + c + '</' + cellTag + '>'; }).join('') + '</tr>\n';
      }
      continue;
    }

    // UL
    var ulMatch = line.match(/^\s*[-*+]\s+(.+)/);
    if (ulMatch) {
      if (inTable) { html += '</table>\n'; inTable = false; }
      if (inList !== 'ul') { closeList(); html += '<ul>\n'; inList = 'ul'; }
      html += '<li>' + inl(ulMatch[1]) + '</li>\n';
      continue;
    }

    // OL
    var olMatch = line.match(/^\s*\d+\.\s+(.+)/);
    if (olMatch) {
      if (inTable) { html += '</table>\n'; inTable = false; }
      if (inList !== 'ol') { closeList(); html += '<ol>\n'; inList = 'ol'; }
      html += '<li>' + inl(olMatch[1]) + '</li>\n';
      continue;
    }

    // Paragraph
    if (inTable) { html += '</table>\n'; inTable = false; }
    closeList();
    html += '<p>' + inl(line) + '</p>\n';
  }

  if (inCode) html += '<div class="code-block"><pre>' + esc(codeBuf.join('\n')) + '</pre></div>';
  if (inTable) html += '</table>\n';
  closeList();
  return html;
}

// ============================================================
// 搜索索引（渲染后构建，供自动补全使用）
// ============================================================
var searchIndex = [];

function buildSearchIndex() {
  searchIndex = [];
  var main = document.getElementById('mainContent');

  // 收集标题
  var headings = main.querySelectorAll('h2, h3');
  headings.forEach(function(h) {
    var section = '';
    var prev = h.previousElementSibling;
    while (prev) {
      if (prev.tagName === 'H2') { section = prev.textContent + ' › ' + section; break; }
      prev = prev.previousElementSibling;
    }
    searchIndex.push({
      type: 'heading',
      text: h.textContent,
      section: section.replace(/ › $/, ''),
      anchor: '#' + h.id,
      pinyin: toPinyin(h.textContent)
    });
  });

  // 收集代码块命令（第一行）
  var codeBlocks = main.querySelectorAll('.code-block pre');
  codeBlocks.forEach(function(pre) {
    var firstLine = pre.textContent.split('\n')[0].trim();
    if (firstLine && firstLine.length > 3 && firstLine.length < 150) {
      var section = '';
      var prev = pre.closest('.code-block').previousElementSibling;
      while (prev) {
        if (prev.tagName === 'H2' || prev.tagName === 'H3') { section = prev.textContent; break; }
        prev = prev.previousElementSibling;
      }
      // 只取命令本身（去掉注释）
      var cmd = firstLine.replace(/#.*$/, '').trim();
      if (cmd && !/^[A-Z\u4e00-\u9fff]/.test(cmd)) {
        searchIndex.push({
          type: 'command',
          text: cmd,
          section: section || '',
          anchor: ''
        });
      }
    }
  });

  // 去重
  var seen = {};
  searchIndex = searchIndex.filter(function(item) {
    var key = item.text + item.section;
    if (seen[key]) return false;
    seen[key] = true;
    return true;
  });
}

// ============================================================
// 自动补全下拉
// ============================================================
var suggestEl = null;
var suggestVisible = false;

function createSuggestEl() {
  if (suggestEl) return;
  suggestEl = document.createElement('ul');
  suggestEl.className = 'suggest-list';
  suggestEl.id = 'suggestList';
  var input = document.getElementById('searchInput');
  input.parentNode.appendChild(suggestEl);
}

function showSuggestions(query) {
  if (!suggestEl) createSuggestEl();
  if (!query || query.length < 1) { hideSuggestions(); return; }

  var q = query.toLowerCase();
  var results = [];

  // 精确前缀匹配优先（原文 + 拼音）
  var exact = [], fuzzy = [];
  for (var i = 0; i < searchIndex.length; i++) {
    var item = searchIndex[i];
    var txt = item.text.toLowerCase();
    var py = (item.pinyin || '').toLowerCase();
    var idx = txt.indexOf(q);
    var pyIdx = py.indexOf(q);
    if (idx === 0 || pyIdx === 0) {
      exact.push(item);
    } else if (idx > 0 || pyIdx > 0 || item.section.toLowerCase().indexOf(q) >= 0) {
      fuzzy.push(item);
    }
  }
  results = exact.concat(fuzzy).slice(0, 10);

  if (results.length === 0) { hideSuggestions(); return; }

  var html = '';
  for (var j = 0; j < results.length; j++) {
    var r = results[j];
    var icon = r.type === 'heading' ? '§' : '>';
    var sec = r.section ? '<span class="suggest-sec">' + esc(r.section) + '</span>' : '';
    html += '<li data-anchor="' + (r.anchor || '') + '" data-type="' + r.type + '"><span class="suggest-icon">' + icon + '</span> ' + esc(r.text) + sec + '</li>';
  }
  suggestEl.innerHTML = html;
  suggestEl.style.display = 'block';
  suggestVisible = true;

  // 点击建议项
  suggestEl.querySelectorAll('li').forEach(function(li) {
    li.addEventListener('mousedown', function(e) {
      e.preventDefault();
      selectSuggestion(li);
    });
  });
}

function hideSuggestions() {
  if (suggestEl) suggestEl.style.display = 'none';
  suggestVisible = false;
}

function selectSuggestion(li) {
  var anchor = li.dataset.anchor;
  var type = li.dataset.type;
  if (anchor) {
    var el = document.getElementById(anchor.slice(1));
    if (el) {
      el.scrollIntoView({behavior: 'smooth', block: 'start'});
    }
  } else if (type === 'command') {
    // 搜索该命令文本
    document.getElementById('searchInput').value = li.textContent.trim();
    doSearch(li.textContent.trim().toLowerCase());
  }
  hideSuggestions();
}

// ============================================================
// 暗/亮模式切换
// ============================================================
function initTheme() {
  var saved = localStorage.getItem('ops-ref-theme');
  if (saved) {
    document.documentElement.setAttribute('data-theme', saved);
  } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
    document.documentElement.setAttribute('data-theme', 'light');
  }
  updateThemeToggle();

  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
      if (!localStorage.getItem('ops-ref-theme')) {
        document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
        updateThemeToggle();
      }
    });
  }
}

function toggleTheme() {
  var current = document.documentElement.getAttribute('data-theme');
  var next = current === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('ops-ref-theme', next);
  updateThemeToggle();
}

function updateThemeToggle() {
  var btn = document.getElementById('themeToggle');
  if (!btn) return;
  var current = document.documentElement.getAttribute('data-theme') || 'dark';
  btn.textContent = current === 'dark' ? '☀' : '🌙';
  btn.title = current === 'dark' ? '切换亮色模式' : '切换暗色模式';
}

// ============================================================
// TOC
// ============================================================
function generateTOC() {
  var headings = document.querySelectorAll('#mainContent h2, #mainContent h3');
  var sidebar = document.getElementById('sidebarToc');
  var group = null, groupId = 0;
  for (var i = 0; i < headings.length; i++) {
    var h = headings[i];
    if (h.tagName === 'H2') {
      group = document.createElement('div');
      group.className = 'toc-group';
      groupId++;
      var header = document.createElement('div');
      header.className = 'toc-group-header';
      header.innerHTML = '<span class="toc-arrow">▼</span><span>' + h.textContent + '</span>';
      header.dataset.groupId = groupId;
      header.dataset.headingId = h.id;
      var body = document.createElement('div');
      body.className = 'toc-group-body';
      body.id = 'toc-body-' + groupId;
      group.appendChild(header);
      group.appendChild(body);
      sidebar.appendChild(group);
    } else if (h.tagName === 'H3' && group) {
      var a = document.createElement('a');
      a.href = '#' + h.id;
      a.className = 'toc-l2';
      a.textContent = h.textContent;
      group.querySelector('.toc-group-body').appendChild(a);
    }
  }
  document.querySelectorAll('.toc-group').forEach(function(g) {
    var body = g.querySelector('.toc-group-body');
    var arrow = g.querySelector('.toc-arrow');
    if (!body.querySelector('a')) arrow.style.visibility = 'hidden';
  });
  sidebar.addEventListener('click', function(e) {
    var header = e.target.closest('.toc-group-header');
    if (!header) return;
    var body = document.getElementById('toc-body-' + header.dataset.groupId);
    if (!body) return;
    if (body.querySelector('a')) {
      body.classList.toggle('collapsed');
      header.querySelector('.toc-arrow').textContent = body.classList.contains('collapsed') ? '▶' : '▼';
    }
    var headingId = header.dataset.headingId;
    if (headingId) {
      var el = document.getElementById(headingId);
      if (el) el.scrollIntoView({behavior: 'smooth', block: 'start'});
    }
    e.preventDefault();
  });
}

function updateActiveTOC() {
  var headings = document.querySelectorAll('#mainContent h2, #mainContent h3');
  var scrollPos = window.scrollY + 100;
  var activeIdx = -1;
  for (var i = 0; i < headings.length; i++) {
    if (headings[i].offsetTop <= scrollPos) activeIdx = i;
  }
  document.querySelectorAll('#sidebarToc .active').forEach(function(el) { el.classList.remove('active'); });
  if (activeIdx >= 0) {
    var activeH = headings[activeIdx];
    if (activeH.tagName === 'H3') {
      var tgt = document.querySelector('#sidebarToc .toc-l2[href="#' + activeH.id + '"]');
      if (tgt) tgt.classList.add('active');
    } else if (activeH.tagName === 'H2') {
      document.querySelectorAll('#sidebarToc .toc-group-header').forEach(function(hdr) {
        if (hdr.dataset.headingId === activeH.id) hdr.classList.add('active');
      });
    }
  }
}

// ============================================================
// Anchor 复制
// ============================================================
function initAnchorLinks() {
  document.addEventListener('click', function(e) {
    var link = e.target.closest('.anchor-link');
    if (!link) return;
    e.preventDefault();
    var url = location.origin + location.pathname + link.getAttribute('href');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function() {
        link.classList.add('copied');
        setTimeout(function() { link.classList.remove('copied'); }, 1200);
      });
    } else {
      // Fallback
      var ta = document.createElement('textarea');
      ta.value = url; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); link.classList.add('copied'); }
      catch(ex) {}
      document.body.removeChild(ta);
      setTimeout(function() { link.classList.remove('copied'); }, 1200);
    }
  });
}

// ============================================================
// Copy button for code blocks
// ============================================================
function initCopyButtons() {
  document.addEventListener('click', function(e) {
    var btn = e.target.closest('.copy-btn');
    if (!btn) return;
    var pre = btn.parentElement.querySelector('pre');
    if (!pre) return;
    var text = pre.textContent;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function() {
        btn.textContent = '✓'; btn.classList.add('copied');
        setTimeout(function() { btn.textContent = '📋'; btn.classList.remove('copied'); }, 1500);
      });
    } else {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); btn.textContent = '✓'; btn.classList.add('copied'); }
      catch(ex) { btn.textContent = '✗'; }
      document.body.removeChild(ta);
      setTimeout(function() { btn.textContent = '📋'; btn.classList.remove('copied'); }, 1500);
    }
  });
}

// ============================================================
// 收藏功能
// ============================================================
var favorites = {};

function loadFavorites() {
  try { favorites = JSON.parse(localStorage.getItem('ops-ref-fav') || '{}'); } catch(e) { favorites = {}; }
}

function saveFavorites() {
  try { localStorage.setItem('ops-ref-fav', JSON.stringify(favorites)); } catch(e) {}
}

function toggleFavorite(key, text, anchor, el) {
  if (favorites[key]) {
    delete favorites[key];
    if (el) { el.textContent = '☆'; el.classList.remove('starred'); }
  } else {
    favorites[key] = { text: text, anchor: anchor, time: Date.now() };
    if (el) { el.textContent = '★'; el.classList.add('starred'); }
  }
  saveFavorites();
  buildFavoritesList();
}

function buildFavoritesList() {
  var list = document.getElementById('favoritesList');
  if (!list) return;
  var entries = Object.values(favorites).sort(function(a,b) { return b.time - a.time; });
  if (entries.length === 0) {
    list.innerHTML = '<div class="fav-empty">暂无收藏</div>';
    return;
  }
  var html = '';
  for (var i = 0; i < entries.length; i++) {
    var e = entries[i];
    html += '<a href="#' + e.anchor + '" class="fav-item" title="' + esc(e.text) + '">★ ' + esc(e.text.substring(0, 50)) + '</a>';
  }
  list.innerHTML = html;
}

function initFavorites() {
  loadFavorites();
  // 更新已收藏项的星标显示
  for (var key in favorites) {
    var el = document.querySelector('.star-btn[data-key="' + key + '"]');
    if (el) { el.textContent = '★'; el.classList.add('starred'); }
  }
  buildFavoritesList();

  // 星标点击事件委托
  document.addEventListener('click', function(e) {
    var btn = e.target.closest('.star-btn');
    if (!btn) return;
    e.preventDefault();
    var key = btn.dataset.key;
    var text = btn.dataset.text || '';
    var anchor = btn.dataset.anchor || '';
    toggleFavorite(key, text, anchor, btn);
  });
}
var activeDomain = '';

var DOMAIN_MAP = {
  linux:  ['linux', 'linux 基础', 'linux 故障'],
  kubernetes: ['kubernetes', 'k8s'],
  openstack: ['openstack'],
  ansible: ['ansible'],
  docker: ['docker']
};
var DOMAIN_NAMES = {linux:'Linux', kubernetes:'K8s', openstack:'OpenStack', ansible:'Ansible', docker:'Docker'};

function mapDomain(h2Text) {
  var t = h2Text.toLowerCase();
  for (var d in DOMAIN_MAP) {
    for (var i = 0; i < DOMAIN_MAP[d].length; i++) {
      if (t.indexOf(DOMAIN_MAP[d][i]) >= 0) return d;
    }
  }
  return '';
}

function getNodeDomain(node) {
  var el = node.parentElement;
  while (el && el.id !== 'mainContent') {
    if (el.dataset && el.dataset.domain) return el.dataset.domain;
    el = el.parentElement;
  }
  return '';
}

function initDomainFilter() {
  var headings = document.querySelectorAll('#mainContent h1, #mainContent h2');
  headings.forEach(function(h) {
    var domain = mapDomain(h.textContent);
    if (!domain) return;
    h.setAttribute('data-domain', domain);
    var el = h;
    while (el) {
      el = el.nextElementSibling;
      if (!el || el.tagName === 'H1' || el.tagName === 'H2') break;
      el.setAttribute('data-domain', domain);
    }
  });
}

function updateMatchStats(domainHits) {
  var el = document.getElementById('matchCount');
  if (!domainHits) { el.textContent = ''; return; }
  var total = 0, parts = [];
  for (var d in domainHits) {
    total += domainHits[d];
    parts.push((DOMAIN_NAMES[d] || d) + ':' + domainHits[d]);
  }
  var text = total + ' 条匹配';
  if (parts.length > 1) text += '  (' + parts.join(' ') + ')';
  el.textContent = text;
}

function setDomainFilter(domain, chip) {
  activeDomain = domain;
  document.querySelectorAll('.filter-chip').forEach(function(c) { c.classList.remove('active'); });
  if (chip) chip.classList.add('active');
  var q = document.getElementById('searchInput').value.trim();
  if (q) { doSearch(q); return; }
  // 无搜索词：清除高亮，滚动到该域第一个章节
  clearSearchHighlights();
  updateMatchStats(null);
  if (domain) {
    var h = document.querySelector('#mainContent h1[data-domain="' + domain + '"], #mainContent h2[data-domain="' + domain + '"]');
    if (h) h.scrollIntoView({behavior: 'smooth', block: 'start'});
  }
}

// ============================================================
// 页内搜索高亮 (AND + 域过滤)
// ============================================================
var searchMatches = [], searchIdx = -1;

function clearSearchHighlights() {
  document.querySelectorAll('.search-hl').forEach(function(el) {
    var parent = el.parentNode;
    parent.replaceChild(document.createTextNode(el.textContent), el);
    parent.normalize();
  });
}

function doSearch(q) {
  clearSearchHighlights();
  searchMatches = []; searchIdx = -1;

  if (!q) { updateMatchStats(null); return; }

  // AND 搜索：空格分隔 = 全部关键词必须匹配
  var keywords = q.toLowerCase().split(/\s+/).filter(function(k) { return k.length > 0; });
  // 检测是否纯拼音（全小写 ASCII，无汉字）
  var isPinyin = /^[a-z\s]+$/.test(q);

  var walker = document.createTreeWalker(
    document.getElementById('mainContent'),
    NodeFilter.SHOW_TEXT, null, false
  );
  var nodes = [];
  while (walker.nextNode()) {
    var parent = walker.currentNode.parentElement;
    if (parent.closest('#suggestList') || parent.closest('.anchor-link') || parent.closest('.filter-chips')) continue;
    if (parent.tagName === 'CODE' && !parent.closest('pre')) continue;
    if (activeDomain && getNodeDomain(walker.currentNode) !== activeDomain) continue;
    nodes.push(walker.currentNode);
  }

  var domainHits = {};

  for (var n = 0; n < nodes.length; n++) {
    var node = nodes[n];
    var text = node.textContent;
    var lower = text.toLowerCase();
    // 拼音匹配：用预计算的 data-py 属性
    var pyLower = '';
    if (isPinyin && node.parentElement.dataset && node.parentElement.dataset.py) {
      pyLower = node.parentElement.dataset.py;
    }

    // AND 检查：所有关键词必须在原文或拼音中出现
    var allMatch = true;
    for (var kw = 0; kw < keywords.length; kw++) {
      var inText = lower.indexOf(keywords[kw]) >= 0;
      var inPy = pyLower && pyLower.indexOf(keywords[kw]) >= 0;
      if (!inText && !inPy) { allMatch = false; break; }
    }
    if (!allMatch) continue;

    // 高亮匹配（只高亮原文中的匹配，拼音中的不标）
    var frag = document.createDocumentFragment();
    var lastIdx = 0;
    var marks = [];

    while (true) {
      var earliestPos = text.length, earliestKw = -1;
      for (var kw = 0; kw < keywords.length; kw++) {
        var pos = lower.indexOf(keywords[kw], lastIdx);
        if (pos !== -1 && pos < earliestPos) { earliestPos = pos; earliestKw = kw; }
      }
      if (earliestKw === -1) break;

      if (earliestPos > lastIdx) frag.appendChild(document.createTextNode(text.slice(lastIdx, earliestPos)));
      var mark = document.createElement('mark');
      mark.className = 'search-hl';
      mark.textContent = text.slice(earliestPos, earliestPos + keywords[earliestKw].length);
      frag.appendChild(mark);
      marks.push(mark);
      lastIdx = earliestPos + keywords[earliestKw].length;
    }

    if (marks.length > 0) {
      if (lastIdx < text.length) frag.appendChild(document.createTextNode(text.slice(lastIdx)));
      node.parentNode.replaceChild(frag, node);
      searchMatches = searchMatches.concat(marks);
      var d = getNodeDomain(node) || 'other';
      domainHits[d] = (domainHits[d] || 0) + marks.length;
    }
  }

  updateMatchStats(domainHits);
  if (searchMatches.length > 0) {
    searchIdx = 0;
    searchMatches[0].scrollIntoView({behavior: 'smooth', block: 'center'});
    searchMatches[0].classList.add('search-active');
  }
}

function goToMatch(dir) {
  if (searchMatches.length === 0) return;
  if (searchIdx >= 0 && searchMatches[searchIdx]) {
    searchMatches[searchIdx].classList.remove('search-active');
  }
  searchIdx += dir;
  if (searchIdx < 0) searchIdx = searchMatches.length - 1;
  if (searchIdx >= searchMatches.length) searchIdx = 0;
  searchMatches[searchIdx].scrollIntoView({behavior: 'smooth', block: 'center'});
  searchMatches[searchIdx].classList.add('search-active');
}

// ============================================================
// 命令统计
// ============================================================
function updateCommandCount() {
  var codeBlocks = document.querySelectorAll('#mainContent .code-block pre');
  var cmdCount = 0;
  codeBlocks.forEach(function(pre) {
    var text = pre.textContent.trim();
    if (text) cmdCount += text.split('\n').filter(function(l) {
      return l.trim() && !/^\s*#/.test(l) && !/^[A-Z\u4e00-\u9fff]/.test(l.trim());
    }).length;
  });
  var el = document.getElementById('cmdCount');
  if (el) el.textContent = cmdCount;
}

// 预计算拼音属性（用于 doSearch 的拼音匹配）
function buildPinyinAttrs() {
  var walker = document.createTreeWalker(
    document.getElementById('mainContent'),
    NodeFilter.SHOW_TEXT, null, false
  );
  while (walker.nextNode()) {
    var node = walker.currentNode;
    var text = node.textContent;
    // 只对含中文的文本节点计算拼音
    if (!/[\u4e00-\u9fff]/.test(text)) continue;
    var parent = node.parentElement;
    // 每个父元素只设置一次（合并子文本节点的拼音）
    if (parent.dataset && parent.dataset.py) continue;
    // 计算整个元素的拼音
    var py = toPinyin(parent.textContent).toLowerCase().replace(/[^a-z0-9]/g, '');
    if (parent.dataset) parent.dataset.py = py;
  }
}

// ============================================================
// 初始化
// ============================================================
var mainEl = document.getElementById('mainContent');
mainEl.insertAdjacentHTML('beforeend', render(MD));

PYDICT_MAP = parsePinyinDict();
generateTOC();
updateActiveTOC();
buildSearchIndex();
initDomainFilter();
initFavorites();
buildPinyinAttrs();
initTheme();
initAnchorLinks();
initCopyButtons();
updateCommandCount();

// Back to top
var topBtn = document.getElementById('backToTop');
window.addEventListener('scroll', function() {
  topBtn.classList.toggle('visible', window.scrollY > 300);
  updateActiveTOC();
});
topBtn.addEventListener('click', function() {
  window.scrollTo({top: 0, behavior: 'smooth'});
});

// Mobile hamburger menu
var hamburger = document.getElementById('hamburgerBtn');
var sidebar = document.querySelector('.sidebar');
var overlay = document.getElementById('sidebarOverlay');

function openSidebar() { sidebar.classList.add('open'); overlay.classList.add('show'); }
function closeSidebar() { sidebar.classList.remove('open'); overlay.classList.remove('show'); }

hamburger.addEventListener('click', function(e) { e.stopPropagation(); openSidebar(); });
overlay.addEventListener('click', closeSidebar);

// Close sidebar when a TOC link is clicked (mobile nav)
document.getElementById('sidebarToc').addEventListener('click', function(e) {
  if (e.target.tagName === 'A' || e.target.closest('.toc-group-header')) {
    var id = (e.target.getAttribute('href') || '').slice(1);
    if (id) {
      var el = document.getElementById(id);
      if (el) el.scrollIntoView({behavior: 'smooth', block: 'start'});
    }
    if (window.innerWidth <= 768) setTimeout(closeSidebar, 200);
  }
});

// Search input: autocomplete + page highlight
var searchInput = document.getElementById('searchInput');
searchInput.addEventListener('input', function() {
  var val = this.value.trim();
  showSuggestions(val);
  // 输入时不清除高亮，只在按 Enter 时搜索
});
searchInput.addEventListener('keydown', function(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    if (suggestVisible) {
      // 有建议时，选第一个
      var first = suggestEl.querySelector('li');
      if (first) { selectSuggestion(first); return; }
    }
    // 没有建议时 → 页内搜索
    doSearch(this.value.trim().toLowerCase());
  }
  if (e.key === 'Escape') {
    hideSuggestions();
  }
  if (e.key === 'ArrowDown' && suggestVisible) {
    e.preventDefault();
    var items = suggestEl.querySelectorAll('li');
    var active = suggestEl.querySelector('li.active');
    if (active) {
      active.classList.remove('active');
      var next = active.nextElementSibling || items[0];
      next.classList.add('active');
    } else {
      items[0].classList.add('active');
    }
  }
  if (e.key === 'ArrowUp' && suggestVisible) {
    e.preventDefault();
    var items = suggestEl.querySelectorAll('li');
    var active = suggestEl.querySelector('li.active');
    if (active) {
      active.classList.remove('active');
      var prev = active.previousElementSibling || items[items.length - 1];
      prev.classList.add('active');
    } else {
      items[items.length - 1].classList.add('active');
    }
  }
});

// 点击外部关闭建议
document.addEventListener('click', function(e) {
  if (!e.target.closest('#searchInput') && !e.target.closest('#suggestList')) {
    hideSuggestions();
  }
});

// `/` 快捷键聚焦搜索框
document.addEventListener('keydown', function(e) {
  if (e.key === '/' && document.activeElement !== searchInput &&
      document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
    e.preventDefault();
    searchInput.focus();
    searchInput.select();
  }
  if (e.key === 'Escape' && document.activeElement === searchInput) {
    searchInput.blur();
    hideSuggestions();
  }
});

// Theme toggle button
document.getElementById('themeToggle').addEventListener('click', toggleTheme);

// Hash navigation
function scrollToHash() {
  var id = location.hash.slice(1);
  if (id) {
    var el = document.getElementById(id);
    if (el) setTimeout(function() { el.scrollIntoView({behavior: 'smooth'}); }, 50);
  }
}
window.addEventListener('hashchange', scrollToHash);
window.addEventListener('load', scrollToHash);
