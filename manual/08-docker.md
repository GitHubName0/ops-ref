## Docker 容器运维

> 适用场景：容器化应用部署、镜像构建、编排管理、故障排查
> 前置阅读：[01-linux-basics.md](01-linux-basics.md)

---

### 1. 容器生命周期

```bash
# 运行容器
docker run -d --name nginx -p 80:80 nginx:alpine          # 后台运行，端口映射
docker run -it --rm ubuntu bash                             # 交互式，退出自动删除
docker run -d --restart=always --name app myapp:latest      # 自动重启
docker run -d -v /data:/app/data -e ENV=prod myapp         # 挂载卷 + 环境变量

# 查看容器
docker ps                                                   # 运行中的容器
docker ps -a                                                # 所有容器（含已停止）
docker ps -a --format "table {{.ID}}\t{{.Names}}\t{{.Status}}\t{{.Ports}}"
docker ps -q                                                # 只输出容器 ID

# 启停操作
docker start nginx            # 启动已停止的容器
docker stop nginx             # 优雅停止（SIGTERM → 10s → SIGKILL）
docker stop -t 30 nginx       # 等待 30 秒再强杀
docker restart nginx          # 重启
docker pause/unpause nginx    # 暂停/恢复进程（不释放内存）
docker kill nginx             # 立即强杀（SIGKILL）

# 删除容器
docker rm nginx                                  # 删除已停止的容器
docker rm -f nginx                               # 强制删除运行中的
docker container prune -f                        # 删除所有已停止容器
docker rm $(docker ps -aq)                       # 删除所有容器（⚠️）
docker stop $(docker ps -q) && docker rm $(docker ps -aq)  # 先停后删

# 进入容器
docker exec -it nginx bash                       # 进入 bash
docker exec -it nginx sh                         # Alpine 用 sh
docker exec nginx cat /etc/nginx/nginx.conf      # 执行单条命令
docker exec -u root nginx whoami                 # 以 root 身份执行
docker attach nginx                              # 附着到容器主进程（不推荐）

# 日志
docker logs nginx                                # 查看日志
docker logs -f nginx                             # 实时跟踪
docker logs --tail 100 nginx                     # 最后 100 行
docker logs --since 30m nginx                    # 最近 30 分钟
docker logs --until "2024-01-01T12:00:00" nginx  # 截止到某时间
docker logs -f --tail 50 nginx 2>&1 | grep ERROR # 过滤错误日志
```

### 2. 镜像管理

```bash
# 查看与搜索
docker images                                      # 本地镜像列表
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"
docker search nginx --limit 10                    # 搜索 Docker Hub
docker history nginx:alpine                        # 镜像构建历史（层）

# 拉取与推送
docker pull nginx:alpine                           # 拉取指定标签
docker pull nginx                                  # 默认拉取 latest
docker tag nginx:alpine myrepo/nginx:v1.0          # 打标签
docker push myrepo/nginx:v1.0                      # 推送到仓库
docker pull registry.example.com:5000/myapp:v1     # 从私有仓库拉取

# 构建镜像
docker build -t myapp:v1.0 .                       # 从 Dockerfile 构建
docker build --no-cache -t myapp:v2 .              # 不使用缓存
docker build --build-arg VERSION=2.0 -t app:v2 .   # 传递构建参数
docker build -f Dockerfile.prod -t app:prod .      # 指定 Dockerfile

# 清理镜像
docker rmi nginx:alpine                            # 删除镜像
docker rmi $(docker images -q)                     # 删除所有镜像（⚠️）
docker image prune -a                              # 删除未使用的镜像
docker system prune -a --volumes                   # 彻底清理所有未使用资源

# 导入导出
docker save -o nginx.tar nginx:alpine              # 导出镜像为 tar
docker load -i nginx.tar                           # 从 tar 导入
docker export nginx > nginx.tar                    # 导出容器文件系统
docker import nginx.tar mynginx:latest             # 从 tar 导入为镜像

# 查看镜像详情
docker inspect nginx:alpine                        # 镜像 JSON 详情
docker inspect -f '{{.Config.Env}}' nginx          # 格式化提取环境变量
docker inspect -f '{{range .RootFS.Layers}}{{println .}}{{end}}' nginx  # 列出所有层
```

### 3. Dockerfile 编写

