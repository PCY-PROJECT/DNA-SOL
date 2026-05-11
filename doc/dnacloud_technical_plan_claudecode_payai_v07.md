# DNAcloud for Claude Code 技术方案 v0.7

版本主题：PayAI x402 Solana Edition  
更新时间：2026-05-11  
目标：在现有 v0.6 代码基础上，将支付层从 OKX x402 替换为 **PayAI x402 on Solana / Solana Devnet**，保留 DNA 包搜索、下载、安装、创作者上传、自动审核、收益账本和异步结算主流程。

---

## 1. 技术总目标

v0.7 只替换支付层，不重构 DNA 包核心模型。

必须完成：

```text
1. 删除或停用 OkxX402PaymentAdapter 主路径。
2. 新增 PayAIX402PaymentAdapter。
3. DNA 包下载接口改为 x402 protected resource。
4. Client 能处理 402 Payment Required。
5. Client 能构造 PayAI x402 payment payload 并重试请求。
6. Server 能通过 PayAI Facilitator 调用 verify / settle。
7. 成功结算后返回真实 DNA artifact。
8. purchase ledger 记录 PayAI x402 settlement 结果。
9. payout ledger 继续支持创作者异步结算。
10. 所有 OKX / OnchainOS 文案和环境变量替换为 PayAI / Solana。
```

不允许：

```text
1. 不允许 mock payment success。
2. 不允许伪造 settlement response。
3. 不允许伪造 transaction hash / receipt。
4. 不允许把用户私钥上传到 Server。
5. 不允许下载接口绕过 payment check。
6. 不允许支付失败后返回付费 DNA artifact。
```

---

## 2. 总架构

```text
Claude Code Project
  ├── DNAcloud Bootstrap Skill / Commands / Agents
  ├── dnacloud CLI
  ├── PayAI x402 Client Adapter
  ├── Package Installer
  └── Verifier

DNAcloud Server
  ├── Marketplace API
  ├── Package Registry
  ├── Protected Download API
  ├── PayAI x402 Merchant Middleware
  ├── PayAI Facilitator Client
  ├── Purchase Ledger
  ├── Revenue Ledger
  ├── Creator Upload API
  ├── Package Validator
  ├── Artifact Storage
  └── Payout Worker

PayAI
  └── Facilitator
      ├── /supported
      ├── /verify
      ├── /settle
      └── /discovery/resources

Solana / Solana Devnet
  └── Payment settlement network
```

---

## 3. 关键设计：PaymentAdapter 抽象

保留支付适配层，但默认实现改为 PayAI。

```ts
export type PaymentProvider = 'payai-x402' | 'solana-direct' | 'okx-x402-legacy';

export interface PaymentAdapter {
  provider: PaymentProvider;

  createPaymentRequirements(input: CreatePaymentRequirementsInput): Promise<PaymentRequirements>;

  handlePaidRequest<T>(input: HandlePaidRequestInput<T>): Promise<PaidResourceResult<T>>;

  verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult>;

  settlePayment(input: SettlePaymentInput): Promise<SettlePaymentResult>;
}
```

v0.7 默认：

```ts
provider = 'payai-x402'
network = 'solana-devnet'
facilitatorUrl = 'https://facilitator.payai.network'
```

保留 legacy OKX adapter 文件可以，但不得作为默认主路径。

---

## 4. 环境变量

删除或废弃：

```bash
OKX_X402_*
ONCHAINOS_*
XLAYER_*
```

新增：

```bash
PAYMENT_PROVIDER=payai-x402
PAYAI_FACILITATOR_URL=https://facilitator.payai.network
PAYAI_NETWORK=solana-devnet
PAYAI_NETWORK_CAIP2=solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1
PAYAI_SETTLEMENT_ASSET=USDC
PAYAI_MERCHANT_ADDRESS=<platform_solana_treasury_or_token_account>
PAYAI_API_KEY_ID=<optional_for_production>
PAYAI_API_KEY_SECRET=<optional_for_production>
DNA_DOWNLOAD_PRICE_DEFAULT=1000000
DNA_PRICE_UNIT=atomic
DNA_PAYOUT_NETWORK=solana-devnet
```

说明：

```text
PAYAI_NETWORK 默认 solana-devnet。
PAYAI_SETTLEMENT_ASSET 建议使用稳定币资产，例如 USDC；不要假设 x402 默认用 SOL。
所有金额必须用 atomic/minor unit 存储，不使用浮点数。
```

