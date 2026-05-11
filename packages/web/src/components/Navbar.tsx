import { Dna, Store, Upload, Github, Terminal } from 'lucide-react'
import type { Page } from '../App'

interface Props {
  page: Page
  setPage: (p: Page) => void
}

export default function Navbar({ page, setPage }: Props) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-sol-border/50 bg-sol-dark/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <button
          onClick={() => setPage('home')}
          className="flex items-center gap-2.5 group"
        >
          <div className="w-8 h-8 rounded-lg sol-gradient-bg flex items-center justify-center">
            <Dna size={18} className="text-black" />
          </div>
          <span className="font-bold text-lg tracking-tight">
            DNA<span className="sol-gradient-text">cloud</span>
          </span>
          <span className="hidden sm:inline text-xs font-mono text-sol-green/60 border border-sol-green/20 rounded px-1.5 py-0.5">
            on Solana
          </span>
        </button>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          <NavButton active={page === 'marketplace'} onClick={() => setPage('marketplace')} icon={<Store size={15} />}>
            Marketplace
          </NavButton>
          <NavButton active={page === 'creator'} onClick={() => setPage('creator')} icon={<Upload size={15} />}>
            Creator
          </NavButton>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <a
            href="https://github.com"
            className="hidden sm:flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <Github size={16} />
          </a>
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-sol-purple/10 border border-sol-purple/30 text-sol-purple text-sm font-mono hover:bg-sol-purple/20 transition-all">
            <Terminal size={13} />
            <span className="hidden sm:inline">dnacloud init</span>
          </button>
        </div>
      </div>
    </nav>
  )
}

function NavButton({ active, onClick, icon, children }: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
        active
          ? 'bg-white/10 text-white'
          : 'text-slate-400 hover:text-white hover:bg-white/5'
      }`}
    >
      {icon}
      {children}
    </button>
  )
}
