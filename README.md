# DNAcloud

> **一句话，继承高手 DNA。**  
> Say what expert you need. DNAcloud handles the rest — search, pay on Solana, install.

DNAcloud is an **Agent DNA Marketplace for Claude Code**, built on Solana. Users describe the expert they want in natural language; DNAcloud automatically searches the marketplace, pays via **x402 on Solana USDC**, downloads, verifies, and installs the capability pack into the current Claude Code project.

---

## The Problem

AI coding agents are powerful but blank by default. Giving Claude Code domain expertise today means hours of manual configuration: writing Skills, wiring MCP servers, crafting Agents, setting up Hooks, and tuning Rules — per project, by hand.

There's no standard format, no marketplace, no payment layer, no install protocol.

## What DNAcloud Does

```
User: "我要一个交易大师"  ("I want a trading master")

DNAcloud Skill  →  search Marketplace API
                →  present: Trading Master DNA · 0.001 USDC · Score 98/100
User confirms

dnacloud CLI    →  GET /artifact  →  402 Payment Required (Solana USDC)
                →  onchainos wallet send --chain solana --amt 1000 --to AY5669...
                →  txHash: 4mpR5QQg...
                →  retry with X-PAYMENT credential
                →  Server verifies on-chain via Solana RPC
                →  200 OK · signed artifact returned

Installer       →  verify signature + SHA256
                →  show install preview
                →  write: Skills / Agents / Commands / MCP / Hooks / Rules
                →  dnacloud verify → active ✓

New commands available: /trade-plan  /risk-check  /order-preview
```

---

## Key Features

| Feature | Description |
|---------|-------------|
| **x402 on Solana** | HTTP 402 payment protocol — Agent pays USDC atomically per capability install, no accounts, no subscriptions |
| **OKX OnchainOS** | Agentic wallet infrastructure (`onchainos wallet send`) — manages Solana wallet, signs and broadcasts transfers |
| **On-chain verification** | Server calls Solana RPC `getTransaction` to verify merchant received ≥ required USDC before releasing artifact |
| **Signed artifacts** | Every DNA package is SHA256 + platform-signed; installer verifies before writing a single file |
| **Claude Code native** | Installs as Skills, Agents, Slash Commands, MCP configs, Hooks, and Rules — the full Claude Code extension surface |
| **Creator economy** | Anyone can upload DNA packages; payout worker settles revenue to creator's Solana address automatically |

---

## Architecture

```
┌─────────────────── Claude Code (user's project) ──────────────────┐
│                                                                     │
│  DNAcloud Bootstrap (installed via dnacloud init)                  │
│  ├── Skill: dnacloud          ← triggered by natural language      │
│  ├── Agent: market-researcher ← searches Marketplace API           │
│  ├── Agent: installer         ← unpacks + writes files             │
│  └── Commands: /dna-install  /dna-upload  /dna-earnings  …        │
│                                                                     │
│  dnacloud CLI   ──── x402 payment flow ────────────────────────►  │
│  dnacloud MCP Server  (search_dna_packages tool)                   │
└───────────────────────────────┬────────────────────────────────────┘
                                │ HTTP (REST)
                                ▼
┌──────────── DNAcloud Server (Spring Boot 3 / Java 17) ────────────┐
│                                                                     │
│  MarketplaceController   ← search, package detail, 402 artifact    │
│  ArtifactService         ← parse X-PAYMENT, verify, settle         │
│  SolanaPaymentVerifier   ← Solana RPC getTransaction               │
│  CreatorController       ← upload, earnings, payout worker         │
│                                                                     │
│  H2 persistent DB  (packages, receipts, revenue, payouts)          │
└───────────────────────────────┬────────────────────────────────────┘
                                │ Solana RPC
                                ▼
                    ┌─── Solana Mainnet / Devnet ───┐
                    │  verify: merchant received     │
                    │  USDC ≥ required amount_atomic │
                    └────────────────────────────────┘
```

### x402 Payment Flow

```
Client                              Server                       Solana
  │                                    │                            │
  │── GET /artifact ──────────────────►│                            │
  │◄── 402 { payTo, mint,              │                            │
  │         amount_atomic, nonce } ────│                            │
  │                                    │                            │
  │── onchainos wallet send ───────────────────────────────────────►│
  │◄── txHash ──────────────────────────────────────────────────────│
  │                                    │                            │
  │── GET /artifact                    │                            │
  │   X-PAYMENT: { txHash, payer } ───►│                            │
  │                                    │── getTransaction(txHash) ─►│
  │                                    │◄── tx + token balances ────│
  │                                    │  verify: delta ≥ 1000 atomic
  │◄── 200 OK { artifact,             │                            │
  │            paymentReceipt } ───────│                            │
```

