## 网络排查与抓包

> 适用场景：网络不通、延迟高、丢包、DNS 异常、SSL 握手失败
> 前置阅读：[01-linux-basics.md](01-linux-basics.md) [02-linux-troubleshooting.md](02-linux-troubleshooting.md)

---

### 1. 排查方法论：自底向上，逐层排除

```
应用层    ← curl、浏览器测试              最后查
  ↑
传输层    ← telnet、nc 测试端口连通性
  ↑
网络层    ← ping、traceroute 测试路由
  ↑
链路层    ← ip link、ethtool 检查网卡      先查
```

**黄金法则：先确认自己能控制的那一层，再往上查。**

---

### 2. 快速诊断流程

#### 场景 A：服务访问不了

```bash
# 步骤1：本机网卡是否 UP
ip link show eth0 | grep state          # 看 UP/DOWN
ethtool eth0                            # 看 Speed、Link detected

# 步骤2：IP 地址是否正常
ip addr show eth0 | grep inet           # 有 IP 吗
ip route                                # 默认网关存在吗

# 步骤3：能否到达网关
ping -c 3 192.168.1.1                   # 网关通吗（替换为实际网关 IP）

# 步骤4：能否到达外网
ping -c 3 8.8.8.8                       # 公网 IP 通吗
ping -c 3 baidu.com                     # DNS 解析正常吗

# 步骤5：端口是否监听
ss -tlnp | grep :80                     # 服务在监听吗
ss -tlnp | grep 0.0.0.0                 # 是监听所有 IP 还是仅 127.0.0.1

# 步骤6：防火墙是否放行
iptables -L -n -v | grep :80
firewall-cmd --list-ports

# 步骤7：从外部测试
# 在另一台机器上：
curl -v http://目标IP:端口
telnet 目标IP 端口
```

#### 场景 B：间歇性超时

```bash
# 步骤1：持续 ping 看丢包模式
ping -c 100 目标IP | tee /tmp/ping.log
grep "icmp_seq" /tmp/ping.log | awk '{print $7}' | sort | uniq -c  # 统计延迟分布

# 步骤2：mtr 看哪一跳丢包
mtr -r -c 50 目标IP                    # 报告模式，50 次探测
# 关注 Loss% 列——哪一跳开始丢，问题就在哪一跳之后

# 步骤3：检查网卡错误
ip -s link show eth0                    # errors、dropped、overruns
ethtool -S eth0 | grep -i error        # 网卡硬件统计

# 步骤4：检查 ARP 表
ip neigh                                 # 是否有 FAILED 或 STALE 条目
arp -a                                   # 旧版

# 步骤5：系统日志
dmesg | grep -i "eth0\|network\|link"
grep -i "link" /var/log/messages | tail -20
```

#### 场景 C：DNS 解析异常

```bash
# 步骤1：确认 DNS 配置
cat /etc/resolv.conf                    # nameserver 地址对吗
systemd-resolve --status                # systemd 管理的 DNS

# 步骤2：测试 DNS 服务器可达
ping -c 2 8.8.8.8                       # DNS 服务器 IP 通吗

# 步骤3：逐级测试解析
nslookup baidu.com                      # 能否解析
nslookup baidu.com 8.8.8.8             # 指定 DNS 服务器
dig +trace baidu.com                    # 跟踪完整解析链路
host baidu.com                          # 简单查询

# 步骤4：检查 /etc/hosts
cat /etc/hosts                          # 本地 hosts 是否覆盖了域名

# 步骤5：检查 nscd/systemd-resolved
systemctl status systemd-resolved
journalctl -u systemd-resolved --since "10 min ago"
```

---

### 3. 抓包实战流程

#### 什么时候抓包

- 网络层排查（ping/traceroute/端口测试）都正常，但应用层异常
- 需要看具体请求/响应内容（HTTP 头、TLS 握手、DNS 查询）
- 间歇性问题，复现时需要保留证据

#### 抓包前想清楚三个问题

```
1. 抓哪个网卡？    eth0（物理网卡）/ lo（本地回环）/ any（所有）
2. 过滤什么流量？  按 IP、端口、协议过滤，避免抓太多无关数据
3. 存文件还是看实时？  排查用实时（-X/-A），留证据存文件（-w）
```

#### 抓包命令速查

