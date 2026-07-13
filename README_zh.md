<p align="center">
  <h1 align="center">🐧 ops-ref</h1>
  <p align="center">
    <a href="README.md">English</a> | <a href="README_zh.md">中文</a>
  </p>
  <p align="center">
    <strong>离线运维命令速查手册</strong> — 13 章节，7500+ 条命令<br>
    <strong>+ AI 运维问答助手</strong> — LiteRT.js 已就绪，完全在浏览器中运行
  </p>
  <p align="center">
    <em>零依赖 · 单 HTML 文件 · 无需服务器 · 无需联网 · 无需 API 密钥</em>
  </p>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/版本-1.5.1-blue" alt="version">
  <img src="https://img.shields.io/badge/许可-MIT-green" alt="license">
  <img src="https://img.shields.io/badge/大小-280KB-lightgrey" alt="size">
  <img src="https://img.shields.io/badge/章节-13-orange" alt="chapters">
  <img src="https://img.shields.io/badge/LiteRT.js-ready-purple" alt="LiteRT.js">
</p>

<!-- SEO: GitHub 搜索索引会抓取 README 前 500 字符 -->
> **Linux 命令参考、Kubernetes 速查表、Docker 与 DevOps 工具箱、离线文档、LiteRT.js 边缘 AI** — ops-ref 是一个**零依赖的离线运维命令速查手册**，覆盖 Linux 排障、系统管理、容器编排、数据库管理、安全加固、Nginx Web 服务器、Git 版本控制、Prometheus 监控和 Ansible 自动化。构建为**单个 HTML 文件**（约 280KB），支持**暗色/亮色模式、移动端适配、拼音搜索、个人收藏和 CLI 终端工具**。配套的 AI 问答模块使用关键词检索（LiteRT.js 模型集成已在路线图中），实现自然语言运维问答——全部**在浏览器中完全离线运行，无需服务器、无需 API 密钥、无需联网**。

---

## 🤔 为什么做这个

凌晨 3 点，你 SSH 到一台崩了的服务器。没有网络，没有中文输入法，没有任何文档。磁盘快满了，你想不起来 `du` 的参数。

你需要的是**一个浏览器打开就能看的离线命令手册**。

这就是 ops-ref 存在的理由。

## ⚡ 和传统文档站有什么不同

| 对比维度 | 传统文档站 | ops-ref |
|---------|:---:|:---:|
| **离线可用** | ❌ 需要 CDN/联网 | ✅ 浏览器直接打开 HTML 文件 |
| **依赖** | ❌ npm、node_modules、框架 | ✅ 纯原生 JS + CSS |
| **体积** | ❌ 文档站动辄 100MB+ | ✅ **不到 300KB** |
| **终端访问** | ❌ 仅 Web | ✅ CLI：`ops search tcpdump` |
| **拼音搜索** | ❌ 需要中文输入法 | ✅ 输入 `wangluo` 找到「网络」 |
| **AI 问答（即将）** | ❌ ChatGPT 需要 API 密钥+联网 | ✅ LiteRT.js 在浏览器本地跑 Gemma |
| **移动端** | ❌ 大多仅桌面端 | ✅ 响应式 + 汉堡菜单 |

## 🧠 LiteRT.js 愿景

> **第一阶段（已完成）：** 关键词检索 — 用自然语言提问，返回相关命令
>
> **第二阶段（路线图中）：** LiteRT.js + Gemma 集成 — **真正的离线 AI**
>
> 问「磁盘满了怎么办」→ 浏览器通过 WebGPU 在本地运行 Gemma → 生成分步答案并引用 ops-ref 内容。**无需 GPU 服务器、无需 API 密钥、无需联网。** 你的浏览器就是 AI 引擎。

ops-ref 的架构已经为此准备好了：知识块、结构化嵌入和聊天界面都已就位，LiteRT.js 模型集成是最后一块拼图。

## 🚀 快速开始

```bash
git clone https://github.com/GitHubName0/ops-ref.git

# 📖 命令手册 — 浏览器打开即可搜索
open ops-ref/manual/docs/index.html

# 🤖 AI 问答 — 问「502 错误怎么排查」
open ops-ref/ai/docs/index.html

# 💻 终端搜索
./ops-ref/manual/ops search tcpdump
```

**就这么简单。** 不需要 `npm install`、不需要 `docker run`、不需要服务器。只需要一个浏览器。

## 📚 内容覆盖（13 章节）

