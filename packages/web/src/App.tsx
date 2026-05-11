import { useState } from 'react'
import Navbar from './components/Navbar'
import HomePage from './pages/HomePage'
import MarketplacePage from './pages/MarketplacePage'
import CreatorPage from './pages/CreatorPage'

export type Page = 'home' | 'marketplace' | 'creator'

export default function App() {
  const [page, setPage] = useState<Page>('home')

  return (
    <div className="min-h-screen bg-sol-dark bg-grid">
      <Navbar page={page} setPage={setPage} />
      {page === 'home' && <HomePage setPage={setPage} />}
      {page === 'marketplace' && <MarketplacePage />}
      {page === 'creator' && <CreatorPage />}
    </div>
  )
}
