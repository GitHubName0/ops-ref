# Linux 基础运维命令

> 适用系统：CentOS / RHEL / Rocky / Alma (yum/dnf) + Ubuntu / Debian (apt)
> 场景：日常运维操作与系统管理

---

## 目录

- [1. 基础命令与文件操作](#1-基础命令与文件操作)
- [2. 文本处理与搜索](#2-文本处理与搜索)
- [3. 权限与用户管理](#3-权限与用户管理)
- [4. 进程管理](#4-进程管理)
- [5. 系统信息与硬件](#5-系统信息与硬件)
- [6. 磁盘与存储](#6-磁盘与存储)
- [7. 网络诊断与配置](#7-网络诊断与配置)
- [8. 软件包管理](#8-软件包管理)
- [9. 服务与 systemd 管理](#9-服务与-systemd-管理)
- [10. 日志查看与排查](#10-日志查看与排查)
- [11. 防火墙](#11-防火墙)
- [12. 计划任务与定时作业](#12-计划任务与定时作业)
- [13. 压缩与归档](#13-压缩与归档)
- [14. SSH 远程管理](#14-ssh-远程管理)
- [15. Docker 基础操作](#15-docker-基础操作)

---

## 1. 基础命令与文件操作

### 文件浏览

| 命令 | 说明 | 实例 |
|------|------|------|
| `ls -lh` | 列出文件（人性化大小） | `ls -lh /var/log/` |
| `ls -lt` | 按时间排序 | `ls -lt /etc/` |
| `ls -la` | 列出所有文件（含隐藏） | `ls -la ~/` |
| `pwd` | 显示当前路径 | `pwd` |
| `cd -` | 回到上一个目录 | `cd -` |

### 文件查看

| 命令 | 说明 | 实例 |
|------|------|------|
| `tail -f file` | 实时跟踪文件末尾（看日志） | `tail -f /var/log/syslog` |
| `tail -n 100 file` | 看最后 100 行 | `tail -n 200 /var/log/messages` |
| `head -n 20 file` | 看前 20 行 | `head -n 10 /etc/passwd` |
| `less file` | 分页查看（/搜索,n下一页） | `less /var/log/syslog` |
| `cat file` | 一次性输出全文 | `cat /etc/os-release` |
| `tac file` | 倒序输出（最后一行在前） | `tac log.txt` |
| `nl file` | 带行号输出 | `nl /etc/passwd` |

> 小技巧：`less` 查看时按 `Shift+G` 到最后，按 `g` 到开头，按 `/关键词` 搜索，按 `n` 跳下一个

### 文件创建/编辑/删除

| 命令 | 说明 | 实例 |
|------|------|------|
| `touch file` | 创建空文件或更新时间戳 | `touch /tmp/test.txt` |
| `cp -r src dst` | 递归复制目录 | `cp -r /data /backup/data` |
| `cp -a src dst` | 归档复制（保留权限/属性） | `cp -a /etc /etc_bak` |
| `mv src dst` | 移动或重命名 | `mv old.conf new.conf` |
| `rm -rf dir` | 强制删除目录（⚠️ 小心！） | `rm -rf /tmp/cache/` |
| `mkdir -p a/b/c` | 递归创建目录 | `mkdir -p /app/logs/2024/` |
| `rm -i file` | 删除前确认 | `rm -i important.txt` |

### 查找文件

| 命令 | 说明 | 实例 |
|------|------|------|
| `find /path -name "*.log"` | 按文件名查找 | `find /var -name "*.log" -type f` |
| `find /path -mtime -7` | 7天内修改过的文件 | `find /etc -mtime -1`（1天内） |
| `find /path -size +100M` | 查找大于100MB的文件 | `find / -size +500M -exec ls -lh {} \;` |
| `find /path -type d` | 只查找目录 | `find /var -type d -name "nginx*"` |
| `which command` | 查看命令路径 | `which python3` |
| `whereis command` | 查看命令及 man 路径 | `whereis nginx` |

---

## 2. 文本处理与搜索

### grep 搜索（最常用）

```bash
# 基本用法
grep "关键词" file.txt
grep -i "keyword" file.log        # 忽略大小写
grep -r "pattern" /path/          # 递归搜索目录
grep -v "exclude" file.log        # 反向匹配（排除）
grep -n "error" app.log           # 显示行号
grep -c "error" app.log           # 只计数
grep -A 5 "ERROR" log.txt         # 匹配行 + 后5行
grep -B 5 "ERROR" log.txt         # 匹配行 + 前5行
grep -C 3 "ERROR" log.txt         # 匹配行 + 前后各3行
grep -E "error|fail|warn" log     # 正则多关键词匹配
grep -l "config" /etc/*.conf      # 只显示包含匹配的文件名
```

### 文本处理三剑客

**sed — 流编辑器（替换/修改）**
```bash
sed 's/旧/新/g' file              # 替换所有（输出到屏幕）
sed -i 's/旧/新/g' file           # 直接修改文件（慎重！）
sed -i.bak 's/旧/新/g' file       # 备份原文件再替换
sed '/pattern/d' file             # 删除匹配行
sed -n '5,10p' file               # 打印第5-10行
sed 's/^/HEAD: /' file            # 行首插入
sed 's/$/ :TAIL/' file            # 行尾追加
```

**awk — 列处理/格式化输出**
```bash
awk '{print $1, $NF}' file        # 打印第一列和最后一列
awk -F ':' '{print $1}' /etc/passwd   # 指定分隔符
awk '{sum+=$1} END{print sum}'    # 对第一列求和
awk '$3 > 500 {print $1}' file    # 条件过滤
awk 'NR==10' file                 # 打印第10行
```

**sort / uniq — 排序去重**
```bash
sort file.txt                     # 排序
sort -n file.txt                  # 按数值排序
sort -r file.txt                  # 倒序
sort -k 2 file.txt                # 按第二列排序
uniq -c                           # 去重并统计出现次数
sort file.txt | uniq -c | sort -rn   # 计数排序（经典组合）
sort -u file.txt                  # 排序+去重（等同于sort|uniq）
```

### 其他文本工具

```bash
wc -l file                        # 行数
wc -w file                        # 单词数
wc -c file                        # 字节数
cut -d: -f1,3 /etc/passwd         # 按分隔符取列
tr 'a-z' 'A-Z' < file             # 小写转大写
diff file1 file2                  # 比较两个文件差异
comm -3 file1 file2               # 比较两个排序文件的差异
```

---

## 3. 权限与用户管理

### 文件权限

```bash
chmod 755 file                    # rwxr-xr-x（常用）
chmod 644 file                    # rw-r--r--（普通文件）
chmod 600 file                    # rw-------（密钥文件）
chmod 700 dir                     # rwx------（目录）
chown user:group file             # 修改所属用户和组
chown -R user:group dir/          # 递归修改目录
chmod +x script.sh                # 添加执行权限
chmod -R g+w dir/                 # 递归给组添加写权限
ls -l                             # 查看权限
getfacl file                      # 查看 ACL 权限
setfacl -m u:user:rwx file        # 设置 ACL 权限
```

> 权限数字速算：r=4, w=2, x=1 → rwx=7, rw-=6, r-x=5, r--=4

### 用户管理

```bash
useradd username                  # 创建用户
useradd -m -s /bin/bash user      # 创建用户并指定 shell
passwd username                   # 设置/修改密码
userdel -r username               # 删除用户及其家目录
usermod -aG group user            # 将用户添加到附加组
whoami                            # 显示当前用户
id                                # 显示当前用户信息
id username                       # 显示指定用户信息
groups                            # 显示当前用户所在组
last                              # 查看最近登录记录
lastlog                           # 查看所有用户最后登录
```

### sudo 配置

```bash
visudo                            # 编辑 sudo 配置（安全方式，别直接改文件）
# 常用配置行：
# username ALL=(ALL) ALL          # 用户有完整 sudo 权限
# %group ALL=(ALL) ALL            # 组有完整 sudo 权限
# username ALL=(ALL) NOPASSWD:ALL # 免密码 sudo（谨慎）
```

---

## 4. 进程管理

```bash
ps aux                            # 查看所有进程
ps -ef                            # 另一格式查看所有进程
ps aux --sort=-%mem               # 按内存使用排序
ps aux --sort=-%cpu               # 按 CPU 使用排序
ps -eo pid,ppid,cmd,%mem,%cpu     # 自定义输出列
top                               # 实时进程监控（按 q 退出）
htop                              # 增强版 top（更友好）
uptime                            # 系统运行时间和负载
pgrep -a nginx                    # 查找进程 PID
kill PID                          # 终止进程
kill -9 PID                       # 强制杀死（SIGKILL）
kill -15 PID                      # 优雅停止（SIGTERM，默认）
pkill process_name                # 按名称杀进程
pkill -f "pattern"                # 按完整命令匹配杀进程
nohup command &                   # 后台运行（退出不中断）
jobs                              # 查看后台作业
fg %1                             # 后台作业调到前台
bg %1                             # 前台作业调到后台
```

> 杀进程顺序：先 `kill` (TERM) → 不行再 `kill -9` (KILL) → 还不行重启机器

---

## 5. 系统信息与硬件

### 系统基本信息

```bash
uname -a                          # 内核版本/主机名/架构
uname -r                          # 仅内核版本
cat /etc/os-release               # 发行版信息（推荐）
cat /etc/redhat-release           # CentOS/RHEL 版本
cat /etc/lsb-release              # Ubuntu 版本
hostname                          # 主机名
hostname -I                       # 本机所有 IP 地址
date                              # 当前时间
date -s "2024-01-01 12:00:00"     # 手动设置时间
timedatectl                       # 时间和时区信息
cal                               # 日历
```

### CPU 信息

```bash
lscpu                             # CPU 详细信息（型号/核心/线程）
cat /proc/cpuinfo                 # 每个 CPU 核心信息
nproc                             # 逻辑 CPU 核心数
grep -c processor /proc/cpuinfo   # 逻辑核心数（同上）
```

### 内存信息

```bash
free -h                           # 内存使用情况（人性化显示）
free -m                           # 以 MB 为单位
cat /proc/meminfo                 # 详细内存信息
vmstat 1 5                        # 内存/进程/IO 统计（每秒一次5次）
```

### 硬件与设备

```bash
lspci                             # PCI 设备列表
lspci | grep -i raid              # 查看 RAID 卡
lsblk                             # 所有块设备（磁盘分区）
lsusb                             # USB 设备
dmidecode -t system               # 系统制造商/型号/序列号
dmesg | tail -20                  # 内核日志（硬件报错排查用）
lsmod                             # 已加载的内核模块
modinfo module_name               # 模块详细信息
```

---

## 6. 磁盘与存储

### 磁盘空间

```bash
df -h                             # 各分区使用情况（推荐）
df -i                             # inode 使用情况（inode满时关键）
du -sh /path/                     # 目录总大小
du -sh /*                         # 根下各目录大小统计
du -h --max-depth=1 /var/         # 指定深度
du -ah /var/log/ | sort -rh | head -10  # 找出最大10个文件
ncdu /path/                       # 交互式磁盘分析（如有安装）
```

### 分区与挂载

```bash
fdisk -l                          # 查看磁盘分区信息
lsblk                             # 块设备树状结构
blkid                             # 块设备 UUID
mount                             # 查看当前挂载
mount /dev/sdb1 /mnt/data         # 手动挂载
umount /mnt/data                  # 卸载
df -hT                            # 查看分区类型（xfs/ext4）
mkfs.ext4 /dev/sdb1               # 格式化为 ext4
mkfs.xfs /dev/sdb1                # 格式化为 xfs
```

### LVM 管理

```bash
pvdisplay                         # 查看物理卷
vgdisplay                         # 查看卷组
lvdisplay                         # 查看逻辑卷
vgextend vgname /dev/sdb          # 扩展卷组
lvextend -L +10G /dev/vg/lv       # 扩容逻辑卷
lvextend -l +100%FREE /dev/vg/lv  # 使用所有剩余空间
xfs_growfs /mount/point           # XFS 扩容后刷新
resize2fs /dev/vg/lv              # ext4 扩容后刷新
```

### 磁盘 IO 排查

```bash
iostat -x 1                       # 详细 IO 统计（每秒一次）
iotop                             # 实时查看进程 IO
dstat -d                          # 磁盘读写统计
```

---

## 7. 网络诊断与配置

### 基础网络信息

```bash
ip addr                           # 查看 IP 地址（新，推荐）
ip a                              # 简写
ifconfig                          # 旧版，需 net-tools 包

ip route                          # 查看路由表
route -n                          # 旧版路由

ip neigh                          # ARP 表（邻居发现）
arp -n                            # 旧版 ARP

ss -tuln                          # 查看监听端口（新，推荐）
netstat -tulpn                    # 查看监听端口（旧版）
ss -tuna                          # 所有 TCP/UDP 连接
```

### 网络连通性排查

```bash
# 先确认网络通不通
ping -c 4 8.8.8.8                 # 测试到外网连通性
ping -c 4 hostname                # 测试域名连通性

# 再确认端口通不通
telnet IP PORT                    # 测试端口（需安装 telnet）
nc -zv IP PORT                    # 端口测试（推荐）
nc -vz IP 80                      # 测试 80 端口

# 路由追踪
traceroute IP                     # 路由追踪（需安装）
tracert IP                        # CentOS 上命令名
mtr IP                            # 结合 ping+traceroute（推荐）

# DNS 查询
nslookup domain                   # DNS 解析查询
dig domain                        # 详细的 DNS 查询（推荐）
dig -x IP                         # 反向解析
host domain                       # 简单 DNS 查询
cat /etc/resolv.conf              # 查看 DNS 配置

# HTTP 请求测试
curl -v http://example.com        # 发送 HTTP 请求（调试用）
curl -I https://example.com       # 只返回 HTTP 头
curl -o /dev/null -w "%{http_code}" http://example.com  # 只输出状态码
wget -q -O - http://example.com   # wget 版
```

### 网卡配置

**CentOS / RHEL (nmcli — NetworkManager)**
```bash
nmcli dev status                  # 查看网卡状态
nmcli con show                    # 查看连接配置
nmcli con up "ens33"              # 启用连接
nmcli con down "ens33"            # 停用连接
nmcli con add con-name eth0 ifname eth0 type ethernet ip4 192.168.1.100/24 gw4 192.168.1.1
nmcli con mod eth0 ipv4.dns "8.8.8.8 8.8.4.4"
```

**Ubuntu (netplan)** — 配置文件在 `/etc/netplan/*.yaml`
```bash
netplan apply                     # 应用配置
netplan try                       # 尝试应用（超时回滚）
```

### 抓包与流量

```bash
# 基础抓包
tcpdump -i eth0                   # 抓取 eth0 流量
tcpdump -i any port 80            # 抓取所有网卡 80 端口流量
tcpdump -i eth0 -c 100 -w dump.pcap  # 抓100个包存文件
tcpdump -i eth0 host 10.0.0.1    # 抓取与某 IP 的通信
tcpdump -i eth0 tcp and port 443  # 条件过滤

# 高阶组合（离线抓包分析用）
tcpdump -i any and host 10.0.0.1 -nneevv -N -w capture.pcap
#              ↑过滤指定IP  ↑↑↓↓↓↓        ↑           ↑
#   -n  不解析IP为域名    -nn  同时不解析端口为服务名
#   -e  显示MAC地址       -vv  详细输出（-v/-vv/-vvv）
#   -N  不解析主机域名     -w  写入pcap文件（可用 -r 读取）

# 抓包时打印包内容（在线排查用，不存文件）
tcpdump -i any host 10.0.0.1 -nne -X     # -X 以 hex+ASCII 打印包内容
tcpdump -i any host 10.0.0.1 -nne -A     # -A 以纯 ASCII 打印（适合 HTTP）
tcpdump -i any port 80 -n -S             # -S 显示绝对序列号（代替相对序列号）

# 抓取指定数量包后自动停止
tcpdump -i any host 10.0.0.1 -c 1000 -w capture.pcap   # 抓1000个包退出
tcpdump -i any -G 60 -w capture_%Y%m%d_%H%M%S.pcap      # 每60秒轮转一个新文件

# 读取 pcap 文件分析（不用 -i 网卡）
tcpdump -r capture.pcap -nne            # 读取已保存的包，不重新抓
tcpdump -r capture.pcap -nne host 10.0.0.2  # 读取文件并筛选
```

---

## 8. 软件包管理

### CentOS / RHEL (yum / dnf)

```bash
# 查询
yum list installed                 # 列出已安装所有包
yum list installed | grep nginx   # 查询某包是否安装
yum info nginx                    # 查看包信息
yum search keyword                # 搜索包
rpm -qa                           # 所有已安装的 RPM 包
rpm -qi package                   # RPM 包信息
rpm -ql package                   # 包所安装的文件列表
rpm -qf /path/to/file             # 文件属于哪个包

# 安装和移除
yum install -y nginx              # 安装
yum remove nginx                  # 卸载
yum update                        # 更新所有包
yum update nginx                  # 更新单个包
yum clean all                     # 清理缓存

# 仓库
yum repolist                      # 查看启用的仓库
yum-config-manager --add-repo URL # 添加第三方仓库

# dnf 命令与 yum 完全兼容，CentOS 8+ 默认用 dnf
```

### Ubuntu / Debian (apt)

```bash
# 查询
dpkg -l                           # 列出已安装包
dpkg -l | grep nginx              # 查询某包是否已装
apt show nginx                    # 包详细信息
apt search keyword                # 搜索包
dpkg -L package                   # 包安装的文件列表
dpkg -S /path/to/file             # 文件属于哪个包

# 安装和移除
apt install -y nginx              # 安装
apt remove nginx                  # 卸载（保留配置）
apt purge nginx                   # 卸载（删除配置）
apt update                        # 更新包列表
apt upgrade                       # 升级所有包
apt autoremove                    # 自动清理依赖

# 仓库
add-apt-repository ppa:name       # 添加 PPA
cat /etc/apt/sources.list         # 查看源列表
```

### 从源码编译（解压源码后通用步骤）
```bash
./configure --prefix=/usr/local/nginx
make
make install                      # ⚠️ 需要 root
```

---

## 9. 服务与 systemd 管理

### systemd（CentOS 7+ / Ubuntu 16+）

```bash
# 核心管理
systemctl status nginx            # 查看服务状态（含最近日志）
systemctl start nginx             # 启动
systemctl stop nginx              # 停止
systemctl restart nginx           # 重启
systemctl reload nginx            # 重载配置（不中断服务）
systemctl enable nginx            # 开机自启
systemctl disable nginx           # 取消开机自启
systemctl is-active nginx         # 检查是否运行
systemctl is-enabled nginx        # 检查是否开机自启
systemctl list-units --type=service  # 列出所有服务

# 系统管理
systemctl reboot                  # 重启系统
systemctl poweroff                # 关机
systemctl rescue                  # 进入救援模式
journalctl -u nginx               # 查看 nginx 的服务日志
journalctl -u nginx -f            # 实时跟踪服务日志
journalctl -u sshd --since "1 hour ago"  # 查看最近1小时日志
```

### 旧版 init (CentOS 6 / service 命令)

```bash
service nginx status
service nginx start/stop/restart
chkconfig nginx on                # 开机自启
chkconfig --list                  # 查看所有服务开机自启状态
```

---

## 10. 日志查看与排查

### 系统日志位置

| 系统 | 主要日志 | 说明 |
|------|---------|------|
| CentOS 7+ | `/var/log/messages` | 通用系统日志 |
| Ubuntu | `/var/log/syslog` | 通用系统日志 |
| 通用 | `/var/log/dmesg` | 内核启动日志 |
| 通用 | `/var/log/cron` | 计划任务日志 |
| 通用 | `/var/log/secure` (CentOS) / `/var/log/auth.log` (Ubuntu) | 认证/安全日志 |
| 通用 | `/var/log/maillog` / `/var/log/mail.log` | 邮件日志 |
| Nginx | `/var/log/nginx/access.log`, `/var/log/nginx/error.log` | Web 访问/错误日志 |
| MySQL | `/var/log/mysql/error.log` | 数据库错误日志 |

### 日志查看技巧

```bash
# 实时跟踪
tail -f /var/log/messages
tail -f /var/log/nginx/access.log | awk '{print $1}' | sort | uniq -c | sort -rn  # 实时看 IP 访问统计

# 查找关键日志
grep -i "error\|fail\|critical" /var/log/messages | tail -50
grep "Out of memory" /var/log/messages
grep "disk full" /var/log/messages
grep -i "authentication failure" /var/log/secure

# 查看启动日志
dmesg | grep -i error
dmesg | less
journalctl -b                      # 本次启动所有日志
journalctl -b -p err               # 本次启动的错误级别日志
```

---

## 11. 防火墙

### firewalld（CentOS 7+ 默认）

```bash
systemctl status firewalld           # 防火墙状态
firewall-cmd --state                 # 简版状态

firewall-cmd --list-all              # 查看所有规则
firewall-cmd --zone=public --add-port=80/tcp --permanent    # 开放端口
firewall-cmd --zone=public --remove-port=80/tcp --permanent # 关闭端口
firewall-cmd --reload                # 重载规则

firewall-cmd --add-service=http --permanent                 # 开放服务
firewall-cmd --add-rich-rule='rule family="ipv4" source address="10.0.0.0/24" accept' --permanent
```

### iptables（通用）

```bash
iptables -L -n -v                   # 查看规则
iptables -F                          # 清空所有规则（⚠️ 导致断连）
iptables -A INPUT -p tcp --dport 22 -j ACCEPT    # 允许 SSH
iptables -A INPUT -p tcp --dport 80 -j ACCEPT    # 允许 HTTP
iptables -A INPUT -p tcp --dport 443 -j ACCEPT   # 允许 HTTPS
iptables -A INPUT -s 10.0.0.0/24 -j ACCEPT       # 允许某网段
iptables -A INPUT -j DROP            # 默认拒绝入站（最后）
iptables -I INPUT 1 -p tcp --dport 22 -j ACCEPT   # 插入到第1条

# 保存规则
iptables-save > /etc/sysconfig/iptables           # CentOS
iptables-save > /etc/iptables/rules.v4            # Ubuntu
# 恢复规则
iptables-restore < /etc/sysconfig/iptables
```

### ufw（Ubuntu 默认）

```bash
ufw enable                           # 启用
ufw disable                          # 禁用
ufw status                           # 状态
ufw status numbered                   # 带编号查看
ufw allow 22/tcp                     # 允许端口
ufw allow 80/tcp                     # 允许端口
ufw deny 23/tcp                      # 拒绝端口
ufw delete 3                         # 删除第3条规则
ufw allow from 10.0.0.0/24          # 允许网段
```

---

## 12. 计划任务与定时作业

### cron

```bash
crontab -l                           # 查看当前用户的计划任务
crontab -e                           # 编辑计划任务
crontab -r                           # 删除所有计划任务（小心！）

# 格式：分 时 日 月 周  命令
# 实例：
*/5 * * * * /script/check.sh        # 每5分钟
0 * * * * /script/hourly.sh         # 每小时（整点）
0 2 * * * /script/backup.sh         # 每天凌晨2点
0 0 * * 0 /script/weekly.sh         # 每周日凌晨
0 0 1 * * /script/monthly.sh        # 每月1号凌晨
30 9 * * 1-5 /script/workday.sh     # 工作日上午9:30

# 日志查看
tail -f /var/log/cron                # CentOS RHEL
grep CRON /var/log/syslog           # Ubuntu
```

---

## 13. 压缩与归档

```bash
# tar（最常用）
tar -czvf archive.tar.gz /path/     # 创建 tar.gz 压缩
tar -xzvf archive.tar.gz            # 解压到当前目录
tar -xzvf archive.tar.gz -C /tmp   # 解压到指定目录
tar -tzvf archive.tar.gz            # 查看压缩包内容
tar -czvf archive.tar.gz --exclude='*.log' /path/  # 排除某些文件

# zip（跨平台好用）
zip -r archive.zip /path/
unzip archive.zip
unzip archive.zip -d /target/dir
unzip -l archive.zip               # 查看内容

# 其他
gzip file                          # 压缩单个文件
gunzip file.gz
bzip2 file                         # 更高压缩比
bunzip2 file.bz2

# 查看压缩文件内容
zcat file.gz                       # 查看 gz 压缩文件内容（grep 等配合）
zless file.gz
zgrep "error" /var/log/syslog.*.gz  # 搜索压缩日志（超级实用！）
```

> 断网排查时 `zgrep` 是神器——日志被 rotate 压缩了也不用先解压

---

## 14. SSH 远程管理

```bash
# 基本连接
ssh user@hostname
ssh -p 2222 user@hostname          # 指定端口
ssh -i ~/.ssh/id_rsa user@host     # 指定密钥文件

# 安全配置（/etc/ssh/sshd_config）
# Port 2222                        # 改默认端口（防扫描）
# PermitRootLogin no               # 禁止 root 直接登录
# PasswordAuthentication no        # 禁用密码登录（只用密钥）
# AllowUsers alice bob             # 只允许某些用户 SSH 登录

# 生成密钥
ssh-keygen -t ed25519              # 生成 ed25519 密钥（推荐）
ssh-keygen -t rsa -b 4096          # 或 RSA 4096 位
ssh-copy-id user@hostname           # 复制公钥到服务器

# 文件传输
scp file user@host:/path/          # 上传
scp user@host:/path/file ./        # 下载
scp -r dir/ user@host:/path/       # 递归传输目录
rsync -avz /local/ user@host:/remote/   # 同步（增量更快，推荐）
rsync -avz --delete user@host:/remote/ /local/  # 镜像同步（删除目标多余文件）

# SSH 隧道（端口转发）
ssh -L 8080:localhost:80 user@host       # 本地端口转发
ssh -R 8080:localhost:80 user@host       # 远程端口转发
ssh -D 1080 user@host                    # SOCKS 代理

# SSH 会话保持（~/.ssh/config 配置）
# Host myserver
#     HostName 192.168.1.100
#     Port 2222
#     User admin
#     IdentityFile ~/.ssh/id_ed25519
#     ServerAliveInterval 60
```

---

## 15. Docker 基础操作

### 容器生命周期

```bash
docker ps                            # 运行中的容器
docker ps -a                         # 所有容器（含已停止）
docker ps -a --format "table {{.ID}}\t{{.Names}}\t{{.Status}}"  # 格式化输出
docker logs -f container_name        # 查看容器日志（-f 跟踪）
docker logs --tail 100 container_name  # 最近100行
docker exec -it container_name bash  # 进入容器
docker exec container_name cat /etc/nginx/nginx.conf  # 查看容器内文件
docker inspect container_name        # 容器详细信息
docker stats                         # 容器资源占用（实时）
docker start/stop/restart name       # 启停容器
docker rm -f container_name          # 强制删除容器
```

### 镜像管理

```bash
docker images                        # 查看本地镜像
docker pull nginx:latest             # 拉取镜像
docker rmi image_name                # 删除镜像
docker system df                     # 查看 Docker 磁盘占用
docker system prune                  # 清理未使用资源（镜像/容器/网络）
docker system prune -a               # 更激进的清理
```

---

> 前往 **[02-linux-troubleshooting.md](02-linux-troubleshooting.md)** 查看故障排查与应急场景
