# DNAcloud for Claude Code 产品方案 v0.7

版本主题：PayAI x402 Solana Edition  
更新时间：2026-05-11  
上一版本：v0.6 Creator Upload & Revenue Settlement  
本版本目标：在不改变 DNAcloud 买家购买、创作者上传、自动审核、平台收款、异步结算主流程的前提下，把原 OKX x402 支付层替换为 **PayAI x402 on Solana / Solana Devnet**。

---

## 1. 本版核心结论

v0.7 只做支付层和钱包引导的替换，不重写产品主线。

旧版本：

```text
买家请求 DNA 包
→ 服务端返回 OKX x402 payment requirement
→ 买家通过 OKX OnchainOS x402 支付
→ 服务端验证
→ 返回 DNA 包
```

新版本：

```text
买家请求 DNA 包
→ DNAcloud Server 作为 x402 Merchant 返回 402 Payment Required
→ DNAcloud Client 使用 PayAI x402 on Solana / Solana Devnet 构造 payment payload
→ DNAcloud Server 通过 PayAI Facilitator verify / settle
→ 支付结算成功后返回 DNA 包
→ Client 安装到当前 Claude Code 项目
```

产品一句话保持不变：

> **DNAcloud：一句话，继承高手 DNA。**

但支付叙事变为：

> **通过 PayAI x402 on Solana 购买并安装专家 Agent DNA。**

---

## 2. 为什么改成 PayAI x402

DNAcloud 的核心资源是 DNA 包下载接口，本质是一个 HTTP 付费资源。PayAI x402 正适合这个模式：客户端请求资源，服务端返回 `402 Payment Required`，客户端提交支付 payload，服务端验证/结算后返回资源。

相比普通 SOL checkout，PayAI x402 更符合 DNAcloud 的 Agent-native 场景：

```text
用户说：“我要一个交易大师”
→ Claude Code / DNAcloud Skill 请求付费 DNA 资源
→ 遇到 402
→ 自动处理 x402 支付
→ 下载并安装 DNA 包
```

因此 v0.7 的支付主路径不再是“打开支付页面让人点击转账”，而是“Agent/CLI 面向 HTTP 资源完成 x402 付费访问”。

---

## 3. 版本范围

### 3.1 本版本要做

```text
1. 把 OKX x402 Payment Adapter 替换为 PayAI x402 Payment Adapter。
2. 支持 Solana Devnet 作为默认开发网络。
3. 支持 Solana mainnet 作为后续生产网络配置。
4. DNA 包付费下载接口改为标准 x402 protected resource。
5. DNAcloud Client 能处理 402、构造 payment payload、重试下载。
6. 支付成功后继续沿用原安装流程：校验签名、展示安装预览、安装、verify。
7. 创作者上传和自动审核流程保持 v0.6 设计。
8. 买家付款仍先进入平台收款地址，账本记录创作者收益。
9. payout worker 继续异步将收益结算到 DNA 包绑定的创作者 Solana 收款地址。
10. 支付相关文案、配置、环境变量、错误提示全部从 OKX 改为 PayAI / Solana。
```

### 3.2 本版本不做

```text
1. 不重做 Trading Master DNA 内容。
2. 不承诺 Trading Master DNA 盈利。
3. 不做复杂推荐算法。
4. 不做完整创作者主页。
5. 不做人工审核后台。
6. 不做退款/争议系统。
7. 不做多支付通道 UI。
8. 不保留 OKX 作为主支付路径。
9. 不把用户私钥托管在 DNAcloud Server。
10. 不伪造 payment success、settlement response、tx hash 或 receipt。
```

---

## 4. 新产品定位

### 4.1 对小白用户

小白用户不需要理解：

```text
Claude Code Skill
Subagent
MCP
Hook
Command
Rule
Test
Payment Adapter
```

他只需要说：

```text
我要一个交易大师。
```

DNAcloud 负责：

```text
搜索 DNA 市场
→ 展示官方包和社区包
→ 展示自动评分、安全检测、官方标记
→ 通过 PayAI x402 on Solana 支付
→ 下载签名 DNA 包
→ 安装到当前 Claude Code 项目
→ verify 生效
```

### 4.2 对创作者

创作者可以上传自己的 DNA 包并设置收款地址：

```text
合约审计 DNA
KOL 助手 DNA
交易风控 DNA
电商老师 DNA
投研分析 DNA
```

用户购买后：

```text
买家通过 PayAI x402 支付
→ 资金进入 DNAcloud 平台收款地址
→ 平台账本记录 creator revenue
→ payout worker 异步结算给该 DNA 包绑定的创作者 Solana 地址
```

### 4.3 对平台

DNAcloud 平台不做交易策略本身，也不做用户交易钱包托管。平台做的是：

```text
DNA 标准
DNA 仓库
自动安全检测
包签名
PayAI x402 付费访问
下载授权
Claude Code 安装器
收益账本
异步结算
```

---

## 5. 用户购买流程 v0.7

```text
1. 用户已经安装 DNAcloud Bootstrap。
2. 用户在 Claude Code 中说：“我要一个交易大师。”
3. DNAcloud Skill 搜索 Marketplace。
4. 返回 Trading Master DNA、合约审计 DNA、KOL 助手 DNA 等候选。
5. 用户选择 Trading Master DNA。
6. Client 请求：GET /api/v1/packages/trading-master-dna/download。
7. Server 返回 402 Payment Required + PayAI x402 payment requirements。
8. Client 检查本地 PayAI/x402 payer 配置。
9. 如果缺少配置，进入支付环境初始化引导。
10. Client 构造 payment payload，并重新请求下载接口。
11. Server 通过 PayAI Facilitator verify / settle。
12. 结算成功后，Server 返回签名 DNA 包。
13. Client 校验 package hash 和 platform signature。
14. Client 展示安装预览。
15. 用户确认安装。
16. Client 安装 Skills / Agents / Commands / MCP / Hooks / Rules / Tests。
17. Client 运行 dnacloud verify。
18. 状态变为 active。
```

