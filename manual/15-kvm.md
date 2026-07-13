## KVM 虚拟化 (virsh)

> 适用场景：KVM/QEMU 虚拟机管理、libvirt 操作、宿主机排障
> 前置阅读：[01-linux-basics.md](01-linux-basics.md)

---

### 1. 基础信息

```bash
# 宿主机信息
virsh version                                        # libvirt 和 hypervisor 版本
virsh nodeinfo                                       # CPU/内存/架构
virsh nodecpustats                                   # CPU 使用统计
virsh nodememstats                                   # 内存使用统计
virsh capabilities                                   # 宿主机能力（XML 格式）
virsh sysinfo                                        # 系统信息（SMBIOS）
virsh uri                                            # 当前连接 URI

# 连接
virsh                                                # 默认连接到本地 qemu:///system
virsh -c qemu:///system                              # 显式指定
virsh -c qemu+ssh://root@host/system                 # 远程连接
virsh -c qemu:///session                             # 用户会话（非 root）

# 列出虚拟机
virsh list                                           # 运行中的
virsh list --all                                     # 所有（含关机）
virsh list --inactive                                # 仅关机
virsh list --autostart                               # 开机自启的
virsh list --name                                    # 只显示名称
virsh list --title                                   # 显示标题
```

---

### 2. 虚拟机生命周期

```bash
# 启动与关机
virsh start <vm>                                     # 启动
virsh shutdown <vm>                                  # 优雅关机（发送 ACPI 信号）
virsh shutdown <vm> --mode acpi                      # 同上
virsh destroy <vm>                                   # 强制关机（拔电源）
virsh reboot <vm>                                    # 重启
virsh reset <vm>                                     # 强制重置

# 暂停与恢复
virsh suspend <vm>                                   # 暂停（内存保留）
virsh resume <vm>                                    # 恢复
virsh save <vm> /path/to/vm.saved                    # 保存到文件（类似休眠）
virsh restore /path/to/vm.saved                      # 从文件恢复

# 自动启动
virsh autostart <vm>                                 # 开机自启
virsh autostart --disable <vm>                       # 取消自启

# 删除
virsh undefine <vm>                                  # 删除定义（保留磁盘）
virsh undefine <vm> --remove-all-storage             # 删除定义和磁盘
virsh undefine <vm> --nvram                          # 同时删除 NVRAM（UEFI）
```

---

### 3. 虚拟机信息与监控

```bash
# 基本信息
virsh dominfo <vm>                                   # 基本信息（状态/CPU/内存）
virsh domid <vm>                                     # 运行时 ID
virsh domuuid <vm>                                   # UUID
virsh domstate <vm>                                  # 当前状态
virsh domstats <vm>                                  # 详细统计（CPU/内存/磁盘/网络）
virsh domstats <vm> --cpu-total                      # 只看 CPU
virsh domstats <vm> --balloon                        # 只看内存

# CPU
virsh vcpucount <vm>                                 # vCPU 数量
virsh vcpucount <vm> --current                       # 当前在线 vCPU
virsh vcpuinfo <vm>                                  # vCPU 详细（物理 CPU 绑定）
virsh vcpupin <vm>                                   # vCPU 与物理 CPU 绑定关系

# 内存
virsh dommemstat <vm>                                # 内存统计
virsh setmaxmem <vm> 4G --config                     # 设置最大内存
virsh setmem <vm> 2G --config                        # 设置当前内存

# 磁盘
virsh domblklist <vm>                                # 磁盘列表
virsh domblkinfo <vm> vda                            # 磁盘详细信息
virsh domblkstat <vm> vda                            # 磁盘 IO 统计
virsh domblkerror <vm>                               # 磁盘错误

# 网络
virsh domiflist <vm>                                 # 网卡列表
virsh domifaddr <vm>                                 # IP 地址（需 guest agent）
virsh domifstat <vm> vnet0                           # 网卡流量统计

# 控制台
virsh console <vm>                                   # 文本控制台（Ctrl+] 退出）
virsh vncdisplay <vm>                                # VNC 端口号

# 进程
virsh qemu-monitor-command <vm> '{"execute":"query-cpus"}' --hmp  # QEMU monitor
```

---

### 4. 虚拟机配置修改