```dockerfile
# 基础镜像
FROM node:18-alpine AS builder                     # 多阶段构建，命名为 builder

# 元信息
LABEL maintainer="ops@example.com"
LABEL version="1.0"

# 工作目录
WORKDIR /app

# 复制文件
COPY package*.json ./
COPY --chown=node:node . .

# 安装依赖
RUN npm ci --only=production && npm cache clean --force

# 构建参数（仅构建时可用）
ARG BUILD_DATE
ARG VCS_REF

# 环境变量（运行时可用）
ENV NODE_ENV=production
ENV PORT=3000

# 声明端口（文档作用，不实际开放）
EXPOSE 3000

# 创建非 root 用户
RUN addgroup -g 1001 appgroup && adduser -u 1001 -G appgroup -s /bin/sh -D appuser
USER appuser

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# 持久化目录
VOLUME ["/app/data", "/app/logs"]

# 入口点（不可被 docker run 后的命令覆盖）
ENTRYPOINT ["node", "server.js"]

# 默认命令（可被覆盖）
CMD ["--port", "3000"]
```

**CMD vs ENTRYPOINT 组合**

| 模式 | Dockerfile | docker run 传参 | 实际执行 |
|------|-----------|----------------|---------|
| CMD 仅 | `CMD ["echo", "hello"]` | `world` | `echo world` |
| ENTRYPOINT 仅 | `ENTRYPOINT ["echo"]` | `hello` | `echo hello` |
| 组合 | `ENTRYPOINT ["echo"]` + `CMD ["hello"]` | `world` | `echo world` |
| 脚本入口 | `ENTRYPOINT ["/entrypoint.sh"]` + `CMD ["nginx", "-g", "daemon off;"]` | 不传则用 CMD | `/entrypoint.sh nginx -g daemon off;` |

**多阶段构建（减小镜像体积）**

```dockerfile
# 阶段1：编译
FROM golang:1.21-alpine AS builder
WORKDIR /src
COPY . .
RUN go build -o /app .

# 阶段2：运行（只复制编译产物）
FROM alpine:3.19
COPY --from=builder /app /usr/local/bin/app
ENTRYPOINT ["app"]
```

**构建优化技巧**

| 技巧 | 说明 |
|------|------|
| `.dockerignore` | 排除 node_modules、.git、测试文件 |
| 合并 RUN 层 | `RUN apt update && apt install -y pkg && rm -rf /var/lib/apt/lists/*` |
| 先 COPY 依赖文件 | COPY package.json → RUN npm install → COPY . |
| 使用特定标签 | `FROM node:18.17-alpine` 而非 `node:latest` |
| 多阶段构建 | 编译环境和运行环境分离 |

### 4. 网络管理

```bash
# 查看网络
docker network ls                              # 列出所有网络
docker network inspect bridge                  # 查看桥接网络详情
docker network inspect -f '{{range .Containers}}{{.Name}} {{.IPv4Address}}{{"\n"}}{{end}}' bridge

# 创建网络
docker network create mynet                    # 创建桥接网络
docker network create --subnet=10.10.0.0/16 --gateway=10.10.0.1 mynet
docker network create --driver overlay myover  # Swarm overlay 网络

# 连接管理
docker network connect mynet nginx             # 容器加入网络
docker network disconnect mynet nginx          # 容器离开网络
docker run --network mynet --ip 10.10.0.10 nginx  # 指定 IP 运行

# 端口映射
docker run -p 8080:80 nginx                    # 映射 8080→80
docker run -p 127.0.0.1:8080:80 nginx          # 仅本地监听
docker run -P nginx                            # 随机映射所有 EXPOSE 端口
docker port nginx                              # 查看容器端口映射

# 网络排障
docker run --rm --net container:nginx alpine ping -c 2 google.com  # 借用 nginx 网络
docker run --rm --net host alpine ip a                                # 使用宿主机网络
docker run --rm alpine nslookup redis                                 # DNS 测试
```

**网络模式对比**

| 模式 | 说明 | 适用场景 |
|------|------|---------|
| `bridge`（默认） | 独立网络命名空间，通过 NAT 访问外网 | 一般容器 |
| `host` | 共享宿主机网络栈，性能最好 | 高性能网络服务 |
| `none` | 无网络 | 纯计算任务 |
| `container:NAME` | 共享指定容器的网络栈 | 代理/日志收集器 |
| `overlay` | 跨主机通信（Swarm） | 集群部署 |

### 5. 存储管理

