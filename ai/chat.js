/**
 * chat.js — ops-ref-ai 聊天逻辑 v0.2.0
 * 工程控制论优化：结构化回答 + 分数阈值 + 即时响应 + 反馈机制
 */
var chat = document.getElementById('chat');
var input = document.getElementById('userInput');
var sendBtn = document.getElementById('sendBtn');
var statusEl = document.getElementById('modelStatus');

// 构建关键词索引
function buildIndex() {
  var idx = {};
  for (var i = 0; i < EMBEDDINGS.chunks.length; i++) {
    var words = EMBEDDINGS.chunks[i].keywords || [];
    for (var w = 0; w < words.length; w++) {
      var kw = words[w];
      if (!idx[kw]) idx[kw] = [];
      idx[kw].push(i);
    }
  }
  return idx;
}
var keywordIndex = buildIndex();
statusEl.textContent = '283 知识块就绪';
statusEl.style.color = 'var(--green)';

// 搜索（三级回退）
function search(query) {
  var qWords = query.toLowerCase().replace(/[^\u4e00-\u9fffa-z0-9]/g, ' ').split(/\s+/).filter(function(w) { return w.length > 1; });
  if (qWords.length === 0) return [];

  var scores = {};

  // L1: 精确关键词
  for (var w = 0; w < qWords.length; w++) {
    var matches = keywordIndex[qWords[w]] || [];
    for (var m = 0; m < matches.length; m++) scores[matches[m]] = (scores[matches[m]] || 0) + 1;
  }

  // L2: 模糊子串
  if (Object.keys(scores).length === 0) {
    for (var kw in keywordIndex) {
      for (var w = 0; w < qWords.length; w++) {
        if (kw.indexOf(qWords[w]) >= 0 || qWords[w].indexOf(kw) >= 0) {
          var list = keywordIndex[kw];
          for (var m = 0; m < list.length; m++) scores[list[m]] = (scores[list[m]] || 0) + 1;
        }
      }
    }
  }

  // L3: 全文扫描
  if (Object.keys(scores).length === 0) {
    for (var i = 0; i < EMBEDDINGS.chunks.length; i++) {
      var c = EMBEDDINGS.chunks[i];
      var txt = (c.title + ' ' + c.text + ' ' + c.chapter).toLowerCase();
      for (var w = 0; w < qWords.length; w++) {
        if (txt.indexOf(qWords[w]) >= 0) { scores[i] = 0.5; break; }
      }
    }
  }

  // 排序取前 5，过滤分数 > 0 的
  return Object.entries(scores)
    .sort(function(a, b) { return b[1] - a[1]; })
    .filter(function(e) { return e[1] > 0; })
    .slice(0, 5)
    .map(function(e) { return { chunk: EMBEDDINGS.chunks[parseInt(e[0])], score: e[1] }; });
}

// 收集并排序命令
function collectCommands(results, query) {
  var qWords = query.toLowerCase().replace(/[^\u4e00-\u9fffa-z0-9]/g, ' ').split(/\s+/).filter(function(w) { return w.length > 1; });
  var all = [];

  for (var r = 0; r < results.length; r++) {
    var text = results[r].chunk.text;
    // 命令参考部分优先
    var ci = text.indexOf('命令参考：');
    var cmdText = ci >= 0 ? text.substring(ci) : text;

    var lines = cmdText.split('\n').filter(function(l) {
      l = l.trim();
      return l && /^[a-z]/.test(l) && l.length > 5 && l.length < 400 && !/^[a-z]+$/.test(l);
    });

    for (var c = 0; c < Math.min(lines.length, 6); c++) {
      var cmd = lines[c].trim();
      var score = results[r].score;
      for (var w = 0; w < qWords.length; w++) {
        if (cmd.toLowerCase().indexOf(qWords[w]) >= 0) score += 2;
      }
      all.push({ cmd: cmd, score: score, source: results[r].chunk });
    }
  }

  // 去重排序
  var seen = {};
  var unique = [];
  for (var i = 0; i < all.length; i++) {
    if (!seen[all[i].cmd.substring(0, 60)]) { seen[all[i].cmd.substring(0, 60)] = true; unique.push(all[i]); }
  }
  unique.sort(function(a, b) { return b.score - a.score; });
  return unique.slice(0, 5);
}