```bash
# === 编辑 XML 配置 ===
virsh edit <vm>                                      # 直接编辑 XML（生效需重启）
virsh dumpxml <vm> > /tmp/vm.xml                     # 导出 XML
virsh define /tmp/vm.xml                             # 从 XML 重新定义

# === CPU ===
virsh setvcpus <vm> 4 --config                       # 修改 vCPU 数（关机后生效）
virsh setvcpus <vm> 4 --live                         # 热添加（需 guest 支持）
virsh vcpupin <vm> 0 2                               # vCPU0 绑定到物理 CPU2
virsh emulatorpin <vm> 0-1                           # 模拟器进程绑定到 CPU0-1

# === 内存 ===
virsh setmaxmem <vm> 8G --config                     # 最大内存
virsh setmem <vm> 4G --live                          # 热修改（需 balloon 驱动）

# === 磁盘 ===
virsh attach-disk <vm> /path/to/disk.qcow2 vdb --config     # 添加磁盘
virsh attach-disk <vm> /path/to/disk.qcow2 vdb --live       # 热添加
virsh detach-disk <vm> vdb --config                         # 移除磁盘
virsh detach-disk <vm> vdb --live                            # 热移除

# === 网卡 ===
virsh attach-interface <vm> bridge br0 --config             # 添加桥接网卡
virsh attach-interface <vm> network default --config        # 添加 NAT 网卡
virsh detach-interface <vm> bridge --mac 52:54:00:xx:xx:xx  # 移除网卡

# === 引导顺序 ===
virsh domblklist <vm>                                # 看磁盘设备名
# 编辑 XML 中 <boot order='1'/> 修改引导顺序
```

---

### 5. 存储管理

```bash
# === 存储池 ===
virsh pool-list                                      # 列出存储池
virsh pool-list --all                                # 含非活跃
virsh pool-info <pool>                               # 存储池详情
virsh pool-start <pool>                              # 激活
virsh pool-destroy <pool>                            # 停用
virsh pool-delete <pool>                             # 删除
virsh pool-undefine <pool>                           # 取消定义

# 创建存储池
virsh pool-define-as --name vms --type dir --target /var/lib/libvirt/images
virsh pool-create-as --name isos --type dir --target /data/isos
virsh pool-autostart <pool>                          # 自动启动

# === 存储卷 ===
virsh vol-list <pool>                                # 列出卷
virsh vol-info <vol>.qcow2 <pool>                    # 卷信息
virsh vol-create-as <pool> vm-disk.qcow2 20G --format qcow2  # 创建卷
virsh vol-delete vm-disk.qcow2 <pool>                # 删除卷
virsh vol-clone --pool <pool> vm.qcow2 clone.qcow2   # 克隆卷

# 上传/下载
virsh vol-upload --pool <pool> vm.qcow2 /path/to/image.qcow2
virsh vol-download --pool <pool> vm.qcow2 /tmp/backup.qcow2

# 查看卷路径
virsh vol-path vm.qcow2 <pool>                       # 卷的完整文件路径
virsh vol-key vm.qcow2 <pool>                        # 卷的 key
```

---

### 6. 网络管理

```bash
# === 虚拟网络 ===
virsh net-list                                       # 列出网络
virsh net-list --all
virsh net-info <net>                                 # 网络详情
virsh net-dumpxml <net>                              # XML 定义
virsh net-start <net>                                # 启动
virsh net-destroy <net>                              # 停止
virsh net-undefine <net>                             # 取消定义
virsh net-autostart <net>                            # 自动启动

# 创建网络
virsh net-define /tmp/network.xml                    # 从 XML 定义
virsh net-create /tmp/network.xml                    # 定义并启动

# === DHCP 租约 ===
virsh net-dhcp-leases <net>                          # 查看 DHCP 租约

# === 网桥（宿主机层面） ===
brctl show                                           # 查看网桥
bridge link show                                     # 网桥端口
```

---

### 7. 快照管理

```bash
# === 磁盘快照（内部快照，存于 qcow2 内） ===
virsh snapshot-list <vm>                             # 列出快照
virsh snapshot-create-as <vm> --name snap1           # 创建快照
virsh snapshot-create-as <vm> --name snap1 --description "before update"
virsh snapshot-current <vm>                          # 当前快照
virsh snapshot-info <vm> --current                   # 当前快照详情
virsh snapshot-revert <vm> --snapshotname snap1      # 恢复到快照
virsh snapshot-delete <vm> --snapshotname snap1      # 删除快照
virsh snapshot-parent <vm> --snapshotname snap1      # 父快照

# === 外部快照（磁盘快照 + 内存状态，更安全） ===
virsh snapshot-create-as <vm> --name snap1 \
  --disk-only --diskspec vda,snapshot=external       # 只快照磁盘
virsh snapshot-create-as <vm> --name snap1 \
  --memspec file=/tmp/vm.mem --diskspec vda,snapshot=external  # 磁盘+内存

# === 快照链管理 ===
virsh blockcommit <vm> vda --active --pivot          # 合并快照链
virsh blockpull <vm> vda --base /path/to/base.qcow2  # 拉取合并
```

