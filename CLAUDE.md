# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 开发命令

```bash
# 安装依赖
pnpm install

# 构建所有 TypeScript 包（顺序：schema → validator → cli → mcp-server）
pnpm build

# 单包构建（在仓库根目录运行）
pnpm --filter @dnacloud/schema build
pnpm --filter @dnacloud/cli build

# 运行所有测试
pnpm test

# 运行单包测试
pnpm --filter @dnacloud/validator test

# Lint
pnpm lint

# 监视模式开发（并行）
pnpm dev
```

```bash
# Java server（macOS 需指定 JAVA_HOME）
cd server
JAVA_HOME=/Library/Java/JavaVirtualMachines/zulu-17.jdk/Contents/Home mvn package -DskipTests
JAVA_HOME=/Library/Java/JavaVirtualMachines/zulu-17.jdk/Contents/Home java -jar target/dnacloud-server-1.0.0-SNAPSHOT.jar
```

**首次设置**：复制 `cp .env.example .env` 并填写 `DNACLOUD_MERCHANT_ADDRESS`、`DNACLOUD_SIGNING_KEY`、`SOLANA_RPC_URL`。

---

## TypeScript 包结构

| 包 | 路径 | 职责 |
|---|---|---|
| `@dnacloud/schema` | `packages/schema` | DNA manifest 的 TypeScript 类型 + JSON Schema 验证（`DnaManifest`、`InstallPlan`） |
| `@dnacloud/validator` | `packages/validator` | 包结构校验（manifest 合规、签名、路径安全、密钥扫描） |
| `@dnacloud/cli` | `packages/cli` | `dnacloud-sol` CLI 主体；`src/commands/` 对应各子命令；`src/installer/` 安装/验证/回滚；`src/marketplace/` 与服务端交互 |
| `@dnacloud/mcp-server` | `packages/mcp-server` | 向 Claude Code 暴露 `search_dna_packages` 等 MCP 工具 |

**构建依赖顺序**：`schema` → `validator` → `cli` → `mcp-server`（上游改动需重新构建下游）。

---

## 关键文件位置

| 目的 | 文件 |
|---|---|
| CLI 命令入口 | `packages/cli/src/index.ts` |
| 安装逻辑 | `packages/cli/src/installer/Installer.ts` |
| 验证逻辑 | `packages/cli/src/installer/Verifier.ts` |
| OKX x402 签名 | `packages/cli/src/marketplace/PaymentClient.ts` |
| Marketplace API 控制器 | `server/src/main/java/com/okg/dnacloud/controller/MarketplaceController.java` |
| 创作者 API 控制器 | `server/src/main/java/com/okg/dnacloud/controller/CreatorController.java` |
| OKX x402 服务端验证 | `server/src/main/java/com/okg/dnacloud/payment/OkxX402Client.java` |
| Trading Master 包定义 | `dna-packages/trading-master-dna/manifest.json` |
| 安装计划 | `dna-packages/trading-master-dna/install-plan.json` |
| Bootstrap Skill | `dna-packages/bootstrap/.claude/skills/dnacloud/SKILL.md` |

---

## 项目概述

**DNAcloud for Claude Code** — 让用户用自然语言把 Claude Code 初始化成某类专家 Agent。

Phase 1 交付两个正式产品：

1. **DNAcloud Bootstrap** — 让 Claude Code 具备"搜索 DNA 市场 → OKX x402 支付 → 下载 → 安装 → 验证"的完整能力
2. **Trading Master DNA 官方包** — 用户购买后，Claude Code 获得完整交易工作流能力（分析、资金管理、风控、订单预览、复盘）

> 验收目标是**能力可用**，不是盈利。不要优化策略盈利性，不要承诺收益。

---

## 开发顺序（严格按此顺序）

```
1. DNA schema / validator
2. DNAcloud Bootstrap plugin
3. dnacloud-sol CLI (soldnacloud)
4. Marketplace API
5. OKX x402 payment middleware
6. Marketplace client + payment client
7. Trading Master DNA 官方包
8. Claude project installer
9. verify / status / rollback
10. E2E: 用户说"我要一个交易大师"
```

---

## 系统架构

**Client Side**

| 组件 | 职责 |
|---|---|
| DNAcloud Bootstrap Plugin | Skills/Agents/Commands/Hooks 写入当前 Claude Code 项目 |
| dnacloud-sol CLI | `init` / `install` / `verify` / `status` / `rollback` |
| dnacloud MCP Server | 为 Claude Code 提供 marketplace 搜索工具 |
| Package Installer | 解包、校验签名/hash、生成 install preview、写入文件 |
| Verifier | 检查各组件完整性，输出 `active` 状态 |

**Server Side**

| 组件 | 职责 |
|---|---|
| Marketplace API | DNA 包搜索、返回 manifest |
| Package Registry + Artifact Storage | 存储签名 DNA artifact |
| OKX x402 Seller Middleware | 处理 HTTP 402 → 支付 → verify/settle → 返回 artifact |
| Signing Service | 对 artifact 签名 |

---

## Trading Master DNA 包结构

安装后的目标目录结构（写入用户的 Claude Code 项目）：

