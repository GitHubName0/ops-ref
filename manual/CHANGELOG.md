# Changelog

## v1.5.1 (2026-07-13)

### 新增
- **数据库速查章节**（10-database.md，729 行）— MySQL 用户权限/备份恢复（mysqldump+XtraBackup+mysqlpump）/主从复制/慢查询；PostgreSQL 权限体系/pg_dump+pg_basebackup/流复制/VACUUM；Redis 5 种数据结构/持久化/主从哨兵集群/内存管理；4 个通用排障场景
- **安全加固章节**（11-security.md，502 行）— SSH 加固/Fail2ban/系统加固(sysctl+SUID)/SELinux+AppArmor/Auditd 审计/密码策略 PAM/AIDE 文件完整性/Lynis 扫描/入侵排查 10 步清单/应急响应流程
- **Nginx/Web 服务器章节**（12-nginx.md，443 行）— 安装配置/反向代理/负载均衡/SSL+HTTPS/Rewrite/访问控制/日志排障 8 种常见错误速查/性能调优
- **Git 版本控制章节**（13-git.md，450 行）— 基础操作/分支管理/reset 三模式对比/revert+reflog/stash/tag/cherry-pick/rebase -i/bisect/submodule/worktree/5 个实战场景
- **拼音搜索**：858 汉字拼音字典（3.5KB）嵌入，搜索框输入拼音自动匹配中文（如 `wangluo`→网络、`neicun`→内存），autocomplete 建议 + 页内高亮双层生效，不干扰命令搜索

### 优化
- **域过滤滚动**：点击 Linux/K8s/Docker 等标签，无搜索词时自动滚到对应章节
- **域过滤覆盖 H1**：修复 Linux 和 K8s 标签点击无反应（initDomainFilter 从只查 h2 改为查 h1+h2）
- **安全声明**：H1 标题下方红色免责横幅 + 过滤标签下橙色提示条
- **版本信息合并**：header 版本标签显示 `v1.5.1 · 2026-07-13`，footer 精简
- **章节数**：从 9 章扩展到 13 章（+数据库/安全/Nginx/Git），总计 7583 行

## v1.4.0 (2026-07-13)

### 新增
- **Docker 容器运维章节**（08-docker.md，532 行）
- **监控告警章节**（09-monitoring.md，604 行）— Prometheus 配置/TSDB/PromQL 常用查询/Node Exporter/告警规则/Alertmanager 路由/Grafana 操作/Blackbox Exporter/6 个排障场景速查

### 优化
- **搜索增强**：AND 多关键词（空格分隔）、按技术域过滤（全部/Linux/K8s/OpenStack/Ansible/Docker）、匹配分布统计（"25条 (K8s:18 Docker:7)"）、`/` 快捷键聚焦搜索框、`Esc` 退出
- **移动端适配**：汉堡菜单（☰）展开侧边栏 + 遮罩层、触屏复制按钮常显、表格/代码块横向滚动、过滤标签横滑、480px/768px 双断点响应式

## v1.3.0 (2026-07-13)

### Bug 修复 (CLI)
- 修复 `search_all` 中 subshell 管道导致搜索计数永远为 0 的 bug（`echo | while` → `while <<<`）
- 修复交互菜单每次循环 `clear` 清空 scrollback 历史的问题
- 修复 `read -p` 提示中嵌入 ANSI 颜色码在某些终端渲染乱码的问题（改为 `printf` + `read` 分离）

### Bug 修复 (前端)
- 修复 `<ol>`/`<ul>` 列表项裸 `<li>` 无父标签导致浏览器渲染错乱
- 修复 Footer 在 `.layout` flex 容器内非全宽显示 → 移到 layout 外
- 修复页面 `<title>` 为拼音 → 改为中文 "运维命令速查手册"
- 修复 `li>code` 无背景色样式 → 统一 `p>code, li>code`
- 搜索改为覆盖 `<pre>` 代码块（命令可搜索），仅跳过行内 `<code>`

### 新增 (CLI)
- `check` / `diagnose` 自诊断子命令
- `--version` / `-V` 版本号查看
- `chapters.sh` — CHAPTERS 单一定义文件
- `METRICS.md` — 工程控制论驱动的量化指标定义

### 新增 (前端)
- 代码块复制按钮 — 悬停显示 📋，点击复制，1.5s 后恢复
- 代码块语言标签 — 左上角显示 bash/yaml/python 等
- 搜索键盘提示 — `<kbd>Enter</kbd>` 下一个 · `<kbd>Shift+Enter</kbd>` 上一个
- **搜索自动补全** — 输入时下拉建议菜单，匹配标题和命令，支持 ↑↓ 选择、Enter 跳转
- **语法高亮** — 代码块 6 色着色：注释灰、字符串蓝、选项绿、关键字红、数字蓝、操作符紫
- **暗/亮模式** — ☀/🌙 按钮一键切换，自动跟随系统偏好，localStorage 记忆
- **锚点分享** — hover 标题显示 # 链接，点击复制完整 URL 到剪贴板
- **命令统计** — header 显示收录命令数

### 优化
- `build.sh` 改为 source chapters.sh，新增章节只需改一处
- 无匹配搜索增加拼写提示
- 搜索成功时显示匹配总数

## v1.2.0 (2026-07-13)

### 新增
- Ansible 自动化运维手册（07-ansible.md）— 完整涵盖 Inventory、Ad-hoc、Playbook、核心模块（文件/命令/包管理/服务/容器等）、变量与 Facts、Jinja2 模板、条件循环、Roles、Vault 加密、Tags/Limit、及排障方案
- Ansible 附录：常用模块速查表、命令速查表、推荐项目文件结构

## v1.1.0 (2026-07-12)

### 新增
- tcpdump 高阶组合命令（离线抓包、hex/ASCII 打印、读写 pcap）
- 搜索改为高亮模式（不隐藏不匹配内容，支持 Enter/Shift+Enter 跳转）
- 版本体系：VERSION + CHANGELOG + 页面版本徽章 + 页脚
- 软件架构章节（05-architecture.md）— 管道+SSG 架构图
- 帮助章节（06-help.md）— 使用说明、扩展示例、FAQ
- 页脚署名：风吟 & LP

### 优化
- VERSION 作为唯一数据源，构建时自动注入
- README 增加版本规范和扩充步骤说明

## v1.0.0 (2026-07-12)

### 初始版本
- Linux 基础运维命令（文件/文本/权限/进程/网络/包管理）
- Linux 故障排查（CPU/内存/磁盘/网络/应急场景）
- Kubernetes 运维手册（Pod/Deployment/Service/排障）
- OpenStack 运维手册（Nova/Neutron/Cinder/排障）
- 离线 HTML 版本，支持全文搜索 + TOC 导航
