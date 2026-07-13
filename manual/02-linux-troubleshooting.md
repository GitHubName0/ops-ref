# Linux 故障排查与应急场景

> 适用场景：当机应急、性能瓶颈定位、断网排错
> 前置阅读：[01-linux-basics.md](01-linux-basics.md)

---

## 目录

- [1. 性能排查总纲（1分钟定位问题）](#1-性能排查总纲1分钟定位问题)
- [2. CPU 排查](#2-cpu-排查)
- [3. 内存排查](#3-内存排查)
- [4. 磁盘排查](#4-磁盘排查)
- [5. 网络排查](#5-网络排查)
- [6. 系统瓶颈一句话速判](#6-系统瓶颈一句话速判)
- [7. 常用排查场景速查](#7-常用排查场景速查)
- [附录：命令快速索引](#附录命令快速索引)

---

## 1. 性能排查总纲（1分钟定位问题）

```bash
# 第一步：看负载 + CPU + 内存综合情况
top
# 或
htop

# 第二步：看磁盘空间
df -h

# 第三步：看内存详细
free -h

# 第四步：看磁盘 IO 是否饱和
iostat -x 1 5

# 第五步：看网络连接数
ss -s
netstat -s
```

---

## 2. CPU 排查

```bash
# 找到 CPU 最高的进程
top -o %CPU                         # 按 CPU 排序
ps -eo pid,ppid,cmd,%cpu --sort=-%cpu | head -10  # 前10个

# 查看进程的线程
top -Hp PID
ps -Lp PID -o pid,tid,pcpu,cmd | sort -k3 -rn | head

# 负载高但 CPU 不高 → 可能是 IO 等待
vmstat 1 5                          # wa 列高 = IO 瓶颈
```

---

## 3. 内存排查

```bash
# 到底谁在吃内存
ps aux --sort=-%mem | head -10

# 查看某个进程内存详情
pmap -x PID

# 查看缓存/缓冲
cat /proc/meminfo | grep -E "^(Mem|Cached|Buffers)"

# OOM Killer 检查
dmesg | grep -i "out of memory"
grep -i "killed process" /var/log/messages
```

---

## 4. 磁盘排查

```bash
# 检查是否有进程在疯狂写盘
iotop -o                              # 只显示有 IO 的进程
lsof +D /var/log/                     # 查看哪些进程在打开日志目录的文件

# inode 满了
df -i
# inode 满了怎么办：找大量小文件
find /var/spool/postfix/maildrop -type f | wc -l  # 邮件队列常见
find /tmp -type f | wc -l
find / -xdev -type f 2>/dev/null | wc -l

# 大文件定位
du -ah / | sort -rh | head -20

# 查看进程占用已删除文件（df 满但 du 不大）
lsof | grep "(deleted)"
```

---

## 5. 网络排查

```bash
# 连接数统计
ss -s                                # 总连接数汇总
ss -tan | awk '{print $4}' | sort | uniq -c | sort -rn  # 各端口连接数
ss -tan state ESTABLISHED | wc -l   # 已建立连接数

# 查看大量 TIME_WAIT
ss -tan state TIME-WAIT | wc -l
# TIME_WAIT 多：内核参数调整
echo "net.ipv4.tcp_tw_reuse = 1" >> /etc/sysctl.conf
echo "net.ipv4.tcp_fin_timeout = 15" >> /etc/sysctl.conf
sysctl -p

# 带宽占用
iftop -i eth0                        # 实时带宽（需安装）
nload                                # 流量监控（需安装）

# 丢包检查
netstat -i                           # 查看接口丢包
ip -s link                           # 接口统计（含错误/丢包）
```

---

## 6. 系统瓶颈一句话速判

| 瓶颈 | 判断依据 | 解决方向 |
|------|---------|---------|
| CPU 瓶颈 | `top` → %idle 接近 0, %wa < 5, %us+%sy 接近 100 | 优化代码、扩容、增加 worker 进程 |
| 内存瓶颈 | `free -h` → available 接近 0，或 swap 大量使用 | 加内存、优化内存泄漏、清理缓存 |
| 磁盘 IO 瓶颈 | `top` → %wa > 30；`iostat` → %util 接近 100 | 换 SSD、优化查询、加缓存 |
| 网络瓶颈 | 带宽跑满，连接数异常高，丢包率上升 | 扩容带宽、限流、优化协议 |

---

## 7. 常用排查场景速查

### 场景 1：网站打不开怎么办？

```bash
# 1. 看服务是否在运行
systemctl status nginx
systemctl status php-fpm
systemctl status httpd

# 2. 看端口是否在监听
ss -tulpn | grep -E ":(80|443) "

# 3. 看防火墙是否拦截
firewall-cmd --list-all              # firewalld
iptables -L -n -v | grep 80         # iptables

# 4. 看应用日志
tail -100 /var/log/nginx/error.log

# 5. 看系统资源是否不足（OOM / 磁盘满 / 连接数满）
df -h
free -h
```

### 场景 2：服务器 SSH 连不上？

```bash
# 1. SSH 服务是否运行
systemctl status sshd

# 2. 22 端口是否在监听
ss -tulnp | grep :22

# 3. 防火墙是否放行了 SSH
firewall-cmd --list-all | grep ssh
iptables -L -n | grep 22

# 4. hosts.deny 是否被拉黑了
cat /etc/hosts.deny
cat /etc/hosts.allow

# 5. SELinux 是否拦截了
getenforce                            # Enforcing=开启
# 临时关闭：setenforce 0
# 查看审计日志：grep sshd /var/log/audit/audit.log | tail
```

### 场景 3：磁盘满了怎么办？

```bash
# 1. 确认哪个分区满了
df -h

# 2. 找大文件
du -ah /var/ | sort -rh | head -10

# 3. 找大目录
du -sh /var/log/
du -sh /tmp/
du -sh /var/lib/docker/              # Docker 目录常是罪魁祸首

# 4. 用 find 找大于 1GB 的文件
find / -type f -size +1G -exec ls -lh {} \; 2>/dev/null

# 5. 如果 df 显示满但 du 对不上 → 有进程占用了已删除的文件
lsof | grep "(deleted)"              # 找到后重启对应进程

# 6. 日志切割/清理
truncate -s 0 /var/log/nginx/access.log  # 直接清空（紧急用）
logrotate -f /etc/logrotate.conf     # 强制执行日志轮转

# 7. 清理包缓存
yum clean all                        # CentOS
apt clean                            # Ubuntu
docker system prune -f               # Docker 镜像清理
```

### 场景 4：CPU 负载过高？

```bash
# 1. 看哪个进程在吃 CPU
top -o %CPU

# 2. 如果是 Java 应用，看线程栈
top -Hp PID                          # 找到 CPU 高的线程 TID
printf "%x\n" TID                    # 转为 16 进制
jstack PID | grep -A 30 "nid=0xHEX"  # 看线程堆栈

# 3. 如果是业务进程，先重启再排查
systemctl restart app_name

# 4. 检查是否被挖矿
top -o %CPU                          # 看有无陌生进程
cat /etc/crontab                     # 看有无异常计划任务
ps aux | grep -i mine\|monero\|xmr   # 挖矿特征
netstat -tuna | grep -E ":(3333|4444|5555|6666)"  # 挖矿常用端口
```

### 场景 5：内存不足 / OOM

```bash
# 1. 确认内存使用
free -h
cat /proc/meminfo | grep MemAvailable

# 2. 查 swap 使用情况
swapon --show
free -h

# 3. 看哪个进程吃的多
ps aux --sort=-%mem | head -10

# 4. 是否有 OOM 被 kill
dmesg | grep -i "killed process"
grep -i "out of memory" /var/log/messages

# 5. 紧急释放内存（小心！）
echo 3 > /proc/sys/vm/drop_caches    # 清理缓存（不影响进程，推荐）
sync; echo 1 > /proc/sys/vm/drop_caches    # 清理 page cache
systemctl restart service_name        # 重启占用大的服务

# 6. 配置交换空间
fallocate -l 4G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
# 永久生效：echo "/swapfile none swap sw 0 0" >> /etc/fstab
```

### 场景 6：网络丢包 / 延迟高

```bash
# 1. 检查网卡错误
ip -s link show eth0                 # 看 errors/dropped 列
netstat -i

# 2. 检查连接队列溢出
netstat -s | grep -i "overflow\|drop"
ss -lnt | grep LISTEN                # 看 Send-Q/Recv-Q

# 3. 检查路由
ip route get 8.8.8.8                 # 看数据包从哪个接口出去

# 4. MTU 问题
ping -M do -s 1472 8.8.8.8          # 测试 MTU（不带分段）
# 如果不通：减小 MTU 值重试，找到最大 MTU

# 5. DNS 问题
time nslookup google.com             # DNS 响应慢
# /etc/resolv.conf 改本地 DNS 或换 114.114.114.114
```

### 场景 7：服务器时间不同步

```bash
# 1. 查看当前时间与时区
date
timedatectl

# 2. 更新时区
timedatectl set-timezone Asia/Shanghai

# 3. NTP 同步
ntpdate -u ntp.aliyun.com            # 手动同步一次（CentOS 7）
chronyc sources                      # chrony 版（CentOS 8+/RHEL 8+）
systemctl restart chronyd
timedatectl set-ntp yes              # 自动 NTP 同步
```

### 场景 8：无法安装软件包

```bash
# CentOS — 缓存了就用本地
yum clean all && yum makecache
yum list installed | grep nginx       # 确认是否已装
rpm -ivh nginx.rpm                   # 离线安装（需先下载 rpm 包）

# Ubuntu
apt --fix-broken install             # 修复依赖
dpkg -i package.deb                  # 离线安装

# 通用：有包文件就可以离线装
# 有网络时预下载：
# yum install --downloadonly --downloaddir=./ nginx
# apt download nginx
```

### 场景 9：SELinux 导致权限问题

```bash
getenforce                            # 查看 SELinux 模式
setenforce 0                         # 临时关闭（排查看是否是 SELinux 问题）
# 如果是 SELinux 问题，正确做法保留 SELinux
ausearch -m avc -ts recent           # 查看拒绝日志
grep denied /var/log/audit/audit.log # 检查被拒绝的操作
# 生成 SELinux 策略
audit2allow -a -M mypolicy
semodule -i mypolicy.pp
```

---

## 附录：命令快速索引（按字母）

| 命令 | 分类 | 用途 |
|------|------|------|
| `df` | 磁盘 | 磁盘空间 |
| `dmesg` | 日志 | 内核日志/OOM检查 |
| `du` | 磁盘 | 目录大小 |
| `echo 3 > /proc/sys/vm/drop_caches` | 内存 | 清理缓存 |
| `find` | 文件 | 查找大文件/小文件 |
| `free` | 内存 | 内存使用 |
| `getenforce` | 安全 | SELinux 状态 |
| `iostat` | 性能 | 磁盘 IO |
| `iotop` | 性能 | 进程 IO 监控 |
| `ip -s link` | 网络 | 网卡丢包 |
| `jstack` | Java | 线程堆栈 |
| `journalctl` | 日志 | systemd 日志 |
| `logrotate` | 日志 | 日志轮转 |
| `lsof` | 进程 | 查找已删文件 |
| `netstat` | 网络 | 丢包/连接统计 |
| `ntpdate` | 时间 | 手动同步时间 |
| `ps` | 进程 | 按 CPU/内存排序 |
| `setenforce` | 安全 | SELinux 开关 |
| `ss` | 网络 | 连接数统计 |
| `swapon` | 内存 | 交换空间 |
| `systemctl` | 服务 | 服务管理 |
| `top` | 性能 | 进程监控 |
| `truncate` | 日志 | 清空日志 |
| `vmstat` | 性能 | 系统统计 |

---

> **服务器部署建议：** 
> ```bash
> # 把排查手册放到服务器上
> scp 02-linux-troubleshooting.md user@server:/usr/local/share/
> # 配合基础篇一起使用
> less /usr/local/share/01-linux-basics.md
> less /usr/local/share/02-linux-troubleshooting.md
> ```
