import { SiteFooter } from './components/SiteFooter'
import { SiteHeader } from './components/SiteHeader'
import { useTheme } from './hooks/useTheme'
import { Approach } from './sections/Approach'
import { Contact } from './sections/Contact'
import { CurrentSignals } from './sections/CurrentSignals'
import { Experience } from './sections/Experience'
import { Hero } from './sections/Hero'
import { ProofStrip } from './sections/ProofStrip'
import { SelectedWork } from './sections/SelectedWork'

export default function App() {
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="site-shell">
      <SiteHeader theme={theme} onToggleTheme={toggleTheme} />
      <main>
        <Hero />
        <ProofStrip />
        <SelectedWork />
        <Approach />
        <Experience />
        <CurrentSignals />
        <Contact />
      </main>
      <SiteFooter />
    </div>
  )
}
