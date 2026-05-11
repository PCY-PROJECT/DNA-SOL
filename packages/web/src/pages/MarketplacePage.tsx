import { useState } from 'react'
import {
  Search, Filter, Star, Shield, CheckCircle2, Zap,
  Bot, Package, ChevronRight, X, Terminal, ExternalLink,
  Copy, Check, Coins
} from 'lucide-react'

const PACKAGES = [
  {
    id: 'trading-master-dna',
    name: 'Trading Master DNA',
    author: 'DNAcloud Official',
    tag: 'official',
    domain: 'trading',
    version: '1.0.0',
    price: '0.001',
    currency: 'USDC',
    network: 'solana',
    mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    payTo: 'AY5669hoJZMxWnaUGtbefiRj4btzXX5iR8Kh9Mtnc4KV',
    score: 98,
    desc: '完整交易工作流能力包，包含市场分析、资金管理、风控、订单预览和复盘。',
    longDesc: '为 Claude Code 安装完整的交易工作流能力。包含 5 个专业 Agents、5 个 Commands、3 个 MCP Server（市场数据/账户/下单）、交易守卫 Hook 和风控规则。',
    capabilities: ['market_analysis', 'position_management', 'strategy_workflow', 'risk_control', 'order_preview', 'live_order_tool_integration', 'trade_journal', 'post_trade_review'],
    components: { skills: 1, agents: 5, commands: 5, mcp: 3, hooks: 1, rules: 2 },
    notGuaranteed: ['profitability', 'win_rate', 'investment_advice'],
    installs: 142,
    stars: 4.9,
  },
  {
    id: 'contract-audit-dna',
    name: 'Contract Audit DNA',
    author: 'SecureLayer Labs',
    tag: 'community',
    domain: 'security',
    version: '0.8.2',
    price: '0.005',
    currency: 'USDC',
    network: 'solana',
    mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    payTo: 'DkEH7mYmfJfNBXEkY3PJSB7LhPYvFVzBVzqyYN2Aa4d',
    score: 91,
    desc: '智能合约安全审计能力，集成 Slither、Mythril 检测工作流。',
    longDesc: '为 Claude Code 安装专业的智能合约安全审计能力。自动调用 Slither/Mythril 扫描工具，生成结构化审计报告。',
    capabilities: ['vulnerability_scan', 'audit_report', 'gas_optimization', 'reentrancy_detection'],
    components: { skills: 1, agents: 3, commands: 4, mcp: 2, hooks: 0, rules: 1 },
    notGuaranteed: [],
    installs: 89,
    stars: 4.7,
  },
  {
    id: 'kol-assistant-dna',
    name: 'KOL Assistant DNA',
    author: 'CryptoContent Studio',
    tag: 'community',
    domain: 'content',
    version: '1.2.0',
    price: '0.002',
    currency: 'USDC',
    network: 'solana',
    mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    payTo: 'H9nS3vF2Km5J1kTqRW4uL8pXcMnDjsYbEo7ZVgNtPqA',
    score: 87,
    desc: '加密 KOL 内容创作助手，Twitter 线程、市场评论、行情解读。',
    longDesc: '为 Claude Code 安装加密 KOL 内容创作能力。专精 Web3 叙事、市场情绪分析和多平台内容适配。',
    capabilities: ['content_creation', 'market_commentary', 'thread_writer', 'sentiment_analysis'],
    components: { skills: 1, agents: 2, commands: 6, mcp: 1, hooks: 0, rules: 1 },
    notGuaranteed: [],
    installs: 234,
    stars: 4.5,
  },
  {
    id: 'research-analyst-dna',
    name: 'Research Analyst DNA',
    author: 'DNAcloud Official',
    tag: 'official',
    domain: 'research',
    version: '0.9.0',
    price: '0.003',
    currency: 'USDC',
    network: 'solana',
    mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    payTo: 'AY5669hoJZMxWnaUGtbefiRj4btzXX5iR8Kh9Mtnc4KV',
    score: 95,
    desc: '专业投研分析能力包，链上数据分析、项目尽调、宏观分析。',
    longDesc: '为 Claude Code 安装专业投研分析能力，集成链上数据 MCP、新闻聚合和结构化报告生成。',
    capabilities: ['on_chain_analysis', 'project_due_diligence', 'macro_analysis', 'report_generation'],
    components: { skills: 1, agents: 4, commands: 5, mcp: 3, hooks: 0, rules: 2 },
    notGuaranteed: ['investment_advice', 'return_guarantee'],
    installs: 67,
    stars: 4.8,
  },
  {
    id: 'defi-operator-dna',
    name: 'DeFi Operator DNA',
    author: 'YieldLabs',
    tag: 'community',
    domain: 'defi',
    version: '0.5.1',
    price: '0.008',
    currency: 'USDC',
    network: 'solana',
    mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    payTo: 'BcRtY7NpQs3WvKm2UjXoLhDa5FePgA1nMbZqVwE4Tkc',
    score: 83,
    desc: 'DeFi 操作能力包，LP 管理、收益策略、跨链桥接工作流。',
    longDesc: '为 Claude Code 安装 DeFi 协议操作能力。支持 Uniswap V3、Aave、Curve 等主流协议的 LP 管理和收益优化。',
    capabilities: ['lp_management', 'yield_optimization', 'bridge_workflow', 'defi_analytics'],
    components: { skills: 1, agents: 3, commands: 7, mcp: 4, hooks: 1, rules: 3 },
    notGuaranteed: ['yield_guarantee', 'impermanent_loss_protection'],
    installs: 45,
    stars: 4.3,
  },
  {
    id: 'nft-curator-dna',
    name: 'NFT Curator DNA',
    author: 'PixelDAO',
    tag: 'community',
    domain: 'nft',
    version: '1.1.0',
    price: '0.001',
    currency: 'USDC',
    network: 'solana',
    mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    payTo: 'GfTnS8kUv4QpWr3YmXhoCa2LeDiN9bMzVjKxEq5PwAl',
    score: 79,
    desc: 'NFT 市场分析和策展能力，稀有度分析、地板价监控、藏品鉴定。',
    longDesc: '为 Claude Code 安装 NFT 市场分析能力。支持 Solana/ETH NFT 稀有度排名、地板价追踪和交易信号。',
    capabilities: ['rarity_analysis', 'floor_monitoring', 'collection_research', 'mint_sniping'],
    components: { skills: 1, agents: 2, commands: 4, mcp: 2, hooks: 0, rules: 1 },
    notGuaranteed: [],
    installs: 178,
    stars: 4.2,
  },
]

