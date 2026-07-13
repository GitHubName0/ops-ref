# Kubernetes 运维命令手册

> 适用场景：K8s 集群日常管理、Pod/Service 排障、集群问题应急
> 前置阅读：[01-linux-basics.md](01-linux-basics.md)

---

## 目录

- [1. 基础概念速览](#1-基础概念速览)
- [2. kubectl 核心命令](#2-kubectl-核心命令)
- [3. Pod 管理](#3-pod-管理)
- [4. Deployment 管理](#4-deployment-管理)
- [5. Service 与网络](#5-service-与网络)
- [6. ConfigMap 与 Secret](#6-configmap-与-secret)
- [7. Namespace 与 RBAC](#7-namespace-与-rbac)
- [8. Node 与集群管理](#8-node-与集群管理)
- [9. 日志与监控](#9-日志与监控)
- [10. 持久化存储 (PV/PVC)](#10-持久化存储-pvpvc)
- [11. 常用排查场景速查](#11-常用排查场景速查)
- [附录：kubectl 速查表](#附录kubectl-速查表)

---

## 1. 基础概念速览

| 资源 | 缩写 | 说明 |
|------|------|------|
| Pod | `po` | 最小调度单元，包含一个或多个容器 |
| Deployment | `deploy` | 声明式更新 Pod，管理 ReplicaSet |
| Service | `svc` | 网络抽象层，Pod 间的服务发现 |
| ConfigMap | `cm` | 配置管理（非敏感） |
| Secret | 无 | 敏感信息存储（密码/密钥） |
| Namespace | `ns` | 资源隔离逻辑单元 |
| Node | `no` | 集群中的物理/虚拟机节点 |
| PersistentVolume | `pv` | 存储资源 |
| PersistentVolumeClaim | `pvc` | 存储资源申请 |
| Ingress | `ing` | HTTP/HTTPS 路由规则 |
| StatefulSet | `sts` | 有状态应用管理 |

### 集群架构速览

```
Control Plane (Master)
├── kube-apiserver      # 所有请求入口
├── kube-controller-manager  # 资源控制器
├── kube-scheduler      # Pod 调度
└── etcd                # 集群数据存储

Worker Node
├── kubelet             # 节点代理
├── kube-proxy          # 网络代理
└── container-runtime  # 容器运行时（containerd/docker）
```

---

## 2. kubectl 核心命令

```bash
# 基础语法
kubectl <动词> <资源类型> [资源名] [选项]

# 常用动词
get    # 查看资源
describe  # 查看资源详细信息
logs   # 查看 Pod 日志
exec   # 进入 Pod 执行命令
apply  # 声明式创建/更新（推荐）
delete # 删除资源
edit   # 在线编辑资源
```

### 常用选项

```bash
kubectl get pods -n kube-system              # 指定 Namespace
kubectl get pods --all-namespaces            # 所有 Namespace
kubectl get pods -o wide                     # 显示更多信息（IP/Node）
kubectl get pods -o yaml                     # 以 YAML 格式输出
kubectl get pods --show-labels               # 显示标签
kubectl get pods -l app=nginx                # 按标签过滤
kubectl get pods -w                          # 实时监听（watch）
kubectl api-resources                        # 查看所有资源类型
kubectl explain pod                          # 查看资源字段说明
```

---

## 3. Pod 管理

```bash
# 查看 Pod
kubectl get pods
kubectl get pods -o wide
kubectl describe pod <pod-name>               # 详细状态（排障第一步！）

# 创建 Pod
kubectl run nginx --image=nginx:latest --replicas=3    # 快速创建（测试用）
kubectl apply -f pod.yaml                                # 通过 YAML 创建（生产）

# 删除 Pod
kubectl delete pod <pod-name>
kubectl delete pod --all                    # 删光所有 Pod（⚠️ Deployment 会重建）

# 进入 Pod
kubectl exec -it <pod-name> -- /bin/bash
kubectl exec -it <pod-name> -c container-name -- /bin/sh  # 多容器 Pod 指定容器

# 查看 Pod 日志
kubectl logs <pod-name>
kubectl logs -f <pod-name>                  # 实时跟踪
kubectl logs --tail=100 <pod-name>          # 最后 100 行
kubectl logs -f --since=1h <pod-name>       # 最近 1 小时
kubectl logs -l app=nginx                   # 按标签查日志（多 Pod）

# 复制文件到/从 Pod
kubectl cp /local/file <pod-name>:/remote/path
kubectl cp <pod-name>:/remote/path /local/file

# 端口转发（调试用，不经过 Service）
kubectl port-forward pod/<pod-name> 8080:80
```

### Pod 状态解读

| 状态 | 含义 | 常见原因 |
|------|------|---------|
| `Pending` | 等待调度 | 资源不足、PVC 未绑定、镜像拉取失败 |
| `Running` | 正常运行 | - |
| `CrashLoopBackOff` | 反复崩溃 | 应用启动失败、配置错误、OOM |
| `ImagePullBackOff` | 镜像拉取失败 | 镜像名错误、仓库鉴权失败 |
| `Error` / `OOMKilled` | 运行错误 | 内存超限、代码异常 |
| `Terminating` | 正在终止 | 卡住可能由 finalizer 导致 |
| `Evicted` | 被驱逐 | 节点资源压力 |

---

## 4. Deployment 管理

```bash
# 基础操作
kubectl get deployments
kubectl describe deployment <name>
kubectl apply -f deployment.yaml

# 扩缩容
kubectl scale deployment <name> --replicas=5
kubectl autoscale deployment <name> --min=3 --max=10 --cpu-percent=80  # HPA

# 滚动更新
kubectl set image deployment/nginx nginx=nginx:1.25   # 更新镜像
kubectl rollout status deployment/nginx               # 查看更新状态
kubectl rollout history deployment/nginx               # 查看更新历史

# 回滚
kubectl rollout undo deployment/nginx                  # 回滚到上一个版本
kubectl rollout undo deployment/nginx --to-revision=2  # 回滚到指定版本

# 暂停/恢复（金丝雀发布用）
kubectl rollout pause deployment/nginx
kubectl rollout resume deployment/nginx

# 重启 Pod（不修改配置）
kubectl rollout restart deployment/nginx
```

### 常见更新策略

```yaml
# 滚动更新（默认）
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxSurge: 25%        # 允许超出期望 Pod 数
    maxUnavailable: 25%  # 允许不可用 Pod 数

# 重建（先删后建，适合 Dev）
strategy:
  type: Recreate
```

---

## 5. Service 与网络

```bash
# 查看 Service
kubectl get svc
kubectl describe svc <name>
kubectl get endpoints                     # 查看后端 Pod 列表

# 创建 Service（暴露 Deployment）
kubectl expose deployment nginx --port=80 --type=ClusterIP
kubectl expose deployment nginx --port=80 --type=NodePort
kubectl expose deployment nginx --port=80 --type=LoadBalancer

# Service 类型
# ClusterIP: 集群内部访问（默认）
# NodePort:  节点端口访问（外部可通过节点 IP:端口访问）
# LoadBalancer: 云厂商负载均衡器

# Ingress 管理
kubectl get ingress
kubectl describe ingress <name>
```

### 网络排查常用命令

```bash
# 查看集群 DNS 是否正常
kubectl run -it --rm debug --image=busybox -- /bin/sh
nslookup <service-name>                   # DNS 解析是否正常
# exit

# 查看网络策略
kubectl get networkpolicies

# 查看 Service 后端是否正常
kubectl get endpoints <service-name>
kubectl describe svc <service-name>       # 看 Selector 是否匹配 Pod 标签
```

---

## 6. ConfigMap 与 Secret

```bash
# ConfigMap
kubectl create configmap app-config --from-file=config.yaml
kubectl create configmap app-config --from-literal=key=value
kubectl get configmap
kubectl get configmap app-config -o yaml
kubectl delete configmap app-config

# Secret（base64 编码存储，不是加密！）
kubectl create secret generic db-secret --from-literal=password=xxxx
kubectl create secret tls tls-secret --cert=tls.crt --key=tls.key
kubectl get secrets
kubectl get secret db-secret -o yaml
kubectl get secret db-secret -o jsonpath='{.data.password}' | base64 -d  # 解码
```

---

## 7. Namespace 与 RBAC

```bash
# Namespace
kubectl get namespaces
kubectl create namespace myapp
kubectl delete namespace myapp            # 会删除该 ns 下所有资源！⚠️

# 切换默认 Namespace（避免每次都写 -n）
kubectl config set-context --current --namespace=myapp

# RBAC 常用操作
kubectl get serviceaccounts
kubectl get roles --all-namespaces
kubectl get rolebindings --all-namespaces
kubectl get clusterroles
kubectl get clusterrolebindings
```

---

## 8. Node 与集群管理

```bash
# 查看节点
kubectl get nodes
kubectl get nodes -o wide
kubectl describe node <node-name>          # 查看节点资源使用/问题

# 节点维护
kubectl cordon <node-name>                # 标记为不可调度（已有 Pod 不受影响）
kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data  # 排空节点
kubectl uncordon <node-name>              # 恢复调度

# 节点标签
kubectl label node <node-name> disktype=ssd
kubectl label node <node-name> node-role.kubernetes.io/worker-

# 集群信息
kubectl cluster-info                       # 查看集群信息
kubectl cluster-info dump                  # 集群诊断 dump
kubectl config view                        # 查看 kubeconfig
kubectl config get-contexts                # 查看所有上下文
kubectl config use-context <context>       # 切换集群上下文
kubectl top node                           # 节点资源使用
kubectl top pod                            # Pod 资源使用（需 metrics-server）
```

---

## 9. 日志与监控

```bash
# 核心组件日志（通过 journalctl）
journalctl -u kubelet -f                   # kubelet 实时日志
journalctl -u kubelet --since "1 hour ago"

# 控制平面组件（静态 Pod 用 kubectl）
kubectl logs -n kube-system kube-apiserver-<node>
kubectl logs -n kube-system kube-controller-manager-<node>
kubectl logs -n kube-system kube-scheduler-<node>
kubectl logs -n kube-system etcd-<node>

# coredns 日志
kubectl logs -n kube-system -l k8s-app=kube-dns

# 容器日志清理
# journalctl 限制（防止日志爆盘）
journalctl --vacuum-size=500M             # 限制日志大小
journalctl --vacuum-time=7d               # 限制日志保留天数
```

---

## 10. 持久化存储 (PV/PVC)

```bash
# 查看存储资源
kubectl get pv                            # 查看持久卷
kubectl get pvc                           # 查看存储申请
kubectl get storageclass                  # 查看存储类

# 常见排查
kubectl describe pvc <name>               # PVC 为何 Pending
# PVC Pending 常见原因：
#   1. 没有匹配的 PV
#   2. StorageClass 不存在或 Provisioner 异常
kubectl describe pv <name>                # 查看 PV 状态
```

### 存储简表

| 场景 | StorageClass | 说明 |
|------|-------------|------|
| 本地测试 | `manual` | 手动创建 PV |
| 云平台 | `standard` (GKE) / `gp2` (EKS) / `managed-csi` (AKS) | 自动 Provision |
| 生产建议 | 使用 CSI 驱动 | 推荐，功能最全 |

---

## 11. 常用排查场景速查

### 场景 1：Pod 一直 Pending

```bash
# 第一步：看为什么 Pending
kubectl describe pod <pod-name>
# 关注 Events 部分的提示

# 常见原因：
#   0/1 nodes are available: 1 Insufficient cpu  → 资源不足，加节点或调小 request
#   0/1 nodes are available: 1 node(s) had taint → 节点有污点，加 tolerations
#   0/1 nodes are available: 1 node(s) didn't match node selector → 标签不匹配
#   waiting for a volume to be created → PVC 未绑定

# 检查节点资源
kubectl top node
kubectl describe node <node-name> | grep -A 5 "Allocated resources"
```

### 场景 2：Pod CrashLoopBackOff

```bash
# 第一步：看日志
kubectl logs <pod-name> --previous          # 看上次启动的日志（关键！）

# 第二步：看 Events
kubectl describe pod <pod-name> | grep -A 10 Events

# 第三步：如果是 OOM
kubectl describe pod <pod-name> | grep -i "OOM\|memory"
# 解决：加大 resources.limits.memory

# 第四步：如果是启动失败
kubectl exec -it <pod-name> -- /bin/sh      # 如果还能进入
# 检查配置、环境变量、依赖服务是否就绪
```

### 场景 3：Service 访问不通

```bash
# 1. 检查 Service 本身
kubectl get svc <name>
kubectl describe svc <name>                 # 看 Selector 和 Endpoints

# 2. 检查 Endpoints 是否有地址
kubectl get endpoints <name>
# Endpoints 为空 → Selector 没匹配到 Pod

# 3. 检查 Pod 标签是否匹配
kubectl get pods --show-labels
# 对照 Service 的 Selector

# 4. 检查 Pod 端口是否和应用一致
kubectl describe pod <pod-name> | grep -i port

# 5. 直接通过 Pod IP 测试
kubectl get pods -o wide                    # 获取 Pod IP
# 在集群内节点或另一个 Pod 中 curl Pod_IP:Port
```

### 场景 4：Node NotReady

```bash
# 1. 查看节点状态
kubectl describe node <node-name> | grep -i "condition\|Ready"

# 2. SSH 到节点上检查
ssh user@node-ip
systemctl status kubelet                    # kubelet 是否运行
journalctl -u kubelet --since "10 min ago"  # kubelet 日志
systemctl status containerd                 # 容器运行时
df -h                                       # 磁盘是否满
free -h                                     # 内存是否够
top                                         # 负载是否过高

# 3. 检查证书是否过期
openssl x509 -in /var/lib/kubelet/pki/kubelet-client-current.pem -text -noout | grep -A2 Validity
```

### 场景 5：磁盘空间被容器日志撑爆

```bash
# 1. 查看各节点磁盘使用
df -h

# 2. 查看容器日志占空间
# 日志默认在 /var/log/pods/ 或 docker 的容器目录
du -sh /var/log/pods/
docker info | grep "Docker Root Dir"         # docker 数据目录
du -sh /var/lib/docker/containers/

# 3. 清理方案
# 方案 A：配置日志轮转（推荐）
# 创建 /etc/docker/daemon.json
# {
#   "log-driver": "json-file",
#   "log-opts": {
#     "max-size": "10m",
#     "max-file": "3"
#   }
# }
# systemctl restart docker

# 方案 B：紧急清理（脚本）
# echo "" > $(docker inspect --format='{{.LogPath}}' <container-id>)

# 方案 C：k8s 层面限制（推荐）
# 在 Pod Spec 中设置：
# spec.containers[].resources.limits.ephemeral-storage
```

### 场景 6：ETCD 备份与恢复

```bash
# 备份（Master 节点执行）
ETCDCTL_API=3 etcdctl snapshot save /backup/etcd-snapshot.db \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/healthcheck-client.crt \
  --key=/etc/kubernetes/pki/etcd/healthcheck-client.key

# 恢复
ETCDCTL_API=3 etcdctl snapshot restore /backup/etcd-snapshot.db \
  --data-dir=/var/lib/etcd-backup
```

### 场景 7：kubeadm 重置（最暴力但也最有用）

```bash
# 在问题节点执行
kubeadm reset
# 清理 CNI 配置
rm -rf /etc/cni/net.d
# 重新加入集群
kubeadm join <控制平面IP>:6443 --token <token> --discovery-token-ca-cert-hash <hash>
```

---

## 附录：kubectl 速查表

### 命令自动补全（建议配置好）

```bash
source <(kubectl completion bash)
echo "source <(kubectl completion bash)" >> ~/.bashrc

# 设置别名（省时利器）
alias k=kubectl
alias kg='kubectl get'
alias kgp='kubectl get pods'
alias kgd='kubectl get deployments'
alias kgs='kubectl get svc'
alias kd='kubectl describe'
alias kl='kubectl logs'
alias kaf='kubectl apply -f'
complete -F __start_kubectl k
```

### 常用组合命令

```bash
# 输出到文件（离线分析）
kubectl get pods -o wide > pods.txt
kubectl describe pods > pods-detail.txt
kubectl get all --all-namespaces > cluster-all.txt

# 删除所有 CrashLoopBackOff 的 Pod
kubectl delete pods --field-selector=status.phase=Failed

# 查看资源使用排序
kubectl top pod -A --sort-by=cpu
kubectl top pod -A --sort-by=memory

# 查看某节点上运行的 Pod
kubectl get pods --all-namespaces --field-selector=spec.nodeName=<node-name>

# 实时追踪 API Server 请求（调试用）
kubectl logs -n kube-system -l component=kube-apiserver -f
```
