# DNAcloud 上线操作手册

> 按顺序执行，每步完成后打勾。

---

## 全局 Checklist

```
基础设施
  [ ] 1. 构建 Server JAR
  [ ] 2. 上传并部署到服务器
  [ ] 3. 配置 .env（填写真实值）
  [ ] 4. 开放防火墙端口
  [ ] 5. 配置 Nginx + HTTPS

官方包上线
  [ ] 6. 上传 Trading Master DNA 到 marketplace

前端 CLI 发布
  [ ] 7. 发布 @soldnacloud/mcp-server 到 npm
  [ ] 8. 发布 soldnacloud (CLI) 到 npm

验收测试
  [ ] 9. 服务端接口冒烟测试
  [ ] 10. CLI 端到端安装流程测试
  [ ] 11. Solana USDC 真实支付测试
```

---

## 一、构建 Server JAR

在本地执行（需要 JDK 17）：

```bash
JAVA_HOME=/Library/Java/JavaVirtualMachines/zulu-17.jdk/Contents/Home \
  mvn -f server/pom.xml package -DskipTests

# 产物
ls -lh server/target/dnacloud-server-1.0.0-SNAPSHOT.jar
```

---

## 二、上传并部署到服务器

### 2.1 上传文件

```bash
SERVER=root@163.7.3.34

scp server/target/dnacloud-server-1.0.0-SNAPSHOT.jar $SERVER:/opt/soldna/dnacloud-server.jar
scp .env $SERVER:/opt/soldna/.env
scp scripts/deploy.sh $SERVER:/tmp/deploy.sh
```

### 2.2 首次部署（在服务器上执行）

```bash
# 创建运行用户和目录
useradd -r -s /bin/false soldna 2>/dev/null || true
mkdir -p /opt/soldna/{artifacts,logs,data}
chown -R soldna:soldna /opt/soldna

# 安装 JDK 17（Ubuntu）
apt-get update && apt-get install -y openjdk-17-jre-headless

# 创建 systemd service
cat > /etc/systemd/system/solDna.service << 'EOF'
[Unit]
Description=DNAcloud Marketplace Server
After=network.target

[Service]
User=soldna
WorkingDirectory=/opt/soldna
EnvironmentFile=/opt/soldna/.env
ExecStart=/usr/bin/java -Xmx512m -jar /opt/soldna/dnacloud-server.jar
Restart=always
RestartSec=10
StandardOutput=append:/opt/soldna/logs/app.log
StandardError=append:/opt/soldna/logs/app.log

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable solDna
systemctl start solDna

# 检查是否启动成功
sleep 5 && curl -s http://localhost:8093/actuator/health
```

### 2.3 后续更新（只需两步）

```bash
scp server/target/dnacloud-server-1.0.0-SNAPSHOT.jar $SERVER:/opt/soldna/dnacloud-server.jar
ssh $SERVER "systemctl restart solDna && sleep 3 && curl -s http://localhost:8093/actuator/health"
```

---

## 三、配置 .env（填写真实值）

服务器上编辑 `/opt/soldna/.env`，以下是**完整的生产配置**：

```bash
# ─── 服务基础 ─────────────────────────────────────────────────────
SERVER_PORT=8093
# 公网地址，用于拼接 artifact 下载链接（必须与实际访问地址一致）
DNACLOUD_BASE_URL=https://finderfund.cn/solDna

# ─── 数据库（绝对路径，避免与同服务器其他项目冲突）─────────────
# H2 file 模式只允许一个进程持有锁，必须用绝对路径隔离
DB_URL=jdbc:h2:file:/opt/soldna/data/solDna;DB_CLOSE_ON_EXIT=FALSE
DB_USERNAME=sa
DB_PASSWORD=

# ─── Artifact 存储 ────────────────────────────────────────────────
DNACLOUD_ARTIFACT_STORE=/opt/soldna/artifacts

# ─── Solana 网络配置 ──────────────────────────────────────────────
# 生产环境使用 mainnet；开发/测试使用 devnet
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_NETWORK=solana
# mainnet USDC SPL token mint
SOLANA_USDC_MINT=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v

# ─── 平台收款地址 ─────────────────────────────────────────────────
# 买家 x402 USDC 转账的目标地址（Solana 地址）
DNACLOUD_MERCHANT_ADDRESS=AY5669hoJZMxWnaUGtbefiRj4btzXX5iR8Kh9Mtnc4KV

# ─── 安全密钥 ─────────────────────────────────────────────────────
# 生成命令：openssl rand -hex 32
DNACLOUD_ADMIN_API_KEY=<32字节随机值>

# 生成命令：openssl rand -hex 64
DNACLOUD_SIGNING_KEY=<64字节随机值>

# ─── 业务参数 ─────────────────────────────────────────────────────
DNACLOUD_CORS_ORIGINS=https://finderfund.cn/solDna
DNACLOUD_PLATFORM_FEE_RATE=0.10
# 最小结算金额（USDC atomic units，1 USDC = 1,000,000）
DNACLOUD_MINIMUM_PAYOUT=10000
```

