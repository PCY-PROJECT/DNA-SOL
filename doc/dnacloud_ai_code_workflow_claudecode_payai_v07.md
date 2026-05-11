# DNAcloud for Claude Code AI Code 工作流 v0.7

版本主题：PayAI x402 Solana Edition  
目标：指导 AI 在已有 v0.6 代码基础上，将支付层从 OKX x402 修改为 **PayAI x402 on Solana / Solana Devnet**。保留原有 DNA 包购买、安装、创作者上传、自动审核和收益结算主流程。

---

## 0. 总原则

1. 不要重写整个项目。
2. 不要改掉 DNA 包结构、安装器、verify、creator upload 主流程，除非支付字段必须变更。
3. 本次只做支付层替换：OKX x402 → PayAI x402 on Solana / Solana Devnet。
4. 不要 mock payment success。
5. 不要伪造 settlement response、tx hash、receipt、purchase paid 状态。
6. 没有 PayAI payer 或 facilitator 配置时，E2E 必须失败或跳过并清楚提示。
7. Server 不接收用户私钥。
8. 本地开发者 payer 配置不要写入项目 git 文件。
9. 创作者 payout 地址改为 Solana 地址。
10. 所有金额使用 atomic/minor unit 字符串，不使用 float。

---

## 1. 开发总顺序

```text
Milestone 1：代码审计，定位 OKX 支付相关实现
Milestone 2：引入支付抽象和 PayAI 配置
Milestone 3：实现 PayAIX402PaymentAdapter
Milestone 4：改造付费 DNA 下载接口为 x402 protected resource
Milestone 5：改造 CLI / Skill 安装流程以处理 402
Milestone 6：改造 manifest、creator upload、payout address 为 Solana 字段
Milestone 7：改造 ledger 和数据库字段
Milestone 8：更新错误处理、文案、环境变量
Milestone 9：补充 PayAI / Solana Devnet 集成测试
Milestone 10：跑通 E2E：购买 Trading Master DNA → 下载 → 安装 → verify
```

---

## 2. Milestone 1：代码审计

### 目标

找出所有 OKX / OnchainOS / X Layer 支付相关代码。

### 指令

在代码库根目录执行：

```bash
grep -R "OKX\|Okx\|okx\|OnchainOS\|onchainos\|xlayer\|X Layer\|eip155:196\|USDG\|okx-x402" -n . \
  --exclude-dir=node_modules \
  --exclude-dir=.git \
  --exclude-dir=dist \
  --exclude-dir=build
```

输出一个清单：

```text
文件路径
命中内容
用途判断：server/client/schema/docs/test/env
处理方式：replace / legacy / delete / ignore
```

### 验收

生成：

```text
docs/migration/okx-to-payai-audit.md
```

里面列出所有需要改的文件。

---

## 3. Milestone 2：配置层替换

### 目标

新增 PayAI x402 配置，禁用 OKX 默认配置。

### 要改

新增环境变量模板：

```bash
PAYMENT_PROVIDER=payai-x402
PAYAI_FACILITATOR_URL=https://facilitator.payai.network
PAYAI_NETWORK=solana-devnet
PAYAI_NETWORK_CAIP2=solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1
PAYAI_SETTLEMENT_ASSET=USDC
PAYAI_MERCHANT_ADDRESS=
PAYAI_API_KEY_ID=
PAYAI_API_KEY_SECRET=
```

删除或注释旧模板：

```bash
OKX_X402_*
ONCHAINOS_*
XLAYER_*
```

配置解析规则：

```text
如果 PAYMENT_PROVIDER 未设置，默认 payai-x402。
如果 PAYAI_NETWORK 未设置，默认 solana-devnet。
如果 PayAI merchant address 缺失，server 启动应警告；付费下载接口应返回 payment_config_missing。
```

### 验收

```bash
pnpm test config
```

必须覆盖：

```text
默认 provider 是 payai-x402
solana-devnet CAIP-2 正确
缺 merchant address 时不允许 paid download
旧 OKX 配置不会成为默认
```

---

## 4. Milestone 3：实现 PayAIX402PaymentAdapter

### 目标

在 payment package 中新增 PayAI x402 适配器。

### 建议文件

```text
packages/payment/src/adapters/payai-x402.ts
packages/payment/src/payai/facilitator.ts
packages/payment/src/x402/headers.ts
packages/payment/src/x402/types.ts
packages/payment/src/x402/errors.ts
```

### 依赖

```bash
pnpm add @payai/facilitator @x402/core
```

如果项目包管理不是 pnpm，按现有工具调整。

### 实现要点

