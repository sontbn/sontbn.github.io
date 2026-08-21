import { ArrowUp } from 'lucide-react'
import { profile } from '../data/profile'

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <p>© {new Date().getFullYear()} {profile.name}</p>
      <a href="#top">Back to top <ArrowUp aria-hidden="true" size={15} /></a>
      <p>Built with care in Jakarta.</p>
    </footer>
  )
}