// 生成回答（结构化模板）
function generateAnswer(query, results) {
  // 分数阈值：最佳匹配分数 < 1 则视为弱匹配
  if (results.length === 0 || results[0].score < 1) {
    return {
      text: '抱歉，未找到与「' + query + '」相关的明确内容。\n\n💡 建议：\n• 使用具体关键词（如 "df -h 磁盘" 而非 "空间不够"）\n• 用命令名提问（如 "tcpdump 抓包"）\n• 查看完整手册获得更多信息',
      sources: [],
      weak: true
    };
  }

  var cmds = collectCommands(results, query);
  var best = results[0].chunk;
  var lines = [];

  // === 结构化回答模板 ===

  // 标题
  lines.push('📌 ' + best.title);

  // 摘要（100 字以内）
  var summary = best.text.replace(/命令参考：[\s\S]*$/, '').replace(/\n+/g, ' ').trim();
  if (summary.length > 120) summary = summary.substring(0, 120) + '…';
  if (summary) lines.push(summary);

  // 命令
  if (cmds.length > 0) {
    lines.push('');
    lines.push('🔧 相关命令：');
    for (var i = 0; i < cmds.length; i++) {
      lines.push('  ' + cmds[i].cmd);
    }
  }

  // 来源
  lines.push('');
  lines.push('📖 ' + best.chapter);

  // 其他参考
  if (results.length > 1) {
    var refs = results.slice(1, 4).map(function(r) { return r.chunk.title; });
    lines.push('🔗 ' + refs.join(' · '));
  }

  return {
    text: lines.join('\n'),
    sources: results.slice(0, 3).map(function(r) { return r.chunk.chapter + ' > ' + r.chunk.title; }),
    weak: false
  };
}

// 渲染消息
function addMessage(role, text, sources, weak) {
  var div = document.createElement('div');
  div.className = 'msg ' + role + (weak ? ' weak' : '');
  div.textContent = text;

  if (role === 'ai') {
    // 反馈按钮
    var fb = document.createElement('div');
    fb.className = 'feedback';
    fb.innerHTML = '<span class="fb-btn" data-action="up" title="有帮助">👍</span><span class="fb-btn" data-action="down" title="无帮助">👎</span>';
    fb.addEventListener('click', function(e) {
      var btn = e.target.closest('.fb-btn');
      if (!btn) return;
      var action = btn.dataset.action;
      fb.querySelectorAll('.fb-btn').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      // 记录反馈
      try {
        var fbLog = JSON.parse(localStorage.getItem('ops-ai-fb') || '[]');
        fbLog.push({ query: input._lastQuery || '', action: action, time: Date.now() });
        localStorage.setItem('ops-ai-fb', JSON.stringify(fbLog.slice(-50)));
      } catch(e) {}
    });
    div.appendChild(fb);
  }

  if (sources && sources.length) {
    var src = document.createElement('span');
    src.className = 'src';
    src.textContent = '📖 ' + sources.join(' ｜ ');
    div.appendChild(src);
  }

  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;

  var empty = chat.querySelector('.empty');
  if (empty) empty.remove();
}

// 发送（无延迟，即时响应）
function send() {
  var query = input.value.trim();
  if (!query) return;

  addMessage('user', query);
  input._lastQuery = query;
  input.value = '';
  input.focus();

  // 即时搜索和回答（无延迟）
  var results = search(query);
  var answer = generateAnswer(query, results);
  addMessage('ai', answer.text, answer.sources, answer.weak);
}

// 事件
sendBtn.addEventListener('click', send);
input.addEventListener('keydown', function(e) {
  if (e.key === 'Enter') { e.preventDefault(); send(); }
});

// 暗亮切换
var themeBtn = document.getElementById('themeToggle');
function updateTheme() {
  document.documentElement.getAttribute('data-theme') === 'dark' ? '☀' : '🌙';
  themeBtn.textContent = document.documentElement.getAttribute('data-theme') === 'dark' ? '☀' : '🌙';
}
updateTheme();
themeBtn.addEventListener('click', function() {
  var cur = document.documentElement.getAttribute('data-theme');
  var next = cur === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('ops-ref-ai-theme', next);
  updateTheme();
});
var saved = localStorage.getItem('ops-ref-ai-theme');
if (saved) document.documentElement.setAttribute('data-theme', saved);
updateTheme();
