# OpenStack 运维命令手册

> 适用场景：OpenStack 云平台日常管理、虚拟机/网络/存储排障
> 适用版本：OpenStack Train+/Wallaby+/Xena+（涵盖核心服务）
> 前置阅读：[01-linux-basics.md](01-linux-basics.md)

---

## 目录

- [1. OpenStack 架构速览](#1-openstack-架构速览)
- [2. 通用 openstack CLI](#2-通用-openstack-cli)
- [3. 认证与项目管理](#3-认证与项目管理)
- [4. 计算 (Nova)](#4-计算-nova)
- [5. 镜像 (Glance)](#5-镜像-glance)
- [6. 网络 (Neutron)](#6-网络-neutron)
- [7. 存储 (Cinder) — 块存储](#7-存储-cinder--块存储)
- [8. 存储 (Manila) — 文件存储](#8-存储-manila--文件存储)
- [9. 对象存储 (Swift)](#9-对象存储-swift)
- [10. 编排 (Heat)](#10-编排-heat)
- [11. 监控与计量 (Ceilometer/Gnocchi)](#11-监控与计量-ceilometergnocchi)
- [12. 日志排查与定位](#12-日志排查与定位)
- [13. 常用排查场景速查](#13-常用排查场景速查)
- [附录：命令快速索引](#附录命令快速索引)

---

## 1. OpenStack 架构速览

### 核心服务

| 服务 | 项目名 | 端口 | 功能 |
|------|--------|------|------|
| 认证 | Keystone | 5000 | 身份认证与权限 |
| 计算 | Nova | 8774 | 虚拟机生命周期管理 |
| 镜像 | Glance | 9292 | 虚拟机镜像管理 |
| 网络 | Neutron | 9696 | 虚拟网络/子网/路由 |
| 块存储 | Cinder | 8776 | 云硬盘管理 |
| 对象存储 | Swift | 8080 | 对象存储 |
| 文件存储 | Manila | 8786 | 共享文件系统 |
| 编排 | Heat | 8004 | 资源编排 |
| 监控 | Ceilometer | 8777 | 计量与监控 |
| 面板 | Horizon | 80/443 | Web 管理界面 |

### 认证方式（在控制节点执行前需先 source）

```bash
# 加载管理员凭证
source /root/admin-openrc      # 或 /etc/kolla/admin-openrc.sh
source /root/keystonerc_admin   # 或

# 加载普通用户凭证
source /root/demo-openrc

# 验证是否生效
openstack token issue
```

---

## 2. 通用 openstack CLI

```bash
# 查看版本
openstack --version

# 通用选项
openstack <资源> list                               # 列出资源
openstack <资源> show <id/name>                     # 查看详情
openstack <资源> create [选项]                       # 创建
openstack <资源> set <id/name> --属性 值             # 修改属性
openstack <资源> unset <id/name> --属性              # 取消属性
openstack <资源> delete <id/name>                    # 删除

# 常用资源类型
# server       —— 虚拟机（Nova）
# image        —— 镜像（Glance）
# flavor       —— 规格（CPU/内存）
# network      —— 网络（Neutron）
# subnet       —— 子网
# router       —— 路由器
# volume       —— 云硬盘（Cinder）
# project      —— 项目/租户（Keystone）
# user         —— 用户
# role         —— 角色
```

---

## 3. 认证与项目管理

### 项目（Project / Tenant）

```bash
# 查看项目
openstack project list
openstack project show <project-name>

# 创建项目
openstack project create --description "生产环境" production

# 禁用/启用项目
openstack project set <project> --disable
openstack project set <project> --enable
```

### 用户管理

```bash
openstack user list
openstack user show <username>
openstack user create --project production --password xxxx <username>
openstack user set <username> --password xxxx
openstack user delete <username>
```

### 角色与权限

```bash
openstack role list
openstack role create admin
openstack role add --user <user> --project <project> admin
openstack role remove --user <user> --project <project> admin
openstack role assignment list --user <user> --project <project>
```

---

## 4. 计算 (Nova)

### 虚拟机生命周期

```bash
# 列出虚拟机
openstack server list                                  # 当前项目
openstack server list --all-projects                   # 所有项目（admin）
openstack server list --host <compute-node>             # 指定计算节点
openstack server list --status ERROR                   # 只看异常

# 创建虚拟机
openstack server create \
  --flavor m1.medium \
  --image centos-7 \
  --network internal-net \
  --key-name mykey \
  --security-group default \
  my-vm-name

# 使用具体参数（指定可用域/主机）
openstack server create \
  --flavor m1.large \
  --image ubuntu-22.04 \
  --nic net-id=<network-uuid> \
  --availability-zone nova:compute-01 \
  --block-device source=image,id=<image-uuid>,dest=volume,size=50,shutdown=remove \
  my-instance

# 查看详情（排障核心）
openstack server show <server-id>
nova show <server-id>                                  # 旧版命令
openstack console log show <server>                    # 查看控制台日志

# 操作虚拟机
openstack server start <server>
openstack server stop <server>
openstack server reboot <server>                        # 软重启
openstack server reboot --hard <server>                 # 硬重启
openstack server suspend <server>                       # 挂起
openstack server resume <server>                        # 恢复
openstack server rescue <server>                        # 救援模式
openstack server unrescue <server>

# 删除
openstack server delete <server>
```

### 修改虚拟机

```bash
# 变更规格（热迁移 resize）
openstack server resize --flavor m1.large <server>
openstack server resize confirm <server>                 # 确认变更
openstack server resize revert <server>                  # 回滚变更

# 重建（更换镜像启动）
openstack server rebuild --image <new-image> <server>

# 挂载/卸载云硬盘
openstack server add volume <server> <volume>
openstack server remove volume <server> <volume>

# 浮动 IP 管理
openstack floating ip create public-net
openstack server add floating ip <server> <floating-ip>
openstack server remove floating ip <server> <floating-ip>
```

### 虚拟机排障常用命令

```bash
# 查看虚拟机所在物理机（排障第一步）
openstack server show <server> | grep OS-EXT-SRV-ATTR:host

# 检查虚拟机状态
openstack server show <server> -c status -c task_state -c power_state

# 查看控制台输出（类似物理机的 VGA 输出）
openstack console log show <server>                     # 启动日志
openstack console url show <server>                     # VNC 控制台 URL

# 查看迁移历史
openstack server show <server> | grep OS-EXT-SRV-ATTR:host

# 查看虚拟机在计算节点的进程（在计算节点上）
ps aux | grep qemu
virsh list                                               # libvirt 查看
virsh dumpxml <instance-uuid>                            # 查看 XML 定义
```

### 计算节点管理

```bash
# 查看计算节点列表
openstack host list
openstack compute service list
nova service-list                                        # 旧版

# 启用/禁用计算节点
openstack compute service set <host> nova-compute --enable/--disable

# 查看计算节点资源
openstack host show <compute-node>
openstack hypervisor list
openstack hypervisor show <compute-node>
openstack hypervisor stats show

# 迁移虚拟机（ evacuate— 宿主机宕机时用）
nova host-evacuate --target_host <target> <source-host>  # 旧版
openstack server migrate <server>                         # 在线迁移（需配置共享存储）
```

---

## 5. 镜像 (Glance)

```bash
# 镜像操作
openstack image list
glance image-list                                         # 旧版

openstack image show <image-id>
openstack image create "CentOS 7" --file centos7.qcow2 --disk-format qcow2 --container-format bare --public
openstack image delete <image-id>

# 常用选项
# --public      所有项目可见
# --private     仅本项目可见
# --protected   禁止删除
# --disk-format qcow2 / raw / vmdk
# --min-disk 20    最低系统盘要求
# --min-ram 2048   最低内存要求

# 导出镜像
openstack image save --file ./backup.qcow2 <image-id>

# 更新镜像属性
openstack image set <image-id> --name "new-name" --property os_version=7.9
```

---

## 6. 网络 (Neutron)

### 基础网络查看

```bash
# 网络列表
openstack network list
openstack network show <network>
neutron net-list                                           # 旧版

# 子网
openstack subnet list
openstack subnet show <subnet>
neutron subnet-list

# 端口
openstack port list
openstack port list --server <server-id>                  # 查看虚拟机关联端口
openstack port show <port-id>
openstack port list --device-id <server-id>
```

### 网络创建

```bash
# 创建网络（Provider — 直接连接物理网络）
openstack network create --provider-physical-network physnet1 \
  --provider-network-type flat \
  --external \
  public-net

# 创建网络（Self-Service — overlay 网络）
openstack network create private-net

# 创建子网
openstack subnet create --network private-net \
  --subnet-range 10.0.1.0/24 \
  --dhcp \
  --dns-nameserver 8.8.8.8 \
  private-subnet

# 创建路由器
openstack router create router1
openstack router add subnet router1 private-subnet         # 连接私有子网
openstack router set router1 --external-gateway public-net  # 设置外网网关
```

### 安全组

```bash
openstack security group list
openstack security group show <group>

# 创建规则
openstack security group rule create --protocol tcp --dst-port 22:22 --remote-ip 0.0.0.0/0 <group>
openstack security group rule create --protocol icmp --remote-ip 0.0.0.0/0 <group>

# 允许所有内部通信
openstack security group rule create --protocol tcp --dst-port 1:65535 --remote-group <group-id> <group>
```

### 网络排查常用命令

```bash
# 查看 DHCP 租约
neutron dhcp-agent-list-hosting-net <network>

# 查看路由器命名空间（网络节点上执行）
ip netns
# qrouter-xxx  → 路由器命名空间
# qdhcp-xxx    → DHCP 命名空间

# 进入路由器命名空间排查
ip netns exec qrouter-<uuid> ping 10.0.1.1
ip netns exec qrouter-<uuid> ip addr
ip netns exec qrouter-<uuid> iptables -t nat -L

# 查看端口绑定状态（排障关键）
openstack port show <port-id> -c binding_host_id -c binding_vnic_type -c binding_vif_type

# 端口未绑定的常见原因：
#   1. Nova 和 Neutron 通信异常
#   2. 计算节点上的 OVS/linuxbridge agent 挂了
#   3. 配额限制
```

### 网络 Agent 管理

```bash
# 查看网络 Agent 状态
openstack network agent list
openstack network agent list --agent-type dhcp
openstack network agent list --agent-type l3
openstack network agent list --agent-type open-vswitch
openstack network agent list --agent-type linux-bridge

# 查看 Agent 详情
openstack network agent show <agent-id>

# 查看 Agent 是否存活（在对应节点上）
systemctl status neutron-dhcp-agent
systemctl status neutron-l3-agent
systemctl status neutron-openvswitch-agent
systemctl status neutron-linuxbridge-agent
systemctl status neutron-metadata-agent
```

---

## 7. 存储 (Cinder) — 块存储

```bash
# 查看云硬盘
openstack volume list
openstack volume list --all-projects                      # 所有项目（admin）
openstack volume show <volume-id>
cinder list                                                # 旧版

# 创建云硬盘
openstack volume create --size 50 --image centos-7 --bootable boot-volume
openstack volume create --size 100 --volume-type SSD --name data-disk

# 删除
openstack volume delete <volume-id>

# 快照
openstack volume snapshot list
openstack volume snapshot create --volume <volume-id> snapshot1
openstack volume snapshot delete <snapshot-id>

# 从快照创建云硬盘
openstack volume create --snapshot <snapshot-id> --size 100 restored-volume

# 扩容
openstack volume set <volume-id> --size 200                 # 扩容到 200G
# 注意：扩容后须在系统内扩展分区（guest 内部操作）

# 查看存储后端
cinder service-list
openstack volume service list
```

### Cinder 排障

```bash
# 查看云硬盘所在存储节点
openstack volume show <volume-id> | grep "os-vol-host-attr:host"

# 查看后端状态
cinder service-list | grep cinder-volume

# 云硬盘状态为 error 时
openstack volume delete <volume-id>        # 先删
# 或
openstack volume reset state --state available <volume-id>  # 强制修正状态

# 查看存储后端详细信息
cat /etc/cinder/cinder.conf | grep enabled_backends
lsblk                                              # 查看后端存储设备
```

---

## 8. 存储 (Manila) — 文件存储

```bash
# 查看共享文件系统
manila list

# 创建共享
manila create --share-type default --name myshare CEPHFS 10    # 10GB 的 CephFS 共享
manila access-allow myshare ip 10.0.0.0/24                     # 授权网段访问

# 挂载到客户端（需要 nfs-utils / ceph-common）
mount -t nfs <manila-ip>:/shares/myshare /mnt/share
```

---

## 9. 对象存储 (Swift)

```bash
# Container 操作
swift list
swift post my-container                         # 创建 container
swift delete my-container

# Object 操作
swift upload my-container /path/to/file
swift download my-container file
swift list my-container
swift delete my-container file
swift stat my-container                         # 查看状态

# 临时 URL（临时访问权限）
swift tempurl GET 3600 /v1/AUTH_xxx/container/object key
```

---

## 10. 编排 (Heat)

```bash
# 栈管理
openstack stack list
openstack stack show <stack-name>
openstack stack create --template server.yaml --parameters "key=value" my-stack
openstack stack update --template server.yaml my-stack
openstack stack delete my-stack

# 查看事件（排障关键）
openstack stack event list my-stack
openstack stack event show my-stack <event-id>

# 查看输出
openstack stack output list my-stack
openstack stack output show my-stack <output-key>

# 查看资源状态
openstack stack resource list my-stack
openstack stack resource show my-stack <resource-name>
```

---

## 11. 监控与计量 (Ceilometer/Gnocchi)

```bash
# 查看资源使用（在控制节点上）
openstack metric list                                     # 查看指标列表
openstack metric show <metric-id>

# 旧版 Ceilometer
ceilometer meter-list
ceilometer sample-list --meter cpu_util --query "resource_id=<server-id>"

# 查看实例使用情况（原始方式，无需监控组件）
openstack server show <server> -c OS-SRV-USG:launched_at -c OS-SRV-USG:terminated_at

# 在计算节点查看虚拟机 CPU/内存实际使用
virsh dominfo <instance-uuid>
virsh domstats <instance-uuid>
```

---

## 12. 日志排查与定位

### 各服务日志位置

| 服务 | 日志路径 |
|------|---------|
| Nova | `/var/log/nova/nova-{api,scheduler,conductor,compute}.log` |
| Neutron | `/var/log/neutron/neutron-{server,dhcp,l3,ovs-agent}.log` |
| Cinder | `/var/log/cinder/cinder-{api,scheduler,volume}.log` |
| Glance | `/var/log/glance/glance-{api,registry}.log` |
| Keystone | `/var/log/keystone/keystone.log` |
| Heat | `/var/log/heat/heat-{api,engine}.log` |
| RabbitMQ | `/var/log/rabbitmq/` |
| MySQL | `/var/log/mysql/` |

> 如使用 Kolla 容器化部署，日志在 `/var/log/kolla/<service>/` 下

### 日志排查常用技巧

```bash
# 查看 Nova 错误
grep -i "error\|traceback" /var/log/nova/nova-compute.log | tail -50

# 查看 Neutron 错误
grep -i "error\|traceback" /var/log/neutron/neutron-server.log | tail -30

# 实时跟踪
tail -f /var/log/nova/nova-compute.log
tail -f /var/log/neutron/neutron-server.log

# 根据虚拟机 UUID 全局搜索
grep "<instance-uuid>" /var/log/nova/*.log
grep "<instance-uuid>" /var/log/neutron/*.log

# 根据 Request ID 关联多个日志（OpenStack 分布式追踪）
grep "<request-id>" /var/log/nova/*.log /var/log/neutron/*.log /var/log/cinder/*.log

# Kolla 容器化部署
docker logs <container-name>                              # 查看容器日志
docker logs -f nova_compute                               # 实时跟踪
cat /var/log/kolla/nova/nova-compute.log                  # 持久化日志
```

---

## 13. 常用排查场景速查

### 场景 1：虚拟机创建失败（ERROR 状态）

```bash
# 1. 查看虚拟机详情
openstack server show <server-id>
openstack console log show <server>

# 2. 查看 Nova 日志
grep -i "error\|traceback" /var/log/nova/nova-compute.log | tail -20
tail -50 /var/log/nova/nova-scheduler.log              # 调度阶段问题

# 3. 检查计算节点资源是否足够
openstack hypervisor stats show
free -h && df -h                                        # 在计算节点上

# 4. 检查镜像是否可用
openstack image show <image-id>

# 5. 检查网络是否可用
openstack network show <network-id>
openstack subnet show <subnet-id>

# 6. 检查配额是否超出
openstack quota show <project-id>

# 7. 查看计算节点 agent 是否正常
openstack compute service list
```

### 场景 2：虚拟机网络不通

```bash
# 1. 查看安全组是否放行
openstack security group rule list <group>

# 2. 查看浮动 IP 是否正确绑定
openstack server show <server> | grep addresses
openstack floating ip list

# 3. 查看端口状态
openstack port show <port-id> -c binding_host_id -c binding_vif_type -c device_owner

# 4. 检查 DHCP Agent
openstack network agent list --agent-type dhcp

# 5. 在 DHCP 命名空间中排查
# 网络节点上：
ip netns exec qdhcp-<net-uuid> ping <vm-ip>

# 6. 检查 OVS/LB Agent
openstack network agent list --agent-type open-vswitch
openstack network agent list --agent-type linux-bridge

# 7. 查看 Neutron 日志
grep -i "error\|traceback" /var/log/neutron/neutron-server.log | tail -20
```

### 场景 3：计算节点宕机后虚拟机恢复

```bash
# 1. 确认计算节点状态
openstack compute service list | grep <compute-node>
openstack hypervisor list | grep <compute-node>

# 2. 检查哪些虚拟机受影响
openstack server list --host <compute-node> --all-projects

# 3. 强制关机（如果状态未更新）
nova force-down --service <compute-node>

# 4. 疏散（在可恢复时使用）
nova host-evacuate --target_host <target-node> <source-node>

# 5. 或逐个重建
openstack server rebuild --image <original-image> <server-id>

# 6. 如果计算节点恢复后重新上线
openstack compute service set <node> nova-compute --enable
```

### 场景 4：云硬盘无法挂载或状态异常

```bash
# 1. 查看云硬盘状态
openstack volume show <volume-id>

# 2. 查看归属（是否已被其他虚机占用）
openstack volume show <volume-id> | grep attached

# 3. 强制修正状态（如果需要重新挂载）
openstack volume reset state --state available <volume-id>

# 4. 检查 Cinder 服务
cinder service-list

# 5. 查看 Cinder 日志
grep -i "error\|traceback" /var/log/cinder/cinder-volume.log | tail -20
```

### 场景 5：OpenStack 服务全部或部分不可用

```bash
# 1. 检查各个服务的 systemd 状态
systemctl status openstack-nova-api
systemctl status openstack-nova-scheduler
systemctl status openstack-nova-conductor
systemctl status openstack-nova-compute
systemctl status openstack-neutron-server
systemctl status openstack-cinder-api
# 或在 Kolla 部署中：
docker ps -a | grep nova
docker ps -a | grep neutron

# 2. 检查 RabbitMQ 集群状态
rabbitmqctl cluster_status
rabbitmqctl list_queues | grep -i "nova\|neutron\|cinder"

# 3. 检查数据库
mysql -h <db-host> -u root -p
# 在 MySQL 控制台：
# SHOW STATUS LIKE '%wsrep%';       # Galera 集群状态
# SHOW PROCESSLIST;

# 4. 检查 Keystone 连通性
openstack token issue                  # 基础认证是否正常
curl -s http://<keystone-ip>:5000/v3  # API 是否可达

# 5. 检查 Glance 连通性
openstack image list

# 6. 消息队列积压排查
rabbitmqctl list_queues name messages messages_ready messages_unacknowledged | sort -n -k2
```

### 场景 6：Kolla 容器化部署排障

```bash
# 查看容器状态
docker ps -a
docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# 查看容器日志
docker logs nova_compute --tail 50
docker logs -f neutron_server

# 进入容器排查
docker exec -it nova_compute bash
docker exec -it nova_compute cat /etc/nova/nova.conf

# 重启容器
docker restart nova_compute

# Kolla 重建特定容器
kolla-ansible -i multinode reconfigure --tags nova      # 重新配置
kolla-ansible -i multinode deploy --tags nova            # 重新部署

# 查看 Kolla 整体状态
kolla-ansible -i multinode check                        # 健康检查
```

---

## 附录：命令快速索引（按字母）

| 命令 | 分类 | 用途 |
|------|------|------|
| `ceilometer meter-list` | 监控 | 查看计量项 |
| `cinder service-list` | 存储 | 查看 Cinder 后端服务 |
| `docker logs` | 容器 | Kolla 容器日志 |
| `glance image-list` | 镜像 | 查看镜像列表 |
| `ip netns exec` | 网络 | 进入网络命名空间排障 |
| `kolla-ansible check` | 部署 | Kolla 健康检查 |
| `neutron agent-list` | 网络 | 查看网络 Agent |
| `nova service-list` | 计算 | 查看 Nova 服务 |
| `openstack compute service list` | 计算 | 计算服务状态 |
| `openstack console log show` | 计算 | 虚拟机控制台日志 |
| `openstack flavor list` | 计算 | 查看规格列表 |
| `openstack floating ip list` | 网络 | 浮动 IP 列表 |
| `openstack hypervisor list` | 计算 | 查看计算节点 |
| `openstack image list` | 镜像 | 查看镜像列表 |
| `openstack network agent list` | 网络 | 查看网络 Agent |
| `openstack network list` | 网络 | 查看网络列表 |
| `openstack port list` | 网络 | 查看端口列表 |
| `openstack project list` | 认证 | 项目列表 |
| `openstack quota show` | 认证 | 查看配额 |
| `openstack role list` | 认证 | 角色列表 |
| `openstack router list` | 网络 | 路由器列表 |
| `openstack security group list` | 网络 | 安全组列表 |
| `openstack server list` | 计算 | 虚拟机列表 |
| `openstack server show` | 计算 | 虚拟机详情 |
| `openstack stack list` | 编排 | 查看堆栈 |
| `openstack subnet list` | 网络 | 子网列表 |
| `openstack token issue` | 认证 | 验证认证 |
| `openstack user list` | 认证 | 用户列表 |
| `openstack volume list` | 存储 | 云硬盘列表 |
| `rabbitmqctl cluster_status` | 消息 | 消息队列状态 |
| `virsh list` | 计算 | libvirt 虚拟机列表 |

---

> **运维建议：**
> 1. 日常巡检关注 `openstack compute service list` 和 `openstack network agent list` —— 服务挂了第一时间发现
> 2. 虚拟机出问题最先看 `openstack server show` 和 `openstack console log show`
> 3. 网络不通先看安全组和浮动 IP，其次看 Neutron Agent 状态
> 4. 学会用 Request ID 串联各服务日志——这是 OpenStack 排障的核心技能

---

## 14. 组件原生命令参考（nova / cinder / neutron / glance / swift）

> 以下为各组件独立的 CLI 命令（非统一 `openstack` CLI）。运维老手常用，部分场景比 `openstack` 更快更灵活。

### Nova（计算）

```bash
# === 虚拟机管理 ===
nova list                                            # 列出所有虚拟机
nova list --all-tenants                              # 所有租户
nova list --host compute-01                          # 某计算节点上的虚拟机
nova list --name myvm                                # 按名称过滤
nova list --status ACTIVE                            # 按状态过滤
nova show <vm-id>                                    # 虚拟机详情
nova show <vm-id> | grep hypervisor                  # 看跑在哪台物理机上

# 创建与删除
nova boot --flavor m1.medium --image centos7 --nic net-id=<net-id> myvm
nova boot --flavor 2 --image centos7 --key-name mykey --user-data init.sh myvm
nova delete <vm-id>

# 操作
nova start <vm-id>                                   # 开机
nova stop <vm-id>                                    # 关机
nova reboot <vm-id>                                  # 软重启
nova reboot --hard <vm-id>                           # 硬重启
nova pause / unpause <vm-id>
nova suspend / resume <vm-id>
nova rescue <vm-id>                                  # 救援模式
nova unrescue <vm-id>
nova lock / unlock <vm-id>                           # 锁定（防误删）

# 迁移
nova live-migration <vm-id> <target-host>            # 热迁移
nova migrate <vm-id>                                 # 冷迁移
nova resize <vm-id> <new-flavor>                     # 变更规格
nova resize-confirm <vm-id>                          # 确认 resize
nova resize-revert <vm-id>                           # 回滚 resize
nova evacuate <vm-id> <target-host>                  # 疏散（宿主机宕机）

# 控制台
nova get-vnc-console <vm-id> novnc                   # 获取 VNC 链接
nova console-log <vm-id>                             # 控制台日志（排障必备）
nova console-log <vm-id> | tail -50

# === 计算节点管理 ===
nova host-list                                       # 列出所有计算节点
nova host-describe <host>                            # 节点资源详情
nova host-servers-migrate <host>                     # 迁移节点上所有虚拟机
nova service-list                                    # Nova 服务状态
nova service-enable <host> nova-compute              # 启用服务
nova service-disable <host> nova-compute             # 禁用服务
nova service-force-down <host> nova-compute          # 强制标记为 down

# === 规格与聚合 ===
nova flavor-list                                     # 规格列表
nova flavor-create m1.custom auto 2048 20 2          # 创建规格(名/ID/内存MB/磁盘GB/CPU)
nova flavor-delete <flavor-id>
nova aggregate-list                                  # 主机聚合
nova aggregate-create myagg                          # 创建聚合
nova aggregate-add-host <agg-id> <host>              # 加节点到聚合
nova aggregate-set-metadata <agg-id> ssd=true        # 设置元数据

# === 密钥与安全组 ===
nova keypair-list
nova keypair-add mykey > mykey.pem
nova keypair-delete mykey
nova secgroup-list
nova secgroup-list-rules default
nova secgroup-add-rule default tcp 22 22 0.0.0.0/0
```

### Cinder（块存储）

```bash
# === 云硬盘管理 ===
cinder list                                          # 所有云硬盘
cinder list --all-tenants
cinder show <vol-id>                                 # 详情
cinder show <vol-id> | grep os-vol-host-attr         # 所在存储后端
cinder show <vol-id> | grep status

# 创建与删除
cinder create 10                                     # 创建 10GB 云硬盘
cinder create --name myvol --volume-type ssd 50      # 指定类型和名称
cinder create --snapshot-id <snap-id> 50             # 从快照创建
cinder create --image-id <img-id> 50                 # 从镜像创建
cinder create --source-volid <vol-id> 50             # 从已有云硬盘克隆
cinder delete <vol-id>

# 挂载与卸载
cinder list | grep available                         # 看哪些可用
nova volume-attach <vm-id> <vol-id> /dev/vdb         # 挂载到虚拟机
nova volume-detach <vm-id> <vol-id>                  # 卸载

# 扩容
cinder extend <vol-id> 20                            # 扩容到 20GB（需虚拟机内再扩分区）

# === 快照与备份 ===
cinder snapshot-list
cinder snapshot-create --name mysnap <vol-id>
cinder snapshot-delete <snap-id>
cinder backup-list
cinder backup-create --name mybackup <vol-id>
cinder backup-restore <backup-id>                    # 恢复到新云硬盘

# === 状态修正 ===
cinder reset-state --state available <vol-id>        # 重置状态（排障用）
cinder reset-state --state error <vol-id>
cinder force-delete <vol-id>                         # 强制删除（卡在 deleting 时）

# === 类型与 QoS ===
cinder type-list
cinder type-create ssd                              # 创建卷类型
cinder type-key ssd set volume_backend_name=lvm-ssd  # 设置后端
cinder qos-list
cinder qos-create --consumer front-end --property read_iops_sec=1000 myqos
cinder qos-associate <qos-id> <type-id>

# === 服务状态 ===
cinder service-list
cinder host-list                                     # 存储后端节点
cinder get-pools                                     # 存储池信息
```

### Neutron（网络）

```bash
# === 网络 ===
neutron net-list
neutron net-show <net-id>
neutron net-create mynet                             # 创建网络
neutron net-create --provider:network_type vlan --provider:physical_network physnet1 mynet
neutron net-delete <net-id>

# === 子网 ===
neutron subnet-list
neutron subnet-show <subnet-id>
neutron subnet-create mynet 192.168.1.0/24 --name mysubnet --gateway 192.168.1.1
neutron subnet-delete <subnet-id>

# === 端口 ===
neutron port-list
neutron port-show <port-id>
neutron port-create mynet                            # 创建端口
neutron port-update <port-id> --name myport
neutron port-delete <port-id>

# === 路由器 ===
neutron router-list
neutron router-create myrouter
neutron router-gateway-set <router-id> <ext-net-id>   # 设置外网网关
neutron router-gateway-clear <router-id>
neutron router-interface-add <router-id> <subnet-id>  # 连接子网
neutron router-interface-delete <router-id> <subnet-id>

# === 浮动 IP ===
neutron floatingip-list
neutron floatingip-create <ext-net-id>               # 申请浮动 IP
neutron floatingip-associate <fip-id> <port-id>      # 绑定到端口
neutron floatingip-disassociate <fip-id>
neutron floatingip-delete <fip-id>

# === 安全组 ===
neutron security-group-list
neutron security-group-rule-list <sg-id>
neutron security-group-rule-create --direction ingress --protocol tcp --port-range-min 22 --port-range-max 22 <sg-id>
neutron security-group-rule-delete <rule-id>

# === Agent 管理 ===
neutron agent-list
neutron agent-list | grep -E "dhcp\|l3\|openvswitch"
neutron agent-show <agent-id>
neutron agent-update <agent-id> --admin-state-up false  # 禁用 Agent
neutron l3-agent-list-hosting-router <router-id>        # 路由器在哪个 L3 Agent
neutron dhcp-agent-list-hosting-net <net-id>            # 网络在哪个 DHCP Agent
neutron agent-delete <agent-id>                         # 删除已失联的 Agent

# === 排障命令 ===
neutron port-show <port-id> | grep binding             # 看端口绑定状态
neutron net-show <net-id> | grep provider              # 网络类型
neutron router-port-list <router-id>                   # 路由器上的端口
neutron net-list-on-dhcp-agent <agent-id>              # DHCP Agent 上的网络
neutron net-gateway-show <net-id>                      # 网关 IP
```

### Glance（镜像）

```bash
# === 镜像管理 ===
glance image-list
glance image-show <img-id>
glance image-create --name centos7 --disk-format qcow2 --container-format bare --file centos7.qcow2
glance image-update <img-id> --name new-name
glance image-update <img-id> --property os_distro=centos
glance image-delete <img-id>

# === 成员共享 ===
glance member-list --image-id <img-id>               # 镜像共享给哪些项目
glance member-create <img-id> <project-id>            # 共享
glance member-update <img-id> <project-id> accepted   # 接受

# === 下载导出 ===
glance image-download --file /tmp/centos7.qcow2 <img-id>
glance image-upload --file /tmp/custom.qcow2 <img-id>
```

### Swift（对象存储）

```bash
# === 容器与对象 ===
swift list                                           # 列出容器（桶）
swift list <container>                               # 列出容器内对象
swift stat <container>                               # 容器元信息
swift upload <container> /path/to/file               # 上传
swift download <container>                           # 下载整个容器
swift download <container> file.txt                  # 下载单个文件
swift delete <container>                             # 删除容器
swift delete <container> file.txt                    # 删除对象

# === 权限 ===
swift post <container> -r '.r:*'                     # 公开读
swift post <container> --read-acl 'admin:user'       # 指定用户读
swift post <container> -H 'X-Container-Meta-Web:true' # 自定义元数据

# === 临时 URL ===
swift tempurl GET 3600 /v1/account/container/object secretkey
# 生成有效期 1 小时的临时下载链接
```

---

## 附录：组件命令与 openstack 命令对应表

| 操作 | openstack CLI | 组件原生 CLI |
|------|-------------|-------------|
| 列出虚拟机 | `openstack server list` | `nova list` |
| 创建虚拟机 | `openstack server create` | `nova boot` |
| 迁移虚拟机 | `openstack server migrate` | `nova live-migration` |
| 列出云硬盘 | `openstack volume list` | `cinder list` |
| 创建云硬盘 | `openstack volume create` | `cinder create` |
| 列出网络 | `openstack network list` | `neutron net-list` |
| 创建子网 | `openstack subnet create` | `neutron subnet-create` |
| 列出镜像 | `openstack image list` | `glance image-list` |
| 列出容器 | `openstack container list` | `swift list` |

> `openstack` 命令本质上也是调用各组件 API，组件命令更贴近底层，排障时往往能给出更精确的错误信息。