| 章节 | 行数 | 内容 |
|------|:---:|------|
| Linux 基础 | 742 | 文件操作、grep/sed/awk、权限、进程、网络、SSH、Docker 基础 |
| Linux 排障 | 382 | CPU/内存/磁盘/网络应急 — 出问题时该敲什么 |
| Kubernetes | 526 | Pod、Deployment、Service、Ingress、RBAC、CrashLoopBackOff 排查 |
| OpenStack | 769 | Nova、Neutron、Cinder、Glance、Keystone — 从创建虚拟机到网络排查 |
| Ansible | 1701 | Inventory、Playbook、Roles、Vault、Galaxy — 完整自动化参考 |
| Docker | 532 | 镜像、Dockerfile、Compose、网络、存储、安全、清理 |
| 监控告警 | 604 | Prometheus、PromQL、Grafana、Alertmanager、Node Exporter、Blackbox |
| 数据库速查 | 729 | MySQL、PostgreSQL、Redis — 备份恢复、主从复制、慢查询、OOM |
| 安全加固 | 502 | SSH 加固、SELinux、Auditd、Fail2ban、AIDE、入侵排查清单 |
| Nginx | 443 | 反向代理、负载均衡、SSL、Rewrite 规则、性能调优 |
| Git | 450 | 分支、合并、rebase、cherry-pick、bisect、reflog — 5 个日常场景 |
| 项目架构 | 54 | 管道架构、设计原则 |
| 使用帮助 | 112 | 使用指南、扩展章节、版本管理 |

## 🎯 功能亮点

### 命令手册
- **全文 AND 搜索** — `docker network` 找到同时含两个词的行
- **拼音搜索** — `neicun` → `内存`（858 汉字字典，3.5KB 嵌入）
- **域过滤** — 一键只看 Kubernetes、只看 Docker
- **语法高亮** — bash/shell/yaml 6 色着色
- **暗色/亮色模式** — 跟随系统 + 手动切换，localStorage 记忆
- **个人收藏** — ⭐ 收藏命令和章节，跨会话保留
- **锚点分享** — 点击 `#` 复制段落链接
- **移动端适配** — 汉堡菜单、触摸优化复制按钮
- **CLI 工具** — 终端里 `ops search/list/show/check`

### AI 问答
- **自然语言提问** — 「磁盘满了怎么办」→ 返回 `df -h`、`du -sh`、清理命令
- **结构化回答** — 标题 → 摘要 → 命令 → 来源
- **三级检索回退** — 精确关键词 → 模糊子串 → 全文扫描
- **分数阈值** — 低分匹配不展示，避免答非所问
- **用户反馈** — 👍/👎 存入 localStorage，用于后续改进
- **LiteRT.js 架构** — 嵌入格式已为模型集成预留接口

## 🏗 架构

```
源文件 .md（13 章节）
    │
    ├─── build.sh ──→ index.md ──→ build_html.js ──→ manual/docs/index.html
    │                                                （280KB，完全自包含）
    │
    └─── generate_embeddings.js ──→ embeddings.json
                 │                        │
                 └── build_html.js ←──────┘
                          │
                          └──→ ai/docs/index.html
                               （257KB，完全自包含）

所有处理在构建时完成。运行时就是纯浏览器。零网络请求。
```

## 📦 目录结构

```
ops-ref/
├── README.md / README_zh.md
├── manual/                    # 命令参考
│   ├── 0*.md                  # 源章节
│   ├── build.sh / build_html.js / render.js
│   ├── ops                    # CLI 工具
│   └── docs/index.html        # 产物
└── ai/                        # AI 问答
    ├── generate_embeddings.js # 读取 ../manual/*.md
    ├── chat.js / build_html.js
    └── docs/index.html        # 产物
```

## 🔧 自行构建

```bash
cd manual && bash build.sh && node build_html.js
cd ai && bash build.sh
```

## 🛣 路线图

- [x] 13 章节，7500+ 条命令
- [x] 全离线搜索 + 拼音
- [x] AI 问答 + 关键词检索
- [x] 暗/亮主题、移动端、收藏、CLI
- [ ] **LiteRT.js + Gemma 集成** — 真正的离线浏览器 AI
- [ ] Docker 镜像，一键部署
- [ ] CI/CD 推送自动构建

## ⚠️ 免责声明

命令仅供参考，生产环境请先在测试环境验证后再使用。作者不承担任何责任。

## 📄 开源许可

MIT

---

<p align="center">
  <sub>运维人写给运维人。<strong>不上云。不废话。只有命令。</strong></sub>
</p>
