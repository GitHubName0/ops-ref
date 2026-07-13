## 软件架构

> 本节描述 ops-ref 项目自身的架构设计，方便后续维护者理解整体结构。

### 架构模式：管道 + SSG

```
                   管道阶段一                       管道阶段二
   ┌─────────────┐    build.sh     ┌──────────┐   build_html.js   ┌──────────────┐
   │ 01-*.md 源码 │ ─────────────→ │ index.md │ ────────────────→ │ docs/index   │
   │ 02-*.md     │   cat 顺序合并   │ 完整版    │   读取 VERSION +   │ .html        │
   │ 03-*.md     │                 │ Markdown │   注入 render.js   │ 完整离线文档  │
   │ 04-*.md     │                 │          │                   │ (单文件无依赖) │
   │ 05-*.md     │                 │          │                   │              │
   │ 06-*.md ◄── │                 │          │                   │              │
   └─────────────┘                 └──────────┘                   └──────────────┘
        ▲                               ▲                              ▲
        │                               │                              │
   数据源（Model）                  合并视图                      渲染产物（View）
```

### 各层职责

| 文件 | 模式角色 | 职责 |
|------|---------|------|
| `01-*.md` ~ `05-*.md` | **数据源** | 按技术域分拆的原始内容，各文件单一职责（`06-*` 架构、`07-*` 帮助为项目元文档） |
| `VERSION` | **元数据** | 版本号的唯一数据源，构建时被读取 |
| `build.sh` | **管道调度器** | 读取 CHAPTERS 数组依次合并 → `index.md` |
| `build_html.js` | **构建器** | 读取 VERSION + `index.md` → 注入 HTML 模板 |
| `render.js` | **运行时渲染器** | 浏览器端 Markdown → DOM、TOC 生成、搜索高亮 |
| `docs/index.html` | **最终产物** | 自包含单文件，零外部依赖，离线可用 |

### 设计原则

- **管道单向流**：数据只能往前走，每个阶段只管一件事
- **源码即文档**：`.md` 是唯一内容源，构建产物可丢弃重生成
- **离线优先**：最终产物是一个 HTML 文件，浏览器打开就能用
- **无框架依赖**：零 npm 包、零 node_modules、纯 JS + CSS 内联

### 章节文件命名规则

```
{序号}-{技术域}.md

01-linux-basics.md              # Linux 基础命令
02-linux-troubleshooting.md     # Linux 故障排查
03-kubernetes.md                # Kubernetes
04-openstack.md                 # OpenStack
05-ansible.md                   # Ansible 自动化运维
06-architecture.md              # 项目架构（本文件）
07-help.md                      # 使用帮助
```

新增技术栈时，按顺序编号并添加到 `build.sh` 的 `CHAPTERS` 数组即可。