---

## Repo Structure

```
DNA-SOL/
├── packages/                    # TypeScript (pnpm workspace)
│   ├── schema/                  # DnaManifest + InstallPlan types
│   ├── validator/               # local package structure validator
│   ├── cli/                     # dnacloud CLI (Node 18+)
│   │   ├── src/commands/        # init / install / verify / status / rollback / upload / creator
│   │   ├── src/installer/       # Installer · Verifier · Rollback
│   │   └── src/marketplace/     # MarketplaceClient · PaymentClient (x402 Solana)
│   ├── mcp-server/              # MCP server — exposes search_dna_packages to Claude Code
│   └── web/                     # Marketplace web UI (Vite + React)
│
├── server/                      # Spring Boot 3 backend
│   └── src/main/java/com/okg/dnacloud/
│       ├── controller/          # MarketplaceController · CreatorController
│       ├── service/             # MarketplaceService · ArtifactService · CreatorService
│       ├── payment/             # SolanaPaymentVerifier (Solana RPC)
│       └── entity/              # PackageVersion · PaymentReceipt · RevenueEntry · PayoutRecord
│
└── dna-packages/
    ├── bootstrap/               # DNAcloud Bootstrap — written to user's project by dnacloud init
    │   └── .claude/
    │       ├── skills/dnacloud/ # main DNAcloud Skill (search · pay · install)
    │       ├── agents/          # market-researcher · installer
    │       └── commands/        # /dna-install /dna-upload /dna-earnings …
    └── trading-master-dna/      # official capability pack
        ├── manifest.json        # id · version · price (0.001 USDC · solana) · components
        ├── install-plan.json
        ├── skills/              # trading-master SKILL.md + reference docs
        ├── agents/              # market-analyst · portfolio-manager · risk-manager · …
        ├── commands/            # /trade-plan /risk-check /order-preview /portfolio-status
        ├── mcp/                 # market-data · account-read · order-execution (env var refs only)
        ├── hooks/               # pre-tool-use trade guard
        └── rules/               # machine rules + permissions
```

---

## Quick Start

### Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 18 |
| pnpm | ≥ 9 |
| Java | 17 |
| OKX OnchainOS CLI | latest (`onchainos`) |

### 1. Build TypeScript packages

```bash
pnpm install
pnpm build
```

### 2. Configure environment

```bash
cp .env.example .env
```

```env
# Solana network (mainnet or devnet)
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_NETWORK=solana
SOLANA_USDC_MINT=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v

# Platform merchant address (receives buyer USDC payments)
DNACLOUD_MERCHANT_ADDRESS=AY5669hoJZMxWnaUGtbefiRj4btzXX5iR8Kh9Mtnc4KV

# Optional — package signing key
DNACLOUD_SIGNING_KEY=your_signing_key
```

### 3. Start the server

```bash
cd server
JAVA_HOME=/Library/Java/JavaVirtualMachines/zulu-17.jdk/Contents/Home \
  mvn package -DskipTests

JAVA_HOME=/Library/Java/JavaVirtualMachines/zulu-17.jdk/Contents/Home \
  java -jar target/dnacloud-server-1.0.0-SNAPSHOT.jar
```

Server starts on `http://localhost:8080` with H2 persistent DB at `./data/dnacloud.mv.db`.

### 4. Initialize DNAcloud in your Claude Code project

```bash
# from any Claude Code project directory
dnacloud init
```

This writes the DNAcloud Bootstrap into `.claude/` — Skills, Agents, and Commands are immediately available.

### 5. Buy and install Trading Master DNA

Option A — natural language (recommended):
```
You:  "我要一个交易大师"
```

Option B — direct command:
```bash
dnacloud install trading-master-dna
```

DNAcloud will prompt for OKX OnchainOS wallet authorization, show the install preview, and complete the Solana USDC payment automatically.

### 6. Verify installation

```bash
dnacloud verify trading-master-dna
dnacloud status
```

---

## OKX OnchainOS Wallet Setup

DNAcloud uses **OKX OnchainOS** (`onchainos`) as the agentic wallet layer for Solana payments.

```bash
# Login with your OKX account
onchainos wallet login

# Check your Solana wallet address and USDC balance
onchainos wallet addresses
onchainos wallet balance --chain solana
```

