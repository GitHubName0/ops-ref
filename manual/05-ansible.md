# Ansible 自动化运维手册

> 适用场景：Ansible 批量运维、自动化配置管理、Playbook 编写与排障
> 适用版本：Ansible Core ≥ 2.12 / ansible-base ≥ 2.10 / community.general
> 前置阅读：[01-linux-basics.md](01-linux-basics.md)

---

## 目录

- [1. Ansible 架构速览](#1-ansible-架构速览)
- [2. 安装与配置](#2-安装与配置)
- [3. Inventory 主机清单](#3-inventory-主机清单)
- [4. Ad-hoc 命令](#4-ad-hoc-命令)
- [5. Playbook 基础](#5-playbook-基础)
- [6. 核心模块速查](#6-核心模块速查)
  - [6.1 文件操作](#61-文件操作)
  - [6.2 命令执行](#62-命令执行)
  - [6.3 包管理](#63-包管理)
  - [6.4 服务管理](#64-服务管理)
  - [6.5 用户与权限](#65-用户与权限)
  - [6.6 网络检查](#66-网络检查)
  - [6.7 系统信息](#67-系统信息)
  - [6.8 容器管理](#68-容器管理)
- [7. 变量与 Facts](#7-变量与-facts)
- [8. 模板 (Jinja2)](#8-模板-jinja2)
- [9. 条件与循环](#9-条件与循环)
- [10. Roles 角色](#10-roles-角色)
- [11. Ansible Vault 加密](#11-ansible-vault-加密)
- [12. Tags 与 Limit](#12-tags-与-limit)
- [13. 常用排查场景速查](#13-常用排查场景速查)
- [附录：快速索引](#附录快速索引)

---

## 1. Ansible 架构速览

### 核心概念

| 概念 | 说明 |
|------|------|
| **Control Node** | 安装 Ansible 的控制节点（可以是任意 Linux 机器） |
| **Managed Node** | 被管理的目标主机（通过 SSH 连接） |
| **Inventory** | 主机清单（INI 或 YAML 格式，定义哪些主机被管理） |
| **Module** | 执行特定任务的代码单元（如 `copy`、`yum`、`service`） |
| **Playbook** | YAML 格式的任务编排文件（一组 plays 的有序集合） |
| **Role** | Playbook 的组织单元（按功能拆分 tasks/handlers/vars/templates） |
| **Task** | Playbook 中最小的执行单元（调用一个模块） |
| **Handler** | 由 notify 触发的特殊 task（如重启服务） |
| **Fact** | 目标主机的系统信息（由 Ansible 自动收集，以变量形式暴露） |

### 执行模式

```
Control Node                    Managed Nodes
┌─────────────────┐            ┌──────────────┐
│  Playbook.yml   │            │ 192.168.1.10 │
│       ↓         │   SSH      ├──────────────┤
│  Ansible Engine │ ─────────→ │ 192.168.1.11 │
│  (Python)       │   (模块推  ├──────────────┤
│       ↑         │    送+执  │ 192.168.1.12 │
│  Inventory      │    行)    └──────────────┘
└─────────────────┘
```

Ansible 是无代理架构（Agentless），通过 SSH 把模块推送到目标主机执行，执行完即清理，不在目标主机上驻留进程。

### 工作流程

```text
1. 控制节点读取 Inventory（确定目标主机）
2. 加载变量（group_vars / host_vars / play vars）
3. 按 Playbook 顺序执行 plays
4. 每个 Play 内按 tasks 顺序依次执行
5. 每个 task 调用一个模块，模块推送到远端执行
6. 模块执行完毕后返回 JSON 结果
7. 结果中可以触发 handler（如配置变更后重启服务）
```

---

## 2. 安装与配置

### 安装

```bash
# CentOS / RHEL / Rocky — EPEL 源安装
yum install -y epel-release
yum install -y ansible

# Ubuntu / Debian — PPA 安装
apt update
apt install -y software-properties-common
add-apt-repository --yes --update ppa:ansible/ansible
apt install -y ansible

# 验证安装
ansible --version
# 输出示例：
# ansible [core 2.15.x]
#   config file = /etc/ansible/ansible.cfg
#   python version = 3.9.x

# Pip 安装（推荐，获取最新版）
pip3 install ansible
```

### 主配置文件

```bash
# 配置文件查找顺序（第一个找到的生效）：
# 1. $ANSIBLE_CONFIG 环境变量
# 2. ./ansible.cfg（当前目录）
# 3. ~/.ansible.cfg（用户主目录）
# 4. /etc/ansible/ansible.cfg（全局）

# 生成默认配置
ansible-config init --disabled > ansible.cfg

# 查看当前生效配置
ansible-config list
ansible-config dump
```

### 最小配置示例

```ini
# ansible.cfg
[defaults]
inventory = hosts.ini              # 主机清单文件
host_key_checking = False          # 首次连接跳过 Host Key 检查（仅内网安全环境）
remote_user = root                 # SSH 远程用户
timeout = 30                       # SSH 连接超时（秒）

[ssh_connection]
pipelining = True                  # 开启管道加速，大幅提升执行效率
control_path = /tmp/%%h-%%r-%%p   # SSH Control Master 路径
```

### SSH 免密配置（必须）

```bash
# 控制节点生成密钥
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519 -N ""

# 分发公钥到目标主机
ssh-copy-id -i ~/.ssh/id_ed25519.pub root@192.168.1.10
ssh-copy-id -i ~/.ssh/id_ed25519.pub root@192.168.1.11

# 验证免密登录
ssh root@192.168.1.10 "hostname"

# SSH Config 简化（~/.ssh/config）
cat >> ~/.ssh/config << 'EOF'
Host 192.168.1.*
  User root
  IdentityFile ~/.ssh/id_ed25519
  StrictHostKeyChecking no
  UserKnownHostsFile /dev/null
EOF
```

---

## 3. Inventory 主机清单

### INI 格式（传统用法）

```ini
# hosts.ini
[web]                          # 主机组
192.168.1.10 ansible_host=web01.example.com
192.168.1.11

[db]
db1 ansible_host=192.168.1.20 ansible_user=admin
db2 ansible_host=192.168.1.21 ansible_port=2222

[proxy]
192.168.1.30

[all:vars]                     # 全局变量
ntp_server = ntp.example.com
proxy_server = proxy.example.com

[web:vars]                     # 组变量
http_port = 8080
```

### YAML 格式（推荐，更适合复杂场景）

```yaml
# hosts.yml
all:
  children:
    web:
      hosts:
        192.168.1.10:
          ansible_host: web01.example.com
        192.168.1.11:
    db:
      hosts:
        db1:
          ansible_host: 192.168.1.20
          ansible_user: admin
        db2:
          ansible_host: 192.168.1.21
          ansible_port: 2222
    proxy:
      hosts:
        192.168.1.30:
    prod:                       # 生产环境分组
      children:
        web:
        db:
      vars:
        env: production
        log_level: warn
```

### 常用内置变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `ansible_host` | 主机名 | 实际连接的 SSH 地址 |
| `ansible_port` | 22 | SSH 端口 |
| `ansible_user` | root | SSH 用户 |
| `ansible_ssh_pass` | — | SSH 密码（建议用 Vault 加密） |
| `ansible_become` | false | 是否提权执行 |
| `ansible_become_user` | root | 提权到哪个用户 |
| `ansible_become_method` | sudo | 提权方式（sudo/su/pbrun） |
| `ansible_python_interpreter` | /usr/bin/python3 | Python 解释器路径 |

### 组嵌套与继承

```ini
[linux:children]
web
db
proxy

[linux:vars]
ansible_user = ops
```

### 正则匹配和范围

```ini
# 范围批量定义
[app]
node-[01:10]    # → node-01, node-02, ..., node-10

[web]
www-[a:f]       # → www-a, www-b, ..., www-f

[prod-db]
db-[01:05].prod.example.com
```

---

## 4. Ad-hoc 命令

Ad-hoc 模式适用于快速单次操作，无需写 Playbook。

### 基础语法

```bash
ansible <主机组> -m <模块名> -a "<模块参数>"
ansible <主机组> -m shell -a "uptime"          # 批量执行命令
ansible <主机组> -m ping                        # 连通性测试
ansible all --list-hosts                        # 列出所有受管主机
```

### 常见模块 Ad-hoc 示例

```bash
# Ping 测试（返回 pong 即正常）
ansible all -m ping

# 执行命令
ansible web -m command -a "uptime"
ansible web -m shell -a "free -h && df -h"
ansible web -m raw -a "ifconfig eth0"           # raw 不依赖 Python（适用于网络设备）

# 文件操作
ansible web -m file -a "path=/data state=directory mode=0755"
ansible web -m copy -a "src=/etc/hosts dest=/tmp/hosts backup=yes"
ansible web -m fetch -a "src=/var/log/syslog dest=logs/ flat=yes"

# 包管理
ansible web -m yum -a "name=nginx state=latest"
ansible web -m apt -a "name=curl state=present update_cache=yes"

# 服务管理
ansible web -m service -a "name=nginx state=started enabled=yes"
ansible web -m systemd -a "name=nginx state=reloaded"

# 用户管理
ansible web -m user -a "name=deploy uid=2001 group=deploy state=present"

# 系统信息
ansible all -m setup -a "filter=ansible_distribution*"      # 筛选 fact
ansible all -m setup -a "filter=ansible_*_mb"               # 内存信息
ansible all -m setup | grep -i "ansible_processor"          # CPU 信息
```

### Ad-hoc 常用选项

```bash
# 常用参数
ansible web -m shell -a "df -h" -i hosts.ini        # 指定 inventory
ansible web -m copy -a "..." -b                      # --become 提权
ansible web -m yum -a "..." --become-user=admin      # 提权到指定用户
ansible web -m command -a "..." -f 10                # 并发数（默认 5）
ansible web -m shell -a "..." -o                     # 单行输出（紧凑模式）
ansible web -m shell -a "..." --check                # 检查模式（dry-run）
ansible web -m shell -a "sleep 5" --forks=20         # 设置并发进程数

# 连接测试
ansible all -m ping -vvv                             # 详细调试输出
ansible all -m ping --private-key ~/.ssh/new_key     # 指定密钥
```

---

## 5. Playbook 基础

### 最小 Playbook

```yaml
# deploy-nginx.yml
---
- name: 部署 Nginx Web 服务
  hosts: web                        # 目标主机组
  gather_facts: true                # 收集事实信息
  become: yes                       # 提权执行

  tasks:
    - name: 安装 Nginx
      yum:
        name: nginx
        state: present

    - name: 确保 Nginx 已启动并开机自启
      service:
        name: nginx
        state: started
        enabled: yes

    - name: 拷贝配置文件
      copy:
        src: ./files/nginx.conf
        dest: /etc/nginx/nginx.conf
        owner: root
        group: root
        mode: '0644'
      notify: restart nginx         # 触发 handler

  handlers:
    - name: restart nginx           # handler 名字与 notify 对应
      service:
        name: nginx
        state: restarted
```

### 执行 Playbook

```bash
# 基本用法
ansible-playbook deploy-nginx.yml

# 常用选项
ansible-playbook deploy-nginx.yml -i hosts.ini          # 指定 inventory
ansible-playbook deploy-nginx.yml --check               # dry-run 模拟执行
ansible-playbook deploy-nginx.yml --diff                # 显示文件差异
ansible-playbook deploy-nginx.yml -v                    # 详细输出（-v / -vv / -vvv）
ansible-playbook deploy-nginx.yml -v --step            # 交互式逐步骤执行
ansible-playbook deploy-nginx.yml --syntax-check        # 仅检查语法
ansible-playbook deploy-nginx.yml --list-tasks          # 列出将要执行的任务
ansible-playbook deploy-nginx.yml --list-hosts          # 列出受管主机
ansible-playbook deploy-nginx.yml --list-tags           # 列出所有 tags
ansible-playbook deploy-nginx.yml --tags "install,config"  # 按 tag 执行
ansible-playbook deploy-nginx.yml --skip-tags "debug"     # 跳过指定 tag

# 限制目标主机（调试用）
ansible-playbook deploy-nginx.yml --limit web-01        # 只对单台执行
ansible-playbook deploy-nginx.yml --limit "web-01,web-02"  # 多台

# 从特定 task 开始执行
ansible-playbook deploy-nginx.yml --start-at-task "安装 Nginx"

# 部署前语法检查（CI 中常用）
ansible-playbook deploy-nginx.yml --syntax-check || exit 1
```

### Playbook 错误处理

```yaml
- name: 错误处理示例
  hosts: all
  tasks:
    - name: 忽略错误继续执行
      command: /bin/false
      ignore_errors: yes

    - name: 设置任务超时时间
      command: /bin/sleep 30
      timeout: 10                   # 10 秒超时

    - name: 捕获失败并执行恢复
      block:
        - name: 有可能失败的任务
          command: /bin/false
      rescue:
        - name: 失败后的恢复动作
          debug:
            msg: "任务失败，执行恢复"
      always:
        - name: 无论如何都会执行
          debug:
            msg: "清理工作"

    - name: 注册变量并判断结果
      command: /usr/bin/uptime
      register: result
      failed_when:
        - '"up" not in result.stdout'
        - result.rc != 0

    - name: 条件式执行（仅当上次成功）
      debug:
        msg: "上一步执行成功后的后续操作"
      when: result.rc == 0

    - name: 幂等性检查 — changed_when
      shell: |
        if grep -q "OPTIONS" /etc/sysconfig/docker; then
          echo "already configured"
        else
          echo "OPTIONS=--log-level=warn" >> /etc/sysconfig/docker
          echo "changed"
        fi
      register: docker_config
      changed_when: "'changed' in docker_config.stdout"
```

---

## 6. 核心模块速查

### 6.1 文件操作

```yaml
- name: 创建目录
  file:
    path: /data/app
    state: directory
    owner: app
    group: app
    mode: '0755'

- name: 创建文件
  file:
    path: /data/app/config.yml
    state: touch
    owner: app
    mode: '0644'

- name: 拷贝文件
  copy:
    src: ./files/app.conf          # 相对路径，相对于 playbook 目录或 roles 目录
    dest: /etc/app/app.conf
    backup: yes                    # 备份已有文件（文件名加时间戳）
    owner: root
    group: root
    mode: '0644'
    validate: /usr/sbin/nginx -t %s  # 文件校验（配置生效前检查语法）

- name: 从远端拉取文件到控制节点
  fetch:
    src: /var/log/nginx/access.log
    dest: ./logs/{{ inventory_hostname }}/access.log
    flat: no

- name: 创建软链接
  file:
    src: /data/app/current
    dest: /data/app/releases/1.0.0
    state: link

- name: 删除文件/目录
  file:
    path: /tmp/old_config
    state: absent

- name: 使用模板生成配置文件
  template:
    src: nginx.conf.j2
    dest: /etc/nginx/nginx.conf
    owner: root
    group: root
    mode: '0644'
  notify: restart nginx

- name: 追加一行到文件（lineinfile）
  lineinfile:
    path: /etc/hosts
    line: "192.168.1.100  monitoring.example.com"
    regexp: '^192\.168\.1\.100'    # 如果行已存在则替换
    state: present

- name: 替换文件中的某行
  lineinfile:
    path: /etc/ssh/sshd_config
    regexp: '^#PermitRootLogin'
    line: 'PermitRootLogin yes'
    backup: yes

- name: 替换多行文本块（blockinfile）
  blockinfile:
    path: /etc/hosts
    block: |
      192.168.1.50  db-primary
      192.168.1.51  db-replica
    marker: "# {mark} ANSIBLE MANAGED BLOCK - DB HOSTS"
    state: present
```

### 6.2 命令执行

```yaml
- name: 执行 shell 命令（支持管道、重定向）
  shell: |
    df -h | grep /data
    echo "Disk check completed"
  args:
    chdir: /tmp                    # 切换工作目录
    executable: /bin/bash          # 指定 shell
  register: disk_result

- name: 执行命令（不支持管道，更安全）
  command:
    cmd: /usr/bin/uptime
    chdir: /root
  register: uptime_result

- name: raw 模块（不依赖 Python，适用网络设备、最小系统）
  raw: |
    show ip interface brief
  register: raw_result
```

### 6.3 包管理

```yaml
# Red Hat 系列（yum / dnf）
- name: 安装多个包
  yum:
    name:
      - nginx
      - python3
      - git
    state: present

- name: 从本地 RPM 安装
  yum:
    name: /tmp/package.rpm
    state: present

- name: 升级所有包
  yum:
    name: '*'
    state: latest

# Debian 系列
- name: 更新缓存并安装
  apt:
    name:
      - nginx
      - python3-pip
    state: present
    update_cache: yes

# 通用包管理器
- name: 通用安装（自动适配 yum/apt/dnf）
  package:
    name: htop
    state: present

# Pip
- name: 安装 Python 包
  pip:
    name:
      - flask
      - requests
      - gunicorn
    state: present
```

### 6.4 服务管理

```yaml
- name: 启动并启用服务
  service:
    name: nginx
    state: started
    enabled: yes

- name: 重启服务
  systemd:
    name: nginx
    state: restarted
    daemon_reload: yes             # 重载 systemd 配置

- name: 停止服务
  service:
    name: firewalld
    state: stopped
    enabled: no

- name: 检查服务状态
  command: systemctl is-active nginx
  register: nginx_status
  changed_when: false
  failed_when: nginx_status.rc not in [0, 3]
```

### 6.5 用户与权限

```yaml
- name: 创建用户组
  group:
    name: app
    gid: 2001
    state: present

- name: 创建用户
  user:
    name: deploy
    comment: "Deploy User"
    uid: 2001
    group: app
    groups: wheel                  # 附加组
    shell: /bin/bash
    create_home: yes
    home: /home/deploy
    state: present

- name: 设置 SSH 公钥认证
  authorized_key:
    user: deploy
    key: "{{ lookup('file', '~/.ssh/deploy_key.pub') }}"
    state: present

- name: 设置 sudo 免密
  copy:
    content: "deploy ALL=(ALL) NOPASSWD: ALL"
    dest: /etc/sudoers.d/deploy
    mode: '0440'
    validate: /usr/sbin/visudo -cf %s

- name: 删除用户
  user:
    name: olduser
    state: absent
    remove: yes                   # 删除家目录和邮件池
```

### 6.6 网络检查

```yaml
- name: 测试网络连通性
  ping:

- name: HTTP 请求测试
  uri:
    url: http://{{ ansible_default_ipv4.address }}/health
    status_code: 200
    timeout: 5
  register: health_check

- name: 获取 URL 内容
  uri:
    url: https://api.example.com/status
    method: GET
    headers:
      Authorization: "Bearer {{ api_token }}"
    return_content: yes
  register: api_response

- name: 检查端口是否开放
  wait_for:
    host: "{{ ansible_default_ipv4.address }}"
    port: 80
    state: started
    timeout: 30
    msg: "端口 80 未在 30 秒内开放"

- name: DNS 解析测试
  shell: "nslookup {{ item }} | grep Address"
  loop:
    - example.com
    - api.example.com
```

### 6.7 系统信息

```yaml
- name: 收集系统信息（默认在 play 中 gather_facts: yes 时自动执行）
  setup:
    filter: "ansible_*"

- name: 设置系统时间
  timezone:
    name: Asia/Shanghai

- name: 设置主机名
  hostname:
    name: "{{ inventory_hostname }}"

- name: 配置内核参数
  sysctl:
    name: net.ipv4.ip_forward
    value: '1'
    state: present
    reload: yes

- name: 挂载文件系统
  mount:
    path: /data
    src: /dev/sdb1
    fstype: xfs
    opts: defaults,noatime
    state: mounted
```

### 6.8 容器管理

```yaml
- name: Docker 容器管理
  community.docker.docker_container:
    name: my-app
    image: nginx:alpine
    state: started
    restart_policy: always
    ports:
      - "80:80"
    env:
      TZ: Asia/Shanghai

- name: Docker Compose 部署
  community.docker.docker_compose:
    project_src: /opt/myapp
    state: present
    restarted: yes

- name: 容器镜像拉取
  community.docker.docker_image:
    name: "{{ item }}"
    source: pull
  loop:
    - nginx:alpine
    - redis:alpine
```

> **注意**：Docker 相关模块位于 `community.docker` 集合，需先安装：
> ```bash
> ansible-galaxy collection install community.docker
> ```

---

## 7. 变量与 Facts

### 变量定义方式与优先级

优先级从低到高（后定义的覆盖先定义的）：

| 优先级 | 定义位置 | 示例 |
|--------|---------|------|
| 1 (最低) | Inventory group_vars/all | `group_vars/all.yml` |
| 2 | Inventory group_vars/组名 | `group_vars/nginx.yml` |
| 3 | Inventory host_vars/主机 | `host_vars/web-01.yml` |
| 4 | Playbook vars | `vars:` 块 |
| 5 | Playbook vars_files | `vars_files: [vars.yml]` |
| 6 | Playbook vars_prompt | 交互式输入 |
| 7 | Role defaults | `roles/xxx/defaults/main.yml`（最低优先级角色变量） |
| 8 | Role vars | `roles/xxx/vars/main.yml` |
| 9 | 命令行 -e 参数 | `ansible-playbook -e "version=1.2"` |
| 10 (最高) | `set_fact` / `register` | 运行时动态赋值 |

### 变量定义示例

```yaml
# group_vars/all.yml
---
ntp_server: cn.pool.ntp.org
timezone: Asia/Shanghai
proxy_server: ""

# group_vars/web.yml
---
http_port: 8080
nginx_worker_processes: auto
app_env: production

# host_vars/web-01.yml
---
http_port: 8081                    # 单台主机的特殊配置
ansible_host: 10.0.0.101
```

### 变量引用方式

```yaml
- name: 打印变量
  debug:
    msg: "{{ nginx_worker_processes }}"        # Jinja2 双花括号

- name: 命令行传递变量
  debug:
    msg: "Version: {{ version | default('unknown') }}"
```

```bash
# 通过命令行传递变量
ansible-playbook deploy.yml -e "version=v2.0 env=production"
ansible-playbook deploy.yml -e "@vars.json"        # 从 JSON 文件加载
ansible-playbook deploy.yml -e "@vars.yml"         # 从 YAML 文件加载
```

### Facts 系统信息

```yaml
# 查看所有 facts（debug 时很有用）
- name: 打印所有 facts
  debug:
    var: ansible_facts

# 常见 facts 变量
# ansible_distribution          # CentOS / Ubuntu / Debian
# ansible_distribution_version  # 7.9 / 20.04 / 11
# ansible_os_family             # RedHat / Debian
# ansible_default_ipv4.address  # 默认网卡 IPv4
# ansible_all_ipv4_addresses    # 所有 IPv4 地址
# ansible_hostname              # 主机名
# ansible_processor_cores       # CPU 核心数
# ansible_memtotal_mb           # 总内存 (MB)
# ansible_architecture          # x86_64 / aarch64
# ansible_kernel                # 内核版本

# 禁用 facts 收集（加速执行）
- name: 不收集 facts
  hosts: web
  gather_facts: no

# 手动收集 facts
- name: 手动收集
  setup:
    filter: "ansible_distribution*"
```

### 变量进阶用法

```yaml
# 嵌套字典变量
---
app_config:
  port: 8080
  workers: 4
  database:
    host: db-primary
    port: 3306
    name: myapp

# 引用嵌套变量
tasks:
  - debug:
      msg: "数据库主机: {{ app_config.database.host }}"

# 注册变量
tasks:
  - name: 获取磁盘使用率
    shell: df -h / | tail -1 | awk '{print $5}'
    register: disk_usage

  - name: 磁盘空间不足告警
    debug:
      msg: "⚠ 磁盘使用率 {{ disk_usage.stdout }}"
    when: disk_usage.stdout | int > 80

# set_fact 动态设置变量
tasks:
  - name: 动态计算并设置变量
    set_fact:
      deploy_path: "/data/app/{{ app_version }}"
      full_name: "{{ first_name | upper }} {{ last_name | upper }}"

# 提示用户输入变量
vars_prompt:
  - name: db_password
    prompt: "请输入数据库密码"
    private: yes
    confirm: yes
  - name: deploy_env
    prompt: "部署环境 (dev/staging/prod)"
    default: dev
    private: no
```

---

## 8. 模板 (Jinja2)

### 模板文件语法

```jinja2
# templates/nginx.conf.j2
upstream {{ app_name }} {
{% for backend in backend_servers %}
    server {{ backend }}:{{ app_port }};
{% endfor %}
}

server {
    listen {{ http_port }};
    server_name {{ server_name }};
    client_max_body_size {{ upload_max_size | default('10m') }};

    location / {
        proxy_pass http://{{ app_name }};
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /health {
        return 200 "OK\n";
        add_header Content-Type text/plain;
    }
}
```

### 常用 Jinja2 过滤器

```jinja2
{{ variable | default('fallback') }}    {# 默认值 #}
{{ variable | mandatory }}              {# 变量必须存在 #}
{{ name | upper }}                      {# 大写 #}
{{ name | lower }}                      {# 小写 #}
{{ name | title }}                      {# 首字母大写 #}
{{ text | trim }}                       {# 去除首尾空白 #}
{{ text | quote }}                      {# 加引号 #}
{{ list | join(', ') }}                 {# 列表拼接 #}
{{ path | basename }}                   {# 文件名 #}
{{ path | dirname }}                    {# 目录路径 #}
{{ ip | ipaddr('network') }}            {# IP 网络计算 #}
{{ dict | to_json }}                    {# 转 JSON #}
{{ dict | to_yaml }}                    {# 转 YAML #}
{{ password | password_hash('sha512') }}{# 密码加密 #}
{{ "hello" | regex_replace('ello', 'i') }}{# 正则替换 #}
{{ list | unique }}                     {# 去重 #}
{{ list | flatten }}                    {# 展开嵌套列表 #}
{{ list | sort }}                       {# 排序 #}
{{ list | rejectattr('state', 'eq', 'absent') | list }}  {# 过滤 #}
```

### 模板使用示例

```yaml
- name: 使用模板生成配置文件
  template:
    src: nginx.conf.j2
    dest: /etc/nginx/nginx.conf
    owner: root
    group: root
    mode: '0644'

- name: 使用模板生成多台主机各自的配置
  template:
    src: app.properties.j2
    dest: "/data/app/{{ inventory_hostname }}.properties"
```

**模板文件存放位置：**
- Playbook 同级 `templates/` 目录
- Role 中的 `roles/<rolename>/templates/` 目录

---

## 9. 条件与循环

### 条件判断

```yaml
# when 条件
tasks:
  - name: CentOS 系统特定操作
    yum:
      name: httpd
      state: present
    when: ansible_os_family == "RedHat"

  - name: Ubuntu 系统特定操作
    apt:
      name: apache2
      state: present
    when: ansible_os_family == "Debian"

  - name: 多条件组合
    service:
      name: nginx
      state: restarted
    when:
      - ansible_distribution == "CentOS"
      - ansible_distribution_major_version | int >= 7
      - nginx_installed is defined
      - not (skip_restart | default(false))

  - name: 条件判断变量存在与否
    debug:
      msg: "自定义变量已定义"
    when: custom_var is defined

  - name: 条件判断路径是否存在
    debug:
      msg: "配置文件存在"
    when: config_path is exists

  # 注意：exists / is_dir / is_file / is_link / is_abs 是 Jinja2 测试，
  # 可以用 stat 模块更精确地判断
  - name: 使用 stat 模块检查文件
    stat:
      path: /etc/nginx/nginx.conf
    register: nginx_conf

  - name: 文件存在时执行操作
    debug:
      msg: "文件大小: {{ nginx_conf.stat.size }} 字节"
    when: nginx_conf.stat.exists
```

### 循环

```yaml
# 标准循环 — with_items（推荐用 loop）
tasks:
  - name: 安装多个软件包
    yum:
      name: "{{ item }}"
      state: present
    loop:
      - nginx
      - python3
      - git
      - htop

  - name: 创建多个用户
    user:
      name: "{{ item.name }}"
      group: "{{ item.group | default('users') }}"
      shell: "{{ item.shell | default('/bin/bash') }}"
    loop:
      - { name: alice, group: wheel }
      - { name: bob, shell: /bin/zsh }
      - { name: charlie }

  - name: 遍历字典
    debug:
      msg: "Key: {{ item.key }}, Value: {{ item.value }}"
    loop: "{{ { 'name': 'nginx', 'port': 80, 'enabled': true } | dict2items }}"

# 循环控制
  - name: 带索引的循环
    debug:
      msg: "第 {{ ansible_loop.index }} 次: {{ item }}"
    loop:
      - a
      - b
      - c
    loop_control:
      index_var: ansible_loop.index

  - name: 循环 + 条件
    debug:
      msg: "{{ item }} 已启用"
    loop: "{{ services }}"
    when: item.enabled

# 循环直到条件满足
  - name: 等待服务启动
    shell: "curl -s http://localhost:8080/health | grep -c OK"
    register: result
    until: result.stdout == "1"
    retries: 12
    delay: 5

# 文件 glob 循环
  - name: 批量分发脚本
    copy:
      src: "{{ item }}"
      dest: /usr/local/bin/
      mode: '0755'
    loop: "{{ lookup('fileglob', 'scripts/*.sh').split(',') }}"

# 生成序列
  - name: 创建一系列目录
    file:
      path: "/data/{{ item }}"
      state: directory
    loop: "{{ range(1, 6) | list }}"         # → [1,2,3,4,5]
```

---

## 10. Roles 角色

### 角色目录结构

```
roles/
├── nginx/                         # 角色名
│   ├── tasks/
│   │   └── main.yml              # 主任务文件
│   ├── handlers/
│   │   └── main.yml              # handler 定义
│   ├── templates/
│   │   └── nginx.conf.j2         # Jinja2 模板
│   ├── files/
│   │   └── default.conf          # 静态文件
│   ├── vars/
│   │   └── main.yml              # 高优先级变量（不可被外部覆盖）
│   ├── defaults/
│   │   └── main.yml              # 默认变量（最低优先级）
│   ├── meta/
│   │   └── main.yml              # 角色依赖和元信息
│   └── README.md                 # 角色说明
├── mysql/
│   └── tasks/
│       └── main.yml
└── monitor/
    └── tasks/
        └── main.yml
```

### Task 示例

```yaml
# roles/nginx/tasks/main.yml
---
- name: 确保 EPEL 源已安装
  yum:
    name: epel-release
    state: present
  when: ansible_os_family == "RedHat"

- name: 安装 Nginx
  package:
    name: nginx
    state: present

- name: 创建站点目录
  file:
    path: /var/www/{{ app_name | default('default') }}
    state: directory
    owner: nginx
    group: nginx
    mode: '0755'

- name: 分发 Nginx 配置
  template:
    src: nginx.conf.j2
    dest: /etc/nginx/nginx.conf
    owner: root
    group: root
    mode: '0644'
  notify: restart nginx

- name: 启动并启用 Nginx
  service:
    name: nginx
    state: started
    enabled: yes
```

### Handler 示例

```yaml
# roles/nginx/handlers/main.yml
---
- name: restart nginx
  service:
    name: nginx
    state: restarted

- name: reload nginx
  service:
    name: nginx
    state: reloaded
```

### 默认变量

```yaml
# roles/nginx/defaults/main.yml
---
nginx_port: 80
nginx_worker_processes: auto
nginx_worker_connections: 1024
nginx_keepalive_timeout: 65
app_name: default
```

### Playbook 中使用角色

```yaml
# site.yml — 站点级部署入口
---
- name: 配置 Web 服务器
  hosts: web
  become: yes
  roles:
    - role: common                 # 通用基础配置
      tags: common
    - role: nginx
      vars:
        nginx_port: 8080          # 覆盖默认变量
        app_name: mywebapp
      tags: nginx
      when: ansible_os_family == "RedHat"
    - role: mysql
      tags: mysql

# 等同于以下传统写法（用 tasks/include_role）
- name: 配置 Web 服务器（等效写法）
  hosts: web
  become: yes
  tasks:
    - include_role:
        name: common
    - include_role:
        name: nginx
      vars:
        nginx_port: 8080
```

### 角色依赖

```yaml
# roles/nginx/meta/main.yml
---
dependencies:
  - role: common                   # 先执行 common 角色
    tags: common
  - role: epel                    # 再安装 EPEL
    when: ansible_os_family == "RedHat"
```

### Role 常用命令

```bash
# 创建角色骨架
ansible-galaxy init roles/nginx

# 从 Ansible Galaxy 安装社区角色
ansible-galaxy install geerlingguy.nginx
ansible-galaxy install geerlingguy.nginx -p roles/    # 指定目录

# 查看已安装角色
ansible-galaxy list

# 创建角色集合的 requirements.yml
ansible-galaxy install -r requirements.yml -p roles/
```

```yaml
# requirements.yml
---
roles:
  - name: geerlingguy.nginx
    version: 3.1.0
  - name: geerlingguy.certbot
    version: 5.0.0

collections:
  - name: community.docker
    version: ">=3.0.0"
  - name: ansible.posix
```

---

## 11. Ansible Vault 加密

### 基本用法

```bash
# 创建加密文件（会提示输入密码）
ansible-vault create secrets.yml

# 加密已有文件
ansible-vault encrypt secrets.yml

# 查看加密文件内容
ansible-vault view secrets.yml

# 编辑加密文件
ansible-vault edit secrets.yml

# 解密
ansible-vault decrypt secrets.yml

# 修改密码
ansible-vault rekey secrets.yml
```

### 加密文件示例

```yaml
# secrets.yml（加密前的内容）
---
db_password: "S3cur3P@ssw0rd"
api_key: "ak-2a3b4c5d6e7f8g9h"
ssh_key_passphrase: "my-passphrase"
```

### Playbook 中使用加密变量

```bash
# 执行时输入密码
ansible-playbook deploy.yml --ask-vault-pass

# 使用密码文件
ansible-playbook deploy.yml --vault-password-file ~/.vault_pass

# 使用多个 vault ID（不同环境不同密码）
ansible-playbook deploy.yml --vault-id prod@~/.vault_pass_prod
ansible-playbook deploy.yml --vault-id dev@~/.vault_pass_dev
```

```yaml
# playbook 引用加密变量
---
- name: 部署应用
  hosts: web
  vars_files:
    - secrets.yml                  # Ansible 自动解密
  tasks:
    - name: 使用数据库密码
      debug:
        msg: "DB Password: {{ db_password }}"
      no_log: true                 # 隐藏敏感输出
```

### Vault 加密字符串（非整个文件）

```bash
# 加密单个字符串
ansible-vault encrypt_string 'S3cur3P@ssw0rd' --name db_password

# 输出：
# db_password: !vault |
#           $ANSIBLE_VAULT;1.1;AES256
#           613861306466383...
```

```yaml
# 可以直接嵌入 YAML 使用
db_password: !vault |
  $ANSIBLE_VAULT;1.1;AES256
  613861306466383...
```

### 实用技巧

```bash
# 生成随机密码并加密
echo "db_password: $(openssl rand -base64 24)" | ansible-vault encrypt

# 查看加密文件信息（不显示内容）
ansible-vault decrypt secrets.yml --output - 2>/dev/null || true
```

---

## 12. Tags 与 Limit

### Tags

```yaml
# playbook.yml
---
- name: 全量部署
  hosts: web
  tasks:
    - name: 安装包
      yum:
        name: nginx
        state: present
      tags:
        - install
        - packages

    - name: 配置 Nginx
      template:
        src: nginx.conf.j2
        dest: /etc/nginx/nginx.conf
      tags:
        - config
        - nginx

    - name: 启动服务
      service:
        name: nginx
        state: started
      tags:
        - service
        - nginx
```

```bash
# 按 tag 执行特定任务
ansible-playbook playbook.yml --tags "install"            # 只执行 install 标签
ansible-playbook playbook.yml --tags "nginx"              # 只执行 nginx 标签
ansible-playbook playbook.yml --skip-tags "config"        # 跳过 config 标签

# 特殊内置 tags
ansible-playbook playbook.yml --tags "tagged"             # 只执行有标签的 task
ansible-playbook playbook.yml --tags "untagged"           # 只执行无标签的 task
ansible-playbook playbook.yml --tags "all"                # 全部执行（默认）
```

### Limit

```bash
# 限制执行范围
ansible-playbook playbook.yml --limit web-01              # 单台
ansible-playbook playbook.yml --limit "web-01,web-02"     # 多台（逗号分隔）
ansible-playbook playbook.yml --limit "~web-\d+"          # 正则匹配
ansible-playbook playbook.yml --limit @hosts.txt          # 从文件读取主机列表

# 先从目标中排除
ansible-playbook playbook.yml --limit "all:!web-02"       # 排除 web-02
ansible-playbook playbook.yml --limit "web:&db"           # 同时属于 web 和 db 组的主机
```

---

## 13. 常用排查场景速查

### 13.1 连接失败排查

```bash
# 检查连通性
ansible target-host -m ping -vvv

# 常见原因：
# 1. SSH 免密未配置
ssh-copy-id root@target-host

# 2. SSH 端口非默认
ansible target-host -m ping -e "ansible_port=2222"

# 3. Python 未安装（目标主机无 Python 时使用 raw 模块）
ansible target-host -m raw -a "test -e /usr/bin/python3"

# 4. 控制节点和目标节点 Python 版本不兼容
ansible target-host -m ping -e "ansible_python_interpreter=/usr/bin/python3"

# 5. Host Key 检查失败
# 在 ansible.cfg 中设置：
# host_key_checking = False
# 或在 ~/.ssh/config 中：
# StrictHostKeyChecking no

# 6. SSH 连接超时
# 在 ansible.cfg 中：
# timeout = 60
```

### 13.2 执行结果不符合预期

```bash
# 增加详细输出等级
ansible-playbook playbook.yml -v          # 1 级：输出结果
ansible-playbook playbook.yml -vv         # 2 级：输入输出详情
ansible-playbook playbook.yml -vvv        # 3 级：SSH 连接详情
ansible-playbook playbook.yml -vvvv       # 4 级：所有调试信息

# Dry-run 验证
ansible-playbook playbook.yml --check
ansible-playbook playbook.yml --check --diff    # 同时显示文件差异

# 限制为单台主机调试
ansible-playbook playbook.yml --limit single-host
```

### 13.3 Playbook 语法检查

```bash
# 语法检查（不实际执行）
ansible-playbook playbook.yml --syntax-check

# 列出任务结构
ansible-playbook playbook.yml --list-tasks
ansible-playbook playbook.yml --list-tags
ansible-playbook playbook.yml --list-hosts

# 输出 YAML 解析结果
cat playbook.yml | python3 -c "import yaml,sys; yaml.safe_load(sys.stdin); print('YAML OK')"
```

### 13.4 模版渲染问题

```bash
# 测试 Jinja2 模板渲染结果
ansible all -i "localhost," -m debug -a "msg={{ '{{' }} lookup('template', 'test.j2') {{ '}}' }}"

# 或者用 ansible 的 debug 模块查看变量
ansible-playbook debug.yml -e "target_host=web-01"
```

```yaml
# debug.yml — 变量调试专用 Playbook
---
- name: 调试变量
  hosts: "{{ target_host | default('all') }}"
  gather_facts: yes
  tasks:
    - name: 打印所有变量
      debug:
        var: hostvars[inventory_hostname]

    - name: 打印特定变量
      debug:
        var: nginx_port

    - name: 打印模板文件内容（不实际部署）
      debug:
        msg: "{{ lookup('template', 'nginx.conf.j2') }}"
```

### 13.5 递归依赖与死循环

```bash
# 查看角色依赖树
ansible-galaxy info geerlingguy.nginx --offline

# 检查 meta/main.yml 依赖配置是否正确
# 避免：A 依赖 B，B 也依赖 A
```

### 13.6 性能调优

```bash
# 开启 SSH pipelining（大幅度提升速度）
# ansible.cfg:
# [ssh_connection]
# pipelining = True

# 增加并发数
ansible-playbook playbook.yml -f 20                  # 20 台并发
ansible-playbook playbook.yml --forks=30             # 等价写法

# 禁用 facts 收集（如果不需要系统信息）
# playbook 中设置：gather_facts: no

# 使用 facts 缓存
# ansible.cfg:
# gathering = smart
# fact_caching = jsonfile
# fact_caching_connection = /tmp/ansible_facts
# fact_caching_timeout = 3600

# SSH 连接复用
# ansible.cfg:
# [ssh_connection]
# control_path = /tmp/%%h-%%r-%%p
# ssh_args = -o ControlMaster=auto -o ControlPersist=60s
```

### 13.7 幂等性检查

```yaml
# 幂等性是 Ansible 的核心原则，重复执行应得到相同结果

# 正确做法：永远不在 shell 中直接 chmod/chown
# ❌ 不幂等
- shell: chmod 755 /data/app

# ✅ 幂等
- file:
    path: /data/app
    mode: '0755'

# ❌ 不幂等
- shell: echo "hello" >> /etc/motd

# ✅ 幂等
- lineinfile:
    path: /etc/motd
    line: "hello"
    create: yes

# 检查幂等性：两次执行 --check 模式应无 changed
ansible-playbook playbook.yml --check | grep "changed="
```

### 13.8 常见报错与解决

| 报错信息 | 原因 | 解决方法 |
|---------|------|---------|
| `Host key verification failed` | SSH Host Key 不匹配 | `ssh-keygen -R 目标IP` 或关闭 Host Key 检查 |
| `ModuleNotFoundError` | 目标主机缺少 Python 模块 | `pip install <模块>` 或使用 raw 模块降级 |
| `ERROR! Timeout exceeded` | SSH 连接超时 | 检查网络/防火墙，增加 `timeout` 配置 |
| `ERROR! Syntax Error` | YAML 缩进错误 | 检查缩进（用空格，不要用 Tab） |
| `ERROR! 'ansible.builtin.xxx' is not a valid attribute` | 模块名拼写错误 | 核对模块文档中的正确名称 |
| `ERROR! 'dict object' has no attribute 'xxx'` | 引用不存在的变量 | 检查变量名拼写，或使用 `default` 过滤器 |
| `ERROR! The field 'hosts' has an invalid value` | hosts 拼写错误 | 确认主机组名在 inventory 中存在 |
| `Connection refused` | SSH 端口不正确 | 指定 `ansible_port` 或检查 SSH 服务状态 |
| `Permission denied (publickey)` | SSH 密钥认证失败 | 重新分发公钥，确认密钥路径正确 |
| `ERROR! 'become' is not a valid attribute` | become 缩进层级错误 | become 应在 play 层级，非 task 层级 |

---

## 附录：快速索引

### 常用模块速查表

| 模块 | 用途 | Ad-hoc 示例 |
|------|------|------------|
| `ping` | 连通性测试 | `ansible all -m ping` |
| `setup` | 收集系统信息 | `ansible all -m setup -a "filter=ansible_distribution*"` |
| `command` | 执行命令 | `ansible web -m command -a "uptime"` |
| `shell` | Shell 命令 | `ansible web -m shell -a "df -h \| grep /data"` |
| `raw` | 无 Python 依赖执行 | `ansible web -m raw -a "show version"` |
| `copy` | 复制文件到远端 | `ansible web -m copy -a "src=./hosts dest=/tmp/"` |
| `fetch` | 从远端拉取文件 | `ansible web -m fetch -a "src=/etc/hosts dest=./"` |
| `file` | 文件/目录管理 | `ansible web -m file -a "path=/data state=directory"` |
| `template` | 模板渲染并分发 | 见 Playbook |
| `lineinfile` | 单行文本管理 | `ansible web -m lineinfile -a "path=/etc/hosts line='...'"` |
| `blockinfile` | 多行文本块管理 | `ansible web -m blockinfile -a "path=/etc/hosts block='...'"` |
| `yum`/`apt` | 包管理 | `ansible web -m yum -a "name=nginx state=present"` |
| `service`/`systemd` | 服务管理 | `ansible web -m service -a "name=nginx state=started"` |
| `user` | 用户管理 | `ansible web -m user -a "name=deploy state=present"` |
| `group` | 用户组管理 | `ansible web -m group -a "name=deploy state=present"` |
| `uri` | HTTP 请求 | `ansible web -m uri -a "url=http://localhost/health"` |
| `wait_for` | 端口等待 | `ansible web -m wait_for -a "port=80 state=started"` |
| `debug` | 打印调式信息 | `ansible web -m debug -a "msg=Hello"` |
| `mount` | 文件系统挂载 | `ansible web -m mount -a "path=/data src=/dev/sdb1 state=mounted"` |
| `sysctl` | 内核参数 | `ansible web -m sysctl -a "name=net.ipv4.ip_forward value=1"` |
| `cron` | 计划任务 | `ansible web -m cron -a "name=cleanup hour=2 job=/script.sh"` |
| `authorized_key` | SSH 密钥管理 | 见 Playbook |
| `timezone` | 时区设置 | `ansible web -m timezone -a "name=Asia/Shanghai"` |

### 常用命令速查表

| 命令 | 用途 |
|------|------|
| `ansible all -m ping` | 连通性测试 |
| `ansible all --list-hosts` | 列出所有受管主机 |
| `ansible-playbook play.yml --syntax-check` | 检查 Playbook 语法 |
| `ansible-playbook play.yml --check` | Dry-run 模拟执行 |
| `ansible-playbook play.yml --diff` | 显示文件变更差异 |
| `ansible-playbook play.yml -v` | 详细输出模式 |
| `ansible-playbook play.yml --list-tasks` | 列出所有任务 |
| `ansible-playbook play.yml --limit host1` | 限制执行范围 |
| `ansible-vault create file.yml` | 创建加密文件 |
| `ansible-vault encrypt file.yml` | 加密已有文件 |
| `ansible-galaxy init roles/xxx` | 创建角色骨架 |
| `ansible-galaxy install geerlingguy.nginx` | 安装社区角色 |
| `ansible-config dump` | 查看当前配置 |

### Playbook 文件结构建议

```
ops-ansible/
├── ansible.cfg                    # Ansible 配置
├── hosts.ini                      # 主机清单
├── site.yml                       # 主入口 Playbook
├── requirements.yml               # Galaxy 依赖
├── secrets.yml                    # 加密变量（Vault）
├── files/                         # 静态文件
│   └── sshd_config
├── templates/                     # Jinja2 模板
│   └── nginx.conf.j2
├── vars/                          # 变量文件
│   ├── main.yml
│   └── versions.yml
├── group_vars/                    # 组变量
│   ├── all.yml
│   ├── web.yml
│   └── db.yml
├── host_vars/                     # 主机变量
│   └── web-01.yml
└── roles/                         # 角色目录
    ├── common/
    ├── nginx/
    ├── mysql/
    └── monitor/
```
