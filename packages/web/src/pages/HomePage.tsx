import {
  Zap, Shield, Package, ChevronRight, ArrowRight,
  Terminal, CheckCircle2, Coins, Code2, Bot, Layers
} from 'lucide-react'
import type { Page } from '../App'

const FLOW_STEPS = [
  { icon: '💬', label: '自然语言', desc: '用户说"我要一个交易大师"' },
  { icon: '🔍', label: '搜索市场', desc: 'Agent 搜索 DNA Marketplace' },
  { icon: '⚡', label: 'x402 支付', desc: 'OnchainOS 发起 Solana USDC 支付' },
  { icon: '✅', label: '链上验证', desc: 'Server RPC 验证收款交易' },
  { icon: '🧬', label: '安装 DNA', desc: 'Skills / Agents / MCP / Hooks 写入项目' },
]

const STATS = [
  { value: '5+', label: 'Agents installed' },
  { value: '5+', label: 'Commands' },
  { value: '3', label: 'MCP Servers' },
  { value: '<3s', label: 'Install time' },
]

const PACKAGES = [
  {
    id: 'trading-master-dna',
    name: 'Trading Master DNA',
    tag: 'Official',
    tagColor: 'sol-green',
    domain: 'Trading',
    price: '0.001 USDC',
    desc: '完整交易工作流：市场分析、仓位管理、风控、下单预览、复盘。',
    caps: ['market_analysis', 'risk_control', 'order_preview', 'trade_journal'],
    score: 98,
  },
  {
    id: 'contract-audit-dna',
    name: 'Contract Audit DNA',
    tag: 'Community',
    tagColor: 'sol-blue',
    domain: 'Security',
    price: '0.005 USDC',
    desc: '智能合约安全审计能力包，集成 Slither / Mythril 工作流。',
    caps: ['vulnerability_scan', 'audit_report', 'gas_optimization'],
    score: 91,
  },
  {
    id: 'kol-assistant-dna',
    name: 'KOL Assistant DNA',
    tag: 'Community',
    tagColor: 'sol-blue',
    domain: 'Content',
    price: '0.002 USDC',
    desc: '加密 KOL 内容创作助手，Twitter/X 线程、市场评论、行情解读。',
    caps: ['content_creation', 'market_commentary', 'thread_writer'],
    score: 87,
  },
]

interface Props {
  setPage: (p: Page) => void
}

