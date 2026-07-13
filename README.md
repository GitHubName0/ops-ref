<p align="center">
  <h1 align="center">🐧 ops-ref</h1>
  <p align="center"><strong>Offline Ops Command Reference & AI Q&A Toolkit</strong></p>
  <p align="center">Zero dependencies · Single HTML file · Works offline · No server needed</p>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.5.1-blue" alt="version">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="license">
  <img src="https://img.shields.io/badge/size-280KB-lightgrey" alt="size">
  <img src="https://img.shields.io/badge/chapters-13-orange" alt="chapters">
</p>

---

## What is ops-ref?

Two tools, one mission — **make ops work faster, even offline.**

| Tool | What it does | Size |
|------|-------------|------|
| **manual/** | Offline command reference — Linux, K8s, Docker, Nginx, Git, databases, security, monitoring, Ansible, OpenStack | 280KB |
| **ai/** | Offline AI Q&A — ask natural language questions, get relevant commands and explanations | 257KB |

Both are **single HTML files** with zero external dependencies. Open in any browser, no internet needed.

## ✨ Why ops-ref?

| | Typical Approach | ops-ref |
|---|-----------------|---------|
| **Offline** | ❌ Needs npm install, CDN, or server | ✅ Browser opens the file directly |
| **Dependencies** | ❌ node_modules, frameworks | ✅ Pure vanilla JS + CSS |
| **Size** | ❌ 100MB+ for documentation sites | ✅ Under 300KB |
| **Search** | ❌ Server-side, needs backend | ✅ Client-side: fuzzy + pinyin + domain filter |
| **Mobile** | ❌ Usually desktop-only | ✅ Responsive, hamburger menu |
| **CLI** | ❌ Web only | ✅ Terminal tool: `ops search tcpdump` |
| **AI Q&A** | ❌ Needs API key + internet | ✅ Local keyword retrieval (LiteRT.js ready) |

## 🚀 Quick Start

```bash
# Clone
git clone https://github.com/GitHubName0/ops-ref.git

# Open command reference
open ops-ref/manual/docs/index.html

# Open AI Q&A
open ops-ref/ai/docs/index.html

# Terminal search
./ops-ref/manual/ops search tcpdump
```

## 📚 Coverage (13 Chapters, 7500+ Lines)

| # | Chapter | Lines | Topics |
|---|---------|-------|--------|
| 01 | Linux Basics | 742 | File ops, text processing, permissions, processes, networking, packages, SSH |
| 02 | Troubleshooting | 382 | CPU/memory/disk/network emergency scenarios |
| 03 | Kubernetes | 526 | Pod, Deployment, Service, Ingress, RBAC, troubleshooting |
| 04 | OpenStack | 769 | Nova, Neutron, Cinder, Glance, Keystone, Heat |
| 05 | Ansible | 1701 | Inventory, Playbooks, Roles, Vault, Galaxy, troubleshooting |
| 08 | Docker | 532 | Images, Dockerfile, Compose, networking, storage, security |
| 09 | Monitoring | 604 | Prometheus, PromQL, Grafana, Alertmanager, Node Exporter |
| 10 | Databases | 729 | MySQL, PostgreSQL, Redis — backup, replication, troubleshooting |
| 11 | Security | 502 | SSH hardening, SELinux, auditd, fail2ban, incident response |
| 12 | Nginx | 443 | Reverse proxy, load balancing, SSL, rewrite, performance tuning |
| 13 | Git | 450 | Branch, merge, rebase, cherry-pick, bisect, reflog |

## 🎯 Key Features

### Command Reference (manual/)

- **Full-text search** with AND logic — `docker network` finds lines with both words
- **Pinyin search** — type `wangluo` to find `网络` when you don't have a Chinese input method
- **Domain filter** — click "K8s" to search only Kubernetes content
- **Syntax highlighting** — 6-color code highlighting for bash/yaml/shell
- **Dark/light mode** — follows system preference, manual toggle
- **Favorites** — star commands and sections, saved in localStorage
- **Mobile responsive** — hamburger menu, touch-friendly copy buttons
- **CLI tool** — `ops search/list/show/check` for terminal use

### AI Q&A (ai/)

- **Natural language questions** — "how to fix 502 error" returns nginx proxy troubleshooting
- **Structured answers** — title → summary → commands → source reference
- **3-level search fallback** — exact keyword → fuzzy substring → full text scan
- **Score threshold** — weak matches return "not found" rather than irrelevant content
- **Feedback mechanism** — 👍/👎 buttons stored in localStorage for improvement tracking

## 🏗 Architecture

```
Source (.md files)
    │
    ├── build.sh ──→ index.md ──→ build_html.js ──→ manual/docs/index.html
    │                                              (280KB single-file app)
    │
    └── generate_embeddings.js ──→ embeddings.json
                │
                └── build_html.js ──→ ai/docs/index.html
                                      (257KB single-file app)

All processing happens at BUILD TIME.
Runtime is pure browser: no server, no API, no network.
```

## 📦 Project Structure

```
ops-ref/
├── README.md
├── manual/                        # Command Reference
│   ├── 0*.md                      # 13 chapter source files
│   ├── chapters.sh                # Chapter configuration
│   ├── build.sh                   # Build: merge .md → index.md
│   ├── build_html.js              # Build: index.md → index.html
│   ├── render.js                  # Runtime: markdown renderer + search engine
│   ├── ops                        # CLI: terminal search tool
│   └── docs/index.html            # Output: self-contained offline page
└── ai/                            # AI Q&A Assistant
    ├── generate_embeddings.js     # Build: split manual/*.md → knowledge chunks
    ├── build_html.js              # Build: embeddings + chat UI → index.html
    ├── chat.js                    # Runtime: 3-level search + answer generation
    ├── build.sh                   # Build: orchestrate both steps
    └── docs/index.html            # Output: self-contained AI Q&A page
```

## 🔧 Build

```bash
# Build command reference
cd manual && bash build.sh && node build_html.js

# Build AI Q&A (depends on manual content)
cd ai && bash build.sh
```

## 🛣 Roadmap

- [x] Core chapters (Linux, K8s, OpenStack, Ansible, Docker, monitoring, DB, security, Nginx, Git)
- [x] Full offline search with pinyin support
- [x] Dark/light theme, mobile responsive, favorites
- [x] AI Q&A with keyword retrieval
- [ ] LiteRT.js integration for true local LLM Q&A
- [ ] Docker image for one-command deployment
- [ ] CI/CD auto-build on content updates

## 📄 License

MIT — use it, modify it, share it. Commands come with no warranty — verify before running in production.

---

<p align="center">
  <sub>Built for ops engineers who work in trenches. No cloud required.</sub>
</p>