const DOMAINS = ['all', 'trading', 'security', 'content', 'research', 'defi', 'nft']

export default function MarketplacePage() {
  const [search, setSearch] = useState('')
  const [domain, setDomain] = useState('all')
  const [selected, setSelected] = useState<typeof PACKAGES[0] | null>(null)
  const [buyStep, setBuyStep] = useState<'idle' | 'payment' | 'verifying' | 'done'>('idle')
  const [copied, setCopied] = useState(false)

  const filtered = PACKAGES.filter(p => {
    const matchSearch = !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.desc.toLowerCase().includes(search.toLowerCase()) ||
      p.capabilities.some(c => c.includes(search.toLowerCase()))
    const matchDomain = domain === 'all' || p.domain === domain
    return matchSearch && matchDomain
  })

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const installCmd = selected
    ? `dnacloud install ${selected.id}`
    : ''

  return (
    <div className="pt-16 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">DNA Marketplace</h1>
          <p className="text-slate-400">浏览并安装专业 Agent DNA 能力包，通过 x402 on Solana 一键支付</p>
        </div>

        {/* Search + Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="搜索 DNA 包..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-sol-card border border-sol-border text-sm focus:outline-none focus:border-sol-purple/50 transition-colors"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-hidden pb-1">
            {DOMAINS.map(d => (
              <button
                key={d}
                onClick={() => setDomain(d)}
                className={`shrink-0 px-3 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                  domain === d
                    ? 'bg-sol-purple/20 text-sol-purple border border-sol-purple/40'
                    : 'text-slate-400 border border-sol-border hover:text-white hover:border-slate-600'
                }`}
              >
                {d === 'all' ? 'All' : d}
              </button>
            ))}
          </div>
        </div>

        {/* Results count */}
        <div className="text-xs text-slate-500 mb-6 font-mono">{filtered.length} packages found</div>

        {/* Package grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(pkg => (
            <PackageCard key={pkg.id} pkg={pkg} onSelect={() => { setSelected(pkg); setBuyStep('idle') }} />
          ))}
        </div>
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto glass-card rounded-t-2xl sm:rounded-2xl border border-sol-border">
            {/* Modal header */}
            <div className="sticky top-0 z-10 glass-card border-b border-sol-border px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl sol-gradient-bg flex items-center justify-center">
                  <Bot size={18} className="text-black" />
                </div>
                <div>
                  <h2 className="font-bold">{selected.name}</h2>
                  <div className="text-xs text-slate-500">v{selected.version} · by {selected.author}</div>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                <X size={18} className="text-slate-400" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Description */}
              <p className="text-slate-300 leading-relaxed">{selected.longDesc}</p>

              {/* Score + stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="glass-card rounded-xl p-3 text-center border border-sol-border">
                  <div className="text-xl font-black text-sol-green">{selected.score}</div>
                  <div className="text-xs text-slate-500">Safety Score</div>
                </div>
                <div className="glass-card rounded-xl p-3 text-center border border-sol-border">
                  <div className="text-xl font-black text-sol-purple">{selected.installs}</div>
                  <div className="text-xs text-slate-500">Installs</div>
                </div>
                <div className="glass-card rounded-xl p-3 text-center border border-sol-border">
                  <div className="text-xl font-black text-yellow-400">★ {selected.stars}</div>
                  <div className="text-xs text-slate-500">Rating</div>
                </div>
              </div>

              {/* Components */}
              <div>
                <div className="text-xs text-slate-500 font-mono mb-3">COMPONENTS INCLUDED</div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(selected.components).filter(([, v]) => v > 0).map(([k, v]) => (
                    <div key={k} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 border border-sol-border text-sm">
                      <span className="text-sol-green font-mono font-bold">{v}</span>
                      <span className="text-slate-400 capitalize">{k}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Capabilities */}
              <div>
                <div className="text-xs text-slate-500 font-mono mb-3">CAPABILITIES</div>
                <div className="flex flex-wrap gap-1.5">
                  {selected.capabilities.map(c => (
                    <span key={c} className="px-2 py-1 rounded-md bg-sol-purple/10 border border-sol-purple/20 text-sol-purple text-xs font-mono">
                      {c}
                    </span>
                  ))}
                </div>
              </div>

              {/* Disclaimer */}
              {selected.notGuaranteed.length > 0 && (
                <div className="flex gap-2 p-3 rounded-xl bg-yellow-500/5 border border-yellow-500/20">
                  <Shield size={14} className="text-yellow-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-yellow-400/80">
                    不保证：{selected.notGuaranteed.join('、')}。所有分析仅供参考。
                  </p>
                </div>
              )}

              {/* Price + Payment */}
              <div className="rounded-xl border border-sol-green/20 bg-sol-green/5 p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-sm text-slate-400 mb-1">Price</div>
                    <div className="text-2xl font-black sol-gradient-text">{selected.price} USDC</div>
                    <div className="text-xs text-slate-500 mt-1 font-mono">on Solana · via x402</div>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-sol-green/10 border border-sol-green/20 flex items-center justify-center">
                    <Coins size={22} className="text-sol-green" />
                  </div>
                </div>

                {buyStep === 'idle' && (
                  <button
                    onClick={() => setBuyStep('payment')}
                    className="w-full py-3 rounded-xl sol-gradient-bg text-black font-bold text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2"
                  >
                    <Zap size={15} />
                    购买并安装 · x402 on Solana
                  </button>
                )}

                {buyStep === 'payment' && (
                  <div className="space-y-3">
                    <div className="text-xs text-slate-400 mb-2">使用 OnchainOS 发送 {selected.price} USDC 到平台地址：</div>
                    <div className="font-mono text-xs bg-black/40 rounded-lg p-3 break-all text-sol-green border border-sol-green/20">
                      {selected.payTo}
                    </div>
                    <div className="glass-card rounded-lg border border-sol-border p-3 font-mono text-xs space-y-1">
                      <div className="text-slate-500"># 发送命令：</div>
                      <div className="text-slate-300">
                        onchainos wallet send \<br />
                        {'  '}--chain solana \<br />
                        {'  '}--contract-token {selected.mint.slice(0, 8)}... \<br />
                        {'  '}--amt {String(parseFloat(selected.price) * 1_000_000)} \<br />
                        {'  '}--to {selected.payTo.slice(0, 12)}...
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setBuyStep('verifying')}
                        className="flex-1 py-2.5 rounded-xl bg-sol-purple/20 border border-sol-purple/40 text-sol-purple text-sm font-medium hover:bg-sol-purple/30 transition-all"
                      >
                        已完成支付，验证 →
                      </button>
                      <button
                        onClick={() => setBuyStep('idle')}
                        className="px-4 py-2.5 rounded-xl bg-white/5 border border-sol-border text-slate-400 text-sm hover:bg-white/10 transition-all"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                )}

                {buyStep === 'verifying' && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 py-2">
                      <div className="w-5 h-5 rounded-full border-2 border-sol-purple border-t-transparent animate-spin" />
                      <span className="text-sm text-slate-300">Solana RPC 验证链上收款...</span>
                    </div>
                    <button
                      onClick={() => setBuyStep('done')}
                      className="w-full py-2.5 rounded-xl sol-gradient-bg text-black font-bold text-sm"
                    >
                      模拟验证通过 → 安装
                    </button>
                  </div>
                )}

                {buyStep === 'done' && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sol-green">
                      <CheckCircle2 size={18} />
                      <span className="font-semibold text-sm">支付已验证！按步骤完成安装：</span>
                    </div>
                    <div className="space-y-2 text-xs font-mono">
                      <div className="text-slate-500">① 首次使用先安装 CLI</div>
                      <div className="flex items-center gap-2 bg-black/40 rounded-lg border border-sol-border p-2.5">
                        <code className="flex-1 text-slate-300">npm install -g soldnacloud</code>
                        <button onClick={() => handleCopy('npm install -g soldnacloud')} className="shrink-0 p-1 hover:bg-white/5 rounded">
                          {copied ? <Check size={12} className="text-sol-green" /> : <Copy size={12} className="text-slate-400" />}
                        </button>
                      </div>
                      <div className="text-slate-500">② 在 Claude Code 项目中运行</div>
                      <div className="flex items-center gap-2 bg-black/40 rounded-lg border border-sol-green/20 p-2.5">
                        <code className="flex-1 text-sol-green terminal-line">{installCmd}</code>
                        <button onClick={() => handleCopy(installCmd)} className="shrink-0 p-1 hover:bg-white/5 rounded">
                          {copied ? <Check size={12} className="text-sol-green" /> : <Copy size={12} className="text-slate-400" />}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PackageCard({ pkg, onSelect }: { pkg: typeof PACKAGES[0], onSelect: () => void }) {
  const tagStyles = {
    official: 'border-sol-green/30 text-sol-green bg-sol-green/5',
    community: 'border-sol-blue/30 text-sol-blue bg-sol-blue/5',
  }

  return (
    <div
      className="glass-card rounded-2xl border border-sol-border p-5 hover:border-sol-purple/40 transition-all cursor-pointer group"
      onClick={onSelect}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-mono px-2 py-0.5 rounded border capitalize ${tagStyles[pkg.tag as keyof typeof tagStyles]}`}>
            {pkg.tag}
          </span>
          <span className="text-xs text-slate-500 capitalize">{pkg.domain}</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <span className="font-mono text-sol-green">{pkg.score}</span>/100
        </div>
      </div>

      <h3 className="font-bold mb-1.5 group-hover:text-sol-purple transition-colors">{pkg.name}</h3>
      <p className="text-xs text-slate-500 mb-1">by {pkg.author}</p>
      <p className="text-sm text-slate-400 mb-4 leading-relaxed line-clamp-2">{pkg.desc}</p>

      <div className="flex flex-wrap gap-1 mb-4">
        {pkg.capabilities.slice(0, 3).map(c => (
          <span key={c} className="text-xs px-1.5 py-0.5 rounded bg-white/5 text-slate-500 font-mono">
            {c}
          </span>
        ))}
        {pkg.capabilities.length > 3 && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-white/5 text-slate-500">
            +{pkg.capabilities.length - 3}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-sol-border">
        <div>
          <span className="font-bold sol-gradient-text text-sm">{pkg.price} USDC</span>
          <span className="text-xs text-slate-600 ml-1">/ install</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>{pkg.installs} installs</span>
          <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform text-slate-600" />
        </div>
      </div>
    </div>
  )
}