---

### 8. 迁移

```bash
# 在线迁移（共享存储）
virsh migrate --live <vm> qemu+ssh://target-host/system
virsh migrate --live <vm> qemu+ssh://target-host/system \
  --persistent --undefinesource                     # 迁移后自动清理源

# 离线迁移
virsh migrate --offline <vm> qemu+ssh://target-host/system

# 在线迁移（无共享存储，需复制磁盘）
virsh migrate --live <vm> qemu+ssh://target-host/system \
  --copy-storage-all --persistent

# 查看迁移进度
virsh domjobinfo <vm>
```

---

### 9. 排障命令

```bash
# === 虚拟机卡死 ===
virsh destroy <vm>                                   # 强制关机
virsh start <vm>                                     # 重新启动

# === 查看 QEMU 进程 ===
ps aux | grep qemu | grep <vm-name>
virsh domid <vm>                                     # 获取 ID
virsh qemu-monitor-command <vm> --hmp info status    # 查看运行状态
virsh qemu-monitor-command <vm> --hmp info block     # 查看磁盘
virsh qemu-monitor-command <vm> --hmp info cpus      # 查看 CPU

# === 磁盘问题 ===
virsh domblkerror <vm>                               # 磁盘错误
qemu-img check /path/to/disk.qcow2                   # 检查镜像完整性
qemu-img info /path/to/disk.qcow2                    # 镜像信息（格式/大小/快照）

# === 修复磁盘 ===
qemu-img check -r all /path/to/disk.qcow2            # 修复（慎用）
qemu-img commit /path/to/snapshot                    # 提交快照

# === 日志 ===
tail -100 /var/log/libvirt/qemu/<vm-name>.log        # 虚拟机日志
journalctl -u libvirtd --since "10 min ago"          # libvirtd 日志
dmesg | grep -i kvm                                  # KVM 内核日志

# === 性能排查 ===
virsh domstats <vm>                                  # 全量统计
virsh cpu-stats <vm>                                 # CPU 时间分布
virsh domifstat <vm> vnet0                           # 网卡流量
virsh domblkstat <vm> vda                            # 磁盘 IO
```

---

### 10. 常见场景速查

#### 场景 1：克隆虚拟机

```bash
# 1. 关机
virsh shutdown <vm>

# 2. 复制磁盘
virsh vol-clone --pool default <vm>.qcow2 clone.qcow2

# 3. 导出 XML 并修改
virsh dumpxml <vm> > /tmp/clone.xml
# 编辑：修改 name、uuid（删除让系统重新生成）、mac 地址

# 4. 定义新虚拟机
virsh define /tmp/clone.xml
virsh start clone
```

#### 场景 2：扩展磁盘

```bash
# 1. 扩展 qcow2 镜像
qemu-img resize /var/lib/libvirt/images/<vm>.qcow2 +10G

# 2. 启动虚拟机
virsh start <vm>

# 3. 虚拟机内扩展分区（以 Linux 为例）
# 进入虚拟机后：
lsblk                                                # 确认磁盘大小已变
growpart /dev/vda 1                                  # 扩展分区（cloud-init 镜像）
resize2fs /dev/vda1                                  # ext4
xfs_growfs /                                         # xfs
```

#### 场景 3：修改 vCPU 或内存

```bash
# 查看当前配置
virsh dominfo <vm> | grep -E "CPU|内存"

# 设置最大值（关机后生效）
virsh setmaxmem <vm> 8G --config
virsh setvcpus <vm> 4 --config --maximum

# 设置当前值
virsh setmem <vm> 4G --config
virsh setvcpus <vm> 4 --config

# 重启生效
virsh shutdown <vm> && virsh start <vm>
```

#### 场景 4：虚拟机无法启动

```bash
# 1. 查看日志
tail -50 /var/log/libvirt/qemu/<vm-name>.log

# 2. 常见原因
# - 磁盘文件不存在或权限错误
virsh domblklist <vm>
ls -la /var/lib/libvirt/images/<vm>.qcow2

# - SELinux 阻止
ausearch -m avc -ts recent | grep qemu
restorecon -Rv /var/lib/libvirt/images/

# - 资源不足
virsh nodeinfo                                       # CPU/内存总量
free -h                                              # 宿主机可用内存

# 3. 尝试手动启动 QEMU（调试用）
ps aux | grep qemu | grep <vm>                       # 从已有进程看完整命令行
```
