## 帮助

> 本节包含 ops-ref 的使用说明、扩展示例和常见问题，方便新用户快速上手。

### 如何添加新章节

```bash
# 1. 创建新文件（序号插在 04-openstack.md 与 06-architecture.md 之间）
touch 05-xxx.md

# 2. 编辑 build.sh 追加文件名
#    CHAPTERS=(
#      ...
#      "05-xxx.md"
#      "06-architecture.md"
#      "07-help.md"
#    )

# 3. 重新构建
bash build.sh
node build_html.js
```

文件格式要求：

| 要求 | 说明 |
|------|------|
| 文件名 | `{序号}-{英文简短描述}.md`（技术章节 01-05，06 架构、07 帮助固定） |
| 标题 | 第一行用 `## 章节名`（H2，对应侧边栏分组） |
| 内容 | 正文用 `###`（H3，对应侧边栏子条目） |
| 构建 | 需注册到 `build.sh` 的 `CHAPTERS` 数组 |

### 如何升级版本

```bash
# 查看当前版本
cat VERSION

# 升级（v1.0.0 → v1.1.0）
echo "v1.1.0" > VERSION

# 追加更新日志
echo "- 新增 XXX 内容" >> CHANGELOG.md

# 重新构建
bash build.sh
node build_html.js
```

版本号规则：`MAJOR.MINOR.PATCH`
- **MAJOR** — 结构或内容大重构
- **MINOR** — 新增章节或重要命令
- **PATCH** — 小修正、格式调整、bug 修复

### 如何使用

**离线环境（服务器上查问题）：**

```bash
# 推荐：使用交互脚本（菜单式浏览 + 搜索）
./ops                     # 进入交互菜单
./ops list                # 列出所有章节
./ops search tcpdump      # 全文搜索
./ops show 05             # 查看 Ansible 章节

# 传统方式：直接查看 markdown 源文件
less 05-ansible.md

# 搜索关键词
grep -i "tcpdump\|netstat" index.md

# 复制到服务器使用
scp -r ops-ref/ user@server:/usr/local/share/

# 在服务器上设置别名（推荐）
echo 'alias ops="/usr/local/share/ops-ref/ops"' >> ~/.bashrc
source ~/.bashrc
```

**本地浏览器阅读：**

```
直接双击打开 docs/index.html
支持：全文搜索 / 侧边栏导航 / 暗色主题
```

### 文件结构

```
ops-ref/
├── VERSION                        # 版本号（唯一数据源）
├── CHANGELOG.md                   # 更新日志
├── README.md                      # 项目总说明
├── build.sh                       # 构建脚本（合并 .md）
├── build_html.js                  # HTML 生成脚本
├── render.js                      # 浏览器端渲染（TOC + 搜索）
├── ops                            # [新增] 服务器端交互脚本（ssh + grep + less）
│
├── 01-linux-basics.md             # Linux 基础命令
├── 02-linux-troubleshooting.md    # Linux 故障排查
├── 03-kubernetes.md               # Kubernetes
├── 04-openstack.md                # OpenStack
├── 05-ansible.md                  # Ansible 自动化运维
├── 06-architecture.md             # 项目架构
├── 07-help.md                     # 使用帮助（本文件）
│
├── index.md                       # [自动生成] 合并完整版
└── docs/
    └── index.html                 # [自动生成] 离线 HTML
```

> 提示：`index.md` 和 `docs/index.html` 由构建脚本自动生成，**不要手动编辑**。所有修改应编辑对应的源 `.md` 文件后重新构建。