---

## 5. Server：Protected Download API

### 5.1 原 v0.6 逻辑

```text
GET /api/v1/packages/:id/download
→ 检查 OKX x402 payment proof
→ 成功返回 artifact
```

### 5.2 v0.7 新逻辑

```text
GET /api/v1/packages/:id/download
→ 如果没有有效 x402 payment payload，返回 402 Payment Required
→ 如果有 payment payload，调用 PayAI Facilitator verify
→ verify 通过后调用 settle
→ settle 通过后创建 purchase record
→ 生成 download grant
→ 返回 DNA artifact
```

### 5.3 伪代码

```ts
app.get('/api/v1/packages/:id/download', async (req, res) => {
  const pkg = await packageRegistry.getPublished(req.params.id);
  if (!pkg) return res.status(404).json({ error: 'package_not_found' });

  const requirements = await payaiAdapter.createPaymentRequirements({
    resource: `/api/v1/packages/${pkg.id}/download`,
    amountAtomic: pkg.pricing.amount_atomic,
    asset: pkg.pricing.asset,
    network: config.payai.network,
    recipient: config.payai.merchantAddress,
    description: `DNAcloud package: ${pkg.name}`,
    metadata: {
      package_id: pkg.id,
      version: pkg.version,
      package_hash: pkg.package_hash
    }
  });

  const paymentPayload = extractX402Payment(req);

  if (!paymentPayload) {
    return respondPaymentRequired(res, requirements);
  }

  const verification = await payaiAdapter.verifyPayment({
    paymentPayload,
    paymentRequirements: requirements
  });

  if (!verification.valid) {
    await ledger.recordFailedPaymentAttempt({ pkg, verification });
    return respondPaymentRequired(res, requirements, verification.error);
  }

  const settlement = await payaiAdapter.settlePayment({
    paymentPayload,
    paymentRequirements: requirements
  });

  if (!settlement.success) {
    await ledger.recordFailedSettlement({ pkg, settlement });
    return res.status(402).json({ error: 'payment_settlement_failed', detail: settlement.error });
  }

  const purchase = await purchaseService.createFromSettlement({
    package: pkg,
    settlement,
    buyer: verification.buyer,
    paymentPayloadHash: hashPaymentPayload(paymentPayload)
  });

  await revenueService.recordCreatorRevenue(purchase);

  res.setHeader('PAYMENT-RESPONSE', settlement.paymentResponseHeader ?? '');
  return artifactService.streamPackage(res, pkg.artifact_path);
});
```

实际代码应优先使用 PayAI / x402 官方 SDK 或 middleware，不要手写完整协议。

---

## 6. Client：处理 402 并重试

### 6.1 CLI 下载流程

```text
dnacloud install trading-master-dna
→ GET /api/v1/packages/trading-master-dna/download
→ 收到 402
→ 解析 payment requirements
→ 调 PayAI x402 client 构造 payment payload
→ 重试 GET，携带 payment header/payload
→ 收到 zip artifact
→ 校验签名
→ 安装
```

### 6.2 伪代码

```ts
export async function downloadPaidPackage(packageId: string) {
  const url = `${config.apiBaseUrl}/api/v1/packages/${packageId}/download`;

  const first = await fetch(url);

  if (first.status !== 402) {
    if (!first.ok) throw new Error(`download_failed:${first.status}`);
    return await first.arrayBuffer();
  }

  const paymentRequirements = await parsePaymentRequired(first);

  const paymentPayload = await payaiClient.createPaymentPayload({
    requirements: paymentRequirements,
    payer: await loadLocalPayerConfig()
  });

  const second = await fetch(url, {
    headers: buildX402PaymentHeaders(paymentPayload)
  });

  if (!second.ok) {
    throw new Error(`paid_download_failed:${second.status}:${await second.text()}`);
  }

  return await second.arrayBuffer();
}
```

实际代码应使用 x402 client helper，如果 SDK 已提供自动 retry wrapper，则用 SDK wrapper。

---

## 7. PayAI Facilitator Client

安装依赖建议：

```bash
pnpm add @payai/facilitator @x402/core
```

示例结构：

```ts
import { facilitator } from '@payai/facilitator';
import { HTTPFacilitatorClient } from '@x402/core/server';

export function createFacilitatorClient() {
  return new HTTPFacilitatorClient(facilitator);
}
```

如果代码库已经有自定义 facilitator client，应实现：

