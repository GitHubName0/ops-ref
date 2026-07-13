# ============================================================
# chapters.sh — Ops Ref 章节定义（单一数据源）
# 被 ops 和 build.sh 共同引用。
# 格式: "文件名:显示名称"
# 新增章节时只改这里，再加对应的 .md 文件即可。
# 注意：06-architecture.md 和 07-help.md 固定为最后两个。
# ============================================================

CHAPTERS=(
  "01-linux-basics.md:Linux 基础命令"
  "02-linux-troubleshooting.md:Linux 故障排查"
  "03-kubernetes.md:Kubernetes"
  "04-openstack.md:OpenStack"
  "05-ansible.md:Ansible 自动化运维"
  "08-docker.md:Docker 容器运维"
  "09-monitoring.md:监控告警"
  "10-database.md:数据库速查"
  "11-security.md:安全加固"
  "12-nginx.md:Nginx/Web 服务器"
  "13-git.md:Git 版本控制"
  "06-architecture.md:项目架构"
  "07-help.md:使用帮助"
)
