import chalk from 'chalk';
import ora from 'ora';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { MarketplaceClient, buildSolanaPaymentCredential } from '../marketplace/MarketplaceClient.js';
import { buildOnchainOsCommand, getPaymentConfigError } from '../marketplace/PaymentClient.js';
import { Installer } from '../installer/Installer.js';
import { Verifier } from '../installer/Verifier.js';

interface InstallOptions {
  version: string;
  marketplaceUrl: string;
  yes?: boolean;
  txHash?: string;
}

export async function installCommand(packageId: string, options: InstallOptions): Promise<void> {
  console.log(chalk.bold(`\nDNAcloud — 安装 ${packageId}\n`));

  const marketplaceClient = new MarketplaceClient({ baseUrl: options.marketplaceUrl });
  const spin = ora(`从 marketplace 获取 ${packageId} 信息...`).start();

  let manifest;
  try {
    manifest = await marketplaceClient.getManifest(packageId);
    spin.succeed(`找到: ${manifest.name} v${manifest.version}`);
  } catch (err) {
    spin.fail(`获取包信息失败: ${(err as Error).message}`);
    process.exit(1);
  }

  console.log('\n' + chalk.bold('包信息：'));
  console.log(`  名称:     ${manifest.name}`);
  console.log(`  版本:     ${manifest.version}`);
  console.log(`  类型:     ${manifest.packageType}`);
  console.log(`  目标:     ${manifest.objective}`);
  console.log(`  价格:     ${manifest.price.amount} ${manifest.price.currency} (${manifest.price.network})`);
  console.log(`  能力:     ${manifest.capabilities.join(', ')}`);
  console.log(`  不承诺:   ${manifest.notGuaranteed.join(', ')}`);

  const confirmed = options.yes || await confirm('\n确认购买并安装？(y/N) ');
  if (!confirmed) {
    console.log(chalk.yellow('已取消。'));
    process.exit(0);
  }

  const version = options.version === 'latest' ? manifest.version : options.version;

  // ── Step 1: Request artifact (triggers 402 if payment needed) ────────────
  spin.start('请求 artifact...');
  const probe = await marketplaceClient.requestArtifact(packageId, version);

  let artifactData;

  if (probe.type === 'success') {
    spin.succeed('无需支付，artifact 已获取');
    artifactData = probe.data;
  } else {
    // Payment required — Solana USDC
    spin.stop();
    const req = probe.requirement;

    console.log('\n' + chalk.bold('💳 需要支付：'));
    console.log(`  金额:   ${chalk.yellow(req.amount_display)}`);
    console.log(`  网络:   ${req.network}`);
    console.log(`  收款方: ${req.payTo}`);
    console.log(`  资产:   USDC (${req.mint})`);

    // ── Step 2: Get txHash ────────────────────────────────────────────────
    let txHash = options.txHash?.trim() ?? '';

    if (!txHash) {
      // Check if running inside Claude Code with OnchainOS Agentic Wallet
      const isAgentMode = process.env.ONCHAINOS_AGENT === 'true';

      console.log('\n' + chalk.bold('支付方式 A — OKX OnchainOS Agentic Wallet（推荐）：'));
      console.log(chalk.cyan('  ' + buildOnchainOsCommand(req).replace(/\n/g, '\n  ')));

      console.log('\n' + chalk.bold('支付方式 B — 任意 Solana 钱包：'));
      console.log(`  向地址 ${chalk.cyan(req.payTo)} 转账 ${chalk.yellow(req.amount_display)}`);
      console.log(`  网络: ${req.network}  Mint: ${req.mint}`);

      if (isAgentMode) {
        console.log(chalk.yellow('\n正在 Claude Code Agent 环境中，请由 Skill 完成支付...'));
        process.exit(2); // Signal to Skill to handle payment
      }

      console.log('');
      txHash = await promptInput('请输入转账 txHash（Solana tx signature）：');
      if (!txHash.trim()) {
        console.log(chalk.yellow('未提供 txHash，安装已取消。'));
        process.exit(1);
      }
    }

    const payerAddress = process.env.SOLANA_PAYER_ADDRESS ?? 'unknown';
    const credential = buildSolanaPaymentCredential({
      txHash: txHash.trim(),
      nonce: req.nonce,
      network: req.network,
      payer: payerAddress,
    });

    // ── Step 3: Retry with payment credential ────────────────────────────
    const verifySpinner = ora('链上支付验证中（Solana RPC）...').start();
    try {
      artifactData = await marketplaceClient.getArtifactWithPayment(packageId, version, credential);
      const txHashShort = txHash.slice(0, 12) + '...';
      verifySpinner.succeed(`支付已验证  tx: ${chalk.green(txHashShort)}`);
    } catch (err) {
      verifySpinner.fail(`支付验证失败: ${(err as Error).message}`);
      console.log(chalk.yellow('\n提示：请确认转账已在链上确认（devnet 约需 2-5 秒），然后重试：'));
      console.log(chalk.cyan(`  dnacloud install ${packageId} --tx-hash ${txHash}`));
      process.exit(1);
    }
  }

  // ── Step 4: Download and install ─────────────────────────────────────────
  const tmpZip = path.join(process.cwd(), '.dnacloud', 'staging', `${packageId}-${version}.zip`);
  fs.mkdirSync(path.dirname(tmpZip), { recursive: true });
  const zipResponse = await fetch(artifactData.downloadUrl);
  const buffer = Buffer.from(await zipResponse.arrayBuffer());
  fs.writeFileSync(tmpZip, buffer);

  const installer = new Installer(process.cwd());

  const planPath = path.join(process.cwd(), '.dnacloud', 'staging', 'install-plan.json');
  if (fs.existsSync(planPath)) {
    const plan = JSON.parse(fs.readFileSync(planPath, 'utf-8'));
    const preview = installer.generatePreview(plan);
    console.log('\n' + chalk.bold('安装预览（将写入以下文件）：'));
    for (const op of preview.operations) {
      console.log(`  ${chalk.green('+')} ${op.destination}  ${chalk.gray(op.description)}`);
    }
  }

  const confirmInstall = options.yes || await confirm('\n确认安装到当前项目？(y/N) ');
  if (!confirmInstall) {
    fs.rmSync(tmpZip, { force: true });
    console.log(chalk.yellow('已取消。Artifact 已清理。'));
    process.exit(0);
  }

  spin.start('安装中...');
  try {
    await installer.install(artifactData, tmpZip);
    spin.succeed('安装完成');
  } catch (err) {
    spin.fail(`安装失败: ${(err as Error).message}`);
    process.exit(1);
  }

  spin.start('验证安装...');
  const verifier = new Verifier(process.cwd());
  const verifyResult = verifier.verify(packageId);

  if (verifyResult.status === 'active') {
    spin.succeed(`验证通过 — 状态: ${chalk.green('active')}`);
  } else {
    spin.warn(`验证结果: ${chalk.yellow(verifyResult.status)}`);
  }

  console.log('\n' + chalk.bold('安装结果：'));
  console.log(`  状态:           ${badge(verifyResult.status)}`);
  console.log(`  Skills:         ${tick(verifyResult.skillsInstalled)}`);
  console.log(`  Agents:         ${tick(verifyResult.agentsInstalled)}`);
  console.log(`  Commands:       ${tick(verifyResult.commandsInstalled)}`);
  console.log(`  MCP 配置:       ${tick(verifyResult.mcpConfigured)}`);
  console.log(`  Hooks 配置:     ${tick(verifyResult.hooksConfigured)}`);
  console.log(`  真实交易就绪:   ${tick(verifyResult.liveTradingReady)}`);

  if (verifyResult.missingUserConfig.length > 0) {
    console.log('\n' + chalk.yellow('⚠️  需要配置以下环境变量才能进行真实交易：'));
    for (const key of verifyResult.missingUserConfig) {
      console.log(`  export ${key}=<your-value>`);
    }
  }

  if (verifyResult.capabilitiesAvailable.length > 0) {
    console.log('\n' + chalk.green('✓') + ' 现在你可以在 Claude Code 中使用：');
    console.log('  /trade-plan       制定交易计划');
    console.log('  /risk-check       风险检查');
    console.log('  /order-preview    订单预览');
    console.log('  /portfolio-status 查看持仓');
    console.log('  /daily-trade-review 日终复盘\n');
  }
}

async function confirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

async function promptInput(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function tick(v: boolean): string {
  return v ? chalk.green('✓') : chalk.red('✗');
}

function badge(status: string): string {
  if (status === 'active') return chalk.green(status);
  if (status === 'partial') return chalk.yellow(status);
  return chalk.red(status);
}