```bash
# === 基础抓包 ===
tcpdump -i eth0                                    # 抓 eth0 所有流量（量太大，慎用）
tcpdump -i eth0 -c 100                             # 只抓 100 个包
tcpdump -i any host 10.0.0.1                       # 只看某 IP 的流量
tcpdump -i any port 80                             # 只看某端口
tcpdump -i any host 10.0.0.1 and port 443          # 组合过滤

# === 实时查看包内容（排查用） ===
tcpdump -i any host 10.0.0.1 -nne -A               # ASCII 模式，适合 HTTP 明文
tcpdump -i any host 10.0.0.1 -nne -X               # Hex+ASCII，适合二进制协议

# === 存文件（分析用） ===
tcpdump -i any host 10.0.0.1 -w /tmp/capture.pcap  # 写入文件
tcpdump -i any -G 60 -w /tmp/cap_%Y%m%d_%H%M%S.pcap  # 每 60 秒轮转
tcpdump -i any -C 100 -w /tmp/cap.pcap             # 每 100MB 轮转
tcpdump -i any -W 5 -C 100 -w /tmp/cap.pcap        # 保留最近 5 个文件

# === 读取 pcap 文件 ===
tcpdump -r /tmp/capture.pcap -nne                  # 读取并显示
tcpdump -r /tmp/capture.pcap -nne host 10.0.0.2    # 读取时再过滤
tcpdump -r /tmp/capture.pcap -nne port 443         # 只看 HTTPS
```

#### 实战案例 1：排查 HTTP 502 错误

```bash
# 1. 在后端服务器抓 HTTP 流量
tcpdump -i eth0 port 8080 -nne -A -c 200 -w /tmp/backend.pcap &

# 2. 重现问题（curl 或访问页面）
curl http://nginx/upstream/path

# 3. 停抓，分析
tcpdump -r /tmp/backend.pcap -A | grep -E "GET|POST|HTTP/1|502"

# 4. 看请求是否到达后端
tcpdump -r /tmp/backend.pcap -nne | wc -l          # 有包吗？0 = 请求没到后端
tcpdump -r /tmp/backend.pcap -nne | grep "Flags \[S\]"  # 看 TCP 握手是否成功
```

#### 实战案例 2：排查 DNS 慢

```bash
# 抓 DNS 查询
tcpdump -i any port 53 -nne -c 50 -w /tmp/dns.pcap

# 分析响应时间
tcpdump -r /tmp/dns.pcap -nne | grep "A?"           # 看查询
tcpdump -r /tmp/dns.pcap -nne | grep "A "           # 看响应
# 对比查询和响应的时间戳，算出延迟
```

#### 实战案例 3：排查 TLS 握手失败

```bash
# 抓 HTTPS 握手包
tcpdump -i any port 443 -nne -c 50 -w /tmp/tls.pcap

# 分析握手流程
tcpdump -r /tmp/tls.pcap -nne -X | grep -E "Client Hello|Server Hello|Certificate|Alert"
# Alert 出现 = 握手失败
# 常见：证书过期、域名不匹配、TLS 版本不兼容、Cipher 不匹配
```

---

### 4. 抓包分析技巧

```bash
# 统计包里有哪些 IP 在通信
tcpdump -r /tmp/capture.pcap -nne | awk '{print $3}' | sort | uniq -c | sort -rn | head -10

# 统计包里有哪些端口
tcpdump -r /tmp/capture.pcap -nne | grep -oP '\.\d+:' | sort | uniq -c | sort -rn | head -10

# 看 TCP 重传（网络质量差）
tcpdump -r /tmp/capture.pcap -nne | grep -c "Flags \[S\]"     # SYN 包数
tcpdump -r /tmp/capture.pcap -nne | grep -c "retransmission"   # 重传数

# 看 HTTP 状态码分布
tcpdump -r /tmp/capture.pcap -A | grep -oP 'HTTP/1\.[01] \d+' | sort | uniq -c | sort -rn

# 提取 HTTP 请求 URL
tcpdump -r /tmp/capture.pcap -A | grep -E "^(GET|POST|PUT|DELETE) " | head -20

# 导出为文本分析
tcpdump -r /tmp/capture.pcap -nne -v > /tmp/cap.txt
# 然后可以用 grep/awk/sed 随意处理
```

---

### 5. 进阶工具速查