```bash
# Volume（推荐，Docker 管理）
docker volume create app_data                             # 创建卷
docker volume ls                                          # 列出卷
docker volume inspect app_data                            # 查看卷详情（Mountpoint）
docker volume rm app_data                                 # 删除卷
docker volume prune                                       # 清理未使用的卷
docker run -v app_data:/app/data nginx                    # 挂载卷
docker run --mount source=app_data,target=/app/data nginx # 推荐写法

# Bind Mount（宿主机目录）
docker run -v /host/path:/container/path nginx
docker run -v /host/path:/container/path:ro nginx         # 只读挂载
docker run --mount type=bind,source=/host/path,target=/app,readonly nginx

# tmpfs（内存临时存储）
docker run --tmpfs /app/tmp:rw,size=128M nginx
docker run --mount type=tmpfs,destination=/app/tmp,tmpfs-size=128M nginx

# 容器间共享卷
docker run -d --name app1 -v shared:/data nginx
docker run -d --name app2 --volumes-from app1 alpine

# 备份卷
docker run --rm -v app_data:/data -v $(pwd):/backup alpine tar czf /backup/app_backup.tar.gz -C /data .
```

### 6. Docker Compose

```yaml
# docker-compose.yml
version: '3.8'
services:
  web:
    build:
      context: .
      dockerfile: Dockerfile
    image: myapp:${TAG:-latest}
    container_name: myapp-web
    ports:
      - "8080:3000"
    environment:
      - NODE_ENV=production
      - DB_HOST=db
    env_file:
      - .env.production
    volumes:
      - app_data:/app/data
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
    networks:
      - frontend
      - backend
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 256M
        reservations:
          cpus: '0.25'
          memory: 128M

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: app
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    secrets:
      - db_password
    volumes:
      - db_data:/var/lib/postgresql/data
    networks:
      - backend
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/nginx/certs:ro
    depends_on:
      - web
    networks:
      - frontend

networks:
  frontend:
  backend:
    internal: true                  # 内部网络，不暴露到宿主机

volumes:
  app_data:
  db_data:

secrets:
  db_password:
    file: ./secrets/db_password.txt
```

```bash
# Compose 常用命令
docker compose up -d                                   # 后台启动所有服务
docker compose up -d --build                           # 重新构建并启动
docker compose up -d web                               # 只启动某服务
docker compose down                                    # 停止并删除（保留卷）
docker compose down -v                                 # 同时删除卷
docker compose restart web                             # 重启某服务
docker compose logs -f web                             # 实时日志
docker compose logs -f --tail=50 web                   # 最后 50 行
docker compose exec web bash                           # 进入容器
docker compose exec -u root web bash                   # root 进入
docker compose ps                                      # 查看服务状态
docker compose config                                  # 验证并打印合并后的配置
docker compose config --services                       # 只列服务名
docker compose pull                                    # 拉取最新镜像
docker compose build --no-cache                        # 强制重建
```

### 7. 资源限制

```bash
# CPU 限制
docker run --cpus="1.5" nginx                          # 最多使用 1.5 个 CPU
docker run --cpuset-cpus="0,2" nginx                   # 绑定到 CPU 0 和 2
docker run --cpu-shares=512 nginx                      # CPU 权重（默认 1024）

# 内存限制
docker run --memory="512m" --memory-swap="1g" nginx    # 内存 512M，swap 1G
docker run --memory="256m" --memory-swap="256m" nginx  # 禁用 swap（相等）
docker run --memory-reservation="128m" nginx           # 软限制（竞争时生效）

# 磁盘 IO 限制
docker run --blkio-weight=500 nginx                    # IO 权重（10-1000）
docker run --device-read-bps=/dev/sda:1mb nginx        # 读速率限制
docker run --device-write-iops=/dev/sda:50 nginx       # 写 IOPS 限制

# 其他限制
docker run --restart=on-failure:3 nginx                # 失败最多重启 3 次
docker run --ulimit nofile=65536:65536 nginx           # 文件描述符限制
docker run --pids-limit=100 nginx                      # 进程数限制
docker run --shm-size=256m nginx                       # /dev/shm 大小
docker run --read-only nginx                           # 只读根文件系统

# 运行时更新限制
docker update --memory="1g" --cpus="2" nginx           # 更新运行中容器的限制
docker stats                                            # 查看所有容器资源占用
docker stats --no-stream nginx                          # 一次性输出
```

### 8. 排障命令