```
.claude/
  skills/trading-master/
    SKILL.md
    references/
      trading-workflow.md  market-analysis.md  position-sizing.md
      risk-policy.md       order-preview.md    execution-policy.md  trade-review.md
  agents/
    market-analyst.md  portfolio-manager.md  risk-manager.md
    execution-reviewer.md  trade-journalist.md
  commands/
    trade-plan.md  risk-check.md  order-preview.md
    portfolio-status.md  daily-trade-review.md
.mcp.json               ← 只写 server 定义 + 环境变量引用，不写真实 key
.dnacloud/
  config.json  sources.json  lock.json
  installed/trading-master-dna/1.0.0/
    manifest.json  install-plan.json  signature.txt
    package.sha256  payment-receipt.json  install-result.json
```

---

## DNA 来源抽象接口（TypeScript）

Phase 1 只实现 `MarketplaceSource`，但接口必须对来源无感：

```ts
interface DnaSource {
  id: string;
  type: 'marketplace' | 'local-upload' | 'git' | 'enterprise';
  search(query: SearchQuery): Promise<DnaSearchResult[]>;
  getManifest(ref: DnaRef): Promise<DnaManifest>;
  acquire(ref: DnaRef, payment?: PaymentContext): Promise<DnaArtifact>;
}
```

---

## OKX x402 支付流程

```
GET /v1/dna/{id}/versions/{ver}/artifact
→ 402 Payment Required
→ client 签名 OKX x402 payment
→ retry with payment credential
→ server verify + settle with OKX
→ 返回签名 artifact
```

服务端**绝不允许**：verify 失败仍返回 artifact、缺少 OKX env 仍返回 artifact、用 mock receipt。

---

## MCP 配置规范

`.mcp.json` 只写环境变量引用，禁止内置真实 key 或 fake provider：

```json
{
  "mcpServers": {
    "order-execution": {
      "command": "dnacloud-order-mcp",
      "args": ["--venue", "${DNACLOUD_TRADING_VENUE}"],
      "env": {
        "API_KEY": "${TRADING_API_KEY}",
        "API_SECRET": "${TRADING_API_SECRET}"
      }
    }
  }
}
```

缺少用户环境变量 → 进入"待配置"状态，提示用户配置，**不 mock**。

---

## PreToolUse Hook 行为

关注工具：`mcp__order-execution__place_order`、`cancel_order`、`modify_order`、`mcp__wallet__swap`、`approve`

行为逻辑：检查 Trading Master DNA 是否 active → 检查用户配置 → 检查是否经过 order-preview → 是否需要确认 → 输出 `allow / deny / ask`

---

## `dnacloud-sol verify` 验收标准

必须检查（能力完整性，不检查收益）：

```
signature verified、payment receipt found、skills/agents/commands/mcp/hooks/rules installed
CLAUDE.md patch applied、lock file updated、rollback snapshot exists
```

输出示例字段：`liveTradingReady: false` 表示用户未配置真实下单凭据，**不代表安装失败**。

---

## 硬性禁止项

- 不使用 mock payment
- 不伪造行情、账户余额、订单、成交结果
- 缺少真实 MCP 凭据时必须提示配置，不允许生成假数据
- 不承诺盈利，不写复杂盈利策略、高频交易、收益回测美化
- MCP 配置中不写入真实 API key / 私钥

---

## E2E 验收场景

```
全新 Claude Code 项目
→ dnacloud-sol init
→ 用户说"我要一个交易大师"
→ OKX x402 真实购买 Trading Master DNA
→ 安装完成 → dnacloud-sol verify → active
→ /trade-plan、/risk-check、/order-preview 可用
→ 缺少真实 MCP 时提示配置
→ 配置真实 MCP 后可进入下单授权流程
```


## Trading Master DNA（已安装）

Trading Master DNA v1.0.0 官方能力包已安装到此项目。

**可用命令**：`/trade-plan`、`/risk-check`、`/order-preview`、`/portfolio-status`、`/daily-trade-review`

**触发词**：交易计划、市场分析、下单、仓位管理、风控检查、复盘

**重要**：Trading Master DNA 不保证盈利。所有分析需配置真实 MCP 数据源。  
运行 `dnacloud-sol verify trading-master-dna` 查看配置状态。

---

## v0.6：Creator Upload & Revenue Settlement（已实现）

v0.6 在 v0.5 购买/安装主流程上新增三个闭环：

### 新增 CLI 命令

```bash
dnacloud-sol validate <package.zip>          # 本地校验包结构
dnacloud-sol upload <package.zip> --payout-address 0x...   # 上传到市场
dnacloud-sol creator earnings <wallet>       # 查看收益
dnacloud-sol creator payouts <wallet>        # 查看结算记录
dnacloud-sol creator packages <wallet>       # 查看已上传包
```

### 新增 Claude Code 命令

- `/dna-upload` — 引导创作者完成上传流程
- `/dna-earnings` — 查看创作者收益和结算状态
- `/dna-packages` — 查看已上传包列表

### 服务端新增功能

| 端点 | 说明 |
|------|------|
| `POST /v1/creator/upload-session` | 创建上传会话，返回 challenge |
| `POST /v1/creator/packages/upload` | 上传 DNA zip 包 |
| `GET /v1/creator/packages?wallet=` | 查询创作者包列表 |
| `GET /v1/creator/earnings?wallet=` | 查询收益账本 |
| `GET /v1/creator/payouts?wallet=` | 查询结算记录 |
| `POST /v1/creator/admin/payouts/run-once` | 触发 payout worker |

### 数据库（H2）

`application.yml` 已配置 H2 持久化，数据保存在 `./data/dnacloud.mv.db`。

