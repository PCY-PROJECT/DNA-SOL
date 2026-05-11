---
name: dnacloud
description: >
  DNAcloud DNA 包搜索、购买、安装和发布能力。
  当用户表达想要某类专家能力、想安装某个 DNA 包、或想创建/发布 DNA 包时触发。
  触发词：我要一个[专家类型]、安装DNA、DNA market、dnacloud、
  我想要交易能力、给我安装、search DNA、buy DNA、install DNA,
  想要某种专家能力, 给 Claude 安装新能力, Claude 能不能帮我交易,
  我想发布DNA、我想创建DNA包、上传DNA、卖家、creator、我想赚取收益
---

# DNAcloud Skill

## 前置环境检查（触发后第一步，必须通过）

在执行任何买家/卖家流程之前，先检查以下两项：

### 1. DNAcloud CLI 是否已安装

运行 `which dnacloud-sol` 或 `dnacloud-sol --version`：

- **已安装** → 继续下一项检查
- **未安装** → 告知用户并引导安装：

```
DNAcloud CLI 尚未安装。请在终端运行：

  npm install -g soldnacloud

安装完成后，在当前项目目录运行：

  dnacloud-sol init

然后重启 Claude Code，再重试你的请求。
```

### 2. Marketplace MCP 是否已加载

检查当前会话中 `mcp__dnacloud-marketplace__search` 工具是否可用：

- **可用** → 继续执行买家/卖家流程
- **不可用** → 说明 `dnacloud-sol init` 尚未在本项目执行，引导用户：

```
DNAcloud Marketplace MCP 尚未配置。请在当前项目目录终端中运行：

  dnacloud-sol init

这会自动将 dnacloud-marketplace MCP server 写入 .mcp.json。
完成后重启 Claude Code，再重试你的请求。
```

> 注意：CLI 包名为 `soldnacloud`（npm），安装后提供 `dnacloud-sol` 命令。
> 不要引导用户安装 `dnacloud`（那是另一个不相关的包）。

---

## 触发场景（买家）

- 用户说"我要一个交易大师"
- 用户说"帮我搜索可以交易的 DNA"
- 用户说"安装 Trading Master DNA"
- 用户说"我想给 Claude Code 安装新能力"
- 用户直接说出某类需求（如"我需要交易能力"）

## 触发场景（卖家）

- 用户说"我想发布一个 DNA 包"
- 用户说"我想创建一个专家 DNA"
- 用户说"怎么上传 DNA 到 marketplace"
- 用户说"我想查看我的收益"
- 用户说"我是 DNA 创作者"

## 执行流程（买家）

```
0. 支付环境检测（前置，必须通过才能继续）
   → 检查是否已安装 OKX OnchainOS（Agentic Wallet，支持 Solana）
   → 若未安装，进入【支付环境配置引导】流程（见下方），完成后再继续
   → 若已安装，直接进入步骤 1

1. 理解需求 → 识别用户想要的专家能力类型
2. 搜索市场 → 调用 dnacloud-marketplace MCP 搜索相关 DNA 包
3. 展示推荐 → 展示匹配的 DNA 包、价格、能力、权限影响
4. 用户确认 → 等待用户确认购买

5. 第一次调用 CLI（触发支付）：
   运行：dnacloud-sol install <package-id>
   → CLI 会打印出需要执行的 onchainos wallet send 命令，以及收款方地址、金额
   → 记录 CLI 输出的完整 onchainos 命令

6. 执行支付（使用 okx-agentic-wallet skill）：
   → 运行 CLI 打印出的 onchainos wallet send 命令
   → 从返回结果中取得 txHash（Solana tx signature，58 个 Base58 字符）

7. 第二次调用 CLI（验证+安装）：
   运行：dnacloud-sol install <package-id> --tx-hash <txHash>
   → CLI 自动完成：链上支付验证 → 下载 artifact → 签名校验 → 安装预览 → 写入文件 → verify

8. 完成 → 告知用户新能力已可用，列出可用命令
```

> **关键原则**：步骤 5-7 的所有 HTTP 请求、402 处理、X-PAYMENT 构造均由 `dnacloud-sol install` CLI 内部完成。
> Agent 不需要（也不应该）自行构造 HTTP 请求或 X-PAYMENT header。

## 支付环境配置引导

**触发条件**：用户尝试购买 DNA 包时，检测到未安装 OKX OnchainOS。

**引导流程**：

```
购买 DNA 包需要 OKX OnchainOS Agentic Wallet 完成 Solana USDC 链上支付。
Agentic Wallet 私钥由 TEE 保管，无需手动管理私钥。

━━━━━━━━ 安装 OKX OnchainOS ━━━━━━━━

步骤 1：安装 OnchainOS Skills
  npx skills add okx/onchainos-skills

步骤 2：初始化 Agentic Wallet
  onchainos wallet login
  （使用邮箱验证，自动生成 EVM + Solana 钱包地址，私钥在 TEE 内）

步骤 3：为 Solana 钱包充值 USDC（主网）
  - 查看 Solana 地址：onchainos wallet balance --chain solana
  - 确保 Solana 钱包有少量 SOL（用于 gas，约 0.001 SOL）
  - 确保 Solana 钱包有足够 USDC（主网，Trading Master DNA 售价：0.001 USDC）

步骤 4：告诉我"配置完成了"，我会重新检测并继续安装。

⚠️ 说明：
  - Agentic Wallet 私钥在 TEE 内生成，不可导出，用户无需管理私钥
  - 支付通过 onchainos wallet send 完成，服务端用 Solana RPC 链上验证
  - 支付使用 Solana 主网 USDC（mint: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v）

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**检测方式**：检查 onchainos CLI 是否可用，以及 Solana 钱包是否已初始化。
- 可用 → 通过，继续购买流程
- 不可用 → 展示引导，等待完成配置

## 执行流程（卖家）

识别到卖家意图时，引导至对应命令：

```
想创建新包    → /dna-create    （脚手架 + manifest 生成）
想上传/发布   → /dna-upload    （validate → 签名 → 上传）
想查看收益    → /dna-earnings  （收益账本 + 待结算金额）
想查看已上传  → /dna-packages  （包列表 + 状态）
```

卖家引导提示：
- 提醒 `objective` 只能描述"安装什么能力"，不能承诺盈利
- 提醒 MCP 配置中不能写入真实 API key，只用 `${ENV_VAR}` 占位
- 上传前必须先 validate（`dnacloud-sol validate <zip>`）

## 展示格式

搜索结果展示：

```
━━━━━━━━ DNAcloud Marketplace ━━━━━━━━

找到 [N] 个匹配的 DNA 包：

📦 [Package Name] v[version]  ⭐ 官方包
   [description]
   价格: [amount] [currency]
   能力: [capability list]
   安装影响: [file list preview]

输入序号确认购买，或输入 0 取消。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## 工具调用

本 Skill 使用以下 MCP 工具：

- `mcp__dnacloud-marketplace__search` — 搜索 DNA 包
- `mcp__dnacloud-marketplace__get_package` — 获取包详情

安装由 `dnacloud-installer` agent 负责执行。

## 硬性约束

- 不使用 mock payment
- 支付未成功不安装
- 安装前必须展示预览
- 不接受未通过签名验证的 artifact