The payment flow is fully automated — `dnacloud install` handles the `onchainos wallet send` call, txHash capture, and X-PAYMENT credential construction without manual steps.

---

## Trading Master DNA

The flagship official capability pack. After installation, Claude Code gains:

| Component | What it does |
|-----------|-------------|
| **1 Skill** | Master trading workflow context |
| **5 Agents** | market-analyst · portfolio-manager · risk-manager · execution-reviewer · trade-journalist |
| **5 Commands** | `/trade-plan` `/risk-check` `/order-preview` `/portfolio-status` `/daily-trade-review` |
| **3 MCP configs** | market-data · account-read · order-execution *(env var refs — you supply real credentials)* |
| **1 Hook** | Pre-tool-use trade guard — blocks order tools until review passes |
| **2 Rules** | Machine rules + permission policy |

> **Important:** Trading Master DNA installs trading *workflow capabilities*, not trading strategies. It does not guarantee profitability, win rate, or investment returns. Live order execution requires configuring your own exchange API credentials.

---

## Creator Guide

Publish your own DNA packages and earn USDC on every install.

```bash
# 1. Validate your package locally
dnacloud validate ./my-dna-pack.zip

# 2. Upload via Claude Code (guided flow)
/dna-upload

# 3. Track earnings
/dna-earnings
dnacloud creator earnings <your-solana-address>
```

**Revenue flow:** Buyer pays USDC via x402 → DNAcloud platform receives → payout worker settles 90% to creator's Solana address every hour.

See [Creator Guide](./dna-packages/bootstrap/.claude/commands/dna-upload.md) for `manifest.json` format and security requirements.

---

## Server API Reference

| Endpoint | Auth | Description |
|----------|------|-------------|
| `GET /v1/dna/search?q=` | — | Search packages |
| `GET /v1/dna/{id}` | — | Package detail |
| `GET /v1/dna/{id}/versions/{ver}/artifact` | X-PAYMENT | Download artifact (x402 protected) |
| `POST /v1/creator/packages/upload` | — | Upload DNA package |
| `GET /v1/creator/earnings?wallet=` | — | Creator earnings ledger |
| `GET /v1/creator/payouts?wallet=` | — | Settlement history |
| `POST /v1/creator/admin/payouts/run-once` | Admin-Key | Trigger payout worker |

### 402 Response Format

```json
{
  "error": "payment_required",
  "payment": {
    "network": "solana",
    "payTo": "AY5669hoJZMxWnaUGtbefiRj4btzXX5iR8Kh9Mtnc4KV",
    "mint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "amount_atomic": "1000",
    "amount_display": "0.001 USDC",
    "nonce": "uuid",
    "expires_at": "ISO8601"
  }
}
```

### X-PAYMENT Credential Format

```json
// base64-encoded JSON sent in X-PAYMENT header
{
  "provider": "solana-onchain",
  "txHash": "<solana-tx-signature>",
  "nonce": "<nonce-from-402>",
  "network": "solana",
  "payer": "<sender-wallet-address>"
}
```

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Payment protocol | x402 (HTTP 402 + X-PAYMENT header) |
| Blockchain | Solana mainnet / devnet |
| Payment token | USDC (SPL token) |
| Agentic wallet | OKX OnchainOS (`onchainos wallet send`) |
| On-chain verification | Solana JSON RPC `getTransaction` |
| Backend | Spring Boot 3 · Java 17 · Maven · H2 |
| CLI / MCP | TypeScript · Node 18 · pnpm workspace |
| AI platform | Claude Code (Skills · Agents · Commands · MCP · Hooks) |
| Frontend | React · Vite · Tailwind CSS |

---

## Demo

Live demo server: `http://localhost:8080`

```bash
# Test 402 response
curl -i http://localhost:8080/v1/dna/trading-master-dna/versions/1.0.0/artifact

# Search packages
curl http://localhost:8080/v1/dna/search?q=trading | jq .
```

The end-to-end E2E flow — OKX OnchainOS Solana USDC transfer → server RPC verification → artifact delivery — has been validated on Solana mainnet:

```
txHash: 4mpR5QQg6dD6dCmboS1zzF8G9EgbrbtsLKsG1YSBKWkwq3NABDBssHot1AxQFfxaUMQFFG9mCFA1eDnJUsBMwoow
amount: 0.01 USDC  ·  network: Solana mainnet  ·  result: 200 OK ✓
```

---

## License

MIT