---

## 6. 支付环境初始化体验

v0.7 不再引导安装 OKX OnchainOS。

改为：

```text
检测 PayAI x402 / Solana payer 配置
→ 缺失则提示用户初始化
→ 选择网络：Solana Devnet / Solana Mainnet
→ 配置 payer wallet 或打开后续 Web Checkout
→ 测试 paid echo endpoint 或 DNAcloud free test endpoint
→ 保存本地 dnacloud payment config
```

第一期建议提供两种模式：

### 6.1 Developer Mode

适合黑客松 demo 和开发者。

```text
用户本地配置 payer private key / keypair path / wallet adapter
Client 可以自动处理 402、签名、重试
```

必须提示：

```text
不要使用主钱包私钥。
建议使用测试钱包或专门付款钱包。
```

### 6.2 User Mode，后续增强

适合小白用户。

```text
Client 打开 DNAcloud Web Checkout
用户通过 Solana 钱包授权支付 session
Client 获得短期 payment session
继续下载和安装
```

v0.7 可以先实现 Developer Mode，保留 User Mode 扩展点。

---

## 7. 创作者上传流程保持不变，但地址改为 Solana

创作者上传路径继续沿用 v0.6：

```text
创作者 dnacloud init
→ 上传 DNA zip 包
→ 填写价格、分类、描述、版本
→ 填写 Solana 收款地址
→ 用该地址签名证明所有权
→ 平台自动审核
→ 审核通过后平台签名并上架
```

变化点：

```text
payout.address 必须是 Solana 地址
pricing.network 默认 solana-devnet
pricing.currency 默认 USDC 或平台配置的 Solana x402 支付资产
payout.network 默认 solana-devnet
```

---

## 8. 官方包和社区包

当前市场状态：

```text
官方包：Trading Master DNA
社区包：合约审计 DNA、KOL 助手 DNA
```

每个包展示：

```text
Official / Community 标记
自动评分
自动安全检测结果
价格
支付网络
创作者地址
安装内容
更新时间
版本号
```

Trading Master DNA 的目标保持不变：

```text
让用户获取交易分析、资金管理、策略流程、风险控制、订单预览、MCP 接入和复盘能力。
```

不是：

```text
保证盈利
预测准确
自动赚钱
复杂量化优化
```

---

## 9. 资金流 v0.7

```text
买家 payer wallet
  │
  │ PayAI x402 on Solana / Solana Devnet
  ▼
DNAcloud merchant / treasury address
  │
  │ purchase ledger
  ▼
DNAcloud revenue ledger
  │
  │ payout worker
  ▼
创作者 Solana payout address
```

说明：

```text
PayAI x402 负责买家访问付费 DNA 资源时的支付验证和结算。
DNAcloud 负责业务账本、DNA 包解锁和创作者收益记录。
payout worker 负责异步向创作者地址结算。
```

---

## 10. 关键产品状态

支付状态：

```text
payment_required
payment_payload_created
payment_verifying
payment_settling
payment_settled
payment_failed
payment_replayed
payment_expired
```

购买状态：

```text
created
paid
download_granted
downloaded
installed
verified
failed
```

包状态：

```text
draft
uploaded
validating
rejected
published
deprecated
removed
```

结算状态：

```text
revenue_pending
payout_pending
payout_processing
payout_paid
payout_failed
```

---

## 11. 成功验收标准

v0.7 完成后，必须能演示：

```text
1. dnacloud init 成功安装 DNAcloud Bootstrap。
2. 用户说“我要一个交易大师”。
3. Marketplace 返回 Trading Master DNA。
4. 下载接口首次返回 402 Payment Required。
5. DNAcloud Client 使用 PayAI x402 on Solana Devnet 完成支付。
6. Server 调 PayAI Facilitator verify / settle 成功。
7. DNA 包被真实返回，不是 mock。
8. Client 安装 DNA 包到当前 Claude Code 项目。
9. dnacloud verify 通过。
10. purchase ledger 和 revenue ledger 写入真实支付记录。
11. 创作者上传包仍可自动审核和上架。
12. payout worker 能对已结算 purchase 生成 payout 任务。
```

---

## 12. 对外宣传语更新

```text
DNAcloud：一句话，继承高手 DNA。
```

```text
用 PayAI x402 on Solana 购买专家 Agent DNA，并一键安装到 Claude Code。
```

```text
不是 prompt 市场，是可支付、可安装、可验证的 Agent DNA 市场。
```

```text
小白继承高手 DNA，创作者出售优秀 DNA。
```

---

## 13. 参考资料

- PayAI x402 Introduction: https://docs.payai.network/x402/introduction
- PayAI x402 Quickstart: https://docs.payai.network/x402/quickstart
- PayAI Facilitator Introduction: https://docs.payai.network/x402/facilitators/introduction
- PayAI Supported Networks: https://docs.payai.network/x402/supported-networks
- Claude Code Plugins: https://docs.claude.com/en/docs/claude-code/plugins