```text
GET /supported
POST /verify
POST /settle
GET /discovery/resources 可选
```

---

## 8. Network 和 Asset 配置

v0.7 默认开发网络：

```text
Network name: solana-devnet
CAIP-2: solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1
```

生产可配置：

```text
Network name: solana
CAIP-2: solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp
```

资产：

```text
默认使用 PayAI facilitator 支持的 Solana x402 支付资产。
建议用稳定币计价，例如 USDC，而不是 SOL 浮动价格。
```

manifest 里不再写：

```json
"network": "eip155:196",
"currency": "USDG"
```

改为：

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
    "address": "<creator_solana_address>",
    "asset": "USDC",
    "network": "solana-devnet"
  }
}
```

---

## 9. 数据库迁移

### 9.1 payment_intents 或 payment_attempts

如果 v0.6 有 OKX payment 表，保留历史字段但新增通用 x402 字段。

```sql
ALTER TABLE payment_attempts ADD COLUMN provider TEXT DEFAULT 'payai-x402';
ALTER TABLE payment_attempts ADD COLUMN facilitator_url TEXT;
ALTER TABLE payment_attempts ADD COLUMN x402_network TEXT;
ALTER TABLE payment_attempts ADD COLUMN x402_network_caip2 TEXT;
ALTER TABLE payment_attempts ADD COLUMN x402_asset TEXT;
ALTER TABLE payment_attempts ADD COLUMN amount_atomic TEXT;
ALTER TABLE payment_attempts ADD COLUMN payment_requirements_json JSONB;
ALTER TABLE payment_attempts ADD COLUMN payment_payload_hash TEXT;
ALTER TABLE payment_attempts ADD COLUMN verify_response_json JSONB;
ALTER TABLE payment_attempts ADD COLUMN settle_response_json JSONB;
ALTER TABLE payment_attempts ADD COLUMN payment_response_header TEXT;
ALTER TABLE payment_attempts ADD COLUMN status TEXT;
```

### 9.2 purchases

```sql
ALTER TABLE purchases ADD COLUMN payment_provider TEXT DEFAULT 'payai-x402';
ALTER TABLE purchases ADD COLUMN payment_network TEXT;
ALTER TABLE purchases ADD COLUMN payment_asset TEXT;
ALTER TABLE purchases ADD COLUMN amount_atomic TEXT;
ALTER TABLE purchases ADD COLUMN settlement_id TEXT;
ALTER TABLE purchases ADD COLUMN settlement_response_json JSONB;
```

### 9.3 creator payout addresses

```sql
ALTER TABLE creator_payout_addresses ADD COLUMN network TEXT DEFAULT 'solana-devnet';
ALTER TABLE creator_payout_addresses ADD COLUMN asset TEXT DEFAULT 'USDC';
ALTER TABLE creator_payout_addresses ADD COLUMN solana_address TEXT;
ALTER TABLE creator_payout_addresses ADD COLUMN ownership_signature TEXT;
```

旧 EVM 地址字段可以保留但不再是默认。

---

## 10. Creator Upload 修改点

### 10.1 地址格式

旧：

```text
0x...
```

新：

```text
Solana base58 public key
```

需要实现：

```ts
validateSolanaPublicKey(address: string): boolean
```

### 10.2 收款地址签名

Challenge：

```text
dnacloud-upload:<nonce>:<package_hash>:<solana_payout_address>:<network>:<timestamp>
```

验证：

```text
使用 Solana wallet signature 校验 creator 控制 payout address。
```

### 10.3 manifest 更新

上传包中如果仍包含旧字段：

```text
eip155:196
USDG
0xCreatorAddress
```

validator 应返回：

```text
failed: unsupported_legacy_okx_payment_fields
```

或者提供迁移提示：

```text
run dnacloud migrate-package --to payai-solana-devnet
```

---

## 11. Payout Worker

PayAI x402 用于买家购买付费资源。创作者 payout 仍由平台账本和 payout worker 执行。

v0.7 payout 目标：

```text
从平台 treasury 向 creator Solana address 转出对应资产。
```

MVP 可分两级：

```text
Level 1：payout task 生成，状态 pending，需要人工执行或后续 worker。
Level 2：worker 执行真实 Solana/SPL token transfer，记录 tx signature。
```

用户原先要求异步打款，所以 v0.7 至少要保留：

```text
payout_pending
payout_processing
payout_paid
payout_failed
```

不要在没有真实转账时标记 `payout_paid`。

---

## 12. API 修改

### 12.1 购买/下载

主接口：

```http
GET /api/v1/packages/:id/download
```

行为：

```text
未支付：402 Payment Required
已支付且 settle 成功：200 application/zip
```

### 12.2 支付状态查询

可选接口，用于 CLI debug：

```http
GET /api/v1/purchases/:id/payment
```

返回：

```json
{
  "provider": "payai-x402",
  "network": "solana-devnet",
  "asset": "USDC",
  "status": "settled",
  "settlement": {}
}
```

### 12.3 Facilitator health

```http
GET /api/v1/payments/payai/health
```

返回：

```json
{
  "provider": "payai-x402",
  "facilitator_url": "https://facilitator.payai.network",
  "supported_networks_checked": true,
  "solana_devnet_supported": true
}
```

---

## 13. 错误码

```text
payment_required
payment_config_missing
payer_config_missing
payment_requirements_parse_failed
payment_payload_create_failed
payment_verify_failed
payment_settle_failed
payment_replay_detected
payment_network_unsupported
payment_asset_unsupported
package_download_locked
legacy_okx_payment_disabled
creator_payout_address_invalid
creator_payout_signature_invalid
```

---

## 14. 安全要求

```text
1. Server 不接收用户私钥。
2. Client 不把 payer private key 写进项目仓库。
3. 本地 payer config 默认写入用户级配置或系统 keychain，不写入 .dnacloud/config.json 明文。
4. 下载付费包必须依赖 settlement 成功。
5. payment payload hash 要入库，避免重复访问争议。
6. package artifact 必须签名并校验 hash。
7. creator payout 地址必须签名验证。
8. payout worker 不能把结算打到 manifest 之外的地址。
9. 旧 OKX payment endpoint 必须禁用或标记 legacy。
10. 所有金额用 atomic string，不使用 float。
```

---

## 15. 测试计划

### 15.1 Unit Tests

```text
PaymentAdapter config parsing
manifest pricing migration
Solana address validation
creator payout signature challenge generation
payment status mapping
ledger calculations
```

### 15.2 Integration Tests

必须连接真实 PayAI facilitator 或测试环境：

```text
GET protected DNA endpoint returns 402
Client handles 402 and retries with payment
Facilitator verify returns valid
Facilitator settle succeeds
Server returns real artifact
Purchase ledger written
Revenue ledger written
```

如果没有真实 payer 或 facilitator 环境，integration test 应跳过并标记：

```text
SKIPPED_PAYAI_ENV_MISSING
```

不能伪造通过。

### 15.3 E2E Demo

```text
1. dnacloud init
2. dnacloud search trading
3. dnacloud install trading-master-dna
4. 首次请求收到 402
5. PayAI x402 on Solana Devnet 支付成功
6. 包下载
7. 安装到 .claude/
8. dnacloud verify passed
9. purchase ledger 有 settlement record
10. payout ledger 有 pending creator revenue
```

---

## 16. 文件改动建议

AI 应优先搜索这些关键词：

```text
OKX
OnchainOS
xlayer
X Layer
USDG
eip155:196
okx-x402
OkxX402PaymentAdapter
payment_intent
payment_requirements
```

建议新增：

```text
packages/payment/src/adapters/payai-x402.ts
packages/payment/src/payai/facilitator.ts
packages/payment/src/payai/client.ts
packages/payment/src/x402/headers.ts
packages/payment/src/x402/errors.ts
packages/server/src/routes/packageDownload.ts
packages/server/src/routes/payaiHealth.ts
packages/cli/src/commands/payment-init.ts
packages/cli/src/commands/install.ts
packages/validator/src/validateSolanaPayout.ts
```

建议保留但降级：

```text
packages/payment/src/adapters/okx-x402.ts  // legacy only
```

---

## 17. 参考资料

- PayAI x402 Introduction: https://docs.payai.network/x402/introduction
- PayAI Quickstart: https://docs.payai.network/x402/quickstart
- PayAI Merchant Introduction: https://docs.payai.network/x402/servers/introduction
- PayAI Client Introduction: https://docs.payai.network/x402/clients/introduction
- PayAI Facilitator Introduction: https://docs.payai.network/x402/facilitators/introduction
- PayAI Supported Networks: https://docs.payai.network/x402/supported-networks
- Claude Code Plugins: https://docs.claude.com/en/docs/claude-code/plugins