修改 `.env` 后重启：

```bash
systemctl restart solDna
```

---

## 四、开放防火墙端口

在**云服务商控制台**的安全组/防火墙规则里添加：

| 端口 | 协议 | 用途 |
|------|------|------|
| 80   | TCP  | HTTP（Nginx，重定向到 443） |
| 443  | TCP  | HTTPS（Nginx 反代到 8093） |
| 8093 | TCP  | 可选，直接暴露（不推荐生产使用） |

---

## 五、配置 Nginx + HTTPS

### 5.1 安装 Nginx

```bash
apt-get install -y nginx certbot python3-certbot-nginx
```

### 5.2 配置反向代理

```bash
## ⚠️ 同服务器多项目部署说明
## finderfund.cn 已有其他项目在运行，不要覆盖整个 server {} 块。
## 只需在现有 finderfund.cn 的 443 server 块中追加下面的 location /solDna/ 段。

# 在现有 nginx 配置文件（通常 /etc/nginx/sites-available/finderfund.cn）中追加：
cat >> /etc/nginx/sites-available/finderfund.cn << 'EOF'

    # ── DNAcloud SOL Marketplace ────────────────────────────────
    # 路径 /dna/ 独占转发给 DNA-SOL 服务（8093 端口）
    # 前缀 /solDna 会被去掉：/solDna/v1/dna/search → /v1/dna/search
    location /solDna/ {
        proxy_pass         http://127.0.0.1:8093/;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
        client_max_body_size 60M;
    }
    # ────────────────────────────────────────────────────────────
EOF

nginx -t && systemctl reload nginx
```

### 5.3 申请 SSL 证书

```bash
# 需要先把 finderfund.cn 的 DNS A 记录指向服务器 IP
certbot --nginx -d finderfund.cn
```

### 5.4 DNS 配置

在 DNS 控制台添加：

| 类型 | 主机名 | 值 | TTL |
|------|--------|-----|-----|
| A | finderfund.cn | 163.7.3.34 | 600 |

---

## 六、上传 Trading Master DNA 官方包

### 6.1 打包

```bash
# 在本地 repo 中执行
cd dna-packages/trading-master-dna
zip -r ../../trading-master-dna-1.0.1.zip . -x "*.DS_Store"
cd ../..
```

### 6.2 验证包结构

```bash
node packages/cli/dist/index.js validate trading-master-dna-1.0.1.zip
```

期望输出：`✔ 包结构验证通过`

### 6.3 上传到 marketplace

```bash
node packages/cli/dist/index.js upload trading-master-dna-1.0.1.zip \
  --payout-address AY5669hoJZMxWnaUGtbefiRj4btzXX5iR8Kh9Mtnc4KV \
  --marketplace-url https://finderfund.cn/solDna
```

### 6.4 验证上传成功

```bash
curl -s "https://finderfund.cn/solDna/v1/dna/trading-master-dna" | python3 -m json.tool | grep -E '"version"|"currency"|"network"'
# 期望：
#   "version": "1.0.1"
#   "currency": "USDC"
#   "network": "solana"
```

---

## 七、发布 npm 包

### 7.1 构建 TypeScript 包

```bash
pnpm -r build
# 构建顺序：schema → validator → mcp-server → cli
```

### 7.2 发布 @soldnacloud/mcp-server

```bash
cd packages/mcp-server
npm publish --access public
```

### 7.3 发布 soldnacloud (CLI)

```bash
cd packages/cli
npm publish --access public
```

发布后，用户可以：

```bash
npm install -g soldnacloud
dnacloud init
```

---

## 八、验收测试

### 8.1 服务端冒烟测试

```bash
BASE=https://finderfund.cn/solDna

# 健康检查
curl -s $BASE/actuator/health
# 期望：{"status":"UP"}

# 搜索包
curl -s "$BASE/v1/dna/search?q=trading" | python3 -m json.tool | grep -E '"currency"|"network"'
# 期望："currency": "USDC" · "network": "solana"

# 无支付请求 artifact → 应返回 402
curl -si "$BASE/v1/dna/trading-master-dna/versions/1.0.0/artifact"
# 期望：HTTP 402 · body 包含 payTo、mint、amount_atomic

# 解析 402 响应内容
curl -s "$BASE/v1/dna/trading-master-dna/versions/1.0.0/artifact" | python3 -m json.tool
# 期望：
# {
#   "error": "payment_required",
#   "payment": {
#     "network": "solana",
#     "payTo": "AY5669...",
#     "mint": "EPjFWdd5...",
#     "amount_atomic": "1000",
#     "amount_display": "0.001 USDC",
#     ...
#   }
# }
```

### 8.2 CLI 端到端安装测试（本地测试模式）

