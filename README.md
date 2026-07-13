<p align="center">
  <h1 align="center">🐧 ops-ref</h1>
  <p align="center">
    <a href="README.md">English</a> | <a href="README_zh.md">中文</a>
  </p>
  <p align="center">
    <strong>Offline Ops Command Reference</strong> — 13 chapters, 7500+ commands<br>
    <strong>+ AI Q&A Assistant</strong> — LiteRT.js ready, runs entirely in your browser
  </p>
  <p align="center">
    <em>Zero dependencies · Single HTML file · No server · No internet · No API keys</em>
  </p>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.5.1-blue" alt="version">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="license">
  <img src="https://img.shields.io/badge/size-280KB-lightgrey" alt="size">
  <img src="https://img.shields.io/badge/chapters-13-orange" alt="chapters">
  <img src="https://img.shields.io/badge/LiteRT.js-ready-purple" alt="LiteRT.js">
</p>

<!-- SEO: GitHub indexes the first ~500 characters of README for search ranking -->
> **Linux command reference, Kubernetes cheatsheet, Docker & DevOps toolkit, offline documentation, LiteRT.js edge AI** — ops-ref is a **zero-dependency offline ops command cheatsheet** covering Linux troubleshooting, system administration, container orchestration, database management, security hardening, Nginx web server, Git version control, Prometheus monitoring, and Ansible automation. Built as a **single HTML file** (~280KB) with **dark mode, mobile responsive, pinyin search, favorites, and a CLI terminal tool**. The companion AI Q&A module uses keyword retrieval (LiteRT.js model integration on roadmap) for natural language ops questions — all running **completely offline in your browser with no server, no API keys, and no internet required**.

---

## 🤔 Why This Exists

You SSH into a broken server at 3 AM. No internet. No Chinese input method. No documentation site. You need the right command **now**.

**ops-ref** is the tool you wish you had.

## ⚡ What Makes It Different

| | Typical Docs Site | ops-ref |
|---|:---:|:---:|
| **Works offline** | ❌ Needs CDN/internet | ✅ Browser opens a single HTML file |
| **No dependencies** | ❌ npm, node_modules, frameworks | ✅ Pure vanilla JS + CSS |
| **Size** | ❌ 100MB+ for doc sites | ✅ **Under 300KB** |
| **Terminal access** | ❌ Web only | ✅ CLI: `ops search tcpdump` |
| **Pinyin search** | ❌ Requires Chinese IME | ✅ Type `wangluo` → finds `网络` |
| **AI Q&A (coming)** | ❌ ChatGPT needs API key + internet | ✅ **LiteRT.js** runs Gemma locally in browser |
| **Mobile** | ❌ Desktop-only | ✅ Responsive + hamburger menu |

## 🧠 The LiteRT.js Vision

> **Phase 1 (done):** Keyword-based retrieval — ask questions, get relevant commands
>
> **Phase 2 (roadmap):** LiteRT.js + Gemma integration — **true offline AI**
> 
> Ask "磁盘满了怎么办" → browser runs Gemma locally via WebGPU → generates step-by-step answer referencing ops-ref content. **No GPU server, no API key, no internet.** Your browser IS the AI engine.

ops-ref is architected for this: knowledge chunks, structured embeddings, and a clean chat UI are already in place. LiteRT.js model integration is the final piece.

## 🚀 Quick Start

```bash
git clone https://github.com/GitHubName0/ops-ref.git

# 📖 Command reference — open and search
open ops-ref/manual/docs/index.html

# 🤖 AI Q&A — ask "how to fix 502 error"
open ops-ref/ai/docs/index.html

# 💻 Terminal search
./ops-ref/manual/ops search tcpdump
```

**That's it.** No `npm install`. No `docker run`. No server. Just a browser.

## 📚 What's Inside (13 Chapters)