export default function HomePage({ setPage }: Props) {
  return (
    <main className="pt-16">
      {/* Hero */}
      <section className="relative overflow-hidden min-h-screen flex items-center">
        {/* Background glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-sol-purple/5 blur-[120px]" />
          <div className="absolute top-1/3 left-1/3 w-[400px] h-[400px] rounded-full bg-sol-green/5 blur-[80px]" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-24 relative">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-sol-green/30 bg-sol-green/5 text-sol-green text-sm font-mono mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-sol-green animate-pulse" />
              Built on Solana · x402 Payment Protocol · Claude Code
            </div>

            {/* Headline */}
            <h1 className="text-5xl sm:text-7xl font-black tracking-tight mb-6 leading-[1.05]">
              一句话，继承
              <br />
              <span className="sol-gradient-text">高手 DNA</span>
            </h1>

            <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
              DNAcloud 是 Claude Code 的 Agent DNA 市场。
              用户说出想要的专家，AI 自动通过{' '}
              <span className="text-sol-purple font-medium">x402 on Solana</span>{' '}
              完成购买、安装、激活全流程。
            </p>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <button
                onClick={() => setPage('marketplace')}
                className="group flex items-center gap-2 px-6 py-3 rounded-xl sol-gradient-bg text-black font-semibold text-lg hover:opacity-90 transition-all"
              >
                浏览 DNA 市场
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <div className="flex items-center gap-2 px-6 py-3 rounded-xl border border-sol-border bg-sol-card font-mono text-sm text-slate-300">
                <Terminal size={14} className="text-sol-green" />
                <span className="terminal-line">dnacloud init</span>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto">
              {STATS.map(s => (
                <div key={s.label} className="glass-card rounded-xl p-4 text-center">
                  <div className="text-2xl font-black sol-gradient-text">{s.value}</div>
                  <div className="text-xs text-slate-500 mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Payment Flow */}
      <section className="py-24 border-t border-sol-border/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 text-sol-purple text-sm font-mono mb-4">
              <Zap size={14} />
              x402 Payment Protocol on Solana
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold">端到端全自动支付安装</h2>
            <p className="text-slate-400 mt-3 max-w-xl mx-auto">
              无需手动打开钱包。Agent 直接处理 HTTP 402，完成 Solana USDC 支付，服务端 RPC 验证上链。
            </p>
          </div>

          {/* Flow steps */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-0 max-w-5xl mx-auto">
            {FLOW_STEPS.map((step, i) => (
              <div key={i} className="flex items-center">
                <div className="flex flex-col items-center text-center w-40">
                  <div className="w-14 h-14 rounded-2xl glass-card border border-sol-border flex items-center justify-center text-2xl mb-3 glow-purple">
                    {step.icon}
                  </div>
                  <div className="font-semibold text-sm">{step.label}</div>
                  <div className="text-xs text-slate-500 mt-1 leading-relaxed">{step.desc}</div>
                </div>
                {i < FLOW_STEPS.length - 1 && (
                  <ChevronRight size={16} className="text-sol-border mx-2 shrink-0 hidden sm:block" />
                )}
              </div>
            ))}
          </div>

          {/* x402 detail card */}
          <div className="mt-16 max-w-3xl mx-auto glass-card rounded-2xl border border-sol-border p-6 font-mono text-sm">
            <div className="flex items-center gap-2 mb-4 text-slate-500 text-xs">
              <div className="w-3 h-3 rounded-full bg-red-500/60" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
              <div className="w-3 h-3 rounded-full bg-green-500/60" />
              <span className="ml-2">x402 payment flow</span>
            </div>
            <div className="space-y-1.5 text-slate-400">
              <div><span className="text-slate-600"># 1. Client requests artifact</span></div>
              <div><span className="text-sol-blue">GET</span> /v1/dna/trading-master-dna/versions/1.0.0/artifact</div>
              <div className="text-slate-600">{'← '}<span className="text-yellow-400">402 Payment Required</span></div>
              <div className="pl-4 text-slate-500">{"{ payTo: 'AY5669...', mint: 'EPjFW...', amount_atomic: '1000' }"}</div>
              <div className="mt-2"><span className="text-slate-600"># 2. OnchainOS sends USDC on Solana</span></div>
              <div><span className="text-sol-green">$</span> onchainos wallet send --chain solana --amt 1000 --to AY5669...</div>
              <div className="text-slate-600">{'← '}<span className="text-sol-green">txHash: 4mpR5QQ...</span></div>
              <div className="mt-2"><span className="text-slate-600"># 3. Retry with payment credential</span></div>
              <div><span className="text-sol-blue">GET</span> /artifact <span className="text-slate-500">X-PAYMENT: eyJ0eFhh...</span></div>
              <div className="text-slate-600">{'← '}<span className="text-sol-green">200 OK</span> · artifact + paymentReceipt</div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured packages */}
      <section className="py-24 border-t border-sol-border/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-end justify-between mb-12">
            <div>
              <div className="text-sol-green text-sm font-mono mb-2">Featured DNA Packages</div>
              <h2 className="text-3xl font-bold">精选 DNA 能力包</h2>
            </div>
            <button
              onClick={() => setPage('marketplace')}
              className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
            >
              全部 <ChevronRight size={14} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PACKAGES.map(pkg => (
              <PackageCard key={pkg.id} pkg={pkg} onBuy={() => setPage('marketplace')} />
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 border-t border-sol-border/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="text-sol-purple text-sm font-mono mb-4">For Developers & Creators</div>
              <h2 className="text-3xl sm:text-4xl font-bold mb-6">
                打包你的专业能力，<br />
                <span className="sol-gradient-text">让 AI 继承你的 DNA</span>
              </h2>
              <div className="space-y-4">
                {[
                  { icon: <Code2 size={18} />, title: '标准化打包', desc: 'manifest.json 定义 Skills / Agents / Commands / MCP / Hooks，一键打包成 DNA zip。' },
                  { icon: <Shield size={18} />, title: '自动安全审核', desc: '上传后自动扫描密钥、危险命令、路径注入，评分展示给买家。' },
                  { icon: <Coins size={18} />, title: 'Solana 自动结算', desc: '买家 x402 支付进入平台收款地址，payout worker 异步结算到创作者 Solana 钱包。' },
                ].map(item => (
                  <div key={item.title} className="flex gap-4">
                    <div className="w-9 h-9 rounded-lg bg-sol-purple/10 border border-sol-purple/20 flex items-center justify-center text-sol-purple shrink-0 mt-0.5">
                      {item.icon}
                    </div>
                    <div>
                      <div className="font-semibold mb-1">{item.title}</div>
                      <div className="text-sm text-slate-400 leading-relaxed">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setPage('creator')}
                className="mt-8 flex items-center gap-2 px-5 py-2.5 rounded-xl border border-sol-purple/40 text-sol-purple hover:bg-sol-purple/10 transition-all text-sm font-medium"
              >
                <Upload size={15} />
                上传我的 DNA 包
              </button>
            </div>

            {/* Creator terminal */}
            <div className="glass-card rounded-2xl border border-sol-border p-6 font-mono text-sm">
              <div className="flex items-center gap-2 mb-5 text-slate-500 text-xs">
                <div className="w-3 h-3 rounded-full bg-red-500/60" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                <div className="w-3 h-3 rounded-full bg-green-500/60" />
                <span className="ml-2">creator workflow</span>
              </div>
              <div className="space-y-2 text-slate-300">
                <div><span className="text-sol-green">$</span> <span className="text-white">dnacloud validate my-dna.zip</span></div>
                <div className="pl-4 text-slate-500">Validating package structure...</div>
                <div className="pl-4">
                  <span className="text-sol-green">✓</span> manifest.json valid
                </div>
                <div className="pl-4">
                  <span className="text-sol-green">✓</span> install-plan.json found
                </div>
                <div className="pl-4">
                  <span className="text-sol-green">✓</span> No secrets detected
                </div>
                <div className="pl-4">
                  <span className="text-sol-green">✓</span> Score: 96/100
                </div>
                <div className="mt-3"><span className="text-sol-green">$</span> <span className="text-white">dnacloud upload my-dna.zip \</span></div>
                <div className="pl-4 text-white">--payout-address AY5669...</div>
                <div className="pl-4 text-slate-500">Uploading to marketplace...</div>
                <div className="pl-4">
                  <span className="text-sol-green">✓</span>{' '}
                  <span className="text-sol-green">Published! Package ID: my-dna</span>
                </div>
                <div className="mt-3 pt-3 border-t border-sol-border">
                  <span className="text-sol-green">$</span> <span className="text-white">dnacloud creator earnings AY5669...</span>
                </div>
                <div className="pl-4">
                  Total earned: <span className="text-sol-green font-bold">0.042 USDC</span>
                </div>
                <div className="pl-4 text-slate-500">Last payout: 2026-05-11 · 0.01 USDC</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tech stack */}
      <section className="py-20 border-t border-sol-border/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <div className="text-slate-500 text-sm mb-8">Powered by</div>
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
            {[
              { name: 'Solana', color: '#9945FF' },
              { name: 'x402 Protocol', color: '#14F195' },
              { name: 'OKX OnchainOS', color: '#00C2FF' },
              { name: 'Claude Code', color: '#D97706' },
              { name: 'Spring Boot', color: '#6DB33F' },
              { name: 'USDC', color: '#2775CA' },
            ].map(tech => (
              <div
                key={tech.name}
                className="flex items-center gap-2 text-sm font-medium text-slate-400"
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tech.color }} />
                {tech.name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 border-t border-sol-border/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md sol-gradient-bg flex items-center justify-center">
              <Layers size={12} className="text-black" />
            </div>
            <span>DNAcloud · Solana Hackathon 2026</span>
          </div>
          <div className="font-mono text-xs">
            一句话，继承高手 DNA。
          </div>
        </div>
      </footer>
    </main>
  )
}

function PackageCard({ pkg, onBuy }: { pkg: typeof PACKAGES[0], onBuy: () => void }) {
  return (
    <div className="glass-card rounded-2xl border border-sol-border p-6 hover:border-sol-purple/40 transition-all group cursor-pointer" onClick={onBuy}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <span className={`text-xs font-mono px-2 py-0.5 rounded border ${
            pkg.tagColor === 'sol-green'
              ? 'border-sol-green/30 text-sol-green bg-sol-green/5'
              : pkg.tagColor === 'sol-blue'
              ? 'border-sol-blue/30 text-sol-blue bg-sol-blue/5'
              : 'border-sol-purple/30 text-sol-purple bg-sol-purple/5'
          }`}>
            {pkg.tag}
          </span>
          <span className="ml-2 text-xs text-slate-500">{pkg.domain}</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <span className="text-sol-green font-mono">{pkg.score}</span>
          <span>/100</span>
        </div>
      </div>

      <h3 className="font-bold text-base mb-2 group-hover:sol-gradient-text transition-all">{pkg.name}</h3>
      <p className="text-sm text-slate-400 mb-4 leading-relaxed">{pkg.desc}</p>

      <div className="flex flex-wrap gap-1.5 mb-5">
        {pkg.caps.slice(0, 3).map(c => (
          <span key={c} className="text-xs px-2 py-0.5 rounded bg-white/5 text-slate-500 font-mono">
            {c}
          </span>
        ))}
        {pkg.caps.length > 3 && (
          <span className="text-xs px-2 py-0.5 rounded bg-white/5 text-slate-500">
            +{pkg.caps.length - 3}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="font-bold sol-gradient-text">{pkg.price}</span>
          <span className="text-xs text-slate-500">on Solana</span>
        </div>
        <button className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-sol-purple/10 border border-sol-purple/30 text-sol-purple hover:bg-sol-purple/20 transition-all">
          <Bot size={12} />
          Install
        </button>
      </div>
    </div>
  )
}