```bash
# 新建测试目录
mkdir /tmp/test-install && cd /tmp/test-install

# init
node /path/to/DNA/packages/cli/dist/index.js init \
  --marketplace-url https://finderfund.cn/solDna

# 查看生成的文件
find . -type f | sort

# install（本地测试模式跳过支付）
DNACLOUD_LOCAL_TEST=true \
  node /path/to/DNA/packages/cli/dist/index.js install trading-master-dna -y

# 期望最终输出：
#   ✔ 安装完成
#   状态: partial（liveTradingReady: ✗ 因未配置交易所 API key，这是预期行为）
```

### 8.3 Solana USDC 真实支付测试

> 前提：OKX OnchainOS CLI 已登录，Solana 钱包有 USDC 余额

```bash
# 1. 查询钱包余额
onchainos wallet balance --chain solana
# 期望：USDC balance ≥ 0.001

# 2. 手动发起转账（模拟 CLI 自动完成的支付步骤）
onchainos wallet send \
  --chain solana \
  --contract-token EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v \
  --amt 1000 \
  --to AY5669hoJZMxWnaUGtbefiRj4btzXX5iR8Kh9Mtnc4KV \
  --force
# 记录返回的 txHash

# 3. 携带支付凭证请求 artifact
TX_HASH="<上一步返回的 txHash>"
PAYER="<你的 Solana 钱包地址>"
CRED=$(echo -n "{\"provider\":\"solana-onchain\",\"txHash\":\"$TX_HASH\",\"nonce\":\"test\",\"network\":\"solana\",\"payer\":\"$PAYER\"}" | base64)

curl -si "https://finderfund.cn/solDna/v1/dna/trading-master-dna/versions/1.0.0/artifact" \
  -H "X-PAYMENT: $CRED"
# 期望：HTTP 200 · body 包含 downloadUrl + paymentReceipt
```

---

## 九、OKX OnchainOS 买家侧配置

买家需要安装并登录 OKX OnchainOS CLI，使其 Solana 钱包中有 USDC。

```bash
# 安装 onchainos
# 参考：https://web3.okx.com/zh-hans/onchainos/dev-docs/wallet/product-and-service

# 登录（邮箱验证码）
onchainos wallet login

# 查看 Solana 钱包地址
onchainos wallet addresses

# 确认有 USDC 余额（mainnet 或 devnet 根据服务端配置）
onchainos wallet balance --chain solana
```

**Solana devnet 测试用 USDC 获取：**
- SOL faucet: https://faucet.solana.com
- USDC faucet: https://faucet.circle.com（选 Solana Devnet）

---

## 十、运维操作

```bash
# 查看服务状态
systemctl status solDna

# 实时日志
journalctl -u solDna -f
# 或
tail -f /opt/soldna/logs/app.log

# 重启（修改 .env 后必须执行）
systemctl restart solDna

# 更新 jar
scp dnacloud-server-*.jar root@163.7.3.34:/opt/soldna/dnacloud-server.jar
ssh root@163.7.3.34 "systemctl restart solDna"

# 手动触发 payout（结算创作者收益）
curl -X POST https://finderfund.cn/solDna/v1/creator/admin/payouts/run-once \
  -H "X-Admin-Api-Key: <DNACLOUD_ADMIN_API_KEY>"

# 查看某个创作者收益
curl "https://finderfund.cn/solDna/v1/creator/earnings?wallet=<solana-address>"
```

---

## 十一、已知限制

| 功能 | 状态 | 说明 |
|------|------|------|
| Solana x402 支付 | ✅ 已实现并 E2E 验证 | OnchainOS `wallet send` + 服务端 Solana RPC `getTransaction` 验证 |
| 链上自动 payout | 部分实现 | payout worker 写账本，链上转账逻辑待接入 Solana web3.js |
| 速率限制 | 未实现 | 建议在 Nginx 层添加 rate limiting |
| 认证系统 | 最简 | Creator 端点仅 payout_address 鉴权；Admin 端点有 API Key 保护 |
| H2 数据库 | 适合演示 | 生产建议迁移到 PostgreSQL / MySQL |
| Solana devnet 延迟 | 已处理 | 验证器内置 3 次重试（间隔 3s），应对 devnet 出块延迟 |

---

## 附：本地开发快速启动

```bash
# 1. 构建
JAVA_HOME=/Library/Java/JavaVirtualMachines/zulu-17.jdk/Contents/Home \
  mvn -f server/pom.xml package -DskipTests
pnpm -r build

# 2. 启动服务端（Solana mainnet 配置）
DNACLOUD_MERCHANT_ADDRESS=AY5669hoJZMxWnaUGtbefiRj4btzXX5iR8Kh9Mtnc4KV \
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com \
SOLANA_NETWORK=solana \
SOLANA_USDC_MINT=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v \
JAVA_HOME=/Library/Java/JavaVirtualMachines/zulu-17.jdk/Contents/Home \
  java -jar server/target/dnacloud-server-1.0.0-SNAPSHOT.jar --server.port=18093

# 3. 健康检查
curl -s http://localhost:18093/actuator/health

# 4. 测试 402 响应
curl -si http://localhost:18093/v1/dna/trading-master-dna/versions/1.0.0/artifact
```
