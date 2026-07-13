## 监控告警

> 适用场景：Prometheus + Grafana + Alertmanager 搭建、指标查询、告警配置、故障定位
> 前置阅读：[01-linux-basics.md](01-linux-basics.md)

---

### 1. Prometheus 基础

```bash
# 启动（Docker 方式，最常用）
docker run -d --name prometheus --restart=always \
  -p 9090:9090 \
  -v $(pwd)/prometheus.yml:/etc/prometheus/prometheus.yml \
  -v prometheus_data:/prometheus \
  prom/prometheus

# 启动（二进制方式）
./prometheus --config.file=prometheus.yml --storage.tsdb.path=/data/prometheus \
  --storage.tsdb.retention.time=15d --web.listen-address=:9090 &

# 热重载配置（不中断服务）
curl -X POST http://localhost:9090/-/reload
kill -HUP $(pgrep prometheus)

# 检查配置
promtool check config prometheus.yml                    # 语法检查
promtool check rules rules/*.yml                        # 规则检查

# 查看状态
curl http://localhost:9090/api/v1/status/config          # 当前配置
curl http://localhost:9090/api/v1/targets                # 抓取目标状态
curl http://localhost:9090/api/v1/rules                  # 告警/记录规则
curl http://localhost:9090/api/v1/status/tsdb            # 存储统计
curl http://localhost:9090/metrics                       # Prometheus 自身指标

# TSDB 管理
promtool tsdb list /data/prometheus                      # 列出数据块
promtool tsdb dump /data/prometheus                      # 导出数据（调试用）
```

**prometheus.yml 核心配置**

```yaml
global:
  scrape_interval: 15s              # 抓取间隔
  evaluation_interval: 15s          # 规则评估间隔
  external_labels:
    cluster: prod
    region: cn-east

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']

rule_files:
  - 'rules/*.yml'

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'node'
    static_configs:
      - targets: ['node1:9100', 'node2:9100', 'node3:9100']
        labels:
          env: production
          role: app

  - job_name: 'kubernetes-pods'
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
        action: replace
        target_label: __metrics_path__
        regex: (.+)

  - job_name: 'docker'
    static_configs:
      - targets: ['localhost:9323']   # Docker 内置 metrics
```

---

### 2. PromQL 常用查询

```promql
# === 基础运算 ===
# 瞬时向量（当前值）
node_cpu_seconds_total{mode="idle"}

# 范围向量（5分钟窗口）
node_cpu_seconds_total{mode="idle"}[5m]

# 速率（每秒增长率，最常用）
rate(node_cpu_seconds_total{mode="idle"}[5m])
irate(node_cpu_seconds_total{mode="idle"}[5m])       # 更灵敏的瞬时速率

# 增长量
increase(node_network_receive_bytes_total[1h])        # 1小时增长量

# === CPU ===
# CPU 使用率（所有模式汇总）
100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# 按实例分组的 CPU 使用率
100 - (avg by(instance)(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# Per-mode CPU
sum by(mode)(rate(node_cpu_seconds_total[5m]))

# === 内存 ===
# 内存使用率
(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100

# 内存使用量（GB）
(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / 1024^3

# === 磁盘 ===
# 磁盘使用率
(node_filesystem_size_bytes - node_filesystem_free_bytes) / node_filesystem_size_bytes * 100

# 磁盘使用率 > 80% 的挂载点
(node_filesystem_size_bytes - node_filesystem_free_bytes) / node_filesystem_size_bytes * 100 > 80

# 预测磁盘满时间（基于最近1小时速率）
predict_linear(node_filesystem_free_bytes[1h], 3600 * 24) < 0

# 磁盘 IO 使用率
rate(node_disk_io_time_seconds_total[5m]) * 100

# === 网络 ===
# 网络接收速率（MB/s）
rate(node_network_receive_bytes_total[5m]) / 1024 / 1024

# 网络错误包
rate(node_network_receive_errors_total[5m])

# TCP 连接数
node_netstat_Tcp_CurrEstab

# === 服务状态 ===
# 目标 UP/DOWN
up{job="node"}                                           # 1=UP, 0=DOWN
count by(job)(up == 0)                                  # 各 job 的 DOWN 数量

# 抓取耗时
rate(prometheus_target_interval_length_seconds_count[5m])

# === 聚合与排序 ===
# Top 5 CPU 使用的实例
topk(5, 100 - (avg by(instance)(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100))

# 按环境分组的平均内存
avg by(env)(node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes * 100)

# === 时间函数 ===
# 过去1小时的平均值
avg_over_time(node_load1[1h])

# 过去1小时最大值
max_over_time(node_load1[1h])

# 同比上周
rate(node_cpu_seconds_total{mode="idle"}[5m]) /
rate(node_cpu_seconds_total{mode="idle"}[5m] offset 1w)

# === Histogram（P50/P90/P99）===
# 请求延迟分位数
histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))

# Apdex 得分
(sum(rate(http_request_duration_seconds_bucket{le="0.1"}[5m])) +
 sum(rate(http_request_duration_seconds_bucket{le="1.0"}[5m]))) / 2 /
 sum(rate(http_request_duration_seconds_count[5m]))
```