| Chapter | Lines | What You'll Find |
|---------|:-----:|------------------|
| Linux Basics | 742 | File ops, grep/sed/awk, permissions, processes, networking, SSH, Docker basics |
| Troubleshooting | 382 | CPU/memory/disk/network emergency — what to do when things break |
| Kubernetes | 526 | Pods, Deployments, Services, Ingress, RBAC, debugging CrashLoopBackOff |
| OpenStack | 769 | Nova, Neutron, Cinder, Glance, Keystone — VM creation to network debugging |
| Ansible | 1701 | Inventory, Playbooks, Roles, Vault, Galaxy — full automation reference |
| Docker | 532 | Images, Dockerfile, Compose, networking, storage, security, cleanup |
| Monitoring | 604 | Prometheus, PromQL, Grafana, Alertmanager, Node Exporter, Blackbox |
| Databases | 729 | MySQL, PostgreSQL, Redis — backup, replication, slow queries, OOM |
| Security | 502 | SSH hardening, SELinux, auditd, fail2ban, AIDE, incident response checklist |
| Nginx | 443 | Reverse proxy, load balancing, SSL, rewrite rules, performance tuning |
| Git | 450 | Branch, merge, rebase, cherry-pick, bisect, reflog — 5 daily workflows |
| Architecture | 54 | Project design: pipeline architecture, design principles |
| Help | 112 | Usage guide, extending chapters, version management |

## 🎯 Features

### Command Reference
- **Full-text AND search** — `docker network` finds both words
- **Pinyin search** — `neicun` → `内存` (858-char dictionary, 3.5KB embedded)
- **Domain filter** — one click to search only Kubernetes, or only Docker
- **Syntax highlighting** — 6-color for bash/shell/yaml
- **Dark/light mode** — follows system, manual toggle, localStorage
- **Favorites** — star commands and sections, saved across sessions
- **Anchor sharing** — click `#` to copy section URL
- **Mobile responsive** — hamburger menu, touch-optimized copy buttons
- **CLI tool** — `ops search/list/show/check` in terminal

### AI Q&A
- **Natural language** — "磁盘满了怎么办" → returns `df -h`, `du -sh`, cleanup commands
- **Structured answers** — title → summary → commands → sources
- **3-level fallback** — keyword → fuzzy → full-text scan
- **Score threshold** — weak matches return "not found" instead of noise
- **Feedback** — 👍/👎 stored for future improvement
- **LiteRT.js architecture** — embeddings format ready for model integration

## 🏗 Architecture

```
Source .md files (13 chapters)
    │
    ├─── build.sh ──→ index.md ──→ build_html.js ──→ manual/docs/index.html
    │                                                (280KB, self-contained)
    │
    └─── generate_embeddings.js ──→ embeddings.json
                 │                        │
                 └── build_html.js ←──────┘
                          │
                          └──→ ai/docs/index.html
                               (257KB, self-contained)

All processing at BUILD TIME. Runtime = pure browser. Zero network.
```

## 📦 Repo Structure

```
ops-ref/
├── README.md
├── manual/                    # Command Reference
│   ├── 0*.md                  # Source chapters
│   ├── build.sh / build_html.js / render.js
│   ├── ops                    # CLI tool
│   └── docs/index.html        # Output
└── ai/                        # AI Q&A
    ├── generate_embeddings.js # Reads ../manual/*.md
    ├── chat.js / build_html.js
    └── docs/index.html        # Output
```

## 🔧 Build It Yourself

```bash
cd manual && bash build.sh && node build_html.js
cd ai && bash build.sh
```

## 🛣 Roadmap

- [x] 13 chapters, 7500+ lines
- [x] Full offline search with pinyin
- [x] AI Q&A with keyword retrieval
- [x] Dark/light theme, mobile, favorites, CLI
- [ ] **LiteRT.js + Gemma integration** — true offline browser AI
- [ ] Docker image for one-command deployment
- [ ] CI/CD auto-build on push

## ⚠️ Disclaimer

Commands are for reference only. Verify in a test environment before using in production. The authors assume no liability.

## 📄 License

MIT

---

<p align="center">
  <sub>Built by ops engineers, for ops engineers. <strong>No cloud. No BS. Just commands.</strong></sub>
</p>
