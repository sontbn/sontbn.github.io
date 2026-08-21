import { Moon, Sun } from 'lucide-react'
import { useActiveSection } from '../hooks/useActiveSection'

const links = [
  { href: '#work', label: 'Work', id: 'work' },
  { href: '#approach', label: 'Approach', id: 'approach' },
  { href: '#experience', label: 'Experience', id: 'experience' },
  { href: '#contact', label: 'Contact', id: 'contact' },
]
const sectionIds = links.map(link => link.id)

type SiteHeaderProps = { theme: 'light' | 'dark'; onToggleTheme: () => void }

export function SiteHeader({ theme, onToggleTheme }: SiteHeaderProps) {
  const activeSection = useActiveSection(sectionIds)

  return (
    <header className="site-header">
      <a className="wordmark" href="#top" aria-label="Sonatha MTT — back to top">SM<span>.</span></a>
      <nav aria-label="Primary navigation">
        <ul className="nav-list">
          {links.map(link => (
            <li key={link.id}>
              <a href={link.href} className={activeSection === link.id ? 'is-active' : undefined}>{link.label}</a>
            </li>
          ))}
        </ul>
      </nav>
      <button className="theme-toggle" type="button" onClick={onToggleTheme} aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
        {theme === 'light' ? <Moon aria-hidden="true" size={16} /> : <Sun aria-hidden="true" size={16} />}
      </button>
    </header>
  )
}