---

### 3. Node Exporter（系统指标采集）

```bash
# 安装运行
wget https://github.com/prometheus/node_exporter/releases/download/v1.7.0/node_exporter-1.7.0.linux-amd64.tar.gz
tar xzf node_exporter-*.tar.gz
./node_exporter --web.listen-address=:9100 &

# Docker 方式
docker run -d --name node-exporter --restart=always --net host \
  -v /proc:/host/proc:ro -v /sys:/host/sys:ro -v /:/rootfs:ro \
  prom/node-exporter \
  --path.procfs=/host/proc --path.sysfs=/host/sys --path.rootfs=/rootfs

# 验证指标
curl http://localhost:9100/metrics | head -30

# 常用 collector（默认启用大部分）
./node_exporter --collector.disable-defaults \
  --collector.cpu --collector.meminfo --collector.diskstats \
  --collector.netdev --collector.filesystem --collector.loadavg

# 特定 collector
--collector.systemd                          # systemd 服务状态
--collector.textfile.directory=/var/lib/node_exporter  # 自定义指标目录
--collector.processes                        # 进程统计
```

**常用 Node Exporter 指标速查**

| 指标前缀 | 含义 | 关键标签 |
|---------|------|---------|
| `node_cpu_seconds_total` | CPU 时间 | `mode`: idle/iowait/system/user |
| `node_memory_MemTotal_bytes` | 总内存 | — |
| `node_memory_MemAvailable_bytes` | 可用内存 | — |
| `node_filesystem_size_bytes` | 文件系统大小 | `mountpoint`, `fstype` |
| `node_filesystem_free_bytes` | 文件系统剩余 | `mountpoint` |
| `node_disk_read_bytes_total` | 磁盘读取量 | `device` |
| `node_network_receive_bytes_total` | 网络接收量 | `device` |
| `node_load1` / `load5` / `load15` | 系统负载 | — |
| `node_netstat_Tcp_CurrEstab` | TCP 连接数 | — |
| `node_time_seconds` | 系统时间 | — |

---

### 4. 告警规则

```yaml
# rules/node.yml
groups:
  - name: node_alerts
    rules:
      # 实例宕机
      - alert: InstanceDown
        expr: up == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "实例 {{ $labels.instance }} 宕机"
          description: "{{ $labels.instance }} 已超过 2 分钟无响应"

      # CPU 使用率 > 80%
      - alert: HighCPUUsage
        expr: 100 - (avg by(instance)(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "CPU 使用率 > 80% ({{ $labels.instance }})"
          description: "当前值: {{ $value | humanize }}%"

      # 内存 > 90%
      - alert: HighMemoryUsage
        expr: (1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100 > 90
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "内存使用率 > 90% ({{ $labels.instance }})"

      # 磁盘 > 85%（排除 tmpfs）
      - alert: HighDiskUsage
        expr: (node_filesystem_size_bytes{fstype!="tmpfs"} - node_filesystem_free_bytes{fstype!="tmpfs"})
              / node_filesystem_size_bytes{fstype!="tmpfs"} * 100 > 85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "磁盘使用率 > 85% ({{ $labels.instance }}:{{ $labels.mountpoint }})"

      # 磁盘预测 4 小时内满
      - alert: DiskWillFillIn4Hours
        expr: predict_linear(node_filesystem_free_bytes{fstype!="tmpfs"}[1h], 4*3600) < 0
        for: 10m
        labels:
          severity: critical
        annotations:
          summary: "磁盘预计 4 小时内满 ({{ $labels.instance }}:{{ $labels.mountpoint }})"

      # Load 过高
      - alert: HighLoad
        expr: node_load1 / count without(cpu,mode)(node_cpu_seconds_total{mode="idle"}) > 2
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "系统 Load 过高 ({{ $labels.instance }})"

      # 重启检测
      - alert: HostRebooted
        expr: node_time_seconds - node_boot_time_seconds < 300
        labels:
          severity: info
        annotations:
          summary: "{{ $labels.instance }} 最近重启过"

      # 证书过期（需要 blackbox_exporter）
      - alert: SSLCertExpiring
        expr: probe_ssl_earliest_cert_expiry - time() < 86400 * 7
        for: 1h
        labels:
          severity: warning
        annotations:
          summary: "SSL 证书将在 7 天内过期"
```