```bash
# 容器状态
docker inspect nginx                                   # 完整 JSON 配置
docker inspect -f '{{.State.Status}}' nginx            # 格式化提取状态
docker inspect -f '{{.State.StartedAt}}' nginx         # 启动时间
docker inspect -f '{{.NetworkSettings.IPAddress}}' nginx # 容器 IP
docker top nginx                                       # 容器内进程列表
docker stats --no-stream                               # 一次性资源快照

# 文件变动
docker diff nginx                                      # 容器文件系统变化（A 新增/C 修改/D 删除）
docker cp nginx:/etc/nginx/nginx.conf ./               # 从容器复制文件到宿主机
docker cp ./nginx.conf nginx:/etc/nginx/nginx.conf     # 复制文件到容器

# 查看退出原因
docker logs --tail 20 nginx                            # 容器退出前最后日志
docker inspect -f '{{.State.ExitCode}}' nginx          # 退出码
docker inspect -f '{{.State.Error}}' nginx             # 错误信息
docker inspect -f '{{json .State.Health}}' nginx | python3 -m json.tool  # 健康检查状态
docker events --since 10m --filter container=nginx     # 最近 10 分钟事件

# 磁盘空间
docker system df                                        # Docker 磁盘使用概览
docker system df -v                                     # 详细空间分析
docker system prune -a -f --volumes                     # 彻底清理
du -sh /var/lib/docker                                  # Docker 数据目录大小

# 进程与信号
docker kill -s HUP nginx                                # 发送重载信号
docker kill -s USR1 nginx                               # 发送自定义信号
docker pause nginx && docker unpause nginx              # 暂停/恢复

# 导出配置
docker commit nginx mydebug:latest                      # 将容器保存为新镜像（调试用，不用于生产）
```

### 9. 安全实践

```bash
# 检查镜像漏洞
docker scan nginx:alpine                                # Docker 内置扫描（需登录）
docker scout quickview nginx:alpine                     # Docker Scout

# 以非 root 运行
docker run -u 1001:1001 nginx                           # 指定 UID:GID
docker run --user "$(id -u):$(id -g)" nginx            # 使用当前用户

# 安全选项
docker run --read-only nginx                            # 只读根文件系统
docker run --security-opt no-new-privileges nginx       # 禁止提权
docker run --cap-drop=ALL --cap-add=NET_BIND_SERVICE nginx  # 最小权限
docker run --tmpfs /tmp:rw,noexec,nosuid,size=64M nginx # 安全 tmpfs

# 内容信任
export DOCKER_CONTENT_TRUST=1                           # 启用镜像签名验证
docker pull nginx:alpine                                # 只拉取已签名的镜像

# 密钥管理（不要用环境变量传密码）
echo "mypassword" | docker secret create db_password -   # Swarm secret
docker run --secret db_password nginx                   # 挂载 secret
# Compose 中使用 secrets: 字段（见上面 Compose 示例）

# 审计
docker system info                                      # Docker 守护进程信息
docker info -f '{{.ServerVersion}}'                    # 版本号
docker system events --since 1h                          # 最近 1 小时事件审计
```

### 10. 常用场景速查

**部署一个 Web 应用（完整流程）**

```bash
# 1. 创建网络
docker network create webnet

# 2. 启动数据库
docker run -d --name db --network webnet \
  -v db_data:/var/lib/postgresql/data \
  -e POSTGRES_PASSWORD=secret \
  postgres:16-alpine

# 3. 构建并启动应用
docker build -t myapp:v1 .
docker run -d --name app --network webnet \
  -p 8080:3000 \
  -e DB_HOST=db \
  -v app_uploads:/app/uploads \
  --restart=unless-stopped \
  myapp:v1

# 4. 查看日志确认启动
docker logs -f app

# 5. 测试
curl http://localhost:8080/health
```

**更新镜像（滚动更新）**

```bash
# 构建新版本
docker build -t myapp:v2 .

# 停止旧容器
docker stop app && docker rm app

# 启动新容器（保留数据和网络）
docker run -d --name app --network webnet \
  -p 8080:3000 \
  -e DB_HOST=db \
  -v app_uploads:/app/uploads \
  --restart=unless-stopped \
  myapp:v2
```

**容器化遗留应用（最小侵入）**

```bash
# 导出宿主机配置
docker run --rm --net host -v /etc:/host-etc:ro alpine cp -r /host-etc /backup-etc

# 用宿主机网络运行（过渡方案）
docker run -d --net host --restart=always legacy-app:latest
```

**清理磁盘空间应急**

```bash
# 查看占用
docker system df

# 停止所有非必要容器
docker stop $(docker ps -q --filter "name=test")

# 清理
docker container prune -f
docker image prune -a -f
docker volume prune -f
docker network prune -f
docker builder prune -a -f     # 清理构建缓存

# 最终手段
docker system prune -a -f --volumes
```
