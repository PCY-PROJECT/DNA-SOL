import type { SolanaPaymentRequirement } from './MarketplaceClient.js';

/**
 * Payment for DNAcloud packages uses OKX OnchainOS Agentic Wallet (Solana USDC).
 *
 * Flow inside Claude Code:
 *   1. Skill detects 402 from marketplace server
 *   2. Skill calls `onchainos wallet send` to transfer USDC to merchant address
 *   3. Gets back txHash (Solana tx signature)
 *   4. Builds X-PAYMENT credential with txHash
 *   5. Retries download request with X-PAYMENT header
 *   6. Server verifies on-chain, returns DNA artifact
 *
 * CLI standalone mode:
 *   User manually runs `onchainos wallet send`, then provides txHash when prompted.
 */

export function buildOnchainOsCommand(req: SolanaPaymentRequirement): string {
  // readableAmount = amount_atomic / 10^6 (USDC has 6 decimals)
  const readableAmount = (parseInt(req.amount_atomic, 10) / 1_000_000).toFixed(6).replace(/\.?0+$/, '');

  return [
    'onchainos wallet send',
    `  --readable-amount ${readableAmount}`,
    `  --recipient ${req.payTo}`,
    `  --chain solana`,
    `  --contract-token ${req.mint}`,
  ].join(' \\\n');
}

export function getPaymentConfigError(req: SolanaPaymentRequirement): string {
  return [
    '❌ 需要完成 Solana USDC 支付',
    '',
    '支付方式 A — OKX OnchainOS Agentic Wallet（推荐，TEE 钱包）：',
    '',
    `  ${buildOnchainOsCommand(req)}`,
    '',
    '  返回 txHash 后，在此处输入即可完成购买。',
    '',
    '支付方式 B — 任意 Solana 钱包手动转账：',
    `  向地址 ${req.payTo}`,
    `  转账 ${req.amount_display}（USDC, ${req.network}）`,
    `  Mint: ${req.mint}`,
    '',
    '⚠️  使用测试网（devnet）时请确保使用 devnet USDC。',
    '    可从 https://spl-token-faucet.com 获取 devnet USDC。',
  ].join('\n');
}