---

### 5. Alertmanager

```bash
# 启动
docker run -d --name alertmanager -p 9093:9093 \
  -v $(pwd)/alertmanager.yml:/etc/alertmanager/alertmanager.yml \
  prom/alertmanager

# 查看静默
amtool silence list                       # 列出静默
amtool silence add alertname=HighCPUUsage --duration=2h --comment="维护窗口"
amtool silence expire <silence-id>        # 过期静默

# 查看当前告警
curl http://localhost:9093/api/v2/alerts | python3 -m json.tool
```

**alertmanager.yml**

```yaml
global:
  resolve_timeout: 5m
  smtp_smarthost: 'smtp.example.com:587'
  smtp_from: 'alertmanager@example.com'
  smtp_auth_username: 'alertmanager@example.com'
  smtp_auth_password: 'password'

# 告警路由树
route:
  group_by: ['alertname', 'severity']     # 分组字段
  group_wait: 10s                          # 首次等待（收集同组告警）
  group_interval: 5m                       # 同组后续告警间隔
  repeat_interval: 4h                      # 重复发送间隔
  receiver: 'default'
  routes:
    - match:
        severity: critical
      receiver: 'critical-pager'
      continue: true                       # 继续匹配下级路由
    - match_re:
        job: '.*'
      receiver: 'default'

# 接收器
receivers:
  - name: 'default'
    email_configs:
      - to: 'ops-team@example.com'
        headers:
          Subject: '[{{ .Status | toUpper }}] {{ .GroupLabels.alertname }}'
    webhook_configs:
      - url: 'https://hooks.example.com/alert'
        send_resolved: true

  - name: 'critical-pager'
    webhook_configs:
      - url: 'https://pager.example.com/api/alert'
        max_alerts: 1                      # 每次只发一条
```

**接收器类型**

| 类型 | 用途 | 关键配置 |
|------|------|---------|
| `email_configs` | 邮件 | `to`, `headers` |
| `webhook_configs` | HTTP 回调（钉钉/飞书/企微） | `url`, `send_resolved` |
| `slack_configs` | Slack | `api_url`, `channel` |
| `pagerduty_configs` | PagerDuty | `routing_key` |
| `opsgenie_configs` | OpsGenie | `api_key` |
| `wechat_configs` | 企业微信 | `corp_id`, `to_party` |

---

### 6. Grafana

```bash
# 启动
docker run -d --name grafana -p 3000:3000 \
  -v grafana_data:/var/lib/grafana \
  grafana/grafana

# 默认账号 admin/admin，首次登录强制改密码

# API 操作
# 导出 Dashboard JSON
curl -s -u admin:password http://localhost:3000/api/dashboards/uid/<uid> | python3 -m json.tool

# 导入 Dashboard
curl -X POST http://localhost:3000/api/dashboards/db \
  -u admin:password -H 'Content-Type: application/json' \
  -d '{"dashboard": {...}, "overwrite": true}'

# 列出所有 Dashboard
curl -s -u admin:password http://localhost:3000/api/search | python3 -m json.tool

# 常用环境变量
# GF_SECURITY_ADMIN_PASSWORD=secret    # 初始密码
# GF_SMTP_ENABLED=true                 # 邮件告警
# GF_SERVER_ROOT_URL=https://grafana.example.com
```

**Grafana 常用操作**

| 操作 | 路径/方法 |
|------|----------|
| 添加 Prometheus 数据源 | Configuration → Data Sources → Prometheus → URL: `http://prometheus:9090` |
| 创建 Dashboard | Dashboards → New → Add panel → 输入 PromQL |
| 变量查询 | Dashboard Settings → Variables → Query: `label_values(up, instance)` |
| 导入社区面板 | Dashboards → Import → 输入 ID（如 Node Exporter: `1860`） |
| 告警通道 | Alerting → Contact points → New（Email/Webhook） |
| 通知模板 | Alerting → Notification templates |

**Panel 常用 PromQL 模板**

```
# 单值面板（当前值）
node_memory_MemAvailable_bytes / 1024^3

# 时间序列（趋势图）
rate(node_network_receive_bytes_total{device="eth0"}[5m])

# 表格（多实例对比）
avg by(instance)(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100

# 仪表盘（使用率百分比）
100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# 热力图（延迟分布，需要 histogram）
sum by(le)(rate(http_request_duration_seconds_bucket[5m]))
```