```bash
# === ngrep（按内容过滤抓包，比 tcpdump + grep 快） ===
ngrep -d eth0 -W byline "GET\|POST" port 80          # 抓 HTTP 请求
ngrep -d any -W byline "password\|token" port 80     # 抓含敏感词的流量（⚠️ 合规）

# === ss（替代 netstat，更快） ===
ss -tulnp                                           # 所有监听端口
ss -tanp                                            # 所有 TCP 连接
ss -tanp state time-wait | wc -l                    # TIME_WAIT 连接数
ss -tanp state established                          # 只看已建立连接
ss -s                                               # 连接统计摘要

# === nmap（端口扫描，生产慎用） ===
nmap -p 1-1000 10.0.0.1                             # 扫描端口范围
nmap -sV -p 80,443 10.0.0.1                         # 探测服务版本

# === iperf3（带宽测试） ===
# 服务端
iperf3 -s
# 客户端
iperf3 -c 服务端IP -t 30                              # 测试 30 秒 TCP 带宽
iperf3 -c 服务端IP -u -b 100M                        # UDP 模式，100Mbps

# === curl 诊断（HTTP 层调试利器） ===
curl -v https://example.com                          # 详细输出（看握手、头、body）
curl -w "\ntime_total: %{time_total}s\n" https://example.com  # 各阶段耗时
curl -o /dev/null -s -w '
  dns: %{time_namelookup}s
  connect: %{time_connect}s
  tls: %{time_appconnect}s
  first_byte: %{time_starttransfer}s
  total: %{time_total}s\n' https://example.com
```

---

### 6. 常见网络问题速查

| 现象 | 可能原因 | 先查什么 |
|------|---------|---------|
| ping 不通 | 网线/网卡/IP/防火墙 | `ip link` → `ip addr` → `iptables -L` |
| ping 通但端口不通 | 服务未启动/防火墙/监听地址 | `ss -tlnp` → `iptables -L` |
| DNS 解析失败 | DNS 配置/服务器不可达 | `/etc/resolv.conf` → `nslookup 8.8.8.8` |
| 间歇性超时 | 丢包/ARP 问题/双工不匹配 | `mtr` → `ip -s link` → `ethtool` |
| 连接被拒绝 | 端口未监听/服务挂了 | `ss -tlnp` → `systemctl status` |
| 连接超时 | 防火墙 DROP/路由不通 | `traceroute` → `iptables -L -n` |
| SSL 证书错误 | 证书过期/域名不匹配 | `curl -v` → `openssl s_client` |
| HTTP 502/504 | 后端挂了/超时 | `tcpdump port 后端端口` → 后端日志 |

---

### 7. IPv4 与 IPv6

#### IPv4 基础

```bash
# IP 地址分类与私有地址段
# A 类: 10.0.0.0/8         (10.0.0.0 ~ 10.255.255.255)
# B 类: 172.16.0.0/12      (172.16.0.0 ~ 172.31.255.255)
# C 类: 192.168.0.0/16     (192.168.0.0 ~ 192.168.255.255)
# 回环: 127.0.0.0/8
# 链路本地: 169.254.0.0/16  (DHCP 失败时自动分配)

# CIDR 速算
# /24 = 256 个地址 (254 可用)   子网掩码 255.255.255.0
# /25 = 128 个地址 (126 可用)   子网掩码 255.255.255.128
# /26 = 64 个地址  (62 可用)    子网掩码 255.255.255.192
# /27 = 32 个地址  (30 可用)    子网掩码 255.255.255.224
# /28 = 16 个地址  (14 可用)    子网掩码 255.255.255.240
```

```bash
# 查看 IPv4 配置
ip -4 addr show                                     # 只看 IPv4
ip -4 route                                         # IPv4 路由表
ip -4 neigh                                         # IPv4 ARP 表

# 添加/删除 IPv4 地址
ip addr add 192.168.1.100/24 dev eth0               # 临时添加
ip addr del 192.168.1.100/24 dev eth0               # 删除

# 添加/删除路由
ip route add 10.0.0.0/8 via 192.168.1.1             # 静态路由
ip route add default via 192.168.1.1                 # 默认网关
ip route del 10.0.0.0/8

# ARP 操作
ip neigh show                                        # 查看 ARP 缓存
ip neigh add 192.168.1.10 lladdr aa:bb:cc:dd:ee:ff dev eth0  # 静态 ARP
ip neigh del 192.168.1.10 dev eth0                   # 删除条目
ip neigh flush dev eth0                              # 清空接口 ARP
```

#### IPv6 基础

```bash
# 地址类型
# 全球单播:   2000::/3     (公网地址，类似 IPv4 公网)
# 链路本地:   fe80::/10    (每个接口自动生成，仅本链路有效，类似 169.254)
# 唯一本地:   fc00::/7     (私有地址，类似 10.x / 172.16 / 192.168)
# 回环:       ::1/128      (类似 127.0.0.1)
# 组播:       ff00::/8

# 地址格式
# 2001:db8:0:1::5/64       — 完整格式
# ::1                       — 压缩格式 (= 0000:...:0001)
# fe80::1%eth0              — 链路本地 + 接口标识
# 省略规则：连续的 0000 块可用 :: 替代（只能一次），前导零可省略
```

