import { useState } from 'react'
import {
  Upload, CheckCircle2, AlertCircle, Info, Coins,
  TrendingUp, Package, Clock, ExternalLink, Wallet,
  FileCode, ChevronRight, Zap
} from 'lucide-react'

const MOCK_PACKAGES = [
  {
    id: 'trading-master-dna',
    name: 'Trading Master DNA',
    version: '1.0.0',
    status: 'active',
    installs: 142,
    earned: '0.142',
    pending: '0.021',
    lastPayout: '2026-05-11',
  },
]

const MOCK_EARNINGS = [
  { date: '2026-05-11', amount: '0.021', txHash: '4mpR5QQg...woow', status: 'settled' },
  { date: '2026-05-10', amount: '0.018', txHash: '3xkL2PPf...nmvv', status: 'settled' },
  { date: '2026-05-09', amount: '0.011', txHash: '7ynM8QQr...pqss', status: 'settled' },
]

type Tab = 'upload' | 'packages' | 'earnings'

export default function CreatorPage() {
  const [tab, setTab] = useState<Tab>('upload')
  const [uploadStep, setUploadStep] = useState<'idle' | 'validating' | 'valid' | 'uploading' | 'done'>('idle')
  const [dragOver, setDragOver] = useState(false)
  const [payoutAddr, setPayoutAddr] = useState('')

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    setUploadStep('validating')
    setTimeout(() => setUploadStep('valid'), 1800)
  }

  const handleFileChange = () => {
    setUploadStep('validating')
    setTimeout(() => setUploadStep('valid'), 1800)
  }

  const handleUpload = () => {
    setUploadStep('uploading')
    setTimeout(() => setUploadStep('done'), 2000)
  }

  return (
    <div className="pt-16 min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Creator Dashboard</h1>
          <p className="text-slate-400">上传 DNA 能力包，设置 Solana 收款地址，自动按销售结算收益。</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 p-1 bg-sol-card rounded-xl border border-sol-border w-fit">
          {([
            { key: 'upload', label: '上传包', icon: <Upload size={14} /> },
            { key: 'packages', label: '我的包', icon: <Package size={14} /> },
            { key: 'earnings', label: '收益', icon: <Coins size={14} /> },
          ] as const).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t.key
                  ? 'bg-sol-purple/20 text-sol-purple border border-sol-purple/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Upload tab */}
        {tab === 'upload' && (
          <div className="space-y-6 max-w-2xl">
            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`relative rounded-2xl border-2 border-dashed p-12 text-center transition-all ${
                dragOver
                  ? 'border-sol-purple bg-sol-purple/5'
                  : uploadStep === 'valid' || uploadStep === 'done'
                  ? 'border-sol-green/40 bg-sol-green/5'
                  : 'border-sol-border hover:border-sol-purple/40'
              }`}
            >
              {uploadStep === 'idle' && (
                <>
                  <div className="w-14 h-14 rounded-2xl bg-sol-purple/10 border border-sol-purple/20 flex items-center justify-center mx-auto mb-4">
                    <FileCode size={24} className="text-sol-purple" />
                  </div>
                  <div className="font-semibold mb-1">拖拽 DNA zip 包到此处</div>
                  <div className="text-sm text-slate-500 mb-4">或点击选择文件</div>
                  <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sol-purple/10 border border-sol-purple/30 text-sol-purple text-sm hover:bg-sol-purple/20 transition-all">
                    <Upload size={14} />
                    选择文件
                    <input type="file" accept=".zip" className="hidden" onChange={handleFileChange} />
                  </label>
                  <div className="mt-4 text-xs text-slate-600">支持格式：.zip · 最大 50MB</div>
                </>
              )}

              {uploadStep === 'validating' && (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 rounded-full border-2 border-sol-purple border-t-transparent animate-spin" />
                  <div className="font-medium text-slate-300">正在校验包结构...</div>
                  <div className="text-sm text-slate-500 font-mono">scanning manifest, checking secrets...</div>
                </div>
              )}

              {(uploadStep === 'valid' || uploadStep === 'uploading' || uploadStep === 'done') && (
                <ValidationResult />
              )}
            </div>

            {/* Payout address */}
            {(uploadStep === 'valid' || uploadStep === 'uploading' || uploadStep === 'done') && uploadStep !== 'done' && (
              <div className="glass-card rounded-2xl border border-sol-border p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Wallet size={16} className="text-sol-purple" />
                  <span className="font-medium text-sm">Solana 收款地址</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Your Solana wallet address (e.g. AY5669...)"
                    value={payoutAddr}
                    onChange={e => setPayoutAddr(e.target.value)}
                    className="flex-1 px-3 py-2.5 rounded-xl bg-sol-card border border-sol-border text-sm font-mono focus:outline-none focus:border-sol-purple/50 transition-colors placeholder:text-slate-600"
                  />
                </div>
                <div className="flex items-start gap-2 text-xs text-slate-500">
                  <Info size={12} className="shrink-0 mt-0.5 text-sol-blue" />
                  买家通过 x402 支付后，payout worker 将按销售收益自动结算到此地址（USDC on Solana）。
                </div>
                <button
                  onClick={handleUpload}
                  disabled={!payoutAddr || uploadStep === 'uploading'}
                  className="w-full py-3 rounded-xl sol-gradient-bg text-black font-bold text-sm hover:opacity-90 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {uploadStep === 'uploading' ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-black border-t-transparent animate-spin" />
                      上传中...
                    </>
                  ) : (
                    <>
                      <Upload size={14} />
                      发布到市场
                    </>
                  )}
                </button>
              </div>
            )}

            {uploadStep === 'done' && (
              <div className="glass-card rounded-2xl border border-sol-green/30 bg-sol-green/5 p-6 text-center">
                <CheckCircle2 size={32} className="text-sol-green mx-auto mb-3" />
                <div className="font-bold text-lg mb-1 text-sol-green">发布成功！</div>
                <div className="text-sm text-slate-400 mb-4">你的 DNA 包已上架市场，收益将自动结算到你的 Solana 地址。</div>
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={() => { setTab('packages'); setUploadStep('idle') }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sol-green/10 border border-sol-green/30 text-sol-green text-sm hover:bg-sol-green/20 transition-all"
                  >
                    查看我的包 <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            )}

            {/* Manifest guide */}
            <div className="glass-card rounded-2xl border border-sol-border p-5">
              <div className="font-medium text-sm mb-4 flex items-center gap-2">
                <FileCode size={15} className="text-sol-purple" />
                manifest.json 格式参考
              </div>
              <pre className="text-xs font-mono text-slate-400 overflow-x-auto leading-relaxed">
{`{
  "id": "my-dna-pack",
  "name": "My DNA Pack",
  "version": "1.0.0",
  "packageType": "community-pack",
  "price": {
    "amount": "0.001",
    "currency": "USDC",
    "network": "solana"
  },
  "payout": {
    "address": "YOUR_SOLANA_ADDRESS",
    "currency": "USDC",
    "network": "solana"
  },
  "components": {
    "skills": ["skills/my-skill/SKILL.md"],
    "agents": ["agents/my-agent.md"],
    "commands": ["commands/my-cmd.md"]
  }
}`}
              </pre>
            </div>
          </div>
        )}

        {/* My Packages tab */}
        {tab === 'packages' && (
          <div className="space-y-4">
            {MOCK_PACKAGES.map(pkg => (
              <div key={pkg.id} className="glass-card rounded-2xl border border-sol-border p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold">{pkg.name}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-sol-green/10 border border-sol-green/30 text-sol-green">
                        {pkg.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 font-mono">v{pkg.version} · {pkg.id}</div>
                  </div>
                  <button className="flex items-center gap-1 text-xs text-slate-500 hover:text-white transition-colors">
                    <ExternalLink size={12} />
                    查看
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Stat label="总安装数" value={String(pkg.installs)} color="text-sol-purple" />
                  <Stat label="总收益" value={`${pkg.earned} USDC`} color="text-sol-green" />
                  <Stat label="待结算" value={`${pkg.pending} USDC`} color="text-yellow-400" />
                  <Stat label="最近结算" value={pkg.lastPayout} color="text-slate-300" />
                </div>
              </div>
            ))}

            {/* Empty state */}
            <div className="glass-card rounded-2xl border border-dashed border-sol-border p-12 text-center">
              <Package size={32} className="text-slate-600 mx-auto mb-3" />
              <div className="text-slate-500 text-sm mb-4">还没有更多 DNA 包</div>
              <button
                onClick={() => setTab('upload')}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sol-purple/10 border border-sol-purple/30 text-sol-purple text-sm hover:bg-sol-purple/20 transition-all mx-auto"
              >
                <Upload size={13} />
                上传第一个 DNA 包
              </button>
            </div>
          </div>
        )}

        {/* Earnings tab */}
        {tab === 'earnings' && (
          <div className="space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <EarningCard title="总收益" value="0.142 USDC" sub="≈ $0.142" icon={<TrendingUp size={18} />} color="sol-green" />
              <EarningCard title="待结算" value="0.021 USDC" sub="下次结算 ~12h" icon={<Clock size={18} />} color="sol-purple" />
              <EarningCard title="总结算次数" value="3" sub="自动结算到 Solana" icon={<Zap size={18} />} color="sol-blue" />
            </div>

            {/* Payout history */}
            <div className="glass-card rounded-2xl border border-sol-border overflow-hidden">
              <div className="px-5 py-4 border-b border-sol-border flex items-center gap-2">
                <Coins size={15} className="text-sol-green" />
                <span className="font-medium text-sm">结算记录</span>
              </div>
              <div className="divide-y divide-sol-border">
                {MOCK_EARNINGS.map((e, i) => (
                  <div key={i} className="px-5 py-4 flex items-center justify-between hover:bg-white/2 transition-colors">
                    <div>
                      <div className="font-mono text-sm text-slate-300">{e.date}</div>
                      <div className="text-xs text-slate-600 font-mono mt-0.5">{e.txHash}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-sol-green text-sm">+{e.amount} USDC</div>
                      <div className="flex items-center gap-1 justify-end mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-sol-green" />
                        <span className="text-xs text-slate-500">{e.status}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 rounded-xl bg-sol-blue/5 border border-sol-blue/20">
              <Info size={13} className="text-sol-blue shrink-0 mt-0.5" />
              <p className="text-xs text-slate-400">
                payout worker 每小时运行一次。买家 x402 付款后，平台自动扣除手续费（10%），余额结算到你绑定的 Solana USDC 地址。
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ValidationResult() {
  const checks = [
    { label: 'manifest.json valid', ok: true },
    { label: 'install-plan.json found', ok: true },
    { label: 'No secrets detected', ok: true },
    { label: 'File types allowed', ok: true },
    { label: 'Payout address format', ok: true },
    { label: 'Components: 1 skill, 5 agents, 5 commands', ok: true },
    { label: 'Score: 96/100', ok: true, highlight: true },
  ]

  return (
    <div className="text-left space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <CheckCircle2 size={18} className="text-sol-green" />
        <span className="font-semibold text-sol-green">Validation Passed</span>
        <span className="text-xs text-slate-500 ml-auto font-mono">my-dna-pack.zip · 2.3MB</span>
      </div>
      {checks.map(c => (
        <div key={c.label} className={`flex items-center gap-2 text-xs font-mono ${c.highlight ? 'text-sol-green font-bold' : 'text-slate-400'}`}>
          <span className="text-sol-green">✓</span>
          {c.label}
        </div>
      ))}
    </div>
  )
}

function Stat({ label, value, color }: { label: string, value: string, color: string }) {
  return (
    <div className="bg-black/20 rounded-xl p-3 text-center">
      <div className={`font-bold text-sm ${color}`}>{value}</div>
      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
    </div>
  )
}

function EarningCard({ title, value, sub, icon, color }: {
  title: string, value: string, sub: string, icon: React.ReactNode, color: string
}) {
  const colorMap: Record<string, string> = {
    'sol-green': 'text-sol-green bg-sol-green/10 border-sol-green/20',
    'sol-purple': 'text-sol-purple bg-sol-purple/10 border-sol-purple/20',
    'sol-blue': 'text-sol-blue bg-sol-blue/10 border-sol-blue/20',
  }
  return (
    <div className="glass-card rounded-2xl border border-sol-border p-5">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center border mb-3 ${colorMap[color]}`}>
        {icon}
      </div>
      <div className={`text-xl font-black mb-0.5 ${color === 'sol-green' ? 'text-sol-green' : color === 'sol-purple' ? 'text-sol-purple' : 'text-sol-blue'}`}>
        {value}
      </div>
      <div className="text-xs text-slate-500">{title}</div>
      <div className="text-xs text-slate-600 mt-0.5">{sub}</div>
    </div>
  )
}