---

### 7. Blackbox Exporter（外部探测）

```bash
# 启动
docker run -d --name blackbox -p 9115:9115 prom/blackbox-exporter

# HTTP 探测
curl "http://localhost:9115/probe?target=https://example.com&module=http_2xx"

# TCP 探测
curl "http://localhost:9115/probe?target=example.com:443&module=tcp_connect"

# ICMP 探测（需要 NET_RAW 权限）
curl "http://localhost:9115/probe?target=8.8.8.8&module=icmp"
```

**Prometheus 抓取配置**

```yaml
scrape_configs:
  - job_name: 'blackbox'
    metrics_path: /probe
    params:
      module: [http_2xx]
    static_configs:
      - targets:
          - https://example.com
          - https://api.example.com/health
          - https://admin.example.com
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: blackbox:9115
```

**常用探测指标**

| 指标 | 含义 |
|------|------|
| `probe_success` | 探测是否成功 (1/0) |
| `probe_duration_seconds` | 探测耗时 |
| `probe_http_status_code` | HTTP 状态码 |
| `probe_ssl_earliest_cert_expiry` | SSL 证书最早过期时间 |
| `probe_dns_lookup_time_seconds` | DNS 解析耗时 |
| `probe_tcp_connect_time_seconds` | TCP 连接耗时 |

---

### 8. 常用监控场景速查

**场景1：排查 CPU 飙高**

```promql
# 1. 确认是否真的高
100 - (avg by(instance)(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# 2. 看是哪个 mode
sum by(mode)(rate(node_cpu_seconds_total{instance="problem-host"}[5m]))

# 3. 对比历史（是否突增）
rate(node_cpu_seconds_total{mode="idle"}[5m]) /
rate(node_cpu_seconds_total{mode="idle"}[5m] offset 1h)

# 4. 上机器查进程 → 见 02-linux-troubleshooting.md
ssh problem-host
top -o %CPU
```

**场景2：排查内存泄漏**

```promql
# 1. 看趋势（最近6小时）
node_memory_MemAvailable_bytes{instance="problem-host"}

# 2. 对比同时段
node_memory_MemAvailable_bytes{instance="problem-host"} /
node_memory_MemAvailable_bytes{instance="problem-host"} offset 24h

# 3. 看是否有 OOM Kill
increase(node_vmstat_oom_kill[1h]) > 0
```

**场景3：磁盘空间告警处理**

```bash
# 1. 确认用量
df -h | grep -E "8[5-9]%|9[0-9]%|100%"

# 2. 找大文件
du -ah / | sort -rh | head -20

# 3. 常见清理
docker system prune -a -f       # Docker
journalctl --vacuum-size=500M   # systemd 日志
find /var/log -name "*.gz" -delete  # 旧日志
```

**场景4：服务可用性监控**

```promql
# 整体可用性（过去 24h）
avg_over_time(up{job="myapp"}[24h]) * 100

# 今天发生过几次 DOWN
changes(up{job="myapp"}[24h]) > 0

# 最近一次 DOWN 的时间
timestamp(up{job="myapp"} == 0)
```

**场景5：SSL 证书监控**

```promql
# 剩余天数
(probe_ssl_earliest_cert_expiry - time()) / 86400

# 列出 30 天内过期的
(probe_ssl_earliest_cert_expiry - time()) / 86400 < 30
```

---

### 9. 排障命令

```bash
# Prometheus 排障
curl http://localhost:9090/api/v1/targets | python3 -m json.tool | grep -E "health|lastError"
promtool check config prometheus.yml
tail -f /var/log/prometheus.log

# 检查 Prometheus 自身的健康
curl http://localhost:9090/-/healthy
curl http://localhost:9090/-/ready

# Alertmanager 排障
amtool alert query --alertmanager.url=http://localhost:9093
curl http://localhost:9093/-/healthy
curl http://localhost:9093/api/v2/status

# Grafana 排障
docker logs grafana --tail 50
curl http://localhost:3000/api/health
# 重置 admin 密码
docker exec -it grafana grafana-cli admin reset-admin-password newpassword

# 指标调试
# 直接看原始指标
curl http://localhost:9100/metrics | grep node_cpu
# PromQL 即时查询
curl "http://localhost:9090/api/v1/query?query=up"

# 检查时间同步（指标时间戳对不上会导致数据异常）
timedatectl status
```