```bash
# 查看 IPv6 配置
ip -6 addr show                                     # 只看 IPv6
ip -6 route                                         # IPv6 路由表
ip -6 neigh                                         # IPv6 邻居表（替代 ARP）

# 添加/删除 IPv6 地址
ip addr add 2001:db8::5/64 dev eth0
ip addr del 2001:db8::5/64 dev eth0

# 添加/删除路由
ip -6 route add 2001:db8:1::/48 via 2001:db8::1
ip -6 route add default via 2001:db8::1

# 邻居发现（替代 ARP）
ip -6 neigh show                                     # 查看邻居缓存
ip -6 neigh add 2001:db8::5 lladdr aa:bb:cc:dd:ee:ff dev eth0
```

#### 常用 IPv6 测试命令

```bash
# 连通性
ping6 2001:db8::1                                   # IPv6 ping
ping6 -I eth0 ff02::1                               # ping 所有节点（组播）
traceroute6 2001:db8::1                             # IPv6 路由追踪

# 端口测试
telnet -6 2001:db8::1 80
nc -6zv 2001:db8::1 80
curl -6 http://[2001:db8::1]                        # 注意 IPv6 用方括号

# DNS
nslookup -type=AAAA example.com                     # 查 IPv6 地址
dig AAAA example.com
host -t AAAA example.com

# 查看监听
ss -6tlnp                                           # IPv6 监听端口
ss -6tanp                                           # IPv6 连接
```

#### IPv4 vs IPv6 对照

| 概念 | IPv4 | IPv6 |
|------|------|------|
| 地址长度 | 32 位 | 128 位 |
| 地址数量 | ~43 亿 | 约 3.4×10³⁸ |
| 地址格式 | 192.168.1.1 | 2001:db8::1 |
| 子网掩码 | 255.255.255.0 (/24) | /64（标准子网） |
| ARP / 邻居发现 | ARP 协议 | NDP（邻居发现协议） |
| DHCP | DHCPv4 | SLAAC / DHCPv6 |
| NAT | 广泛使用 | 不推荐（地址充足） |
| 广播 | 有广播地址 | 无广播，用组播替代 |
| 回环 | 127.0.0.1 | ::1 |
| 私有地址 | 10.x / 172.16 / 192.168 | fc00::/7 (ULA) |
| 链路本地 | 169.254.0.0/16 | fe80::/10 |
| 最小 MTU | 576 字节 | 1280 字节 |
| 分片 | 路由器可分片 | 仅发送方可分片 |

#### 双栈与过渡

```bash
# 检查系统是否启用 IPv6
sysctl net.ipv6.conf.all.disable_ipv6               # 0=启用, 1=禁用
cat /proc/net/if_inet6                               # 有内容=已启用

# 临时禁用/启用 IPv6
sysctl -w net.ipv6.conf.all.disable_ipv6=1           # 禁用
sysctl -w net.ipv6.conf.all.disable_ipv6=0           # 启用

# 永久配置 /etc/sysctl.conf
# net.ipv6.conf.all.disable_ipv6 = 0
# net.ipv6.conf.default.disable_ipv6 = 0

# 应用优先级（/etc/gai.conf）
# 默认 IPv6 优先。调整 precedence 可改变优先级
# precedence ::ffff:0:0/96  100    ← IPv4 mapped
# precedence ::1/128         50
# precedence ::/0            40
# precedence 2002::/16       30
# precedence ::/96           20

# 测试优先级
curl -v https://example.com                          # 看用 v4 还是 v6
curl -4 https://example.com                          # 强制 IPv4
curl -6 https://example.com                          # 强制 IPv6
```

#### IPv6 排障

```bash
# 1. IPv6 是否启用
sysctl net.ipv6.conf.all.disable_ipv6
ip -6 addr show | grep inet6

# 2. 链路本地地址是否正常（fe80:: 必须有）
ip -6 addr show eth0 | grep fe80

# 3. 默认网关
ip -6 route | grep default

# 4. 邻居可达性
ping6 -c 3 fe80::1%eth0                              # 测试链路本地网关

# 5. DNS 解析
dig AAAA google.com

# 6. MTU 问题（IPv6 最小 1280，PMTUD 被防火墙阻断常见）
ping6 -M do -s 1452 2001:db8::1                      # 禁止分片测试
# 如果 ping 不通，逐步减小 -s 值直到通，+28 = MTU

# 7. 防火墙
ip6tables -L -n -v
```
