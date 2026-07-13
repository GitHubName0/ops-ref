# 我写了一个离线运维命令手册，280KB 单文件，断网也能用

## 凌晨 3 点，你 SSH 到一台崩了的服务器

没有网络。没有中文输入法。没有任何文档。磁盘快满了，你想不起 `du` 的参数。

你需要的不是谷歌，不是一个 npm 包，不是一个 Docker 镜像。你需要的是一个**浏览器打开就能看的离线命令手册**。

这就是我写 **ops-ref** 的原因。

---

## 它是什么

一个**零依赖的离线运维命令速查工具**，13 个章节，7500+ 条命令，覆盖：

| 章节 | 内容 |
|------|------|
| Linux 基础 | 文件操作、文本处理、权限、进程、网络、包管理、SSH |
| Linux 排障 | CPU 飙高、内存泄漏、磁盘满、网络不通 |
| Kubernetes | Pod/Deployment/Service/Ingress/RBAC/排障 |
| Docker | 镜像构建、Dockerfile、Compose、网络、存储、安全 |
| Nginx | 反向代理、负载均衡、SSL、Rewrite、性能调优 |
| 数据库 | MySQL、PostgreSQL、Redis — 备份恢复、主从复制 |
| 监控 | Prometheus + PromQL + Grafana + Alertmanager |
| 安全 | SSH 加固、SELinux、Auditd、Fail2ban、入侵排查 |
| Git | 分支管理、撤销回滚、rebase、cherry-pick、bisect |
| Ansible、OpenStack | 自动化运维、云平台管理 |

## 几个让我自己都意外的功能

### 1. 拼音搜索
服务器上没有中文输入法？输入 `wangluo` 直接匹配 `网络`。858 个汉字的拼音字典嵌在 JS 里，才 3.5KB。

### 2. 域过滤
搜 `restart`，点一下 `Docker` 标签，只看 Docker 相关的结果。再点 `K8s`，只看 K8s。

### 3. 语法高亮 + 一键复制
所有命令代码块 6 色高亮（注释灰、参数绿、关键字红），hover 显示复制按钮。

### 4. 移动端适配
手机打开自动变成汉堡菜单布局，表格横向滚动，复制按钮常显。

### 5. 个人收藏
点 ⭐ 收藏常用命令，侧边栏顶部永久显示，localStorage 存储。

### 6. AI 问答（beta）
项目里还有一个 `ai/` 子项目——用自然语言问运维问题，本地关键词检索返回命令。下一步计划接入 LiteRT.js + Gemma，实现**完全离线浏览器端 AI**。

## 怎么用

```bash
git clone https://github.com/GitHubName0/ops-ref.git
# 浏览器直接打开
open ops-ref/manual/docs/index.html
# 或者在终端里搜
./ops-ref/manual/ops search tcpdump
```

不用 `npm install`、不用 `docker run`、不用联网。一个 280KB 的 HTML 文件，浏览器打开就能用。

## 技术栈

- 纯原生 JS + CSS，零框架
- Markdown → 构建脚本 → 单 HTML 文件
- 搜索、高亮、过滤、收藏全是浏览器端
- 暗/亮双主题，CSS 变量驱动
- LiteRT.js 架构已预留

## 最后

这个项目从 v1.0 到 v1.5.1 迭代了 6 轮，每轮都按工程控制论的方法来：定义指标 → 修复 → 验证 → 记录。从一个 bash 脚本的 bug 修起，一路做到拼音搜索、AI 问答。

如果你也是运维/后端/全栈，遇到半夜排障没网没文档的情况，试试 ops-ref。如果觉得有用，给个 Star ⭐。

GitHub: https://github.com/GitHubName0/ops-ref