```text
1. 创建 facilitator client。
2. 支持 /supported health check。
3. 支持 create payment requirements。
4. 支持 verify payment payload。
5. 支持 settle payment payload。
6. 标准化错误码。
7. 将 PayAI response 映射为内部 PaymentResult。
```

### 不要做

```text
不要手写完整 x402 协议解析，如果 SDK 已提供 helper。
不要自己实现区块链确认逻辑来替代 facilitator。
不要把 PayAI facilitator URL 写死在业务代码里。
```

### 验收

```bash
pnpm test payment
```

至少通过：

```text
PayAIX402PaymentAdapter loads config
facilitator URL 可配置
network mapping 正确
unsupported network 返回 payment_network_unsupported
verify/settle 失败能正常映射错误
```

---

## 5. Milestone 4：改造付费下载接口

### 目标

`GET /api/v1/packages/:id/download` 成为 x402 protected resource。

### 行为要求

```text
无支付 payload：返回 402 Payment Required。
支付 payload 无效：返回 402 或 400，并记录 failed attempt。
verify 成功但 settle 失败：返回 402 payment_settle_failed。
settle 成功：写 purchase ledger，返回 DNA zip。
```

### 要做

1. 把原 OKX 验证逻辑替换成 PayAIX402PaymentAdapter。
2. 返回标准 x402 payment requirements。
3. 从请求 headers/body 中提取 payment payload。
4. 调 verify。
5. 调 settle。
6. settlement 成功后写 purchase。
7. 写 revenue ledger。
8. 返回 artifact。

### 验收

使用没有付款的 curl 请求：

```bash
curl -i http://localhost:3000/api/v1/packages/trading-master-dna/download
```

应返回：

```text
HTTP/1.1 402 Payment Required
```

并包含 x402 payment requirements。

---

## 6. Milestone 5：改造 CLI / Skill 下载流程

### 目标

`dnacloud install <package>` 能处理 PayAI x402 付款。

### 要做

修改：

```text
packages/cli/src/commands/install.ts
packages/cli/src/payment/*
DNAcloud Skill 的 install workflow 文档
```

流程：

```text
1. 请求 download endpoint。
2. 如果 200，说明免费包或已有授权，继续安装。
3. 如果 402，解析 payment requirements。
4. 检查 payer config。
5. 没有 payer config 时提示 dnacloud payment init。
6. 构造 payment payload。
7. 携带 payment payload 重试。
8. 成功后保存 artifact。
9. 校验 signature/hash。
10. 继续安装。
```

新增命令：

```bash
dnacloud payment init
dnacloud payment status
dnacloud payment test
```

### 验收

```bash
dnacloud install trading-master-dna
```

必须出现：

```text
402 Payment Required received
PayAI x402 payment created
Payment settled
DNA package downloaded
Install preview generated
Verify passed
```

没有 payer 配置时：

```text
Payment config missing. Run dnacloud payment init.
```

---

## 7. Milestone 6：Creator Upload 字段迁移

### 目标

创作者收款地址从 EVM/OKX 字段迁移到 Solana。

### 修改 schema

旧字段：

```json
{
  "pricing": {
    "currency": "USDG",
    "network": "eip155:196"
  },
  "payout": {
    "address": "0x...",
    "network": "eip155:196"
  }
}
```

新字段：

```json
{
  "pricing": {
    "amount_atomic": "1000000",
    "display_amount": "1.00",
    "asset": "USDC",
    "network": "solana-devnet",
    "network_caip2": "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1"
  },
  "payout": {
    "address": "<solana_base58_address>",
    "asset": "USDC",
    "network": "solana-devnet"
  }
}
```

### Validator

新增：

```text
validateSolanaAddress
validatePayaiNetwork
validatePricingAtomicAmount
rejectLegacyOkxFields
```

### 验收

```bash
dnacloud validate fixtures/valid-solana-dna.zip => passed
dnacloud validate fixtures/legacy-okx-dna.zip => failed with migration hint
dnacloud validate fixtures/invalid-solana-address.zip => failed
```

---

## 8. Milestone 7：数据库和账本迁移

### 目标

账本从 OKX-specific 改成 provider-agnostic，默认 PayAI。

### 要做

新增或迁移字段：

```text
payment_provider
payment_network
payment_network_caip2
payment_asset
amount_atomic
facilitator_url
payment_requirements_json
payment_payload_hash
verify_response_json
settle_response_json
settlement_id
payment_response_header
```

旧字段保留为 nullable legacy：

```text
okx_payment_id
xlayer_tx_hash
usd_amount_float
```

不得再使用 float 金额。

### 验收

```text
purchase ledger 能记录 PayAI settlement
revenue ledger 能按 package creator 计算收益
payout worker 能读取 creator Solana payout address
```

---

## 9. Milestone 8：Payout Worker 更新

