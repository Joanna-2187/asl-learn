import { useState } from 'react'
import { AboutView } from './components/AboutView.tsx'
import { PracticeView } from './components/PracticeView.tsx'
import { SessionView } from './components/SessionView.tsx'

type Tab = 'practice' | 'review' | 'drill' | 'about'
const TABS: { id: Tab; label: string }[] = [
  { id: 'practice', label: 'Practice' },
  { id: 'review', label: 'Review' },
  { id: 'drill', label: 'Look-alike drill' },
  { id: 'about', label: 'About' },
]

function App() {
  const [tab, setTab] = useState<Tab>('practice')
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <nav className="mb-6 flex flex-wrap gap-2" aria-label="Main">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-current={tab === t.id ? 'page' : undefined}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                tab === t.id ? 'bg-cyan-500/20 text-white ring-1 ring-cyan-400' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
        {tab === 'practice' && <PracticeView />}
        {tab === 'review' && <SessionView key="review" kind="review" />}
        {tab === 'drill' && <SessionView key="drill" kind="drill" />}
        {tab === 'about' && <AboutView />}
      </div>
    </div>
  )
}

export default App