### 目标

payout worker 继续保留异步结算，但目标地址改为 Solana 地址。

### 本版最低要求

```text
1. 已支付 purchase 生成 creator revenue。
2. creator revenue 生成 payout task。
3. payout task 记录 Solana payout address、asset、amount_atomic、network。
4. 如果真实转账实现未完成，状态必须是 payout_pending 或 payout_failed_config_missing。
5. 不能显示 payout_paid。
```

### 可选增强

实现真实 SPL token payout：

```text
platform treasury token account
→ creator associated token account
→ record tx signature
```

### 验收

```text
购买完成后能看到 creator earnings。
payout worker run 后生成 payout task。
没有 treasury signer 时不标记 paid。
```

---

## 10. Milestone 9：文案和官网修改

替换所有：

```text
OKX x402
OKX OnchainOS
X Layer
USDG
```

改为：

```text
PayAI x402 on Solana
Solana Devnet
Agent-native x402 payment
USDC on Solana 或配置的 Solana x402 asset
```

宣传语：

```text
一句话，继承高手 DNA。
用 PayAI x402 on Solana 购买并安装专家 Agent DNA。
```

不要写：

```text
如果用户没安装 OKX OnchainOS，会引导安装。
```

改为：

```text
如果用户没有配置 PayAI x402 / Solana payer，DNAcloud 会引导初始化支付环境。
```

---

## 11. Milestone 10：E2E 验收

### 场景 A：买家购买官方包

```bash
dnacloud init
dnacloud payment init --network solana-devnet
dnacloud search trading
dnacloud install trading-master-dna
dnacloud verify
```

必须证明：

```text
首次 download 返回 402
PayAI payment payload 创建成功
Facilitator verify/settle 成功
artifact 下载成功
安装成功
verify 成功
purchase ledger 有记录
revenue ledger 有记录
```

### 场景 B：创作者上传社区包

```bash
dnacloud upload ./fixtures/kol-assistant-dna.zip \
  --price-atomic 1000000 \
  --asset USDC \
  --network solana-devnet \
  --payout-address <creator_solana_address>
```

必须证明：

```text
自动校验通过
Solana payout address 合法
包上架
Marketplace 可搜索
买家可购买
```

### 场景 C：支付失败

模拟缺少 payer config：

```bash
dnacloud install trading-master-dna
```

必须输出：

```text
Payment config missing. Run dnacloud payment init.
```

不能下载包。

---

## 12. AI 改代码时的检查清单

完成前逐项确认：

```text
[ ] OKX 不再是默认支付 provider。
[ ] PAYAI_FACILITATOR_URL 已配置。
[ ] PAYAI_NETWORK 默认 solana-devnet。
[ ] Download endpoint 无 payment 返回 402。
[ ] Client 能处理 402。
[ ] Client 能构造 x402 payment payload。
[ ] Server 能 verify / settle。
[ ] 支付失败不能下载 DNA。
[ ] 支付成功才能写 purchase。
[ ] purchase 写入 payment_provider=payai-x402。
[ ] 创作者 payout address 是 Solana address。
[ ] legacy OKX manifest 会被拒绝或提示迁移。
[ ] dnacloud verify 不依赖 payment mock。
[ ] E2E 日志能看到 PayAI / Solana Devnet。
```

---

## 13. 禁止事项

```text
不要在代码里 hardcode 私钥。
不要把测试私钥提交到 repo。
不要绕过 402 直接返回包。
不要用 setTimeout 假装支付确认。
不要把 payment status 手动置为 paid。
不要在无真实 settlement 时生成 download grant。
不要把旧 OKX 文案留在用户可见页面。
不要把 SOL 和 USDC 混用；价格资产必须从配置读取。
```

---

## 14. 交付物

本轮 AI Code 最终应提交：

```text
1. PayAIX402PaymentAdapter
2. PayAI config/env schema
3. Protected package download endpoint
4. CLI 402 handling and payment init
5. Solana payout address validator
6. Manifest pricing/payout schema migration
7. Payment/revenue ledger migration
8. Updated docs and website copy
9. Integration test instructions
10. E2E demo script
```

---

## 15. 参考资料

- PayAI x402 Introduction: https://docs.payai.network/x402/introduction
- PayAI Quickstart: https://docs.payai.network/x402/quickstart
- PayAI Servers: https://docs.payai.network/x402/servers/introduction
- PayAI Clients: https://docs.payai.network/x402/clients/introduction
- PayAI Facilitators: https://docs.payai.network/x402/facilitators/introduction
- PayAI Supported Networks: https://docs.payai.network/x402/supported-networks
- Claude Code Plugins: https://docs.claude.com/en/docs/claude-code/plugins
